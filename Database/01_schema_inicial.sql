-- Tabla de Usuarios (Trabajadores de campo, Supervisores, Admin)
CREATE TABLE Usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    rol VARCHAR(50) NOT NULL, -- 'TRABAJADOR', 'SUPERVISOR', 'ADMIN'
    tarifa_hora NUMERIC(10, 2) DEFAULT 0.00
);

-- Tabla de Rutas (Asignaciones de campo)
CREATE TABLE Rutas (
    id_ruta SERIAL PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    ubicacion VARCHAR(255)
);

-- Tabla de Jornadas (Registro de entrada y salida)
CREATE TABLE Jornadas (
    id_jornada SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    id_ruta INT REFERENCES Rutas(id_ruta) ON DELETE SET NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_entrada TIMESTAMP NOT NULL,
    hora_salida TIMESTAMP,
    latitud_entrada NUMERIC(10,8),
    longitud_entrada NUMERIC(11,8),
    latitud_salida NUMERIC(10,8),
    longitud_salida NUMERIC(11,8),
    estado VARCHAR(50) DEFAULT 'EN_RUTA' -- 'PROGRAMADA', 'EN_RUTA', 'EN_PAUSA', 'FINALIZADA', 'APROBADA'
);

-- Tabla de Eventos de Descanso (Almuerzos o pausas para restar al total trabajado)
CREATE TABLE Eventos_Descanso (
    id_evento SERIAL PRIMARY KEY,
    id_jornada INT REFERENCES Jornadas(id_jornada) ON DELETE CASCADE,
    tipo_evento VARCHAR(100), -- 'ALMUERZO', 'PAUSA_TECNICA'
    hora_inicio TIMESTAMP NOT NULL,
    hora_fin TIMESTAMP
);

-- Tabla de Planillas (Cálculo de pagos finales)
CREATE TABLE Planillas (
    id_planilla SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    periodo VARCHAR(50), -- Ej: 'SEMANA_1_SEP_2026'
    horas_normales NUMERIC(5, 2) DEFAULT 0.00,
    horas_extras NUMERIC(5, 2) DEFAULT 0.00,
    total_pago NUMERIC(10, 2) DEFAULT 0.00,
    estado_aprobacion VARCHAR(50) DEFAULT 'PENDIENTE' -- 'PENDIENTE', 'PAGADA'
);