// ============================================================================
//  Reporting Service  (port 4004)
//  Real-time inventory / inspection / compliance / maintenance reports,
//  plus CSV and PDF (printable HTML) export.
// ============================================================================
import { createService, mountErrorHandler, wrap } from '../../shared/service.js';
import { query } from '../../shared/db.js';
import { authenticate } from '../../shared/auth.middleware.js';

const app = createService('reporting');
const PORT = process.env.REPORTING_PORT || 4004;

// ---- Dashboard summary (real-time) ----------------------------------------
app.get('/reports/summary', authenticate, wrap(async (req, res) => {
  const [ext, byStatus, byType, insp, compliance, maint] = await Promise.all([
    query('SELECT count(*)::int AS total FROM fire_extinguishers'),
    query('SELECT status, count(*)::int AS n FROM fire_extinguishers GROUP BY status'),
    query('SELECT type, count(*)::int AS n FROM fire_extinguishers GROUP BY type'),
    query(`SELECT status, count(*)::int AS n FROM inspections GROUP BY status`),
    query(`SELECT compliance_status, count(*)::int AS n FROM v_compliance GROUP BY compliance_status`),
    query('SELECT count(*)::int AS total FROM maintenance_logs'),
  ]);
  res.json({
    totalExtinguishers: ext.rows[0].total,
    totalMaintenance: maint.rows[0].total,
    byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, r.n])),
    byType: Object.fromEntries(byType.rows.map((r) => [r.type, r.n])),
    inspections: Object.fromEntries(insp.rows.map((r) => [r.status, r.n])),
    compliance: Object.fromEntries(compliance.rows.map((r) => [r.compliance_status, r.n])),
  });
}));

// ---- Inventory report (period grouping) -----------------------------------
app.get('/reports/inventory', authenticate, wrap(async (req, res) => {
  const period = ['day', 'month', 'year'].includes(req.query.period) ? req.query.period : 'month';
  const { rows } = await query(
    `SELECT to_char(date_trunc($1, created_at), 'YYYY-MM-DD') AS bucket, count(*)::int AS added
       FROM fire_extinguishers GROUP BY 1 ORDER BY 1`, [period]);
  const total = await query('SELECT count(*)::int AS t FROM fire_extinguishers');
  res.json({ period, total: total.rows[0].t, series: rows });
}));

// ---- Inspection report ----------------------------------------------------
app.get('/reports/inspections', authenticate, wrap(async (req, res) => {
  await query(`UPDATE inspections SET status='Overdue' WHERE status='Pending' AND scheduled_date < CURRENT_DATE`);
  const { rows } = await query(
    `SELECT i.id, i.scheduled_date, i.status, e.serial_number, e.location
       FROM inspections i JOIN fire_extinguishers e ON e.id=i.extinguisher_id
       ORDER BY i.scheduled_date`);
  const counts = await query('SELECT status, count(*)::int n FROM inspections GROUP BY status');
  res.json({ summary: Object.fromEntries(counts.rows.map((r) => [r.status, r.n])), items: rows });
}));

// ---- Compliance report ----------------------------------------------------
app.get('/reports/compliance', authenticate, wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM v_compliance ORDER BY expiry_date');
  const expired = rows.filter((r) => r.compliance_status === 'Expired');
  const soon = rows.filter((r) => r.compliance_status === 'Expiring Soon');
  res.json({ expired, expiringSoon: soon, all: rows });
}));

// ---- Maintenance report ---------------------------------------------------
app.get('/reports/maintenance', authenticate, wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT m.id, m.action_taken, m.maintenance_date, m.issues_identified, e.serial_number
       FROM maintenance_logs m JOIN fire_extinguishers e ON e.id=m.extinguisher_id
       ORDER BY m.maintenance_date DESC`);
  const freq = await query(
    `SELECT e.serial_number, count(*)::int AS times FROM maintenance_logs m
       JOIN fire_extinguishers e ON e.id=m.extinguisher_id GROUP BY e.serial_number ORDER BY times DESC`);
  res.json({ recent: rows.slice(0, 10), history: rows, frequency: freq.rows });
}));

// ---- Export: CSV ----------------------------------------------------------
app.get('/reports/export/:dataset.csv', authenticate, wrap(async (req, res) => {
  const { rows, columns } = await dataset(req.params.dataset);
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.dataset}.csv"`);
  res.send(`${header}\n${body}`);
}));

// ---- Export: PDF (returns print-ready HTML the browser can save as PDF) ----
app.get('/reports/export/:dataset.pdf', authenticate, wrap(async (req, res) => {
  const { rows, columns, title } = await dataset(req.params.dataset);
  res.setHeader('Content-Type', 'text/html');
  res.send(pdfHtml(title, columns, rows));
}));

// ---- helpers --------------------------------------------------------------
async function dataset(name) {
  switch (name) {
    case 'extinguishers': {
      const { rows } = await query('SELECT serial_number, location, type, size, installation_date, expiry_date, status FROM fire_extinguishers ORDER BY created_at DESC');
      return { rows, columns: ['serial_number', 'location', 'type', 'size', 'installation_date', 'expiry_date', 'status'], title: 'Fire Extinguisher Inventory' };
    }
    case 'inspections': {
      const { rows } = await query(`SELECT e.serial_number, i.scheduled_date, i.status, i.result FROM inspections i JOIN fire_extinguishers e ON e.id=i.extinguisher_id ORDER BY i.scheduled_date`);
      return { rows, columns: ['serial_number', 'scheduled_date', 'status', 'result'], title: 'Inspection Report' };
    }
    case 'compliance': {
      const { rows } = await query('SELECT serial_number, location, type, expiry_date, compliance_status FROM v_compliance ORDER BY expiry_date');
      return { rows, columns: ['serial_number', 'location', 'type', 'expiry_date', 'compliance_status'], title: 'Compliance Report' };
    }
    case 'maintenance': {
      const { rows } = await query(`SELECT e.serial_number, m.action_taken, m.maintenance_date, m.issues_identified FROM maintenance_logs m JOIN fire_extinguishers e ON e.id=m.extinguisher_id ORDER BY m.maintenance_date DESC`);
      return { rows, columns: ['serial_number', 'action_taken', 'maintenance_date', 'issues_identified'], title: 'Maintenance Report' };
    }
    default:
      return { rows: [], columns: [], title: 'Report' };
  }
}

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
};

function pdfHtml(title, columns, rows) {
  const head = columns.map((c) => `<th>${c.replace(/_/g, ' ')}</th>`).join('');
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:Segoe UI,Arial,sans-serif;padding:40px;color:#111}
    h1{color:#ef4444} .meta{color:#666;margin-bottom:20px}
    table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px;font-size:13px;text-align:left}
    th{background:#ef4444;color:#fff;text-transform:capitalize}
    tr:nth-child(even){background:#fafafa}
    @media print{.no-print{display:none}}
  </style></head><body>
  <h1>SafeGuard — ${title}</h1>
  <div class="meta">Generated ${new Date().toISOString()} · ${rows.length} record(s)</div>
  <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:8px 16px;background:#ef4444;color:#fff;border:0;border-radius:8px;cursor:pointer">Save as PDF</button>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`;
}

mountErrorHandler(app, 'reporting');
app.listen(PORT, () => console.log(`Reporting service on http://localhost:${PORT}`));
