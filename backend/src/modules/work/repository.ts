import {pool} from '../../config/database.js';
export function list(userId?:string){return pool.query(`SELECT w.*,u.name AS technician_name,f.severity,f.kind AS finding_kind FROM work_orders w LEFT JOIN users u ON u.id=w.assigned_user_id LEFT JOIN findings f ON f.id=w.finding_id WHERE ($1::uuid IS NULL OR w.assigned_user_id=$1) ORDER BY w.created_at DESC`,[userId??null]);}
