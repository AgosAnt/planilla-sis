const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- 1. Configuracion de PostgreSQL ---
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'planilla_sis_db',
    password: 'PSLsis2*',
    port: 5432,
});

// Ruta principal para verificar conexion desde el navegador
app.get('/', (req, res) => {
    res.send('Servidor funcionando');
});

// --- 2. Ruta para recibir datos de Android ---
app.post('/api/registros', async (req, res) => {
    const { tipo_registro, fecha_hora, latitud, longitud } = req.body;
    
    const id_usuario = 1; 
    const id_ruta = 1;

    // Convertir la hora UTC que manda Android a hora local de Guatemala para la terminal
    const fechaObj = new Date(fecha_hora);
    const horaLocal = fechaObj.toLocaleString('es-GT', { timeZone: 'America/Guatemala' });

    console.log(`[INFO] ---> Recibido: ${tipo_registro} a las ${horaLocal}`);

    try {
        if (tipo_registro === 'ENTRADA') {
            try {
                const query = `
                    INSERT INTO Jornadas (id_usuario, id_ruta, hora_entrada, latitud_entrada, longitud_entrada)
                    VALUES ($1, $2, $3, $4, $5) RETURNING *
                `;
                const result = await pool.query(query, [id_usuario, id_ruta, fecha_hora, latitud, longitud]);
                res.status(201).json({ mensaje: 'Entrada guardada en DB', datos: result.rows[0] });

            } catch (errorEntrada) {
                if (errorEntrada.code === '23505') {
                    console.warn(`[WARN] - Entrada duplicada evitada para usuario ${id_usuario}`);
                    return res.status(409).json({
                        error: 'Ya existe una jornada abierta para este usuario',
                        duplicado: true
                    });
                }
                throw errorEntrada; 
            }
        } 
        
        else if (tipo_registro === 'SALIDA') {
            const query = `
                UPDATE Jornadas 
                SET hora_salida = $1, latitud_salida = $2, longitud_salida = $3, estado = 'FINALIZADA'
                WHERE id_usuario = $4 AND hora_salida IS NULL 
                RETURNING *
            `;
            const result = await pool.query(query, [fecha_hora, latitud, longitud, id_usuario]);

            if (result.rows.length === 0) {
                return res.status(409).json({ error: 'No hay ninguna jornada abierta para cerrar' });
            }

            res.status(200).json({ mensaje: 'Salida actualizada en DB', datos: result.rows[0] });
        } 
        
        else if (tipo_registro === 'EMERGENCIA') {
            // 1. Buscamos el ID de la jornada que esta activa (la que no tiene salida)
            const buscarJornada = await pool.query(
                'SELECT id_jornada FROM Jornadas WHERE id_usuario = $1 AND hora_salida IS NULL',
                [id_usuario]
            );

            if (buscarJornada.rows.length === 0) {
                return res.status(400).json({ error: 'No se puede registrar emergencia sin una jornada activa' });
            }

            const id_jornada_activa = buscarJornada.rows[0].id_jornada;

            // 2. Insertamos la emergencia vinculada a ESA jornada exacta
            const query = `
                INSERT INTO Eventos_Ruta (id_jornada, tipo_evento, fecha_hora, latitud, longitud)
                VALUES ($1, 'EMERGENCIA', $2, $3, $4) RETURNING *
            `;
            const result = await pool.query(query, [id_jornada_activa, fecha_hora, latitud, longitud]);
            res.status(201).json({ mensaje: 'Emergencia registrada en DB', datos: result.rows[0] });
        }

    } catch (error) {
        console.error('[ERROR] - Error de Base de Datos:', error);
        res.status(500).json({ error: 'Error guardando en PostgreSQL' });
    }
});

// --- 3. Ruta para OBTENER el historial de jornadas (Para el Dashboard web) ---
app.get('/api/jornadas', async (req, res) => { 
    try {
        const query = `
            SELECT 
                id_jornada, 
                id_usuario, 
                -- Convertimos de UTC a GT y le damos formato 12h (AM/PM)
                TO_CHAR(hora_entrada AT TIME ZONE 'UTC' AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD HH12:MI:SS AM') AS hora_entrada,
                TO_CHAR(hora_salida AT TIME ZONE 'UTC' AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD HH12:MI:SS AM') AS hora_salida,
                estado,
                -- Calculo de horas trabajadas para la planilla
                ROUND((EXTRACT(EPOCH FROM (hora_salida - hora_entrada)) / 3600)::numeric, 2) AS horas_trabajadas
            FROM Jornadas 
            ORDER BY id_jornada DESC
        `;
        const result = await pool.query(query);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[ERROR] - Error obteniendo jornadas:', error);
        res.status(500).json({ error: 'Error al consultar la base de datos' });
    }
});

// --- 4. Encender el servidor ---
app.listen(port, '0.0.0.0', () => {
    console.log(`>>> SV corriendo en http://localhost:${port} <<<`);
});