import { pool } from '../../config/database.js';
import { audit } from '../../shared/audit.js';

type SubscriptionInput = {
  customerId: string; planId: string; code: string; billingInterval: 'MONTHLY'|'YEARLY';
  seats: number; startsOn: string; trialEndsOn?: string|null; notes: string;
};

async function amounts(planId: string, interval: SubscriptionInput['billingInterval'], seats: number) {
  const result = await pool.query(`SELECT monthly_price,extra_seat_price,included_seats,annual_discount_pct,currency FROM saas_plans WHERE id=$1 AND active=true`, [planId]);
  if (!result.rowCount) throw Object.assign(new Error('El plan no existe o está inactivo.'), { status: 400 });
  const plan = result.rows[0];
  const extraSeats = Math.max(0,seats-Number(plan.included_seats));
  const seatAdjustedBase = Number(plan.monthly_price) + extraSeats * Number(plan.extra_seat_price);
  const monthlyValue = seatAdjustedBase * (interval === 'YEARLY' ? 1 - Number(plan.annual_discount_pct) / 100 : 1);
  const recurringAmount = interval === 'YEARLY' ? monthlyValue * 12 : monthlyValue;
  return { monthlyValue, recurringAmount, currency: plan.currency as string };
}

async function ensureCustomer(customerId: string) {
  const result = await pool.query(`SELECT 1 FROM clients WHERE id=$1 AND status='ACTIVE'`, [customerId]);
  if (!result.rowCount) throw Object.assign(new Error('El cliente no existe o está inactivo.'), { status: 400 });
}

export async function listSubscriptions(search?: string, status?: string) {
  const result = await pool.query(`SELECT s.*,c.legal_name AS customer_name,p.code AS plan_code,p.name AS plan_name
    FROM saas_subscriptions s JOIN clients c ON c.id=s.customer_id JOIN saas_plans p ON p.id=s.plan_id
    WHERE ($1::text IS NULL OR c.legal_name ILIKE '%'||$1||'%' OR s.code ILIKE '%'||$1||'%')
      AND ($2::text IS NULL OR s.status=$2)
    ORDER BY CASE s.status WHEN 'ACTIVE' THEN 0 WHEN 'TRIAL' THEN 1 WHEN 'PAST_DUE' THEN 2 ELSE 3 END,s.next_renewal_on NULLS LAST,s.created_at DESC`,
  [search || null, status || null]);
  return result.rows;
}

export async function getSubscription(id: string) {
  const result = await pool.query(`SELECT s.*,c.legal_name AS customer_name,p.code AS plan_code,p.name AS plan_name
    FROM saas_subscriptions s JOIN clients c ON c.id=s.customer_id JOIN saas_plans p ON p.id=s.plan_id WHERE s.id=$1`, [id]);
  return result.rows[0] ?? null;
}

export async function createSubscription(input: SubscriptionInput, actorId: string) {
  await ensureCustomer(input.customerId);
  const amount = await amounts(input.planId, input.billingInterval, input.seats);
  const status = input.trialEndsOn ? 'TRIAL' : 'ACTIVE';
  const inserted = await pool.query(`INSERT INTO saas_subscriptions
    (customer_id,plan_id,code,billing_interval,status,seats,recurring_amount,monthly_value,currency,starts_on,trial_ends_on,current_period_start,current_period_end,next_renewal_on,notes,data_origin)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$10::date,
      COALESCE($11::date,$10::date + CASE WHEN $4='YEARLY' THEN interval '1 year' ELSE interval '1 month' END),
      COALESCE($11::date,$10::date + CASE WHEN $4='YEARLY' THEN interval '1 year' ELSE interval '1 month' END),$12,'MANUAL')
    RETURNING id`, [input.customerId,input.planId,input.code,input.billingInterval,status,input.seats,amount.recurringAmount,amount.monthlyValue,amount.currency,input.startsOn,input.trialEndsOn ?? null,input.notes]);
  const row = await getSubscription(inserted.rows[0].id);
  await audit(actorId,'CREATE','saas_subscription',row.id,null,row);
  return row;
}

export async function updateSubscription(id: string, input: SubscriptionInput, actorId: string) {
  const before = await getSubscription(id);
  if (!before) return null;
  if (before.status === 'CANCELED') throw Object.assign(new Error('No se puede editar una suscripción cancelada. Reactívala primero.'), { status: 409 });
  await ensureCustomer(input.customerId);
  const amount = await amounts(input.planId, input.billingInterval, input.seats);
  const result = await pool.query(`UPDATE saas_subscriptions SET customer_id=$2,plan_id=$3,code=$4,billing_interval=$5,seats=$6,
      recurring_amount=$7,monthly_value=$8,currency=$9,starts_on=$10,trial_ends_on=$11,notes=$12,
      current_period_start=$10::date,current_period_end=COALESCE($11::date,$10::date + CASE WHEN $5='YEARLY' THEN interval '1 year' ELSE interval '1 month' END),
      next_renewal_on=COALESCE($11::date,$10::date + CASE WHEN $5='YEARLY' THEN interval '1 year' ELSE interval '1 month' END),updated_at=now()
    WHERE id=$1 RETURNING id`, [id,input.customerId,input.planId,input.code,input.billingInterval,input.seats,amount.recurringAmount,amount.monthlyValue,amount.currency,input.startsOn,input.trialEndsOn ?? null,input.notes]);
  const after = await getSubscription(result.rows[0].id);
  await audit(actorId,'UPDATE','saas_subscription',id,before,after);
  return after;
}

export async function cancelSubscription(id: string, actorId: string) {
  const before = await getSubscription(id);
  if (!before) return null;
  if (before.status === 'CANCELED') return before;
  const changed = await pool.query(`UPDATE saas_subscriptions SET status='CANCELED',canceled_at=now(),next_renewal_on=NULL,updated_at=now() WHERE id=$1 RETURNING id`,[id]);
  const after = await getSubscription(changed.rows[0].id);
  await audit(actorId,'CANCEL','saas_subscription',id,before,after);
  return after;
}

export async function reactivateSubscription(id: string, actorId: string) {
  const before = await getSubscription(id);
  if (!before) return null;
  if (before.status !== 'CANCELED') throw Object.assign(new Error('Solo se puede reactivar una suscripción cancelada.'), { status: 409 });
  const changed = await pool.query(`UPDATE saas_subscriptions SET status='ACTIVE',canceled_at=NULL,
      current_period_start=CURRENT_DATE,
      current_period_end=CURRENT_DATE + CASE WHEN billing_interval='YEARLY' THEN interval '1 year' ELSE interval '1 month' END,
      next_renewal_on=CURRENT_DATE + CASE WHEN billing_interval='YEARLY' THEN interval '1 year' ELSE interval '1 month' END,updated_at=now()
    WHERE id=$1 RETURNING id`, [id]);
  const after = await getSubscription(changed.rows[0].id);
  await audit(actorId,'REACTIVATE','saas_subscription',id,before,after);
  return after;
}
