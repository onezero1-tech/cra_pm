import React from 'react';
import { AppMode } from '../engine/types';
import { CheckCircle2, Loader2, Database, ShieldCheck } from 'lucide-react';

interface WindowsStatusBarProps {
  currentMode: AppMode;
  isProcessing: boolean;
  totalPreviewRows: number;
  totalSelectedFiles: number;
}

export const WindowsStatusBar: React.FC<WindowsStatusBarProps> = ({
  currentMode,
  isProcessing,
  totalPreviewRows,
  totalSelectedFiles,
}) => {
  const modeNames: Record<AppMode, string> = {
    split: 'PM 质量分拆分模式',
    merge: 'PM 质量分合并模式',
    cra: 'CRA 量表横表合并',
    cra_vertical: 'CRA 量表竖表合并',
  };

  return (
    <footer className="h-6 select-none flex items-center justify-between px-3 text-[11px] border-t bg-slate-100/90 dark:bg-[#1a1c21]/95 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 transition-colors z-40">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {isProcessing ? (
            <>
              <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
              <span className="text-blue-600 dark:text-blue-400 font-medium">任务运行中...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>就绪</span>
            </>
          )}
        </div>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        <span className="font-medium text-slate-700 dark:text-slate-300">
          当前模式: {modeNames[currentMode]}
        </span>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        <span>已载入: {totalSelectedFiles} 个文件</span>

        {totalPreviewRows > 0 && (
          <>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              结果缓存: {totalPreviewRows} 行
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] text-slate-400">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          GBK / UTF-8 / CP437 编码兼容
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="font-mono text-[10px]">Windows 11 Fluent v3.2</span>
      </div>
    </footer>
  );
};
