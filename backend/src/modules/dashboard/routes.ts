import { Router } from 'express';
import { requireRoles } from '../../shared/auth.js';
import { asyncHandler } from '../../middlewares/errors.js';
import * as controller from './controller.js';

export const dashboardRouter = Router();
dashboardRouter.get('/dashboard/summary', requireRoles('ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO','TECHNICIAN'), asyncHandler(controller.summary));
