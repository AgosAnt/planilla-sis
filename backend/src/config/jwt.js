import 'dotenv/config';

const requerida = (nombre) => {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta ${nombre} en backend/.env`);
  }
  return valor;
};

// ADR-001: el backend firma y verifica sus JWT con secreto, emisor y audiencia propios.
export const jwtConfig = {
  secret: requerida('JWT_SECRET'),
  issuer: requerida('JWT_ISSUER'),
  audience: requerida('JWT_AUDIENCE'),
  algorithm: 'HS256',
};
