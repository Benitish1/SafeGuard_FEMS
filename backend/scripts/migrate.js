// Runs database/schema.sql against the configured PostgreSQL database.
import '../shared/env.js';
import { pool } from '../shared/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '..', '..', 'database', 'schema.sql');

(async () => {
  try {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Applying schema from', schemaPath);
    await pool.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
