import { pool } from '../db/pool';
import { AuthenticatedUser } from '../middlewares/auth';

/**
 * Whether a user may create/modify data scoped to a case: ADMIN, the case's
 * creator, or an officer formally assigned to it via case_assignments.
 * Read access (browsing cases/documents) intentionally stays unrestricted —
 * only mutation paths (uploads, status changes, evidence registration,
 * tamper-demo, share creation) call this.
 */
export async function hasCaseAccess(caseId: string, user: AuthenticatedUser): Promise<boolean> {
  if (user.role === 'ADMIN') return true;

  const row = await pool.query(
    `SELECT 1 FROM cases WHERE id = $1 AND created_by = $2
     UNION
     SELECT 1 FROM case_assignments WHERE case_id = $1 AND user_id = $2`,
    [caseId, user.id]
  );
  return !!row.rows[0];
}
