import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { jwtConfig } from '../../config/jwt.js';
import { DURACION_ACCESS_SEG } from '../../config/sesion.js';
import { crearError } from '../../middlewares/errorHandler.js';
import * as authRepo from './auth.repository.js';

// Hash de relleno: si el correo no existe se compara igual, para no revelar por tiempo de respuesta
// qué correos están registrados (E-1).
const HASH_RELLENO = bcrypt.hashSync(randomUUID(), 10);

const aUsuario = (fila) => ({
    id: fila.id,
    email: fila.email,
    nombres: fila.nombres,
    apellidos: fila.apellidos,
    rol: fila.rol,
    debe_cambiar_password: fila.debe_cambiar_password,
});

// Devuelve { usuario, token, jti, expiraEn }. El controlador decide si el token va en cookie (web) o en el cuerpo (móvil).
export const iniciarSesion = async (email, password) => {
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        throw crearError(400, 'CREDENCIALES_REQUERIDAS', 'email y password son obligatorios');
    }

    // 1. Buscar al usuario activo en perfiles
    const fila = await authRepo.buscarActivoPorEmail(email);

    // 2. Mismo mensaje y mismo trabajo para correo inexistente y contraseña incorrecta
    const esValida = await bcrypt.compare(password, fila?.password_hash ?? HASH_RELLENO);
    if (!fila || !esValida) {
        throw crearError(401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas');
    }

    // 3. Generar el JWT: sub = perfiles.id (RLS de M008); jti identifica la sesión para el token CSRF
    const jti = randomUUID();
    const token = jwt.sign(
        { sub: fila.id, email: fila.email, rol: fila.rol },
        jwtConfig.secret,
        {
            algorithm: jwtConfig.algorithm,
            expiresIn: DURACION_ACCESS_SEG,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
            jwtid: jti
        }
    );

    return { usuario: aUsuario(fila), token, jti, expiraEn: DURACION_ACCESS_SEG };
};

// GET /me: datos frescos de la BD; un perfil desactivado después del login deja de ser válido.
export const obtenerPerfil = async (usuarioId) => {
    const fila = await authRepo.buscarActivoPorId(usuarioId);
    if (!fila) {
        throw crearError(401, 'PERFIL_INACTIVO', 'El usuario no existe o está desactivado');
    }
    return aUsuario(fila);
};
