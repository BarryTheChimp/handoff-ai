import type { Spec, WorkItem } from '../types/workItem';

const API_BASE = '/api';

// Get auth token from localStorage
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Generic API error
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Handle API response
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error', code: 'UNKNOWN' } }));
    throw new ApiError(
      error.error?.message || 'Request failed',
      error.error?.code || 'UNKNOWN',
      response.status
    );
  }
  const data = await response.json();
  return data.data;
}

// Auth API
export const authApi = {
  async login(username: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse<{ token: string; user: unknown }>(response);
    localStorage.setItem('auth_token', data.token);
    return data;
  },

  async me() {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  logout() {
    localStorage.removeItem('auth_token');
  },
};

// Specs API
export const specsApi = {
  async list(projectId?: string): Promise<Spec[]> {
    const url = projectId ? `${API_BASE}/specs?projectId=${projectId}` : `${API_BASE}/specs`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse<Spec[]>(response);
  },

  async get(id: string): Promise<Spec> {
    const response = await fetch(`${API_BASE}/specs/${id}`, { headers: getAuthHeaders() });
    return handleResponse<Spec>(response);
  },

  async getWorkItems(specId: string): Promise<{ flat: WorkItem[]; hierarchical: WorkItem[] }> {
    const response = await fetch(`${API_BASE}/specs/${specId}/workitems`, { headers: getAuthHeaders() });
    return handleResponse<{ flat: WorkItem[]; hierarchical: WorkItem[] }>(response);
  },

  async extract(specId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/specs/${specId}/extract`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
  },

  async translate(specId: string): Promise<{
    epicsCreated: number;
    featuresCreated: number;
    storiesCreated: number;
    qualityScore: number;
    warnings: string[];
  }> {
    const response = await fetch(`${API_BASE}/specs/${specId}/translate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async delete(specId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/specs/${specId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Delete failed', code: 'UNKNOWN' } }));
      throw new ApiError(
        error.error?.message || 'Delete failed',
        error.error?.code || 'UNKNOWN',
        response.status
      );
    }
  },
};

// Work Items API
export const workItemsApi = {
  async update(id: string, changes: Partial<WorkItem>): Promise<WorkItem> {
    const response = await fetch(`${API_BASE}/workitems/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(changes),
    });
    return handleResponse<WorkItem>(response);
  },

  async move(id: string, newParentId: string | null, newOrderIndex: number): Promise<WorkItem> {
    const response = await fetch(`${API_BASE}/workitems/${id}/move`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newParentId, newOrderIndex }),
    });
    return handleResponse<WorkItem>(response);
  },
};

// Jira Types
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

export interface JiraConnectionStatus {
  connected: boolean;
  user?: {
    accountId: string;
    displayName: string;
    emailAddress?: string;
  };
  siteUrl?: string;
  expiresAt?: string;
}

export interface ExportProgress {
  exportId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  results: Array<{
    workItemId: string;
    workItemTitle: string;
    workItemType: string;
    jiraKey?: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }>;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ExportPreview {
  items: Array<{
    workItemId: string;
    title: string;
    type: string;
    parentTitle?: string;
    jiraIssueType: string;
    alreadyExported: boolean;
  }>;
  totalNew: number;
  totalSkipped: number;
}

// Jira API
export const jiraApi = {
  async getAuthUrl(): Promise<{ authUrl: string; state: string }> {
    const response = await fetch(`${API_BASE}/jira/auth`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ authUrl: string; state: string }>(response);
  },

  async getStatus(): Promise<JiraConnectionStatus> {
    const response = await fetch(`${API_BASE}/jira/status`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<JiraConnectionStatus>(response);
  },

  async disconnect(): Promise<void> {
    const response = await fetch(`${API_BASE}/jira/disconnect`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new ApiError('Failed to disconnect', 'DISCONNECT_FAILED', response.status);
    }
  },

  async getProjects(): Promise<JiraProject[]> {
    const response = await fetch(`${API_BASE}/jira/projects`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<JiraProject[]>(response);
  },

  async startExport(specId: string, jiraProjectKey: string, dryRun = false): Promise<{ exportId: string }> {
    const response = await fetch(`${API_BASE}/specs/${specId}/export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ jiraProjectKey, dryRun }),
    });
    return handleResponse<{ exportId: string }>(response);
  },

  async getExportProgress(exportId: string): Promise<ExportProgress> {
    const response = await fetch(`${API_BASE}/exports/${exportId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ExportProgress>(response);
  },

  async cancelExport(exportId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/exports/${exportId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new ApiError('Failed to cancel export', 'CANCEL_FAILED', response.status);
    }
  },

  async getExportPreview(specId: string, jiraProjectKey: string): Promise<ExportPreview> {
    const response = await fetch(
      `${API_BASE}/specs/${specId}/export/preview?jiraProjectKey=${encodeURIComponent(jiraProjectKey)}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse<ExportPreview>(response);
  },
};
