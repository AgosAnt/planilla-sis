package com.planillasis.app;

import com.google.gson.annotations.SerializedName;

import java.util.List;

// Respuesta de GET /api/v1/me (esquema Perfil del contrato)
public class Perfil {

    public String id;
    public String email;
    public String nombres;
    public String apellidos;
    public String rol;
    // Contraseña temporal (E-2b): hasta cambiarla el servidor solo deja ver el perfil, cambiarla o salir
    @SerializedName("debe_cambiar_password") public boolean debeCambiarPassword;
    @SerializedName("asignacion_activa") public AsignacionActiva asignacionActiva;
    // Jornada sin salida en el servidor (puede haberse abierto desde otro teléfono)
    @SerializedName("jornada_abierta") public JornadaAbierta jornadaAbierta;

    public static class AsignacionActiva {
        public String id;
        public Ruta ruta;
        @SerializedName("turno_hoy") public Turno turnoHoy;
    }

    public static class Ruta {
        public String id;
        public String codigo;
        public String nombre;
        // Geocerca de la ruta (ruta_puntos); vacía o null si la ruta no tiene puntos
        public List<Geocerca.Punto> puntos;
    }

    public static class JornadaAbierta {
        public String id;
        @SerializedName("ingreso_at") public String ingresoAt;
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
