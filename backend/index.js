const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 1. Configuración de PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'planilla_sis_db',
    password: 'PSLsis2*',
    port: 5432,
});

// Ruta principal para verificar conexión desde el navegador
app.get('/', (req, res) => {
    res.send('¡Servidor de Planilla Asis funcionando al 100%!');
});

// 2. Ruta para recibir datos de Android
app.post('/api/registros', async (req, res) => {
    // Extraemos los datos del JSON que envía Android
    const { tipo_registro, fecha_hora, latitud, longitud } = req.body;
    
    // Por ahora, forzamos el ID del usuario de prueba que creamos en SQL
    const id_usuario = 1; 
    const id_ruta = 1;

    console.log(`📡 Recibido: ${tipo_registro} a las ${fecha_hora}`);

    try {
        if (tipo_registro === 'ENTRADA') {
            const query = `
                INSERT INTO Jornadas (id_usuario, id_ruta, hora_entrada, latitud_entrada, longitud_entrada)
                VALUES ($1, $2, $3, $4, $5) RETURNING *
            `;
            const result = await pool.query(query, [id_usuario, id_ruta, fecha_hora, latitud, longitud]);
            res.status(201).json({ mensaje: 'Entrada guardada en DB', datos: result.rows[0] });
        } 
        
        else if (tipo_registro === 'SALIDA') {
            // Buscamos la jornada abierta de este usuario y la cerramos
            const query = `
                UPDATE Jornadas 
                SET hora_salida = $1, latitud_salida = $2, longitud_salida = $3, estado = 'FINALIZADA'
                WHERE id_usuario = $4 AND hora_salida IS NULL 
                RETURNING *
            `;
            const result = await pool.query(query, [fecha_hora, latitud, longitud, id_usuario]);
            res.status(200).json({ mensaje: 'Salida actualizada en DB', datos: result.rows[0] });
        } 
        
        else if (tipo_registro === 'EMERGENCIA') {
            const query = `
                INSERT INTO Eventos_Ruta (id_usuario, tipo_evento, fecha_hora, latitud, longitud)
                VALUES ($1, 'EMERGENCIA', $2, $3, $4) RETURNING *
            `;
            const result = await pool.query(query, [id_usuario, fecha_hora, latitud, longitud]);
            res.status(201).json({ mensaje: '🚨 Emergencia registrada en DB', datos: result.rows[0] });
        }

    } catch (error) {
        console.error('❌ Error de Base de Datos:', error);
        res.status(500).json({ error: 'Error guardando en PostgreSQL' });
    }
});

// 3. Encender el servidor (0.0.0.0 permite que el celular lo encuentre)
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${port}`);
});