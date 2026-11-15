import { app } from './app.js'; import { env } from './config/env.js'; import { pool } from './config/database.js'; import {startMessaging,stopMessaging} from './messaging/runtime.js';
const server=app.listen(env.PORT,()=>{console.log(`Backend escuchando en http://localhost:${env.PORT}`);void startMessaging();});
const shutdown=async()=>{await stopMessaging();server.close(async()=>{await pool.end();process.exit(0);});}; process.on('SIGINT',shutdown); process.on('SIGTERM',shutdown);
