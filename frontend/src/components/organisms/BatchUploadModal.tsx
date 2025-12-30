import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Star, AlertCircle } from 'lucide-react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { clsx } from 'clsx';

interface FileWithMeta {
  file: File;
  isPrimary: boolean;
}

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (groupId: string) => void;
  projectId: string;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-yaml',
  'text/yaml',
  'application/json',
  'text/markdown',
  'text/plain',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.yaml', '.yml', '.json', '.md', '.markdown', '.txt'];
const MAX_FILES = 10;
const MIN_FILES = 2;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

function isValidFileType(file: File): boolean {
  const ext = getFileExtension(file.name);
  return ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_TYPES.includes(file.type);
}

export function BatchUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  projectId,
}: BatchUploadModalProps) {
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const canUpload = files.length >= MIN_FILES && files.length <= MAX_FILES && totalSize <= MAX_TOTAL_SIZE;

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles: FileWithMeta[] = [];
    const errors: string[] = [];

    Array.from(newFiles).forEach(file => {
      if (!isValidFileType(file)) {
        errors.push(`${file.name}: Unsupported file type`);
        return;
      }
      if (files.length + validFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`);
        return;
      }
      validFiles.push({ file, isPrimary: files.length === 0 && validFiles.length === 0 });
    });

    if (errors.length > 0 && errors[0]) {
      setError(errors[0]);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setError(null);
    }
  }, [files.length]);

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      // If we removed the primary, make the first one primary
      if (prev[index]?.isPrimary && newFiles.length > 0 && newFiles[0]) {
        newFiles[0] = { file: newFiles[0].file, isPrimary: true };
      }
      return newFiles;
    });
    setError(null);
  };

  const setPrimaryFile = (index: number) => {
    setFiles(prev => prev.map((f, i) => ({
      ...f,
      isPrimary: i === index,
    })));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!canUpload) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f.file));
      if (groupName.trim()) {
        formData.append('groupName', groupName.trim());
      }
      const primaryIndex = files.findIndex(f => f.isPrimary);
      if (primaryIndex >= 0) {
        formData.append('primarySpecIndex', String(primaryIndex));
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/projects/${projectId}/specs/batch`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Upload failed');
      }

      const { data } = await response.json();
      onUploadComplete(data.specGroupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      setGroupName('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Batch Upload Specs"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={!canUpload || isUploading}
            loading={isUploading}
          >
            Upload {files.length} File{files.length !== 1 ? 's' : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-toucan-error/20 border border-toucan-error rounded-md text-toucan-error text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Dropzone */}
        <div
          data-testid="dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsx(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-toucan-orange bg-toucan-orange/10'
              : 'border-toucan-dark-border hover:border-toucan-grey-400'
          )}
        >
          <Upload className="mx-auto mb-3 text-toucan-grey-400" size={32} />
          <p className="text-toucan-grey-100 font-medium mb-1">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-toucan-grey-400">
            PDF, DOCX, YAML, JSON, MD - Up to {MAX_FILES} files, {formatFileSize(MAX_TOTAL_SIZE)} total
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-toucan-grey-400">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </span>
              <span className={clsx(
                'text-sm',
                totalSize > MAX_TOTAL_SIZE ? 'text-toucan-error' : 'text-toucan-grey-400'
              )}>
                {formatFileSize(totalSize)} / {formatFileSize(MAX_TOTAL_SIZE)}
              </span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {files.map((f, index) => (
                <div
                  key={`${f.file.name}-${index}`}
                  data-testid="file-list-item"
                  className={clsx(
                    'flex items-center gap-3 p-2 rounded-md',
                    f.isPrimary ? 'bg-toucan-orange/10 border border-toucan-orange/30' : 'bg-toucan-dark'
                  )}
                >
                  <FileText size={16} className="text-toucan-grey-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-toucan-grey-100 truncate">{f.file.name}</p>
                    <p className="text-xs text-toucan-grey-400">{formatFileSize(f.file.size)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrimaryFile(index);
                      }}
                      className={clsx(
                        'p-1 rounded transition-colors',
                        f.isPrimary
                          ? 'text-toucan-orange'
                          : 'text-toucan-grey-600 hover:text-toucan-orange'
                      )}
                      title={f.isPrimary ? 'Primary document' : 'Set as primary'}
                    >
                      <Star size={14} fill={f.isPrimary ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="p-1 text-toucan-grey-400 hover:text-toucan-error rounded transition-colors"
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {files.length < MIN_FILES && (
              <p className="text-sm text-toucan-warning">
                Add at least {MIN_FILES - files.length} more file{MIN_FILES - files.length !== 1 ? 's' : ''} to upload
              </p>
            )}
          </div>
        )}

        {/* Group name input */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
            Group Name (optional)
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={`Batch Upload - ${new Date().toLocaleDateString()}`}
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-600 focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent"
          />
        </div>

        {/* Uploading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-toucan-dark-lighter/90 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <Spinner size="lg" className="mx-auto mb-3" />
              <p className="text-toucan-grey-100 font-medium">Uploading files...</p>
              <p className="text-sm text-toucan-grey-400">This may take a moment</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
