import * as rutasRepo from './rutas.repository.js';

export const listarRutas = async () => {
  const filas = await rutasRepo.obtenerRutas();

  return filas.map((fila) => ({
    id: fila.id_ruta,
    descripcion: fila.descripcion,
    ubicacion: fila.ubicacion,
  }));
};

export const crearRuta = async ({ descripcion, ubicacion }) => {
  if (!descripcion && !ubicacion) {
    const error = new Error('Se requiere al menos la descripción o la ubicación de la ruta');
    error.status = 400;
    throw error;
  }

  const nuevaRuta = await rutasRepo.crearRuta(descripcion, ubicacion);

  return {
    id: nuevaRuta.id_ruta,
    descripcion: nuevaRuta.descripcion,
    ubicacion: nuevaRuta.ubicacion,
  };
};