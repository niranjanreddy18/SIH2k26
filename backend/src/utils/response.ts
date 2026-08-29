import { Response } from 'express';
import { ApiResponse, PaginatedData } from '../types';

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data
  };
  return res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response, 
  items: T[], 
  page: number, 
  limit: number, 
  total: number, 
  statusCode = 200
): Response => {
  const paginatedData: PaginatedData<T> = {
    items,
    page,
    limit,
    total
  };
  const response: ApiResponse<PaginatedData<T>> = {
    success: true,
    data: paginatedData
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response, 
  code: string, 
  message: string, 
  statusCode = 400
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message
    }
  };
  return res.status(statusCode).json(response);
};

