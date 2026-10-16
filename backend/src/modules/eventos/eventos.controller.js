import * as eventosService from './eventos.service.js';

export const obtenerEventos = async (req, res) => {
  try {
    const eventos = await eventosService.listarEventos();
    res.status(200).json(eventos);
  } catch (error) {
    console.error('[Error obtenerEventos]:', error);
    res.status(500).json({ error: 'Error al consultar eventos', detalle: error.message });
  }
};

export const obtenerEventosPorJornada = async (req, res) => {
  try {
    const { idJornada } = req.params;
    const eventos = await eventosService.listarEventosPorJornada(idJornada);
    res.status(200).json(eventos);
  } catch (error) {
    console.error('[Error obtenerEventosPorJornada]:', error);
    const status = error.status || 500;
    res.status(status).json({ error: 'Error al consultar eventos de la jornada', detalle: error.message });
  }
};

export const crearEvento = async (req, res) => {
  try {
    const nuevoEvento = await eventosService.registrarEvento(req.body);
    res.status(201).json(nuevoEvento);
  } catch (error) {
    console.error('[Error crearEvento]:', error);
    const status = error.status || 500;
    res.status(status).json({ error: 'Error al registrar evento', detalle: error.message });
  }
};