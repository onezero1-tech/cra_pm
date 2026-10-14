import React from 'react';
import {
  Scissors,
  Layers,
  TableProperties,
  ListTree,
  Play,
  FileCheck2,
  Settings2,
  Sparkles,
  Info,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { FileDropzone } from './FileDropzone';
import { SplitConfig } from '../engine/types';

// ==========================================
// Mode 1: PM 拆分面板
// ==========================================
interface SplitPanelProps {
  dataFiles: File[];
  setDataFiles: (files: File[]) => void;
  templateFiles: File[];
  setTemplateFiles: (files: File[]) => void;
  config: SplitConfig;
  setConfig: React.Dispatch<React.SetStateAction<SplitConfig>>;
  isProcessing: boolean;
  onExecute: () => void;
  onLoadSample: () => void;
}

export const SplitPanel: React.FC<SplitPanelProps> = ({
  dataFiles,
  setDataFiles,
  templateFiles,
  setTemplateFiles,
  config,
  setConfig,
  isProcessing,
  onExecute,
  onLoadSample,
}) => {
  return (
    <div className="space-y-5 max-w-4xl">
      {/* Description Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">PM 质量分拆分业务规则：</p>
          <p className="leading-relaxed text-blue-800 dark:text-blue-300">
            按工作表名称提取数据文件指定列，并按最后一列（分组列）拆分成多个独立的 Excel 文件。系统将在每个文件内套用模板样式（Sheet 'A'），按第1列分类追加子工作表，完成后打包为 ZIP 供一键下载。
          </p>
        </div>
      </div>

      {/* File Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FileDropzone
          label="数据源文件"
          hint="包含各中心质量分汇总的原始表格 (.xlsx)"
          required
          files={dataFiles}
          onFilesSelected={setDataFiles}
          onClear={() => setDataFiles([])}
          accentColor="blue"
        />

        <FileDropzone
          label="样式模板文件"
          hint="包含标准样式与表头的模板文件 (默认读取 Sheet 'A')"
          required
          files={templateFiles}
          onFilesSelected={setTemplateFiles}
          onClear={() => setTemplateFiles([])}
          accentColor="indigo"
        />
      </div>

      {/* Advanced Parameters Configuration Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1c22] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              数据提取与格式化参数设置
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            参数默认已与原 Python 逻辑精确同步
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              工作表名称 (Sheet)
            </label>
            <input
              type="text"
              value={config.sheetName}
              onChange={e => setConfig(prev => ({ ...prev, sheetName: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">默认: 02-项目汇总表</p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              提取列序号 (1起始)
            </label>
            <input
              type="text"
              value={config.usecols}
              onChange={e => setConfig(prev => ({ ...prev, usecols: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">末列为分组依据 (如 4,5,6,9,11)</p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              列名所在行 (1起始)
            </label>
            <input
              type="number"
              min={1}
              value={config.headerRow}
              onChange={e => setConfig(prev => ({ ...prev, headerRow: Number(e.target.value) || 1 }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">默认表头所在第 1 行</p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              模板写入起始行 (1起始)
            </label>
            <input
              type="number"
              min={1}
              value={config.dataStart}
              onChange={e => setConfig(prev => ({ ...prev, dataStart: Number(e.target.value) || 4 }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">第 4 行开始填充并复制样式</p>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onExecute}
          disabled={isProcessing || dataFiles.length === 0 || templateFiles.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 shadow-sm transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isProcessing ? '正在拆分处理中...' : '开始拆分并打包下载 (.zip)'}</span>
        </button>

        <button
          onClick={onLoadSample}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>加载拆分模式样例测试</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// Mode 2: PM 合并面板
// ==========================================
interface MergePanelProps {
  archiveFiles: File[];
  setArchiveFiles: (files: File[]) => void;
  isProcessing: boolean;
  onExecute: () => void;
  onLoadSample: () => void;
}

export const MergePanel: React.FC<MergePanelProps> = ({
  archiveFiles,
  setArchiveFiles,
  isProcessing,
  onExecute,
  onLoadSample,
}) => {
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">PM 质量分合并业务规则：</p>
          <p className="leading-relaxed text-indigo-800 dark:text-indigo-300">
            支持上传 ZIP 压缩包，或者直接拖拽多份 Excel 表格。程序将自动读取每个文件中以「HS」开头的工作表，丢弃前 3 行（表头注释）与第 1 列（无用序号），自动添加「File」和「Sheet」来源列，纵向合并堆叠为一张完整的汇总表 <code className="font-mono font-semibold">merged.xlsx</code>。
          </p>
        </div>
      </div>

      <FileDropzone
        label="待合并文件集 (支持 ZIP 压缩包 或 直接多选多个 Excel 文件)"
        hint="可直接拖入一个 .zip 压缩包，或按住 Ctrl/Shift 多选几十个 .xlsx 表格一并拖入"
        accept=".zip,.7z,.xlsx,.xls,.xlsm"
        multiple
        required
        files={archiveFiles}
        onFilesSelected={setArchiveFiles}
        onClear={() => setArchiveFiles([])}
        accentColor="indigo"
      />

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onExecute}
          disabled={isProcessing || archiveFiles.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 shadow-sm transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isProcessing ? '正在合并处理中...' : '开始合并并下载汇总表 (merged.xlsx)'}</span>
        </button>

        <button
          onClick={onLoadSample}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>加载多文件合并样例</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// Mode 3: CRA 横表面板
// ==========================================
interface CraPanelProps {
  archiveFiles: File[];
  setArchiveFiles: (files: File[]) => void;
  templateFiles: File[];
  setTemplateFiles: (files: File[]) => void;
  isProcessing: boolean;
  onExecute: () => void;
  onLoadSample: () => void;
}

export const CraPanel: React.FC<CraPanelProps> = ({
  archiveFiles,
  setArchiveFiles,
  templateFiles,
  setTemplateFiles,
  isProcessing,
  onExecute,
  onLoadSample,
}) => {
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="p-3.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">CRA 量表横表合并业务规则：</p>
          <p className="leading-relaxed text-teal-800 dark:text-teal-300">
            读取每个表格的「CRA填写表单」，第 1 行提取 CRA 人员基础信息；依据《填写指南》建立工作项排序与模糊别名映射；依据《分数目录》对「肿瘤/非肿瘤项目监查」自动改写分值等级；将工作内容横向展开输出为包含 <code className="font-mono">项目_count</code> 和 <code className="font-mono">项目_备注</code> 的大宽表。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FileDropzone
          label="CRA 填写表单数据源 (ZIP 或 多个 Excel)"
          hint="内含每个人员填写的《CRA填写表单》表格"
          accept=".zip,.7z,.xlsx,.xls,.xlsm"
          multiple
          required
          files={archiveFiles}
          onFilesSelected={setArchiveFiles}
          onClear={() => setArchiveFiles([])}
          accentColor="teal"
        />

        <FileDropzone
          label="标准参考模板 (可选)"
          hint="内含《填写指南》和《分数目录》的标准模版。若不传将自动从数据中探测"
          accept=".xlsx,.xls,.xlsm"
          files={templateFiles}
          onFilesSelected={setTemplateFiles}
          onClear={() => setTemplateFiles([])}
          accentColor="teal"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onExecute}
          disabled={isProcessing || archiveFiles.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 dark:disabled:bg-teal-900 shadow-sm transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isProcessing ? '正在生成横表...' : '下载 CRA 横表合并结果 (merged_cra.xlsx)'}</span>
        </button>

        <button
          onClick={onLoadSample}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>加载 CRA 标准样例数据</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// Mode 4: CRA 竖表面板
// ==========================================
interface CraVerticalPanelProps {
  archiveFiles: File[];
  setArchiveFiles: (files: File[]) => void;
  templateFiles: File[];
  setTemplateFiles: (files: File[]) => void;
  isProcessing: boolean;
  onExecute: () => void;
  onLoadSample: () => void;
}

export const CraVerticalPanel: React.FC<CraVerticalPanelProps> = ({
  archiveFiles,
  setArchiveFiles,
  templateFiles,
  setTemplateFiles,
  isProcessing,
  onExecute,
  onLoadSample,
}) => {
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="p-3.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">CRA 量表竖表合并业务规则：</p>
          <p className="leading-relaxed text-purple-800 dark:text-purple-300">
            逐个读取「CRA填写表单」，提取第 1 行第 2、4、6 列作为前置固定表头。从第 3 行开始取数，按第 8 列（次数/数量）自动过滤掉 0 值与空行，同时改写 B/C 列分值。所有文件的有效行纵向堆叠成一张完整的流水明细大表，输出为 <code className="font-mono">merged_cra_vertical.xlsx</code>。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FileDropzone
          label="CRA 填写表单数据源 (ZIP 或 多个 Excel)"
          hint="内含各 CRA 人员填写的表格文件"
          accept=".zip,.7z,.xlsx,.xls,.xlsm"
          multiple
          required
          files={archiveFiles}
          onFilesSelected={setArchiveFiles}
          onClear={() => setArchiveFiles([])}
          accentColor="purple"
        />

        <FileDropzone
          label="标准参考模板 (可选)"
          hint="内含《分数目录》的模版文件。若未提供将自动从数据中搜索"
          accept=".xlsx,.xls,.xlsm"
          files={templateFiles}
          onFilesSelected={setTemplateFiles}
          onClear={() => setTemplateFiles([])}
          accentColor="purple"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onExecute}
          disabled={isProcessing || archiveFiles.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-900 shadow-sm transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isProcessing ? '正在生成竖表明细...' : '下载 CRA 竖表合并结果 (merged_cra_vertical.xlsx)'}</span>
        </button>

        <button
          onClick={onLoadSample}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>加载 CRA 竖表样例数据</span>
        </button>
      </div>
    </div>
  );
};
