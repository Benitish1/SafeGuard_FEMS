// Boilerplate factory shared by every microservice: express app with the
// common middleware stack (helmet, cors, json, logging, health, error handler).
import './env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

export function createService(name) {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(`[${name}] :method :url :status :response-time ms`));

  app.get('/health', (req, res) => res.json({ service: name, status: 'ok', time: new Date().toISOString() }));

  return app;
}

export function mountErrorHandler(app, name) {
  app.use((req, res) => res.status(404).json({ error: `Not found on ${name}: ${req.method} ${req.originalUrl}` }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    // Expected client errors (400/401/403/404/409) are normal — log a clean one-liner.
    // Only unexpected server errors (5xx) get a full stack trace.
    if (status >= 500) console.error(`[${name}] error:`, err);
    else console.warn(`[${name}] ${status} ${err.message}`);
    res.status(status).json({ error: err.message || 'Internal server error' });
  });
}

// Helper to async-wrap route handlers.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
