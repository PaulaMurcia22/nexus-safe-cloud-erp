import {Router} from 'express';import * as c from './controller.js';import {requireRoles} from '../../shared/auth.js';import {asyncHandler} from '../../middlewares/errors.js';
export const findingsRouter=Router();
findingsRouter.get('/findings',requireRoles('ADMIN','MANAGEMENT','COMMERCIAL','IT_OPERATIONS','PMO'),asyncHandler(c.list));
findingsRouter.post('/findings/generate',requireRoles('ADMIN','IT_OPERATIONS'),asyncHandler(c.generate));
findingsRouter.patch('/findings/:id/status',requireRoles('ADMIN','IT_OPERATIONS','TECHNICIAN'),asyncHandler(c.status));
findingsRouter.post('/findings/:id/work-order',requireRoles('ADMIN','IT_OPERATIONS','PMO'),asyncHandler(c.workOrder));
