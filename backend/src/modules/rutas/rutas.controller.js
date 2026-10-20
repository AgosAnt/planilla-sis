import * as service from './rutas.service.js';

export async function cerrarAsignacion(req, res, next) {
  try {
    const resultado = await service.cerrarAsignacion(req.user, req.params.id, req.body);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function proponerAcuerdoTurno(req, res, next) {
  try {
    const resultado = await service.proponerAcuerdoTurno(req.user, req.params.id, req.body);
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
}

export async function listarTurnos(req, res, next) {
  try {
    const resultado = await service.listarTurnos(req.user);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}
