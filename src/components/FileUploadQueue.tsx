'use client';

import React from 'react';
import { 
  FileText, 
  ImageIcon, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  FileCheck,
  Globe
} from 'lucide-react';
import { UploadedFileItem } from '@/types/form';

interface FileUploadQueueProps {
  files: UploadedFileItem[];
  onRemoveFile: (id: string) => void;
  onAddMoreClick: () => void;
  onPreviewFile?: (file: UploadedFileItem) => void;
}

export default function FileUploadQueue({
  files,
  onRemoveFile,
  onAddMoreClick,
  onPreviewFile
}: FileUploadQueueProps) {
  if (files.length === 0) return null;

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const formattedTotalSize = totalSize > 1024 * 1024 
    ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB` 
    : `${Math.round(totalSize / 1024)} KB`;

  return (
    <div className="space-y-4">
      {/* Queue Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            Attached Form Pages & Files ({files.length})
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            • Total: {formattedTotalSize}
          </span>
        </div>

        <button
          type="button"
          onClick={onAddMoreClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add another page</span>
        </button>
      </div>

      {/* Grid of File Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {files.map((item, idx) => (
          <div
            key={item.id}
            className="relative bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between gap-3 group hover:border-blue-300 dark:hover:border-blue-700 transition-all"
          >
            {/* Thumbnail / Icon */}
            <div className="relative shrink-0">
              {item.type === 'image' && item.previewUrl ? (
                <div className="w-12 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <img 
                    src={item.previewUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              ) : item.type === 'pdf' ? (
                <div className="w-12 h-14 rounded-lg border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex flex-col items-center justify-center">
                  <FileText className="w-6 h-6" />
                  <span className="text-[9px] font-bold mt-0.5 uppercase">PDF</span>
                </div>
              ) : (
                <div className="w-12 h-14 rounded-lg border border-blue-200 dark:border-blue-950 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center">
                  <Globe className="w-6 h-6" />
                  <span className="text-[9px] font-bold mt-0.5 uppercase">URL</span>
                </div>
              )}

              {/* Page Badge */}
              <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[10px] font-bold flex items-center justify-center shadow-xs">
                {idx + 1}
              </span>
            </div>

            {/* File Info & Progress */}
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={item.name}>
                  {item.name}
                </p>
                {item.isSample && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                    Sample
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{item.type === 'url' ? 'Web Link' : item.sizeFormatted}</span>
                {item.status === 'ready' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                )}
                {item.status === 'error' && (
                  <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-0.5">
                    <AlertCircle className="w-3 h-3" /> Error
                  </span>
                )}
              </div>

              {/* Upload Progress Bar */}
              {item.status === 'uploading' && (
                <div className="mt-2">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${item.uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Uploading... {item.uploadProgress}%
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {onPreviewFile && item.previewUrl && (
                <button
                  type="button"
                  onClick={() => onPreviewFile(item)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Preview image"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemoveFile(item.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Remove page"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
