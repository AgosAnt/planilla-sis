package com.planillasis.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import retrofit2.Response;

// El Renovador contra un servidor falso: renueva ante 401, una sola vez aunque fallen varias peticiones a la vez,
// y distingue un refresh rechazado (hay que volver a iniciar sesión) de una falla temporal (se reintenta).
public class RenovadorTest {

    private ServidorFalso servidor;
    private ApiService api;
    private Almacen almacen;
    private final AtomicInteger renovaciones = new AtomicInteger();
    private volatile String accessValido = "access-1";
    private volatile String refreshValido = "refresh-1";
    private volatile int respuestaRenovar = 200;

    // Sesión en memoria (en la app es SesionManager, con el Keystore)
    static class Almacen implements RetrofitClient.AlmacenTokens {
        volatile String token;
        volatile String refresh;

        @Override public String token() { return token; }
        @Override public String refreshToken() { return refresh; }
        @Override public void guardarTokens(String t, String r) { token = t; refresh = r; }
        @Override public void descartarTokens() { token = null; refresh = null; }
    }

    @Before
    public void levantarServidor() throws IOException {
        servidor = new ServidorFalso(this::atender);
        almacen = new Almacen();
        api = RetrofitClient.crear(servidor.url(), almacen);
    }

    @After
    public void detenerServidor() throws IOException {
        servidor.close();
    }

    private ServidorFalso.Respuesta atender(ServidorFalso.Peticion peticion) {
        switch (peticion.ruta) {
            case "/api/v1/me":
                return ("Bearer " + accessValido).equals(peticion.cabecera("Authorization"))
                        ? new ServidorFalso.Respuesta(200, "{\"id\":\"t1\",\"rol\":\"trabajador\",\"nombres\":\"Ana\",\"apellidos\":\"Pérez\"}")
                        : new ServidorFalso.Respuesta(401, "{\"code\":\"TOKEN_INVALIDO\"}");
            case "/api/v1/auth/session":
                return new ServidorFalso.Respuesta(401, "{\"code\":\"CREDENCIALES_INVALIDAS\"}");
            case "/api/v1/auth/refresh":
                return renovar(peticion);
            default:
                return new ServidorFalso.Respuesta(404, "{}");
        }
    }

    private synchronized ServidorFalso.Respuesta renovar(ServidorFalso.Peticion peticion) {
        renovaciones.incrementAndGet();
        JsonObject json = new JsonParser().parse(peticion.cuerpo).getAsJsonObject();
        boolean esMovil = "mobile".equals(peticion.cabecera("X-Client-Type"));
        if (respuestaRenovar != 200) return new ServidorFalso.Respuesta(respuestaRenovar, "{}");
        if (!esMovil || !refreshValido.equals(json.get("refresh_token").getAsString())) {
            return new ServidorFalso.Respuesta(401, "{\"code\":\"REFRESH_INVALIDO\"}");
        }
        dormir(150); // da tiempo a que las demás peticiones vencidas lleguen mientras se renueva
        int n = renovaciones.get() + 1;
        accessValido = "access-" + n;
        refreshValido = "refresh-" + n;
        return new ServidorFalso.Respuesta(200, "{\"access_token_emitido\":true,\"expira_en\":900,\"access_token\":\""
                + accessValido + "\",\"refresh_token\":\"" + refreshValido + "\"}");
    }

    @Test
    public void tokenVigenteNoRenueva() throws Exception {
        almacen.guardarTokens("access-1", "refresh-1");
        assertEquals(200, api.perfil().execute().code());
        assertEquals(0, renovaciones.get());
    }

    @Test
    public void accessVencidoSeRenuevaYRepiteLaPeticion() throws Exception {
        almacen.guardarTokens("access-vencido", "refresh-1");
        Response<Perfil> respuesta = api.perfil().execute();
        assertEquals(200, respuesta.code());
        assertEquals("Ana", respuesta.body().nombres);
        assertEquals(1, renovaciones.get());
        assertEquals(accessValido, almacen.token());
        assertNotEquals("refresh-1", almacen.refreshToken()); // el refresh rotó y se guardó el nuevo
    }

    @Test
    public void variasPeticionesVencidasRenuevanUnaSolaVez() throws Exception {
        almacen.guardarTokens("access-vencido", "refresh-1");
        ExecutorService hilos = Executors.newFixedThreadPool(5);
        List<Future<Integer>> resultados = new ArrayList<>();
        for (int i = 0; i < 5; i++) resultados.add(hilos.submit(() -> api.perfil().execute().code()));
        for (Future<Integer> r : resultados) assertEquals(200, (int) r.get());
        hilos.shutdown();
        assertEquals(1, renovaciones.get());
    }

    @Test
    public void refreshRechazadoDescartaLosTokens() throws Exception {
        almacen.guardarTokens("access-vencido", "refresh-robado");
        assertEquals(401, api.perfil().execute().code());
        assertEquals(1, renovaciones.get());
        assertNull(almacen.token());
        assertNull(almacen.refreshToken());
    }

    @Test
    public void fallaTemporalDelServidorNoCierraLaSesion() {
        almacen.guardarTokens("access-vencido", "refresh-1");
        respuestaRenovar = 503;
        try {
            api.perfil().execute();
            fail("Debía lanzar IOException para que la cola lo trate como sin conexión");
        } catch (IOException e) {
            assertTrue(e.getMessage().contains("503"));
        }
        assertEquals("refresh-1", almacen.refreshToken());
    }

    @Test
    public void sinRefreshNoIntentaRenovar() throws Exception {
        almacen.guardarTokens("access-vencido", null);
        assertEquals(401, api.perfil().execute().code());
        assertEquals(0, renovaciones.get());
    }

    @Test
    public void elLoginIncorrectoNoRenueva() throws Exception {
        almacen.guardarTokens("access-vencido", "refresh-1");
        assertEquals(401, api.iniciarSesion("mobile", new SesionApi.Solicitud("a@b.c", "x")).execute().code());
        assertEquals(0, renovaciones.get());
    }

    private static void dormir(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
