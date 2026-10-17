import { esUuid } from './validadores.js';

// Contrato (components/parameters/IdempotencyKey): los POST del móvil exigen Idempotency-Key (uuid).
// La deduplicación real se hace con client_uuid y las restricciones UNIQUE de M004.
export const requerirIdempotencyKey = (req, res, next) => {
  if (!esUuid(req.get('Idempotency-Key'))) {
    return res.status(400).type('application/problem+json').json({
      type: 'about:blank',
      title: 'Validación fallida',
      status: 400,
      detail: 'La cabecera "Idempotency-Key" es requerida y debe ser un UUID.',
      code: 'IDEMPOTENCY_KEY_INVALIDA',
    });
  }
  next();
};
