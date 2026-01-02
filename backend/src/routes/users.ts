import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

interface UpdateUserBody {
  role?: UserRole;
  status?: UserStatus;
}

interface ListUsersQuery {
  status?: UserStatus;
  role?: UserRole;
}

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  // All routes require authentication and admin role
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    }
  });

  /**
   * GET /api/users
   * List all users
   */
  app.get<{ Querystring: ListUsersQuery }>(
    '/api/users',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'active', 'suspended'] },
            role: { type: 'string', enum: ['admin', 'member'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    name: { type: 'string', nullable: true },
                    role: { type: 'string' },
                    status: { type: 'string' },
                    avatarUrl: { type: 'string', nullable: true },
                    authProvider: { type: 'string' },
                    emailVerified: { type: 'boolean' },
                    lastLoginAt: { type: 'string', nullable: true },
                    createdAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: ListUsersQuery }>, _reply: FastifyReply) => {
      const { status, role } = request.query;

      const users = await prisma.user.findMany({
        where: {
          ...(status && { status }),
          ...(role && { role }),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          avatarUrl: true,
          authProvider: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      return {
        data: users.map((user) => ({
          ...user,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
        })),
      };
    }
  );

  /**
   * GET /api/users/:id
   * Get user by ID
   */
  app.get<{ Params: { id: string } }>(
    '/api/users/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
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
                  emailVerified: { type: 'boolean' },
                  lastLoginAt: { type: 'string', nullable: true },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          avatarUrl: true,
          authProvider: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      return {
        data: {
          ...user,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
        },
      };
    }
  );

  /**
   * PATCH /api/users/:id
   * Update user role or status
   */
  app.patch<{ Params: { id: string }; Body: UpdateUserBody }>(
    '/api/users/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['admin', 'member'] },
            status: { type: 'string', enum: ['pending', 'active', 'suspended'] },
          },
        },
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
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserBody }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { role, status } = request.body;

      // Prevent self-demotion
      if (id === request.user.id && role && role !== 'admin') {
        return reply.status(400).send({
          error: {
            code: 'INVALID_OPERATION',
            message: 'You cannot demote yourself',
          },
        });
      }

      // Prevent self-suspension
      if (id === request.user.id && status === 'suspended') {
        return reply.status(400).send({
          error: {
            code: 'INVALID_OPERATION',
            message: 'You cannot suspend yourself',
          },
        });
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(role && { role }),
          ...(status && { status }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
      });

      return { data: updatedUser };
    }
  );

  /**
   * DELETE /api/users/:id
   * Delete a user
   */
  app.delete<{ Params: { id: string } }>(
    '/api/users/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      // Prevent self-deletion
      if (id === request.user.id) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_OPERATION',
            message: 'You cannot delete yourself',
          },
        });
      }

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      await prisma.user.delete({
        where: { id },
      });

      return {
        data: {
          message: 'User deleted successfully',
        },
      };
    }
  );

  /**
   * GET /api/users/invitations
   * List pending invitations
   */
  app.get(
    '/api/users/invitations',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    invitedBy: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string', nullable: true },
                        email: { type: 'string' },
                      },
                    },
                    expiresAt: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      const invitations = await prisma.userInvitation.findMany({
        where: {
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: {
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        data: invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          invitedBy: inv.invitedBy,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        })),
      };
    }
  );

  /**
   * DELETE /api/users/invitations/:id
   * Cancel/delete an invitation
   */
  app.delete<{ Params: { id: string } }>(
    '/api/users/invitations/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const invitation = await prisma.userInvitation.findUnique({
        where: { id: request.params.id },
      });

      if (!invitation) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Invitation not found',
          },
        });
      }

      await prisma.userInvitation.delete({
        where: { id: request.params.id },
      });

      return {
        data: {
          message: 'Invitation cancelled',
        },
      };
    }
  );
}
