import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';
import { sendError } from '../utils/response';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// No fallback secret here by design — server.ts validates JWT_SECRET is set
// (and refuses to start otherwise) before any request can reach this middleware.
const JWT_SECRET = process.env.JWT_SECRET!;

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): any => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'AUTH_TOKEN_EXPIRED', 'Access token is missing or malformed.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    return next();
  } catch (err) {
    return sendError(res, 'AUTH_TOKEN_EXPIRED', 'Invalid or expired access token.', 401);
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return sendError(res, 'AUTH_TOKEN_EXPIRED', 'User is not authenticated.', 401);
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return sendError(res, 'FORBIDDEN_CLASSIFICATION', 'User lacks required role permission.', 403);
    }

    return next();
  };
};

