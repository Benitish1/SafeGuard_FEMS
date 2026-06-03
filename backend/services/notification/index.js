// ============================================================================
//  Notification Service  (port 4005)
//  Stores in-app notifications and (optionally) emails relevant personnel.
// ============================================================================
import { createService, mountErrorHandler, wrap } from '../../shared/service.js';
import { query } from '../../shared/db.js';
import { authenticate } from '../../shared/auth.middleware.js';
import { HttpError, required } from '../../shared/validate.js';

const app = createService('notification');
const PORT = process.env.NOTIFICATION_PORT || 4005;

const map = (n) => ({
  id: n.id, title: n.title, message: n.message, type: n.type,
  isRead: n.is_read, createdAt: n.created_at,
});

// List my notifications.
app.get('/notifications', authenticate, wrap(async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
  res.json({ count: rows.length, unread: rows.filter((r) => !r.is_read).length, notifications: rows.map(map) });
}));

// Mark one as read.
app.put('/notifications/:id/read', authenticate, wrap(async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ message: 'Marked as read' });
}));

// Mark all read.
app.put('/notifications/read-all', authenticate, wrap(async (req, res) => {
  await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'All marked as read' });
}));

// Internal: other services post here (no auth, internal network only).
app.post('/notifications/internal', wrap(async (req, res) => {
  const { userId, title, message, type } = req.body;
  required(req.body, ['title', 'message']);
  await query(
    'INSERT INTO notifications (user_id, title, message, type) VALUES ($1,$2,$3,$4)',
    [userId || null, title, message, type || 'info']);
  res.status(201).json({ message: 'Notification created' });
}));

mountErrorHandler(app, 'notification');
app.listen(PORT, () => console.log(`Notification service on http://localhost:${PORT}`));
