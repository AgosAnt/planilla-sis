package com.planillasis.app;

import com.google.gson.annotations.SerializedName;

import java.util.List;

// Geocerca de la ruta: los puntos llegan del servidor en GET /me (ruta_puntos), así que se cambian sin
// recompilar la app. Misma fórmula (haversine) que registros.repository.js para que la app y el servidor
// coincidan. Sin dependencias de Android, para probarla con JUnit.
public final class Geocerca {

    private static final double RADIO_TIERRA_M = 6_371_000;

    public static class Punto {
        public String nombre;
        public double latitud;
        public double longitud;
        @SerializedName("radio_m") public int radioM;
    }

    public static class Resultado {
        public final boolean dentro;
        public final Punto masCercano;   // null si la ruta no tiene puntos
        public final double distanciaM;  // al punto más cercano

        Resultado(boolean dentro, Punto masCercano, double distanciaM) {
            this.dentro = dentro;
            this.masCercano = masCercano;
            this.distanciaM = distanciaM;
        }

        public boolean sinPuntos() {
            return masCercano == null;
        }
    }

    private Geocerca() {}

    // Una ruta sin puntos deja marcar: el servidor registra la ubicación y el supervisor la ve al validar
    public static Resultado evaluar(List<Punto> puntos, double latitud, double longitud) {
        if (puntos == null || puntos.isEmpty()) return new Resultado(true, null, 0);
        Punto masCercano = null;
        double menorDistancia = Double.MAX_VALUE;
        boolean dentro = false;
        for (Punto punto : puntos) {
            double distancia = distanciaM(latitud, longitud, punto.latitud, punto.longitud);
            if (distancia <= punto.radioM) dentro = true;
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                masCercano = punto;
            }
        }
        return new Resultado(dentro, masCercano, menorDistancia);
    }

    public static double distanciaM(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(a));
    }
}
