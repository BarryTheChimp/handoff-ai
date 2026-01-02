import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  createAuthService,
  AuthenticationError,
  InvitationError,
  PasswordResetError,
} from '../services/AuthService.js';
import { createEmailService } from '../services/EmailService.js';

interface LoginBody {
  email: string;
  password: string;
}

interface InviteBody {
  email: string;
  role?: UserRole;
}

interface AcceptInviteBody {
  token: string;
  name: string;
  password: string;
}

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  token: string;
  password: string;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const authService = createAuthService(app, prisma);
  const emailService = createEmailService();

  /**
   * POST /api/auth/login
   * Authenticate user with email and password
   */
  app.post<{ Body: LoginBody }>(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
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
                      email: { type: 'string' },
                      name: { type: 'string', nullable: true },
                      role: { type: 'string' },
                      status: { type: 'string' },
                      avatarUrl: { type: 'string', nullable: true },
                      authProvider: { type: 'string' },
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
        const { email, password } = request.body;
        const result = await authService.login(email, password);

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
                  email: { type: 'string' },
                  name: { type: 'string', nullable: true },
                  role: { type: 'string' },
                  status: { type: 'string' },
                  avatarUrl: { type: 'string', nullable: true },
                  authProvider: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      // Re-fetch user from database to ensure fresh data
      const user = await authService.getUserById(request.user.id);
      return { data: user };
    }
  );

  /**
   * POST /api/auth/invite
   * Send invitation to new user (Admin only)
   */
  app.post<{ Body: InviteBody }>(
    '/api/auth/invite',
    {
      onRequest: [app.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'member'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  expiresAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: InviteBody }>, reply: FastifyReply) => {
      // Check if user is admin
      if (request.user.role !== 'admin') {
        return reply.status(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Only admins can invite users',
          },
        });
      }

      try {
        const { email, role = 'member' } = request.body;
        const { token, expiresAt } = await authService.createInvitation(
          email,
          role,
          request.user.id
        );

        // Get inviter's name for the email
        const inviter = await authService.getUserById(request.user.id);
        const inviterName = inviter?.name || inviter?.email || 'A team member';

        // Send invitation email
        await emailService.sendInvitation(email, inviterName, token);

        return {
          data: {
            message: `Invitation sent to ${email}`,
            expiresAt: expiresAt.toISOString(),
          },
        };
      } catch (error) {
        if (error instanceof InvitationError) {
          return reply.status(400).send({
            error: {
              code: 'INVITATION_ERROR',
              message: error.message,
            },
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /api/auth/invite/:token
   * Get invitation details (public)
   */
  app.get<{ Params: { token: string } }>(
    '/api/auth/invite/:token',
    {
      schema: {
        params: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  role: { type: 'string' },
                  inviterName: { type: 'string' },
                  expiresAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
      const invitation = await authService.getInvitationByToken(request.params.token);

      if (!invitation) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Invalid or expired invitation',
          },
        });
      }

      return {
        data: {
          email: invitation.email,
          role: invitation.role,
          inviterName: invitation.inviterName,
          expiresAt: invitation.expiresAt.toISOString(),
        },
      };
    }
  );

  /**
   * POST /api/auth/accept-invite
   * Accept invitation and create account
   */
  app.post<{ Body: AcceptInviteBody }>(
    '/api/auth/accept-invite',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'name', 'password'],
          properties: {
            token: { type: 'string' },
            name: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 8 },
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
                      email: { type: 'string' },
                      name: { type: 'string', nullable: true },
                      role: { type: 'string' },
                      status: { type: 'string' },
                      avatarUrl: { type: 'string', nullable: true },
                      authProvider: { type: 'string' },
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
    async (request: FastifyRequest<{ Body: AcceptInviteBody }>, reply: FastifyReply) => {
      try {
        const { token, name, password } = request.body;
        const result = await authService.acceptInvitation(token, name, password);

        // Send welcome email
        await emailService.sendWelcome(result.user.email, result.user.name || '');

        return { data: result };
      } catch (error) {
        if (error instanceof InvitationError) {
          return reply.status(400).send({
            error: {
              code: 'INVITATION_ERROR',
              message: error.message,
            },
          });
        }
        throw error;
      }
    }
  );

  /**
   * POST /api/auth/forgot-password
   * Request password reset email
   */
  app.post<{ Body: ForgotPasswordBody }>(
    '/api/auth/forgot-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ForgotPasswordBody }>, _reply: FastifyReply) => {
      const { email } = request.body;
      const result = await authService.initiatePasswordReset(email);

      // If user exists, send reset email
      if (result) {
        const user = await authService.getUserByEmail(email);
        await emailService.sendPasswordReset(email, user?.name || '', result.token);
      }

      // Always return success to prevent email enumeration
      return {
        data: {
          message: 'If an account with that email exists, we sent a password reset link.',
        },
      };
    }
  );

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  app.post<{ Body: ResetPasswordBody }>(
    '/api/auth/reset-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string' },
            password: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ResetPasswordBody }>, reply: FastifyReply) => {
      try {
        const { token, password } = request.body;
        await authService.resetPassword(token, password);

        return {
          data: {
            message: 'Password has been reset successfully. You can now log in.',
          },
        };
      } catch (error) {
        if (error instanceof PasswordResetError) {
          return reply.status(400).send({
            error: {
              code: 'RESET_ERROR',
              message: error.message,
            },
          });
        }
        throw error;
      }
    }
  );
}
