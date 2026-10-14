import JSZip from 'jszip';
import { workbookToBytes } from 'xlsx-kit/io';
import { createWorkbook, addWorksheet, getSheet, removeSheet, sheetNames } from 'xlsx-kit/workbook';
import { Worksheet, getCell, setCell, getMaxRow, getMaxCol, setColumnWidth, getColumnDimension } from 'xlsx-kit/worksheet';
import { SplitConfig, ProcessResult, ProgressCallback, LogCallback } from './types';
import {
  parseNumericPositions,
  loadWorkbookFromBuffer,
  getCellValue,
  findWorksheet,
  text,
} from './excelUtils';

/**
 * PM质量分拆分模式核心引擎 (基于 xlsx-kit)
 */
export async function executeSplit(
  dataFileBuffer: ArrayBuffer,
  templateFileBuffer: ArrayBuffer,
  config: SplitConfig,
  onProgress: ProgressCallback,
  onLog: LogCallback
): Promise<ProcessResult> {
  const startTime = Date.now();
  onLog('info', '开始执行 PM 质量分拆分任务 (xlsx-kit 高性能引擎)...');
  onProgress(5, '解析配置与载入工作簿...');

  const positions = parseNumericPositions(config.usecols);
  if (positions.length < 2) {
    throw new Error('提取列数量至少为 2 列（需包含首列分类与末尾分组列）');
  }

  // 1. 读取数据文件
  onLog('info', `正在读取数据工作簿，目标工作表: "${config.sheetName}"...`);
  const dataWb = await loadWorkbookFromBuffer(dataFileBuffer);
  const dataWs = findWorksheet(dataWb, config.sheetName);
  if (!dataWs) {
    const availableSheets = sheetNames(dataWb).join(', ');
    throw new Error(
      `在数据文件中未找到工作表 "${config.sheetName}"。可用工作表: [${availableSheets}]`
    );
  }

  // 2. 提取表格数据
  const maxCol = getMaxCol(dataWs);
  for (const pos of positions) {
    if (pos >= maxCol) {
      throw new Error(`请求的列索引 ${pos + 1} 超出数据表最大列数 ${maxCol}`);
    }
  }

  // 获取表头
  const colNames: string[] = positions.map((pos) => {
    const val = getCellValue(dataWs, config.headerRow, pos + 1);
    return text(val) || `列_${pos + 1}`;
  });
  onLog('info', `提取列头: [${colNames.join(', ')}]`);

  // 提取有效数据行
  const rows: any[][] = [];
  const totalRowsInSheet = getMaxRow(dataWs);
  for (let r = config.headerRow + 1; r <= totalRowsInSheet; r++) {
    const rowValues = positions.map(pos => getCellValue(dataWs, r, pos + 1));
    // 只要有任何一列有值，就记录
    if (rowValues.some(v => v !== null && v !== undefined && String(v).trim() !== '')) {
      rows.push(rowValues);
    }
  }

  if (rows.length === 0) {
    throw new Error('未从指定列和工作表中提取到任何有效数据');
  }
  onLog('info', `已成功提取 ${rows.length} 行数据，开始按最后一列（分组列）进行分组...`);
  onProgress(20, '正在分组数据...');

  // 3. 按最后一列分组 (k_value -> subRows)
  const groupColIdx = positions.length - 1;
  const groups = new Map<string, any[][]>();
  for (const r of rows) {
    const kVal = text(r[groupColIdx]) || '未分组';
    if (!groups.has(kVal)) {
      groups.set(kVal, []);
    }
    groups.get(kVal)!.push(r);
  }

  onLog('info', `共识别出 ${groups.size} 个分组组别: [${Array.from(groups.keys()).slice(0, 10).join(', ')}${groups.size > 10 ? '...' : ''}]`);

  const zip = new JSZip();
  let completedGroups = 0;
  const totalGroups = groups.size;

  // 4. 遍历各分组生成 Excel 文件
  for (const [kValue, subRows] of groups.entries()) {
    const safeName = kValue.replace(/[\/\\:*?"<>|]/g, '_').trim() || '分组';
    onLog('info', `正在生成分组 [${safeName}] (包含 ${subRows.length} 条数据)...`);

    // 基于全新加载的模板实例，天然继承模板内部的全部样式与调色板定义
    const groupWb = await loadWorkbookFromBuffer(templateFileBuffer);
    const wsTpl = getSheet(groupWb, 'A') || findWorksheet(groupWb);
    if (!wsTpl) {
      throw new Error('模板文件中没有任何可用工作表');
    }

    const tplTitle = wsTpl.title;
    const tplMaxCol = Math.max(getMaxCol(wsTpl), 10);

    // 在当前 subRows 内按首列 (first_col, index 0) 二次分组生成多个 sheet
    const miniGroups = new Map<string, any[][]>();
    for (const row of subRows) {
      const dVal = text(row[0]) || '默认';
      if (!miniGroups.has(dVal)) {
        miniGroups.set(dVal, []);
      }
      miniGroups.get(dVal)!.push(row);
    }

    // 复制模板样式并写入数据
    for (const [dValue, miniRows] of miniGroups.entries()) {
      let sheetTitle = dValue.replace(/[\/\\:*?"<>|]/g, '_').trim();
      if (sheetTitle.length > 31) {
        sheetTitle = sheetTitle.substring(0, 31);
      }
      if (!sheetTitle) sheetTitle = 'Sheet1';

      // 避免重名
      let finalTitle = sheetTitle;
      let counter = 1;
      const existingNames = sheetNames(groupWb);
      while (existingNames.includes(finalTitle)) {
        finalTitle = `${sheetTitle.substring(0, 27)}_${counter++}`;
      }

      const ws = addWorksheet(groupWb, finalTitle);

      // 复制列宽
      for (let c = 1; c <= tplMaxCol; c++) {
        const dim = getColumnDimension(wsTpl, c);
        if (dim && dim.width) {
          setColumnWidth(ws, c, dim.width);
        }
      }

      // 复制模板头部前 dataStart - 1 行
      const startRowIdx = config.dataStart;
      for (let r = 1; r < startRowIdx; r++) {
        for (let c = 1; c <= tplMaxCol; c++) {
          const srcCell = getCell(wsTpl, r, c);
          if (srcCell) {
            setCell(ws, r, c, srcCell.value, srcCell.styleId);
          }
        }
      }

      // 获取模板第 dataStart 行的样式样板
      const sampleCell1 = getCell(wsTpl, startRowIdx, 1);
      const sampleCell2 = getCell(wsTpl, startRowIdx, 2);
      const sampleCell3 = getCell(wsTpl, startRowIdx, 3);

      // 写入 miniRows 数据：列1 -> row[1], 列2 -> row[2], 列3 -> row[3]
      let currentRIdx = startRowIdx;
      for (const row of miniRows) {
        const v1 = row.length > 1 ? row[1] : null;
        const v2 = row.length > 2 ? row[2] : null;
        const v3 = row.length > 3 ? row[3] : null;

        if (v1 !== null && v1 !== undefined) {
          setCell(ws, currentRIdx, 1, v1, sampleCell1?.styleId);
        }
        if (v2 !== null && v2 !== undefined) {
          setCell(ws, currentRIdx, 2, v2, sampleCell2?.styleId);
        }
        if (v3 !== null && v3 !== undefined) {
          setCell(ws, currentRIdx, 3, v3, sampleCell3?.styleId);
        }

        currentRIdx++;
      }
    }

    // 移除原有模板占位表
    try {
      removeSheet(groupWb, tplTitle);
    } catch {
      // 忽略如果仅剩一个表的情况
    }

    // 导出该分组为 Excel 二进制并写入 zip
    const bytes = await workbookToBytes(groupWb);
    zip.file(`${safeName}.xlsx`, bytes);

    completedGroups++;
    const pct = Math.round(20 + (completedGroups / totalGroups) * 70);
    onProgress(pct, `正在打包 (${completedGroups}/${totalGroups}): ${safeName}.xlsx`);
  }

  onProgress(95, '正在压缩并生成 ZIP 下载文件...');
  onLog('info', '正在生成最终压缩包...');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const duration = Date.now() - startTime;
  onLog('success', `拆分完成！生成 ${totalGroups} 个独立文件，耗时 ${(duration / 1000).toFixed(2)} 秒`);
  onProgress(100, '拆分任务全部完成！');

  // 构建前 20 行预览
  const previewHeaders = colNames;
  const previewRows = rows.slice(0, 20);

  return {
    success: true,
    message: `成功拆分为 ${totalGroups} 个独立 Excel 文件`,
    blob: zipBlob,
    filename: 'processed_excels.zip',
    previewHeaders,
    previewRows,
    totalRows: rows.length,
    stats: {
      totalFiles: 1,
      processedFiles: totalGroups,
      extractedSheets: totalGroups,
      totalRows: rows.length,
      executionTimeMs: duration,
    },
  };
}
