/**
 * Type definitions for Excel Matrix Pro desktop application
 */

export type AppMode = 'split' | 'merge' | 'cra' | 'cra_vertical';

export interface LogMessage {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  detail?: string;
}

export interface SplitConfig {
  sheetName: string;
  usecols: string; // e.g. "4,5,6,9,11" (1-based)
  headerRow: number; // 1-based (default 1)
  dataStart: number; // 1-based (default 4)
}

export interface MergeStats {
  totalFiles: number;
  processedFiles: number;
  extractedSheets: number;
  totalRows: number;
  executionTimeMs: number;
}

export interface ExtractedFileItem {
  name: string;
  size: number;
  data: Uint8Array;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  blob?: Blob;
  filename: string;
  previewHeaders?: string[];
  previewRows?: any[][];
  totalRows?: number;
  stats?: Partial<MergeStats>;
}

export type ProgressCallback = (percentage: number, statusText: string) => void;
export type LogCallback = (level: 'info' | 'success' | 'warn' | 'error', message: string, detail?: string) => void;
