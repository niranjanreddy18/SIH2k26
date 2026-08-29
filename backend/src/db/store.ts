import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  User, Case, Document, DocumentVersion, Approval, 
  Signature, Evidence, EvidenceCustodyEvent, AuditEvent, 
  Share, BlockchainRecord 
} from '../types';
import { CryptoService } from '../services/crypto.service';
import { StorageService } from '../services/storage.service';

export class Store {
  public users: User[] = [];
  public cases: Case[] = [];
  public caseAssignments: { id: string; caseId: string; userId: string }[] = [];
  public documents: Document[] = [];
  public documentVersions: DocumentVersion[] = [];
  public approvals: Approval[] = [];
  public signatures: Signature[] = [];
  public evidence: Evidence[] = [];
  public evidenceCustodyEvents: EvidenceCustodyEvent[] = [];
  public auditEvents: AuditEvent[] = [];
  public shares: Share[] = [];
  public blockchainRecords: BlockchainRecord[] = [];

  private static instance: Store;

  private constructor() {
    this.seedInitialData();
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }

  private seedInitialData(): void {
    const passwordHash = bcrypt.hashSync('Password123!', 10);

    // 1. Users
    const u1: User = {
      id: 'usr-inv-1111-1111-111111111111',
      name: 'Inspector Vikram Singh',
      email: 'investigator@police.gov.in',
      passwordHash,
      role: 'INVESTIGATOR',
      department: 'Cyber Crime Cell',
      mfaEnabled: true,
      createdAt: '2026-08-01T10:00:00Z'
    };

    const u2: User = {
      id: 'usr-snr-2222-2222-222222222222',
      name: 'ACP Rajeshwar Sharma',
      email: 'senior@police.gov.in',
      passwordHash,
      role: 'SENIOR_OFFICER',
      department: 'Special Branch',
      mfaEnabled: true,
      createdAt: '2026-08-01T10:00:00Z'
    };

    const u3: User = {
      id: 'usr-for-3333-3333-333333333333',
      name: 'Dr. Ananya Roy',
      email: 'forensic@lab.gov.in',
      passwordHash,
      role: 'FORENSIC_OFFICER',
      department: 'Central Forensic Science Laboratory',
      mfaEnabled: false,
      createdAt: '2026-08-01T10:00:00Z'
    };

    const u4: User = {
      id: 'usr-adm-4444-4444-444444444444',
      name: 'Admin Desk Officer',
      email: 'admin@slidms.gov.in',
      passwordHash,
      role: 'ADMIN',
      department: 'IT & Cyber Security Directorate',
      mfaEnabled: true,
      createdAt: '2026-08-01T10:00:00Z'
    };

    this.users.push(u1, u2, u3, u4);

    // 2. Cases
    const c1: Case = {
      id: 'case-9042-1111-1111-111111111111',
      firNumber: 'FIR-2026-9042',
      title: 'Cyber Infrastructure Security Breach & Financial Heist',
      description: 'Unauthorized access into state data repository resulting in encryption of sensitive investigation logs.',
      crimeType: 'Cyber Crime & Financial Fraud',
      status: 'UNDER_INVESTIGATION',
      classification: 'CONFIDENTIAL',
      createdBy: { id: u1.id, name: u1.name },
      createdAt: '2026-08-10T14:30:00Z',
      updatedAt: '2026-08-29T10:00:00Z',
      counts: {
        documents: 3,
        evidence: 2,
        pendingApprovals: 1,
        auditEvents: 12,
        sharedDocuments: 1
      }
    };

    const c2: Case = {
      id: 'case-1029-2222-2222-222222222222',
      firNumber: 'FIR-2026-1029',
      title: 'Illegal Ordnance Procurement Network',
      description: 'Interstate trafficking of illegal weapons and counterfeit documentation.',
      crimeType: 'Arms Act & Smuggling',
      status: 'OPEN',
      classification: 'INTERNAL',
      createdBy: { id: u1.id, name: u1.name },
      createdAt: '2026-08-15T09:15:00Z',
      updatedAt: '2026-08-20T11:00:00Z',
      counts: {
        documents: 1,
        evidence: 1,
        pendingApprovals: 0,
        auditEvents: 4,
        sharedDocuments: 0
      }
    };

    this.cases.push(c1, c2);

    // 3. Initial Sample Document & Version
    const docId1 = 'doc-1111-1111-1111-111111111111';
    const versionId1 = 'ver-1111-1111-1111-111111111111';
    const sampleContent = 'SLIDMS Official Witness Statement Content - FIR 2026-9042. Witness: Key Informant Alpha.';
    const initialHash = CryptoService.calculateStringHash(sampleContent);
    const storageKey1 = 'doc_sample_witness_statement.txt';

    // Persist file sample content
    StorageService.saveFile(Buffer.from(sampleContent, 'utf8'), 'witness_statement.txt').then(res => {
      // Overwrite storageKey to predictable sample key
    });

    const v1: DocumentVersion = {
      id: versionId1,
      documentId: docId1,
      versionNo: 1,
      hash: initialHash,
      storageKey: storageKey1,
      fileSize: Buffer.byteLength(sampleContent),
      mimeType: 'text/plain',
      status: 'SIGNED',
      comment: 'Initial statement recorded and verified by lead investigator.',
      createdBy: { id: u1.id, name: u1.name },
      createdAt: '2026-08-11T09:00:00Z'
    };

    const d1: Document = {
      id: docId1,
      caseId: c1.id,
      name: 'Primary Witness Statement - Informant Alpha',
      type: 'WITNESS_STATEMENT',
      classification: 'CONFIDENTIAL',
      currentVersion: v1,
      versionHistory: [{ versionNo: 1, status: 'SIGNED', createdAt: '2026-08-11T09:00:00Z' }],
      createdBy: { id: u1.id, name: u1.name },
      createdAt: '2026-08-11T09:00:00Z'
    };

    this.documentVersions.push(v1);
    this.documents.push(d1);

    // 4. Initial Blockchain Record for Signed Document
    const bcRecord: BlockchainRecord = {
      id: 'bc-1111-1111-1111-111111111111',
      refType: 'DOCUMENT_VERSION',
      refId: versionId1,
      action: 'DOCUMENT_LOCKED',
      hash: initialHash,
      txReference: 'TX-839201',
      createdAt: '2026-08-11T09:30:00Z'
    };
    this.blockchainRecords.push(bcRecord);

    // 5. Initial Evidence Item & Custody Event
    const ev1: Evidence = {
      id: 'ev-1111-1111-1111-111111111111',
      caseId: c1.id,
      type: 'Encrypted Solid State Drive (SSD 1TB)',
      description: 'Extracted from primary command console at crime scene. Serial #SSD-99482.',
      status: 'ANALYZED',
      collectedBy: { id: u1.id, name: u1.name },
      collectedAt: '2026-08-10T16:00:00Z'
    };
    this.evidence.push(ev1);

    const custodyEvent: EvidenceCustodyEvent = {
      id: 'cust-1111-1111-1111-111111111111',
      evidenceId: ev1.id,
      from: { id: u1.id, name: u1.name },
      to: { id: u3.id, name: u3.name },
      action: 'TRANSFERRED',
      reason: 'Forensic extraction & disk image recovery.',
      createdAt: '2026-08-11T11:00:00Z'
    };
    this.evidenceCustodyEvents.push(custodyEvent);

    // 6. Genesis Audit Event & Seed Audit Events
    const prevHash = CryptoService.GENESIS_HASH;
    const timestamp = '2026-08-10T14:30:00Z';
    const genesisHash = CryptoService.computeAuditEventHash(
      u1.id,
      'CASE_CREATED',
      c1.id,
      timestamp,
      prevHash
    );

    const audit1: AuditEvent = {
      id: 'audit-1111-1111-1111-111111111111',
      actor: { id: u1.id, name: u1.name },
      action: 'CASE_CREATED',
      targetType: 'CASE',
      targetId: c1.id,
      result: 'SUCCESS',
      createdAt: timestamp
    };
    this.auditEvents.push(audit1);
  }

  /**
   * Helper to log tamper-evident Audit Event in store
   */
  public logAuditEvent(
    actorId: string,
    actorName: string,
    action: string,
    targetType: 'DOCUMENT' | 'CASE' | 'EVIDENCE' | 'USER',
    targetId: string,
    result: 'SUCCESS' | 'FAILURE' = 'SUCCESS'
  ): AuditEvent {
    const timestamp = new Date().toISOString();
    const lastEvent = this.auditEvents[this.auditEvents.length - 1];
    const prevEventHash = lastEvent ? CryptoService.calculateStringHash(JSON.stringify(lastEvent)) : CryptoService.GENESIS_HASH;
    const eventHash = CryptoService.computeAuditEventHash(actorId, action, targetId, timestamp, prevEventHash);

    const newAudit: AuditEvent = {
      id: uuidv4(),
      actor: { id: actorId, name: actorName },
      action,
      targetType,
      targetId,
      result,
      createdAt: timestamp
    };

    this.auditEvents.push(newAudit);
    return newAudit;
  }
}

