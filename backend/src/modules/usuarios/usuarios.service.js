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
      const duplicado = error.code === '23505' && DUPLICADOS[error.constraint];
      if (duplicado) {
        throw crearError(409, ...duplicado);
      }
      throw error;
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
