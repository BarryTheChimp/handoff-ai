import type { Spec, WorkItem } from '../types/workItem';

// Use environment variable for API base URL, fallback to relative path for local dev
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Get auth token from localStorage
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Get auth headers without Content-Type (for requests without body)
function getAuthOnlyHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
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

// Local Export Types
export type LocalExportFormat = 'csv' | 'json' | 'markdown';

export interface ExportFormatInfo {
  id: LocalExportFormat | 'jira';
  name: string;
  description: string;
  extension: string | null;
  mimeType: string | null;
}

export interface LocalExportFilters {
  types?: ('epic' | 'feature' | 'story')[];
  statuses?: ('draft' | 'ready_for_review' | 'approved' | 'exported')[];
}

export interface LocalExportOptions {
  format: LocalExportFormat;
  filters?: LocalExportFilters;
  includeMetadata?: boolean;
  flattenHierarchy?: boolean;
}

// Local Export API
export const localExportApi = {
  async getFormats(specId: string): Promise<{
    formats: ExportFormatInfo[];
    filters: { types: string[]; statuses: string[] };
  }> {
    const response = await fetch(`${API_BASE}/specs/${specId}/export/formats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{
      formats: ExportFormatInfo[];
      filters: { types: string[]; statuses: string[] };
    }>(response);
  },

  async exportToFile(specId: string, options: LocalExportOptions): Promise<{ blob: Blob; filename: string; itemCount: number }> {
    const params = new URLSearchParams();
    params.set('format', options.format);

    if (options.filters?.types?.length) {
      params.set('types', options.filters.types.join(','));
    }
    if (options.filters?.statuses?.length) {
      params.set('statuses', options.filters.statuses.join(','));
    }
    if (options.includeMetadata) {
      params.set('includeMetadata', 'true');
    }
    if (options.flattenHierarchy) {
      params.set('flattenHierarchy', 'true');
    }

    const response = await fetch(`${API_BASE}/specs/${specId}/export/local?${params.toString()}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Export failed', code: 'EXPORT_FAILED' } }));
      throw new ApiError(
        error.error?.message || 'Export failed',
        error.error?.code || 'EXPORT_FAILED',
        response.status
      );
    }

    const blob = await response.blob();
    const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
      `export.${options.format === 'markdown' ? 'md' : options.format}`;
    const itemCount = parseInt(response.headers.get('X-Item-Count') || '0', 10);

    return { blob, filename, itemCount };
  },

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// Spec Group Types
export type SpecGroupStatus = 'pending' | 'analyzing' | 'conflicts_detected' | 'ready' | 'error';

export interface SpecGroupSummary {
  id: string;
  name: string;
  status: SpecGroupStatus;
  specCount: number;
  conflictCount: number;
  createdAt: string;
}

export interface SpecConflict {
  id: string;
  conflictType: 'duplicate' | 'contradiction' | 'overlap';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  spec1: {
    id: string;
    name: string;
    section: string;
    text: string;
  };
  spec2: {
    id: string;
    name: string;
    section: string;
    text: string;
  };
  resolution: 'use_spec1' | 'use_spec2' | 'merge' | 'ignore' | null;
  mergedText: string | null;
  resolvedAt: string | null;
}

export interface SpecGroupDetails {
  id: string;
  name: string;
  status: SpecGroupStatus;
  primarySpecId: string | null;
  stitchedContext: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  specs: Array<{
    id: string;
    name: string;
    fileType: string;
    status: string;
    isPrimary: boolean;
    sectionCount: number;
  }>;
  conflicts: SpecConflict[];
  conflictSummary: {
    total: number;
    resolved: number;
    unresolved: number;
    bySeverity: Record<string, number>;
  };
}

export interface BatchUploadResponse {
  specGroupId: string;
  name: string;
  status: SpecGroupStatus;
  specs: Array<{
    id: string;
    filename: string;
    status: string;
    isPrimary: boolean;
  }>;
  statusUrl: string;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'use_spec1' | 'use_spec2' | 'merge' | 'ignore';
  mergedText?: string;
}

// Spec Groups API
export const specGroupsApi = {
  async list(projectId: string): Promise<SpecGroupSummary[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/spec-groups`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<SpecGroupSummary[]>(response);
  },

  async get(groupId: string): Promise<SpecGroupDetails> {
    const response = await fetch(`${API_BASE}/spec-groups/${groupId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<SpecGroupDetails>(response);
  },

  async batchUpload(
    projectId: string,
    files: File[],
    options?: { groupName?: string; primarySpecIndex?: number }
  ): Promise<BatchUploadResponse> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (options?.groupName) {
      formData.append('groupName', options.groupName);
    }
    if (options?.primarySpecIndex !== undefined) {
      formData.append('primarySpecIndex', String(options.primarySpecIndex));
    }

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/projects/${projectId}/specs/batch`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    return handleResponse<BatchUploadResponse>(response);
  },

  async resolveConflicts(
    groupId: string,
    resolutions: ConflictResolution[]
  ): Promise<{ resolved: number; remaining: number; status: SpecGroupStatus; stitchedContext: string | null }> {
    const response = await fetch(`${API_BASE}/spec-groups/${groupId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ resolutions }),
    });
    return handleResponse(response);
  },

  async translate(groupId: string): Promise<{ specGroupId: string; message: string; status: string }> {
    const response = await fetch(`${API_BASE}/spec-groups/${groupId}/translate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async delete(groupId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/spec-groups/${groupId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new ApiError('Failed to delete group', 'DELETE_FAILED', response.status);
    }
  },

  async analyze(groupId: string): Promise<{ message: string; statusUrl: string }> {
    const response = await fetch(`${API_BASE}/spec-groups/${groupId}/analyze`, {
      method: 'POST',
      headers: getAuthOnlyHeaders(),
    });
    return handleResponse(response);
  },
};

// Bulk Operations Types
export type SizeEstimate = 'S' | 'M' | 'L' | 'XL';
export type WorkItemStatusType = 'draft' | 'ready_for_review' | 'approved' | 'exported';

export interface BulkUpdateResult {
  updated: number;
  failed: number;
  failures: Array<{ itemId: string; error: string }>;
  undoToken: string;
  undoExpiresAt: string;
}

export interface BulkEnhanceResult {
  enhanced: number;
  failed: number;
  failures: Array<{ itemId: string; error: string }>;
  enhancements: Array<{ itemId: string; addedContent: string }>;
  undoToken: string;
  undoExpiresAt: string;
}

export interface BulkUndoResult {
  reverted: number;
  operation: string;
}

// Bulk Operations API
export const bulkApi = {
  async updateFields(
    itemIds: string[],
    updates: { sizeEstimate?: SizeEstimate; status?: WorkItemStatusType }
  ): Promise<BulkUpdateResult> {
    const response = await fetch(`${API_BASE}/workitems/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ itemIds, updates }),
    });
    return handleResponse<BulkUpdateResult>(response);
  },

  async aiEnhance(
    itemIds: string[],
    enhancement: string,
    context?: string
  ): Promise<BulkEnhanceResult> {
    const response = await fetch(`${API_BASE}/workitems/bulk/ai-enhance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ itemIds, enhancement, context }),
    });
    return handleResponse<BulkEnhanceResult>(response);
  },

  async undo(undoToken: string): Promise<BulkUndoResult> {
    const response = await fetch(`${API_BASE}/workitems/bulk/undo`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ undoToken }),
    });
    return handleResponse<BulkUndoResult>(response);
  },
};

// Templates Types
export type ACFormat = 'gherkin' | 'bullets' | 'checklist';

export interface CustomFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
}

export interface StoryTemplate {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  acFormat: ACFormat;
  requiredSections: string[];
  customFields: CustomFieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  acFormat?: ACFormat;
  requiredSections?: string[];
  customFields?: CustomFieldDefinition[];
  isDefault?: boolean;
}

// Templates API
export const templatesApi = {
  async list(projectId: string): Promise<StoryTemplate[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/templates`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<StoryTemplate[]>(response);
  },

  async get(projectId: string, templateId: string): Promise<StoryTemplate> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/templates/${templateId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<StoryTemplate>(response);
  },

  async getDefault(projectId: string): Promise<StoryTemplate | null> {
    try {
      const response = await fetch(`${API_BASE}/projects/${projectId}/templates/default`, {
        headers: getAuthHeaders(),
      });
      if (response.status === 404) return null;
      return handleResponse<StoryTemplate>(response);
    } catch {
      return null;
    }
  },

  async create(projectId: string, input: CreateTemplateInput): Promise<StoryTemplate> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse<StoryTemplate>(response);
  },

  async update(
    projectId: string,
    templateId: string,
    input: Partial<CreateTemplateInput>
  ): Promise<StoryTemplate> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/templates/${templateId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse<StoryTemplate>(response);
  },

  async delete(projectId: string, templateId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/templates/${templateId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error?.message || 'Failed to delete template',
        data.error?.code || 'DELETE_FAILED',
        response.status
      );
    }
  },

  async setDefault(projectId: string, templateId: string): Promise<StoryTemplate> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/templates/${templateId}/default`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<StoryTemplate>(response);
  },
};

// Dependency Graph Types
export interface DependencyNode {
  id: string;
  title: string;
  type: 'epic' | 'feature' | 'story';
  sizeEstimate: string | null;
  status: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  isCritical: boolean;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  criticalPath: string[];
  cycles: string[][];
}

// Dependencies API
export const dependenciesApi = {
  async getGraph(specId: string): Promise<DependencyGraph> {
    const response = await fetch(`${API_BASE}/specs/${specId}/dependencies`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<DependencyGraph>(response);
  },

  async addDependency(workItemId: string, dependsOnId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/workitems/${workItemId}/dependencies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dependsOnId }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error?.message || 'Failed to add dependency',
        data.error?.code || 'ADD_DEPENDENCY_FAILED',
        response.status
      );
    }
  },

  async removeDependency(workItemId: string, dependsOnId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/workitems/${workItemId}/dependencies/${dependsOnId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(
        data.error?.message || 'Failed to remove dependency',
        data.error?.code || 'REMOVE_DEPENDENCY_FAILED',
        response.status
      );
    }
  },
};

// Estimation Types
export type Confidence = 'high' | 'medium' | 'low';

export interface EstimationFactors {
  acCount: number;
  complexitySignals: string[];
  dependencies: number;
  unknowns: number;
}

export interface SingleEstimateResult {
  id: string;
  previousSize: SizeEstimate | null;
  suggestedSize: SizeEstimate;
  confidence: Confidence;
  rationale: string;
  factors: EstimationFactors;
  applied: boolean;
}

export interface BatchEstimateResult {
  estimated: number;
  skipped: number;
  summary: Record<SizeEstimate, number>;
  byConfidence: Record<Confidence, number>;
  lowConfidenceItems: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
  undoToken: string;
  undoExpiresAt: string;
}

// Estimation API
export const estimationApi = {
  async estimateSingle(workItemId: string): Promise<SingleEstimateResult> {
    const response = await fetch(`${API_BASE}/workitems/${workItemId}/estimate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<SingleEstimateResult>(response);
  },

  async estimateBatch(
    specId: string,
    options?: { overwriteExisting?: boolean; minConfidence?: Confidence }
  ): Promise<BatchEstimateResult> {
    const response = await fetch(`${API_BASE}/specs/${specId}/estimate-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(options || {}),
    });
    return handleResponse<BatchEstimateResult>(response);
  },

  async undoBatch(specId: string, undoToken: string): Promise<{ reverted: number }> {
    const response = await fetch(`${API_BASE}/specs/${specId}/estimate-undo`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ undoToken }),
    });
    return handleResponse<{ reverted: number }>(response);
  },
};

// INVEST Score Types
export interface CriterionScore {
  score: number;
  reason: string;
  tips?: string[];
}

export interface InvestScore {
  overall: number;
  independent: CriterionScore;
  negotiable: CriterionScore;
  valuable: CriterionScore;
  estimable: CriterionScore;
  small: CriterionScore;
  testable: CriterionScore;
  suggestions: string[];
}

// INVEST Score API
export const investApi = {
  async getScore(workItemId: string): Promise<InvestScore> {
    const response = await fetch(`${API_BASE}/workitems/${workItemId}/invest-score`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<InvestScore>(response);
  },
};

// Coverage Types
export interface StoryReference {
  id: string;
  title: string;
  relevance: number;
}

export interface SectionCoverage {
  id: string;
  sectionRef: string;
  heading: string;
  contentPreview: string;
  storyCount: number;
  stories: StoryReference[];
  intentionallyUncovered: boolean;
}

export interface CoverageData {
  totalSections: number;
  coveredSections: number;
  coveragePercent: number;
  uncoveredCount: number;
  sections: SectionCoverage[];
}

// Coverage API
export const coverageApi = {
  async getCoverage(specId: string): Promise<CoverageData> {
    const response = await fetch(`${API_BASE}/specs/${specId}/coverage`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<CoverageData>(response);
  },

  async updateSectionStatus(
    sectionId: string,
    intentionallyUncovered: boolean,
    reason?: string
  ): Promise<{ id: string; intentionallyUncovered: boolean }> {
    const response = await fetch(`${API_BASE}/spec-sections/${sectionId}/coverage-status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ intentionallyUncovered, reason }),
    });
    return handleResponse<{ id: string; intentionallyUncovered: boolean }>(response);
  },
};

// Feedback Types
export interface FeedbackData {
  id: string;
  workItemId: string;
  userId: string;
  rating: number; // 1 (thumbs down) or 5 (thumbs up)
  feedback: string | null;
  categories: string[];
  createdAt: string;
}

export interface TeamPreference {
  id: string;
  projectId: string;
  preference: string;
  description: string | null;
  category: string | null;
  learnedFrom: string[];
  active: boolean;
  createdAt: string;
}

export interface ExtractedPreference {
  preference: string;
  description: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
}

// Feedback API
export const feedbackApi = {
  async submitFeedback(
    workItemId: string,
    rating: 1 | 5,
    feedback?: string,
    categories?: string[]
  ): Promise<FeedbackData> {
    const response = await fetch(`${API_BASE}/workitems/${workItemId}/feedback`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rating, feedback, categories }),
    });
    return handleResponse<FeedbackData>(response);
  },

  async getFeedback(workItemId: string): Promise<{
    myFeedback: FeedbackData | null;
    allFeedback: FeedbackData[];
  }> {
    const response = await fetch(`${API_BASE}/workitems/${workItemId}/feedback`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ myFeedback: FeedbackData | null; allFeedback: FeedbackData[] }>(response);
  },
};

// Preferences API
export const preferencesApi = {
  async list(projectId: string): Promise<TeamPreference[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/preferences`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<TeamPreference[]>(response);
  },

  async create(
    projectId: string,
    preference: string,
    description?: string,
    category?: string
  ): Promise<TeamPreference> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/preferences`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ preference, description, category }),
    });
    return handleResponse<TeamPreference>(response);
  },

  async update(projectId: string, preferenceId: string, active: boolean): Promise<TeamPreference> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/preferences/${preferenceId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ active }),
    });
    return handleResponse<TeamPreference>(response);
  },

  async delete(projectId: string, preferenceId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/preferences/${preferenceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new ApiError('Failed to delete preference', 'DELETE_FAILED', response.status);
    }
  },

  async extractFromFeedback(projectId: string): Promise<{
    extracted: number;
    preferences: ExtractedPreference[];
  }> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/preferences/extract`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ extracted: number; preferences: ExtractedPreference[] }>(response);
  },
};

// Project Types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  jiraProjectKey: string | null;
  specCount: number;
  workItemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetails extends Project {
  specs: Array<{
    id: string;
    name: string;
    status: string;
    uploadedAt: string;
  }>;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  jiraProjectKey?: string;
}

// Projects API
export const projectsApi = {
  async list(): Promise<Project[]> {
    const response = await fetch(`${API_BASE}/projects`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Project[]>(response);
  },

  async get(id: string): Promise<ProjectDetails> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ProjectDetails>(response);
  },

  async create(input: CreateProjectInput): Promise<Project> {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse<Project>(response);
  },

  async update(id: string, input: Partial<CreateProjectInput>): Promise<Project> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse<Project>(response);
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
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

// =============================================================================
// KNOWLEDGE BASE TYPES & API
// =============================================================================

export interface ProjectBrief {
  projectId: string;
  brief: string | null;
  briefUpdatedAt: string | null;
}

export interface GlossaryTerm {
  id: string;
  projectId: string;
  term: string;
  definition: string;
  aliases: string[];
  category: string | null;
  useInstead: string | null;
  avoidTerms: string[];
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlossaryTermInput {
  term: string;
  definition: string;
  aliases?: string[];
  category?: string;
  useInstead?: string;
  avoidTerms?: string[];
}

export interface ReferenceDocument {
  id: string;
  projectId: string;
  name: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  extractedText: string | null;
  summary: string | null;
  docType: 'architecture' | 'process' | 'technical' | 'business' | 'other';
  isActive: boolean;
  uploadedAt: string;
  uploadedBy: string;
}

export interface TeamPreferencesConfig {
  projectId: string;
  acFormat: 'gherkin' | 'bullets' | 'checklist' | 'numbered';
  requiredSections: string[];
  maxAcCount: number;
  verbosity: 'concise' | 'balanced' | 'detailed';
  technicalDepth: 'high_level' | 'moderate' | 'implementation';
  customPrefs: unknown[];
}

export const knowledgeApi = {
  // Project Brief
  async getBrief(projectId: string): Promise<ProjectBrief> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/knowledge/brief`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ProjectBrief>(response);
  },

  async updateBrief(projectId: string, brief: string): Promise<ProjectBrief> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/knowledge/brief`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ brief }),
    });
    return handleResponse<ProjectBrief>(response);
  },

  // Glossary
  async listGlossaryTerms(projectId: string, category?: string): Promise<GlossaryTerm[]> {
    const url = category
      ? `${API_BASE}/projects/${projectId}/glossary?category=${encodeURIComponent(category)}`
      : `${API_BASE}/projects/${projectId}/glossary`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse<GlossaryTerm[]>(response);
  },

  async createGlossaryTerm(projectId: string, input: CreateGlossaryTermInput): Promise<GlossaryTerm> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/glossary`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse<GlossaryTerm>(response);
  },

  async updateGlossaryTerm(projectId: string, termId: string, input: Partial<CreateGlossaryTermInput>): Promise<GlossaryTerm> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/glossary/${termId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse<GlossaryTerm>(response);
  },

  async deleteGlossaryTerm(projectId: string, termId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/glossary/${termId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Delete failed' } }));
      throw new ApiError(error.error?.message || 'Delete failed', 'DELETE_FAILED', response.status);
    }
  },

  async bulkImportGlossary(projectId: string, terms: CreateGlossaryTermInput[]): Promise<{ imported: number; skipped: number }> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/glossary/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ terms }),
    });
    return handleResponse<{ imported: number; skipped: number }>(response);
  },

  // Reference Documents
  async listReferenceDocuments(projectId: string): Promise<ReferenceDocument[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/reference-docs`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ReferenceDocument[]>(response);
  },

  async uploadReferenceDocument(projectId: string, file: File, name?: string, docType?: string): Promise<ReferenceDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (docType) formData.append('docType', docType);

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/projects/${projectId}/reference-docs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return handleResponse<ReferenceDocument>(response);
  },

  async updateReferenceDocument(projectId: string, docId: string, updates: { name?: string; docType?: string; isActive?: boolean }): Promise<ReferenceDocument> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/reference-docs/${docId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<ReferenceDocument>(response);
  },

  async deleteReferenceDocument(projectId: string, docId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/reference-docs/${docId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Delete failed' } }));
      throw new ApiError(error.error?.message || 'Delete failed', 'DELETE_FAILED', response.status);
    }
  },

  // Team Preferences Config
  async getPreferencesConfig(projectId: string): Promise<TeamPreferencesConfig> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/preferences-config`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<TeamPreferencesConfig>(response);
  },

  async updatePreferencesConfig(projectId: string, config: Partial<TeamPreferencesConfig>): Promise<TeamPreferencesConfig> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/preferences-config`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
    return handleResponse<TeamPreferencesConfig>(response);
  },

  // Context Building
  async getContext(projectId: string): Promise<{ context: string; tokenEstimate: number }> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/knowledge/context`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ context: string; tokenEstimate: number }>(response);
  },
};

// =============================================================================
// CONTEXT SOURCES TYPES & API
// =============================================================================

export type ContextSourceType = 'specs' | 'jira' | 'document' | 'confluence' | 'github';

export interface ContextSource {
  id: string;
  projectId: string;
  sourceType: ContextSourceType;
  name: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  lastSyncAt: string | null;
  lastError: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContextSearchResult {
  sourceType: ContextSourceType;
  sourceId: string;
  sourceName: string;
  content: string;
  heading?: string;
  relevance: number;
}

export const contextSourcesApi = {
  async list(projectId: string): Promise<ContextSource[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/context-sources`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ContextSource[]>(response);
  },

  async create(projectId: string, input: { sourceType: ContextSourceType; name: string; config?: Record<string, unknown> }): Promise<ContextSource> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/context-sources`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse<ContextSource>(response);
  },

  async update(projectId: string, sourceId: string, updates: { name?: string; isEnabled?: boolean }): Promise<ContextSource> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/context-sources/${sourceId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<ContextSource>(response);
  },

  async delete(projectId: string, sourceId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/context-sources/${sourceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Delete failed' } }));
      throw new ApiError(error.error?.message || 'Delete failed', 'DELETE_FAILED', response.status);
    }
  },

  async toggle(projectId: string, sourceId: string, isEnabled: boolean): Promise<ContextSource> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/context-sources/${sourceId}/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isEnabled }),
    });
    return handleResponse<ContextSource>(response);
  },

  async sync(projectId: string, sourceId: string): Promise<{ synced: number; message: string }> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/context-sources/${sourceId}/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ synced: number; message: string }>(response);
  },

  async search(projectId: string, query: string, options?: { sources?: ContextSourceType[]; limit?: number }): Promise<ContextSearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (options?.sources) params.append('sources', options.sources.join(','));
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${API_BASE}/projects/${projectId}/context-search?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ContextSearchResult[]>(response);
  },
};

// =============================================================================
// SMART CONTEXT BUILDER TYPES & API
// =============================================================================

export interface ContextSourceUsed {
  type: 'brief' | 'glossary' | 'preferences' | 'spec' | 'jira' | 'document';
  name: string;
  tokensUsed: number;
}

export interface ContextBuildResult {
  contextString: string;
  tokensUsed: number;
  sourcesUsed: ContextSourceUsed[];
  tokenBudget: number;
}

export const contextBuilderApi = {
  async preview(projectId: string, specContent: string, maxTokens?: number): Promise<ContextBuildResult> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/context/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ specContent, maxTokens }),
    });
    return handleResponse<ContextBuildResult>(response);
  },

  async build(projectId: string, specContent: string, maxTokens?: number): Promise<ContextBuildResult> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/context/build`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ specContent, maxTokens }),
    });
    return handleResponse<ContextBuildResult>(response);
  },
};

// =============================================================================
// LEARNING LOOP TYPES & API
// =============================================================================

export type EditField = 'title' | 'description' | 'acceptanceCriteria' | 'technicalNotes' | 'size' | 'priority';
export type EditType = 'addition' | 'removal' | 'modification' | 'complete';
export type SuggestionType = 'addToPreferences' | 'addToGlossary' | 'updateTemplate' | 'addRequiredSection';
export type PatternStatus = 'pending' | 'suggested' | 'accepted' | 'dismissed' | 'applied';

export interface StoryEdit {
  id: string;
  projectId: string;
  workItemId: string;
  field: EditField;
  beforeValue: string;
  afterValue: string;
  editType: EditType;
  specId: string;
  userId: string;
  createdAt: string;
}

export interface LearnedPattern {
  id: string;
  projectId: string;
  pattern: string;
  description: string;
  confidence: number;
  occurrences: number;
  field: EditField;
  context: string | null;
  suggestion: string;
  suggestionType: SuggestionType;
  status: PatternStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearningStats {
  totalEdits: number;
  editsThisWeek: number;
  patternsDetected: number;
  patternsApplied: number;
  topEditedFields: Array<{ field: string; count: number }>;
}

export const learningApi = {
  // Track an edit
  async trackEdit(workItemId: string, field: EditField, beforeValue: string, afterValue: string): Promise<StoryEdit> {
    const response = await fetch(`${API_BASE}/workitems/${workItemId}/edits`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ field, beforeValue, afterValue }),
    });
    return handleResponse<StoryEdit>(response);
  },

  // Get edits for a work item
  async getEditsForWorkItem(workItemId: string): Promise<StoryEdit[]> {
    const response = await fetch(`${API_BASE}/workitems/${workItemId}/edits`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<StoryEdit[]>(response);
  },

  // Get pending patterns for a project
  async getPendingPatterns(projectId: string): Promise<LearnedPattern[]> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/learning/patterns`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<LearnedPattern[]>(response);
  },

  // Accept a pattern
  async acceptPattern(projectId: string, patternId: string): Promise<LearnedPattern> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/learning/patterns/${patternId}/accept`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<LearnedPattern>(response);
  },

  // Dismiss a pattern
  async dismissPattern(projectId: string, patternId: string): Promise<LearnedPattern> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/learning/patterns/${patternId}/dismiss`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<LearnedPattern>(response);
  },

  // Get learning stats
  async getStats(projectId: string): Promise<LearningStats> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/learning/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<LearningStats>(response);
  },

  // Trigger pattern detection
  async detectPatterns(projectId: string): Promise<{ detected: number }> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/learning/detect`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ detected: number }>(response);
  },
};

// =============================================================================
// PROJECT HEALTH TYPES & API
// =============================================================================

export type HealthLevel = 'minimal' | 'basic' | 'good' | 'excellent';

export interface HealthComponent {
  name: string;
  weight: number;
  score: number;
  recommendation?: string;
}

export interface HealthResult {
  score: number;
  level: HealthLevel;
  components: HealthComponent[];
  recommendations: string[];
}

export const healthApi = {
  async getHealth(projectId: string): Promise<HealthResult> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/health`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<HealthResult>(response);
  },

  async recalculate(projectId: string): Promise<HealthResult> {
    const response = await fetch(`${API_BASE}/projects/${projectId}/health/recalculate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<HealthResult>(response);
  },
};
