import { pool } from '../../config/database.js';
import { audit } from '../../shared/audit.js';
import type { z } from 'zod';
import type { expense, purchaseOrder, supplier } from './schemas.js';

type SupplierData = z.infer<typeof supplier>;
type PurchaseOrderData = z.infer<typeof purchaseOrder>;
type ExpenseData = z.infer<typeof expense>;
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
const nullable = (value: string | null | undefined) => value?.trim() || null;

export async function suppliers() {
  return (await pool.query(`SELECT s.*, count(DISTINCT po.id)::int AS purchase_order_count FROM suppliers s LEFT JOIN purchase_orders po ON po.supplier_id=s.id GROUP BY s.id ORDER BY s.status,s.name`)).rows;
}
export async function createSupplier(d: SupplierData, actor: string) {
  const r = await pool.query(`INSERT INTO suppliers(name,tax_id,category,contact_name,email,phone,website,payment_terms_days,status,data_origin)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'MANUAL') RETURNING *`, [d.name, nullable(d.taxId), d.category, nullable(d.contactName), nullable(d.email), nullable(d.phone), nullable(d.website), d.paymentTermsDays, d.status]);
  await audit(actor, 'CREATE', 'supplier', r.rows[0].id, null, r.rows[0]); return r.rows[0];
}
export async function updateSupplier(id: string, d: SupplierData, actor: string) {
  const before = await pool.query(`SELECT * FROM suppliers WHERE id=$1`, [id]); if (!before.rowCount) return null;
  const r = await pool.query(`UPDATE suppliers SET name=$2,tax_id=$3,category=$4,contact_name=$5,email=$6,phone=$7,website=$8,payment_terms_days=$9,status=$10,updated_at=now() WHERE id=$1 RETURNING *`, [id,d.name,nullable(d.taxId),d.category,nullable(d.contactName),nullable(d.email),nullable(d.phone),nullable(d.website),d.paymentTermsDays,d.status]);
  await audit(actor,'UPDATE','supplier',id,before.rows[0],r.rows[0]); return r.rows[0];
}
export async function deleteSupplier(id: string, actor: string) {
  const before = await pool.query(`SELECT * FROM suppliers WHERE id=$1`,[id]); if (!before.rowCount) return false;
  const related = await pool.query(`SELECT (SELECT count(*) FROM purchase_orders WHERE supplier_id=$1)+(SELECT count(*) FROM expenses WHERE supplier_id=$1) AS n`,[id]);
  if (Number(related.rows[0].n)) throw fail(409,'El proveedor tiene compras o gastos relacionados; puedes inactivarlo.');
  await pool.query(`DELETE FROM suppliers WHERE id=$1`,[id]); await audit(actor,'DELETE','supplier',id,before.rows[0],null); return true;
}

export async function purchaseOrders() {
  return (await pool.query(`SELECT po.*,s.name AS supplier_name,(SELECT json_agg(json_build_object('id',l.id,'description',l.description,'quantity',l.quantity,'unitPrice',l.unit_price,'lineTotal',l.line_total) ORDER BY l.created_at) FROM purchase_order_lines l WHERE l.purchase_order_id=po.id) AS lines FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id ORDER BY po.ordered_on DESC,po.created_at DESC`)).rows;
}
export async function savePurchaseOrder(d: PurchaseOrderData, actor: string, id?: string) {
  const supplierExists = await pool.query(`SELECT id FROM suppliers WHERE id=$1 AND status='ACTIVE'`, [d.supplierId]); if (!supplierExists.rowCount) throw fail(400,'Selecciona un proveedor activo.');
  if (d.expectedOn && d.expectedOn < d.orderedOn) throw fail(400,'La fecha esperada no puede anteceder la fecha de orden.');
  const subtotal = d.lines.reduce((sum,line)=>sum+line.quantity*line.unitPrice,0); const total = subtotal*(1+d.taxRate/100);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let orderId = id; let before: unknown = null; let r;
    if (id) {
      const prior = await client.query(`SELECT * FROM purchase_orders WHERE id=$1 FOR UPDATE`,[id]); if (!prior.rowCount) { await client.query('ROLLBACK'); return null; }
      before = prior.rows[0]; if (prior.rows[0].status !== 'DRAFT') throw fail(409,'Solo se pueden editar órdenes en borrador.');
      r = await client.query(`UPDATE purchase_orders SET supplier_id=$2,description=$3,ordered_on=$4,expected_on=$5,currency=$6,subtotal=$7,tax_rate=$8,total=$9,notes=$10,updated_at=now() WHERE id=$1 RETURNING *`,[id,d.supplierId,d.description,d.orderedOn,d.expectedOn||null,d.currency,subtotal,d.taxRate,total,nullable(d.notes)]);
      await client.query(`DELETE FROM purchase_order_lines WHERE purchase_order_id=$1`,[id]);
    } else {
      orderId = (await client.query(`SELECT gen_random_uuid() AS id`)).rows[0].id;
      const number = `OC-${new Date().getFullYear()}-${orderId!.slice(0,8).toUpperCase()}`;
      r = await client.query(`INSERT INTO purchase_orders(id,order_number,supplier_id,description,ordered_on,expected_on,currency,subtotal,tax_rate,total,notes,requested_by,data_origin) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'MANUAL') RETURNING *`,[orderId,number,d.supplierId,d.description,d.orderedOn,d.expectedOn||null,d.currency,subtotal,d.taxRate,total,nullable(d.notes),actor]);
    }
    for (const line of d.lines) await client.query(`INSERT INTO purchase_order_lines(purchase_order_id,description,quantity,unit_price) VALUES($1,$2,$3,$4)`,[orderId,line.description,line.quantity,line.unitPrice]);
    await audit(actor,id?'UPDATE':'CREATE','purchase_order',orderId!,before,r.rows[0],client);
    await client.query('COMMIT');
    return (await pool.query(`SELECT po.*,s.name AS supplier_name,(SELECT json_agg(json_build_object('id',l.id,'description',l.description,'quantity',l.quantity,'unitPrice',l.unit_price,'lineTotal',l.line_total) ORDER BY l.created_at) FROM purchase_order_lines l WHERE l.purchase_order_id=po.id) AS lines FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id WHERE po.id=$1`,[orderId])).rows[0];
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
export async function deletePurchaseOrder(id:string,actor:string) {
  const prior=await pool.query(`SELECT * FROM purchase_orders WHERE id=$1`,[id]); if(!prior.rowCount)return false;
  if(prior.rows[0].status!=='DRAFT')throw fail(409,'Solo se pueden eliminar órdenes en borrador; cancela una orden enviada.');
  const client=await pool.connect();try{await client.query('BEGIN');await client.query(`DELETE FROM purchase_orders WHERE id=$1`,[id]);await audit(actor,'DELETE','purchase_order',id,prior.rows[0],null,client);await client.query('COMMIT');return true;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function setPurchaseOrderStatus(id:string,status:'SUBMITTED'|'APPROVED'|'RECEIVED'|'CANCELLED',actor:string) {
  const prior=await pool.query(`SELECT * FROM purchase_orders WHERE id=$1`,[id]);if(!prior.rowCount)return null;
  const allowed:Record<string,string[]>={DRAFT:['SUBMITTED','CANCELLED'],SUBMITTED:['APPROVED','CANCELLED'],APPROVED:['RECEIVED','CANCELLED']};
  if(!allowed[prior.rows[0].status]?.includes(status))throw fail(409,`No se puede pasar de ${prior.rows[0].status} a ${status}.`);
  const r=await pool.query(`UPDATE purchase_orders SET status=$2,updated_at=now() WHERE id=$1 RETURNING *`,[id,status]);await audit(actor,status,'purchase_order',id,prior.rows[0],r.rows[0]);return r.rows[0];
}

export async function expenses() { return (await pool.query(`SELECT e.*,s.name AS supplier_name FROM expenses e LEFT JOIN suppliers s ON s.id=e.supplier_id ORDER BY e.expense_date DESC,e.created_at DESC`)).rows; }
export async function saveExpense(d: ExpenseData,actor:string,id?:string) {
  if(d.supplierId && !(await pool.query(`SELECT id FROM suppliers WHERE id=$1`,[d.supplierId])).rowCount)throw fail(400,'El proveedor seleccionado no existe.');
  if(id){const before=await pool.query(`SELECT * FROM expenses WHERE id=$1`,[id]);if(!before.rowCount)return null;if(before.rows[0].status==='PAID'||before.rows[0].status==='VOID')throw fail(409,'No se puede editar un gasto pagado o anulado.');const r=await pool.query(`UPDATE expenses SET supplier_id=$2,description=$3,category=$4,expense_date=$5,currency=$6,amount=$7,status=$8,payment_reference=$9,notes=$10,updated_at=now() WHERE id=$1 RETURNING *`,[id,d.supplierId||null,d.description,d.category,d.expenseDate,d.currency,d.amount,d.status,nullable(d.paymentReference),nullable(d.notes)]);await audit(actor,'UPDATE','expense',id,before.rows[0],r.rows[0]);return r.rows[0];}
  const r=await pool.query(`INSERT INTO expenses(supplier_id,description,category,expense_date,currency,amount,status,payment_reference,notes,recorded_by,data_origin) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'MANUAL') RETURNING *`,[d.supplierId||null,d.description,d.category,d.expenseDate,d.currency,d.amount,d.status,nullable(d.paymentReference),nullable(d.notes),actor]);await audit(actor,'CREATE','expense',r.rows[0].id,null,r.rows[0]);return r.rows[0];
}
export async function deleteExpense(id:string,actor:string) {const before=await pool.query(`SELECT * FROM expenses WHERE id=$1`,[id]);if(!before.rowCount)return false;if(before.rows[0].status==='PAID')throw fail(409,'No se puede eliminar un gasto pagado.');await pool.query(`DELETE FROM expenses WHERE id=$1`,[id]);await audit(actor,'DELETE','expense',id,before.rows[0],null);return true;}
