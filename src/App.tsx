/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  WindowsTitleBar,
} from './components/WindowsTitleBar';
import { WindowsSidebar } from './components/WindowsSidebar';
import { WindowsStatusBar } from './components/WindowsStatusBar';
import { ConsoleDrawer } from './components/ConsoleDrawer';
import { DataPreviewGrid } from './components/DataPreviewGrid';
import { WindowsDesktopExporterModal } from './components/WindowsDesktopExporterModal';
import {
  SplitPanel,
  MergePanel,
  CraPanel,
  CraVerticalPanel,
} from './components/ModePanels';
import {
  AppMode,
  LogMessage,
  SplitConfig,
  ProcessResult,
  ExtractedFileItem,
} from './engine/types';
import { executeSplit } from './engine/splitEngine';
import { executeMerge } from './engine/mergeEngine';
import { executeCraHorizontalMerge } from './engine/craHorizontalEngine';
import { executeCraVerticalMerge } from './engine/craVerticalEngine';
import {
  generateSplitSampleFiles,
  generateMergeSampleZip,
  generateCraSampleFiles,
} from './engine/sampleGenerator';
import { triggerFileDownload } from './engine/excelUtils';
import { downloadOfflineHtml } from './engine/offlineHtmlGenerator';
import {
  FileCheck2,
  AlertTriangle,
  Sparkles,
  Download,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  // Theme & Window state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const [showExporterModal, setShowExporterModal] = useState(false);

  // Active navigation
  const [currentMode, setCurrentMode] = useState<AppMode>('split');
  const [activeView, setActiveView] = useState<'main' | 'preview' | 'exporter'>('main');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mode 1: PM Split state
  const [splitDataFiles, setSplitDataFiles] = useState<File[]>([]);
  const [splitTemplateFiles, setSplitTemplateFiles] = useState<File[]>([]);
  const [splitConfig, setSplitConfig] = useState<SplitConfig>({
    sheetName: '02-项目汇总表',
    usecols: '4,5,6,9,11',
    headerRow: 1,
    dataStart: 4,
  });

  // Mode 2: PM Merge state
  const [mergeArchiveFiles, setMergeArchiveFiles] = useState<File[]>([]);

  // Mode 3: CRA Horizontal state
  const [craArchiveFiles, setCraArchiveFiles] = useState<File[]>([]);
  const [craTemplateFiles, setCraTemplateFiles] = useState<File[]>([]);

  // Mode 4: CRA Vertical state
  const [craVerticalArchiveFiles, setCraVerticalArchiveFiles] = useState<File[]>([]);
  const [craVerticalTemplateFiles, setCraVerticalTemplateFiles] = useState<File[]>([]);

  // Preview data state
  const [previewData, setPreviewData] = useState<{
    headers: string[];
    rows: any[][];
    filename: string;
    blob?: Blob;
    totalRows?: number;
  }>({
    headers: [],
    rows: [],
    filename: '',
  });

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Initial welcome log
  useEffect(() => {
    addLog(
      'info',
      'Excel Matrix Pro Windows 自动化处理平台已启动 (版本 v3.2)',
      '已全面接入 xlsx-kit 现代化高性能解析引擎与 Segoe UI Fluent 架构'
    );
  }, []);

  const addLog = (level: 'info' | 'success' | 'warn' | 'error', message: string, detail?: string) => {
    const newLog: LogMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      level,
      message,
      detail,
    };
    setLogs(prev => [...prev.slice(-300), newLog]);
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // ==========================================
  // Sample Data Loader Handler
  // ==========================================
  const handleLoadSample = async () => {
    try {
      addLog('info', `正在为 [${currentMode}] 生成真实测试数据与模板...`);
      if (currentMode === 'split') {
        const { dataFile, templateFile } = await generateSplitSampleFiles();
        setSplitDataFiles([dataFile]);
        setSplitTemplateFiles([templateFile]);
        addLog('success', '已成功载入 PM 拆分演示数据: 02项目质量汇总表.xlsx 与 样式模板.xlsx');
        showToast('success', '已载入 PM 拆分样例文件，点击「开始拆分」体验完整效果！');
      } else if (currentMode === 'merge') {
        const sampleZip = await generateMergeSampleZip();
        setMergeArchiveFiles([sampleZip]);
        addLog('success', '已成功载入 PM 合并演示压缩包: 包含 3 个大区多张 HS 工作表');
        showToast('success', '已载入 PM 合并样例压缩包！');
      } else if (currentMode === 'cra') {
        const { archiveFile, templateFile } = await generateCraSampleFiles();
        setCraArchiveFiles([archiveFile]);
        setCraTemplateFiles([templateFile]);
        addLog('success', '已成功载入 CRA 横表数据包与标准参考模板 (含填写指南与分值目录)');
        showToast('success', '已载入 CRA 横表样例数据！');
      } else if (currentMode === 'cra_vertical') {
        const { archiveFile, templateFile } = await generateCraSampleFiles();
        setCraVerticalArchiveFiles([archiveFile]);
        setCraVerticalTemplateFiles([templateFile]);
        addLog('success', '已成功载入 CRA 竖表数据包与标准参考模板');
        showToast('success', '已载入 CRA 竖表样例数据！');
      }
    } catch (err: any) {
      addLog('error', `载入演示数据失败: ${err.message}`);
      showToast('error', `载入样例失败: ${err.message}`);
    }
  };

  // Convert File array to ExtractedFileItem if raw xlsx files were selected
  const filesToExtractedItems = async (fileList: File[]): Promise<ExtractedFileItem[]> => {
    const items: ExtractedFileItem[] = [];
    for (const f of fileList) {
      const buf = await f.arrayBuffer();
      items.push({
        name: f.name,
        size: f.size,
        data: new Uint8Array(buf),
      });
    }
    return items;
  };

  // ==========================================
  // Execution Handlers
  // ==========================================

  // 1. Run PM Split
  const handleRunSplit = async () => {
    if (splitDataFiles.length === 0 || splitTemplateFiles.length === 0) return;
    setIsProcessing(true);
    setProgressPercent(0);
    setProgressStatus('准备执行拆分...');

    try {
      const dataBuf = await splitDataFiles[0].arrayBuffer();
      const tplBuf = await splitTemplateFiles[0].arrayBuffer();

      const result: ProcessResult = await executeSplit(
        dataBuf,
        tplBuf,
        splitConfig,
        (pct, status) => {
          setProgressPercent(pct);
          setProgressStatus(status);
        },
        (lvl, msg, det) => addLog(lvl, msg, det)
      );

      if (result.blob) {
        triggerFileDownload(result.blob, result.filename);
        setPreviewData({
          headers: result.previewHeaders || [],
          rows: result.previewRows || [],
          filename: result.filename,
          blob: result.blob,
          totalRows: result.totalRows,
        });
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        showToast('success', `拆分完成！已自动触发下载 ${result.filename}`);
      }
    } catch (err: any) {
      addLog('error', `拆分处理失败: ${err.message}`);
      showToast('error', `拆分出错: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Run PM Merge
  const handleRunMerge = async () => {
    if (mergeArchiveFiles.length === 0) return;
    setIsProcessing(true);
    setProgressPercent(0);
    setProgressStatus('准备执行合并...');

    try {
      let inputData: ArrayBuffer | ExtractedFileItem[];
      // If user uploaded a single zip/7z file
      if (
        mergeArchiveFiles.length === 1 &&
        (mergeArchiveFiles[0].name.endsWith('.zip') || mergeArchiveFiles[0].name.endsWith('.7z'))
      ) {
        inputData = await mergeArchiveFiles[0].arrayBuffer();
      } else {
        // Multiple direct Excel files or combination
        inputData = await filesToExtractedItems(mergeArchiveFiles);
      }

      const result = await executeMerge(
        inputData,
        (pct, status) => {
          setProgressPercent(pct);
          setProgressStatus(status);
        },
        (lvl, msg, det) => addLog(lvl, msg, det)
      );

      if (result.blob) {
        triggerFileDownload(result.blob, result.filename);
        setPreviewData({
          headers: result.previewHeaders || [],
          rows: result.previewRows || [],
          filename: result.filename,
          blob: result.blob,
          totalRows: result.totalRows,
        });
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        showToast('success', `合并完成！已自动触发下载 ${result.filename}`);
      }
    } catch (err: any) {
      addLog('error', `合并处理失败: ${err.message}`);
      showToast('error', `合并出错: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Run CRA Horizontal
  const handleRunCraHorizontal = async () => {
    if (craArchiveFiles.length === 0) return;
    setIsProcessing(true);
    setProgressPercent(0);
    setProgressStatus('准备执行 CRA 横表合并...');

    try {
      let inputData: ArrayBuffer | ExtractedFileItem[];
      if (
        craArchiveFiles.length === 1 &&
        (craArchiveFiles[0].name.endsWith('.zip') || craArchiveFiles[0].name.endsWith('.7z'))
      ) {
        inputData = await craArchiveFiles[0].arrayBuffer();
      } else {
        inputData = await filesToExtractedItems(craArchiveFiles);
      }

      let tplBuffer: ArrayBuffer | null = null;
      if (craTemplateFiles.length > 0) {
        tplBuffer = await craTemplateFiles[0].arrayBuffer();
      }

      const result = await executeCraHorizontalMerge(
        inputData,
        tplBuffer,
        (pct, status) => {
          setProgressPercent(pct);
          setProgressStatus(status);
        },
        (lvl, msg, det) => addLog(lvl, msg, det)
      );

      if (result.blob) {
        triggerFileDownload(result.blob, result.filename);
        setPreviewData({
          headers: result.previewHeaders || [],
          rows: result.previewRows || [],
          filename: result.filename,
          blob: result.blob,
          totalRows: result.totalRows,
        });
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        showToast('success', `CRA 横表合并完成！已触发下载 ${result.filename}`);
      }
    } catch (err: any) {
      addLog('error', `CRA 横表合并失败: ${err.message}`);
      showToast('error', `横表合并出错: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Run CRA Vertical
  const handleRunCraVertical = async () => {
    if (craVerticalArchiveFiles.length === 0) return;
    setIsProcessing(true);
    setProgressPercent(0);
    setProgressStatus('准备执行 CRA 竖表合并...');

    try {
      let inputData: ArrayBuffer | ExtractedFileItem[];
      if (
        craVerticalArchiveFiles.length === 1 &&
        (craVerticalArchiveFiles[0].name.endsWith('.zip') || craVerticalArchiveFiles[0].name.endsWith('.7z'))
      ) {
        inputData = await craVerticalArchiveFiles[0].arrayBuffer();
      } else {
        inputData = await filesToExtractedItems(craVerticalArchiveFiles);
      }

      let tplBuffer: ArrayBuffer | null = null;
      if (craVerticalTemplateFiles.length > 0) {
        tplBuffer = await craVerticalTemplateFiles[0].arrayBuffer();
      }

      const result = await executeCraVerticalMerge(
        inputData,
        tplBuffer,
        (pct, status) => {
          setProgressPercent(pct);
          setProgressStatus(status);
        },
        (lvl, msg, det) => addLog(lvl, msg, det)
      );

      if (result.blob) {
        triggerFileDownload(result.blob, result.filename);
        setPreviewData({
          headers: result.previewHeaders || [],
          rows: result.previewRows || [],
          filename: result.filename,
          blob: result.blob,
          totalRows: result.totalRows,
        });
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        showToast('success', `CRA 竖表合并完成！已触发下载 ${result.filename}`);
      }
    } catch (err: any) {
      addLog('error', `CRA 竖表合并失败: ${err.message}`);
      showToast('error', `竖表合并出错: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Total selected files count across current mode
  const getSelectedFilesCount = () => {
    if (currentMode === 'split') return splitDataFiles.length + splitTemplateFiles.length;
    if (currentMode === 'merge') return mergeArchiveFiles.length;
    if (currentMode === 'cra') return craArchiveFiles.length + craTemplateFiles.length;
    if (currentMode === 'cra_vertical') return craVerticalArchiveFiles.length + craVerticalTemplateFiles.length;
    return 0;
  };

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden font-sans select-none bg-[#f3f4f6] dark:bg-[#121316] text-slate-800 dark:text-slate-200 transition-colors ${isMaximized ? 'p-0' : 'p-0 sm:p-1.5'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-12 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium border transition-all animate-bounce ${
          toastMessage.type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-500'
            : 'bg-red-600 text-white border-red-500'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Windows Window Frame */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-none sm:rounded-xl border border-slate-300/80 dark:border-slate-800/90 shadow-2xl bg-white dark:bg-[#181a1f] relative">
        {/* Windows 11 Title Bar */}
        <WindowsTitleBar
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onLoadSample={handleLoadSample}
          onOpenExporter={() => setShowExporterModal(true)}
          onDownloadOfflineHtml={() => {
            downloadOfflineHtml();
            addLog('success', '已触发离线单文件 HTML 应用下载: ExcelMatrixPro_离线单文件版.html');
            showToast('success', '已下载单文件离线 HTML！双击即可在任何电脑脱机运行！');
          }}
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized(!isMaximized)}
        />

        {/* Desktop Workspace Body: Sidebar + Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Windows Left Navigation Sidebar */}
          <WindowsSidebar
            currentMode={currentMode}
            onSelectMode={setCurrentMode}
            activeView={activeView}
            onSelectView={view => {
              if (view === 'exporter') {
                setShowExporterModal(true);
              } else {
                setActiveView(view);
              }
            }}
            hasPreviewData={previewData.rows.length > 0}
            totalPreviewRows={previewData.totalRows || previewData.rows.length}
          />

          {/* Central Workspace Canvas */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-[#14161a]/60">
            {activeView === 'preview' ? (
              <DataPreviewGrid
                headers={previewData.headers}
                rows={previewData.rows}
                filename={previewData.filename}
                blob={previewData.blob}
                totalRows={previewData.totalRows}
                onClear={() => {
                  setPreviewData({ headers: [], rows: [], filename: '' });
                  setActiveView('main');
                }}
              />
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                {currentMode === 'split' && (
                  <SplitPanel
                    dataFiles={splitDataFiles}
                    setDataFiles={setSplitDataFiles}
                    templateFiles={splitTemplateFiles}
                    setTemplateFiles={setSplitTemplateFiles}
                    config={splitConfig}
                    setConfig={setSplitConfig}
                    isProcessing={isProcessing}
                    onExecute={handleRunSplit}
                    onLoadSample={handleLoadSample}
                  />
                )}

                {currentMode === 'merge' && (
                  <MergePanel
                    archiveFiles={mergeArchiveFiles}
                    setArchiveFiles={setMergeArchiveFiles}
                    isProcessing={isProcessing}
                    onExecute={handleRunMerge}
                    onLoadSample={handleLoadSample}
                  />
                )}

                {currentMode === 'cra' && (
                  <CraPanel
                    archiveFiles={craArchiveFiles}
                    setArchiveFiles={setCraArchiveFiles}
                    templateFiles={craTemplateFiles}
                    setTemplateFiles={setCraTemplateFiles}
                    isProcessing={isProcessing}
                    onExecute={handleRunCraHorizontal}
                    onLoadSample={handleLoadSample}
                  />
                )}

                {currentMode === 'cra_vertical' && (
                  <CraVerticalPanel
                    archiveFiles={craVerticalArchiveFiles}
                    setArchiveFiles={setCraVerticalArchiveFiles}
                    templateFiles={craVerticalTemplateFiles}
                    setTemplateFiles={setCraVerticalTemplateFiles}
                    isProcessing={isProcessing}
                    onExecute={handleRunCraVertical}
                    onLoadSample={handleLoadSample}
                  />
                )}
              </div>
            )}

            {/* Bottom PowerShell / Terminal Console Log Drawer */}
            <ConsoleDrawer
              logs={logs}
              onClearLogs={() => setLogs([])}
              isProcessing={isProcessing}
              progressPercent={progressPercent}
              progressStatus={progressStatus}
            />
          </main>
        </div>

        {/* Windows 11 Bottom Status Bar */}
        <WindowsStatusBar
          currentMode={currentMode}
          isProcessing={isProcessing}
          totalPreviewRows={previewData.totalRows || previewData.rows.length}
          totalSelectedFiles={getSelectedFilesCount()}
        />
      </div>

      {/* Windows Desktop Exporter Dialog */}
      <WindowsDesktopExporterModal
        isOpen={showExporterModal}
        onClose={() => setShowExporterModal(false)}
      />
    </div>
  );
}
