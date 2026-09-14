package com.planillasis.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.database.Cursor;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "PlanillaLocal.db";
    private static final int DATABASE_VERSION = 1;

    // Nombre de la tabla y columnas
    public static final String TABLE_REGISTROS = "registros";
    public static final String COL_ID = "id";
    public static final String COL_TIPO = "tipo_registro"; // ENTRADA, SALIDA, EMERGENCIA
    public static final String COL_FECHA = "fecha_hora";
    public static final String COL_LATITUD = "latitud";
    public static final String COL_LONGITUD = "longitud";
    public static final String COL_SINCRONIZADO = "sincronizado"; // 0 = Offline, 1 = Enviado

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        // Crear la tabla local
        String createTable = "CREATE TABLE " + TABLE_REGISTROS + " (" +
                COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                COL_TIPO + " TEXT, " +
                COL_FECHA + " TEXT, " +
                COL_LATITUD + " REAL, " +
                COL_LONGITUD + " REAL, " +
                COL_SINCRONIZADO + " INTEGER DEFAULT 0)";
        db.execSQL(createTable);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_REGISTROS);
        onCreate(db);
    }

    // Método para guardar un registro
    public boolean insertarRegistro(String tipo, String fecha, double lat, double lon) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues contentValues = new ContentValues();
        contentValues.put(COL_TIPO, tipo);
        contentValues.put(COL_FECHA, fecha);
        contentValues.put(COL_LATITUD, lat);
        contentValues.put(COL_LONGITUD, lon);

        long result = db.insert(TABLE_REGISTROS, null, contentValues);
        return result != -1; // Retorna true si se guardó correctamente
    }

    // Método para obtener los registros que aún no se han enviado (Modo Offline)
    public Cursor obtenerRegistrosPendientes() {
        SQLiteDatabase db = this.getReadableDatabase();
        // Busca todos los registros donde la columna SINCRONIZADO sea igual a 0
        return db.rawQuery("SELECT * FROM " + TABLE_REGISTROS + " WHERE " + COL_SINCRONIZADO + " = 0", null);
    }

    // Método para marcar un registro como enviado y que no se vuelva a enviar
    public void marcarComoSincronizado(int id) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_SINCRONIZADO, 1);
        db.update(TABLE_REGISTROS, values, COL_ID + " = ?", new String[]{String.valueOf(id)});
    }

    // Devuelve el tipo del último registro (ENTRADA o SALIDA), ignorando emergencias
    public String obtenerUltimoEstado() {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery(
                "SELECT " + COL_TIPO + " FROM " + TABLE_REGISTROS +
                        " WHERE " + COL_TIPO + " != 'EMERGENCIA'" +
                        " ORDER BY " + COL_ID + " DESC LIMIT 1", null);

        String ultimoTipo = null;
        if (cursor != null && cursor.moveToFirst()) {
            ultimoTipo = cursor.getString(cursor.getColumnIndex(COL_TIPO));
        }
        if (cursor != null) cursor.close();
        return ultimoTipo; // "ENTRADA", "SALIDA", o null si nunca ha marcado nada
    }
}