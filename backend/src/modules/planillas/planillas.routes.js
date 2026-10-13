const express = require('express');
const router = express.Router();
const planillasController = require('./planillas.controller');
const authenticate = require('../../middlewares/auth.middleware');

router.post('/planillas/:id/calcular', authenticate, (req, res, next) => planillasController.calcular(req, res, next));
router.post('/planillas/:id/verificar', authenticate, (req, res, next) => planillasController.verificar(req, res, next));
router.post('/planillas/:id/aprobar', authenticate, (req, res, next) => planillasController.aprobar(req, res, next));
router.post('/planillas/:id/pagos', authenticate, (req, res, next) => planillasController.registrarPagos(req, res, next));

module.exports = router;