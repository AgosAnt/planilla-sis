const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.psis_access) {
    token = req.cookies.psis_access;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      type: 'about:blank',
      title: 'No autorizado',
      status: 401,
      detail: 'No se proporcionó un token de sesión válido',
      code: 'UNAUTHORIZED'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto_desarrollo_local_123', {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

    req.user = {
      id: decoded.sub,
      rol: decoded.rol,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      type: 'about:blank',
      title: 'Token inválido o expirado',
      status: 401,
      detail: 'La sesión ha expirado o el token no es válido',
      code: 'TOKEN_INVALID'
    });
  }
}

module.exports = authenticate;