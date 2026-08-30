/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * SLIDMS — Hyperledger Fabric Gateway Service
 *
 * Connects the Express backend to the Fabric peer using the @hyperledger/fabric-gateway SDK.
 * Provides high-level methods for invoking chaincode functions.
 * Falls back gracefully when Fabric network is unavailable (development mode).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as grpc from '@grpc/grpc-js';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Conditional import — @hyperledger/fabric-gateway may not be installed in all environments
let fabricGateway: any;
try {
  fabricGateway = require('@hyperledger/fabric-gateway');
} catch {
  console.log('⚠️ @hyperledger/fabric-gateway not available — running in PostgreSQL-only mode');
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FabricTxResult {
  txId: string;
  status: string;
  data: any;
  timestamp: string;
  source: 'FABRIC' | 'FALLBACK';
}

export interface FabricDocRecord {
  documentId: string;
  hash: string;
  status: string;
  owner: string;
  ownerName: string;
  caseId: string;
  txId: string;
  registeredAt: string;
  lastUpdated: string;
}

export interface FabricHistoryEntry {
  txId: string;
  timestamp: string;
  isDelete: boolean;
  record: FabricDocRecord;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const FABRIC_CONFIG = {
  channelName: process.env.FABRIC_CHANNEL || 'slidms-channel',
  chaincodeName: process.env.FABRIC_CHAINCODE || 'slidms-cc',
  mspId: process.env.FABRIC_MSP_ID || 'PoliceDeptMSP',
  peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051',
  peerHostAlias: process.env.FABRIC_PEER_HOST_ALIAS || 'peer0.police.slidms.gov.in',

  // Paths to crypto material (relative to project root)
  cryptoPath: process.env.FABRIC_CRYPTO_PATH || path.resolve(
    __dirname, '..', '..', '..', 'blockchain', 'organizations',
    'peerOrganizations', 'police.slidms.gov.in'
  ),
};

// ─── Fabric Service ─────────────────────────────────────────────────────────

export class FabricService {
  private static gateway: any = null;
  private static contract: any = null;
  private static grpcClient: any = null;
  private static _connected = false;

  /**
   * Attempt to connect to the Fabric Gateway peer.
   * Logs a warning and continues if connection fails (fallback to PostgreSQL).
   */
  static async connect(): Promise<void> {
    if (!fabricGateway) {
      console.log('⚠️ Fabric Gateway SDK not loaded — PostgreSQL-only mode');
      return;
    }

    try {
      const { connect, signers, Identity } = fabricGateway;

      // Load credentials from crypto material
      const tlsCertPath = path.resolve(
        FABRIC_CONFIG.cryptoPath, 'peers', FABRIC_CONFIG.peerHostAlias, 'tls', 'ca.crt'
      );
      const certDirPath = path.resolve(
        FABRIC_CONFIG.cryptoPath, 'users', `Admin@${FABRIC_CONFIG.peerHostAlias.replace('peer0.', '')}`, 'msp', 'signcerts'
      );
      const keyDirPath = path.resolve(
        FABRIC_CONFIG.cryptoPath, 'users', `Admin@${FABRIC_CONFIG.peerHostAlias.replace('peer0.', '')}`, 'msp', 'keystore'
      );

      if (!fs.existsSync(tlsCertPath)) {
        console.log(`⚠️ Fabric TLS cert not found at ${tlsCertPath} — PostgreSQL-only mode`);
        return;
      }

      const tlsCert = fs.readFileSync(tlsCertPath);

      // Find the client certificate (first file in signcerts directory)
      const certFiles = fs.readdirSync(certDirPath);
      if (certFiles.length === 0) {
        console.log('⚠️ No client certificate found — PostgreSQL-only mode');
        return;
      }
      const clientCert = fs.readFileSync(path.join(certDirPath, certFiles[0]));

      // Find the private key (first file in keystore directory)
      const keyFiles = fs.readdirSync(keyDirPath);
      if (keyFiles.length === 0) {
        console.log('⚠️ No private key found — PostgreSQL-only mode');
        return;
      }
      const clientKey = crypto.createPrivateKey(
        fs.readFileSync(path.join(keyDirPath, keyFiles[0]))
      );

      // Create gRPC connection to the gateway peer
      const tlsCredentials = grpc.credentials.createSsl(tlsCert);
      this.grpcClient = new grpc.Client(
        FABRIC_CONFIG.peerEndpoint,
        tlsCredentials,
        { 'grpc.ssl_target_name_override': FABRIC_CONFIG.peerHostAlias }
      );

      // Connect to the Gateway
      const identity: any = { mspId: FABRIC_CONFIG.mspId, credentials: clientCert };
      const signer = signers.newPrivateKeySigner(clientKey);

      this.gateway = connect({
        client: this.grpcClient,
        identity,
        signer,
        evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
        endorseOptions: () => ({ deadline: Date.now() + 15000 }),
        submitOptions: () => ({ deadline: Date.now() + 5000 }),
        commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
      });

      // Get the contract
      const network = this.gateway.getNetwork(FABRIC_CONFIG.channelName);
      this.contract = network.getContract(FABRIC_CONFIG.chaincodeName, 'DocumentContract');

      this._connected = true;
      console.log('✅ Connected to Hyperledger Fabric Gateway');
      console.log(`   Channel: ${FABRIC_CONFIG.channelName}`);
      console.log(`   Chaincode: ${FABRIC_CONFIG.chaincodeName}`);
      console.log(`   Peer: ${FABRIC_CONFIG.peerEndpoint} (${FABRIC_CONFIG.mspId})`);

    } catch (err: any) {
      console.log(`⚠️ Fabric Gateway connection failed: ${err.message}`);
      console.log('   Falling back to PostgreSQL-only blockchain mode');
      this._connected = false;
    }
  }

  /**
   * Check if the Fabric network is connected.
   */
  static isConnected(): boolean {
    return this._connected;
  }

  /**
   * Get connection info for health endpoint.
   */
  static getConnectionInfo() {
    return {
      connected: this._connected,
      channel: FABRIC_CONFIG.channelName,
      chaincode: FABRIC_CONFIG.chaincodeName,
      peer: FABRIC_CONFIG.peerEndpoint,
      mspId: FABRIC_CONFIG.mspId,
      organizations: ['PoliceDeptMSP', 'ForensicLabMSP', 'JudiciaryMSP'],
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DOCUMENT OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Register a document's SHA-256 hash on the Fabric ledger.
   */
  static async registerDocument(
    documentId: string,
    caseId: string,
    documentName: string,
    documentType: string,
    hash: string,
    owner: string,
    ownerName: string,
    classification: string,
    versionNo: number
  ): Promise<FabricTxResult> {
    if (!this._connected || !this.contract) {
      return this.fallbackResult('registerDocument', { documentId, hash });
    }

    try {
      const result = await this.contract.submitTransaction(
        'RegisterDocument',
        documentId, caseId, documentName, documentType,
        hash, owner, ownerName, classification,
        versionNo.toString(), new Date().toISOString()
      );

      const data = JSON.parse(new TextDecoder().decode(result));
      return {
        txId: data.txId,
        status: 'COMMITTED',
        data,
        timestamp: new Date().toISOString(),
        source: 'FABRIC',
      };
    } catch (err: any) {
      console.error(`Fabric registerDocument failed: ${err.message}`);
      return this.fallbackResult('registerDocument', { documentId, hash });
    }
  }

  /**
   * Record a document workflow status change on the Fabric ledger.
   */
  static async updateDocumentStatus(
    documentId: string,
    newStatus: string,
    actorId: string,
    actorName: string,
    hash: string
  ): Promise<FabricTxResult> {
    if (!this._connected || !this.contract) {
      return this.fallbackResult('updateDocumentStatus', { documentId, newStatus, hash });
    }

    try {
      const result = await this.contract.submitTransaction(
        'UpdateDocumentStatus',
        documentId, newStatus, actorId, actorName,
        hash, new Date().toISOString()
      );

      const data = JSON.parse(new TextDecoder().decode(result));
      return {
        txId: data.txId,
        status: 'COMMITTED',
        data,
        timestamp: new Date().toISOString(),
        source: 'FABRIC',
      };
    } catch (err: any) {
      console.error(`Fabric updateDocumentStatus failed: ${err.message}`);
      return this.fallbackResult('updateDocumentStatus', { documentId, newStatus, hash });
    }
  }

  /**
   * Query the current state of a document from the Fabric ledger.
   */
  static async queryDocument(documentId: string): Promise<FabricDocRecord | null> {
    if (!this._connected || !this.contract) return null;

    try {
      const result = await this.contract.evaluateTransaction('QueryDocument', documentId);
      return JSON.parse(new TextDecoder().decode(result));
    } catch (err: any) {
      console.error(`Fabric queryDocument failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Get the full modification history of a document from the Fabric ledger.
   */
  static async getDocumentHistory(documentId: string): Promise<FabricHistoryEntry[]> {
    if (!this._connected || !this.contract) return [];

    try {
      const result = await this.contract.evaluateTransaction('GetDocumentHistory', documentId);
      return JSON.parse(new TextDecoder().decode(result));
    } catch (err: any) {
      console.error(`Fabric getDocumentHistory failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Verify a document's hash against the Fabric ledger.
   */
  static async verifyDocument(documentId: string, currentHash: string): Promise<any | null> {
    if (!this._connected || !this.contract) return null;

    try {
      const result = await this.contract.evaluateTransaction('VerifyDocument', documentId, currentHash);
      return JSON.parse(new TextDecoder().decode(result));
    } catch (err: any) {
      console.error(`Fabric verifyDocument failed: ${err.message}`);
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EVIDENCE CUSTODY OPERATIONS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Register evidence on the Fabric ledger.
   */
  static async registerEvidence(
    evidenceId: string,
    caseId: string,
    evidenceType: string,
    collectorId: string,
    collectorName: string
  ): Promise<FabricTxResult> {
    if (!this._connected || !this.contract) {
      return this.fallbackResult('registerEvidence', { evidenceId });
    }

    try {
      const result = await this.contract.submitTransaction(
        'RegisterEvidence',
        evidenceId, caseId, evidenceType,
        collectorId, collectorName, new Date().toISOString()
      );
      const data = JSON.parse(new TextDecoder().decode(result));
      return {
        txId: data.txId,
        status: 'COMMITTED',
        data,
        timestamp: new Date().toISOString(),
        source: 'FABRIC',
      };
    } catch (err: any) {
      console.error(`Fabric registerEvidence failed: ${err.message}`);
      return this.fallbackResult('registerEvidence', { evidenceId });
    }
  }

  /**
   * Record an evidence custody transfer on the Fabric ledger.
   */
  static async recordCustodyTransfer(
    evidenceId: string,
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    toUserName: string,
    reason: string,
    hash: string
  ): Promise<FabricTxResult> {
    if (!this._connected || !this.contract) {
      return this.fallbackResult('recordCustodyTransfer', { evidenceId, fromUserId, toUserId });
    }

    try {
      const result = await this.contract.submitTransaction(
        'RecordCustodyTransfer',
        evidenceId, fromUserId, fromUserName,
        toUserId, toUserName, reason,
        hash, new Date().toISOString()
      );
      const data = JSON.parse(new TextDecoder().decode(result));
      return {
        txId: data.txId,
        status: 'COMMITTED',
        data,
        timestamp: new Date().toISOString(),
        source: 'FABRIC',
      };
    } catch (err: any) {
      console.error(`Fabric recordCustodyTransfer failed: ${err.message}`);
      return this.fallbackResult('recordCustodyTransfer', { evidenceId, fromUserId, toUserId });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FALLBACK
  // ──────────────────────────────────────────────────────────────────────────

  private static fallbackResult(operation: string, data: any): FabricTxResult {
    return {
      txId: `FALLBACK-${Date.now().toString(36)}`,
      status: 'FALLBACK',
      data: { ...data, message: `Fabric unavailable — using PostgreSQL for ${operation}` },
      timestamp: new Date().toISOString(),
      source: 'FALLBACK',
    };
  }

  /**
   * Gracefully close the Gateway connection.
   */
  static close(): void {
    if (this.gateway) {
      this.gateway.close();
    }
    if (this.grpcClient) {
      this.grpcClient.close();
    }
    this._connected = false;
    console.log('🔌 Fabric Gateway connection closed');
  }
}
