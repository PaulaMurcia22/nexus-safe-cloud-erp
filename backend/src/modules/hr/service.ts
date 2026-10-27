import { pool } from '../../config/database.js';
import { audit } from '../../shared/audit.js';
import type { z } from 'zod';
import type { employeeSchema } from './schemas.js';

type EmployeeInput = z.infer<typeof employeeSchema>;
const columns = `id,employee_number AS "employeeNumber",full_name AS "fullName",work_email AS "workEmail",
  job_title AS "jobTitle",department,office_location AS "officeLocation",start_date AS "startDate",
  status,contract_type AS "contractType",created_at AS "createdAt",updated_at AS "updatedAt"`;
const invalid = (message: string) => Object.assign(new Error(message), { status: 400 });

export async function listEmployees(filters: {search?: string; status?: string; department?: string}) {
  const result = await pool.query(`SELECT ${columns} FROM hr_employees
    WHERE ($1::text IS NULL OR status=$1) AND ($2::text IS NULL OR department=$2)
      AND ($3::text IS NULL OR full_name ILIKE '%'||$3||'%' OR work_email ILIKE '%'||$3||'%' OR employee_number ILIKE '%'||$3||'%' OR job_title ILIKE '%'||$3||'%')
    ORDER BY CASE status WHEN 'ACTIVE' THEN 0 WHEN 'ON_LEAVE' THEN 1 ELSE 2 END,department,full_name`,
  [filters.status ?? null, filters.department || null, filters.search || null]);
  return result.rows;
}

export async function getEmployee(id: string) {
  const result = await pool.query(`SELECT ${columns} FROM hr_employees WHERE id=$1`, [id]);
  return result.rows[0] ?? null;
}

export async function createEmployee(data: EmployeeInput, actorId: string) {
  if (new Date(data.startDate).getTime() > Date.now() + 86400000) throw invalid('La fecha de ingreso no puede estar en el futuro.');
  const inserted = await pool.query(`INSERT INTO hr_employees(employee_number,full_name,work_email,job_title,department,office_location,start_date,status,contract_type)
    VALUES($1,$2,lower($3),$4,$5,$6,$7,$8,$9) RETURNING id`,
  [data.employeeNumber,data.fullName,data.workEmail,data.jobTitle,data.department,data.officeLocation,data.startDate,data.status,data.contractType]);
  const row = await getEmployee(inserted.rows[0].id);
  await audit(actorId,'CREATE','hr_employee',row.id,null,row);
  return row;
}

export async function updateEmployee(id: string, data: EmployeeInput, actorId: string) {
  const before = await getEmployee(id);
  if (!before) return null;
  if (new Date(data.startDate).getTime() > Date.now() + 86400000) throw invalid('La fecha de ingreso no puede estar en el futuro.');
  await pool.query(`UPDATE hr_employees SET employee_number=$2,full_name=$3,work_email=lower($4),job_title=$5,
    department=$6,office_location=$7,start_date=$8,status=$9,contract_type=$10,updated_at=now() WHERE id=$1`,
  [id,data.employeeNumber,data.fullName,data.workEmail,data.jobTitle,data.department,data.officeLocation,data.startDate,data.status,data.contractType]);
  const after = await getEmployee(id);
  await audit(actorId,'UPDATE','hr_employee',id,before,after);
  return after;
}

export async function deactivateEmployee(id: string, actorId: string) {
  const before = await getEmployee(id);
  if (!before) return null;
  if (before.status === 'INACTIVE') return before;
  await pool.query(`UPDATE hr_employees SET status='INACTIVE',updated_at=now() WHERE id=$1`, [id]);
  const after = await getEmployee(id);
  await audit(actorId,'DEACTIVATE','hr_employee',id,before,after);
  return after;
}
