import {pool} from '../../config/database.js';
import {audit} from '../../shared/audit.js';
import type {z} from 'zod';
import type {accountInput,journalEntry} from './schemas.js';

type AccountInput=z.infer<typeof accountInput>;
type EntryInput=z.infer<typeof journalEntry>;
const fail=(status:number,message:string)=>Object.assign(new Error(message),{status});
const amount=(n:unknown)=>Number(n||0);

export async function accounts(){
  return (await pool.query(`SELECT a.id,a.code,a.name,a.account_type AS "accountType",a.normal_balance AS "normalBalance",
      a.parent_id AS "parentId",p.code AS "parentCode",a.active,a.created_at AS "createdAt",a.updated_at AS "updatedAt"
    FROM accounting_accounts a LEFT JOIN accounting_accounts p ON p.id=a.parent_id ORDER BY a.code`)).rows;
}
export async function saveAccount(d:AccountInput,actor:string,id?:string){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    if(id){
      if(d.parentId===id)throw fail(400,'Una cuenta no puede ser su propia cuenta padre.');
      const before=await client.query(`SELECT * FROM accounting_accounts WHERE id=$1 FOR UPDATE`,[id]);
      if(!before.rowCount){await client.query('ROLLBACK');return null;}
      const used=await client.query(`SELECT count(*)::int AS count FROM journal_entry_lines WHERE account_id=$1`,[id]);
      if(Number(used.rows[0].count)>0&&(before.rows[0].account_type!==d.accountType||before.rows[0].normal_balance!==d.normalBalance))throw fail(409,'No se puede cambiar la naturaleza de una cuenta que ya tiene movimientos.');
      const result=await client.query(`UPDATE accounting_accounts SET code=$2,name=$3,account_type=$4,normal_balance=$5,parent_id=$6,active=$7,updated_at=now() WHERE id=$1 RETURNING *`,[id,d.code,d.name,d.accountType,d.normalBalance,d.parentId??null,d.active]);
      await audit(actor,'UPDATE','accounting_account',id,before.rows[0],result.rows[0],client);
      await client.query('COMMIT');return result.rows[0];
    }
    const result=await client.query(`INSERT INTO accounting_accounts(code,name,account_type,normal_balance,parent_id,active,data_origin) VALUES($1,$2,$3,$4,$5,$6,'MANUAL') RETURNING *`,[d.code,d.name,d.accountType,d.normalBalance,d.parentId??null,d.active]);
    await audit(actor,'CREATE','accounting_account',result.rows[0].id,null,result.rows[0],client);
    await client.query('COMMIT');return result.rows[0];
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}

export async function entries(filter:{from?:string;to?:string;status?:string}){
  const result=await pool.query(`SELECT e.id,e.entry_number AS "entryNumber",e.entry_date AS "entryDate",e.description,e.status,
      e.source_type AS "sourceType",e.posted_at AS "postedAt",e.created_at AS "createdAt",
      COALESCE(sum(l.debit),0)::numeric AS debit,COALESCE(sum(l.credit),0)::numeric AS credit,count(l.id)::int AS "lineCount"
    FROM journal_entries e LEFT JOIN journal_entry_lines l ON l.journal_entry_id=e.id
    WHERE ($1::date IS NULL OR e.entry_date >= $1) AND ($2::date IS NULL OR e.entry_date <= $2) AND ($3::text IS NULL OR e.status=$3)
    GROUP BY e.id ORDER BY e.entry_date DESC,e.created_at DESC`,[filter.from??null,filter.to??null,filter.status??null]);
  return result.rows;
}
export async function entry(id:string){
  const header=await pool.query(`SELECT id,entry_number AS "entryNumber",entry_date AS "entryDate",description,status,source_type AS "sourceType",source_id AS "sourceId",posted_at AS "postedAt",void_reason AS "voidReason",data_origin AS "dataOrigin",created_at AS "createdAt",updated_at AS "updatedAt" FROM journal_entries WHERE id=$1`,[id]);
  if(!header.rowCount)return null;
  const lines=await pool.query(`SELECT l.id,l.account_id AS "accountId",a.code AS "accountCode",a.name AS "accountName",l.description,l.debit,l.credit
    FROM journal_entry_lines l JOIN accounting_accounts a ON a.id=l.account_id WHERE l.journal_entry_id=$1 ORDER BY l.created_at,l.id`,[id]);
  return {...header.rows[0],lines:lines.rows};
}
async function validateAccounts(lines:EntryInput['lines']){
  const ids=[...new Set(lines.map(line=>line.accountId))];
  const result=await pool.query(`SELECT id FROM accounting_accounts WHERE id=ANY($1::uuid[]) AND active=true`,[ids]);
  if(result.rowCount!==ids.length)throw fail(400,'Todas las líneas deben usar cuentas activas del plan contable.');
}
export async function saveEntry(d:EntryInput,actor:string,id?:string){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    if(id){
      const before=await client.query(`SELECT * FROM journal_entries WHERE id=$1 FOR UPDATE`,[id]);
      if(!before.rowCount){await client.query('ROLLBACK');return null;}
      if(before.rows[0].status!=='DRAFT')throw fail(409,'Solo se pueden editar asientos en borrador.');
      await validateAccounts(d.lines);
      await client.query(`UPDATE journal_entries SET entry_date=$2,description=$3,source_type=$4,updated_at=now() WHERE id=$1`,[id,d.entryDate,d.description,d.sourceType]);
      await client.query(`DELETE FROM journal_entry_lines WHERE journal_entry_id=$1`,[id]);
      for(const line of d.lines)await client.query(`INSERT INTO journal_entry_lines(journal_entry_id,account_id,description,debit,credit) VALUES($1,$2,$3,$4,$5)`,[id,line.accountId,line.description,line.debit,line.credit]);
      const after=await entryWithClient(client,id);
      await audit(actor,'UPDATE','journal_entry',id,before.rows[0],after,client);
      await client.query('COMMIT');return after;
    }
    await validateAccounts(d.lines);
    const entryId=(await client.query(`SELECT gen_random_uuid() AS id`)).rows[0].id as string;
    const entryNumber=`AS-${d.entryDate.replaceAll('-','')}-${entryId.slice(0,8).toUpperCase()}`;
    await client.query(`INSERT INTO journal_entries(id,entry_number,entry_date,description,status,source_type,created_by,data_origin) VALUES($1,$2,$3,$4,'DRAFT',$5,$6,'MANUAL')`,[entryId,entryNumber,d.entryDate,d.description,d.sourceType,actor]);
    for(const line of d.lines)await client.query(`INSERT INTO journal_entry_lines(journal_entry_id,account_id,description,debit,credit) VALUES($1,$2,$3,$4,$5)`,[entryId,line.accountId,line.description,line.debit,line.credit]);
    const after=await entryWithClient(client,entryId);
    await audit(actor,'CREATE','journal_entry',entryId,null,after,client);
    await client.query('COMMIT');return after;
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
async function entryWithClient(client:{query:(sql:string,params?:unknown[])=>Promise<{rows:any[];rowCount:number|null}>},id:string){
  const header=await client.query(`SELECT id,entry_number AS "entryNumber",entry_date AS "entryDate",description,status,source_type AS "sourceType",source_id AS "sourceId",posted_at AS "postedAt",void_reason AS "voidReason",data_origin AS "dataOrigin",created_at AS "createdAt",updated_at AS "updatedAt" FROM journal_entries WHERE id=$1`,[id]);
  const lines=await client.query(`SELECT l.id,l.account_id AS "accountId",a.code AS "accountCode",a.name AS "accountName",l.description,l.debit,l.credit FROM journal_entry_lines l JOIN accounting_accounts a ON a.id=l.account_id WHERE l.journal_entry_id=$1 ORDER BY l.created_at,l.id`,[id]);
  return {...header.rows[0],lines:lines.rows};
}
export async function deleteEntry(id:string,actor:string){
  const client=await pool.connect();try{await client.query('BEGIN');const before=await client.query(`SELECT * FROM journal_entries WHERE id=$1 FOR UPDATE`,[id]);if(!before.rowCount){await client.query('ROLLBACK');return false;}if(before.rows[0].status!=='DRAFT')throw fail(409,'Solo se pueden eliminar asientos en borrador; los contabilizados se anulan.');await client.query(`DELETE FROM journal_entries WHERE id=$1`,[id]);await audit(actor,'DELETE','journal_entry',id,before.rows[0],null,client);await client.query('COMMIT');return true;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function postEntry(id:string,actor:string){
  const client=await pool.connect();try{await client.query('BEGIN');const prior=await client.query(`SELECT * FROM journal_entries WHERE id=$1 FOR UPDATE`,[id]);if(!prior.rowCount){await client.query('ROLLBACK');return null;}if(prior.rows[0].status!=='DRAFT')throw fail(409,'Solo se puede contabilizar un asiento en borrador.');const totals=await client.query(`SELECT COALESCE(sum(debit),0)::numeric AS debit,COALESCE(sum(credit),0)::numeric AS credit,count(*)::int AS lines FROM journal_entry_lines WHERE journal_entry_id=$1`,[id]);if(Number(totals.rows[0].lines)<2||Math.abs(amount(totals.rows[0].debit)-amount(totals.rows[0].credit))>0.01)throw fail(409,'El asiento no está balanceado y no puede contabilizarse.');const result=await client.query(`UPDATE journal_entries SET status='POSTED',posted_at=now(),updated_at=now() WHERE id=$1 RETURNING *`,[id]);await audit(actor,'POST','journal_entry',id,prior.rows[0],result.rows[0],client);const after=await entryWithClient(client,id);await client.query('COMMIT');return after;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function voidEntry(id:string,reason:string,actor:string){
  const client=await pool.connect();try{await client.query('BEGIN');const prior=await client.query(`SELECT * FROM journal_entries WHERE id=$1 FOR UPDATE`,[id]);if(!prior.rowCount){await client.query('ROLLBACK');return null;}if(prior.rows[0].status!=='POSTED')throw fail(409,'Solo se puede anular un asiento contabilizado.');const result=await client.query(`UPDATE journal_entries SET status='VOID',void_reason=$2,updated_at=now() WHERE id=$1 RETURNING *`,[id,reason]);await audit(actor,'VOID','journal_entry',id,prior.rows[0],result.rows[0],client);const after=await entryWithClient(client,id);await client.query('COMMIT');return after;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function trialBalance(from:string,to:string){
  const result=await pool.query(`SELECT a.id,a.code,a.name,a.account_type AS "accountType",a.normal_balance AS "normalBalance",
      COALESCE(sum(l.debit) FILTER (WHERE e.id IS NOT NULL),0)::numeric AS debit,COALESCE(sum(l.credit) FILTER (WHERE e.id IS NOT NULL),0)::numeric AS credit,
      CASE WHEN a.normal_balance='DEBIT' THEN COALESCE(sum(l.debit-l.credit) FILTER (WHERE e.id IS NOT NULL),0) ELSE COALESCE(sum(l.credit-l.debit) FILTER (WHERE e.id IS NOT NULL),0) END::numeric AS balance
    FROM accounting_accounts a LEFT JOIN journal_entry_lines l ON l.account_id=a.id LEFT JOIN journal_entries e ON e.id=l.journal_entry_id AND e.status='POSTED' AND e.entry_date BETWEEN $1 AND $2
    WHERE a.active=true GROUP BY a.id ORDER BY a.code`,[from,to]);
  return {from,to,items:result.rows,debitTotal:result.rows.reduce((n,r)=>n+amount(r.debit),0),creditTotal:result.rows.reduce((n,r)=>n+amount(r.credit),0)};
}
export async function profitLoss(from:string,to:string){
  const result=await pool.query(`SELECT a.id,a.code,a.name,a.account_type AS "accountType",
      CASE WHEN a.account_type='REVENUE' THEN COALESCE(sum(l.credit-l.debit) FILTER (WHERE e.id IS NOT NULL),0) ELSE COALESCE(sum(l.debit-l.credit) FILTER (WHERE e.id IS NOT NULL),0) END::numeric AS amount
    FROM accounting_accounts a LEFT JOIN journal_entry_lines l ON l.account_id=a.id LEFT JOIN journal_entries e ON e.id=l.journal_entry_id AND e.status='POSTED' AND e.entry_date BETWEEN $1 AND $2
    WHERE a.account_type IN ('REVENUE','EXPENSE') AND a.active=true GROUP BY a.id ORDER BY a.account_type,a.code`,[from,to]);
  const revenue=result.rows.filter(r=>r.accountType==='REVENUE').reduce((n,r)=>n+amount(r.amount),0);
  const expenses=result.rows.filter(r=>r.accountType==='EXPENSE').reduce((n,r)=>n+amount(r.amount),0);
  return {from,to,revenue,expenses,netIncome:revenue-expenses,items:result.rows};
}
