import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Soporta tanto variables individuales (DB_HOST, etc.) como DATABASE_URL
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'planilla_sis',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
    });

export { pool };
export default pool;