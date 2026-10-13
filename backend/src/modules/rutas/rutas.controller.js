const express = require('express');
const router = express.Router();
const rutasController = require('./rutas.controller');
const authenticate = require('../../middlewares/auth.middleware');

router.post('/rutas/:rutaId/asignaciones', authenticate, (req, res, next) => {
  return rutasController.asignarTrabajador(req, res, next);
});

router.post('/acuerdos-turno/:id/confirmar', authenticate, (req, res, next) => {
  return rutasController.confirmarAcuerdo(req, res, next);
});

module.exports = router;