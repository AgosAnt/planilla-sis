import * as registrosService from './registros.service.js';

export const obtenerRegistros = async (req, res) => {
  try {
    const registros = await registrosService.listarRegistros();
    res.status(200).json(registros);
  } catch (error) {
    console.error('[Error obtenerRegistros]:', error);
    res.status(500).json({ error: 'Error al consultar registros', detalle: error.message });
  }
};

export const crearRegistro = async (req, res) => {
  try {
    const { usuarioId } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ error: 'Falta el campo usuarioId en el body' });
    }

    const nuevoRegistro = await registrosService.registrarIngreso(usuarioId);
    res.status(201).json(nuevoRegistro);
  } catch (error) {
    console.error('[Error crearRegistro]:', error);
    const status = error.status || 500;
    res.status(status).json({ 
      error: 'Error al registrar ingreso', 
      detalle: error.message 
    });
  }
};

export const marcarSalida = async (req, res) => {
  try {
    const { id } = req.params;
    const registro = await registrosService.registrarSalida(id);
    res.status(200).json(registro);
  } catch (error) {
    console.error('[Error marcarSalida]:', error);
    const status = error.status || 500;
    res.status(status).json({ 
      error: 'Error al registrar salida', 
      detalle: error.message 
    });
  }
};

export const asignarRuta = async (req, res) => {
  try {
    const { id } = req.params;
    const { rutaId } = req.body;

    if (!rutaId) {
      return res.status(400).json({ error: 'Falta el campo rutaId en el body' });
    }

    const registro = await registrosService.asignarRutaAJornada(id, rutaId);
    res.status(200).json(registro);
  } catch (error) {
    console.error('[Error asignarRuta]:', error);
    const status = error.status || 500;
    res.status(status).json({ 
      error: 'Error al asignar la ruta a la jornada', 
      detalle: error.message 
    });
  }
};