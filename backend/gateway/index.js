// ============================================================================
//  API Gateway  (port 4000)
//  Single entry point. Proxies /api/* to the relevant microservice and serves
//  the Swagger / OpenAPI documentation at /api/docs.
// ============================================================================
import './../shared/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.GATEWAY_PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(morgan('[gateway] :method :url :status :response-time ms'));

// --- Swagger / OpenAPI docs ---
const spec = YAML.parse(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'SafeGuard API' }));
app.get('/api/openapi.json', (req, res) => res.json(spec));

app.get('/api/health', (req, res) => res.json({ gateway: 'ok', time: new Date().toISOString() }));

// --- Route map: path prefix -> upstream service ---
// Mounted at root with a pathFilter so the full /api/* path reaches pathRewrite
// (Express would otherwise strip the mount prefix before the proxy sees it).
const strip = (p) => p.replace(/^\/api/, '');
const routes = [
  { match: '/api/auth',          target: process.env.AUTH_URL || 'http://localhost:4001',         rewrite: strip },
  { match: '/api/users',         target: process.env.AUTH_URL || 'http://localhost:4001',         rewrite: (p) => p.replace(/^\/api\/users/, '/auth/users') },
  { match: '/api/extinguishers', target: process.env.EXTINGUISHER_URL || 'http://localhost:4002', rewrite: strip },
  { match: '/api/inspections',   target: process.env.INSPECTION_URL || 'http://localhost:4003',   rewrite: strip },
  { match: '/api/maintenance',   target: process.env.INSPECTION_URL || 'http://localhost:4003',   rewrite: strip },
  { match: '/api/reports',       target: process.env.REPORTING_URL || 'http://localhost:4004',    rewrite: strip },
  { match: '/api/notifications', target: process.env.NOTIFICATION_URL || 'http://localhost:4005', rewrite: strip },
];

for (const r of routes) {
  app.use(
    createProxyMiddleware({
      pathFilter: (path) => path.startsWith(r.match),
      target: r.target,
      changeOrigin: true,
      pathRewrite: (path) => r.rewrite(path),
      on: {
        error: (err, req, res) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Upstream service unavailable (${r.target}). Is it running?` }));
        },
      },
    })
  );
}

app.get('/', (req, res) => res.json({
  service: 'SafeGuard API Gateway',
  docs: `http://localhost:${PORT}/api/docs`,
  endpoints: routes.map((r) => r.match),
}));

app.listen(PORT, () => {
  console.log(`\nGateway running   -> http://localhost:${PORT}`);
  console.log(`Swagger docs      -> http://localhost:${PORT}/api/docs\n`);
});
