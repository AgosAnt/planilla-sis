import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../../config/db.js'; // <-- Ajusta esta ruta a donde tengas tu conexión a PostgreSQL

export const iniciarSesion = async (email, password) => {
    // 1. Buscar al usuario en la tabla perfiles
    const result = await pool.query('SELECT * FROM perfiles WHERE email = $1', [email]);
    const usuario = result.rows[0];
    
    if (!usuario) {
        throw new Error('Credenciales inválidas');
    }

    // 2. Verificar que el hash coincida con "123"
    const esValida = await bcrypt.compare(password, usuario.password_hash);
    if (!esValida) {
        throw new Error('Credenciales inválidas');
    }

    // 3. Generar el JWT con el secreto de tu .env
    const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        process.env.JWT_SECRET,
        { 
            expiresIn: '2h',
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE
        }
    );

    return token;
};