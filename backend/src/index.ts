import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { prisma, checkDatabaseConnection, disconnectDatabase } from './lib/prisma.js';
import { authRoutes } from './routes/auth.js';
import { specsRoutes } from './routes/specs.js';
import { projectsRoutes } from './routes/projects.js';
import { workitemsRoutes } from './routes/workitems.js';
import { historyRoutes } from './routes/history.js';
import { jiraRoutes } from './routes/jira.js';
import { specGroupRoutes } from './routes/specGroups.js';
import { bulkRoutes } from './routes/bulk.js';
import { templateRoutes } from './routes/templates.js';
import { dependencyRoutes } from './routes/dependencies.js';
import { estimateRoutes } from './routes/estimates.js';
import { coverageRoutes } from './routes/coverage.js';
import { feedbackRoutes } from './routes/feedback.js';
import { knowledgeRoutes } from './routes/knowledge.js';
import { contextSourceRoutes } from './routes/context-sources.js';
import { learningRoutes } from './routes/learning.js';
import { projectHealthRoutes } from './routes/health.js';
import { investRoutes } from './routes/invest.js';
import { exportRoutes } from './routes/exports.js';
import { settingsRoutes } from './routes/settings.js';
import { relationshipRoutes } from './routes/relationships.js';
import { splitRoutes } from './routes/splits.js';
import { duplicateRoutes } from './routes/duplicates.js';
import { analysisRoutes } from './routes/analysis.js';
import { workBreakdownRoutes } from './routes/work-breakdown.js';
import { usersRoutes } from './routes/users.js';

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
    origin: process.env.NODE_ENV === 'production'
      ? ['https://handoff-ai-frontend.vercel.app', 'https://handoff-ai.vercel.app']
      : true,
    credentials: true,
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
  await fastify.register(specGroupRoutes);
  await fastify.register(bulkRoutes);
  await fastify.register(templateRoutes);
  await fastify.register(dependencyRoutes);
  await fastify.register(estimateRoutes);
  await fastify.register(coverageRoutes);
  await fastify.register(feedbackRoutes);
  await fastify.register(knowledgeRoutes);
  await fastify.register(contextSourceRoutes);
  await fastify.register(learningRoutes);
  await fastify.register(projectHealthRoutes);
  await fastify.register(investRoutes);
  await fastify.register(exportRoutes);
  await fastify.register(settingsRoutes);
  await fastify.register(relationshipRoutes);
  await fastify.register(splitRoutes);
  await fastify.register(duplicateRoutes);
  await fastify.register(analysisRoutes);
  await fastify.register(workBreakdownRoutes);
  await fastify.register(usersRoutes);

  // Health check endpoint
  fastify.get('/', async (_request, _reply) => {
    return { status: 'ok' };
  });

  // API health check with database status
  fastify.get('/api/health', async (_request, _reply) => {
    let dbStatus = 'unknown';
    let demoUserExists = false;
    try {
      await checkDatabaseConnection();
      dbStatus = 'connected';

      // Check if demo user exists
      const demoUser = await prisma.user.findUnique({
        where: { email: 'demo@handoff.ai' },
        select: { id: true, email: true, status: true },
      });
      demoUserExists = !!demoUser;
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
      database: dbStatus,
      demoUser: demoUserExists,
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

/**
 * Seed demo user on startup (idempotent - only creates if doesn't exist)
 */
async function seedDemoUser(): Promise<void> {
  const email = 'demo@handoff.ai';
  const password = 'Demo123!';
  const name = 'Demo User';

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('Demo user already exists');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'admin',
        status: 'active',
        emailVerified: true,
        authProvider: 'email',
      },
    });

    console.log(`Demo user created: ${email}`);
  } catch (error) {
    console.error('Failed to seed demo user:', error);
    // Don't fail startup if seeding fails
  }
}

async function start(): Promise<void> {
  try {
    // Seed demo user before starting
    await seedDemoUser();

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
