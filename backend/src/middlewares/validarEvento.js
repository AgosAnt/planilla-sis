export const validarCrearEvento = (req, res, next) => {
  const { jornadaId, tipoEvento } = req.body;

  if (!jornadaId || isNaN(Number(jornadaId))) {
    return res.status(400).json({
      error: 'Validación fallida',
      detalle: 'El campo "jornadaId" es requerido y debe ser un número entero válido.'
    });
  }

  if (!tipoEvento || typeof tipoEvento !== 'string' || tipoEvento.trim() === '') {
    return res.status(400).json({
      error: 'Validación fallida',
      detalle: 'El campo "tipoEvento" es requerido y debe ser una cadena de texto no vacía.'
    });
  }

  next();
};
