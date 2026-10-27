import { Router } from 'express';
import { requireRoles } from '../../shared/auth.js';
import { asyncHandler } from '../../middlewares/errors.js';
import * as controller from './controller.js';

export const crmRouter = Router();
const read = requireRoles('ADMIN','MANAGEMENT','COMMERCIAL');
const write = requireRoles('ADMIN','COMMERCIAL');
crmRouter.get('/opportunities', read, asyncHandler(controller.list));
crmRouter.get('/opportunities/:id', read, asyncHandler(controller.detail));
crmRouter.post('/opportunities', write, asyncHandler(controller.create));
crmRouter.put('/opportunities/:id', write, asyncHandler(controller.update));
crmRouter.delete('/opportunities/:id', requireRoles('ADMIN'), asyncHandler(controller.remove));
