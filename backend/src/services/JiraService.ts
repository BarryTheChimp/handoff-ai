import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';

// =============================================================================
// Types
// =============================================================================

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description: string;
  subtask: boolean;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrl?: string;
}

export interface JiraCreateIssueInput {
  projectKey: string;
  issueType: 'Epic' | 'Story' | 'Task' | 'Sub-task';
  summary: string;
  description: string; // ADF (Atlassian Document Format) JSON string
  epicKey?: string; // Parent epic for stories
  parentKey?: string; // Parent for sub-tasks
  labels?: string[];
  customFields?: Record<string, unknown>;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: { name: string };
    issuetype: { name: string };
  };
}

export interface JiraConnectionStatus {
  connected: boolean;
  user?: JiraUser | undefined;
  siteUrl?: string | undefined;
  expiresAt?: Date | undefined;
}

export interface JiraOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// =============================================================================
// Interface
// =============================================================================

export interface IJiraService {
  // OAuth
  getAuthUrl(state: string): string;
  handleOAuthCallback(code: string, userId: string): Promise<void>;
  getConnectionStatus(userId: string): Promise<JiraConnectionStatus>;
  disconnect(userId: string): Promise<void>;
  refreshTokenIfNeeded(userId: string): Promise<boolean>;

  // API operations (require connection)
  getProjects(userId: string): Promise<JiraProject[]>;
  getIssueTypes(userId: string, projectKey: string): Promise<JiraIssueType[]>;
  createIssue(userId: string, input: JiraCreateIssueInput): Promise<JiraIssue>;
  getIssue(userId: string, issueKey: string): Promise<JiraIssue | null>;
  linkIssues(userId: string, inwardKey: string, outwardKey: string, linkType: string): Promise<void>;
}

// =============================================================================
// Mock Implementation (for development without Jira access)
// =============================================================================

class MockJiraService implements IJiraService {
  private mockConnections = new Map<string, { expiresAt: Date; cloudId: string }>();
  private mockIssueCounter = 1;

  getAuthUrl(state: string): string {
    // In real implementation, this would return Atlassian OAuth URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/jira/mock-callback?state=${state}&mock=true`;
  }

  async handleOAuthCallback(code: string, userId: string): Promise<void> {
    // Mock: Store a fake connection
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    await prisma.jiraConnection.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: encrypt('mock-access-token-' + Date.now()),
        refreshToken: encrypt('mock-refresh-token-' + Date.now()),
        expiresAt,
        cloudId: 'mock-cloud-id-12345',
        siteUrl: 'https://your-site.atlassian.net',
      },
      update: {
        accessToken: encrypt('mock-access-token-' + Date.now()),
        refreshToken: encrypt('mock-refresh-token-' + Date.now()),
        expiresAt,
      },
    });

    console.log(`[MockJira] Created mock connection for user ${userId}`);
  }

  async getConnectionStatus(userId: string): Promise<JiraConnectionStatus> {
    const connection = await prisma.jiraConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      return { connected: false };
    }

    // Check if expired
    if (connection.expiresAt < new Date()) {
      return { connected: false };
    }

    return {
      connected: true,
      user: {
        accountId: 'mock-account-id',
        displayName: 'Mock User',
        emailAddress: 'mock@example.com',
      },
      siteUrl: connection.siteUrl || 'https://your-site.atlassian.net',
      expiresAt: connection.expiresAt,
    };
  }

  async disconnect(userId: string): Promise<void> {
    await prisma.jiraConnection.delete({
      where: { userId },
    }).catch(() => {
      // Ignore if not found
    });

    console.log(`[MockJira] Disconnected user ${userId}`);
  }

  async refreshTokenIfNeeded(userId: string): Promise<boolean> {
    const connection = await prisma.jiraConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      return false;
    }

    // If token expires in less than 5 minutes, refresh it
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (connection.expiresAt > fiveMinutesFromNow) {
      return true; // Still valid
    }

    // Mock refresh
    const newExpiresAt = new Date(Date.now() + 3600 * 1000);
    await prisma.jiraConnection.update({
      where: { userId },
      data: {
        accessToken: encrypt('mock-refreshed-token-' + Date.now()),
        expiresAt: newExpiresAt,
      },
    });

    console.log(`[MockJira] Refreshed token for user ${userId}`);
    return true;
  }

  async getProjects(userId: string): Promise<JiraProject[]> {
    await this.ensureConnected(userId);

    // Return mock projects
    return [
      {
        id: '10001',
        key: 'HAND',
        name: 'Handoff AI',
        projectTypeKey: 'software',
      },
      {
        id: '10002',
        key: 'DEMO',
        name: 'Demo Project',
        projectTypeKey: 'software',
      },
      {
        id: '10003',
        key: 'TEST',
        name: 'Test Project',
        projectTypeKey: 'software',
      },
    ];
  }

  async getIssueTypes(userId: string, projectKey: string): Promise<JiraIssueType[]> {
    await this.ensureConnected(userId);

    // Return standard Jira Software issue types
    return [
      { id: '10001', name: 'Epic', description: 'A big user story', subtask: false },
      { id: '10002', name: 'Story', description: 'User story', subtask: false },
      { id: '10003', name: 'Task', description: 'A task', subtask: false },
      { id: '10004', name: 'Sub-task', description: 'A sub-task', subtask: true },
      { id: '10005', name: 'Bug', description: 'A bug', subtask: false },
    ];
  }

  async createIssue(userId: string, input: JiraCreateIssueInput): Promise<JiraIssue> {
    await this.ensureConnected(userId);

    // Generate a mock issue key
    const issueNumber = this.mockIssueCounter++;
    const issueKey = `${input.projectKey}-${issueNumber}`;

    console.log(`[MockJira] Created issue ${issueKey}: ${input.summary}`);

    return {
      id: `mock-${issueNumber}`,
      key: issueKey,
      self: `https://your-site.atlassian.net/rest/api/3/issue/mock-${issueNumber}`,
      fields: {
        summary: input.summary,
        status: { name: 'To Do' },
        issuetype: { name: input.issueType },
      },
    };
  }

  async getIssue(userId: string, issueKey: string): Promise<JiraIssue | null> {
    await this.ensureConnected(userId);

    // Mock: return a fake issue
    return {
      id: 'mock-123',
      key: issueKey,
      self: `https://your-site.atlassian.net/rest/api/3/issue/mock-123`,
      fields: {
        summary: 'Mock Issue',
        status: { name: 'To Do' },
        issuetype: { name: 'Story' },
      },
    };
  }

  async linkIssues(userId: string, inwardKey: string, outwardKey: string, linkType: string): Promise<void> {
    await this.ensureConnected(userId);

    console.log(`[MockJira] Linked ${inwardKey} -> ${outwardKey} (${linkType})`);
  }

  private async ensureConnected(userId: string): Promise<void> {
    const status = await this.getConnectionStatus(userId);
    if (!status.connected) {
      throw new Error('Not connected to Jira. Please connect first.');
    }
  }
}

// =============================================================================
// Real Implementation Placeholder
// =============================================================================

class RealJiraService implements IJiraService {
  private config: JiraOAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.JIRA_CLIENT_ID || '',
      clientSecret: process.env.JIRA_CLIENT_SECRET || '',
      redirectUri: process.env.JIRA_REDIRECT_URI || 'http://localhost:3001/api/jira/callback',
      scopes: [
        'read:jira-work',
        'write:jira-work',
        'read:jira-user',
        'offline_access',
      ],
    };
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: this.config.clientId,
      scope: this.config.scopes.join(' '),
      redirect_uri: this.config.redirectUri,
      state,
      response_type: 'code',
      prompt: 'consent',
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(code: string, userId: string): Promise<void> {
    // TODO: Implement real OAuth token exchange
    // 1. POST to https://auth.atlassian.com/oauth/token
    // 2. Get access_token, refresh_token, expires_in
    // 3. Get cloud ID from https://api.atlassian.com/oauth/token/accessible-resources
    // 4. Store encrypted tokens in database

    throw new Error('Real Jira integration not yet implemented. Set JIRA_MOCK=true to use mock.');
  }

  async getConnectionStatus(userId: string): Promise<JiraConnectionStatus> {
    const connection = await prisma.jiraConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      return { connected: false };
    }

    if (connection.expiresAt < new Date()) {
      // Try to refresh
      const refreshed = await this.refreshTokenIfNeeded(userId);
      if (!refreshed) {
        return { connected: false };
      }
    }

    // TODO: Fetch actual user info from Jira API
    return {
      connected: true,
      siteUrl: connection.siteUrl || undefined,
      expiresAt: connection.expiresAt,
    };
  }

  async disconnect(userId: string): Promise<void> {
    await prisma.jiraConnection.delete({
      where: { userId },
    }).catch(() => {});
  }

  async refreshTokenIfNeeded(userId: string): Promise<boolean> {
    // TODO: Implement real token refresh
    // POST to https://auth.atlassian.com/oauth/token with grant_type=refresh_token
    return false;
  }

  async getProjects(userId: string): Promise<JiraProject[]> {
    // TODO: GET https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/project
    throw new Error('Real Jira integration not yet implemented.');
  }

  async getIssueTypes(userId: string, projectKey: string): Promise<JiraIssueType[]> {
    // TODO: GET https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/project/{projectKey}
    throw new Error('Real Jira integration not yet implemented.');
  }

  async createIssue(userId: string, input: JiraCreateIssueInput): Promise<JiraIssue> {
    // TODO: POST https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/issue
    throw new Error('Real Jira integration not yet implemented.');
  }

  async getIssue(userId: string, issueKey: string): Promise<JiraIssue | null> {
    // TODO: GET https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/issue/{issueKey}
    throw new Error('Real Jira integration not yet implemented.');
  }

  async linkIssues(userId: string, inwardKey: string, outwardKey: string, linkType: string): Promise<void> {
    // TODO: POST https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/issueLink
    throw new Error('Real Jira integration not yet implemented.');
  }
}

// =============================================================================
// Factory
// =============================================================================

function createJiraService(): IJiraService {
  const useMock = process.env.JIRA_MOCK === 'true' ||
    !process.env.JIRA_CLIENT_ID ||
    !process.env.JIRA_CLIENT_SECRET;

  if (useMock) {
    console.log('[JiraService] Using mock implementation');
    return new MockJiraService();
  }

  console.log('[JiraService] Using real implementation');
  return new RealJiraService();
}

export const jiraService = createJiraService();
