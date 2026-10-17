import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../../config/db.js';
import { jwtConfig } from '../../config/jwt.js';
import { crearError } from '../../middlewares/errorHandler.js';

export const iniciarSesion = async (email, password) => {
    if (!email || !password) {
        throw crearError(400, 'CREDENCIALES_REQUERIDAS', 'email y password son obligatorios');
    }

    // 1. Buscar al usuario activo en perfiles; el nombre del rol vive en la tabla roles (M002)
    const result = await pool.query(
        `SELECT p.id, p.email, p.password_hash, r.nombre AS rol
         FROM perfiles p
         JOIN roles r ON r.id = p.rol_id
         WHERE p.email = $1 AND p.activo`,
        [email]
    );
    const usuario = result.rows[0];

    // 2. Mismo mensaje para correo inexistente y contraseña incorrecta (E-1: no revelar si el correo existe)
    const esValida = usuario && await bcrypt.compare(password, usuario.password_hash);
    if (!esValida) {
        throw crearError(401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas');
    }

    // 3. Generar el JWT: sub = perfiles.id, como esperan app.usuario_actual() y la RLS de M008
    const token = jwt.sign(
        { sub: usuario.id, email: usuario.email, rol: usuario.rol },
        jwtConfig.secret,
        {
            algorithm: jwtConfig.algorithm,
            expiresIn: '2h',
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        }
    );

    return token;
};
