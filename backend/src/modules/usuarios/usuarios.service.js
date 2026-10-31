import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { conClaims } from '../../config/db.js';
import { crearError } from '../../middlewares/errorHandler.js';
import * as usuariosRepo from './usuarios.repository.js';
import { registrarAuditoria } from '../auditoria/auditoria.repository.js';

// Restricciones UNIQUE de perfiles (M002) -> código de conflicto para el cliente
const DUPLICADOS = {
  perfiles_email_key: ['EMAIL_DUPLICADO', 'Ya existe un usuario con ese correo'],
  perfiles_codigo_empleado_key: ['CODIGO_EMPLEADO_DUPLICADO', 'Ya existe un usuario con ese código de empleado'],
  perfiles_documento_key: ['DOCUMENTO_DUPLICADO', 'Ya existe un usuario con ese documento'],
};

const traducirDuplicado = (error) => {
  const duplicado = error.code === '23505' && DUPLICADOS[error.constraint];
  return duplicado ? crearError(409, ...duplicado) : error;
};

// 16 caracteres aleatorios (96 bits). La genera el sistema, nunca el administrador (E-2b).
const generarPasswordTemporal = () => randomBytes(12).toString('base64url');

// E-2b: alta de usuario por el administrador, con contraseña temporal de un solo uso.
export const crearUsuario = (admin, datos) =>
  conClaims(admin, async (client) => {
    const rolId = await usuariosRepo.buscarIdRol(client, datos.rol);
    if (!rolId) {
      throw crearError(422, 'ROL_INVALIDO', 'El rol no existe');
    }

    const passwordTemporal = generarPasswordTemporal();
    let perfil;
    try {
      perfil = await usuariosRepo.crearPerfil(client, {
        email: datos.email,
        passwordHash: await bcrypt.hash(passwordTemporal, 10),
        rolId,
        codigoEmpleado: datos.codigo_empleado,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        documento: datos.documento,
      });
    } catch (error) {
      throw traducirDuplicado(error);
    }

    await registrarAuditoria(client, {
      actor: admin,
      entidad: 'perfiles',
      entidadId: perfil.id,
      accion: 'INSERT',
      datosDespues: { ...perfil, rol: datos.rol },
    });

    return {
      id: perfil.id,
      email: perfil.email,
      password_temporal: passwordTemporal,
      debe_cambiar_password: perfil.debe_cambiar_password,
    };
  });

// GET /admin/usuarios: paginado, con filtros por rol, activo y texto (nombre, correo o código de empleado).
export const listarUsuarios = (admin, filtros, { page, pageSize }) =>
  conClaims(admin, async (client) => {
    const total = await usuariosRepo.contarUsuarios(client, filtros);
    const items = await usuariosRepo.listarUsuarios(client, {
      ...filtros,
      limite: pageSize,
      desplazamiento: (page - 1) * pageSize,
    });
    return { items, page, page_size: pageSize, total };
  });

export const obtenerUsuario = (admin, id) =>
  conClaims(admin, async (client) => {
    const usuario = await usuariosRepo.buscarUsuario(client, id);
    if (!usuario) {
      throw crearError(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe');
    }
    return usuario;
  });

// PATCH /admin/usuarios/{id}: solo cambia lo enviado. La baja es lógica (activo = false).
// El cambio de rol o la baja se aplican en el próximo inicio de sesión del usuario (el token vigente dura hasta 2 h).
export const actualizarUsuario = (admin, id, cambios) =>
  conClaims(admin, async (client) => {
    const actual = await usuariosRepo.buscarUsuario(client, id, { bloquear: true });
    if (!actual) {
      throw crearError(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe');
    }
    // Un administrador no puede quitarse el rol ni darse de baja: el sistema podría quedar sin administradores
    const cambiaSuAcceso = (cambios.rol !== undefined && cambios.rol !== actual.rol) || cambios.activo === false;
    if (actual.id === admin.id && cambiaSuAcceso) {
      throw crearError(422, 'OPERACION_SOBRE_SI_MISMO', 'No puedes cambiar tu propio rol ni darte de baja');
    }

    const rol = cambios.rol ?? actual.rol;
    const rolId = await usuariosRepo.buscarIdRol(client, rol);
    try {
      await usuariosRepo.actualizarUsuario(client, id, {
        nombres: cambios.nombres ?? actual.nombres,
        apellidos: cambios.apellidos ?? actual.apellidos,
        rolId,
        activo: cambios.activo ?? actual.activo,
        codigoEmpleado: cambios.codigo_empleado ?? actual.codigo_empleado,
        documento: cambios.documento ?? actual.documento,
      });
    } catch (error) {
      throw traducirDuplicado(error);
    }

    const actualizado = await usuariosRepo.buscarUsuario(client, id);
    await registrarAuditoria(client, {
      actor: admin,
      entidad: 'perfiles',
      entidadId: id,
      accion: 'UPDATE',
      datosAntes: actual,
      datosDespues: actualizado,
    });
    return actualizado;
  });
