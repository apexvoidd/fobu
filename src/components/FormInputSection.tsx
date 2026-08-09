'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, 
  FileText, 
  Link as LinkIcon, 
  UploadCloud, 
  ArrowRight, 
  AlertCircle, 
  Sparkles,
  RefreshCw,
  Lock,
  Plus,
  Cpu,
  RotateCcw
} from 'lucide-react';
import { UploadedFileItem, AnalyzeFormApiResponse } from '@/types/form';
import FileUploadQueue from './FileUploadQueue';
import FormAnalysisView from './FormAnalysisView';
import Toast, { ToastMessage } from './Toast';

export type InputMode = 'photo' | 'pdf' | 'link';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const SAMPLE_PRESETS = [
  {
    title: 'IRS Form W-9',
    category: 'Taxes & Business',
    desc: 'Request for Taxpayer Identification Number',
    type: 'pdf' as InputMode,
    fileName: 'IRS_Form_W9_2026.pdf',
    fileSize: 188416
  },
  {
    title: 'Passport Renewal (DS-82)',
    category: 'Government ID',
    desc: 'U.S. Passport Renewal Application',
    type: 'pdf' as InputMode,
    fileName: 'Passport_Renewal_DS82.pdf',
    fileSize: 430080
  },
  {
    title: 'DMV Driver License Application',
    category: 'Motor Vehicles',
    desc: 'State Driver License / ID Form (Photo)',
    type: 'photo' as InputMode,
    fileName: 'DMV_DL_Page_1.jpg',
    fileSize: 2411724
  },
  {
    title: 'SNAP / Food Assistance Form',
    category: 'State Benefits',
    desc: 'State Benefits Eligibility Application',
    type: 'link' as InputMode,
    fileName: 'https://benefits.gov/apply/snap-application-2026',
    linkUrl: 'https://benefits.gov/apply/snap-application-2026'
  }
];

export default function FormInputSection() {
  const [activeMode, setActiveMode] = useState<InputMode>('photo');
  const [fileList, setFileList] = useState<UploadedFileItem[]>([]);
  const [urlInputValue, setUrlInputValue] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Analysis & View State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStepIndex, setAnalysisStepIndex] = useState<number>(0);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState<boolean>(false);
  const [analysisResultData, setAnalysisResultData] = useState<AnalyzeFormApiResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ANALYSIS_STEPS = [
    'Uploading document content securely...',
    'Reading form layout, text & field boundaries...',
    'Understanding fields with NVIDIA NIM AI Vision...',
    'Preparing plain-English explanations & examples...'
  ];

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleTabChange = (mode: InputMode) => {
    if (isAnalyzing) return;
    setActiveMode(mode);
    setErrorMessage('');
    setAnalysisError(null);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    if (isAnalyzing) return;
    setErrorMessage('');
    setAnalysisError(null);
    const fileArray = Array.from(files);
    const newItems: UploadedFileItem[] = [];
    const errors: string[] = [];

    fileArray.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${file.name}" exceeds the 25MB limit.`);
        return;
      }

      const isImg = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isPdf = file.type === 'application/pdf';

      if (activeMode === 'photo' && !isImg) {
        errors.push(`"${file.name}" is not a supported image file. Please upload JPG, PNG, or HEIC.`);
        return;
      }

      if (activeMode === 'pdf' && !isPdf) {
        errors.push(`"${file.name}" is not a PDF file. Please upload a PDF document.`);
        return;
      }

      const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;

      newItems.push({
        id,
        file,
        name: file.name,
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        type: isImg ? 'image' : 'pdf',
        mimeType: file.type,
        previewUrl,
        uploadProgress: 100,
        status: 'ready'
      });
    });

    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
      addToast(errors[0], 'error');
    }

    if (newItems.length > 0) {
      setFileList(prev => [...prev, ...newItems]);
      addToast(`Added ${newItems.length} file${newItems.length > 1 ? 's' : ''}`, 'success');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAnalyzing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isAnalyzing) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleApplyLink = () => {
    if (isAnalyzing) return;
    const trimmed = urlInputValue.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a form web link or PDF URL.');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMessage('URL must start with http:// or https://');
      return;
    }

    setErrorMessage('');
    setAnalysisError(null);
    const id = `url-${Date.now()}`;
    const newItem: UploadedFileItem = {
      id,
      name: trimmed,
      size: 0,
      sizeFormatted: 'Web Document Link',
      type: 'url',
      mimeType: 'text/html',
      uploadProgress: 100,
      status: 'ready'
    };

    setFileList(prev => [...prev, newItem]);
    setUrlInputValue('');
    addToast('Web form link attached', 'success');
  };

  const handleSelectSample = (sample: typeof SAMPLE_PRESETS[0]) => {
    if (isAnalyzing) return;
    setActiveMode(sample.type);
    setErrorMessage('');
    setAnalysisError(null);

    if (sample.type === 'link') {
      const newItem: UploadedFileItem = {
        id: `sample-${Date.now()}`,
        name: sample.linkUrl!,
        size: 0,
        sizeFormatted: 'Web Document Link',
        type: 'url',
        mimeType: 'text/html',
        uploadProgress: 100,
        status: 'ready',
        isSample: true
      };
      setFileList([newItem]);
    } else {
      const newItem: UploadedFileItem = {
        id: `sample-${Date.now()}`,
        name: sample.fileName,
        size: sample.fileSize || 0,
        sizeFormatted: formatBytes(sample.fileSize || 0),
        type: sample.type === 'photo' ? 'image' : 'pdf',
        mimeType: sample.type === 'photo' ? 'image/jpeg' : 'application/pdf',
        uploadProgress: 100,
        status: 'ready',
        isSample: true
      };
      setFileList([newItem]);
    }
    addToast(`Loaded sample preset: ${sample.title}`, 'info');
  };

  const handleRemoveFile = (id: string) => {
    if (isAnalyzing) return;
    setFileList(prev => prev.filter(f => f.id !== id));
    addToast('File removed', 'info');
  };

  const handleResetAll = () => {
    setFileList([]);
    setUrlInputValue('');
    setErrorMessage('');
    setAnalysisError(null);
    setIsAnalyzing(false);
    setIsAnalysisComplete(false);
    setAnalysisResultData(null);
  };

  // Start Form Analysis (with Duplicate Protection)
  const handleStartAnalysis = async () => {
    if (fileList.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStepIndex(0);

    const stepInterval = setInterval(() => {
      setAnalysisStepIndex(prev => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
    }, 750);

    try {
      const formData = new FormData();
      fileList.forEach(item => {
        if (item.file) {
          formData.append('files', item.file);
        } else if (item.type === 'url') {
          formData.append('linkUrl', item.name);
        }
      });

      const res = await fetch('/api/analyze-form', {
        method: 'POST',
        body: formData
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned status ${res.status}`);
      }

      const data: AnalyzeFormApiResponse = await res.json();
      setAnalysisResultData(data);
      setIsAnalyzing(false);
      setIsAnalysisComplete(true);
      addToast('Form analysis complete!', 'success');

    } catch (err: any) {
      console.error('Error analyzing form:', err);
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      
      let friendlyMsg = err.message || 'An unexpected error occurred while analyzing the form.';
      if (friendlyMsg.includes('Failed to fetch')) {
        friendlyMsg = 'We could not connect to the analysis server. Please check your internet connection and try again.';
      }

      setAnalysisError(friendlyMsg);
      addToast('Analysis failed. Please click retry.', 'error');
    }
  };

  return (
    <section className="py-8 sm:py-12 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200/60 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* Toast Notifications */}
        <Toast toasts={toasts} onDismiss={dismissToast} />

        {/* RESULTS VIEW */}
        {isAnalysisComplete && analysisResultData ? (
          <FormAnalysisView
            analysisData={analysisResultData}
            uploadedFiles={fileList}
            onReset={handleResetAll}
            onShowToast={addToast}
          />
        ) : (
          /* UPLOAD VIEW */
          <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            
            {/* Header Bar */}
            <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 text-center max-w-xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-3">
                <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                AI Form Assistant
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Upload your form pages or document
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Upload photos, a PDF document, or paste a link. FormBuddy will explain every field box in simple words.
              </p>

              {/* 3 Mode Tabs */}
              <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => handleTabChange('photo')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    activeMode === 'photo'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`p-1.5 rounded-lg ${activeMode === 'photo' ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400' : 'bg-slate-200/60 dark:bg-slate-700/60'}`}>
                    <Camera className="w-4 h-4" />
                  </div>
                  <span>Upload Photos</span>
                </button>

                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => handleTabChange('pdf')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    activeMode === 'pdf'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`p-1.5 rounded-lg ${activeMode === 'pdf' ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400' : 'bg-slate-200/60 dark:bg-slate-700/60'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>Upload PDF</span>
                </button>

                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => handleTabChange('link')}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    activeMode === 'link'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`p-1.5 rounded-lg ${activeMode === 'link' ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400' : 'bg-slate-200/60 dark:bg-slate-700/60'}`}>
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <span>Paste Form Link</span>
                </button>
              </div>
            </div>

            {/* Main Upload Content */}
            <div className="p-6 sm:p-10 space-y-6">
              
              <input
                type="file"
                ref={fileInputRef}
                multiple
                disabled={isAnalyzing}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFilesSelected(e.target.files);
                  }
                }}
                accept={
                  activeMode === 'photo' 
                    ? 'image/jpeg,image/jpg,image/png,image/webp,image/heic' 
                    : 'application/pdf'
                }
                className="hidden"
              />

              {/* Validation Error Banner */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">File Selection Notice</span>
                    <p className="mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* ERROR STATE: Analysis Failed with Retry Button */}
              {analysisError && (
                <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-200 dark:border-rose-900 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-base text-rose-900 dark:text-rose-200">
                        Unable to analyze form
                      </h4>
                      <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                        {analysisError}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleStartAnalysis}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry AI Analysis</span>
                    </button>
                  </div>
                </div>
              )}

              {/* File Queue Cards */}
              {fileList.length > 0 && (
                <FileUploadQueue 
                  files={fileList}
                  onRemoveFile={handleRemoveFile}
                  onAddMoreClick={() => fileInputRef.current?.click()}
                />
              )}

              {/* Dropzone */}
              {activeMode !== 'link' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                  className={`group relative flex flex-col items-center justify-center p-8 sm:p-10 border-2 border-dashed rounded-2xl transition-all ${
                    isAnalyzing
                      ? 'border-slate-200 bg-slate-50 dark:bg-slate-800/20 cursor-not-allowed opacity-60'
                      : isDragging
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 scale-[1.01] cursor-pointer'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 cursor-pointer'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    {activeMode === 'photo' ? (
                      <Camera className="w-7 h-7" />
                    ) : (
                      <UploadCloud className="w-7 h-7" />
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white text-center">
                    {activeMode === 'photo'
                      ? fileList.length > 0 
                        ? 'Click or drag to add more photos of form pages' 
                        : 'Drop photos of form pages here or click to browse'
                      : fileList.length > 0
                        ? 'Click or drag to add more PDF documents'
                        : 'Drop your PDF form file here or click to browse'}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center mt-1 max-w-md">
                    {activeMode === 'photo'
                      ? 'Supports JPG, JPEG, PNG, WEBP & HEIC up to 25MB per page.'
                      : 'Upload official PDF applications or scanned forms (up to 25MB per file).'}
                  </p>

                  <button
                    type="button"
                    disabled={isAnalyzing}
                    className="mt-4 px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs sm:text-sm rounded-xl group-hover:bg-blue-600 dark:group-hover:bg-blue-500 dark:group-hover:text-white transition-colors shadow-xs flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{fileList.length > 0 ? 'Select More Files' : 'Select Form Files'}</span>
                  </button>
                </div>
              )}

              {/* Link Input Mode */}
              {activeMode === 'link' && (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Paste the Web Link or PDF URL of your form:
                  </label>
                  <div className="relative flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <LinkIcon className="w-5 h-5" />
                      </div>
                      <input
                        type="url"
                        disabled={isAnalyzing}
                        value={urlInputValue}
                        onChange={(e) => setUrlInputValue(e.target.value)}
                        placeholder="https://www.irs.gov/pub/irs-pdf/fw9.pdf"
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={handleApplyLink}
                      className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shrink-0 shadow-xs flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Link</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CLEAR PROGRESS LOADING STATE */}
              {isAnalyzing && (
                <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        FormBuddy AI is analyzing your document...
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 font-medium">
                        {ANALYSIS_STEPS[analysisStepIndex]}
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-500 rounded-full"
                      style={{ width: `${((analysisStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* ANALYZE BUTTON (With Protection Against Duplicate Submissions) */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  <span>Files processed securely via NVIDIA NIM API.</span>
                </div>

                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  disabled={fileList.length === 0 || isAnalyzing}
                  className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fileList.length === 0 || isAnalyzing
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none opacity-70'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-700 hover:via-indigo-700 hover:to-teal-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                  aria-label="Analyze form with AI"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-white" />
                      <span>Analyzing Form...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>Analyze Form ({fileList.length} attached)</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              {/* Sample Presets */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Or test with a sample official form:
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {SAMPLE_PRESETS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => handleSelectSample(sample)}
                      className={`p-3 text-left rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                        {sample.category}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 block mt-0.5 truncate">
                        {sample.title}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                        {sample.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}
