import { workbookToBytes } from 'xlsx-kit/io';
import { createWorkbook, addWorksheet, Workbook } from 'xlsx-kit/workbook';
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
  canonKey,
  norm,
  stripParen,
  joinParts,
} from './excelUtils';

const SHEET_FORM = 'CRA填写表单';
const SHEET_GUIDE = '填写指南';
const SHEET_SCORE = '分数目录';

const GUIDE_START_ROW = 3;
const GUIDE_END_ROW = 57;
const TARGET_B_VALUES = ['肿瘤项目监查/访视', '非肿瘤项目监查/访视'];
const SEPARATOR = '_';
const VISIT_SEP = ',';
const DROP_PLACEHOLDER_ONE = true;

interface GuideInfo {
  orderKeys: string[];
  matchMap: Map<string, string>;
}

type ScoreCatalog = Map<string, { grade: string; score: any }>;

function buildGuideIndex(guideWs: Worksheet): GuideInfo {
  const orderKeys: string[] = [];
  const seen = new Set<string>();
  const matchMap = new Map<string, string>();

  const maxRow = Math.min(GUIDE_END_ROW, getMaxRow(guideWs));
  for (let r = GUIDE_START_ROW; r <= maxRow; r++) {
    const bVal = text(getCellValue(guideWs, r, 2));
    const cVal = text(getCellValue(guideWs, r, 3));

    if (!bVal) continue;

    const nkey = canonKey(bVal);
    if (!seen.has(nkey)) {
      seen.add(nkey);
      orderKeys.push(bVal);
    }

    const aliases = [cVal, bVal, stripParen(bVal)];
    for (const alias of aliases) {
      const na = canonKey(alias);
      if (na && !matchMap.has(na)) {
        matchMap.set(na, bVal);
      }
    }
  }

  return { orderKeys, matchMap };
}

function resolveOrder(key: string, matchMap: Map<string, string>): string | undefined {
  const nk = canonKey(key);
  if (matchMap.has(nk)) return matchMap.get(nk);
  const stripped = canonKey(stripParen(key));
  return matchMap.get(stripped);
}

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

function applyScoreCatalog(
  rowValues: any[],
  catalog: ScoreCatalog
): any[] {
  if (catalog.size === 0 || rowValues.length < 4) return rowValues;

  const b = text(rowValues[1]);
  if (!TARGET_B_VALUES.includes(b)) return rowValues;

  const proj = text(rowValues[3]);
  if (!proj) return rowValues;

  const info = catalog.get(proj);
  if (!info || !info.grade) return rowValues;

  const modified = [...rowValues];
  modified[1] = `${b}（${info.grade}类）`;

  if (info.score !== null && info.score !== undefined && info.score !== '') {
    const s = String(info.score);
    const n = Number(s);
    modified[2] = isNaN(n) ? info.score : n;
  }

  return modified;
}

function extractBasicInfo(firstRow: any[]): Record<string, string> {
  const info: Record<string, string> = {};
  const maxIdx = Math.min(16, firstRow.length);
  for (let i = 0; i < maxIdx; i += 2) {
    const k = text(firstRow[i]);
    const v = i + 1 < firstRow.length ? text(firstRow[i + 1]) : '';
    if (k) {
      info[k] = v;
    }
  }
  return info;
}

function summarizeGroup(valid: Array<{ n: number; r: any[] }>): { count: number; lines: string[] } {
  if (valid.length === 0) return { count: 0, lines: [] };

  // 排序: (cell(3), cell(4))
  valid.sort((a, b) => {
    const pA = text(a.r[3]);
    const pB = text(b.r[3]);
    if (pA !== pB) return pA.localeCompare(pB);
    return text(a.r[4]).localeCompare(text(b.r[4]));
  });

  const total = valid.reduce((sum, item) => sum + item.n, 0);
  const count = Number.isInteger(total) ? total : Math.round(total * 10000) / 10000;

  const rule = norm(valid[0].r[6]);

  if (rule === '访视列计数') {
    const merged = new Map<string, { visits: string[]; remarks: string[] }>();
    for (const item of valid) {
      const r = item.r;
      const proj = text(r[3]);
      const center = text(r[4]);
      const remark = text(r[5]);
      const groupKey = `${proj}__SEP__${center}`;

      if (!merged.has(groupKey)) {
        merged.set(groupKey, { visits: [], remarks: [] });
      }
      const slot = merged.get(groupKey)!;

      const width = Number.isInteger(item.n) && item.n > 0 ? item.n : 0;
      let rowVisits: string[] = [];
      const endCol = Math.min(8 + width, r.length);
      for (let c = 8; c < endCol; c++) {
        const v = text(r[c]);
        if (v) rowVisits.push(v);
      }

      if (
        DROP_PLACEHOLDER_ONE &&
        remark &&
        rowVisits.length > 0 &&
        rowVisits.every(v => v === '1')
      ) {
        rowVisits = [];
      }

      slot.visits.push(...rowVisits);
      if (remark) slot.remarks.push(remark);
    }

    const lines: string[] = [];
    for (const [key, slot] of merged.entries()) {
      const [proj, center] = key.split('__SEP__');
      const extra = slot.remarks.join(VISIT_SEP);
      const detail = slot.visits.join(VISIT_SEP);
      const parts = [proj, center];
      if (detail) parts.push(detail);
      if (extra && extra !== detail) parts.push(extra);
      lines.push(joinParts(parts, SEPARATOR));
    }
    return { count, lines };
  }

  // 默认规则
  const lines: string[] = [];
  for (const item of valid) {
    const r = item.r;
    const parts = [3, 4, 5, 8].map(idx => {
      const v = text(r[idx]);
      return v || '#';
    });
    lines.push(joinParts(parts, SEPARATOR));
  }
  return { count, lines };
}

/**
 * CRA量表合并模式（横表）核心引擎 (基于 xlsx-kit)
 */
export async function executeCraHorizontalMerge(
  archiveData: ArrayBuffer | ExtractedFileItem[],
  templateBuffer?: ArrayBuffer | null,
  onProgress: ProgressCallback = () => {},
  onLog: LogCallback = () => {}
): Promise<ProcessResult> {
  const startTime = Date.now();
  onLog('info', '开始执行 CRA 量表合并（横表展开 - xlsx-kit 引擎）任务...');
  onProgress(5, '解析文件与工作簿...');

  let files: ExtractedFileItem[] = [];
  if (archiveData instanceof ArrayBuffer) {
    files = await extractZipFiles(archiveData);
  } else {
    files = archiveData;
  }

  if (files.length === 0) {
    throw new Error('未找到待合并的 Excel 数据文件');
  }

  // 1. 确定模板文件或带有填写指南/分数目录的文件
  let guideInfo: GuideInfo = { orderKeys: [], matchMap: new Map() };
  let scoreCatalog: ScoreCatalog = new Map();

  let tplWorkbook: Workbook | null = null;
  if (templateBuffer && templateBuffer.byteLength > 0) {
    onLog('info', '使用独立上传的模板文件加载《填写指南》与《分数目录》...');
    tplWorkbook = await loadWorkbookFromBuffer(templateBuffer);
  } else {
    // 寻找包内名字带 "模板" 或 "template" 的文件
    const tplItem = files.find(f => {
      const l = f.name.toLowerCase();
      return l.includes('模板') || l.includes('template');
    });
    if (tplItem) {
      onLog('info', `使用压缩包内检测到的模板文件: "${tplItem.name}"...`);
      tplWorkbook = await loadWorkbookFromBuffer(tplItem.data.buffer as ArrayBuffer);
    } else {
      onLog('info', `未找到独立模板，将从第一个数据文件 "${files[0].name}" 尝试读取指南与目录...`);
      tplWorkbook = await loadWorkbookFromBuffer(files[0].data.buffer as ArrayBuffer);
    }
  }

  if (tplWorkbook) {
    const guideWs = findWorksheet(tplWorkbook, SHEET_GUIDE);
    if (guideWs) {
      guideInfo = buildGuideIndex(guideWs);
      onLog('info', `从《${SHEET_GUIDE}》成功提取到 ${guideInfo.orderKeys.length} 个工作项目标准排序`);
    } else {
      onLog('warn', `未找到工作表《${SHEET_GUIDE}》，将按表单中出现的顺序排序列`);
    }

    const scoreWs = findWorksheet(tplWorkbook, SHEET_SCORE);
    if (scoreWs) {
      scoreCatalog = readScoreCatalog(scoreWs);
      onLog('info', `从《${SHEET_SCORE}》读取到 ${scoreCatalog.size} 条项目分值映射`);
    } else {
      onLog('info', `未找到《${SHEET_SCORE}》，跳过 B 列分值自动改写`);
    }
  }

  // 2. 逐文件处理数据
  const allRows: Record<string, any>[] = [];
  const basicKeys: string[] = [];
  const allDiscoveredWorkNames = new Set<string>();

  for (let idx = 0; idx < files.length; idx++) {
    const item = files[idx];
    const pct = Math.round(15 + (idx / files.length) * 70);
    onProgress(pct, `处理第 ${idx + 1}/${files.length} 个文件: ${item.name}`);

    try {
      const wb = await loadWorkbookFromBuffer(item.data.buffer as ArrayBuffer);
      const formWs = findWorksheet(wb, SHEET_FORM);
      if (!formWs || getMaxRow(formWs) < 3) {
        onLog('warn', `文件 [${item.name}] 无《${SHEET_FORM}》或数据少于3行，已跳过`);
        continue;
      }

      // 获取第一行基本信息
      const row1Values: any[] = [];
      for (let c = 1; c <= 20; c++) {
        row1Values.push(getCellValue(formWs, 1, c));
      }
      const rowDict: Record<string, any> = extractBasicInfo(row1Values);

      // 获取全部数据行
      const totalRows = getMaxRow(formWs);
      const groups = new Map<string, any[][]>();

      for (let r = 3; r <= totalRows; r++) {
        const colVals: any[] = [];
        for (let c = 1; c <= 30; c++) {
          colVals.push(getCellValue(formWs, r, c));
        }

        if (colVals.length <= 1 || !text(colVals[1])) continue;

        // 改写分值
        const rewritten = applyScoreCatalog(colVals, scoreCatalog);
        const groupKey = canonKey(text(rewritten[1]));

        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(rewritten);
      }

      // 汇总该文件各工作项
      for (const group of groups.values()) {
        const workName = text(group[0][1]);
        allDiscoveredWorkNames.add(workName);

        const valid: Array<{ n: number; r: any[] }> = [];
        for (const r of group) {
          const n = r.length > 7 ? toNum(r[7]) : null;
          if (n !== null && n !== 0) {
            valid.push({ n, r });
          }
        }

        const { count, lines } = summarizeGroup(valid);
        rowDict[`${workName}_count`] = count;
        rowDict[`${workName}_备注`] = lines.join('\n');
      }

      // 记录源文件和目录
      const pathParts = item.name.split(/[\/\\]/);
      const fileName = pathParts.pop() || item.name;
      const folderName = pathParts.pop() || '';

      rowDict['源文件'] = fileName;
      rowDict['所属文件夹'] = folderName;

      for (const k of Object.keys(rowDict)) {
        if (!k.endsWith('_count') && !k.endsWith('_备注') && k !== '源文件' && k !== '所属文件夹') {
          if (!basicKeys.includes(k)) {
            basicKeys.push(k);
          }
        }
      }

      allRows.push(rowDict);
    } catch (err: any) {
      onLog('warn', `处理文件 [${item.name}] 失败: ${err.message}`);
    }
  }

  if (allRows.length === 0) {
    throw new Error('未成功解析出任何 CRA 量表数据');
  }

  onLog('info', `文件解析完成，共处理 ${allRows.length} 份数据，正在构建宽表输出规格...`);
  onProgress(88, '正在生成横表结构与列排序...');

  // 3. 构建输出列规格
  const workNames = Array.from(allDiscoveredWorkNames);
  let orderedNames: string[] = [];

  if (guideInfo.orderKeys.length > 0 && guideInfo.matchMap.size > 0) {
    const resolved = new Map<string, string>();
    for (const wn of workNames) {
      const match = resolveOrder(wn, guideInfo.matchMap);
      if (match) resolved.set(wn, match);
    }

    const used = new Set<string>();
    for (const gk of guideInfo.orderKeys) {
      for (const wn of workNames) {
        if (!used.has(wn) && resolved.get(wn) === gk) {
          orderedNames.push(wn);
          used.add(wn);
        }
      }
    }
    const leftovers = workNames.filter(wn => !used.has(wn));
    orderedNames.push(...leftovers);
  } else {
    orderedNames = workNames;
  }

  // 组装最终输出列
  const outputSpecs: Array<{ dname: string; lkey: string; hasData: boolean }> = [];
  if (guideInfo.orderKeys.length > 0) {
    const wnByNk = new Map<string, string>();
    for (const wn of orderedNames) {
      wnByNk.set(canonKey(wn), wn);
    }

    const usedWn = new Set<string>();
    for (const gk of guideInfo.orderKeys) {
      const nk = canonKey(gk);
      const wn = wnByNk.get(nk);
      if (wn) {
        outputSpecs.push({ dname: gk, lkey: wn, hasData: true });
        usedWn.add(wn);
      } else {
        outputSpecs.push({ dname: gk, lkey: gk, hasData: false });
      }
    }
    for (const wn of orderedNames) {
      if (!usedWn.has(wn)) {
        outputSpecs.push({ dname: wn, lkey: wn, hasData: true });
      }
    }
  } else {
    for (const wn of orderedNames) {
      outputSpecs.push({ dname: wn, lkey: wn, hasData: true });
    }
  }

  // 4. 构建 Excel 宽表 (xlsx-kit)
  const outWb = createWorkbook();
  const ws = addWorksheet(outWb, 'Sheet1');

  const headers = ['源文件', '所属文件夹', ...basicKeys];
  for (const spec of outputSpecs) {
    headers.push(`${spec.dname}_count`);
    headers.push(`${spec.dname}_备注`);
  }

  // 写入表头
  for (let c = 0; c < headers.length; c++) {
    const cell = setCell(ws, 1, c + 1, headers[c]);
    setBold(outWb, cell);
  }

  // 写入每行数据
  const previewRows: any[][] = [];
  for (let rIdx = 0; rIdx < allRows.length; rIdx++) {
    const rowDict = allRows[rIdx];
    const rowVals: any[] = [rowDict['源文件'] || '', rowDict['所属文件夹'] || ''];
    for (const k of basicKeys) {
      rowVals.push(rowDict[k] || '');
    }
    for (const spec of outputSpecs) {
      if (spec.hasData) {
        rowVals.push(rowDict[`${spec.lkey}_count`] ?? 0);
        rowVals.push(rowDict[`${spec.lkey}_备注`] || '');
      } else {
        rowVals.push(0);
        rowVals.push('');
      }
    }

    for (let c = 0; c < rowVals.length; c++) {
      setCell(ws, rIdx + 2, c + 1, rowVals[c]);
    }

    if (previewRows.length < 20) {
      previewRows.push(rowVals);
    }
  }

  // 冻结首行和前两列
  freezePanes(ws, 1, 2);

  // 设置列宽
  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    if (h.endsWith('_count')) {
      setColumnWidth(ws, c + 1, 16);
    } else if (h.endsWith('_备注')) {
      setColumnWidth(ws, c + 1, 36);
    } else {
      setColumnWidth(ws, c + 1, 18);
    }
  }

  const bytes = await workbookToBytes(outWb);
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const duration = Date.now() - startTime;
  onLog('success', `CRA 横表合并完成！共汇总 ${allRows.length} 份数据，输出 ${headers.length} 列，耗时 ${(duration / 1000).toFixed(2)} 秒`);
  onProgress(100, 'CRA 横表合并全部完成！');

  return {
    success: true,
    message: `成功合并 ${allRows.length} 份 CRA 量表为宽表 (${headers.length} 列)`,
    blob,
    filename: 'merged_cra.xlsx',
    previewHeaders: headers.slice(0, 15),
    previewRows: previewRows.map(r => r.slice(0, 15)),
    totalRows: allRows.length,
    stats: {
      totalFiles: files.length,
      processedFiles: allRows.length,
      extractedSheets: allRows.length,
      totalRows: allRows.length,
      executionTimeMs: duration,
    },
  };
}
