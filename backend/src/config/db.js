import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Sin valores por defecto: las credenciales viven solo en backend/.env (CONTRIBUTING §5 y §8).
if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL en backend/.env');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ejecuta fn dentro de una transacción que fija los claims del usuario autenticado,
// como exige la RLS de M008 (app.jwt_claims). Sin claims, app_user ve 0 filas.
export const conClaims = async (usuario, fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.jwt_claims', $1, true)", [
      JSON.stringify({ sub: usuario.id, rol: usuario.rol }),
    ]);
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export { pool };
export default pool;
