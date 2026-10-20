import express from 'express';
import * as controller from './rutas.controller.js';
import { autenticarToken } from '../../middlewares/auth.js';

const router = express.Router();

// PATCH /api/v1/asignaciones/:id
router.patch('/asignaciones/:id', autenticarToken, controller.cerrarAsignacion);

// POST /api/v1/asignaciones/:id/acuerdos
router.post('/asignaciones/:id/acuerdos', autenticarToken, controller.proponerAcuerdoTurno);

// GET /api/v1/catalogos/turnos
router.get('/catalogos/turnos', autenticarToken, controller.listarTurnos);

export default router;
