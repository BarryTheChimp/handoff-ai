import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { parse as parseYaml } from 'yaml';
import fs from 'fs/promises';
import { prisma } from '../lib/prisma.js';
import { storageService } from './StorageService.js';

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

export interface ExtractedSection {
  sectionRef: string;
  heading: string;
  content: string;
  orderIndex: number;
}

export interface ExtractionResult {
  specId: string;
  extractedText: string;
  sections: ExtractedSection[];
  status: 'ready' | 'error';
}

/**
 * Check if PDF is encrypted
 */
function isPdfEncrypted(buffer: Buffer): boolean {
  const str = buffer.toString('utf-8', 0, Math.min(buffer.length, 2048));
  return str.includes('/Encrypt') || str.includes('Encrypt');
}

/**
 * Check if PDF appears to be image-only (scanned)
 */
function isPdfImageOnly(text: string, pageCount: number): boolean {
  // If very little text extracted relative to pages, likely scanned
  const avgCharsPerPage = text.length / Math.max(pageCount, 1);
  return avgCharsPerPage < 50 && text.trim().length < 100;
}

/**
 * Extract text from PDF files
 */
async function extractFromPdf(buffer: Buffer): Promise<{ text: string; sections: ExtractedSection[] }> {
  // Check for encrypted PDF before parsing
  if (isPdfEncrypted(buffer)) {
    throw new ExtractionError(
      'This PDF is password-protected. Please upload an unencrypted version of the document.'
    );
  }

  let data;
  try {
    data = await pdfParse(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.toLowerCase().includes('encrypt')) {
      throw new ExtractionError(
        'This PDF is password-protected. Please upload an unencrypted version of the document.'
      );
    }
    throw new ExtractionError(`Failed to parse PDF: ${message}`);
  }

  const text = data.text;
  const pageCount = data.numpages || 1;

  // Check for scanned/image-only PDF
  if (isPdfImageOnly(text, pageCount)) {
    throw new ExtractionError(
      'This PDF appears to be a scanned document with no extractable text. Please upload a text-based PDF or convert using OCR software first.'
    );
  }

  // Parse sections based on numbered headings (1., 1.1, 2., etc.)
  const sections: ExtractedSection[] = [];
  const lines = text.split('\n');

  let currentSection: ExtractedSection | null = null;
  let contentLines: string[] = [];
  let orderIndex = 0;

  // Regex for numbered headings like "1.", "1.1", "1.1.1", "2.", etc.
  const headingRegex = /^(\d+(?:\.\d+)*\.?)\s+(.+)$/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const match = trimmedLine.match(headingRegex);

    if (match) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        if (currentSection.content || currentSection.heading) {
          sections.push(currentSection);
        }
      }

      // Start new section
      const sectionRef = match[1]?.replace(/\.$/, '') ?? '';
      const heading = match[2] ?? '';
      currentSection = {
        sectionRef,
        heading,
        content: '',
        orderIndex: orderIndex++,
      };
      contentLines = [];
    } else if (currentSection && trimmedLine) {
      contentLines.push(trimmedLine);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    if (currentSection.content || currentSection.heading) {
      sections.push(currentSection);
    }
  }

  // If no sections found, create one default section
  if (sections.length === 0 && text.trim()) {
    sections.push({
      sectionRef: '1',
      heading: 'Document Content',
      content: text.trim(),
      orderIndex: 0,
    });
  }

  return { text, sections };
}

/**
 * Extract text from DOCX files
 */
async function extractFromDocx(buffer: Buffer): Promise<{ text: string; sections: ExtractedSection[] }> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  // Also get HTML to identify headings
  const htmlResult = await mammoth.convertToHtml({ buffer });
  const html = htmlResult.value;

  const sections: ExtractedSection[] = [];

  // Parse HTML to find headings
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;

  let match;
  let orderIndex = 0;
  let sectionNumber = 1;
  let currentHeading = '';
  let currentContent: string[] = [];

  // Simple HTML tag stripper
  const stripTags = (str: string): string => str.replace(/<[^>]*>/g, '').trim();

  // Split by headings
  const parts = html.split(/(<h[1-6][^>]*>.*?<\/h[1-6]>)/gi);

  for (const part of parts) {
    const headingMatch = part.match(/<h([1-6])[^>]*>(.*?)<\/h\1>/i);

    if (headingMatch) {
      // Save previous section
      if (currentHeading || currentContent.length > 0) {
        sections.push({
          sectionRef: String(sectionNumber),
          heading: currentHeading || 'Section ' + sectionNumber,
          content: currentContent.join('\n').trim(),
          orderIndex: orderIndex++,
        });
        sectionNumber++;
      }

      currentHeading = stripTags(headingMatch[2] ?? '');
      currentContent = [];
    } else {
      // Extract paragraphs
      const content = stripTags(part);
      if (content) {
        currentContent.push(content);
      }
    }
  }

  // Save last section
  if (currentHeading || currentContent.length > 0) {
    sections.push({
      sectionRef: String(sectionNumber),
      heading: currentHeading || 'Section ' + sectionNumber,
      content: currentContent.join('\n').trim(),
      orderIndex: orderIndex++,
    });
  }

  // If no sections found, create one default section
  if (sections.length === 0 && text.trim()) {
    sections.push({
      sectionRef: '1',
      heading: 'Document Content',
      content: text.trim(),
      orderIndex: 0,
    });
  }

  return { text, sections };
}

/**
 * Extract text from YAML files
 */
async function extractFromYaml(buffer: Buffer): Promise<{ text: string; sections: ExtractedSection[] }> {
  const text = buffer.toString('utf-8');
  const parsed = parseYaml(text);

  const sections: ExtractedSection[] = [];
  let orderIndex = 0;

  // Create sections from top-level keys
  if (typeof parsed === 'object' && parsed !== null) {
    for (const [key, value] of Object.entries(parsed)) {
      sections.push({
        sectionRef: key,
        heading: key,
        content: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
        orderIndex: orderIndex++,
      });
    }
  }

  // If no sections or not an object, create default section
  if (sections.length === 0) {
    sections.push({
      sectionRef: '1',
      heading: 'YAML Content',
      content: text,
      orderIndex: 0,
    });
  }

  return { text, sections };
}

/**
 * Extract text from JSON files
 */
async function extractFromJson(buffer: Buffer): Promise<{ text: string; sections: ExtractedSection[] }> {
  const text = buffer.toString('utf-8');
  const parsed = JSON.parse(text) as Record<string, unknown>;

  const sections: ExtractedSection[] = [];
  let orderIndex = 0;

  // Create sections from top-level keys
  if (typeof parsed === 'object' && parsed !== null) {
    for (const [key, value] of Object.entries(parsed)) {
      sections.push({
        sectionRef: key,
        heading: key,
        content: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
        orderIndex: orderIndex++,
      });
    }
  }

  // If no sections or not an object, create default section
  if (sections.length === 0) {
    sections.push({
      sectionRef: '1',
      heading: 'JSON Content',
      content: text,
      orderIndex: 0,
    });
  }

  return { text, sections };
}

/**
 * Extract text from Markdown files
 */
async function extractFromMarkdown(buffer: Buffer): Promise<{ text: string; sections: ExtractedSection[] }> {
  const text = buffer.toString('utf-8');
  const lines = text.split('\n');
  const sections: ExtractedSection[] = [];

  let currentSection: ExtractedSection | null = null;
  let contentLines: string[] = [];
  let orderIndex = 0;
  let sectionNumber = 1;

  // Regex for markdown headings (# Heading, ## Heading, etc.)
  const headingRegex = /^(#{1,6})\s+(.+)$/;

  for (const line of lines) {
    const match = line.match(headingRegex);

    if (match) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        if (currentSection.content || currentSection.heading) {
          sections.push(currentSection);
        }
      }

      // Start new section
      const level = match[1]?.length ?? 1;
      const heading = match[2]?.trim() ?? '';
      currentSection = {
        sectionRef: String(sectionNumber++),
        heading,
        content: '',
        orderIndex: orderIndex++,
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(line);
    } else {
      // Content before first heading
      contentLines.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    if (currentSection.content || currentSection.heading) {
      sections.push(currentSection);
    }
  } else if (contentLines.length > 0) {
    // No headings found, create single section
    sections.push({
      sectionRef: '1',
      heading: 'Document Content',
      content: contentLines.join('\n').trim(),
      orderIndex: 0,
    });
  }

  // If no sections found, create one default section
  if (sections.length === 0 && text.trim()) {
    sections.push({
      sectionRef: '1',
      heading: 'Document Content',
      content: text.trim(),
      orderIndex: 0,
    });
  }

  return { text, sections };
}

export interface ExtractionService {
  extractContent(specId: string): Promise<ExtractionResult>;
}

/**
 * Creates an ExtractionService instance
 */
export function createExtractionService(): ExtractionService {
  return {
    /**
     * Extract content from a spec document
     */
    async extractContent(specId: string): Promise<ExtractionResult> {
      // Get the spec
      const spec = await prisma.spec.findUnique({
        where: { id: specId },
      });

      if (!spec) {
        throw new ExtractionError(`Spec not found: ${specId}`);
      }

      // Update status to extracting
      await prisma.spec.update({
        where: { id: specId },
        data: { status: 'extracting' },
      });

      try {
        // Load file from storage
        const buffer = await storageService.read(spec.filePath);

        // Extract based on file type
        let result: { text: string; sections: ExtractedSection[] };

        switch (spec.fileType.toLowerCase()) {
          case 'pdf':
            result = await extractFromPdf(buffer);
            break;
          case 'docx':
            result = await extractFromDocx(buffer);
            break;
          case 'yaml':
          case 'yml':
            result = await extractFromYaml(buffer);
            break;
          case 'json':
            result = await extractFromJson(buffer);
            break;
          case 'md':
          case 'markdown':
            result = await extractFromMarkdown(buffer);
            break;
          default:
            throw new ExtractionError(`Unsupported file type: ${spec.fileType}`);
        }

        // Delete existing sections (in case of re-extraction)
        await prisma.specSection.deleteMany({
          where: { specId },
        });

        // Create new sections
        await prisma.specSection.createMany({
          data: result.sections.map((section) => ({
            specId,
            sectionRef: section.sectionRef,
            heading: section.heading,
            content: section.content,
            orderIndex: section.orderIndex,
          })),
        });

        // Update spec with extracted text and status
        await prisma.spec.update({
          where: { id: specId },
          data: {
            extractedText: result.text,
            status: 'ready',
          },
        });

        return {
          specId,
          extractedText: result.text,
          sections: result.sections,
          status: 'ready',
        };
      } catch (error) {
        // Update status to error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await prisma.spec.update({
          where: { id: specId },
          data: {
            status: 'error',
            errorMessage,
          },
        });

        throw new ExtractionError(`Extraction failed: ${errorMessage}`);
      }
    },
  };
}

// Export a default instance
export const extractionService = createExtractionService();
