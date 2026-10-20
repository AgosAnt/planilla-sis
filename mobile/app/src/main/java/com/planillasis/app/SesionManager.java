package com.planillasis.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;

import java.security.GeneralSecurityException;

// Sesión del trabajador en el teléfono: token cifrado (AlmacenSeguro), perfil de GET /me y el inicio
// de un descanso en curso. El perfil se guarda para mostrar la ruta aunque no haya conexión.
public class SesionManager {

    private static final String PREFERENCIAS = "planilla_sesion";
    private static final String CLAVE_TOKEN = "token_cifrado";
    private static final String CLAVE_PERFIL = "perfil";
    private static final String CLAVE_INICIO_DESCANSO = "inicio_descanso";

    private static String tokenEnMemoria;

    private final SharedPreferences preferencias;
    private final Gson gson = new Gson();

    public SesionManager(Context contexto) {
        preferencias = contexto.getApplicationContext().getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE);
    }

    public void guardarToken(String token) throws GeneralSecurityException {
        preferencias.edit().putString(CLAVE_TOKEN, AlmacenSeguro.cifrar(token)).apply();
        tokenEnMemoria = token;
    }

    // null si no hay sesión o si el token no se puede descifrar (por ejemplo, tras restaurar un respaldo)
    public String token() {
        if (tokenEnMemoria != null) return tokenEnMemoria;
        String guardado = preferencias.getString(CLAVE_TOKEN, null);
        if (guardado == null) return null;
        try {
            tokenEnMemoria = AlmacenSeguro.descifrar(guardado);
        } catch (GeneralSecurityException e) {
            preferencias.edit().remove(CLAVE_TOKEN).apply();
        }
        return tokenEnMemoria;
    }

    public boolean haySesion() {
        return token() != null && perfil() != null;
    }

    public void guardarPerfil(Perfil perfil) {
        preferencias.edit().putString(CLAVE_PERFIL, gson.toJson(perfil)).apply();
    }

    public Perfil perfil() {
        String json = preferencias.getString(CLAVE_PERFIL, null);
        return json == null ? null : gson.fromJson(json, Perfil.class);
    }

    public void guardarInicioDescanso(String inicioIso) {
        preferencias.edit().putString(CLAVE_INICIO_DESCANSO, inicioIso).apply();
    }

    public String inicioDescanso() {
        return preferencias.getString(CLAVE_INICIO_DESCANSO, null);
    }

    public void limpiarDescanso() {
        preferencias.edit().remove(CLAVE_INICIO_DESCANSO).apply();
    }

    // Borra token y perfil. La cola local se conserva: cada fila lleva su trabajador_id
    // y se envía cuando ese mismo trabajador vuelve a iniciar sesión.
    public void cerrar() {
        tokenEnMemoria = null;
        preferencias.edit().clear().apply();
    }

    // Solo para que la sincronización detecte un 401 y pida volver a iniciar sesión
    public void invalidarToken() {
        tokenEnMemoria = null;
        preferencias.edit().remove(CLAVE_TOKEN).apply();
    }
}
