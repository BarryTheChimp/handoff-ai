import { SafeUser } from '../services/AuthService.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: SafeUser;
    user: SafeUser;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: SafeUser;
  }
}
