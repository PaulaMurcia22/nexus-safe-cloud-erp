import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import { rateLimit } from 'express-rate-limit'; import { env } from './config/env.js'; import { router } from './routes/index.js'; import { errorHandler,notFound } from './middlewares/errors.js';
export const app=express(); app.use(helmet()); app.use(cors({origin:env.FRONTEND_ORIGIN,credentials:true})); app.use(express.json({limit:'1mb'}));
const loginLimiter=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.'}});
app.use('/api/auth/login',loginLimiter); app.use('/api',router); app.use(notFound); app.use(errorHandler);
