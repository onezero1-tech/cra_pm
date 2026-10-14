import React from 'react';
import {
  Scissors,
  Layers,
  TableProperties,
  ListTree,
  Table,
  Cpu,
  HardDrive,
  CheckCircle2,
  PackageCheck,
  HelpCircle,
} from 'lucide-react';
import { AppMode } from '../engine/types';

interface WindowsSidebarProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  activeView: 'main' | 'preview' | 'exporter';
  onSelectView: (view: 'main' | 'preview' | 'exporter') => void;
  hasPreviewData: boolean;
  totalPreviewRows: number;
}

export const WindowsSidebar: React.FC<WindowsSidebarProps> = ({
  currentMode,
  onSelectMode,
  activeView,
  onSelectView,
  hasPreviewData,
  totalPreviewRows,
}) => {
  const modes = [
    {
      id: 'split' as AppMode,
      name: 'PM 质量分拆分',
      badge: '按组切分',
      desc: '按工作表提取指定列并按组拆分为多表套用模板',
      icon: Scissors,
      color: 'text-blue-600 dark:text-blue-400',
      activeBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-500',
    },
    {
      id: 'merge' as AppMode,
      name: 'PM 质量分合并',
      badge: 'HS表堆叠',
      desc: '批量提取 HS 工作表有效行纵向汇总堆叠',
      icon: Layers,
      color: 'text-indigo-600 dark:text-indigo-400',
      activeBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500',
    },
    {
      id: 'cra' as AppMode,
      name: 'CRA 量表横表',
      badge: '宽表展开',
      desc: '匹配填写指南与分数目录按工作内容横向展开',
      icon: TableProperties,
      color: 'text-teal-600 dark:text-teal-400',
      activeBg: 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 dark:border-teal-500',
    },
    {
      id: 'cra_vertical' as AppMode,
      name: 'CRA 量表竖表',
      badge: '明细过滤',
      desc: '保留头部信息按次数过滤0值并改写B/C分值列',
      icon: ListTree,
      color: 'text-purple-600 dark:text-purple-400',
      activeBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 dark:border-purple-500',
    },
  ];

  return (
    <aside className="w-64 border-r flex flex-col justify-between select-none bg-slate-50/80 dark:bg-[#1a1c20]/90 border-slate-200 dark:border-slate-800 transition-colors">
      <div className="p-3 space-y-4">
        {/* Navigation Group: Core Processing Modes */}
        <div>
          <div className="px-2.5 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            自动化批处理引擎
          </div>
          <div className="space-y-1">
            {modes.map(m => {
              const Icon = m.icon;
              const isSelected = activeView === 'main' && currentMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectMode(m.id);
                    onSelectView('main');
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-all border ${
                    isSelected
                      ? `${m.activeBg} shadow-xs font-semibold text-slate-900 dark:text-slate-100`
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-md mt-0.5 ${isSelected ? 'bg-white dark:bg-slate-800 shadow-xs' : 'bg-slate-200/60 dark:bg-slate-800'}`}>
                    <Icon className={`w-4 h-4 ${m.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs truncate">{m.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {m.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Group: Views & Tools */}
        <div>
          <div className="px-2.5 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            视图与辅助工具
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onSelectView('preview')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 transition-all border ${
                activeView === 'preview'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs">数据结果网格预览</span>
              </div>
              {hasPreviewData && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  {totalPreviewRows}行
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectView('exporter')}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 transition-all border ${
                activeView === 'exporter'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <PackageCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs">Windows 桌面程序打包</span>
              </div>
              <span className="text-[9px] px-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono">
                EXE
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Windows System Simulation */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-[#16171a]/80 text-[11px] space-y-2">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">本地处理引擎就绪</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">v3.2</span>
        </div>

        <div className="bg-white/70 dark:bg-slate-800/70 p-2 rounded-md border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-blue-500" /> xlsx-kit 高性能内核
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">0.8% 占用</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full w-[12%]"></div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-indigo-500" /> 内存沙箱
            </span>
            <span className="font-mono">纯客户端 100% 本地</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
