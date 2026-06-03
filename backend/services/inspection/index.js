// ============================================================================
//  Inspection & Maintenance Service  (port 4003)
//  Schedule inspections, complete them, log maintenance activities.
// ============================================================================
import { createService, mountErrorHandler, wrap } from '../../shared/service.js';
import { query } from '../../shared/db.js';
import { authenticate, authorize } from '../../shared/auth.middleware.js';
import { HttpError, required } from '../../shared/validate.js';

const app = createService('inspection');
const PORT = process.env.INSPECTION_PORT || 4003;

const mapInsp = (i) => ({
  id: i.id, extinguisherId: i.extinguisher_id, inspectorId: i.inspector_id,
  scheduledDate: i.scheduled_date, scheduledTime: i.scheduled_time, status: i.status,
  result: i.result, notes: i.notes, completedAt: i.completed_at,
  serialNumber: i.serial_number, location: i.location, createdAt: i.created_at,
});
const mapMaint = (m) => ({
  id: m.id, extinguisherId: m.extinguisher_id, inspectorId: m.inspector_id,
  actionTaken: m.action_taken, maintenanceDate: m.maintenance_date,
  issuesIdentified: m.issues_identified, notes: m.notes, recommendations: m.recommendations,
  serialNumber: m.serial_number, createdAt: m.created_at,
});

// Auto-flag overdue inspections on each read.
async function refreshOverdue() {
  await query(`UPDATE inspections SET status = 'Overdue'
               WHERE status = 'Pending' AND scheduled_date < CURRENT_DATE`);
}

// ---- Inspections ----------------------------------------------------------
app.get('/inspections', authenticate, wrap(async (req, res) => {
  await refreshOverdue();
  // Optional filters: ?status=Pending  and  ?mine=true (inspections assigned to me).
  const { status, mine } = req.query;
  const conds = [];
  const params = [];
  if (status) { params.push(status); conds.push(`i.status = $${params.length}`); }
  if (mine === 'true') { params.push(req.user.id); conds.push(`i.inspector_id = $${params.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT i.*, e.serial_number, e.location
       FROM inspections i JOIN fire_extinguishers e ON e.id = i.extinguisher_id
       ${where} ORDER BY i.scheduled_date ASC`, params);
  res.json({ count: rows.length, inspections: rows.map(mapInsp) });
}));

app.get('/inspections/:id', authenticate, wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT i.*, e.serial_number, e.location FROM inspections i
       JOIN fire_extinguishers e ON e.id = i.extinguisher_id WHERE i.id = $1`, [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Inspection not found.');
  res.json({ inspection: mapInsp(rows[0]) });
}));

// Schedule an inspection (any authenticated user can request).
app.post('/inspections', authenticate, wrap(async (req, res) => {
  const { extinguisherId, scheduledDate, scheduledTime, inspectorId, notes } = req.body;
  required(req.body, ['extinguisherId', 'scheduledDate']);
  const ext = await query('SELECT serial_number, location FROM fire_extinguishers WHERE id = $1', [extinguisherId]);
  if (!ext.rowCount) throw new HttpError(404, 'Fire extinguisher not found.');
  const { rows } = await query(
    `INSERT INTO inspections (extinguisher_id, inspector_id, scheduled_date, scheduled_time, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [extinguisherId, inspectorId || null, scheduledDate, scheduledTime || '09:00', notes || null, req.user.id]
  );

  // Notify the relevant personnel. A requested inspection must reach every Admin
  // and every Inspector so someone can pick it up. (Best-effort, fire-and-forget.)
  const serial = ext.rows[0].serial_number;
  const requester = req.user.name || 'Someone';
  const staff = await query("SELECT id FROM users WHERE role IN ('admin', 'inspector')");
  for (const s of staff.rows) {
    notify(req, {
      userId: s.id,
      title: inspectorId && inspectorId === s.id ? 'Inspection assigned to you' : 'New inspection requested',
      message: `${requester} requested an inspection for ${serial} (${ext.rows[0].location}) on ${scheduledDate}.`,
      type: 'inspection',
    });
  }

  res.status(201).json({ message: 'Inspection scheduled', inspection: mapInsp(rows[0]) });
}));

// Complete / update an inspection (inspector/admin).
app.put('/inspections/:id', authenticate, authorize('admin', 'inspector'), wrap(async (req, res) => {
  const { status, result, notes, inspectorId } = req.body;
  const completed = status === 'Completed';
  const { rows } = await query(
    `UPDATE inspections SET
        status       = COALESCE($1, status),
        result       = COALESCE($2, result),
        notes        = COALESCE($3, notes),
        inspector_id = COALESCE($4, inspector_id),
        completed_at = CASE WHEN $5 THEN now() ELSE completed_at END
     WHERE id = $6 RETURNING *`,
    [status || null, result || null, notes || null, inspectorId || null, completed, req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Inspection not found.');
  res.json({ message: 'Inspection updated', inspection: mapInsp(rows[0]) });
}));

app.delete('/inspections/:id', authenticate, authorize('admin', 'inspector'), wrap(async (req, res) => {
  await query('DELETE FROM inspections WHERE id = $1', [req.params.id]);
  res.json({ message: 'Inspection cancelled/deleted.' });
}));

// ---- Maintenance logs -----------------------------------------------------
app.get('/maintenance', authenticate, wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT m.*, e.serial_number FROM maintenance_logs m
       JOIN fire_extinguishers e ON e.id = m.extinguisher_id
       ORDER BY m.maintenance_date DESC`);
  res.json({ count: rows.length, logs: rows.map(mapMaint) });
}));

app.post('/maintenance', authenticate, authorize('admin', 'inspector'), wrap(async (req, res) => {
  const { extinguisherId, actionTaken, maintenanceDate, issuesIdentified, notes, recommendations } = req.body;
  required(req.body, ['extinguisherId', 'actionTaken', 'maintenanceDate']);
  const { rows } = await query(
    `INSERT INTO maintenance_logs
       (extinguisher_id, inspector_id, action_taken, maintenance_date, issues_identified, notes, recommendations)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [extinguisherId, req.user.id, actionTaken, maintenanceDate, issuesIdentified || null, notes || null, recommendations || null]
  );
  res.status(201).json({ message: 'Maintenance logged', log: mapMaint(rows[0]) });
}));

// Helper: post a notification to the Notification service (best-effort).
function notify(req, payload) {
  const base = process.env.NOTIFICATION_URL || 'http://localhost:4005';
  fetch(`${base}/notifications/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => { /* best effort */ });
}

mountErrorHandler(app, 'inspection');
app.listen(PORT, () => console.log(`Inspection service on http://localhost:${PORT}`));
