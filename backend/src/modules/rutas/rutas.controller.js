import * as rutasService from './rutas.service.js';

export const obtenerRutas = async (req, res) => {
  try {
    const rutas = await rutasService.listarRutas();
    res.status(200).json(rutas);
  } catch (error) {
    console.error('[Error obtenerRutas]:', error);
    res.status(500).json({ error: 'Error al consultar rutas', detalle: error.message });
  }
};

export const crearRuta = async (req, res) => {
  try {
    const nuevaRuta = await rutasService.crearRuta(req.body);
    res.status(201).json(nuevaRuta);
  } catch (error) {
    console.error('[Error crearRuta]:', error);
    const status = error.status || 500;
    res.status(status).json({ 
      error: 'Error al crear la ruta', 
      detalle: error.message 
    });
  }
};