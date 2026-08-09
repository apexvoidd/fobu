export type FileInputMode = 'photo' | 'pdf' | 'link';

export interface UploadedFileItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  sizeFormatted: string;
  type: 'image' | 'pdf' | 'url';
  mimeType: string;
  previewUrl?: string;
  uploadProgress: number; // 0 to 100
  status: 'uploading' | 'ready' | 'error';
  errorMessage?: string;
  isSample?: boolean;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type FieldTypeCategory = 
  | 'text' 
  | 'checkbox' 
  | 'radio' 
  | 'dropdown' 
  | 'date' 
  | 'signature' 
  | 'number' 
  | 'table' 
  | 'other';

export interface FormFieldResult {
  field_name: string;
  page: number;
  field_type: FieldTypeCategory;
  required: boolean;
  options: string[];
  simple_meaning: string;
  what_to_enter: string;
  example: string;
  important_note: string;
  confidence: ConfidenceLevel;
}

export interface AnalyzeFormApiResponse {
  success: boolean;
  source: 'nvidia-nim' | 'fallback-mock';
  formTitle: string;
  issuingAgency: string;
  summary: string;
  estimatedTime: string;
  requiredDocuments: string[];
  commonMistakes: string[];
  fields: FormFieldResult[];
  rawWarning?: string;
}
