import express, { Router } from 'express';
import { requireRoles } from '../../shared/auth.js';
import { asyncHandler } from '../../middlewares/errors.js';
import * as controller from './controller.js';

export const iotRouter = Router();
const read = requireRoles('ADMIN','MANAGEMENT','IT_OPERATIONS','PMO');
iotRouter.get('/iot/captures', read, asyncHandler(controller.list));
iotRouter.get('/iot/captures/:id', read, asyncHandler(controller.detail));
iotRouter.post('/iot/captures/import', requireRoles('ADMIN','IT_OPERATIONS'), express.raw({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', limit: '10mb' }), asyncHandler(controller.upload));
