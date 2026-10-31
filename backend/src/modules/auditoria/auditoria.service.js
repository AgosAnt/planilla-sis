import { conClaims } from '../../config/db.js';
import { ZONA_OPERACION } from '../../config/negocio.js';
import * as auditoriaRepo from './auditoria.repository.js';

// GET /auditoria: consulta de la bitácora (solo administrador, permiso auditoria.consultar de M007).
export const listarAuditoria = (admin, filtros, { page, pageSize }) =>
  conClaims(admin, async (client) => {
    const filtro = { ...filtros, zona: ZONA_OPERACION };
    const total = await auditoriaRepo.contarAuditoria(client, filtro);
    const items = await auditoriaRepo.listarAuditoria(client, {
      ...filtro,
      limite: pageSize,
      desplazamiento: (page - 1) * pageSize,
    });
    return { items, page, page_size: pageSize, total };
  });
