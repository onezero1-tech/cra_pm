import React from 'react';
import {
  Minus,
  Square,
  X,
  FileSpreadsheet,
  Moon,
  Sun,
  Sparkles,
  Download,
  AppWindow,
} from 'lucide-react';

interface WindowsTitleBarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLoadSample: () => void;
  onOpenExporter: () => void;
  onDownloadOfflineHtml: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

export const WindowsTitleBar: React.FC<WindowsTitleBarProps> = ({
  darkMode,
  onToggleDarkMode,
  onLoadSample,
  onOpenExporter,
  onDownloadOfflineHtml,
  isMaximized,
  onToggleMaximize,
}) => {
  return (
    <header className="h-10 select-none flex items-center justify-between px-3 border-b transition-colors bg-slate-100/90 dark:bg-[#1f2227]/95 border-slate-200 dark:border-slate-800 backdrop-blur-md z-50 text-xs">
      {/* App identity */}
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs">
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
            Excel Matrix Pro
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            Windows 桌面版
          </span>
          <span className="text-slate-400 dark:text-slate-500 hidden md:inline">
            | 质量分拆分 & CRA量表智能化合并
          </span>
        </div>
      </div>

      {/* Quick Utility Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onLoadSample}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors border border-slate-300/60 dark:border-slate-700/60"
          title="自动加载当前模式的测试样例数据与模板"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>加载样例数据</span>
        </button>

        <button
          onClick={onDownloadOfflineHtml}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 transition-colors"
          title="生成单个独立 .html 文件，无需安装任何软件，在 Windows 上双击浏览器直接离线使用"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>导出离线 HTML</span>
        </button>

        <button
          onClick={onOpenExporter}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 transition-colors"
          title="生成 Windows 独立 .exe 可执行程序安装包"
        >
          <AppWindow className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>打包 Windows .exe</span>
        </button>

        <button
          onClick={onToggleDarkMode}
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? '切换为亮色模式' : '切换为暗色模式'}
        >
          {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Windows Window Controls */}
        <div className="flex items-center ml-2 border-l pl-2 border-slate-300 dark:border-slate-700">
          <button
            className="w-8 h-7 flex items-center justify-center rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="最小化"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleMaximize}
            className="w-8 h-7 flex items-center justify-center rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title={isMaximized ? '还原窗口' : '最大化窗口'}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              if (confirm('确定要最小化/退出工作台吗？')) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="w-8 h-7 flex items-center justify-center rounded text-slate-600 dark:text-slate-400 hover:bg-red-500 hover:text-white transition-colors"
            title="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
