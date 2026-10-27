import { Router } from 'express';
import { asyncHandler } from '../../middlewares/errors.js';
import { requireRoles } from '../../shared/auth.js';
import * as controller from './controller.js';

export const hrRouter = Router();
const read = requireRoles('ADMIN','MANAGEMENT');
const write = requireRoles('ADMIN');
hrRouter.get('/hr/employees',read,asyncHandler(controller.list));
hrRouter.get('/hr/employees/:id',read,asyncHandler(controller.detail));
hrRouter.post('/hr/employees',write,asyncHandler(controller.create));
hrRouter.put('/hr/employees/:id',write,asyncHandler(controller.update));
hrRouter.delete('/hr/employees/:id',write,asyncHandler(controller.deactivate));
