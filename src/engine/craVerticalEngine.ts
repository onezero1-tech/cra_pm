import { workbookToBytes } from 'xlsx-kit/io';
import { createWorkbook, addWorksheet } from 'xlsx-kit/workbook';
import { Worksheet, getCell, setCell, getMaxRow, getMaxCol, setColumnWidth, freezePanes } from 'xlsx-kit/worksheet';
import { setBold } from 'xlsx-kit/styles';
import { ProcessResult, ProgressCallback, LogCallback, ExtractedFileItem } from './types';
import {
  extractZipFiles,
  loadWorkbookFromBuffer,
  findWorksheet,
  getCellValue,
  text,
  toNum,
  norm,
} from './excelUtils';

const SHEET_FORM_CRA = 'CRA填写表单';
const SHEET_SCORE = '分数目录';
const TARGET_B_VALUES = ['肿瘤项目监查/访视', '非肿瘤项目监查/访视'];

type ScoreCatalog = Map<string, { grade: string; score: any }>;

function readScoreCatalog(scoreWs: Worksheet): ScoreCatalog {
  const catalog: ScoreCatalog = new Map();
  let startRow = 1;
  if (norm(getCellValue(scoreWs, 1, 2)) === '项目编号') {
    startRow = 2;
  }

  const rowCount = getMaxRow(scoreWs);
  for (let r = startRow; r <= rowCount; r++) {
    const proj = text(getCellValue(scoreWs, r, 2));
    const grade = text(getCellValue(scoreWs, r, 3));
    const score = getCellValue(scoreWs, r, 4);

    if (proj && !catalog.has(proj)) {
      catalog.set(proj, { grade, score });
    }
  }
  return catalog;
}

/**
 * CRA量表合并模式（竖表）核心引擎 (基于 xlsx-kit)
 */
export async function executeCraVerticalMerge(
  archiveData: ArrayBuffer | ExtractedFileItem[],
  templateBuffer?: ArrayBuffer | null,
  onProgress: ProgressCallback = () => {},
  onLog: LogCallback = () => {}
): Promise<ProcessResult> {
  const startTime = Date.now();
  onLog('info', '开始执行 CRA 量表合并（竖表纵向明细 - xlsx-kit 引擎）任务...');
  onProgress(5, '解析输入文件与数据源...');

  let files: ExtractedFileItem[] = [];
  if (archiveData instanceof ArrayBuffer) {
    files = await extractZipFiles(archiveData);
  } else {
    files = archiveData;
  }

  if (files.length === 0) {
    throw new Error('未找到待合并的 Excel 数据文件');
  }

  // 1. 获取分数目录（优先独立模板，其次包内模板）
  let scoreCatalog: ScoreCatalog = new Map();
  if (templateBuffer && templateBuffer.byteLength > 0) {
    onLog('info', '正在从上传的模板中读取《分数目录》...');
    try {
      const tplWb = await loadWorkbookFromBuffer(templateBuffer);
      const scoreWs = findWorksheet(tplWb, SHEET_SCORE);
      if (scoreWs) {
        scoreCatalog = readScoreCatalog(scoreWs);
        onLog('info', `从模板读取到 ${scoreCatalog.size} 条项目分值映射规则`);
      }
    } catch (err: any) {
      onLog('warn', `读取模板失败: ${err.message}`);
    }
  } else {
    // 检查压缩包内是否存在带模板关键字的文件
    const tplFile = files.find(f => {
      const l = f.name.toLowerCase();
      return l.includes('模板') || l.includes('template');
    });
    if (tplFile) {
      try {
        const tplWb = await loadWorkbookFromBuffer(tplFile.data.buffer as ArrayBuffer);
        const scoreWs = findWorksheet(tplWb, SHEET_SCORE);
        if (scoreWs) {
          scoreCatalog = readScoreCatalog(scoreWs);
          onLog('info', `从包内模板 [${tplFile.name}] 读取到 ${scoreCatalog.size} 条项目分值`);
        }
      } catch (err: any) {
        onLog('warn', `读取包内模板失败: ${err.message}`);
      }
    }
  }

  if (scoreCatalog.size === 0) {
    onLog('info', '提示：未读取到《分数目录》，将保留原始 B/C 列分值');
  }

  // 2. 逐文件读取表单并过滤
  const allDetailRows: any[][] = [];
  let processedFilesCount = 0;
  let maxColCount = 12;

  for (let idx = 0; idx < files.length; idx++) {
    const item = files[idx];
    const baseName = item.name.split(/[\/\\]/).pop() || item.name;
    const pct = Math.round(10 + (idx / files.length) * 75);
    onProgress(pct, `处理第 ${idx + 1}/${files.length} 个文件: ${baseName}`);

    try {
      const wb = await loadWorkbookFromBuffer(item.data.buffer as ArrayBuffer);
      const ws = findWorksheet(wb, SHEET_FORM_CRA);
      if (!ws || getMaxRow(ws) < 3) {
        onLog('warn', `文件 [${baseName}] 无《${SHEET_FORM_CRA}》或行数不足，已跳过`);
        continue;
      }

      // 提取第 1 行的固定表头：第 2、4、6 列 (h1, h2, h3)
      const h1 = text(getCellValue(ws, 1, 2));
      const h2 = text(getCellValue(ws, 1, 4));
      const h3 = text(getCellValue(ws, 1, 6));

      // 从第 3 行开始读取，按第 8 列（次数）过滤掉 0 或空值行
      const totalRows = getMaxRow(ws);
      const fileValidRows: any[][] = [];

      for (let r = 3; r <= totalRows; r++) {
        const col8Val = toNum(getCellValue(ws, r, 8));
        if (col8Val === null || col8Val === 0) {
          continue; // 过滤掉 0 或空
        }

        // 收集这一行所有有效单元格
        const rowVals: any[] = [];
        const colCount = Math.min(getMaxCol(ws), 60);
        for (let c = 1; c <= colCount; c++) {
          rowVals.push(getCellValue(ws, r, c));
        }

        // 去掉末尾连续空白
        while (
          rowVals.length > 0 &&
          (rowVals[rowVals.length - 1] === null ||
            rowVals[rowVals.length - 1] === undefined ||
            String(rowVals[rowVals.length - 1]).trim() === '')
        ) {
          rowVals.pop();
        }

        // 分数目录改写
        if (scoreCatalog.size > 0 && rowVals.length >= 4) {
          const bText = text(rowVals[1]);
          if (TARGET_B_VALUES.includes(bText)) {
            const projText = text(rowVals[3]);
            if (projText && scoreCatalog.has(projText)) {
              const info = scoreCatalog.get(projText)!;
              if (info.grade) {
                rowVals[1] = `${bText}（${info.grade}类）`;
                if (info.score !== null && info.score !== undefined && info.score !== '') {
                  const s = String(info.score);
                  const n = Number(s);
                  rowVals[2] = isNaN(n) ? info.score : n;
                }
              }
            }
          }
        }

        if (rowVals.length > maxColCount) {
          maxColCount = rowVals.length;
        }

        // 拼接前导信息: [来源文件, 第1行第2列, 第1行第4列, 第1行第6列, ...rowVals]
        fileValidRows.push([baseName, h1, h2, h3, ...rowVals]);
      }

      if (fileValidRows.length > 0) {
        allDetailRows.push(...fileValidRows);
        processedFilesCount++;
        onLog('info', `文件 [${baseName}] 提取到 ${fileValidRows.length} 条有效记录`);
      } else {
        onLog('info', `文件 [${baseName}] 过滤后无符合条件的记录`);
      }
    } catch (err: any) {
      onLog('warn', `处理文件 [${baseName}] 出现异常: ${err.message}`);
    }
  }

  if (allDetailRows.length === 0) {
    throw new Error('未提取到任何符合条件（第8列次数大于0）的 CRA 竖表明细记录');
  }

  onLog('info', `提取完成！共从 ${processedFilesCount} 个文件中提取出 ${allDetailRows.length} 行数据，正在构建工作簿 (xlsx-kit)...`);
  onProgress(90, '正在生成最终明细工作簿...');

  const outWb = createWorkbook();
  const outWs = addWorksheet(outWb, 'Sheet1');

  // 构建表头
  const headers = ['来源文件', '第1行第2列', '第1行第4列', '第1行第6列'];
  for (let i = 1; i <= Math.max(maxColCount, 15); i++) {
    headers.push(`列${i}`);
  }

  for (let c = 0; c < headers.length; c++) {
    const cell = setCell(outWs, 1, c + 1, headers[c]);
    setBold(outWb, cell);
  }

  // 写入每行明细
  for (let rIdx = 0; rIdx < allDetailRows.length; rIdx++) {
    const row = allDetailRows[rIdx];
    for (let c = 0; c < row.length; c++) {
      setCell(outWs, rIdx + 2, c + 1, row[c]);
    }
  }

  // 冻结首行
  freezePanes(outWs, 1, 1);

  // 设置列宽
  for (let c = 0; c < headers.length; c++) {
    setColumnWidth(outWs, c + 1, c < 4 ? 20 : 15);
  }

  const bytes = await workbookToBytes(outWb);
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const duration = Date.now() - startTime;
  onLog('success', `CRA 竖表明细合并完成！共汇总 ${allDetailRows.length} 行明细，耗时 ${(duration / 1000).toFixed(2)} 秒`);
  onProgress(100, 'CRA 竖表合并全部完成！');

  return {
    success: true,
    message: `成功合并 ${processedFilesCount} 个文件中的 ${allDetailRows.length} 条 CRA 明细记录`,
    blob,
    filename: 'merged_cra_vertical.xlsx',
    previewHeaders: headers.slice(0, 12),
    previewRows: allDetailRows.slice(0, 20).map(r => r.slice(0, 12)),
    totalRows: allDetailRows.length,
    stats: {
      totalFiles: files.length,
      processedFiles: processedFilesCount,
      extractedSheets: processedFilesCount,
      totalRows: allDetailRows.length,
      executionTimeMs: duration,
    },
  };
}
