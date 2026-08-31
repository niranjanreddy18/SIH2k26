import { del, get, patch, post, type Paginated } from "./api";
import type {
  AdminUser,
  AuditEvent,
  BlockchainRecord,
  BlockchainStatus,
  CaseAssignment,
  CaseDetail,
  CaseSummary,
  ChainStatus,
  Classification,
  CustodyEvent,
  DocumentDetail,
  DocumentItem,
  DocumentType,
  EvidenceItem,
  Role,
  SharedDocument,
  User,
  VerifyResult,
} from "@/lib/slidms/types";

/* ---------------------------------- Auth ---------------------------------- */

export const authService = {
  login: (email: string, password: string) =>
    post<{ accessToken: string; user: User }>("/auth/login", { email, password }),
  logout: () => post<{ message: string }>("/auth/logout"),
  refresh: () => post<{ accessToken: string; user: User }>("/auth/refresh"),
  me: () => get<User>("/auth/me"),
};

/* ---------------------------------- Cases --------------------------------- */

export const caseService = {
  list: (params?: { page?: number; limit?: number; status?: string; classification?: string }) =>
    get<Paginated<CaseSummary>>("/cases", params),
  create: (body: {
    firNumber: string;
    title: string;
    description?: string;
    crimeType?: string;
    classification: Classification;
  }) => post<CaseDetail>("/cases", body),
  detail: (id: string) => get<CaseDetail>(`/cases/${id}`),
  update: (id: string, body: { status?: string; title?: string; description?: string }) =>
    patch<CaseDetail>(`/cases/${id}`, body),
  assignments: (id: string) => get<CaseAssignment[]>(`/cases/${id}/assignments`),
  assign: (id: string, userId: string) => post<CaseAssignment>(`/cases/${id}/assignments`, { userId }),
  unassign: (id: string, userId: string) => del<unknown>(`/cases/${id}/assignments/${userId}`),
  audit: (id: string) => get<AuditEvent[]>(`/cases/${id}/audit`),
  shares: (id: string) => get<Paginated<SharedDocument>>(`/cases/${id}/shares`),
};

/* -------------------------------- Documents ------------------------------- */

export const documentService = {
  listForCase: (
    caseId: string,
    params?: { page?: number; limit?: number; type?: string; status?: string },
  ) => get<Paginated<DocumentItem>>(`/cases/${caseId}/documents`, params),
  create: (caseId: string, form: FormData) =>
    post<DocumentItem>(`/cases/${caseId}/documents`, form, true),
  detail: (id: string) => get<DocumentDetail>(`/documents/${id}`),
  createVersion: (id: string, form: FormData) => post<DocumentItem>(`/documents/${id}/versions`, form, true),
  verify: (id: string) => post<VerifyResult>(`/documents/${id}/verify`),
  submit: (id: string) => post<unknown>(`/documents/${id}/submit`),
  approve: (id: string, comment?: string) => post<unknown>(`/documents/${id}/approve`, { comment }),
  reject: (id: string, comment?: string) => post<unknown>(`/documents/${id}/reject`, { comment }),
  sign: (id: string) => post<unknown>(`/documents/${id}/sign`),
  lock: (id: string) => post<unknown>(`/documents/${id}/lock`),
  tamperDemo: (id: string) => post<{ success: boolean; message: string }>(`/documents/${id}/tamper-demo`),
  audit: (id: string) => get<AuditEvent[]>(`/documents/${id}/audit`),
  share: (
    id: string,
    body: { recipientId: string; canView: boolean; canDownload: boolean; expiresAt: string },
  ) => post<SharedDocument>(`/documents/${id}/share`, body),
  sharedWithMe: () => get<Paginated<SharedDocument>>("/documents/shared-with-me"),
  downloadPath: (id: string) => `/documents/${id}/download`,
  previewPath: (id: string) => `/documents/${id}/preview`,
  versionDownloadPath: (id: string, versionNo: number) =>
    `/documents/${id}/versions/${versionNo}/download`,
};

/* -------------------------------- Evidence -------------------------------- */

export const evidenceService = {
  list: (caseId: string) => get<Paginated<EvidenceItem>>(`/cases/${caseId}/evidence`),
  create: (caseId: string, body: { type: string; description: string; collectedAt: string }) =>
    post<EvidenceItem>(`/cases/${caseId}/evidence`, body),
  timeline: (id: string) =>
    get<{ evidenceId: string; items: CustodyEvent[] } | CustodyEvent[]>(`/evidence/${id}/timeline`),
  transfer: (id: string, body: { toUserId: string; reason: string }) =>
    post<unknown>(`/evidence/${id}/transfer`, body),
};

/* --------------------------------- Shares --------------------------------- */

export const shareService = {
  revoke: (id: string) => post<unknown>(`/shares/${id}/revoke`),
};

/* ---------------------------------- Audit --------------------------------- */

export const auditService = {
  verifyChain: () => get<ChainStatus>("/audit/verify-chain"),
};

/* ------------------------------- Blockchain ------------------------------- */

export const blockchainService = {
  records: (refId: string, refType = "DOCUMENT_VERSION") =>
    get<{ items: BlockchainRecord[] }>("/blockchain/records", { refId, refType }),
  status: () => get<BlockchainStatus>("/blockchain/status"),
  verify: (documentId: string) =>
    get<{ verified: boolean; registeredHash: string; blockchainRef: string }>(
      `/blockchain/verify/${documentId}`,
    ),
};

/* ---------------------------------- Admin --------------------------------- */

export const adminService = {
  users: (params?: { page?: number; limit?: number }) =>
    get<Paginated<AdminUser>>("/admin/users", params),
  createUser: (body: {
    name: string;
    email: string;
    password: string;
    role: Role;
    department: string;
  }) => post<AdminUser>("/admin/users", body),
  updateRole: (id: string, role: Role) => patch<AdminUser>(`/admin/users/${id}/role`, { role }),
  unlock: (id: string) => post<unknown>(`/admin/users/${id}/unlock`),
  audit: (params?: { page?: number; limit?: number }) =>
    get<Paginated<AuditEvent>>("/admin/audit", params),
};

/* ---------------------------------- Users --------------------------------- */

export const userService = {
  list: () => get<User[]>("/users"),
};

export const healthService = {
  check: () => get<{ status: string; system: string; blockchain: { connected: boolean } }>("/health"),
};

/* ---------------------------------- Search -------------------------------- */

export interface SearchResultItem {
  type: "case" | "document";
  id: string;
  title: string;
  snippet: string;
  caseId: string;
  firNumber: string;
  score: number;
}

export const searchService = {
  query: (q: string, limit = 10) =>
    get<{ query: string; items: SearchResultItem[] }>("/search", { q, limit }),
};


export type { DocumentType };
