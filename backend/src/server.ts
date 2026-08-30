import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import casesRoutes from './routes/cases.routes';
import shareRoutes from './routes/share.routes';
import auditRoutes from './routes/audit.routes';
import evidenceRoutes from './routes/evidence.routes';
import documentsRoutes from './routes/documents.routes';
import blockchainRoutes from './routes/blockchain.routes';
import adminRoutes from './routes/admin.routes';
import usersRoutes from './routes/users.routes';
import { errorHandler } from './middlewares/errorHandler';
import { runMigrations } from './db/migrate';
import { seedDatabase } from './db/seed';
import { FabricService } from './services/fabric.service';

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Body parsing middlewares
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Contract Route Mounting — specific routes mounted before generic parameterized routes
app.use('/auth', authRoutes);
app.use('/cases', casesRoutes);
app.use('/', shareRoutes);       // /documents/shared-with-me, /documents/:id/share, /shares/:id/revoke
app.use('/', auditRoutes);       // /documents/:id/audit, /cases/:id/audit, /audit/verify-chain
app.use('/', evidenceRoutes);    // /cases/:caseId/evidence, /evidence/:id, /evidence/:id/transfer
app.use('/', documentsRoutes);   // /cases/:caseId/documents, /documents/:id, /documents/:id/download
app.use('/blockchain', blockchainRoutes);
app.use('/admin', adminRoutes);
app.use('/users', usersRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    system: 'SLIDMS Backend API',
    persistence: 'PostgreSQL',
    blockchain: FabricService.getConnectionInfo(),
    timestamp: new Date().toISOString()
  });
});

// Centralized Error Handler
app.use(errorHandler);

async function startServer() {
  try {
    console.log('🔄 Initializing PostgreSQL database migrations...');
    await runMigrations();

    console.log('🌱 Seeding database initial demo data...');
    await seedDatabase();

    console.log('⛓️ Connecting to Hyperledger Fabric Gateway...');
    await FabricService.connect();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 SLIDMS Backend API Server running on port ${PORT}`);
      console.log(`📡 Contract Endpoints Ready: /auth, /cases, /documents, /evidence, /blockchain, /admin`);
      console.log(`🗄️ Persistence: PostgreSQL with cryptographic hash chaining`);
      console.log(`⛓️ Blockchain: ${FabricService.isConnected() ? 'Hyperledger Fabric ✅' : 'PostgreSQL Fallback ⚠️'}`);
      console.log(`=======================================================`);
    });
  } catch (err: any) {
    console.error('❌ Failed to start SLIDMS backend server:', err.message);
    app.listen(PORT, () => {
      console.log(`⚠️ SLIDMS Backend started with DB connection warning on port ${PORT}`);
    });
  }
}

startServer();

export default app;
