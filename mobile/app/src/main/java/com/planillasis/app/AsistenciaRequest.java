package com.planillasis.app;

public class AsistenciaRequest {
    private int id_usuario;
    private String tipo_registro;
    private String fecha_hora;
    private double latitud;
    private double longitud;

    public AsistenciaRequest(int id_usuario, String tipo_registro, String fecha_hora, double latitud, double longitud) {
        this.id_usuario = id_usuario;
        this.tipo_registro = tipo_registro;
        this.fecha_hora = fecha_hora;
        this.latitud = latitud;
        this.longitud = longitud;
    }
}