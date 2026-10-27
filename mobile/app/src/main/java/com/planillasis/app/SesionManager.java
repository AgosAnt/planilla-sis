package com.planillasis.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;

import java.security.GeneralSecurityException;

// Sesión del trabajador en el teléfono: access y refresh token cifrados (AlmacenSeguro), perfil de GET /me y
// el inicio de un descanso en curso. El perfil se guarda para mostrar la ruta aunque no haya conexión.
// Es el AlmacenTokens del Renovador, que cambia los tokens desde el hilo de red: por eso los accesos son synchronized.
public class SesionManager implements RetrofitClient.AlmacenTokens {

    private static final String PREFERENCIAS = "planilla_sesion";
    private static final String CLAVE_TOKEN = "token_cifrado";
    private static final String CLAVE_REFRESH = "refresh_cifrado";
    private static final String CLAVE_PERFIL = "perfil";
    private static final String CLAVE_INICIO_DESCANSO = "inicio_descanso";

    private static String tokenEnMemoria;
    private static String refreshEnMemoria;

    private final SharedPreferences preferencias;
    private final Gson gson = new Gson();

    public SesionManager(Context contexto) {
        preferencias = contexto.getApplicationContext().getSharedPreferences(PREFERENCIAS, Context.MODE_PRIVATE);
    }

    // Al iniciar sesión: si no se pueden cifrar, no se inicia (nunca se guardan en texto plano).
    // refresh puede ser null con un servidor que aún no lo emite: entonces la sesión dura lo que el access token.
    public void guardarSesion(String token, String refresh) throws GeneralSecurityException {
        String tokenCifrado = AlmacenSeguro.cifrar(token);
        String refreshCifrado = refresh != null ? AlmacenSeguro.cifrar(refresh) : null;
        synchronized (SesionManager.class) {
            preferencias.edit().putString(CLAVE_TOKEN, tokenCifrado).putString(CLAVE_REFRESH, refreshCifrado).apply();
            tokenEnMemoria = token;
            refreshEnMemoria = refresh;
        }
    }

    // Tokens rotados por el Renovador. Si el Keystore fallara, quedan solo en memoria hasta cerrar la app.
    @Override
    public void guardarTokens(String token, String refresh) {
        synchronized (SesionManager.class) {
            tokenEnMemoria = token;
            refreshEnMemoria = refresh;
            try {
                preferencias.edit()
                        .putString(CLAVE_TOKEN, AlmacenSeguro.cifrar(token))
                        .putString(CLAVE_REFRESH, AlmacenSeguro.cifrar(refresh))
                        .apply();
            } catch (GeneralSecurityException e) {
                preferencias.edit().remove(CLAVE_TOKEN).remove(CLAVE_REFRESH).apply();
            }
        }
    }

    // null si no hay sesión o si el token no se puede descifrar (por ejemplo, tras restaurar un respaldo)
    @Override
    public String token() {
        synchronized (SesionManager.class) {
            if (tokenEnMemoria == null) tokenEnMemoria = descifrar(CLAVE_TOKEN);
            return tokenEnMemoria;
        }
    }

    @Override
    public String refreshToken() {
        synchronized (SesionManager.class) {
            if (refreshEnMemoria == null) refreshEnMemoria = descifrar(CLAVE_REFRESH);
            return refreshEnMemoria;
        }
    }

    private String descifrar(String clave) {
        String guardado = preferencias.getString(clave, null);
        if (guardado == null) return null;
        try {
            return AlmacenSeguro.descifrar(guardado);
        } catch (GeneralSecurityException e) {
            preferencias.edit().remove(clave).apply();
            return null;
        }
    }

    // Con solo el refresh también hay sesión: el primer 401 la renueva
    public boolean haySesion() {
        return (token() != null || refreshToken() != null) && perfil() != null;
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

    // Borra tokens y perfil. La cola local se conserva: cada fila lleva su trabajador_id
    // y se envía cuando ese mismo trabajador vuelve a iniciar sesión.
    public void cerrar() {
        synchronized (SesionManager.class) {
            tokenEnMemoria = null;
            refreshEnMemoria = null;
            preferencias.edit().clear().apply();
        }
    }

    // La sesión ya no se puede renovar (401 aun después del Renovador): se pide volver a iniciar sesión
    public void invalidarToken() {
        descartarTokens();
    }

    @Override
    public void descartarTokens() {
        synchronized (SesionManager.class) {
            tokenEnMemoria = null;
            refreshEnMemoria = null;
            preferencias.edit().remove(CLAVE_TOKEN).remove(CLAVE_REFRESH).apply();
        }
    }
}
