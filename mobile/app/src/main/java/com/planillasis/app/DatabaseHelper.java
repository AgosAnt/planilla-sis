package com.planillasis.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

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
}