package com.planillasis.app;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

// Decide qué hacer con cada respuesta de la API al sincronizar la cola (sin dependencias de Android,
// para probarlo con JUnit). Corrige C-05: un 400, 409 o 422 ya no se marca como enviado.
public final class ClasificadorRespuesta {

    public enum Resultado {
        ENVIADO,        // 2xx: el servidor lo guardó (o ya lo tenía: reintento idempotente)
        RECHAZADO,      // el servidor no lo acepta y reintentar no cambia nada: se muestra al trabajador
        REINTENTAR,     // sin conexión o falla temporal del servidor: queda pendiente
        REQUIERE_LOGIN  // la sesión venció: se pide iniciar sesión y la cola se conserva
    }

    private ClasificadorRespuesta() {}

    public static Resultado clasificar(int status) {
        if (status >= 200 && status < 300) return Resultado.ENVIADO;
        if (status == 401) return Resultado.REQUIERE_LOGIN;
        if (status == 400 || status == 403 || status == 404 || status == 409 || status == 413 || status == 422) {
            return Resultado.RECHAZADO;
        }
        return Resultado.REINTENTAR; // 408, 429, 5xx
    }

    // POST /eventos:batch responde 207 con un estado por evento
    public static Resultado clasificarEvento(String estado) {
        if ("CREADO".equals(estado) || "DUPLICADO".equals(estado)) return Resultado.ENVIADO;
        if ("RECHAZADO".equals(estado)) return Resultado.RECHAZADO;
        return Resultado.REINTENTAR;
    }

    // Lee code y detail de un application/problem+json; null si el cuerpo no lo es
    public static String[] problema(String cuerpo) {
        if (cuerpo == null || cuerpo.isEmpty()) return null;
        try {
            JsonObject json = new Gson().fromJson(cuerpo, JsonObject.class);
            if (json == null) return null;
            String codigo = json.has("code") ? json.get("code").getAsString() : null;
            String detalle = json.has("detail") ? json.get("detail").getAsString() : null;
            return new String[] { codigo, detalle };
        } catch (RuntimeException e) {
            return null;
        }
    }
}
