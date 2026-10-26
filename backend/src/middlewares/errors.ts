import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Request, Response, NextFunction, RequestHandler as ExpressRequestHandler } from 'express';
export const asyncHandler=(handler:(req:Request,res:Response,next:NextFunction)=>unknown):ExpressRequestHandler=>(req,res,next)=>{Promise.resolve(handler(req,res,next)).catch(next)};
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const notFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, 'Recurso no encontrado.'));
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.code === '23505') {
    const messages:Record<string,string>={uq_clients_nit_normalized:'Ya existe un cliente con ese NIT.',ux_users_email_lower:'Ya existe un usuario con ese correo.',uq_users_email:'Ya existe un usuario con ese correo.',uq_projects_code:'Ya existe un proyecto con ese código.',uq_network_assets_serial_normalized:'Ya existe un activo con ese serial normalizado.'};
    return res.status(409).json({ error: messages[error.constraint] ?? 'Ya existe un registro con esos datos.' });
  }
  if (error?.code === '23503') return res.status(400).json({ error: 'Una entidad relacionada no existe o no puede eliminarse.' });
  const status = error instanceof HttpError ? error.status : (error?.status ?? 500);
  if (status === 500) console.error('Error de API:', error);
  const detail = status === 500 && process.env.NODE_ENV !== 'production' ? (error?.message ?? 'Error interno del servidor.') : (status === 500 ? 'Error interno del servidor.' : error.message);
  return res.status(status).json({ error: detail });
};
