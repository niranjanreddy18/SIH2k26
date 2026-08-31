import type {
  AdminUser,
  AuditEvent,
  BlockchainRecord,
  BlockchainStatus,
  CaseAssignment,
  CaseDetail,
  CaseSummary,
  ChainStatus,
  CustodyEvent,
  DocumentDetail,
  DocumentItem,
  EvidenceItem,
  SharedDocument,
  User,
} from "./types";

const hash = (seed: string) => {
  let h = 0x811c9dc5;
  let out = "";
  for (let i = 0; i < 64; i++) {
    h ^= seed.charCodeAt((i + seed.length) % seed.length) + i * 31;
    h = (h * 16777619) >>> 0;
    out += (h % 16).toString(16);
  }
  return out;
};

const iso = (daysAgo: number, hours = 9) => {
  const d = new Date("2026-08-30T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hours, (daysAgo * 7) % 60, 0, 0);
  return d.toISOString();
};

export const DEMO_USERS: Record<string, User> = {
  investigator: {
    id: "u-1001",
    name: "Inspector Vikram Singh",
    email: "investigator@police.gov.in",
    role: "INVESTIGATOR",
    department: "Cyber Crime Cell",
  },
  senior: {
    id: "u-1002",
    name: "SP Meera Nair",
    email: "senior@police.gov.in",
    role: "SENIOR_OFFICER",
    department: "Crime Branch Directorate",
  },
  forensic: {
    id: "u-1003",
    name: "Dr. Ananya Roy",
    email: "forensic@lab.gov.in",
    role: "FORENSIC_OFFICER",
    department: "State Forensic Science Laboratory",
  },
  admin: {
    id: "u-1004",
    name: "Rajeev Menon",
    email: "admin@slidms.gov.in",
    role: "ADMIN",
    department: "IT & Systems Directorate",
  },
};

export const MOCK_USER: User = DEMO_USERS["investigator"]!;

export const MOCK_DIRECTORY: User[] = Object.values(DEMO_USERS).concat([
  {
    id: "u-1005",
    name: "SI Kabir Deshmukh",
    email: "kabir.deshmukh@police.gov.in",
    role: "INVESTIGATOR",
    department: "Economic Offences Wing",
  },
  {
    id: "u-1006",
    name: "ASI Priya Iyer",
    email: "priya.iyer@police.gov.in",
    role: "INVESTIGATOR",
    department: "Cyber Crime Cell",
  },
]);

export const MOCK_CASES: CaseSummary[] = [
  {
    id: "c-9042",
    firNumber: "FIR/2026/1124",
    title: "Cyber Fraud & Identity Theft",
    status: "UNDER_INVESTIGATION",
    classification: "CONFIDENTIAL",
    createdBy: { id: "u-1001", name: "Inspector Vikram Singh" },
    isOwner: true,
    isAssigned: true,
    documentCount: 12,
    evidenceCount: 5,
    pendingApprovals: 2,
    createdAt: iso(28),
    updatedAt: iso(0, 8),
  },
  {
    id: "c-0987",
    firNumber: "FIR/2026/0987",
    title: "Financial Data Breach",
    status: "UNDER_REVIEW",
    classification: "HIGHLY_CONFIDENTIAL",
    createdBy: { id: "u-1005", name: "SI Kabir Deshmukh" },
    isAssigned: true,
    documentCount: 9,
    evidenceCount: 4,
    pendingApprovals: 3,
    createdAt: iso(41),
    updatedAt: iso(1, 17),
  },
  {
    id: "c-0765",
    firNumber: "FIR/2026/0765",
    title: "Online Harassment Case",
    status: "OPEN",
    classification: "INTERNAL",
    createdBy: { id: "u-1006", name: "ASI Priya Iyer" },
    isAssigned: true,
    documentCount: 6,
    evidenceCount: 2,
    pendingApprovals: 0,
    createdAt: iso(12),
    updatedAt: iso(2, 11),
  },
  {
    id: "c-0654",
    firNumber: "FIR/2026/0654",
    title: "Ransomware Attack",
    status: "CHARGESHEET_PREPARED",
    classification: "CONFIDENTIAL",
    createdBy: { id: "u-1001", name: "Inspector Vikram Singh" },
    isOwner: true,
    isAssigned: true,
    documentCount: 18,
    evidenceCount: 7,
    pendingApprovals: 1,
    createdAt: iso(63),
    updatedAt: iso(3, 15),
  },
  {
    id: "c-0451",
    firNumber: "FIR/2026/0451",
    title: "Phishing & Scam Network",
    status: "COURT_SUBMITTED",
    classification: "PUBLIC",
    createdBy: { id: "u-1002", name: "SP Meera Nair" },
    documentCount: 21,
    evidenceCount: 9,
    pendingApprovals: 0,
    createdAt: iso(88),
    updatedAt: iso(5, 10),
  },
  {
    id: "c-0388",
    firNumber: "FIR/2026/0388",
    title: "Cryptocurrency Laundering Network",
    status: "UNDER_INVESTIGATION",
    classification: "HIGHLY_CONFIDENTIAL",
    createdBy: { id: "u-1005", name: "SI Kabir Deshmukh" },
    documentCount: 14,
    evidenceCount: 6,
    pendingApprovals: 2,
    createdAt: iso(97),
    updatedAt: iso(6, 13),
  },
];

export function mockCaseDetail(id: string): CaseDetail {
  const base = MOCK_CASES.find((c) => c.id === id) ?? MOCK_CASES[0]!;
  return {
    ...base,
    description:
      "Coordinated cyber intrusion targeting district treasury infrastructure. Multiple compromised endpoints identified; forensic imaging completed for three seized devices. Chargesheet preparation pending senior officer approval on forensic annexures.",
    crimeType: "Cyber Crime",
    counts: {
      documents: base.documentCount ?? 5,
      evidence: base.evidenceCount ?? 3,
      pendingApprovals: base.pendingApprovals ?? 1,
      auditEvents: 24,
      sharedDocuments: 2,
    },
  };
}

export const MOCK_ASSIGNMENTS: CaseAssignment[] = [
  {
    id: "u-1001",
    name: "Inspector Vikram Singh",
    email: "investigator@police.gov.in",
    role: "INVESTIGATOR",
    department: "Cyber Crime Cell",
    isCreator: true,
  },
  {
    id: "u-1002",
    name: "SP Meera Nair",
    email: "senior@police.gov.in",
    role: "SENIOR_OFFICER",
    department: "Crime Branch Directorate",
  },
  {
    id: "u-1003",
    name: "Dr. Ananya Roy",
    email: "forensic@police.gov.in",
    role: "FORENSIC_OFFICER",
    department: "State Forensic Science Laboratory",
  },
];

export const MOCK_DOCUMENTS: DocumentItem[] = [
  {
    id: "d-5001",
    caseId: "c-9042",
    name: "First Information Report — FIR/2026/1124",
    type: "FIR",
    classification: "INTERNAL",
    createdBy: { name: "Inspector Vikram Singh" },
    createdAt: iso(28),
    case: { id: "c-9042", firNumber: "FIR/2026/1124" },
    currentVersion: {
      id: "v-1",
      versionNo: 1,
      hash: hash("fir-1124"),
      status: "LOCKED",
      fileSize: 184320,
      mimeType: "application/pdf",
      createdAt: iso(28),
    },
  },
  {
    id: "d-5002",
    caseId: "c-9042",
    name: "Digital Forensics Examination Report",
    type: "FORENSIC_REPORT",
    classification: "CONFIDENTIAL",
    createdBy: { name: "Dr. Ananya Roy" },
    createdAt: iso(9),
    case: { id: "c-9042", firNumber: "FIR/2026/1124" },
    currentVersion: {
      id: "v-2",
      versionNo: 3,
      hash: hash("forensic-report"),
      status: "SIGNED",
      fileSize: 942080,
      mimeType: "application/pdf",
      createdAt: iso(2),
    },
  },
  {
    id: "d-5003",
    caseId: "c-0987",
    name: "Bank Transaction Trail Analysis",
    type: "INVESTIGATION_REPORT",
    classification: "HIGHLY_CONFIDENTIAL",
    createdBy: { name: "SI Kabir Deshmukh" },
    createdAt: iso(15),
    case: { id: "c-0987", firNumber: "FIR/2026/0987" },
    currentVersion: {
      id: "v-3",
      versionNo: 2,
      hash: hash("bank-trail"),
      status: "UNDER_REVIEW",
      fileSize: 512000,
      mimeType: "application/pdf",
      createdAt: iso(1),
    },
  },
  {
    id: "d-5004",
    caseId: "c-0765",
    name: "Complainant Witness Statement — Annexure B",
    type: "WITNESS_STATEMENT",
    classification: "INTERNAL",
    createdBy: { name: "ASI Priya Iyer" },
    createdAt: iso(11),
    case: { id: "c-0765", firNumber: "FIR/2026/0765" },
    currentVersion: {
      id: "v-4",
      versionNo: 1,
      hash: hash("witness-b"),
      status: "SUBMITTED",
      fileSize: 96256,
      mimeType: "application/pdf",
      createdAt: iso(11),
    },
  },
  {
    id: "d-5005",
    caseId: "c-0654",
    name: "Seizure Memo — Encrypted Storage Devices",
    type: "SEIZURE_MEMO",
    classification: "CONFIDENTIAL",
    createdBy: { name: "Inspector Vikram Singh" },
    createdAt: iso(30),
    case: { id: "c-0654", firNumber: "FIR/2026/0654" },
    currentVersion: {
      id: "v-5",
      versionNo: 2,
      hash: hash("seizure-memo"),
      status: "APPROVED",
      fileSize: 143360,
      mimeType: "application/pdf",
      createdAt: iso(4),
    },
  },
  {
    id: "d-5006",
    caseId: "c-0654",
    name: "Draft Chargesheet — Section 66C/66D IT Act",
    type: "CHARGE_SHEET",
    classification: "HIGHLY_CONFIDENTIAL",
    createdBy: { name: "Inspector Vikram Singh" },
    createdAt: iso(6),
    case: { id: "c-0654", firNumber: "FIR/2026/0654" },
    currentVersion: {
      id: "v-6",
      versionNo: 4,
      hash: hash("chargesheet"),
      status: "DRAFT",
      fileSize: 331776,
      mimeType: "application/pdf",
      createdAt: iso(0, 8),
    },
  },
  {
    id: "d-5007",
    caseId: "c-0451",
    name: "Court Filing — Special Cyber Court, Bengaluru",
    type: "COURT_FILING",
    classification: "PUBLIC",
    createdBy: { name: "SP Meera Nair" },
    createdAt: iso(20),
    case: { id: "c-0451", firNumber: "FIR/2026/0451" },
    currentVersion: {
      id: "v-7",
      versionNo: 1,
      hash: hash("court-filing"),
      status: "LOCKED",
      fileSize: 655360,
      mimeType: "application/pdf",
      createdAt: iso(20),
    },
  },
  {
    id: "d-5008",
    caseId: "c-0987",
    name: "Medico-Legal Opinion — Annexure D",
    type: "MEDICAL_REPORT",
    classification: "CONFIDENTIAL",
    createdBy: { name: "Dr. Ananya Roy" },
    createdAt: iso(8),
    case: { id: "c-0987", firNumber: "FIR/2026/0987" },
    currentVersion: {
      id: "v-8",
      versionNo: 1,
      hash: hash("medico-legal"),
      status: "REJECTED",
      fileSize: 204800,
      mimeType: "application/pdf",
      createdAt: iso(8),
    },
  },
];

export function mockDocumentDetail(id: string): DocumentDetail {
  const base = MOCK_DOCUMENTS.find((d) => d.id === id) ?? MOCK_DOCUMENTS[1]!;
  const versions: DocumentDetail["versionHistory"] = Array.from(
    { length: base.currentVersion.versionNo },
    (_, i) => {
      const versionNo = base.currentVersion.versionNo - i;
      return {
        id: `${base.id}-v${versionNo}`,
        versionNo,
        hash: versionNo === base.currentVersion.versionNo ? base.currentVersion.hash : hash(`${base.id}-${versionNo}`),
        status: versionNo === base.currentVersion.versionNo ? base.currentVersion.status : "APPROVED",
        fileSize: (base.currentVersion.fileSize ?? 204800) - i * 8192,
        mimeType: "application/pdf",
        comment:
          versionNo === 1
            ? "Initial upload"
            : "Revised annexure after forensic lab clarification",
        createdAt: iso(2 + i * 5),
        createdBy: { name: base.createdBy.name },
      };
    },
  );
  return {
    ...base,
    versionHistory: versions,
    blockchainRef: "FALLBACK-lmno1234",
    signedBy: base.currentVersion.status === "SIGNED" || base.currentVersion.status === "LOCKED"
      ? { name: "SP Meera Nair" }
      : null,
    verifiedAt: iso(0, 7),
  };
}

export const MOCK_EVIDENCE: EvidenceItem[] = [
  {
    id: "e-3001",
    caseId: "c-9042",
    type: "Digital — Laptop",
    description: "Dell Latitude 5420 seized from primary accused residence, SSD imaged (E01)",
    status: "ANALYZED",
    collectedBy: { name: "Inspector Vikram Singh" },
    collectedAt: iso(25, 14),
    custodyEventCount: 5,
  },
  {
    id: "e-3002",
    caseId: "c-9042",
    type: "Digital — Mobile Handset",
    description: "Samsung Galaxy A54, IMEI 3568***12, extraction via UFED completed",
    status: "REPORT_GENERATED",
    collectedBy: { name: "ASI Priya Iyer" },
    collectedAt: iso(24, 11),
    custodyEventCount: 4,
  },
  {
    id: "e-3003",
    caseId: "c-0987",
    type: "Documentary — Bank Records",
    description: "Certified statements for 7 accounts, obtained under Section 91 CrPC",
    status: "STORED",
    collectedBy: { name: "SI Kabir Deshmukh" },
    collectedAt: iso(18, 10),
    custodyEventCount: 3,
  },
  {
    id: "e-3004",
    caseId: "c-0654",
    type: "Digital — Encrypted Drive",
    description: "2TB external SSD, AES-256 protected, decryption pending court order",
    status: "TRANSFERRED",
    collectedBy: { name: "Inspector Vikram Singh" },
    collectedAt: iso(30, 16),
    custodyEventCount: 6,
  },
  {
    id: "e-3005",
    caseId: "c-0451",
    type: "Digital — Server Logs",
    description: "Hosting provider access logs, 14-day window, hash-sealed on collection",
    status: "SUBMITTED",
    collectedBy: { name: "Dr. Ananya Roy" },
    collectedAt: iso(40, 9),
    custodyEventCount: 4,
  },
];

export const MOCK_CUSTODY: CustodyEvent[] = [
  {
    id: "cu-1",
    action: "COLLECTED",
    reason: "Seized at scene under Seizure Memo SM/2026/214",
    hash: hash("custody-1"),
    fromUser: null,
    toUser: { name: "Inspector Vikram Singh" },
    createdAt: iso(25, 14),
  },
  {
    id: "cu-2",
    action: "STORED",
    reason: "Deposited in Cyber Cell evidence locker B-12",
    hash: hash("custody-2"),
    fromUser: { name: "Inspector Vikram Singh" },
    toUser: { name: "ASI Priya Iyer" },
    createdAt: iso(24, 10),
  },
  {
    id: "cu-3",
    action: "TRANSFERRED",
    reason: "Sending for forensic analysis",
    hash: hash("custody-3"),
    fromUser: { name: "ASI Priya Iyer" },
    toUser: { name: "Dr. Ananya Roy" },
    createdAt: iso(20, 12),
  },
  {
    id: "cu-4",
    action: "ANALYZED",
    reason: "Disk imaging and artefact extraction completed",
    hash: hash("custody-4"),
    fromUser: { name: "Dr. Ananya Roy" },
    toUser: { name: "Dr. Ananya Roy" },
    createdAt: iso(9, 15),
  },
  {
    id: "cu-5",
    action: "RECEIVED",
    reason: "Returned to investigating officer with report annexure",
    hash: hash("custody-5"),
    fromUser: { name: "Dr. Ananya Roy" },
    toUser: { name: "Inspector Vikram Singh" },
    createdAt: iso(6, 11),
  },
];

export const MOCK_SHARES: SharedDocument[] = [
  {
    shareId: "s-7001",
    canView: true,
    canDownload: false,
    expiresAt: iso(-16),
    status: "ACTIVE",
    sharedBy: { name: "SP Meera Nair" },
    document: { id: "d-5002", name: "Digital Forensics Examination Report", type: "FORENSIC_REPORT", mimeType: "application/pdf" },
    case: { id: "c-9042", firNumber: "FIR/2026/1124" },
  },
  {
    shareId: "s-7002",
    canView: true,
    canDownload: true,
    expiresAt: iso(-3),
    status: "ACTIVE",
    sharedBy: { name: "Inspector Vikram Singh" },
    document: { id: "d-5005", name: "Seizure Memo — Encrypted Storage Devices", type: "SEIZURE_MEMO", mimeType: "application/pdf" },
    case: { id: "c-0654", firNumber: "FIR/2026/0654" },
  },
  {
    shareId: "s-7003",
    canView: true,
    canDownload: false,
    expiresAt: iso(4),
    status: "EXPIRED",
    sharedBy: { name: "SI Kabir Deshmukh" },
    document: { id: "d-5003", name: "Bank Transaction Trail Analysis", type: "INVESTIGATION_REPORT", mimeType: "application/pdf" },
    case: { id: "c-0987", firNumber: "FIR/2026/0987" },
  },
  {
    shareId: "s-7004",
    canView: false,
    canDownload: false,
    expiresAt: iso(-30),
    status: "REVOKED",
    sharedBy: { name: "Rajeev Menon" },
    document: { id: "d-5007", name: "Court Filing — Special Cyber Court, Bengaluru", type: "COURT_FILING", mimeType: "application/pdf" },
    case: { id: "c-0451", firNumber: "FIR/2026/0451" },
  },
];

const AUDIT_ACTIONS: Array<[string, string, string]> = [
  ["DOCUMENT_VERIFIED", "Digital Forensics Examination Report", "SUCCESS"],
  ["DOCUMENT_SIGNED", "Digital Forensics Examination Report v3", "SUCCESS"],
  ["DOCUMENT_APPROVED", "Seizure Memo — Encrypted Storage Devices", "SUCCESS"],
  ["VERSION_CREATED", "Draft Chargesheet v4", "SUCCESS"],
  ["DOCUMENT_SHARED", "Bank Transaction Trail Analysis", "SUCCESS"],
  ["LOGIN", "investigator@police.gov.in", "SUCCESS"],
  ["DOCUMENT_REJECTED", "Medico-Legal Opinion — Annexure D", "SUCCESS"],
  ["EVIDENCE_TRANSFERRED", "Digital — Encrypted Drive", "SUCCESS"],
  ["LOGIN", "unknown@external.net", "FAILURE"],
  ["DOCUMENT_LOCKED", "First Information Report — FIR/2026/1124", "SUCCESS"],
  ["CASE_CREATED", "FIR/2026/1124", "SUCCESS"],
  ["ACCESS_DENIED", "Draft Chargesheet v4", "FAILURE"],
];

const ACTORS = [
  "Inspector Vikram Singh",
  "SP Meera Nair",
  "Dr. Ananya Roy",
  "SI Kabir Deshmukh",
  "Rajeev Menon",
];

export const MOCK_AUDIT: AuditEvent[] = Array.from({ length: 24 }, (_, i) => {
  const [action, target, result] = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length]!;
  return {
    id: `a-${9000 - i}`,
    action,
    actorName: ACTORS[i % ACTORS.length]!,
    target,
    result,
    ipAddress: `10.24.${8 + (i % 5)}.${41 + i}`,
    eventHash: hash(`audit-${i}`),
    prevEventHash: i === 23 ? null : hash(`audit-${i + 1}`),
    createdAt: iso(Math.floor(i / 3), 18 - (i % 9)),
  };
});

export const MOCK_CHAIN: ChainStatus = { valid: true, chainLength: 42, brokenAt: null };

export const MOCK_BLOCKCHAIN_STATUS: BlockchainStatus = {
  connected: false,
  channel: "slidms-channel",
  chaincode: "slidms-cc",
  peer: "localhost:7051",
  mspId: "PoliceDeptMSP",
  organizations: ["PoliceDeptMSP", "ForensicLabMSP", "JudiciaryMSP"],
};

export const MOCK_BLOCKCHAIN_RECORDS: BlockchainRecord[] = Array.from({ length: 4 }, (_, i) => ({
  id: `b-${i + 1}`,
  refType: "DOCUMENT_VERSION",
  refId: "d-5002",
  action: i === 0 ? "REGISTERED" : i === 1 ? "APPROVED" : i === 2 ? "SIGNED" : "VERIFIED",
  hash: hash(`chain-${i}`),
  prevHash: i === 0 ? null : hash(`chain-${i - 1}`),
  txReference: `FALLBACK-lmno12${30 + i}`,
  createdAt: iso(10 - i * 3),
}));

export const MOCK_ADMIN_USERS: AdminUser[] = [
  { ...DEMO_USERS["investigator"]!, isLocked: false, failedLoginAttempts: 0, lockedUntil: null, createdAt: iso(400) },
  { ...DEMO_USERS["senior"]!, isLocked: false, failedLoginAttempts: 1, lockedUntil: null, createdAt: iso(620) },
  { ...DEMO_USERS["forensic"]!, isLocked: false, failedLoginAttempts: 0, lockedUntil: null, createdAt: iso(310) },
  { ...DEMO_USERS["admin"]!, isLocked: false, failedLoginAttempts: 0, lockedUntil: null, createdAt: iso(900) },
  {
    id: "u-1005",
    name: "SI Kabir Deshmukh",
    email: "kabir.deshmukh@police.gov.in",
    role: "INVESTIGATOR",
    department: "Economic Offences Wing",
    isLocked: true,
    failedLoginAttempts: 5,
    lockedUntil: iso(-1, 12),
    createdAt: iso(120),
  },
  {
    id: "u-1006",
    name: "ASI Priya Iyer",
    email: "priya.iyer@police.gov.in",
    role: "INVESTIGATOR",
    department: "Cyber Crime Cell",
    isLocked: false,
    failedLoginAttempts: 2,
    lockedUntil: null,
    createdAt: iso(75),
  },
];

export const mockHash = hash;
