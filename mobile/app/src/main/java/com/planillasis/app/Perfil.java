package com.planillasis.app;

import com.google.gson.annotations.SerializedName;

// Respuesta de GET /api/v1/me (esquema Perfil del contrato)
public class Perfil {

    public String id;
    public String email;
    public String nombres;
    public String apellidos;
    public String rol;
    @SerializedName("asignacion_activa") public AsignacionActiva asignacionActiva;

    public static class AsignacionActiva {
        public String id;
        public Ruta ruta;
        @SerializedName("turno_hoy") public Turno turnoHoy;
    }

    public static class Ruta {
        public String id;
        public String codigo;
        public String nombre;
    }

    public static class Turno {
        public String nombre;
        @SerializedName("hora_inicio") public String horaInicio;
        @SerializedName("hora_fin") public String horaFin;
    }

    public String nombreCompleto() {
        return nombres + " " + apellidos;
    }
}
