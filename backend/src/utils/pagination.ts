import { Request } from 'express';

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Parses ?page= and ?limit= query params into a clamped, offset-ready shape.
 * page is clamped to >=1; limit is clamped to [1, 200], defaulting to defaultLimit.
 */
export function parsePagination(req: Request, defaultLimit = 50): Pagination {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
