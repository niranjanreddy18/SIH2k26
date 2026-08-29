import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export class AppError extends Error {
  public code: string;
  public statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  console.error('[SLIDMS Error]:', err);

  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.statusCode);
  }

  // Handle Multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'FILE_TOO_LARGE', 'File size exceeds allowed maximum limit.', 400);
  }

  // Generic fallback
  const message = err.message || 'An unexpected internal server error occurred.';
  return sendError(res, 'INTERNAL_SERVER_ERROR', message, 500);
};

