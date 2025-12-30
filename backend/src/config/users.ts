/**
 * Test users for authentication
 * In production, these would come from a database
 */

export type UserRole = 'admin' | 'tech_lead' | 'developer';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
}

export interface SafeUser {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
}

export const TEST_USERS: User[] = [
  {
    id: 'user-001',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    displayName: 'Administrator',
  },
  {
    id: 'user-002',
    username: 'tech.lead',
    password: 'lead123',
    role: 'tech_lead',
    displayName: 'Tech Lead',
  },
  {
    id: 'user-003',
    username: 'developer',
    password: 'dev123',
    role: 'developer',
    displayName: 'Developer',
  },
];

/**
 * Remove sensitive data from user object
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
  };
}
