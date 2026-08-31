export type Role = "INVESTIGATOR" | "SENIOR_OFFICER" | "FORENSIC_OFFICER" | "ADMIN";

export type Classification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "HIGHLY_CONFIDENTIAL";

export type CaseStatus =
  | "OPEN"
  | "UNDER_INVESTIGATION"
  | "UNDER_REVIEW"
  | "CHARGESHEET_PREPARED"
  | "COURT_SUBMITTED"
  | "CLOSED"
  | "ARCHIVED";

export type DocumentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SIGNED"
  | "LOCKED";

export type DocumentType =
  | "FIR"
  | "COMPLAINT"
  | "WITNESS_STATEMENT"
  | "INVESTIGATION_REPORT"
  | "FORENSIC_REPORT"
  | "MEDICAL_REPORT"
  | "SEIZURE_MEMO"
  | "ARREST_MEMO"
  | "CHARGE_SHEET"
  | "COURT_FILING"
  | "COURT_ORDER"
  | "LEGAL_NOTICE"
  | "JUDGMENT"
  | "EVIDENCE"
  | "OTHER";

export type EvidenceStatus =
  | "REGISTERED"
  | "COLLECTED"
  | "UPLOADED"
  | "STORED"
  | "TRANSFERRED"
  | "RECEIVED"
  | "ANALYZED"
  | "REPORT_GENERATED"
  | "SUBMITTED"
  | "ARCHIVED";

export const CLASSIFICATIONS: Classification[] = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "HIGHLY_CONFIDENTIAL",
];

export const CASE_STATUSES: CaseStatus[] = [
  "OPEN",
  "UNDER_INVESTIGATION",
  "UNDER_REVIEW",
  "CHARGESHEET_PREPARED",
  "COURT_SUBMITTED",
  "CLOSED",
  "ARCHIVED",
];

export const DOCUMENT_STATUSES: DocumentStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "SIGNED",
  "LOCKED",
];

export const DOCUMENT_TYPES: DocumentType[] = [
  "FIR",
  "COMPLAINT",
  "WITNESS_STATEMENT",
  "INVESTIGATION_REPORT",
  "FORENSIC_REPORT",
  "MEDICAL_REPORT",
  "SEIZURE_MEMO",
  "ARREST_MEMO",
  "CHARGE_SHEET",
  "COURT_FILING",
  "COURT_ORDER",
  "LEGAL_NOTICE",
  "JUDGMENT",
  "EVIDENCE",
  "OTHER",
];

export const ROLES: Role[] = ["INVESTIGATOR", "SENIOR_OFFICER", "FORENSIC_OFFICER", "ADMIN"];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
}

export interface AdminUser extends User {
  lastLoginAt?: string | null;
  isLocked: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
}

export interface CaseSummary {
  id: string;
  firNumber: string;
  title: string;
  status: CaseStatus;
  classification: Classification;
  createdBy: { id?: string; name: string };
  isOwner?: boolean;
  isAssigned?: boolean;
  documentCount?: number;
  evidenceCount?: number;
  pendingApprovals?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CaseDetail extends CaseSummary {
  description?: string;
  crimeType?: string;
  counts: {
    documents: number;
    evidence: number;
    pendingApprovals: number;
    auditEvents: number;
    sharedDocuments: number;
  };
}

export interface CaseAssignment {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  isCreator?: boolean;
}

export interface DocumentVersion {
  id: string;
  versionNo: number;
  hash: string;
  status: DocumentStatus;
  fileSize?: number;
  mimeType?: string;
  comment?: string;
  createdAt?: string;
  createdBy?: { name: string };
}

export interface DocumentItem {
  id: string;
  caseId?: string;
  name: string;
  type: DocumentType;
  classification: Classification;
  createdBy: { name: string };
  createdAt: string;
  case?: { id: string; firNumber: string };
  currentVersion: DocumentVersion;
}

export interface DocumentDetail extends DocumentItem {
  versionHistory: DocumentVersion[];
  blockchainRef?: string | null;
  signedBy?: { name: string } | null;
  verifiedAt?: string | null;
}

export interface VerifyResult {
  status: "VERIFIED" | "MISMATCH";
  registeredHash: string;
  currentHash: string;
  blockchainRef: string;
  verifiedAt: string;
}

export interface EvidenceItem {
  id: string;
  caseId?: string;
  type: string;
  description: string;
  status: EvidenceStatus;
  collectedBy: { id?: string; name: string };
  collectedAt: string;
  custodyEventCount?: number;
}

export interface CustodyEvent {
  id: string;
  action: string;
  reason?: string;
  hash: string;
  fromUser?: { name: string } | null;
  toUser: { name: string };
  createdAt: string;
}

export interface SharedDocument {
  shareId: string;
  canView: boolean;
  canDownload: boolean;
  expiresAt: string;
  status?: "ACTIVE" | "REVOKED" | "EXPIRED";
  sharedBy?: { name: string };
  document: { id: string; name: string; type: DocumentType; mimeType?: string; classification?: Classification };
  case: { id: string; firNumber: string };
}

export interface AuditEvent {
  id: string;
  action: string;
  actorId?: string;
  actorName: string;
  target?: string;
  result: "SUCCESS" | "FAILURE" | string;
  ipAddress?: string;
  eventHash: string;
  prevEventHash?: string | null;
  createdAt: string;
}

export interface ChainStatus {
  valid: boolean;
  chainLength: number;
  brokenAt: string | null;
}

export interface BlockchainStatus {
  connected: boolean;
  channel: string;
  chaincode: string;
  peer: string;
  mspId: string;
  organizations?: string[];
}

export interface BlockchainRecord {
  id: string;
  refType: string;
  refId: string;
  action: string;
  hash: string;
  prevHash?: string | null;
  txReference: string;
  createdAt: string;
}
