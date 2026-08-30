/*
 * SLIDMS — Hyperledger Fabric Chaincode
 * Smart Contract: DocumentContract
 *
 * Anchors document SHA-256 hashes to the immutable Fabric ledger.
 * Tracks document lifecycle transitions (DRAFT → SUBMITTED → APPROVED → SIGNED → LOCKED).
 * Provides tamper-proof verification by comparing on-chain hashes with off-chain storage.
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
// @ts-ignore
import stringify from 'json-stringify-deterministic';
// @ts-ignore
import sortKeysRecursive from 'sort-keys-recursive';

// ─── Ledger Data Structures ──────────────────────────────────────────────────

export interface DocumentRecord {
  docType: string;           // Fabric discriminator: always "document"
  documentId: string;        // SLIDMS document UUID
  caseId: string;            // Parent case UUID
  documentName: string;      // Human-readable name
  documentType: string;      // FIR, COMPLAINT, WITNESS_STATEMENT, etc.
  hash: string;              // SHA-256 of the document file
  status: string;            // DRAFT, SUBMITTED, APPROVED, SIGNED, LOCKED
  owner: string;             // Creator user ID
  ownerName: string;         // Creator display name
  classification: string;    // PUBLIC, INTERNAL, CONFIDENTIAL, HIGHLY_CONFIDENTIAL
  versionNo: number;         // Current version number
  registeredAt: string;      // ISO timestamp of initial registration
  lastUpdated: string;       // ISO timestamp of last state change
  lastActor: string;         // User ID of last actor
  lastActorName: string;     // Display name of last actor
  txId: string;              // Fabric transaction ID (set automatically)
}

export interface CustodyRecord {
  docType: string;           // Fabric discriminator: always "custody"
  evidenceId: string;        // SLIDMS evidence UUID
  caseId: string;            // Parent case UUID
  evidenceType: string;      // Evidence item type/name
  currentCustodian: string;  // User ID of current holder
  custodianName: string;     // Display name of current holder
  transfers: CustodyTransfer[];
  registeredAt: string;
  lastUpdated: string;
  txId: string;
}

export interface CustodyTransfer {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  reason: string;
  hash: string;              // SHA-256 of transfer event data
  timestamp: string;
  txId: string;
}

// ─── Smart Contract ──────────────────────────────────────────────────────────

@Info({
  title: 'SLIDMS Document & Evidence Contract',
  description: 'Tamper-proof document hash anchoring and evidence custody tracking for Indian law enforcement'
})
export class DocumentContract extends Contract {

  constructor() {
    super('DocumentContract');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DOCUMENT OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * RegisterDocument — Anchor a new document's SHA-256 hash to the ledger.
   * Called when a document is first uploaded to SLIDMS.
   */
  @Transaction()
  public async RegisterDocument(
    ctx: Context,
    documentId: string,
    caseId: string,
    documentName: string,
    documentType: string,
    hash: string,
    owner: string,
    ownerName: string,
    classification: string,
    versionNo: string,
    timestamp: string
  ): Promise<string> {
    // Check if already registered
    const existing = await ctx.stub.getState(`DOC_${documentId}`);
    if (existing && existing.length > 0) {
      throw new Error(`Document ${documentId} is already registered on the ledger`);
    }

    const record: DocumentRecord = {
      docType: 'document',
      documentId,
      caseId,
      documentName,
      documentType,
      hash,
      status: 'DRAFT',
      owner,
      ownerName,
      classification,
      versionNo: parseInt(versionNo) || 1,
      registeredAt: timestamp,
      lastUpdated: timestamp,
      lastActor: owner,
      lastActorName: ownerName,
      txId: ctx.stub.getTxID(),
    };

    const data = Buffer.from(stringify(sortKeysRecursive(record)));
    await ctx.stub.putState(`DOC_${documentId}`, data);

    // Emit event for external listeners
    ctx.stub.setEvent('DocumentRegistered', Buffer.from(JSON.stringify({
      documentId, hash, txId: record.txId, timestamp
    })));

    return JSON.stringify(record);
  }

  /**
   * UpdateDocumentStatus — Record a workflow transition on the ledger.
   * Called on SUBMITTED, APPROVED, SIGNED, LOCKED transitions.
   */
  @Transaction()
  public async UpdateDocumentStatus(
    ctx: Context,
    documentId: string,
    newStatus: string,
    actorId: string,
    actorName: string,
    hash: string,
    timestamp: string
  ): Promise<string> {
    const key = `DOC_${documentId}`;
    const existing = await ctx.stub.getState(key);

    if (!existing || existing.length === 0) {
      throw new Error(`Document ${documentId} not found on ledger. Register it first.`);
    }

    const record: DocumentRecord = JSON.parse(existing.toString());
    record.status = newStatus;
    record.hash = hash;
    record.lastActor = actorId;
    record.lastActorName = actorName;
    record.lastUpdated = timestamp;
    record.txId = ctx.stub.getTxID();

    const data = Buffer.from(stringify(sortKeysRecursive(record)));
    await ctx.stub.putState(key, data);

    ctx.stub.setEvent('DocumentStatusUpdated', Buffer.from(JSON.stringify({
      documentId, newStatus, hash, actorId, txId: record.txId, timestamp
    })));

    return JSON.stringify(record);
  }

  /**
   * UpdateDocumentVersion — Record a new version upload on the ledger.
   */
  @Transaction()
  public async UpdateDocumentVersion(
    ctx: Context,
    documentId: string,
    newVersionNo: string,
    hash: string,
    actorId: string,
    actorName: string,
    timestamp: string
  ): Promise<string> {
    const key = `DOC_${documentId}`;
    const existing = await ctx.stub.getState(key);

    if (!existing || existing.length === 0) {
      throw new Error(`Document ${documentId} not found on ledger.`);
    }

    const record: DocumentRecord = JSON.parse(existing.toString());
    record.versionNo = parseInt(newVersionNo);
    record.hash = hash;
    record.status = 'DRAFT'; // New version resets to DRAFT
    record.lastActor = actorId;
    record.lastActorName = actorName;
    record.lastUpdated = timestamp;
    record.txId = ctx.stub.getTxID();

    const data = Buffer.from(stringify(sortKeysRecursive(record)));
    await ctx.stub.putState(key, data);

    return JSON.stringify(record);
  }

  /**
   * QueryDocument — Read the current ledger state for a document (read-only).
   */
  @Transaction(false)
  @Returns('string')
  public async QueryDocument(ctx: Context, documentId: string): Promise<string> {
    const data = await ctx.stub.getState(`DOC_${documentId}`);
    if (!data || data.length === 0) {
      throw new Error(`Document ${documentId} not found on ledger`);
    }
    return data.toString();
  }

  /**
   * VerifyDocument — Compare a supplied hash against the ledger-registered hash.
   * Returns verification result with match status.
   */
  @Transaction(false)
  @Returns('string')
  public async VerifyDocument(
    ctx: Context,
    documentId: string,
    currentHash: string
  ): Promise<string> {
    const data = await ctx.stub.getState(`DOC_${documentId}`);
    if (!data || data.length === 0) {
      throw new Error(`Document ${documentId} not found on ledger`);
    }

    const record: DocumentRecord = JSON.parse(data.toString());
    const isMatch = record.hash === currentHash;

    return JSON.stringify({
      documentId,
      ledgerHash: record.hash,
      providedHash: currentHash,
      status: isMatch ? 'VERIFIED' : 'TAMPERED',
      ledgerTxId: record.txId,
      lastUpdated: record.lastUpdated,
      verifiedAt: new Date().toISOString(),
    });
  }

  /**
   * GetDocumentHistory — Fetch complete modification history from the ledger.
   * Uses Fabric's built-in key history API for immutable audit trail.
   */
  @Transaction(false)
  @Returns('string')
  public async GetDocumentHistory(ctx: Context, documentId: string): Promise<string> {
    const key = `DOC_${documentId}`;
    const iterator = await ctx.stub.getHistoryForKey(key);
    const results: any[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value) {
        try {
          const record = JSON.parse(result.value.value.toString());
          results.push({
            txId: result.value.txId,
            timestamp: result.value.timestamp
              ? new Date((result.value.timestamp as any).seconds.low * 1000).toISOString()
              : null,
            isDelete: result.value.isDelete,
            record,
          });
        } catch (err) {
          // Skip malformed entries
        }
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(results);
  }

  /**
   * DocumentExists — Check if a document key exists on the ledger.
   */
  @Transaction(false)
  @Returns('boolean')
  public async DocumentExists(ctx: Context, documentId: string): Promise<boolean> {
    const data = await ctx.stub.getState(`DOC_${documentId}`);
    return !!data && data.length > 0;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EVIDENCE CUSTODY OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * RegisterEvidence — Create an evidence record on the ledger.
   */
  @Transaction()
  public async RegisterEvidence(
    ctx: Context,
    evidenceId: string,
    caseId: string,
    evidenceType: string,
    collectorId: string,
    collectorName: string,
    timestamp: string
  ): Promise<string> {
    const existing = await ctx.stub.getState(`EVID_${evidenceId}`);
    if (existing && existing.length > 0) {
      throw new Error(`Evidence ${evidenceId} is already registered on the ledger`);
    }

    const record: CustodyRecord = {
      docType: 'custody',
      evidenceId,
      caseId,
      evidenceType,
      currentCustodian: collectorId,
      custodianName: collectorName,
      transfers: [{
        fromUserId: '',
        fromUserName: '',
        toUserId: collectorId,
        toUserName: collectorName,
        reason: 'Initial evidence collection and registration',
        hash: '',
        timestamp,
        txId: ctx.stub.getTxID(),
      }],
      registeredAt: timestamp,
      lastUpdated: timestamp,
      txId: ctx.stub.getTxID(),
    };

    const data = Buffer.from(stringify(sortKeysRecursive(record)));
    await ctx.stub.putState(`EVID_${evidenceId}`, data);

    ctx.stub.setEvent('EvidenceRegistered', Buffer.from(JSON.stringify({
      evidenceId, caseId, collectorId, txId: record.txId, timestamp
    })));

    return JSON.stringify(record);
  }

  /**
   * RecordCustodyTransfer — Anchor an evidence custody handover on-chain.
   */
  @Transaction()
  public async RecordCustodyTransfer(
    ctx: Context,
    evidenceId: string,
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    toUserName: string,
    reason: string,
    hash: string,
    timestamp: string
  ): Promise<string> {
    const key = `EVID_${evidenceId}`;
    const existing = await ctx.stub.getState(key);

    if (!existing || existing.length === 0) {
      throw new Error(`Evidence ${evidenceId} not found on ledger. Register it first.`);
    }

    const record: CustodyRecord = JSON.parse(existing.toString());

    const transfer: CustodyTransfer = {
      fromUserId,
      fromUserName,
      toUserId,
      toUserName,
      reason,
      hash,
      timestamp,
      txId: ctx.stub.getTxID(),
    };

    record.transfers.push(transfer);
    record.currentCustodian = toUserId;
    record.custodianName = toUserName;
    record.lastUpdated = timestamp;
    record.txId = ctx.stub.getTxID();

    const data = Buffer.from(stringify(sortKeysRecursive(record)));
    await ctx.stub.putState(key, data);

    ctx.stub.setEvent('CustodyTransferred', Buffer.from(JSON.stringify({
      evidenceId, fromUserId, toUserId, reason, txId: record.txId, timestamp
    })));

    return JSON.stringify(record);
  }

  /**
   * QueryEvidence — Read current evidence custody state (read-only).
   */
  @Transaction(false)
  @Returns('string')
  public async QueryEvidence(ctx: Context, evidenceId: string): Promise<string> {
    const data = await ctx.stub.getState(`EVID_${evidenceId}`);
    if (!data || data.length === 0) {
      throw new Error(`Evidence ${evidenceId} not found on ledger`);
    }
    return data.toString();
  }

  /**
   * GetCustodyHistory — Fetch full custody modification history from ledger.
   */
  @Transaction(false)
  @Returns('string')
  public async GetCustodyHistory(ctx: Context, evidenceId: string): Promise<string> {
    const key = `EVID_${evidenceId}`;
    const iterator = await ctx.stub.getHistoryForKey(key);
    const results: any[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value) {
        try {
          const record = JSON.parse(result.value.value.toString());
          results.push({
            txId: result.value.txId,
            timestamp: result.value.timestamp
              ? new Date((result.value.timestamp as any).seconds.low * 1000).toISOString()
              : null,
            isDelete: result.value.isDelete,
            record,
          });
        } catch (err) {
          // Skip malformed entries
        }
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(results);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RICH QUERIES (CouchDB)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * QueryDocumentsByCase — Find all documents for a given case ID (CouchDB rich query).
   */
  @Transaction(false)
  @Returns('string')
  public async QueryDocumentsByCase(ctx: Context, caseId: string): Promise<string> {
    const query = {
      selector: { docType: 'document', caseId },
      sort: [{ registeredAt: 'asc' }],
    };

    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const results: any[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value) {
        results.push(JSON.parse(result.value.value.toString()));
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(results);
  }

  /**
   * GetAllDocuments — Retrieve all document records on the ledger.
   */
  @Transaction(false)
  @Returns('string')
  public async GetAllDocuments(ctx: Context): Promise<string> {
    const iterator = await ctx.stub.getStateByRange('DOC_', 'DOC_~');
    const results: any[] = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value) {
        results.push(JSON.parse(result.value.value.toString()));
      }
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify(results);
  }
}
