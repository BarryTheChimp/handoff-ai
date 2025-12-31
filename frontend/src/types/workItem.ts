// Work item types matching backend Prisma schema

export type WorkItemType = 'epic' | 'feature' | 'story';
export type WorkItemStatus = 'draft' | 'ready_for_review' | 'approved' | 'exported';
export type SizeEstimate = 'XS' | 'S' | 'M' | 'L' | 'XL';

export interface WorkItem {
  id: string;
  specId: string;
  parentId: string | null;
  type: WorkItemType;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  technicalNotes: string | null;
  sizeEstimate: SizeEstimate | null;
  status: WorkItemStatus;
  orderIndex: number;
  jiraKey: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated relations
  children?: WorkItem[];
  sources?: WorkItemSource[];
}

export interface WorkItemSource {
  workItemId: string;
  sectionId: string;
  relevanceScore: number;
  section?: {
    sectionRef: string;
    heading: string;
  };
}

export interface SpecSection {
  id: string;
  specId: string;
  sectionRef: string;
  heading: string;
  content: string;
  orderIndex: number;
}

export interface Spec {
  id: string;
  projectId: string;
  name: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  extractedText: string | null;
  status: 'uploaded' | 'extracting' | 'ready' | 'translating' | 'translated' | 'error';
  specType: string;
  uploadedBy: string;
  uploadedAt: string;
  metadata: Record<string, unknown>;
  errorMessage: string | null;
}
