import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables for tests
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/handoff_test';
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Mock Claude API by default
vi.mock('../src/services/ClaudeService.js', () => ({
  getClaudeService: () => ({
    complete: vi.fn().mockResolvedValue('Mocked response'),
    completeJSON: vi.fn().mockResolvedValue({}),
  }),
}));
