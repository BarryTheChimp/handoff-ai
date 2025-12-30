import Anthropic from '@anthropic-ai/sdk';

// Available models - use the right one for the job
export const CLAUDE_MODELS = {
  // Fast & cheap - good for analysis, validation, simple tasks
  haiku: 'claude-3-5-haiku-latest',
  // Balanced - good for complex generation, nuanced tasks
  sonnet: 'claude-sonnet-4-20250514',
} as const;

export type ClaudeModel = keyof typeof CLAUDE_MODELS;

const DEFAULT_MODEL: ClaudeModel = 'sonnet';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.2;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export class ClaudeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ClaudeError';
  }
}

export interface ClaudeOptions {
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ClaudeService {
  complete(prompt: string, options?: ClaudeOptions): Promise<string>;
  completeJSON<T>(prompt: string, options?: ClaudeOptions): Promise<T>;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    // Rate limits and server errors are retryable
    const status = error.status ?? 0;
    return status === 429 || status >= 500;
  }
  // Network errors are retryable
  if (error instanceof Error && error.message.includes('timeout')) {
    return true;
  }
  return false;
}

/**
 * Creates a ClaudeService instance
 */
export function createClaudeService(): ClaudeService {
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY environment variable is required');
  }

  const client = new Anthropic({
    apiKey,
  });

  /**
   * Make a completion request with retry logic
   */
  async function makeRequest(
    prompt: string,
    options: ClaudeOptions = {}
  ): Promise<string> {
    const {
      model = DEFAULT_MODEL,
      maxTokens = DEFAULT_MAX_TOKENS,
      temperature = DEFAULT_TEMPERATURE,
      systemPrompt,
    } = options;

    const modelId = CLAUDE_MODELS[model];
    let lastError: Error | null = null;
    let retryDelay = INITIAL_RETRY_DELAY;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Claude/${model}] Attempt ${attempt}/${MAX_RETRIES} - Sending request...`);

        const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
          model: modelId,
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        };

        // Only add system prompt if provided
        if (systemPrompt) {
          requestParams.system = systemPrompt;
        }

        const message = await client.messages.create(requestParams);

        // Extract text from response
        const textBlock = message.content.find((block) => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          throw new ClaudeError('No text response received', 'NO_RESPONSE', false);
        }

        console.log(`[Claude/${model}] Success - Received ${textBlock.text.length} characters`);
        return textBlock.text;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.error(`[Claude/${model}] Attempt ${attempt} failed:`, lastError.message);

        // Check if we should retry
        if (attempt < MAX_RETRIES && isRetryableError(error)) {
          console.log(`[Claude/${model}] Retrying in ${retryDelay}ms...`);
          await sleep(retryDelay);
          retryDelay *= 2; // Exponential backoff
          continue;
        }

        // Don't retry - throw the error
        break;
      }
    }

    // All retries exhausted or non-retryable error
    if (lastError instanceof Anthropic.APIError) {
      throw new ClaudeError(
        `Claude API error: ${lastError.message}`,
        `API_ERROR_${lastError.status}`,
        false
      );
    }

    throw new ClaudeError(
      `Claude request failed: ${lastError?.message ?? 'Unknown error'}`,
      'REQUEST_FAILED',
      false
    );
  }

  return {
    /**
     * Complete a prompt and return the text response
     */
    async complete(prompt: string, options?: ClaudeOptions): Promise<string> {
      return makeRequest(prompt, options);
    },

    /**
     * Complete a prompt and parse the response as JSON
     */
    async completeJSON<T>(prompt: string, options?: ClaudeOptions): Promise<T> {
      // Add JSON instruction to system prompt
      const jsonSystemPrompt = [
        options?.systemPrompt,
        'You must respond with valid JSON only. No markdown, no explanations, just the JSON object.',
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await makeRequest(prompt, {
        ...options,
        systemPrompt: jsonSystemPrompt,
      });

      // Try to extract JSON from the response
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      try {
        return JSON.parse(jsonStr) as T;
      } catch (parseError) {
        console.error('[Claude] JSON parse error:', parseError);
        console.error('[Claude] Raw response:', response.slice(0, 500));
        throw new ClaudeError(
          'Failed to parse JSON response from Claude',
          'JSON_PARSE_ERROR',
          false
        );
      }
    },
  };
}

// Export a default instance (lazy initialization)
let _claudeService: ClaudeService | null = null;

export function getClaudeService(): ClaudeService {
  if (!_claudeService) {
    _claudeService = createClaudeService();
  }
  return _claudeService;
}
