import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Request, Response, NextFunction, RequestHandler as ExpressRequestHandler } from 'express';
export const asyncHandler=(handler:(req:Request,res:Response,next:NextFunction)=>unknown):ExpressRequestHandler=>(req,res,next)=>{Promise.resolve(handler(req,res,next)).catch(next)};
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const notFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, 'Recurso no encontrado.'));
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.code === '23505') return res.status(409).json({ error: 'Ya existe un cliente con ese identificador.' });
  if (error?.code === '23503') return res.status(400).json({ error: 'El cliente relacionado no existe o no puede eliminarse.' });
  const status = error instanceof HttpError ? error.status : (error?.status ?? 500);
  if (status === 500) console.error('Error de API:', error);
  const detail = status === 500 && process.env.NODE_ENV !== 'production' ? (error?.message ?? 'Error interno del servidor.') : (status === 500 ? 'Error interno del servidor.' : error.message);
  return res.status(status).json({ error: detail });
};
