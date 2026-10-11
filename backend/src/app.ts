import express from 'express'; import cors from 'cors'; import { env } from './config/env.js'; import { router } from './routes/index.js'; import { errorHandler,notFound } from './middlewares/errors.js';
export const app=express(); app.use(cors({origin:env.FRONTEND_ORIGIN,credentials:true})); app.use(express.json({limit:'1mb'})); app.use('/api',router); app.use(notFound); app.use(errorHandler);
