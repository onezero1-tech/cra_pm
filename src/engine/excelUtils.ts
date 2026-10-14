import JSZip from 'jszip';
import { loadWorkbook, fromArrayBuffer, workbookToBytes } from 'xlsx-kit/io';
import { Workbook, createWorkbook, addWorksheet, getSheet, sheetNames } from 'xlsx-kit/workbook';
import { Worksheet, getCell, setCell, getMaxRow, getMaxCol, setColumnWidth, freezePanes } from 'xlsx-kit/worksheet';
import { cellValueAsPrimitive, cellValueAsString } from 'xlsx-kit/cell';
import { ExtractedFileItem } from './types';

// ==========================================
// Python-equivalent string & number helpers
// ==========================================

export function norm(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s).trim().replace(/\s+/g, '');
}

export function canonKey(s: any): string {
  if (s === null || s === undefined) return '';
  let str = String(s)
    .replace(/\*/g, '-')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/：/g, ':');
  return str.trim().replace(/\s+/g, '');
}

export function text(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v.result !== undefined) {
      return text(v.result);
    }
    if (v.text !== undefined) {
      return String(v.text).trim();
    }
  }
  if (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) < 1e15) {
    return String(v);
  }
  return String(v).trim();
}

export function toNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  if (typeof v === 'object' && v.result !== undefined) {
    return toNum(v.result);
  }
  const str = String(v).trim();
  const n = Number(str);
  return isNaN(n) ? null : n;
}

export function stripParen(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[（(][^）)]*[）)]\s*$/, '').trim();
}

export function joinParts(parts: string[], sep: string = '_'): string {
  return parts.filter(p => p !== '' && p !== null && p !== undefined).join(sep);
}

export function parseNumericPositions(usecolsStr: string): number[] {
  const parts = usecolsStr.split(',').map(p => p.trim()).filter(p => p !== '');
  if (parts.length === 0) return [];
  const positions: number[] = [];
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (isNaN(n) || n < 1) {
      throw new Error(`非法列索引: "${p}". 请使用逗号分隔的正整数，如 "4,5,6,9,11"`);
    }
    positions.push(n - 1); // 0-based
  }
  return positions;
}

// ==========================================
// Zip & File extraction utilities
// ==========================================

export async function extractZipFiles(zipData: ArrayBuffer | Uint8Array): Promise<ExtractedFileItem[]> {
  const zip = await JSZip.loadAsync(zipData);
  const items: ExtractedFileItem[] = [];

  const entries = Object.keys(zip.files);
  for (const filename of entries) {
    const file = zip.files[filename];
    if (file.dir) continue;
    const lower = filename.toLowerCase();
    const base = filename.split('/').pop() || '';
    if (base.startsWith('~$') || base.startsWith('.') || filename.includes('__MACOSX')) {
      continue;
    }

    if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm') || lower.endsWith('.xls')) {
      const data = await file.async('uint8array');
      items.push({
        name: filename,
        size: data.length,
        data,
      });
    }
  }

  return items;
}

// ==========================================
// xlsx-kit Workbook & Worksheet Helpers
// ==========================================

export async function loadWorkbookFromBuffer(buffer: ArrayBuffer | Uint8Array): Promise<Workbook> {
  let arrayBuffer: ArrayBuffer;
  if (buffer instanceof Uint8Array) {
    const ab = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(ab).set(buffer);
    arrayBuffer = ab;
  } else {
    arrayBuffer = buffer;
  }
  return await loadWorkbook(fromArrayBuffer(arrayBuffer));
}

/**
 * Safely get primitive or string value from worksheet cell using xlsx-kit
 */
export function getCellValue(ws: Worksheet, row1Based: number, col1Based: number): any {
  const cell = getCell(ws, row1Based, col1Based);
  if (!cell || cell.value === null || cell.value === undefined) return null;
  return cellValueAsPrimitive(cell.value);
}

/**
 * Helper to get a worksheet by name, or first sheet
 */
export function findWorksheet(wb: Workbook, sheetName?: string): Worksheet | null {
  if (sheetName) {
    const ws = getSheet(wb, sheetName);
    if (ws) return ws;
  }
  for (const s of wb.sheets) {
    if (s.kind === 'worksheet') {
      return s.sheet;
    }
  }
  return null;
}

/**
 * Helper to get all worksheet objects
 */
export function getAllWorksheets(wb: Workbook): Array<{ name: string; sheet: Worksheet }> {
  const list: Array<{ name: string; sheet: Worksheet }> = [];
  for (const s of wb.sheets) {
    if (s.kind === 'worksheet') {
      list.push({ name: s.sheet.title, sheet: s.sheet });
    }
  }
  return list;
}

/**
 * Trigger browser file download
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
