import { Router } from 'express';
import { requireRoles } from '../../shared/auth.js';
import { asyncHandler } from '../../middlewares/errors.js';
import * as controller from './controller.js';

export const subscriptionsRouter=Router();
const read=requireRoles('ADMIN','MANAGEMENT','COMMERCIAL','FINANCE');
const write=requireRoles('ADMIN','COMMERCIAL');
subscriptionsRouter.get('/saas/plans',read,asyncHandler(controller.plans));
subscriptionsRouter.get('/saas/subscriptions',read,asyncHandler(controller.list));
subscriptionsRouter.get('/saas/subscriptions/:id',read,asyncHandler(controller.detail));
subscriptionsRouter.post('/saas/subscriptions',write,asyncHandler(controller.create));
subscriptionsRouter.put('/saas/subscriptions/:id',write,asyncHandler(controller.update));
subscriptionsRouter.post('/saas/subscriptions/:id/cancel',requireRoles('ADMIN','COMMERCIAL','FINANCE'),asyncHandler(controller.cancel));
subscriptionsRouter.post('/saas/subscriptions/:id/reactivate',requireRoles('ADMIN','COMMERCIAL','FINANCE'),asyncHandler(controller.reactivate));
