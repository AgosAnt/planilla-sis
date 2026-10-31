import { Router } from 'express';
import { obtenerAuditoria } from './auditoria.controller.js';
import { autenticarToken, requerirRol } from '../../middlewares/auth.js';
import { validarPaginacion } from '../../middlewares/validarPaginacion.js';
import { validarFiltrosAuditoria } from '../../middlewares/validarAuditoria.js';

// Montado en /api/v1/auditoria. Solo lectura: la bitácora se escribe desde cada módulo con registrarAuditoria.
const router = Router();

router.use(autenticarToken, requerirRol('administrador'));

router.get('/', validarPaginacion, validarFiltrosAuditoria, obtenerAuditoria);

export default router;
