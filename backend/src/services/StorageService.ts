import { mkdir, writeFile, unlink, access, readFile } from 'fs/promises';
import { join, dirname } from 'path';

export interface StorageService {
  save(specId: string, filename: string, data: Buffer): Promise<string>;
  read(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
}

/**
 * Local filesystem storage implementation
 */
export function createLocalStorageService(basePath: string): StorageService {
  return {
    /**
     * Save a file to storage
     * @returns The relative path where the file was saved
     */
    async save(specId: string, filename: string, data: Buffer): Promise<string> {
      const relativePath = join(specId, filename);
      const fullPath = join(basePath, relativePath);

      // Ensure directory exists
      await mkdir(dirname(fullPath), { recursive: true });

      // Write file
      await writeFile(fullPath, data);

      return relativePath;
    },

    /**
     * Read a file from storage
     */
    async read(filePath: string): Promise<Buffer> {
      const fullPath = join(basePath, filePath);
      return readFile(fullPath);
    },

    /**
     * Delete a file from storage
     */
    async delete(filePath: string): Promise<void> {
      const fullPath = join(basePath, filePath);
      await unlink(fullPath);
    },

    /**
     * Check if a file exists
     */
    async exists(filePath: string): Promise<boolean> {
      const fullPath = join(basePath, filePath);
      try {
        await access(fullPath);
        return true;
      } catch {
        return false;
      }
    },
  };
}

// Default storage path
const STORAGE_PATH = process.env.STORAGE_PATH ?? './uploads';

// Export a default instance
export const storageService = createLocalStorageService(STORAGE_PATH);
