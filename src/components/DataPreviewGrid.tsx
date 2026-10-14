import React, { useState, useMemo } from 'react';
import {
  Download,
  Search,
  FileSpreadsheet,
  ArrowUpDown,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { triggerFileDownload } from '../engine/excelUtils';

interface DataPreviewGridProps {
  headers: string[];
  rows: any[][];
  filename?: string;
  blob?: Blob;
  totalRows?: number;
  onClear: () => void;
}

export const DataPreviewGrid: React.FC<DataPreviewGridProps> = ({
  headers,
  rows,
  filename = 'result.xlsx',
  blob,
  totalRows,
  onClear,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [copiedCsv, setCopiedCsv] = useState(false);

  // Filter rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r =>
      r.some(cell => String(cell || '').toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (sortCol === null) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      // Numeric comparison
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }

      // String comparison
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredRows, sortCol, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (colIndex: number) => {
    if (sortCol === colIndex) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colIndex);
      setSortAsc(true);
    }
  };

  const handleDownloadBlob = () => {
    if (blob) {
      triggerFileDownload(blob, filename);
    }
  };

  const handleCopyAsCsv = () => {
    const csvContent = [
      headers.join(','),
      ...rows.map(r =>
        r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  if (headers.length === 0 || rows.length === 0) {
    return (
      <div className="p-12 text-center select-none flex flex-col items-center justify-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
          <FileSpreadsheet className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            暂无预览数据
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            请在左侧选择对应功能并执行批处理任务，或点击右上角「加载样例数据」以查看实际数据网格与字段。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 flex flex-col h-full overflow-hidden">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                {filename}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                共 {totalRows || rows.length} 行 / {headers.length} 列
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索表格内容..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-44 focus:w-56 transition-all"
            />
          </div>

          <button
            onClick={handleCopyAsCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors"
            title="复制表格为 CSV 文本"
          >
            {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>复制 CSV</span>
          </button>

          {blob && (
            <button
              onClick={handleDownloadBlob}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载结果文件</span>
            </button>
          )}

          <button
            onClick={onClear}
            className="px-2 py-1.5 text-xs text-slate-400 hover:text-red-500"
            title="关闭预览"
          >
            清空
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid Container */}
      <div className="flex-1 min-h-[300px] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#16181d] shadow-xs flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/95 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold select-none">
              <tr>
                <th className="p-2.5 w-12 text-center text-slate-400 border-r border-slate-200 dark:border-slate-700">
                  #
                </th>
                {headers.map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    onClick={() => handleSort(i)}
                    className="p-2.5 whitespace-nowrap border-r border-slate-200 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>{h}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pageRows.map((row, rIdx) => {
                const absRowIndex = (currentPage - 1) * pageSize + rIdx + 1;
                return (
                  <tr
                    key={rIdx}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <td className="p-2 text-center font-mono text-[11px] text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 border-r border-slate-200/80 dark:border-slate-800 select-none">
                      {absRowIndex}
                    </td>
                    {headers.map((_, cIdx) => {
                      const val = row[cIdx];
                      const valStr = val !== null && val !== undefined ? String(val) : '';
                      const isMultiLine = valStr.includes('\n');
                      return (
                        <td
                          key={cIdx}
                          className="p-2 border-r border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 max-w-xs truncate"
                          title={valStr}
                        >
                          {isMultiLine ? (
                            <span className="whitespace-pre-line text-[11px] block text-slate-700 dark:text-slate-300 font-sans">
                              {valStr}
                            </span>
                          ) : (
                            <span className={typeof val === 'number' ? 'font-mono text-blue-600 dark:text-blue-400' : ''}>
                              {valStr || <span className="text-slate-300 dark:text-slate-600 italic">空</span>}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400 select-none">
          <div className="flex items-center gap-2">
            <span>
              显示 {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, sortedRows.length)} 项，共 {sortedRows.length} 项
            </span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value={15}>每页 15 行</option>
              <option value={30}>每页 30 行</option>
              <option value={50}>每页 50 行</option>
              <option value={100}>每页 100 行</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
