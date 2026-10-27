package com.planillasis.app;

import java.util.Calendar;
import java.util.Locale;

// Período quincenal de pago (parámetros de pago: QUINCENAL): del 1 al 15 y del 16 al último día del mes.
// Sin dependencias de Android, para probarlo con JUnit. Usa Calendar porque java.time pide API 26 (minSdk es 24).
public final class Quincena {

    private static final String[] MESES = { "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
            "agosto", "septiembre", "octubre", "noviembre", "diciembre" };

    public final String desde; // YYYY-MM-DD
    public final String hasta;
    public final String nombre; // "16 al 30 de noviembre de 2026"

    private Quincena(int anio, int mes, boolean primera) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(anio, mes, 1);
        int inicio = primera ? 1 : 16;
        int fin = primera ? 15 : c.getActualMaximum(Calendar.DAY_OF_MONTH);
        desde = String.format(Locale.US, "%04d-%02d-%02d", anio, mes + 1, inicio);
        hasta = String.format(Locale.US, "%04d-%02d-%02d", anio, mes + 1, fin);
        nombre = inicio + " al " + fin + " de " + MESES[mes] + " de " + anio;
    }

    // La quincena que contiene la fecha
    public static Quincena de(Calendar fecha) {
        return new Quincena(fecha.get(Calendar.YEAR), fecha.get(Calendar.MONTH), fecha.get(Calendar.DAY_OF_MONTH) <= 15);
    }

    // La quincena anterior a esta (la segunda del mes pasado si esta es la primera)
    public Quincena anterior() {
        int anio = Integer.parseInt(desde.substring(0, 4));
        int mes = Integer.parseInt(desde.substring(5, 7)) - 1;
        if (desde.endsWith("-16")) return new Quincena(anio, mes, true);
        return mes == 0 ? new Quincena(anio - 1, 11, false) : new Quincena(anio, mes - 1, false);
    }
}
