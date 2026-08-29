import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import casesRoutes from './routes/cases.routes';
import documentsRoutes from './routes/documents.routes';
import evidenceRoutes from './routes/evidence.routes';
import shareRoutes from './routes/share.routes';
import auditRoutes from './routes/audit.routes';
import blockchainRoutes from './routes/blockchain.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middlewares/errorHandler';
import { runMigrations } from './db/migrate';
import { seedDatabase } from './db/seed';

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

// API Contract Route Mounting
app.use('/auth', authRoutes);
app.use('/cases', casesRoutes);
app.use('/', documentsRoutes);
app.use('/', evidenceRoutes);
app.use('/', shareRoutes);
app.use('/', auditRoutes);
app.use('/blockchain', blockchainRoutes);
app.use('/admin', adminRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    system: 'SLIDMS Backend API',
    persistence: 'PostgreSQL',
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

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 SLIDMS Backend API Server running on port ${PORT}`);
      console.log(`📡 Contract Endpoints Ready: /auth, /cases, /documents, /evidence, /blockchain, /admin`);
      console.log(`🗄️ Persistence: PostgreSQL with cryptographic hash chaining`);
      console.log(`=======================================================`);
    });
  } catch (err: any) {
    console.error('❌ Failed to start SLIDMS backend server:', err.message);
    // Still start listening in case DB starts shortly or for diagnostics
    app.listen(PORT, () => {
      console.log(`⚠️ SLIDMS Backend started with DB connection warning on port ${PORT}`);
    });
  }
}

startServer();

export default app;
