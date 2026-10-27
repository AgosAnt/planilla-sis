import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { conClaims } from '../../config/db.js';
import { jwtConfig } from '../../config/jwt.js';
import {
    DURACION_ACCESS_SEG,
    DURACION_REFRESH_SEG,
    GRACIA_ROTACION_SEG,
    DURACION_REAUTH_SEG,
    INTENTOS_ANTES_DE_BLOQUEO,
    BLOQUEO_MAXIMO_MIN,
} from '../../config/sesion.js';
import { ZONA_OPERACION } from '../../config/negocio.js';
import { crearError } from '../../middlewares/errorHandler.js';
import { recordarSesionCerrada } from '../../middlewares/auth.js';
import { registrarAuditoria } from '../auditoria/auditoria.repository.js';
import * as authRepo from './auth.repository.js';
import { motivoPasswordDebil } from './politicaPassword.js';

// Hash de relleno: si el correo no existe se compara igual, para no revelar por tiempo de respuesta
// qué correos están registrados (E-1).
const HASH_RELLENO = bcrypt.hashSync(randomUUID(), 10);

// Correos que no existen: se cuentan en memoria con la misma regla que perfiles.intentos_fallidos, para que
// el bloqueo (423) tampoco revele qué correos están registrados. Se reinicia con el backend.
const fallosCorreoDesconocido = new Map();
const MAX_CORREOS_DESCONOCIDOS = 10000;

const minutosDeBloqueo = (intentos) =>
    intentos < INTENTOS_ANTES_DE_BLOQUEO
        ? 0
        : Math.min(2 ** Math.min(intentos - INTENTOS_ANTES_DE_BLOQUEO, 10), BLOQUEO_MAXIMO_MIN);

const registrarFalloCorreoDesconocido = (email) => {
    if (fallosCorreoDesconocido.size >= MAX_CORREOS_DESCONOCIDOS) fallosCorreoDesconocido.clear();
    const intentos = (fallosCorreoDesconocido.get(email)?.intentos ?? 0) + 1;
    const minutos = minutosDeBloqueo(intentos);
    fallosCorreoDesconocido.set(email, {
        intentos,
        bloqueadoHasta: minutos ? new Date(Date.now() + minutos * 60000) : null,
    });
};

// Suma el intento y, si la cuenta queda bloqueada, la base lo deja en la auditoría (sin contraseñas).
// Se hace en una función de M010 porque, sin sesión, el RLS no deja escribir en perfiles ni en auditoria.
const registrarFallo = (perfilId) =>
    authRepo.registrarResultadoLogin(perfilId, false, INTENTOS_ANTES_DE_BLOQUEO, BLOQUEO_MAXIMO_MIN);

const reiniciarIntentos = (perfilId) =>
    authRepo.registrarResultadoLogin(perfilId, true, INTENTOS_ANTES_DE_BLOQUEO, BLOQUEO_MAXIMO_MIN);

const estaBloqueado = (hasta) => Boolean(hasta) && new Date(hasta) > new Date();

// Login: 423 (cuenta bloqueada). Reauth y cambio de contraseña: 429. Ambos con Retry-After en segundos.
const errorDeBloqueo = (status, code, hasta) => {
    const segundos = Math.max(1, Math.ceil((new Date(hasta).getTime() - Date.now()) / 1000));
    const error = crearError(status, code, `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(segundos / 60)} min.`);
    error.headers = { 'Retry-After': String(segundos) };
    return error;
};

const aUsuario = (fila) => ({
    id: fila.id,
    email: fila.email,
    nombres: fila.nombres,
    apellidos: fila.apellidos,
    rol: fila.rol,
    debe_cambiar_password: fila.debe_cambiar_password,
});

// Access token: sub = perfiles.id (RLS de M008); jti = id de la sesión (familia de sesiones_refresh), estable al
// renovar, así el token CSRF y la reautenticación siguen sirviendo. dcp marca una contraseña temporal: hasta
// cambiarla, autenticarToken solo permite /me y /auth/password.
const firmarAccess = (usuario, sesionId) =>
    jwt.sign(
        { sub: usuario.id, email: usuario.email, rol: usuario.rol, ...(usuario.debe_cambiar_password && { dcp: true }) },
        jwtConfig.secret,
        {
            algorithm: jwtConfig.algorithm,
            expiresIn: DURACION_ACCESS_SEG,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience,
            jwtid: sesionId
        }
    );

// Refresh token opaco (no es un JWT): 32 bytes al azar. En la base solo queda su SHA-256.
const hashRefresh = (token) => createHash('sha256').update(token).digest('hex');
const nuevoRefresh = () => {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: hashRefresh(token), expiraAt: new Date(Date.now() + DURACION_REFRESH_SEG * 1000) };
};

// Devuelve { usuario, token, jti, expiraEn, refreshToken, refreshExpiraEn }. El controlador decide si los tokens van
// en cookies (web) o en el cuerpo (móvil). contexto = { ip, userAgent } para identificar el dispositivo de la sesión.
export const iniciarSesion = async (email, password, contexto = {}) => {
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        throw crearError(400, 'CREDENCIALES_REQUERIDAS', 'email y password son obligatorios');
    }

    // 1. Buscar al usuario activo en perfiles (los correos se guardan en minúsculas, ver usuarios.service)
    const correo = email.trim().toLowerCase();
    const fila = await authRepo.buscarActivoPorEmail(correo);

    // 2. Cuenta bloqueada por intentos fallidos (ADR-001): ni siquiera se revisa la contraseña
    const bloqueadoHasta = fila ? fila.bloqueado_hasta : fallosCorreoDesconocido.get(correo)?.bloqueadoHasta;
    if (estaBloqueado(bloqueadoHasta)) {
        throw errorDeBloqueo(423, 'CUENTA_BLOQUEADA', bloqueadoHasta);
    }

    // 3. Mismo mensaje y mismo trabajo para correo inexistente y contraseña incorrecta
    const esValida = await bcrypt.compare(password, fila?.password_hash ?? HASH_RELLENO);
    if (!fila || !esValida) {
        if (fila) {
            await registrarFallo(fila.id);
        } else {
            registrarFalloCorreoDesconocido(correo);
        }
        throw crearError(401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas');
    }
    await reiniciarIntentos(fila.id);

    // 4. Abrir la sesión (familia en sesiones_refresh) y emitir el access token con su id como jti
    const sesionId = randomUUID();
    const refresh = nuevoRefresh();
    await conClaims({ id: fila.id, rol: fila.rol }, (client) =>
        authRepo.crearSesionRefresh(client, {
            id: sesionId,
            perfilId: fila.id,
            tokenHash: refresh.hash,
            expiraAt: refresh.expiraAt,
            ip: contexto.ip ?? null,
            userAgent: contexto.userAgent?.slice(0, 500) ?? null,
        }));

    return {
        usuario: aUsuario(fila),
        token: firmarAccess(fila, sesionId),
        jti: sesionId,
        expiraEn: DURACION_ACCESS_SEG,
        refreshToken: refresh.token,
        refreshExpiraEn: DURACION_REFRESH_SEG,
    };
};

// POST /auth/refresh: rota el refresh token (M011) y emite un access token nuevo de la misma sesión.
// Reusar un refresh ya rotado cierra todas las sesiones del usuario (ADR-001); dos pestañas que renuevan a la vez
// reciben 409 dentro de GRACIA_ROTACION_SEG, y la segunda solo repite su petición con la cookie nueva.
export const renovarSesion = async (refreshToken, contexto = {}) => {
    if (typeof refreshToken !== 'string' || !refreshToken || refreshToken.length > 200) {
        throw crearError(401, 'REFRESH_INVALIDO', 'La sesión venció; vuelve a iniciar sesión.');
    }
    const nuevo = nuevoRefresh();
    const fila = await authRepo.rotarSesionRefresh({
        tokenHash: hashRefresh(refreshToken),
        nuevoHash: nuevo.hash,
        expiraAt: nuevo.expiraAt,
        graciaSeg: GRACIA_ROTACION_SEG,
        ip: contexto.ip ?? null,
        userAgent: contexto.userAgent?.slice(0, 500) ?? null,
    });

    switch (fila.resultado) {
        case 'OK': {
            const usuario = { ...fila, id: fila.perfil_id };
            return {
                usuario: aUsuario(usuario),
                token: firmarAccess(usuario, fila.familia_id),
                jti: fila.familia_id,
                expiraEn: DURACION_ACCESS_SEG,
                refreshToken: nuevo.token,
                refreshExpiraEn: DURACION_REFRESH_SEG,
            };
        }
        case 'CONCURRENTE':
            throw crearError(409, 'REFRESH_CONCURRENTE', 'La sesión ya se renovó en otra pestaña; repite la petición.');
        case 'REUSO':
            recordarSesionCerrada(fila.familia_id);
            throw crearError(401, 'REFRESH_REUTILIZADO', 'Por seguridad se cerraron todas tus sesiones; vuelve a iniciar sesión.');
        default: // INVALIDO, EXPIRADO, REVOCADO, INACTIVO
            throw crearError(401, 'REFRESH_INVALIDO', 'La sesión venció; vuelve a iniciar sesión.');
    }
};

// POST /auth/logout: revoca el refresh de esta sesión y deja de aceptar su access token
export const cerrarSesion = async (usuario) => {
    if (usuario.sesionId) {
        await conClaims(usuario, (client) => authRepo.revocarFamilia(client, usuario.sesionId));
    }
    recordarSesionCerrada(usuario.sesionId);
};

// Confirma la contraseña del usuario de la sesión. Un error cuenta como intento fallido; responde 403 y no 401,
// porque la web interpreta 401 como sesión vencida y sacaría al usuario.
const verificarPasswordPropia = async (usuario, password) => {
    if (typeof password !== 'string' || !password) {
        throw crearError(400, 'PASSWORD_REQUERIDA', 'Escribe tu contraseña actual');
    }
    const credenciales = await conClaims(usuario, (client) => authRepo.buscarCredencialesPorId(client, usuario.id));
    if (!credenciales) {
        throw crearError(401, 'PERFIL_INACTIVO', 'El usuario no existe o está desactivado');
    }
    if (estaBloqueado(credenciales.bloqueado_hasta)) {
        throw errorDeBloqueo(429, 'DEMASIADOS_INTENTOS', credenciales.bloqueado_hasta);
    }
    if (!(await bcrypt.compare(password, credenciales.password_hash))) {
        await registrarFallo(usuario.id);
        throw crearError(403, 'PASSWORD_INCORRECTA', 'La contraseña no es correcta');
    }
    await reiniciarIntentos(usuario.id);
    return credenciales;
};

// POST /auth/reauth: token corto para aprobar planillas y registrar pagos (middleware requerirReautenticacion).
// Queda atado a la sesión actual (sid) y tiene su propia audiencia, así que no sirve como access token.
export const reautenticar = async (usuario, password) => {
    await verificarPasswordPropia(usuario, password);
    const reauthToken = jwt.sign(
        { sub: usuario.id, tipo: 'reauth', sid: usuario.sesionId },
        jwtConfig.secret,
        {
            algorithm: jwtConfig.algorithm,
            expiresIn: DURACION_REAUTH_SEG,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audienceReauth,
            jwtid: randomUUID()
        }
    );
    return { reauth_token: reauthToken, expira_en: DURACION_REAUTH_SEG };
};

// POST /auth/password: cambia la contraseña propia con la política de ADR-001 y quita la marca de temporal.
export const cambiarPassword = async (usuario, datos) => {
    const { password_actual: actual, password_nueva: nueva } = datos ?? {};
    if (typeof nueva !== 'string' || !nueva) {
        throw crearError(400, 'PASSWORD_REQUERIDA', 'password_actual y password_nueva son obligatorias');
    }
    const credenciales = await verificarPasswordPropia(usuario, actual);

    const motivo = motivoPasswordDebil(nueva, { actual, email: credenciales.email });
    if (motivo) {
        throw crearError(422, 'PASSWORD_DEBIL', motivo);
    }

    const passwordHash = await bcrypt.hash(nueva, 10);
    // Con la contraseña nueva se cierran todas las sesiones (también las de otros dispositivos)
    await conClaims(usuario, async (client) => {
        await authRepo.actualizarPassword(client, usuario.id, passwordHash);
        await authRepo.revocarSesionesDe(client, usuario.id);
        await registrarAuditoria(client, {
            actor: usuario,
            entidad: 'perfiles',
            entidadId: usuario.id,
            accion: 'UPDATE',
            datosDespues: { campo: 'password' },
        });
    });
    recordarSesionCerrada(usuario.sesionId);
};

const aAsignacion = (fila, puntos) => ({
    id: fila.id,
    fecha_inicio: fila.fecha_inicio,
    fecha_fin: fila.fecha_fin,
    ruta: { id: fila.ruta_id, codigo: fila.ruta_codigo, nombre: fila.ruta_nombre, puntos },
    turno_hoy: fila.turno_nombre
        ? { nombre: fila.turno_nombre, hora_inicio: fila.turno_hora_inicio, hora_fin: fila.turno_hora_fin }
        : null,
});

// GET /me: datos frescos de la BD; un perfil desactivado después del login deja de ser válido.
// Para un trabajador incluye su asignación activa (la app móvil necesita su id para registrar el ingreso),
// los puntos de la geocerca de su ruta y la jornada que tenga abierta en el servidor.
export const obtenerPerfil = (usuario) =>
    conClaims(usuario, async (client) => {
        const fila = await authRepo.buscarActivoPorId(client, usuario.id);
        if (!fila) {
            throw crearError(401, 'PERFIL_INACTIVO', 'El usuario no existe o está desactivado');
        }
        if (fila.rol !== 'trabajador') {
            return { ...aUsuario(fila), asignacion_activa: null, jornada_abierta: null };
        }
        const asignacion = await authRepo.buscarAsignacionVigente(client, usuario.id, ZONA_OPERACION);
        const puntos = asignacion ? await authRepo.buscarPuntosRuta(client, asignacion.ruta_id) : [];
        return {
            ...aUsuario(fila),
            asignacion_activa: asignacion ? aAsignacion(asignacion, puntos) : null,
            jornada_abierta: await authRepo.buscarJornadaAbierta(client, usuario.id),
        };
    });
