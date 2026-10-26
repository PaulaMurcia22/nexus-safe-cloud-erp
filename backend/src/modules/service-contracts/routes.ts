import {Router} from 'express';
import * as c from './controller.js';
import {requireRoles} from '../../shared/auth.js';
import {asyncHandler} from '../../middlewares/errors.js';

export const serviceContractsRouter=Router();
serviceContractsRouter.get('/clients/:id/overview',requireRoles('ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO'),asyncHandler(c.clientOverview));
serviceContractsRouter.get('/service-contracts',requireRoles('ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO'),asyncHandler(c.list));
serviceContractsRouter.post('/service-contracts',requireRoles('ADMIN','COMMERCIAL'),asyncHandler(c.create));
serviceContractsRouter.get('/service-contracts/:id',requireRoles('ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO'),asyncHandler(c.detail));
serviceContractsRouter.put('/service-contracts/:id/scope',requireRoles('ADMIN','COMMERCIAL'),asyncHandler(c.putScope));
