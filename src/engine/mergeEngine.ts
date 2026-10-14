import { workbookToBytes } from 'xlsx-kit/io';
import { createWorkbook, addWorksheet } from 'xlsx-kit/workbook';
import { setCell, getMaxRow, getMaxCol, setColumnWidth, freezePanes } from 'xlsx-kit/worksheet';
import { setBold } from 'xlsx-kit/styles';
import { ProcessResult, ProgressCallback, LogCallback, ExtractedFileItem } from './types';
import {
  extractZipFiles,
  loadWorkbookFromBuffer,
  getAllWorksheets,
  getCellValue,
} from './excelUtils';

/**
 * 提取文件 key
 */
export function extractFileKey(filename: string): string {
  const base = filename.split(/[\/\\]/).pop() || filename;
  const parts = base.split('-');
  let key = parts.length > 4 ? parts[4] : base;
  if (key.toLowerCase().endsWith('.xlsx')) {
    key = key.substring(0, key.length - 5);
  } else if (key.toLowerCase().endsWith('.xlsm') || key.toLowerCase().endsWith('.xls')) {
    key = key.substring(0, key.lastIndexOf('.'));
  }
  return key;
}

/**
 * PM质量分合并模式核心引擎 (基于 xlsx-kit)
 */
export async function executeMerge(
  inputItems: ExtractedFileItem[] | ArrayBuffer,
  onProgress: ProgressCallback,
  onLog: LogCallback
): Promise<ProcessResult> {
  const startTime = Date.now();
  onLog('info', '开始执行 PM 质量分合并任务 (xlsx-kit 高性能引擎)...');
  onProgress(5, '解析输入文件...');

  let fileItems: ExtractedFileItem[] = [];
  if (inputItems instanceof ArrayBuffer) {
    onLog('info', '正在解压缩压缩包...');
    fileItems = await extractZipFiles(inputItems);
  } else {
    fileItems = inputItems;
  }

  if (fileItems.length === 0) {
    throw new Error('未找到任何可供合并的 Excel 文件');
  }
  onLog('info', `共识别出 ${fileItems.length} 个待处理 Excel 文件`);

  const mergedRows: any[][] = [];
  let extractedSheetsCount = 0;
  let maxDataCols = 0;

  for (let i = 0; i < fileItems.length; i++) {
    const item = fileItems[i];
    const fileKey = extractFileKey(item.name);
    const pct = Math.round(10 + (i / fileItems.length) * 80);
    onProgress(pct, `处理第 ${i + 1}/${fileItems.length} 个文件: ${item.name}`);

    try {
      const wb = await loadWorkbookFromBuffer(item.data.buffer as ArrayBuffer);
      const allSheets = getAllWorksheets(wb);
      // 匹配以 HS 开头的工作表（不区分大小写）
      const hsSheets = allSheets.filter(s =>
        s.name.trim().toUpperCase().startsWith('HS')
      );

      if (hsSheets.length === 0) {
        onLog('warn', `文件 [${item.name}] 未找到以 "HS" 开头的工作表，已跳过`);
        continue;
      }

      for (const { name: sheetName, sheet: ws } of hsSheets) {
        extractedSheetsCount++;
        const totalRows = getMaxRow(ws);
        const totalCols = getMaxCol(ws);
        if (totalCols <= 1 || totalRows <= 3) continue;

        // Python 逻辑：去掉前 3 行与第 1 列后纵向堆叠，过滤首列为空的行
        // 即：从第 4 行开始（1-based），从第 2 列开始取
        for (let r = 4; r <= totalRows; r++) {
          const firstDataVal = getCellValue(ws, r, 2);
          if (firstDataVal === null || firstDataVal === undefined || String(firstDataVal).trim() === '') {
            continue;
          }

          const rowValues: any[] = [fileKey, sheetName];
          // 收集第 2 列及之后的数据
          let lastNonEmptyCol = 2;
          for (let c = 2; c <= totalCols; c++) {
            const val = getCellValue(ws, r, c);
            rowValues.push(val);
            if (val !== null && val !== undefined && String(val).trim() !== '') {
              lastNonEmptyCol = c;
            }
          }

          // 记录最大列宽度
          const dataColCount = lastNonEmptyCol - 1;
          if (dataColCount > maxDataCols) {
            maxDataCols = dataColCount;
          }

          mergedRows.push(rowValues);
        }
      }
    } catch (err: any) {
      onLog('warn', `读取文件 [${item.name}] 出错: ${err.message}`);
    }
  }

  if (mergedRows.length === 0) {
    throw new Error('未找到任何符合条件的 HS 工作表有效数据');
  }

  onLog('info', `汇总合并完成，共读取 ${extractedSheetsCount} 个 HS 工作表，生成 ${mergedRows.length} 行记录`);
  onProgress(92, '正在构建合并工作簿 (xlsx-kit)...');

  // 构建合并后的 Excel 文件
  const outWb = createWorkbook();
  const outWs = addWorksheet(outWb, 'Merged');

  // 构建表头
  const headers = ['File', 'Sheet'];
  for (let c = 1; c <= Math.max(maxDataCols, 8); c++) {
    headers.push(`列_${c}`);
  }

  for (let c = 0; c < headers.length; c++) {
    const cell = setCell(outWs, 1, c + 1, headers[c]);
    setBold(outWb, cell);
  }

  // 写入所有数据行
  for (let r = 0; r < mergedRows.length; r++) {
    const rowData = mergedRows[r];
    for (let c = 0; c < rowData.length; c++) {
      setCell(outWs, r + 2, c + 1, rowData[c]);
    }
  }

  // 冻结首行与前两列
  freezePanes(outWs, 1, 2);

  // 设置列宽
  setColumnWidth(outWs, 1, 22);
  setColumnWidth(outWs, 2, 22);
  for (let c = 3; c <= headers.length; c++) {
    setColumnWidth(outWs, c, 16);
  }

  const bytes = await workbookToBytes(outWb);
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const duration = Date.now() - startTime;
  onLog('success', `合并成功！共合并 ${mergedRows.length} 行数据，耗时 ${(duration / 1000).toFixed(2)} 秒`);
  onProgress(100, '合并任务全部完成！');

  return {
    success: true,
    message: `成功合并 ${fileItems.length} 个文件中的 ${extractedSheetsCount} 个 HS 工作表`,
    blob,
    filename: 'merged.xlsx',
    previewHeaders: headers.slice(0, 12),
    previewRows: mergedRows.slice(0, 20).map(r => r.slice(0, 12)),
    totalRows: mergedRows.length,
    stats: {
      totalFiles: fileItems.length,
      processedFiles: fileItems.length,
      extractedSheets: extractedSheetsCount,
      totalRows: mergedRows.length,
      executionTimeMs: duration,
    },
  };
}
