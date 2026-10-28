package com.planillasis.app;

import android.content.Context;
import android.content.SharedPreferences;

// Dirección del servidor. La app trae una de fábrica (servidor.api en local.properties, ver app/build.gradle.kts)
// y el trabajador no tiene que escribir nada. Solo se guarda una distinta si alguien la cambia a mano en el
// inicio de sesión ("Cambiar servidor"); así, si la de fábrica cambia en una versión nueva, se usa la nueva.
public final class Configuracion {

    private static final String PREFERENCIAS = "planilla_config";
    // Clave nueva: las versiones anteriores guardaban siempre lo que había en el campo (la IP de la oficina)
    private static final String CLAVE_SERVIDOR = "servidor_personalizado";

    private Configuracion() {}

    public static String servidor(Context contexto) {
        return preferencias(contexto).getString(CLAVE_SERVIDOR, porDefecto(contexto));
    }

    public static String porDefecto(Context contexto) {
        return normalizarServidor(contexto.getString(R.string.servidor_por_defecto));
    }

    public static void guardarServidor(Context contexto, String direccion) {
        String normalizada = normalizarServidor(direccion);
        SharedPreferences.Editor editor = preferencias(contexto).edit();
        if (direccion == null || direccion.trim().isEmpty() || normalizada.equals(porDefecto(contexto))) {
            editor.remove(CLAVE_SERVIDOR);
        } else {
            editor.putString(CLAVE_SERVIDOR, normalizada);
        }
        editor.apply();
    }

    // "192.168.1.76:3000" -> "http://192.168.1.76:3000/"; Retrofit exige la barra final
    public static String normalizarServidor(String direccion) {
        String limpia = direccion == null ? "" : direccion.trim();
        if (!limpia.startsWith("http://") && !limpia.startsWith("https://")) {
            limpia = "http://" + limpia;
        }
        return limpia.endsWith("/") ? limpia : limpia + "/";
    }

    // "https://planilla.azurewebsites.net/" -> "planilla.azurewebsites.net", para mostrarlo corto
    public static String nombreCorto(String direccion) {
        return direccion.replaceFirst("^https?://", "").replaceFirst("/$", "");
    }

    private static SharedPreferences preferencias(Context contexto) {
        return contexto.getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE);
    }
}
