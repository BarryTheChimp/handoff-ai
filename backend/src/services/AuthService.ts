import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient, User as PrismaUser, UserRole, UserStatus, AuthProvider } from '@prisma/client';

const BCRYPT_ROUNDS = 12;
const INVITE_EXPIRY_HOURS = 72;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class InvitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvitationError';
  }
}

export class PasswordResetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordResetError';
  }
}

// Safe user type (no password hash)
export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  authProvider: AuthProvider;
}

export interface LoginResult {
  token: string;
  user: SafeUser;
  expiresIn: string;
}

export interface InvitationDetails {
  id: string;
  email: string;
  role: UserRole;
  inviterName: string;
  expiresAt: Date;
}

export interface AuthService {
  // Auth
  login(email: string, password: string): Promise<LoginResult>;
  validateToken(token: string): Promise<SafeUser>;

  // Invitations
  createInvitation(email: string, role: UserRole, inviterId: string): Promise<{ token: string; expiresAt: Date }>;
  getInvitationByToken(token: string): Promise<InvitationDetails | null>;
  acceptInvitation(token: string, name: string, password: string): Promise<LoginResult>;

  // Password Reset
  initiatePasswordReset(email: string): Promise<{ token: string; expiresAt: Date } | null>;
  resetPassword(token: string, newPassword: string): Promise<void>;

  // User management
  getUserById(id: string): Promise<SafeUser | null>;
  getUserByEmail(email: string): Promise<SafeUser | null>;
}

/**
 * Convert Prisma User to SafeUser (remove sensitive fields)
 */
function toSafeUser(user: PrismaUser): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider,
  };
}

/**
 * Generate secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate password meets requirements
 * - Min 8 characters
 * - 1 uppercase, 1 lowercase, 1 number
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

/**
 * Creates an AuthService instance bound to a Fastify app with JWT configured
 */
export function createAuthService(app: FastifyInstance, prisma: PrismaClient): AuthService {
  return {
    /**
     * Authenticate user with email and password
     */
    async login(email: string, password: string): Promise<LoginResult> {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      if (user.status === 'suspended') {
        throw new AuthenticationError('Account has been suspended');
      }

      if (user.status === 'pending') {
        throw new AuthenticationError('Account is pending activation. Please check your email.');
      }

      // Check if user uses password auth
      if (user.authProvider !== 'email' || !user.passwordHash) {
        throw new AuthenticationError(
          `Please sign in with ${user.authProvider === 'google' ? 'Google' : 'Microsoft'}`
        );
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

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

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });

        if (!user || user.status !== 'active') {
          throw new AuthenticationError('Invalid or expired token');
        }

        return toSafeUser(user);
      } catch {
        throw new AuthenticationError('Invalid or expired token');
      }
    },

    /**
     * Create an invitation for a new user
     */
    async createInvitation(
      email: string,
      role: UserRole,
      inviterId: string
    ): Promise<{ token: string; expiresAt: Date }> {
      const normalizedEmail = email.toLowerCase();

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new InvitationError('A user with this email already exists');
      }

      // Check for existing pending invitation
      const existingInvite = await prisma.userInvitation.findFirst({
        where: {
          email: normalizedEmail,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingInvite) {
        throw new InvitationError('An invitation has already been sent to this email');
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

      await prisma.userInvitation.create({
        data: {
          email: normalizedEmail,
          token,
          role,
          invitedById: inviterId,
          expiresAt,
        },
      });

      return { token, expiresAt };
    },

    /**
     * Get invitation details by token
     */
    async getInvitationByToken(token: string): Promise<InvitationDetails | null> {
      const invitation = await prisma.userInvitation.findUnique({
        where: { token },
        include: { invitedBy: true },
      });

      if (!invitation) {
        return null;
      }

      if (invitation.acceptedAt) {
        return null; // Already used
      }

      if (invitation.expiresAt < new Date()) {
        return null; // Expired
      }

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        inviterName: invitation.invitedBy.name || invitation.invitedBy.email,
        expiresAt: invitation.expiresAt,
      };
    },

    /**
     * Accept an invitation and create user account
     */
    async acceptInvitation(
      token: string,
      name: string,
      password: string
    ): Promise<LoginResult> {
      const invitation = await prisma.userInvitation.findUnique({
        where: { token },
      });

      if (!invitation) {
        throw new InvitationError('Invalid invitation');
      }

      if (invitation.acceptedAt) {
        throw new InvitationError('This invitation has already been used');
      }

      if (invitation.expiresAt < new Date()) {
        throw new InvitationError('This invitation has expired');
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new InvitationError(passwordValidation.message!);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Create user and mark invitation as accepted in a transaction
      const user = await prisma.$transaction(async (tx) => {
        // Mark invitation as accepted
        await tx.userInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });

        // Create user
        return tx.user.create({
          data: {
            email: invitation.email,
            name: name.trim(),
            passwordHash,
            role: invitation.role,
            status: 'active',
            emailVerified: true, // Email verified through invitation
            authProvider: 'email',
          },
        });
      });

      const safeUser = toSafeUser(user);
      const jwtToken = app.jwt.sign(safeUser, { expiresIn: '24h' });

      return {
        token: jwtToken,
        user: safeUser,
        expiresIn: '24h',
      };
    },

    /**
     * Initiate password reset flow
     * Returns null if email not found (don't reveal if email exists)
     */
    async initiatePasswordReset(
      email: string
    ): Promise<{ token: string; expiresAt: Date } | null> {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        return null; // Don't reveal that email doesn't exist
      }

      // Only allow password reset for email auth users
      if (user.authProvider !== 'email') {
        return null;
      }

      // Invalidate any existing reset tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(), // Mark as used
        },
      });

      const token = generateToken();
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      return { token, expiresAt };
    },

    /**
     * Reset password using token
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
      });

      if (!resetToken) {
        throw new PasswordResetError('Invalid or expired reset link');
      }

      if (resetToken.usedAt) {
        throw new PasswordResetError('This reset link has already been used');
      }

      if (resetToken.expiresAt < new Date()) {
        throw new PasswordResetError('This reset link has expired');
      }

      // Validate password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new PasswordResetError(passwordValidation.message!);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Update password and mark token as used in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        });

        await tx.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash },
        });
      });
    },

    /**
     * Get user by ID
     */
    async getUserById(id: string): Promise<SafeUser | null> {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      return user ? toSafeUser(user) : null;
    },

    /**
     * Get user by email
     */
    async getUserByEmail(email: string): Promise<SafeUser | null> {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      return user ? toSafeUser(user) : null;
    },
  };
}
