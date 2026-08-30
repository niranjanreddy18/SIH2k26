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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
}

export interface AdminUser extends User {
  mfaEnabled?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  isLocked?: boolean;
  createdAt?: string;
}

export interface Case {
  id: string;
  firNumber: string;
  title: string;
  description: string | null;
  crimeType: string | null;
  status: CaseStatus;
  classification: ClassificationTier;
  createdBy?: { id: string; name: string } | string;
  createdAt: string;
  updatedAt?: string;
  documentCount?: number;
  evidenceCount?: number;
  pendingApprovals?: number;
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
  versionNo: number;
  hash: string;
  status: VersionStatus;
  fileSize?: number;
  mimeType?: string;
  comment?: string | null;
  blockchainRef?: string | null;
  createdBy?: { id: string; name: string } | string;
  createdAt: string;
}

export interface Document {
  id: string;
  caseId: string;
  name: string;
  type: DocumentType;
  classification: ClassificationTier;
  currentVersion?: DocumentVersion;
  createdBy?: { id: string; name: string } | string;
  createdAt?: string;
  versionHistory?: { versionNo: number; status: VersionStatus; createdAt: string }[];
}

export interface EvidenceCustodyEvent {
  id?: string;
  action: string;
  from?: { id: string; name: string } | null;
  to: { id: string; name: string };
  reason?: string | null;
  createdAt: string;
}

export interface Evidence {
  id: string;
  caseId: string;
  type: string;
  description: string | null;
  status: string;
  collectedBy: { id: string; name: string } | string;
  collectedAt: string;
  custodyEventCount?: number;
}

export interface AuditEvent {
  id: string;
  actor: { id: string; name: string; email?: string; role?: string };
  action: string;
  targetType?: string;
  targetId?: string;
  result: 'SUCCESS' | 'FAILURE';
  eventHash?: string;
  prevEventHash?: string;
  createdAt: string;
}

export interface VerificationResult {
  status: 'VERIFIED' | 'MISMATCH';
  registeredHash: string;
  currentHash: string | null;
  blockchainRef: string | null;
  verifiedAt: string;
  error?: string;
}

export interface BlockchainRecord {
  id: string;
  refType: string;
  refId: string;
  versionNo?: number;
  action: string;
  hash: string;
  prevHash: string;
  txReference: string;
  createdAt: string;
  source?: 'FABRIC' | 'POSTGRESQL';
}

export interface ShareItem {
  shareId: string;
  canView: boolean;
  canDownload: boolean;
  expiresAt: string;
  createdAt: string;
  document: {
    id: string;
    name: string;
    type?: DocumentType;
  };
  case: {
    id: string;
    firNumber: string;
  };
}

export interface AuditVerifyChainResult {
  status: 'CHAIN_INTACT' | 'CHAIN_BROKEN';
  totalEvents: number;
  brokenAt: string | null;
  verifiedAt: string;
}
