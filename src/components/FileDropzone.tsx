import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Archive, X, Check, AlertCircle } from 'lucide-react';

interface FileDropzoneProps {
  label: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onClear: () => void;
  accentColor?: 'blue' | 'indigo' | 'teal' | 'purple';
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  label,
  hint,
  accept = '.xlsx,.xls,.xlsm,.zip,.7z',
  multiple = false,
  required = false,
  files,
  onFilesSelected,
  onClear,
  accentColor = 'blue',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (multiple) {
        onFilesSelected([...files, ...droppedFiles]);
      } else {
        onFilesSelected([droppedFiles[0]]);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      if (multiple) {
        onFilesSelected([...files, ...selected]);
      } else {
        onFilesSelected([selected[0]]);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const colorStyles = {
    blue: 'border-blue-300 dark:border-blue-700 hover:border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 text-blue-600',
    indigo: 'border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-600',
    teal: 'border-teal-300 dark:border-teal-700 hover:border-teal-500 bg-teal-50/30 dark:bg-teal-950/20 text-teal-600',
    purple: 'border-purple-300 dark:border-purple-700 hover:border-purple-500 bg-purple-50/30 dark:bg-purple-950/20 text-purple-600',
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          {label}
          {required && <span className="text-red-500 text-[10px]">*必选</span>}
        </label>
        {files.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            清除选择 ({files.length})
          </button>
        )}
      </div>

      {hint && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {hint}
        </p>
      )}

      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-100/60 dark:bg-blue-900/40 scale-[0.99]'
            : colorStyles[accentColor]
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <div className="p-2.5 rounded-full bg-white dark:bg-slate-800 shadow-xs border border-slate-200/80 dark:border-slate-700">
              <UploadCloud className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                点击选择文件 或 拖拽至此处
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                支持 {accept} {multiple ? '(支持多选批量上传)' : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-1 text-left" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                已选定 {files.length} 个文件
              </span>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                + 添加更多
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {files.map((f, i) => {
                const isArchive = f.name.endsWith('.zip') || f.name.endsWith('.7z');
                return (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isArchive ? (
                        <Archive className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">
                          {f.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {formatFileSize(f.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = files.filter((_, idx) => idx !== i);
                        onFilesSelected(newFiles);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
