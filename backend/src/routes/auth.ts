import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createAuthService, AuthenticationError } from '../services/AuthService.js';

interface LoginBody {
  username: string;
  password: string;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const authService = createAuthService(app);

  /**
   * POST /api/auth/login
   * Authenticate user and return JWT token
   */
  app.post<{ Body: LoginBody }>(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      role: { type: 'string' },
                      displayName: { type: 'string' },
                    },
                  },
                  expiresIn: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      try {
        const { username, password } = request.body;
        const result = await authService.login(username, password);

        return { data: result };
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHORIZED',
              message: error.message,
            },
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  app.get(
    '/api/auth/me',
    {
      onRequest: [app.authenticate],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  role: { type: 'string' },
                  displayName: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      return { data: request.user };
    }
  );
}
