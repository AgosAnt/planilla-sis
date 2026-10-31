// Contraseñas filtradas frecuentes de 12 o más caracteres (ADR-001). Las más cortas ya las rechaza la
// longitud mínima. Es una lista local porque el sistema corre en la LAN, sin acceso a servicios externos.
// Se comparan en minúsculas.
export const PASSWORDS_COMUNES = new Set([
  '000000000000', '111111111111', '123123123123', '123456789012', '1234567890123', '12345678901234',
  '123456789123', '123456654321', '1q2w3e4r5t6y', '1qaz2wsx3edc', 'qazwsxedcrfv', 'qwertyuiop12',
  'qwertyuiop123', 'qwerty123456', 'qwerty123qwerty', 'asdfghjkl123', 'zxcvbnm12345',
  'abcdefghijkl', 'abc123456789', 'abcd12345678', 'password1234', 'password12345', 'passw0rd1234',
  'password2025', 'password2026', 'iloveyou1234', 'welcome12345', 'letmein12345', 'changeme1234',
  'superman1234', 'football1234', 'monkey123456', 'sunshine1234', 'dragon123456', 'princesa1234',
  'teamo1234567', 'contraseña123', 'contrasena123', 'contraseña1234', 'contrasena1234', 'micontraseña1',
  'mipassword123', 'bienvenido123', 'bienvenido1234', 'temporal1234', 'administrador', 'administrador1',
  'administrador123', 'supervisor123', 'trabajador123', 'guatemala123', 'guatemala1234', 'guatemala2025',
  'guatemala2026', 'planilla2026', 'planillasis123',
]);
