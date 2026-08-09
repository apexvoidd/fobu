'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  FileText, 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsUpDown, 
  CheckSquare, 
  CircleDot, 
  ListFilter, 
  Calendar, 
  PenTool, 
  Hash, 
  Table, 
  FileQuestion,
  Copy,
  Check
} from 'lucide-react';
import { AnalyzeFormApiResponse, FormFieldResult, UploadedFileItem } from '@/types/form';

interface FormAnalysisViewProps {
  analysisData: AnalyzeFormApiResponse;
  uploadedFiles: UploadedFileItem[];
  onReset: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Safe string renderer to prevent React crash if AI returns objects/arrays in field values
function renderSafeString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val.map(item => renderSafeString(item)).filter(Boolean).join(', ');
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${renderSafeString(v)}`)
      .join(', ');
  }
  return String(val);
}

export default function FormAnalysisView({
  analysisData,
  uploadedFiles,
  onReset,
  onShowToast
}: FormAnalysisViewProps) {
  // Page Preview State
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPageFilter, setSelectedPageFilter] = useState<string>('all');
  const [requiredOnlyFilter, setRequiredOnlyFilter] = useState<boolean>(false);
  const [copiedFieldName, setCopiedFieldName] = useState<string | null>(null);

  // Expand / Collapse State
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (analysisData.fields || []).forEach(f => {
      if (f && f.field_name) {
        initial[renderSafeString(f.field_name)] = true;
      }
    });
    return initial;
  });

  const availablePages = useMemo(() => {
    const pagesSet = new Set<number>();
    (analysisData.fields || []).forEach(f => pagesSet.add(f.page || 1));
    return Array.from(pagesSet).sort((a, b) => a - b);
  }, [analysisData.fields]);

  const filteredFields = useMemo(() => {
    return (analysisData.fields || []).filter(field => {
      if (!field) return false;

      if (requiredOnlyFilter && !field.required) {
        return false;
      }

      if (selectedPageFilter !== 'all' && (field.page || 1).toString() !== selectedPageFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const fieldNameStr = renderSafeString(field.field_name).toLowerCase();
        const meaningStr = renderSafeString(field.simple_meaning).toLowerCase();
        const guidanceStr = renderSafeString(field.what_to_enter).toLowerCase();
        const exampleStr = renderSafeString(field.example).toLowerCase();
        const noteStr = renderSafeString(field.important_note).toLowerCase();
        const optionsStr = Array.isArray(field.options) ? field.options.map(o => renderSafeString(o)).join(' ').toLowerCase() : '';

        return fieldNameStr.includes(query) || 
               meaningStr.includes(query) || 
               guidanceStr.includes(query) || 
               exampleStr.includes(query) || 
               noteStr.includes(query) || 
               optionsStr.includes(query);
      }

      return true;
    });
  }, [analysisData.fields, searchQuery, selectedPageFilter, requiredOnlyFilter]);

  const toggleFieldExpand = (fieldName: string) => {
    const key = renderSafeString(fieldName);
    setExpandedFields(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isAllExpanded = useMemo(() => {
    if (filteredFields.length === 0) return false;
    return filteredFields.every(f => expandedFields[renderSafeString(f.field_name)]);
  }, [filteredFields, expandedFields]);

  const handleToggleExpandAll = () => {
    const nextState = !isAllExpanded;
    const updated: Record<string, boolean> = { ...expandedFields };
    filteredFields.forEach(f => {
      updated[renderSafeString(f.field_name)] = nextState;
    });
    setExpandedFields(updated);
  };

  const handleCopyExample = (fieldName: string, exampleValue: any) => {
    const textToCopy = renderSafeString(exampleValue);
    navigator.clipboard.writeText(textToCopy);
    setCopiedFieldName(fieldName);
    if (onShowToast) onShowToast(`Copied example for "${renderSafeString(fieldName)}"`, 'success');
    setTimeout(() => setCopiedFieldName(null), 2000);
  };

  const getFieldTypeBadge = (type: string) => {
    const t = renderSafeString(type).toLowerCase();
    switch (t) {
      case 'checkbox':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            <CheckSquare className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Checkbox Group
          </span>
        );
      case 'radio':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            <CircleDot className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Choice List
          </span>
        );
      case 'dropdown':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
            <ListFilter className="w-3 h-3 text-teal-600 dark:text-teal-400" /> Dropdown Menu
          </span>
        );
      case 'date':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Date Entry
          </span>
        );
      case 'signature':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <PenTool className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Signature
          </span>
        );
      case 'number':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
            <Hash className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> Number Input
          </span>
        );
      case 'table':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Table className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Table Row
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <FileText className="w-3 h-3" /> Text Field
          </span>
        );
    }
  };

  const currentPreviewFile = uploadedFiles[selectedPageIndex] || uploadedFiles[0];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              NVIDIA NIM Form Analysis Complete
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {renderSafeString(analysisData.issuingAgency)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {renderSafeString(analysisData.formTitle)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {renderSafeString(analysisData.summary)}
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Analyze another form"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Analyze Another Form</span>
        </button>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Document Preview */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Document Preview
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Page {selectedPageIndex + 1} of {Math.max(uploadedFiles.length, 1)}
              </span>
            </div>

            {/* Preview Box */}
            <div className="relative w-full h-[360px] sm:h-[420px] rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden group">
              {currentPreviewFile?.type === 'image' && currentPreviewFile.previewUrl ? (
                <img
                  src={currentPreviewFile.previewUrl}
                  alt={currentPreviewFile.name}
                  className="w-full h-full object-contain p-2"
                />
              ) : currentPreviewFile?.type === 'pdf' ? (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-20 rounded-xl bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400 flex flex-col items-center justify-center mb-3 shadow-sm border border-red-200 dark:border-red-900">
                    <FileText className="w-8 h-8" />
                    <span className="text-[10px] font-bold mt-1">PDF</span>
                  </div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-xs">
                    {currentPreviewFile.name}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    PDF Document • {currentPreviewFile.sizeFormatted}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center mb-3">
                    <Globe className="w-8 h-8" />
                  </div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-xs">
                    {currentPreviewFile?.name || 'Web Form Document'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Web Link Source
                  </span>
                </div>
              )}

              {uploadedFiles.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white border border-white/10">
                  <button
                    type="button"
                    onClick={() => setSelectedPageIndex(prev => Math.max(prev - 1, 0))}
                    disabled={selectedPageIndex === 0}
                    className="p-1 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-white"
                    aria-label="Previous page preview"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold">
                    {selectedPageIndex + 1} / {uploadedFiles.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPageIndex(prev => Math.min(prev + 1, uploadedFiles.length - 1))}
                    disabled={selectedPageIndex === uploadedFiles.length - 1}
                    className="p-1 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-white"
                    aria-label="Next page preview"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {uploadedFiles.length > 1 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
                {uploadedFiles.map((file, idx) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedPageIndex(idx)}
                    className={`shrink-0 w-12 h-14 rounded-lg overflow-hidden border-2 transition-all flex items-center justify-center text-[10px] font-bold ${
                      selectedPageIndex === idx
                        ? 'border-blue-600 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {file.type === 'image' && file.previewUrl ? (
                      <img src={file.previewUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <span>Page {idx + 1}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Review the right column for field-by-field guidance, required indicators, available options, and confidence warnings.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Detected Fields */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Search Bar */}
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search fields (e.g. Name, Tax ID, Address)..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  aria-label="Search form fields"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Filter by Page */}
                <div className="relative">
                  <select
                    value={selectedPageFilter}
                    onChange={(e) => setSelectedPageFilter(e.target.value)}
                    className="pl-8 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    aria-label="Filter fields by page"
                  >
                    <option value="all">All Pages ({analysisData.fields ? analysisData.fields.length : 0})</option>
                    {availablePages.map(page => (
                      <option key={page} value={page.toString()}>
                        Page {page}
                      </option>
                    ))}
                  </select>
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Required Only Filter Toggle */}
                <button
                  type="button"
                  onClick={() => setRequiredOnlyFilter(prev => !prev)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    requiredOnlyFilter
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {requiredOnlyFilter ? 'Required Only' : 'All Fields'}
                </button>

                {/* Expand / Collapse All */}
                <button
                  type="button"
                  onClick={handleToggleExpandAll}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs flex items-center gap-1 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isAllExpanded ? 'Collapse' : 'Expand'}</span>
                </button>
              </div>

            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>
                Showing <strong className="text-slate-900 dark:text-white">{filteredFields.length}</strong> of {analysisData.fields ? analysisData.fields.length : 0} detected fields
              </span>

              {(searchQuery || selectedPageFilter !== 'all' || requiredOnlyFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedPageFilter('all');
                    setRequiredOnlyFilter(false);
                  }}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>

          </div>

          {/* EMPTY STATE: 0 Detected Fields */}
          {(!analysisData.fields || analysisData.fields.length === 0) && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                <FileQuestion className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                No form fields detected
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                FormBuddy could not automatically detect individual input fields or boxes in this document. Please ensure the uploaded file contains legible text or try uploading a high-resolution photo or digital PDF.
              </p>
              <button
                type="button"
                onClick={onReset}
                className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-sm"
              >
                Upload Another Document
              </button>
            </div>
          )}

          {/* EMPTY SEARCH RESULTS STATE */}
          {analysisData.fields && analysisData.fields.length > 0 && filteredFields.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                No matching fields found
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Try adjusting your search query or reset the filter settings.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPageFilter('all');
                  setRequiredOnlyFilter(false);
                }}
                className="mt-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold text-xs rounded-xl border border-blue-200 dark:border-blue-800"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* FIELD CARDS LIST */}
          <div className="space-y-4">
            {filteredFields.map((field, idx) => {
              const fieldNameStr = renderSafeString(field.field_name);
              const simpleMeaningStr = renderSafeString(field.simple_meaning);
              const whatToEnterStr = renderSafeString(field.what_to_enter);
              const exampleStr = renderSafeString(field.example);
              const importantNoteStr = renderSafeString(field.important_note);

              const isExpanded = !!expandedFields[fieldNameStr];
              const hasImportantNote = 
                importantNoteStr.trim() !== '' && 
                importantNoteStr.trim().toUpperCase() !== 'N/A' &&
                importantNoteStr.trim().toLowerCase() !== 'none';

              const hasOptions = Array.isArray(field.options) && field.options.length > 0;
              const isLowConfidence = field.confidence === 'low' || field.confidence === 'medium';
              const isCopied = copiedFieldName === fieldNameStr;

              return (
                <div
                  key={idx}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition-all ${
                    isLowConfidence 
                      ? 'border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-400/20' 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Card Header */}
                  <button
                    type="button"
                    onClick={() => toggleFieldExpand(fieldNameStr)}
                    aria-expanded={isExpanded}
                    className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex items-start gap-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0 mt-0.5">
                        Page {field.page || 1}
                      </span>

                      <div>
                        {/* Field Name & Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                            {fieldNameStr}
                          </h3>

                          {field.required ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                              Required
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              Optional
                            </span>
                          )}

                          {getFieldTypeBadge(field.field_type)}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {simpleMeaningStr}
                        </p>
                      </div>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </button>

                  {/* Card Body */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 space-y-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                      
                      {/* LOW CONFIDENCE WARNING ALERT */}
                      {field.confidence === 'low' && (
                        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Low Confidence Warning</span>
                            <p className="mt-0.5 leading-relaxed">
                              The AI is not fully certain about this field label or requirement from the scanned text. Please double-check your official document carefully.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Section 1: What does this mean? */}
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                          What does this mean?
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
                          {simpleMeaningStr}
                        </p>
                      </div>

                      {/* Section 2: What should I enter? */}
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                          What should I enter?
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          {whatToEnterStr}
                        </p>
                      </div>

                      {/* Section 3: Available Options / Choices */}
                      {hasOptions && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block mb-1.5 flex items-center gap-1.5">
                            <ListFilter className="w-3.5 h-3.5 text-purple-600" />
                            Available Options / Choices
                          </span>
                          <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 flex flex-wrap gap-2">
                            {field.options.map((opt, optIdx) => (
                              <span
                                key={optIdx}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-xs flex items-center gap-1.5"
                              >
                                <CheckSquare className="w-3 h-3 text-purple-500" />
                                {renderSafeString(opt)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 4: Example */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Example
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyExample(fieldNameStr, exampleStr)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Example</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-3.5 rounded-xl font-mono text-xs sm:text-sm border border-slate-800 flex items-center justify-between">
                          <span>"{exampleStr}"</span>
                        </div>
                      </div>

                      {/* Section 5: Important note */}
                      {hasImportantNote && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1.5 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            Important note
                          </span>
                          <div className="bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs sm:text-sm leading-relaxed">
                            {importantNoteStr}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
