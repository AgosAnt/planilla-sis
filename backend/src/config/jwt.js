import 'dotenv/config';

const requerida = (nombre) => {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta ${nombre} en backend/.env`);
  }
  return valor;
};

// ADR-001: el backend firma y verifica sus JWT con secreto, emisor y audiencia propios.
const audience = requerida('JWT_AUDIENCE');

export const jwtConfig = {
  secret: requerida('JWT_SECRET'),
  issuer: requerida('JWT_ISSUER'),
  audience,
  // Audiencia propia del token de reautenticación: así no se puede usar como access token ni al revés
  audienceReauth: `${audience}:reauth`,
  algorithm: 'HS256',
};
