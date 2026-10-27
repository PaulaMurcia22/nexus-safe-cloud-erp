import { pool } from '../../config/database.js';

const financeRoles = new Set(['ADMIN', 'MANAGEMENT', 'FINANCE']);

export async function summary(userId: string, role: string) {
  if (role === 'TECHNICIAN') {
    const [orders, hours, monthly] = await Promise.all([
      pool.query(`SELECT count(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS','BLOCKED'))::int AS open_orders,
        count(*) FILTER (WHERE status='COMPLETED')::int AS completed_orders FROM work_orders WHERE assigned_user_id=$1`, [userId]),
      pool.query(`SELECT COALESCE(sum(hours),0)::numeric AS hours_ytd FROM time_entries WHERE user_id=$1 AND entry_date>=date_trunc('year',CURRENT_DATE)::date AND entry_date<=CURRENT_DATE`, [userId]),
      pool.query(`WITH months AS (SELECT generate_series(date_trunc('year',CURRENT_DATE)::date,date_trunc('month',CURRENT_DATE)::date,interval '1 month')::date AS month)
        SELECT to_char(months.month,'YYYY-MM') AS month,COALESCE(sum(t.hours),0)::numeric AS hours
        FROM months LEFT JOIN time_entries t ON t.user_id=$1 AND date_trunc('month',t.entry_date)=months.month
        GROUP BY months.month ORDER BY months.month`, [userId]),
    ]);
    return { year: new Date().getUTCFullYear(), scope: 'TECHNICIAN', kpis: { openOrders: orders.rows[0].open_orders, completedOrders: orders.rows[0].completed_orders, hoursYtd: Number(hours.rows[0].hours_ytd) }, monthlyHours: monthly.rows };
  }

  const [customers, projects, contracts, orders, findings, monthly, aging, projectStatus, orderStatus, recent, subscriptions, pipeline, expenses, procurement, employees] = await Promise.all([
    pool.query(`SELECT count(*) FILTER (WHERE status='ACTIVE')::int AS active, count(*)::int AS total FROM clients`),
    pool.query(`SELECT count(*) FILTER (WHERE status='IN_PROGRESS')::int AS active, count(*) FILTER (WHERE status='COMPLETED')::int AS completed, count(*)::int AS total FROM projects`),
    pool.query(`SELECT count(*) FILTER (WHERE status='ACTIVE' AND starts_on<=CURRENT_DATE AND (ends_on IS NULL OR ends_on>=CURRENT_DATE))::int AS active FROM service_contracts`),
    pool.query(`SELECT count(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS','BLOCKED'))::int AS open, count(*) FILTER (WHERE status='COMPLETED')::int AS completed FROM work_orders`),
    pool.query(`SELECT count(*) FILTER (WHERE status IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS'))::int AS open, count(*) FILTER (WHERE severity='CRITICAL' AND status IN ('OPEN','ACKNOWLEDGED','IN_PROGRESS'))::int AS critical FROM findings`),
    pool.query(`WITH months AS (SELECT generate_series(date_trunc('year',CURRENT_DATE)::date,date_trunc('month',CURRENT_DATE)::date,interval '1 month')::date AS month),
      invoiced AS (SELECT date_trunc('month',issue_date)::date AS month,sum(total)::numeric AS amount FROM invoices WHERE status IN ('ISSUED','PAID') AND issue_date>=date_trunc('year',CURRENT_DATE)::date AND issue_date<=CURRENT_DATE GROUP BY 1),
      collected AS (SELECT date_trunc('month',paid_at)::date AS month,sum(total)::numeric AS amount FROM invoices WHERE status='PAID' AND paid_at>=date_trunc('year',CURRENT_DATE) AND paid_at<date_trunc('year',CURRENT_DATE)+interval '1 year' GROUP BY 1)
      SELECT to_char(months.month,'YYYY-MM') AS month,COALESCE(invoiced.amount,0)::numeric AS invoiced,COALESCE(collected.amount,0)::numeric AS collected
      FROM months LEFT JOIN invoiced USING(month) LEFT JOIN collected USING(month) ORDER BY months.month`),
    pool.query(`SELECT COALESCE(sum(total),0)::numeric AS receivable,COALESCE(sum(total) FILTER (WHERE due_date<CURRENT_DATE),0)::numeric AS overdue,count(*) FILTER (WHERE due_date<CURRENT_DATE)::int AS overdue_invoices FROM invoices WHERE status='ISSUED'`),
    pool.query(`SELECT status,count(*)::int AS count FROM projects GROUP BY status ORDER BY status`),
    pool.query(`SELECT status,count(*)::int AS count FROM work_orders GROUP BY status ORDER BY status`),
    pool.query(`SELECT i.id,i.number,i.issue_date,i.due_date,i.total,i.status,i.data_origin,c.legal_name AS customer_name FROM invoices i JOIN clients c ON c.id=i.customer_id WHERE i.status IN ('ISSUED','PAID') ORDER BY i.issue_date DESC,i.created_at DESC LIMIT 6`),
    pool.query(`SELECT count(*) FILTER (WHERE status IN ('ACTIVE','PAST_DUE'))::int AS paying,
      count(*) FILTER (WHERE status='TRIAL')::int AS trials,
      COALESCE(sum(monthly_value) FILTER (WHERE status IN ('ACTIVE','PAST_DUE')),0)::numeric AS mrr
      FROM saas_subscriptions WHERE currency='COP'`),
    pool.query(`SELECT count(*) FILTER (WHERE stage NOT IN ('WON','LOST'))::int AS open,
      COALESCE(sum(expected_mrr) FILTER (WHERE stage NOT IN ('WON','LOST')),0)::numeric AS raw_mrr,
      COALESCE(sum(expected_mrr*probability/100) FILTER (WHERE stage NOT IN ('WON','LOST')),0)::numeric AS weighted_mrr
      FROM crm_opportunities`),
    pool.query(`SELECT COALESCE(sum(amount),0)::numeric AS ytd FROM expenses WHERE status<>'VOID' AND expense_date>=date_trunc('year',CURRENT_DATE)::date AND expense_date<=CURRENT_DATE`),
    pool.query(`SELECT count(*) FILTER (WHERE status IN ('DRAFT','SUBMITTED','APPROVED'))::int AS open,
      COALESCE(sum(total) FILTER (WHERE status IN ('DRAFT','SUBMITTED','APPROVED')),0)::numeric AS committed
      FROM purchase_orders WHERE currency='COP'`),
    pool.query(`SELECT count(*) FILTER (WHERE status='ACTIVE')::int AS active FROM hr_employees`),
  ]);

  const finance = financeRoles.has(role) ? {
    invoicedYtd: Number(monthly.rows.reduce((n, row) => n + Number(row.invoiced), 0)),
    collectedYtd: Number(monthly.rows.reduce((n, row) => n + Number(row.collected), 0)),
    receivable: Number(aging.rows[0].receivable),
    overdue: Number(aging.rows[0].overdue),
    overdueInvoices: aging.rows[0].overdue_invoices,
  } : undefined;

  return {
    year: new Date().getUTCFullYear(), scope: 'BUSINESS',
    kpis: {
      activeCustomers: customers.rows[0].active, totalCustomers: customers.rows[0].total,
      activeProjects: projects.rows[0].active, completedProjects: projects.rows[0].completed,
      activeContracts: contracts.rows[0].active, openOrders: orders.rows[0].open,
      completedOrders: orders.rows[0].completed, openFindings: findings.rows[0].open,
      criticalFindings: findings.rows[0].critical, ...finance,
      ...(new Set(['ADMIN','MANAGEMENT','COMMERCIAL','FINANCE']).has(role) ? { mrr: Number(subscriptions.rows[0].mrr), arr: Number(subscriptions.rows[0].mrr)*12, activeSubscriptions: subscriptions.rows[0].paying, trialSubscriptions: subscriptions.rows[0].trials } : {}),
      ...(new Set(['ADMIN','MANAGEMENT','COMMERCIAL']).has(role) ? { openOpportunities: pipeline.rows[0].open, weightedPipelineMrr: Number(pipeline.rows[0].weighted_mrr) } : {}),
      ...(financeRoles.has(role) ? { expensesYtd: Number(expenses.rows[0].ytd), purchaseOrdersOpen: procurement.rows[0].open, purchaseCommitment: Number(procurement.rows[0].committed) } : {}),
      ...(new Set(['ADMIN','MANAGEMENT']).has(role) ? { teamSize: employees.rows[0].active } : {}),
    },
    monthly: monthly.rows, projectStatus: projectStatus.rows, orderStatus: orderStatus.rows,
    recentInvoices: finance ? recent.rows : [],
  };
}
