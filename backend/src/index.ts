import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import 'dotenv/config';
import { prisma, checkDatabaseConnection, disconnectDatabase } from './lib/prisma.js';
import { authRoutes } from './routes/auth.js';
import { specsRoutes } from './routes/specs.js';
import { projectsRoutes } from './routes/projects.js';
import { workitemsRoutes } from './routes/workitems.js';
import { historyRoutes } from './routes/history.js';
import { jiraRoutes } from './routes/jira.js';

// Extend Fastify with authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

import type { FastifyRequest, FastifyReply } from 'fastify';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST ?? '0.0.0.0';

async function buildApp() {
  const isDev = process.env.NODE_ENV !== 'production';

  const fastify = Fastify({
    logger: isDev
      ? {
          level: 'debug',
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          },
        }
      : {
          level: 'info',
        },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
  });

  await fastify.register(helmet);

  // Register multipart for file uploads (50MB limit)
  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max
    },
  });

  // Register JWT
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  await fastify.register(jwt, {
    secret: jwtSecret,
  });

  // Add authenticate decorator
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing authentication token',
        },
      });
    }
  });

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(projectsRoutes);
  await fastify.register(specsRoutes);
  await fastify.register(workitemsRoutes);
  await fastify.register(historyRoutes);
  await fastify.register(jiraRoutes);

  // Health check endpoint
  fastify.get('/', async (_request, _reply) => {
    return { status: 'ok' };
  });

  // API health check with database status
  fastify.get('/api/health', async (_request, _reply) => {
    let dbStatus = 'unknown';
    try {
      await checkDatabaseConnection();
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
      database: dbStatus,
    };
  });

  // Database stats endpoint (for testing)
  fastify.get('/api/health/db', async (_request, reply) => {
    try {
      await checkDatabaseConnection();
      const projectCount = await prisma.project.count();
      const specCount = await prisma.spec.count();
      const workItemCount = await prisma.workItem.count();

      return {
        status: 'connected',
        counts: {
          projects: projectCount,
          specs: specCount,
          workItems: workItemCount,
        },
      };
    } catch (error) {
      return reply.status(503).send({
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'Database connection failed',
        },
      });
    }
  });

  return fastify;
}

async function start(): Promise<void> {
  try {
    const app = await buildApp();

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      await disconnectDatabase();
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    await app.listen({ port: PORT, host: HOST });
    console.log(`Server running at http://localhost:${PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    await disconnectDatabase();
    process.exit(1);
  }
}

void start();
