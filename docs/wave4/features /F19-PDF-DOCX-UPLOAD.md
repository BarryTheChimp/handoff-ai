# F19: PDF/DOCX Upload Fix + File Preview

> **Priority:** CRITICAL | **Effort:** 3 hours | **Phase:** 1

---

## Overview

**What:** Fix the broken PDF and DOCX extraction pipeline and add in-app file preview.

**Why:** Users reported that PDF uploads fail silently, only markdown/yaml work. This is a critical blocker - most enterprise specs are in PDF or Word format. Without this, Handoff AI is unusable for real-world workflows.

**Success Criteria:**
- PDF files upload and extract text correctly (including tables)
- DOCX files upload and extract text with formatting preserved
- Users can preview uploaded files within the app
- Extraction errors show clear error messages, not silent failures

---

## User Stories

### Must Have

**US-19.1:** As a PM, I want to upload PDF specification documents so that I can translate them into user stories.
- **AC:** Upload a 10-page PDF, see status change to "extracting", then "ready"
- **AC:** Extracted text preserves section headings and paragraph structure
- **AC:** Tables are extracted as formatted text (not garbled)

**US-19.2:** As a PM, I want to upload DOCX specification documents so that I can use Microsoft Word files directly.
- **AC:** Upload a .docx file, see successful extraction
- **AC:** Bullet points and numbered lists are preserved
- **AC:** Bold/italic formatting is converted to markdown equivalents

**US-19.3:** As a user, I want to see clear error messages when extraction fails so that I know what went wrong.
- **AC:** If PDF is encrypted, show "This PDF is password-protected. Please upload an unprotected version."
- **AC:** If PDF is image-only (scanned), show "This PDF contains only images. Please upload a text-based PDF or use OCR first."
- **AC:** If file is corrupted, show "Could not read this file. It may be corrupted."

### Should Have

**US-19.4:** As a user, I want to preview uploaded files in the app so that I can verify the right document was uploaded.
- **AC:** Click "Preview" on any spec to see the original document
- **AC:** PDF preview renders pages with scroll
- **AC:** DOCX preview shows formatted text (not raw XML)

---

## Functional Requirements

| ID | Requirement | Testable Criteria |
|----|-------------|-------------------|
| FR-19.1 | System shall extract text from PDF files using pdf-parse library | Upload test PDF, verify extractedText is populated |
| FR-19.2 | System shall extract text from DOCX files using mammoth library | Upload test DOCX, verify extractedText is populated |
| FR-19.3 | System shall detect and report encrypted PDFs | Upload password-protected PDF, verify error message |
| FR-19.4 | System shall detect and report image-only PDFs | Upload scanned PDF, verify error message |
| FR-19.5 | System shall preserve section headings during extraction | Upload PDF with headers, verify markdown headers in output |
| FR-19.6 | System shall preserve table structure as text | Upload PDF with table, verify columns/rows readable |
| FR-19.7 | System shall provide file preview endpoint | GET /api/specs/:id/preview returns file or rendered preview |
| FR-19.8 | System shall store original file for preview | Original file persists in storage, not deleted after extraction |

---

## Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-19.1 | PDF extraction time | < 5 seconds for 20 pages |
| NFR-19.2 | DOCX extraction time | < 3 seconds for 20 pages |
| NFR-19.3 | Maximum file size | 50MB |
| NFR-19.4 | Supported PDF versions | PDF 1.4 - 2.0 |
| NFR-19.5 | Error message clarity | Non-technical language, actionable |

---

## Technical Design

### Root Cause Analysis

Based on the SPEC-WRITING-CONTEXT.md, the ExtractionService already uses:
- `pdf-parse` for PDF extraction
- `mammoth` for DOCX extraction

Likely issues:
1. **Error handling:** Exceptions not caught, causing silent failures
2. **Buffer handling:** File buffer may not be passed correctly from multipart upload
3. **Status update:** Status may not update to "error" on failure
4. **Table handling:** pdf-parse doesn't handle tables well by default

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ExtractionService (Fixed)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  extractFromFile(filePath, fileType)                            │
│  ├── Validate file exists and is readable                       │
│  ├── Route to correct extractor based on fileType               │
│  ├── Wrap extraction in try/catch                               │
│  ├── Detect extraction issues (empty text, image-only)          │
│  └── Return { success, text, error?, metadata }                 │
│                                                                 │
│  extractFromPDF(filePath)                                       │
│  ├── Read file buffer                                           │
│  ├── Call pdf-parse with options { max: 0 } (all pages)         │
│  ├── Check if text is empty → likely image-only PDF             │
│  ├── Check for encryption flag                                  │
│  ├── Post-process: normalize whitespace, detect headers         │
│  └── Return extracted text                                      │
│                                                                 │
│  extractFromDOCX(filePath)                                      │
│  ├── Read file buffer                                           │
│  ├── Call mammoth.extractRawText() for plain text               │
│  ├── OR mammoth.convertToMarkdown() for formatted               │
│  ├── Post-process: clean up excessive whitespace                │
│  └── Return extracted text                                      │
│                                                                 │
│  detectExtractionIssues(text, metadata)                         │
│  ├── Empty text check                                           │
│  ├── Character ratio check (% printable vs total)               │
│  ├── Word count sanity check                                    │
│  └── Return issue type or null                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Code Changes

#### backend/src/services/ExtractionService.ts

```typescript
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';

interface ExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  errorCode?: 'ENCRYPTED' | 'IMAGE_ONLY' | 'CORRUPTED' | 'UNSUPPORTED' | 'UNKNOWN';
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    hasImages?: boolean;
  };
}

export class ExtractionService {
  
  async extractFromFile(filePath: string, fileType: string): Promise<ExtractionResult> {
    try {
      // Validate file exists
      await fs.access(filePath);
      
      // Route to correct extractor
      const normalizedType = fileType.toLowerCase();
      
      if (normalizedType === 'pdf' || normalizedType === 'application/pdf') {
        return await this.extractFromPDF(filePath);
      }
      
      if (normalizedType === 'docx' || 
          normalizedType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return await this.extractFromDOCX(filePath);
      }
      
      if (normalizedType === 'md' || normalizedType === 'markdown' || normalizedType === 'text/markdown') {
        return await this.extractFromMarkdown(filePath);
      }
      
      if (normalizedType === 'txt' || normalizedType === 'text/plain') {
        return await this.extractFromText(filePath);
      }
      
      return {
        success: false,
        text: '',
        error: `Unsupported file type: ${fileType}. Supported: PDF, DOCX, MD, TXT`,
        errorCode: 'UNSUPPORTED'
      };
      
    } catch (err) {
      console.error('Extraction error:', err);
      return {
        success: false,
        text: '',
        error: 'Could not read this file. It may be corrupted or inaccessible.',
        errorCode: 'CORRUPTED'
      };
    }
  }
  
  async extractFromPDF(filePath: string): Promise<ExtractionResult> {
    try {
      const buffer = await fs.readFile(filePath);
      
      // Attempt extraction
      const data = await pdfParse(buffer, {
        max: 0, // Extract all pages
      });
      
      // Check for encryption (pdf-parse throws specific error)
      // If we got here, it's not encrypted
      
      // Check for image-only PDF (no extractable text)
      if (!data.text || data.text.trim().length < 50) {
        // Likely a scanned/image PDF
        return {
          success: false,
          text: '',
          error: 'This PDF appears to contain only images (scanned document). Please upload a text-based PDF or use OCR software first.',
          errorCode: 'IMAGE_ONLY',
          metadata: {
            pageCount: data.numpages,
            hasImages: true
          }
        };
      }
      
      // Post-process text
      const processedText = this.postProcessPDFText(data.text);
      
      return {
        success: true,
        text: processedText,
        metadata: {
          pageCount: data.numpages,
          wordCount: processedText.split(/\s+/).length
        }
      };
      
    } catch (err: any) {
      // Check for encrypted PDF error
      if (err.message?.includes('encrypted') || err.message?.includes('password')) {
        return {
          success: false,
          text: '',
          error: 'This PDF is password-protected. Please upload an unprotected version.',
          errorCode: 'ENCRYPTED'
        };
      }
      
      console.error('PDF extraction error:', err);
      return {
        success: false,
        text: '',
        error: 'Could not extract text from this PDF. The file may be corrupted.',
        errorCode: 'CORRUPTED'
      };
    }
  }
  
  async extractFromDOCX(filePath: string): Promise<ExtractionResult> {
    try {
      const buffer = await fs.readFile(filePath);
      
      // Use convertToMarkdown for better formatting preservation
      const result = await mammoth.convertToMarkdown({ buffer });
      
      if (!result.value || result.value.trim().length === 0) {
        return {
          success: false,
          text: '',
          error: 'This Word document appears to be empty or could not be read.',
          errorCode: 'CORRUPTED'
        };
      }
      
      // Log any conversion warnings
      if (result.messages.length > 0) {
        console.warn('DOCX conversion warnings:', result.messages);
      }
      
      const processedText = this.postProcessDOCXText(result.value);
      
      return {
        success: true,
        text: processedText,
        metadata: {
          wordCount: processedText.split(/\s+/).length
        }
      };
      
    } catch (err) {
      console.error('DOCX extraction error:', err);
      return {
        success: false,
        text: '',
        error: 'Could not extract text from this Word document. The file may be corrupted.',
        errorCode: 'CORRUPTED'
      };
    }
  }
  
  async extractFromMarkdown(filePath: string): Promise<ExtractionResult> {
    const text = await fs.readFile(filePath, 'utf-8');
    return {
      success: true,
      text,
      metadata: { wordCount: text.split(/\s+/).length }
    };
  }
  
  async extractFromText(filePath: string): Promise<ExtractionResult> {
    const text = await fs.readFile(filePath, 'utf-8');
    return {
      success: true,
      text,
      metadata: { wordCount: text.split(/\s+/).length }
    };
  }
  
  private postProcessPDFText(text: string): string {
    return text
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      // Remove excessive whitespace while preserving paragraph breaks
      .replace(/\n{3,}/g, '\n\n')
      // Fix common PDF artifacts (hyphenation at line breaks)
      .replace(/(\w)-\n(\w)/g, '$1$2')
      // Normalize spaces
      .replace(/[ \t]+/g, ' ')
      // Trim lines
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim();
  }
  
  private postProcessDOCXText(text: string): string {
    return text
      // mammoth outputs clean markdown, just normalize whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

export const extractionService = new ExtractionService();
```

#### backend/src/routes/specs.ts (Update extraction endpoint)

```typescript
// POST /api/specs/:id/extract
fastify.post('/:id/extract', async (request, reply) => {
  const { id } = request.params as { id: string };
  
  try {
    // Get spec
    const spec = await prisma.spec.findUnique({ where: { id } });
    if (!spec) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Spec not found' } });
    }
    
    // Update status to extracting
    await prisma.spec.update({
      where: { id },
      data: { status: 'extracting' }
    });
    
    // Extract
    const result = await extractionService.extractFromFile(spec.filePath, spec.fileType);
    
    if (!result.success) {
      // Update status to error with message
      await prisma.spec.update({
        where: { id },
        data: { 
          status: 'error',
          errorMessage: result.error
        }
      });
      
      return reply.status(422).send({ 
        error: { 
          code: result.errorCode || 'EXTRACTION_FAILED', 
          message: result.error 
        } 
      });
    }
    
    // Update spec with extracted text
    await prisma.spec.update({
      where: { id },
      data: {
        status: 'ready',
        extractedText: result.text,
        metadata: result.metadata as any,
        errorMessage: null
      }
    });
    
    return reply.send({ 
      data: { 
        success: true, 
        wordCount: result.metadata?.wordCount 
      } 
    });
    
  } catch (err) {
    console.error('Extraction endpoint error:', err);
    
    // Update status to error
    await prisma.spec.update({
      where: { id },
      data: { 
        status: 'error',
        errorMessage: 'An unexpected error occurred during extraction'
      }
    });
    
    return reply.status(500).send({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'An unexpected error occurred' 
      } 
    });
  }
});
```

#### backend/src/routes/specs.ts (Add preview endpoint)

```typescript
// GET /api/specs/:id/preview
fastify.get('/:id/preview', async (request, reply) => {
  const { id } = request.params as { id: string };
  
  const spec = await prisma.spec.findUnique({ where: { id } });
  if (!spec) {
    return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Spec not found' } });
  }
  
  // Check if file still exists
  try {
    await fs.access(spec.filePath);
  } catch {
    return reply.status(410).send({ 
      error: { 
        code: 'FILE_GONE', 
        message: 'Original file is no longer available' 
      } 
    });
  }
  
  // For PDF, serve the file directly
  if (spec.fileType === 'pdf' || spec.fileType === 'application/pdf') {
    const buffer = await fs.readFile(spec.filePath);
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="${spec.name}"`)
      .send(buffer);
  }
  
  // For DOCX, serve the extracted text as HTML
  if (spec.fileType === 'docx' || spec.fileType.includes('wordprocessingml')) {
    const buffer = await fs.readFile(spec.filePath);
    const result = await mammoth.convertToHtml({ buffer });
    return reply
      .header('Content-Type', 'text/html')
      .send(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1, h2, h3 { color: #1A1A2E; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #ddd; padding: 8px; }
          </style>
        </head>
        <body>${result.value}</body>
        </html>
      `);
  }
  
  // For text files, serve as plain text
  const text = await fs.readFile(spec.filePath, 'utf-8');
  return reply
    .header('Content-Type', 'text/plain')
    .send(text);
});
```

### Frontend Changes

#### frontend/src/components/molecules/SpecPreviewModal.tsx

```tsx
import { useState, useEffect } from 'react';
import { Modal } from '../atoms/Modal';
import { Spinner } from '../atoms/Spinner';
import { Button } from '../atoms/Button';

interface SpecPreviewModalProps {
  specId: string;
  specName: string;
  fileType: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SpecPreviewModal({ 
  specId, 
  specName, 
  fileType, 
  isOpen, 
  onClose 
}: SpecPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    
    // For PDFs, we'll use an iframe with the direct URL
    // For others, fetch and display
    const url = `/api/specs/${specId}/preview`;
    
    if (fileType === 'pdf' || fileType === 'application/pdf') {
      setPreviewUrl(url);
      setLoading(false);
    } else {
      // Fetch content
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load preview');
          return res.text();
        })
        .then(html => {
          // Create blob URL for iframe
          const blob = new Blob([html], { type: 'text/html' });
          setPreviewUrl(URL.createObjectURL(blob));
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
    
    return () => {
      if (previewUrl && !previewUrl.startsWith('/api')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, specId, fileType]);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-toucan-dark-border">
          <h2 className="text-lg font-semibold text-toucan-grey-100">
            Preview: {specName}
          </h2>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Spinner size="lg" />
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-full text-toucan-error">
              {error}
            </div>
          )}
          
          {!loading && !error && previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0 bg-white"
              title={`Preview of ${specName}`}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
```

#### Update SpecCard.tsx to add Preview button

```tsx
// In SpecCard.tsx, add:
import { SpecPreviewModal } from './SpecPreviewModal';

// Add state
const [showPreview, setShowPreview] = useState(false);

// Add button in actions
<Button 
  variant="ghost" 
  size="sm" 
  onClick={() => setShowPreview(true)}
>
  Preview
</Button>

// Add modal
<SpecPreviewModal
  specId={spec.id}
  specName={spec.name}
  fileType={spec.fileType}
  isOpen={showPreview}
  onClose={() => setShowPreview(false)}
/>
```

---

## Database Changes

```prisma
// Update Spec model to include errorMessage
model Spec {
  // ... existing fields
  errorMessage  String?   // NEW: Store extraction error messages
}
```

Migration:
```sql
ALTER TABLE "Spec" ADD COLUMN "errorMessage" TEXT;
```

---

## API Contract

### POST /api/specs/:id/extract

**Response (Success):**
```json
{
  "data": {
    "success": true,
    "wordCount": 2456
  }
}
```

**Response (Error - Encrypted PDF):**
```json
{
  "error": {
    "code": "ENCRYPTED",
    "message": "This PDF is password-protected. Please upload an unprotected version."
  }
}
```

**Response (Error - Image PDF):**
```json
{
  "error": {
    "code": "IMAGE_ONLY",
    "message": "This PDF appears to contain only images (scanned document). Please upload a text-based PDF or use OCR software first."
  }
}
```

### GET /api/specs/:id/preview

**Response:** Binary file content with appropriate Content-Type header

---

## Testing Checklist

### Unit Tests

- [ ] `ExtractionService.extractFromPDF` - Normal PDF extraction
- [ ] `ExtractionService.extractFromPDF` - Encrypted PDF detection
- [ ] `ExtractionService.extractFromPDF` - Image-only PDF detection
- [ ] `ExtractionService.extractFromPDF` - Corrupted file handling
- [ ] `ExtractionService.extractFromDOCX` - Normal DOCX extraction
- [ ] `ExtractionService.extractFromDOCX` - Empty document handling
- [ ] `ExtractionService.postProcessPDFText` - Whitespace normalization
- [ ] `ExtractionService.postProcessPDFText` - Hyphenation fix

### Integration Tests

- [ ] Upload PDF → Extract → Verify status changes correctly
- [ ] Upload DOCX → Extract → Verify extractedText populated
- [ ] Upload encrypted PDF → Verify error status and message
- [ ] Preview endpoint returns correct Content-Type

### E2E Tests

- [ ] User uploads PDF → Sees "Extracting..." → Sees "Ready"
- [ ] User uploads encrypted PDF → Sees clear error message
- [ ] User clicks "Preview" → Modal shows document content

---

## Rollback Plan

If extraction breaks:
1. Revert ExtractionService.ts to previous version
2. Keep preview endpoint (doesn't affect core flow)
3. Document which file types work, which don't

---

## Dependencies

- `pdf-parse`: ^3.0.1 (already installed)
- `mammoth`: ^1.6.0 (already installed)

No new dependencies required.

---

*F19 Specification v1.0*
