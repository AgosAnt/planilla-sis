const express = require('express');
const router = express.Router();
const registrosController = require('./registros.controller');
const authenticate = require('../../middlewares/auth.middleware');

router.post('/registros-tiempo/ingreso', authenticate, (req, res, next) => registrosController.ingreso(req, res, next));
router.post('/registros-tiempo/:id/descansos', authenticate, (req, res, next) => registrosController.descanso(req, res, next));
router.patch('/registros-tiempo/:id/salida', authenticate, (req, res, next) => registrosController.salida(req, res, next));
router.post('/eventos:batch', authenticate, (req, res, next) => registrosController.syncBatch(req, res, next));

module.exports = router;