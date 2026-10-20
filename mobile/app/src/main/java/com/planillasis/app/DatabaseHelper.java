package com.planillasis.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

// Cola local (offline-first): cada marca se guarda primero aquí y se envía al servidor de la oficina
// cuando hay conexión, de a una y en orden (Sincronizador). Versión 2: la tabla "registros" de la
// versión 1 no se borra, pero ya no se usa (su endpoint /api/registros dejó de existir).
public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "PlanillaLocal.db";
    private static final int DATABASE_VERSION = 2;

    public static final String TIPO_INGRESO = "INGRESO";
    public static final String TIPO_SALIDA = "SALIDA";
    public static final String TIPO_DESCANSO = "DESCANSO";
    public static final String TIPO_EVENTO = "EVENTO";

    public static final String PENDIENTE = "PENDIENTE";
    public static final String ENVIADO = "ENVIADO";
    public static final String RECHAZADO = "RECHAZADO";

    private static final String CREAR_COLA = "CREATE TABLE IF NOT EXISTS cola (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "trabajador_id TEXT NOT NULL, " +           // dueño de la marca: solo la envía su propia sesión
            "tipo TEXT NOT NULL, " +                    // INGRESO, SALIDA, DESCANSO o EVENTO
            "client_uuid TEXT NOT NULL UNIQUE, " +      // idempotencia: también va como Idempotency-Key
            "cuerpo TEXT NOT NULL, " +                  // JSON listo para enviar
            "ingreso_local_id INTEGER, " +              // fila INGRESO de la que depende (salida, descanso, evento)
            "registro_servidor_id TEXT, " +             // id del registro de tiempo en el servidor
            "estado TEXT NOT NULL DEFAULT 'PENDIENTE', " +
            "codigo_error TEXT, detalle_error TEXT, " +
            "intentos INTEGER NOT NULL DEFAULT 0, " +
            "creado_at TEXT NOT NULL)";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(CREAR_COLA);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) db.execSQL(CREAR_COLA);
    }

    public static class ItemCola {
        public long id;
        public String tipo;
        public String clientUuid;
        public String cuerpo;
        public Long ingresoLocalId;
        public String registroServidorId;
        public String estado;
        public String detalleError;
    }

    public long encolar(String trabajadorId, String tipo, String clientUuid, String cuerpo,
                        Long ingresoLocalId, String registroServidorId) {
        ContentValues valores = new ContentValues();
        valores.put("trabajador_id", trabajadorId);
        valores.put("tipo", tipo);
        valores.put("client_uuid", clientUuid);
        valores.put("cuerpo", cuerpo);
        if (ingresoLocalId != null) valores.put("ingreso_local_id", ingresoLocalId);
        if (registroServidorId != null) valores.put("registro_servidor_id", registroServidorId);
        valores.put("creado_at", ahora());
        return getWritableDatabase().insert("cola", null, valores);
    }

    // La jornada se abrió en el servidor sin una fila local (reinstalación u otro teléfono): se agrega
    // como INGRESO ya enviado para que la salida y los descansos sepan a qué registro van.
    public long registrarJornadaDelServidor(String trabajadorId, String registroServidorId) {
        ContentValues valores = new ContentValues();
        valores.put("trabajador_id", trabajadorId);
        valores.put("tipo", TIPO_INGRESO);
        valores.put("client_uuid", "servidor-" + registroServidorId);
        valores.put("cuerpo", "{}");
        valores.put("registro_servidor_id", registroServidorId);
        valores.put("estado", ENVIADO);
        valores.put("creado_at", ahora());
        return getWritableDatabase().insertWithOnConflict("cola", null, valores, SQLiteDatabase.CONFLICT_IGNORE);
    }

    public ItemCola siguientePendiente(String trabajadorId) {
        return uno("SELECT * FROM cola WHERE trabajador_id = ? AND estado = ? ORDER BY id LIMIT 1",
                trabajadorId, PENDIENTE);
    }

    // Último INGRESO no rechazado sin una SALIDA posterior no rechazada: la jornada abierta
    public ItemCola jornadaAbierta(String trabajadorId) {
        ItemCola ultimo = uno("SELECT * FROM cola WHERE trabajador_id = ? AND tipo IN (?, ?) AND estado <> ? " +
                "ORDER BY id DESC LIMIT 1", trabajadorId, TIPO_INGRESO, TIPO_SALIDA, RECHAZADO);
        return ultimo != null && TIPO_INGRESO.equals(ultimo.tipo) ? ultimo : null;
    }

    public ItemCola porId(long id) {
        return uno("SELECT * FROM cola WHERE id = ?", String.valueOf(id));
    }

    public ItemCola ultimoRechazado(String trabajadorId) {
        return uno("SELECT * FROM cola WHERE trabajador_id = ? AND estado = ? ORDER BY id DESC LIMIT 1",
                trabajadorId, RECHAZADO);
    }

    public int contar(String trabajadorId, String estado) {
        try (Cursor c = getReadableDatabase().rawQuery(
                "SELECT count(*) FROM cola WHERE trabajador_id = ? AND estado = ?", new String[] { trabajadorId, estado })) {
            return c.moveToFirst() ? c.getInt(0) : 0;
        }
    }

    public void marcarEnviado(long id, String registroServidorId) {
        ContentValues valores = new ContentValues();
        valores.put("estado", ENVIADO);
        if (registroServidorId != null) valores.put("registro_servidor_id", registroServidorId);
        getWritableDatabase().update("cola", valores, "id = ?", new String[] { String.valueOf(id) });
    }

    public void marcarRechazado(long id, String codigo, String detalle) {
        ContentValues valores = new ContentValues();
        valores.put("estado", RECHAZADO);
        valores.put("codigo_error", codigo);
        valores.put("detalle_error", detalle);
        getWritableDatabase().update("cola", valores, "id = ?", new String[] { String.valueOf(id) });
    }

    public void sumarIntento(long id) {
        getWritableDatabase().execSQL("UPDATE cola SET intentos = intentos + 1 WHERE id = ?", new Object[] { id });
    }

    private ItemCola uno(String sql, String... argumentos) {
        try (Cursor c = getReadableDatabase().rawQuery(sql, argumentos)) {
            if (!c.moveToFirst()) return null;
            ItemCola item = new ItemCola();
            item.id = c.getLong(c.getColumnIndexOrThrow("id"));
            item.tipo = c.getString(c.getColumnIndexOrThrow("tipo"));
            item.clientUuid = c.getString(c.getColumnIndexOrThrow("client_uuid"));
            item.cuerpo = c.getString(c.getColumnIndexOrThrow("cuerpo"));
            int ingreso = c.getColumnIndexOrThrow("ingreso_local_id");
            item.ingresoLocalId = c.isNull(ingreso) ? null : c.getLong(ingreso);
            item.registroServidorId = c.getString(c.getColumnIndexOrThrow("registro_servidor_id"));
            item.estado = c.getString(c.getColumnIndexOrThrow("estado"));
            item.detalleError = c.getString(c.getColumnIndexOrThrow("detalle_error"));
            return item;
        }
    }

    private static String ahora() {
        SimpleDateFormat formato = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        formato.setTimeZone(TimeZone.getTimeZone("UTC"));
        return formato.format(new Date());
    }
}
