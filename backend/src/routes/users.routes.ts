import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { sendSuccess } from '../utils/response';
import { authenticateJWT, AuthRequest } from '../middlewares/auth';

const router = Router();

/**
 * GET /users — Officer directory (id, name, role, department only).
 * Available to any authenticated user — used to populate recipient pickers
 * for sharing and custody transfer without requiring ADMIN access.
 */
router.get('/', authenticateJWT, async (_req: AuthRequest, res: Response): Promise<any> => {
  const rows = await pool.query(
    `SELECT id, name, email, role, department FROM users ORDER BY name ASC`
  );

  return sendSuccess(res, rows.rows.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
  })));
});

export default router;
