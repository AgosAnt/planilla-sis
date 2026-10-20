package com.planillasis.app;

import android.content.Context;
import android.content.SharedPreferences;

// Dirección del servidor de la oficina (LAN, HTTP: decisión D-4). Se puede cambiar desde la pantalla
// de inicio de sesión sin recompilar; por defecto es la de strings.xml.
public final class Configuracion {

    private static final String PREFERENCIAS = "planilla_config";
    private static final String CLAVE_SERVIDOR = "servidor";

    private Configuracion() {}

    public static String servidor(Context contexto) {
        String porDefecto = contexto.getString(R.string.servidor_por_defecto);
        return preferencias(contexto).getString(CLAVE_SERVIDOR, porDefecto);
    }

    public static void guardarServidor(Context contexto, String direccion) {
        preferencias(contexto).edit().putString(CLAVE_SERVIDOR, normalizarServidor(direccion)).apply();
    }

    // "192.168.1.76:3000" -> "http://192.168.1.76:3000/"; Retrofit exige la barra final
    public static String normalizarServidor(String direccion) {
        String limpia = direccion == null ? "" : direccion.trim();
        if (!limpia.startsWith("http://") && !limpia.startsWith("https://")) {
            limpia = "http://" + limpia;
        }
        return limpia.endsWith("/") ? limpia : limpia + "/";
    }

    private static SharedPreferences preferencias(Context contexto) {
        return contexto.getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE);
    }
}
