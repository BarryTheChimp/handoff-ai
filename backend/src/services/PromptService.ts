import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Prompts are stored in backend/src/prompts/
const PROMPTS_DIR = join(__dirname, '..', 'prompts');

export class PromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptError';
  }
}

export interface PromptVariables {
  [key: string]: string | number | boolean | object;
}

export interface PromptService {
  loadPrompt(specType: string, passName: string): Promise<string>;
  renderPrompt(template: string, variables: PromptVariables): string;
  loadAndRender(specType: string, passName: string, variables: PromptVariables): Promise<string>;
}

/**
 * Creates a PromptService instance
 */
export function createPromptService(): PromptService {
  // Cache for loaded templates
  const templateCache = new Map<string, string>();

  return {
    /**
     * Load a prompt template from disk
     * @param specType - The type of spec (e.g., 'api-spec', 'requirements-doc')
     * @param passName - The name of the pass (e.g., 'structure', 'epics', 'stories', 'enrichment')
     * @returns The template content
     */
    async loadPrompt(specType: string, passName: string): Promise<string> {
      const cacheKey = `${specType}/${passName}`;

      // Check cache first
      if (templateCache.has(cacheKey)) {
        return templateCache.get(cacheKey)!;
      }

      const templatePath = join(PROMPTS_DIR, specType, `${passName}.txt`);

      try {
        const template = await readFile(templatePath, 'utf-8');
        templateCache.set(cacheKey, template);
        return template;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new PromptError(`Prompt template not found: ${specType}/${passName}.txt`);
        }
        throw new PromptError(`Failed to load prompt template: ${(error as Error).message}`);
      }
    },

    /**
     * Render a template by substituting variables
     * Variables are referenced in templates as {{variableName}}
     * Objects are JSON-stringified
     */
    renderPrompt(template: string, variables: PromptVariables): string {
      let result = template;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        let replacement: string;

        if (typeof value === 'object') {
          replacement = JSON.stringify(value, null, 2);
        } else {
          replacement = String(value);
        }

        // Replace all occurrences
        result = result.split(placeholder).join(replacement);
      }

      // Warn about any unreplaced placeholders
      const unreplaced = result.match(/\{\{[^}]+\}\}/g);
      if (unreplaced) {
        console.warn(`[PromptService] Unreplaced placeholders: ${unreplaced.join(', ')}`);
      }

      return result;
    },

    /**
     * Load and render a prompt in one step
     */
    async loadAndRender(
      specType: string,
      passName: string,
      variables: PromptVariables
    ): Promise<string> {
      const template = await this.loadPrompt(specType, passName);
      return this.renderPrompt(template, variables);
    },
  };
}

// Export a default instance
export const promptService = createPromptService();
