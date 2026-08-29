// SLIDMS Type Definitions matching API Contract

export type UserRole = 'INVESTIGATOR' | 'SENIOR_OFFICER' | 'FORENSIC_OFFICER' | 'ADMIN';

export type CaseStatus = 
  | 'OPEN' 
  | 'UNDER_INVESTIGATION' 
  | 'UNDER_REVIEW' 
  | 'CHARGESHEET_PREPARED' 
  | 'COURT_SUBMITTED' 
  | 'CLOSED' 
  | 'ARCHIVED';

export type ClassificationTier = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'HIGHLY_CONFIDENTIAL';

export type DocumentType = 
  | 'FIR' 
  | 'COMPLAINT' 
  | 'WITNESS_STATEMENT' 
  | 'INVESTIGATION_REPORT' 
  | 'FORENSIC_REPORT' 
  | 'MEDICAL_REPORT' 
  | 'SEIZURE_MEMO' 
  | 'ARREST_MEMO' 
  | 'CHARGE_SHEET' 
  | 'COURT_FILING' 
  | 'COURT_ORDER' 
  | 'LEGAL_NOTICE' 
  | 'JUDGMENT' 
  | 'EVIDENCE' 
  | 'OTHER';

export type VersionStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'REJECTED' 
  | 'APPROVED' 
  | 'SIGNED' 
  | 'LOCKED' 
  | 'ARCHIVED';

export type ApprovalDecision = 'APPROVED' | 'REJECTED';

export type EvidenceStatus = 
  | 'REGISTERED' 
  | 'COLLECTED' 
  | 'UPLOADED' 
  | 'STORED' 
  | 'TRANSFERRED' 
  | 'RECEIVED' 
  | 'ANALYZED' 
  | 'REPORT_GENERATED' 
  | 'SUBMITTED' 
  | 'ARCHIVED';

export type AuditResult = 'SUCCESS' | 'FAILURE';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  department: string | null;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface Case {
  id: string;
  firNumber: string;
  title: string;
  description: string | null;
  crimeType: string | null;
  status: CaseStatus;
  classification: ClassificationTier;
  createdBy: { id: string; name: string } | string;
  createdAt: string;
  updatedAt: string;
  counts?: {
    documents: number;
    evidence: number;
    pendingApprovals: number;
    auditEvents: number;
    sharedDocuments: number;
  };
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNo: number;
  hash: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  status: VersionStatus;
  comment?: string | null;
  createdBy: { id: string; name: string } | string;
  createdAt: string;
}

export interface Document {
  id: string;
  caseId: string;
  name: string;
  type: DocumentType;
  classification: ClassificationTier;
  currentVersion?: DocumentVersion;
  versionHistory?: Partial<DocumentVersion>[];
  createdBy?: { id: string; name: string } | string;
  createdAt: string;
}

export interface Approval {
  id: string;
  documentVersionId: string;
  reviewerId: string;
  decision: ApprovalDecision;
  comment: string | null;
  createdAt: string;
}

export interface Signature {
  id: string;
  documentVersionId: string;
  signerId: string;
  hash: string;
  reference: string;
  createdAt: string;
}

export interface Evidence {
  id: string;
  caseId: string;
  type: string;
  description: string | null;
  status: EvidenceStatus;
  collectedBy: { id: string; name: string } | string;
  collectedAt: string;
}

export interface EvidenceCustodyEvent {
  id: string;
  evidenceId: string;
  from?: { id: string; name: string } | null;
  to: { id: string; name: string };
  action: string;
  reason?: string | null;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actor: { id: string; name: string };
  action: string;
  targetType?: string;
  targetId?: string;
  result: AuditResult;
  createdAt: string;
}

export interface Share {
  id: string;
  documentVersionId: string;
  recipientId: string;
  canView: boolean;
  canDownload: boolean;
  expiresAt: string;
  revokedAt?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface BlockchainRecord {
  id: string;
  refType: 'DOCUMENT_VERSION' | 'EVIDENCE' | string;
  refId: string;
  action: string;
  hash: string;
  txReference: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedData<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

