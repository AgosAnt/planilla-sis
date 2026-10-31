package com.planillasis.app;

import java.io.IOException;

import retrofit2.Response;

// Mensajes para el trabajador a partir de una respuesta de error de la API (problem+json), para las pantallas
// de Mi cálculo, Mis turnos y Cambiar contraseña.
final class RespuestaApi {

    private RespuestaApi() {}

    // { code, detail } del cuerpo de error; null si no se puede leer
    static String[] problema(Response<?> respuesta) {
        try {
            return respuesta.errorBody() != null ? ClasificadorRespuesta.problema(respuesta.errorBody().string()) : null;
        } catch (IOException e) {
            return null;
        }
    }

    static String mensaje(Response<?> respuesta, String[] problema) {
        if (respuesta.code() == 401) return "Tu sesión venció. Vuelve a la pantalla principal para iniciar sesión.";
        if (problema != null && problema[1] != null) return problema[1];
        return "El servidor respondió con un error (" + respuesta.code() + "). Intenta de nuevo.";
    }

    static final String SIN_CONEXION = "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.";
}
