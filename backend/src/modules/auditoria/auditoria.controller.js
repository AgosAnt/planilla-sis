import * as auditoriaService from './auditoria.service.js';

export const obtenerAuditoria = async (req, res, next) => {
  try {
    const pagina = await auditoriaService.listarAuditoria(req.usuario, req.filtros, req.paginacion);
    res.status(200).json(pagina);
  } catch (error) {
    next(error);
  }
};
