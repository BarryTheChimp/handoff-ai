import { randomUUID } from 'crypto';
import { extname } from 'path';
import { prisma } from '../lib/prisma.js';
import { storageService, StorageService } from './StorageService.js';
import type { Spec, SpecStatus } from '@prisma/client';

// Allowed file types and their max sizes
const ALLOWED_EXTENSIONS: Record<string, number> = {
  '.pdf': 50 * 1024 * 1024,   // 50MB
  '.docx': 50 * 1024 * 1024,  // 50MB
  '.yaml': 10 * 1024 * 1024,  // 10MB
  '.yml': 10 * 1024 * 1024,   // 10MB
  '.json': 10 * 1024 * 1024,  // 10MB
};

export class DocumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentValidationError';
  }
}

export interface UploadResult {
  specId: string;
  name: string;
  fileType: string;
  fileSize: number;
  status: SpecStatus;
}

export interface UploadOptions {
  projectId: string;
  filename: string;
  data: Buffer;
  specType?: string;
  uploadedBy: string;
}

export interface DocumentService {
  upload(options: UploadOptions): Promise<UploadResult>;
  getSpec(specId: string): Promise<Spec | null>;
  deleteSpec(specId: string): Promise<void>;
  validateFile(filename: string, size: number): void;
}

/**
 * Creates a DocumentService instance
 */
export function createDocumentService(storage: StorageService = storageService): DocumentService {
  return {
    /**
     * Validate file before upload
     * @throws DocumentValidationError if validation fails
     */
    validateFile(filename: string, size: number): void {
      const ext = extname(filename).toLowerCase();

      // Check extension
      if (!ALLOWED_EXTENSIONS[ext]) {
        throw new DocumentValidationError(
          `File type '${ext}' is not allowed. Accepted types: ${Object.keys(ALLOWED_EXTENSIONS).join(', ')}`
        );
      }

      // Check size
      const maxSize = ALLOWED_EXTENSIONS[ext];
      if (maxSize !== undefined && size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        throw new DocumentValidationError(
          `File size exceeds maximum allowed (${maxMB}MB for ${ext} files)`
        );
      }
    },

    /**
     * Upload a specification document
     */
    async upload(options: UploadOptions): Promise<UploadResult> {
      const { projectId, filename, data, specType = 'api-spec', uploadedBy } = options;

      // Validate file
      this.validateFile(filename, data.length);

      // Generate spec ID
      const specId = randomUUID();

      // Determine file type from extension
      const ext = extname(filename).toLowerCase();
      const fileType = ext.replace('.', '');

      // Save file to storage
      const filePath = await storage.save(specId, filename, data);

      // Create database record
      const spec = await prisma.spec.create({
        data: {
          id: specId,
          projectId,
          name: filename,
          filePath,
          fileType,
          fileSize: data.length,
          status: 'uploaded',
          specType,
          uploadedBy,
        },
      });

      return {
        specId: spec.id,
        name: spec.name,
        fileType: spec.fileType,
        fileSize: spec.fileSize,
        status: spec.status,
      };
    },

    /**
     * Get a spec by ID
     */
    async getSpec(specId: string): Promise<Spec | null> {
      return prisma.spec.findUnique({
        where: { id: specId },
      });
    },

    /**
     * Delete a spec and its file
     */
    async deleteSpec(specId: string): Promise<void> {
      const spec = await prisma.spec.findUnique({
        where: { id: specId },
      });

      if (spec) {
        // Delete file from storage
        try {
          await storage.delete(spec.filePath);
        } catch {
          // File might not exist, continue with DB deletion
        }

        // Delete from database
        await prisma.spec.delete({
          where: { id: specId },
        });
      }
    },
  };
}

// Export a default instance
export const documentService = createDocumentService();
