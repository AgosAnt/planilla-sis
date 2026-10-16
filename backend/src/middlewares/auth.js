import jwt from 'jsonwebtoken';

export const autenticarToken = (req, res, next) => {
  // 1. Obtener el encabezado de autorización
  const authHeader = req.headers['authorization'];
  
  // 2. Extraer el token (formato: "Bearer <token>")
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Acceso denegado', 
      detalle: 'No se proporcionó un token de autenticación.' 
    });
  }

  try {
    // 3. Verificar el token usando la clave secreta
    const secret = process.env.JWT_SECRET || 'secreto_dev';
    const usuarioDecodificado = jwt.verify(token, secret);
    
    // 4. Inyectar la información del usuario en la request
    req.usuario = usuarioDecodificado;
    
    // 5. Continuar con el siguiente middleware o controlador
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Acceso denegado', 
      detalle: 'El token es inválido o ha expirado.' 
    });
  }
};
