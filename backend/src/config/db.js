import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Sin valores por defecto: las credenciales viven solo en backend/.env (CONTRIBUTING §5 y §8).
if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL en backend/.env');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export { pool };
export default pool;
