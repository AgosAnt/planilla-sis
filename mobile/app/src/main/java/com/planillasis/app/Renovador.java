package com.planillasis.app;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.Authenticator;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.Route;

// Renueva la sesión cuando el servidor responde 401 (access token vencido, ADR-001): pide tokens nuevos a
// POST /auth/refresh, los guarda y repite la petición una sola vez. Así la cola sigue enviándose sin volver
// a pedir la contraseña. Sin dependencias de Android, para probarlo con JUnit.
final class Renovador implements Authenticator {

    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final Gson GSON = new Gson();

    private final String urlRenovar;
    private final RetrofitClient.AlmacenTokens almacen;
    // Cliente propio, sin este Authenticator: un 401 de /auth/refresh no debe volver a intentar renovar
    private final OkHttpClient http = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build();

    Renovador(String servidor, RetrofitClient.AlmacenTokens almacen) {
        this.urlRenovar = Configuracion.normalizarServidor(servidor) + "api/v1/auth/refresh";
        this.almacen = almacen;
    }

    // synchronized: si varias peticiones vencen a la vez, solo la primera renueva; las demás usan el token nuevo
    @Override
    public synchronized Request authenticate(Route ruta, Response respuesta) throws IOException {
        Request peticion = respuesta.request();
        if (respuesta.priorResponse() != null) return null; // ya se repitió una vez con el token nuevo
        String camino = peticion.url().encodedPath();
        if (camino.endsWith("/auth/session") || camino.endsWith("/auth/refresh")) return null;

        String usado = tokenDe(peticion);
        String actual = almacen.token();
        if (actual != null && !actual.equals(usado)) return conToken(peticion, actual); // otro hilo ya renovó

        String refresh = almacen.refreshToken();
        if (refresh == null) return null;

        JsonObject cuerpo = new JsonObject();
        cuerpo.addProperty("refresh_token", refresh);
        Request renovar = new Request.Builder()
                .url(urlRenovar)
                .header("X-Client-Type", "mobile")
                .post(RequestBody.create(JSON, cuerpo.toString())) // OkHttp 3 (el de Retrofit 2.9)
                .build();
        try (Response r = http.newCall(renovar).execute()) {
            if (r.code() == 401) {
                // Refresh vencido, revocado o reutilizado: hay que volver a iniciar sesión (la cola se conserva)
                almacen.descartarTokens();
                return null;
            }
            SesionApi.Respuesta nueva = r.isSuccessful() && r.body() != null
                    ? GSON.fromJson(r.body().string(), SesionApi.Respuesta.class) : null;
            if (nueva == null || nueva.accessToken == null || nueva.refreshToken == null) {
                // Falla temporal del servidor: como sin conexión, se reintenta más tarde sin cerrar la sesión
                throw new IOException("No se pudo renovar la sesión (HTTP " + r.code() + ")");
            }
            almacen.guardarTokens(nueva.accessToken, nueva.refreshToken);
            return conToken(peticion, nueva.accessToken);
        }
    }

    private static String tokenDe(Request peticion) {
        String cabecera = peticion.header("Authorization");
        return cabecera != null && cabecera.startsWith("Bearer ") ? cabecera.substring("Bearer ".length()) : null;
    }

    private static Request conToken(Request peticion, String token) {
        return peticion.newBuilder().header("Authorization", "Bearer " + token).build();
    }
}
