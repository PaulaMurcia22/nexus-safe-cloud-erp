import {Router} from 'express';import {exportXlsx} from './controller.js';import {requireRoles} from '../../shared/auth.js';import {asyncHandler} from '../../middlewares/errors.js';
export const reportsRouter=Router();reportsRouter.get('/reports/:resource.xlsx',requireRoles('ADMIN','MANAGEMENT','COMMERCIAL','FINANCE','IT_OPERATIONS','PMO'),asyncHandler(exportXlsx));
