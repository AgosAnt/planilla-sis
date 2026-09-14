package com.planillasis.app;

public class Registro {
    // Variables pasadas automáticamente en JSON (ej: {"tipo_registro": "ENTRADA", ...})
    private String tipo_registro;
    private String fecha_hora;
    private double latitud;
    private double longitud;

    // Constructor
    public Registro(String tipo_registro, String fecha_hora, double latitud, double longitud) {
        this.tipo_registro = tipo_registro;
        this.fecha_hora = fecha_hora;
        this.latitud = latitud;
        this.longitud = longitud;
    }

    // Getters y Setters
    public String getTipo_registro() { return tipo_registro; }
    public String getFecha_hora() { return fecha_hora; }
    public double getLatitud() { return latitud; }
    public double getLongitud() { return longitud; }
}