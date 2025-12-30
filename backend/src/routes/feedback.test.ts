import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { feedbackRoutes } from './feedback.js';

// Mock the services
vi.mock('../services/FeedbackService.js', () => ({
  getFeedbackService: () => ({
    submitFeedback: vi.fn().mockResolvedValue({
      id: 'feedback-1',
      workItemId: 'work-item-1',
      userId: 'user-1',
      rating: 5,
      feedback: 'Good job',
      categories: [],
      createdAt: new Date(),
    }),
    getFeedback: vi.fn().mockResolvedValue([]),
    getFeedbackByUser: vi.fn().mockResolvedValue(null),
  }),
  getPreferenceService: () => ({
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      id: 'pref-1',
      projectId: 'project-1',
      preference: 'Test preference',
      description: null,
      category: 'style',
      learnedFrom: [],
      active: true,
      createdAt: new Date(),
    }),
    update: vi.fn().mockResolvedValue({
      id: 'pref-1',
      projectId: 'project-1',
      preference: 'Test preference',
      description: null,
      category: 'style',
      learnedFrom: [],
      active: false,
      createdAt: new Date(),
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    extractFromFeedback: vi.fn().mockResolvedValue([]),
  }),
}));

describe('Feedback Routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeEach(async () => {
    app = Fastify();

    // Register JWT plugin
    await app.register(jwt, { secret: 'test-secret' });

    // Add authenticate decorator
    app.decorate('authenticate', async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
      }
    });

    // Register routes
    await app.register(feedbackRoutes);
    await app.ready();

    // Generate a valid token
    authToken = app.jwt.sign({ sub: 'user-1', username: 'testuser' });
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe('POST /api/workitems/:id/feedback', () => {
    it('should submit feedback with valid rating', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workitems/work-item-1/feedback',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { rating: 5, feedback: 'Good job' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.rating).toBe(5);
    });

    it('should reject invalid rating', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workitems/work-item-1/feedback',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { rating: 3 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workitems/work-item-1/feedback',
        payload: { rating: 5 },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/workitems/:id/feedback', () => {
    it('should return feedback for work item', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workitems/work-item-1/feedback',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('myFeedback');
      expect(body.data).toHaveProperty('allFeedback');
    });
  });

  describe('GET /api/projects/:projectId/preferences', () => {
    it('should list preferences for project', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/projects/project-1/preferences',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/projects/:projectId/preferences', () => {
    it('should create a new preference', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects/project-1/preferences',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { preference: 'Keep AC short', category: 'ac_format' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.preference).toBe('Test preference');
    });

    it('should reject empty preference', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects/project-1/preferences',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { preference: '' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /api/projects/:projectId/preferences/:id', () => {
    it('should update preference active status', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/projects/project-1/preferences/pref-1',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { active: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.active).toBe(false);
    });

    it('should reject non-boolean active value', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/projects/project-1/preferences/pref-1',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { active: 'yes' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/projects/:projectId/preferences/:id', () => {
    it('should delete a preference', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/projects/project-1/preferences/pref-1',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(204);
    });
  });

  describe('POST /api/projects/:projectId/preferences/extract', () => {
    it('should extract preferences from feedback', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects/project-1/preferences/extract',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('extracted');
      expect(body.data).toHaveProperty('preferences');
    });
  });
});
