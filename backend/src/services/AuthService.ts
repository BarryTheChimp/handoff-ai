import { FastifyInstance } from 'fastify';
import { TEST_USERS, toSafeUser, SafeUser, User } from '../config/users.js';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export interface LoginResult {
  token: string;
  user: SafeUser;
  expiresIn: string;
}

export interface AuthService {
  login(username: string, password: string): Promise<LoginResult>;
  validateToken(token: string): Promise<SafeUser>;
}

/**
 * Creates an AuthService instance bound to a Fastify app with JWT configured
 */
export function createAuthService(app: FastifyInstance): AuthService {
  return {
    /**
     * Authenticate user and return JWT token
     */
    async login(username: string, password: string): Promise<LoginResult> {
      const user = TEST_USERS.find(
        (u) => u.username === username && u.password === password
      );

      if (!user) {
        throw new AuthenticationError('Invalid username or password');
      }

      const safeUser = toSafeUser(user);
      const token = app.jwt.sign(safeUser, { expiresIn: '24h' });

      return {
        token,
        user: safeUser,
        expiresIn: '24h',
      };
    },

    /**
     * Validate a JWT token and return the user
     */
    async validateToken(token: string): Promise<SafeUser> {
      try {
        const decoded = app.jwt.verify<SafeUser>(token);
        return decoded;
      } catch {
        throw new AuthenticationError('Invalid or expired token');
      }
    },
  };
}

/**
 * Find a user by ID (for internal use)
 */
export function findUserById(id: string): User | undefined {
  return TEST_USERS.find((u) => u.id === id);
}
