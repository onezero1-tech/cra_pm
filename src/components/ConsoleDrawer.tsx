import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronUp, ChevronDown, Trash2, Copy, Check, Filter } from 'lucide-react';
import { LogMessage } from '../engine/types';

interface ConsoleDrawerProps {
  logs: LogMessage[];
  onClearLogs: () => void;
  isProcessing: boolean;
  progressPercent: number;
  progressStatus: string;
}

export const ConsoleDrawer: React.FC<ConsoleDrawerProps> = ({
  logs,
  onClearLogs,
  isProcessing,
  progressPercent,
  progressStatus,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filterText, setFilterText] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopyLogs = () => {
    const textToCopy = logs
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message} ${l.detail || ''}`)
      .join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter(l =>
    l.message.toLowerCase().includes(filterText.toLowerCase()) ||
    l.level.toLowerCase().includes(filterText.toLowerCase())
  );

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#16181d]/98 shadow-lg transition-all">
      {/* Console Header Bar */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 text-xs bg-slate-50/80 dark:bg-[#1f2227]/90 select-none">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <Terminal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Windows 执行控制台与运行日志
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
            {logs.length}
          </span>
          {warnCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 font-medium">
              {warnCount} 警告
            </span>
          )}
          {errorCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 font-medium">
              {errorCount} 错误
            </span>
          )}
        </div>

        {/* Progress Bar (active during processing) */}
        {isProcessing && (
          <div className="flex-1 max-w-md mx-4 flex items-center gap-2">
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate">
              {progressStatus || '处理中...'}
            </span>
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {progressPercent}%
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {isOpen && (
            <>
              <div className="relative">
                <input
                  type="text"
                  placeholder="过滤日志..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="w-28 text-[11px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:w-40 transition-all"
                />
              </div>

              <button
                onClick={handleCopyLogs}
                disabled={logs.length === 0}
                className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40"
                title="复制全部日志"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onClearLogs}
                disabled={logs.length === 0}
                className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40"
                title="清空控制台"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            title={isOpen ? '折叠控制台' : '展开控制台'}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Log Output Body */}
      {isOpen && (
        <div
          ref={logContainerRef}
          className="h-36 overflow-y-auto p-3 font-mono text-[11px] space-y-1 bg-[#0f1115] text-slate-300 select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 py-3 text-center italic">
              控制台暂无日志输出，提交处理任务或加载样例数据后将实时在此打印运行细节。
            </div>
          ) : (
            filteredLogs.map(l => {
              let badgeColor = 'text-blue-400';
              if (l.level === 'success') badgeColor = 'text-emerald-400';
              if (l.level === 'warn') badgeColor = 'text-amber-400';
              if (l.level === 'error') badgeColor = 'text-rose-400 font-bold';

              return (
                <div key={l.id} className="leading-relaxed hover:bg-white/5 px-1 rounded flex items-start gap-2">
                  <span className="text-slate-500 select-none">[{l.timestamp}]</span>
                  <span className={`uppercase font-bold w-14 shrink-0 ${badgeColor}`}>
                    [{l.level}]
                  </span>
                  <span className="text-slate-200 break-all">{l.message}</span>
                  {l.detail && (
                    <span className="text-slate-400 italic">({l.detail})</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
