import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { sendSuccess, sendError } from '../utils/response';
import { authenticateJWT, AuthRequest } from '../middlewares/auth';

const router = Router();

/**
 * GET /search?q=... — Lightweight full-text search across cases and documents.
 *
 * Uses Postgres tsvector/ts_rank over existing text columns (case metadata) plus
 * `document_versions.extracted_text` (populated at upload time for text/* and
 * application/json files — see documents.routes.ts's extractTextIfPossible).
 *
 * Upgrade path to semantic search: this endpoint's request/response contract
 * (?q=, ranked {type, id, title, snippet, caseId, firNumber, score}[]) is
 * designed to stay stable. A future embeddings-based version would swap the
 * SQL below for a vector similarity query over the same extracted_text column
 * (plus richer extraction for PDFs/images) without the frontend changing at all.
 */

// Builds a prefix-matching tsquery string, e.g. "wit ness" -> "wit & ness:*".
// Manual construction (not websearch_to_tsquery) so the last word matches as
// you type, which matters for a live search box. Non-alphanumeric characters
// are stripped per word before use, so this can't inject tsquery operators.
function toPrefixTsQuery(q: string): string | null {
  const words = q
    .trim()
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  if (words.length === 0) return null;
  return words.map((w, i) => (i === words.length - 1 ? `${w}:*` : w)).join(' & ');
}

interface SearchResultItem {
  type: 'case' | 'document';
  id: string;
  title: string;
  snippet: string;
  caseId: string;
  firNumber: string;
  score: number;
}

router.get('/', authenticateJWT, async (req: AuthRequest, res: Response): Promise<any> => {
  const q = (req.query.q as string || '').trim();
  if (q.length < 2) {
    return sendError(res, 'VALIDATION_ERROR', 'Query must be at least 2 characters.', 400);
  }

  const tsQuery = toPrefixTsQuery(q);
  if (!tsQuery) {
    return sendSuccess(res, { query: q, items: [] });
  }

  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 10));

  const [caseRows, docRows] = await Promise.all([
    pool.query(
      `SELECT c.id, c.fir_number, c.title,
              ts_rank(
                to_tsvector('english', coalesce(c.fir_number,'') || ' ' || coalesce(c.title,'') || ' ' || coalesce(c.description,'') || ' ' || coalesce(c.crime_type,'')),
                to_tsquery('english', $1)
              ) AS rank,
              ts_headline(
                'english', coalesce(c.description, c.title, ''),
                to_tsquery('english', $1),
                'MaxWords=28, MinWords=12, StartSel=<<, StopSel=>>'
              ) AS snippet
       FROM cases c
       WHERE to_tsvector('english', coalesce(c.fir_number,'') || ' ' || coalesce(c.title,'') || ' ' || coalesce(c.description,'') || ' ' || coalesce(c.crime_type,''))
             @@ to_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT $2`,
      [tsQuery, limit]
    ),
    pool.query(
      `SELECT d.id, d.name, d.type, d.case_id, c.fir_number,
              ts_rank(
                to_tsvector('english', coalesce(d.name,'') || ' ' || coalesce(d.type::text,'') || ' ' || coalesce(dv.extracted_text,'')),
                to_tsquery('english', $1)
              ) AS rank,
              ts_headline(
                'english', coalesce(dv.extracted_text, d.name, ''),
                to_tsquery('english', $1),
                'MaxWords=28, MinWords=12, StartSel=<<, StopSel=>>'
              ) AS snippet
       FROM documents d
       JOIN document_versions dv ON d.current_version_id = dv.id
       JOIN cases c ON d.case_id = c.id
       WHERE to_tsvector('english', coalesce(d.name,'') || ' ' || coalesce(d.type::text,'') || ' ' || coalesce(dv.extracted_text,''))
             @@ to_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT $2`,
      [tsQuery, limit]
    ),
  ]);

  const items: SearchResultItem[] = [
    ...caseRows.rows.map(r => ({
      type: 'case' as const,
      id: r.id, title: r.title, snippet: r.snippet,
      caseId: r.id, firNumber: r.fir_number, score: parseFloat(r.rank),
    })),
    ...docRows.rows.map(r => ({
      type: 'document' as const,
      id: r.id, title: r.name, snippet: r.snippet,
      caseId: r.case_id, firNumber: r.fir_number, score: parseFloat(r.rank),
    })),
  ].sort((a, b) => b.score - a.score).slice(0, limit);

  return sendSuccess(res, { query: q, items });
});

export default router;
