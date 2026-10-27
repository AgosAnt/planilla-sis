package com.planillasis.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import org.junit.Before;
import org.junit.Test;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

import retrofit2.Response;

// Mi cálculo, Mis turnos y Cambiar contraseña contra el backend real. Se omite sin PLANILLA_API.
// Mis turnos necesita un acuerdo PROPUESTO para PLANILLA_EMAIL, y la contraseña temporal un segundo trabajador
// (PLANILLA_EMAIL2 / PLANILLA_PASS2) con debe_cambiar_password = true: los prepara el script de la prueba.
public class FuncionesMovilIntegracionTest {

    private String servidor;

    @Before
    public void requiereBackend() {
        servidor = System.getenv("PLANILLA_API");
        assumeTrue("PLANILLA_API no definida: prueba de integración omitida", servidor != null);
    }

    private ApiService entrar(String email, String password, RenovadorTest.Almacen almacen) throws Exception {
        ApiService api = RetrofitClient.crear(servidor, almacen);
        Response<SesionApi.Respuesta> sesion = api.iniciarSesion("mobile", new SesionApi.Solicitud(email, password)).execute();
        assertEquals("login de " + email, 200, sesion.code());
        almacen.guardarTokens(sesion.body().accessToken, sesion.body().refreshToken);
        return api;
    }

    private static String codigo(Response<?> respuesta) throws Exception {
        String[] problema = ClasificadorRespuesta.problema(respuesta.errorBody().string());
        return problema != null ? problema[0] : null;
    }

    @Test
    public void miCalculoDeLaQuincena() throws Exception {
        ApiService api = entrar(System.getenv("PLANILLA_EMAIL"), System.getenv("PLANILLA_PASS"), new RenovadorTest.Almacen());
        Quincena quincena = Quincena.de(Calendar.getInstance());
        Response<JsonObject> r = api.miCalculo(quincena.desde, quincena.hasta).execute();
        assertEquals(200, r.code());
        JsonObject cuerpo = r.body();
        assertEquals(quincena.desde, cuerpo.get("desde").getAsString());
        assertEquals(quincena.hasta, cuerpo.get("hasta").getAsString());
        for (String campo : new String[] { "horas_ordinarias", "horas_extra_diurnas", "horas_extra_nocturnas" }) {
            assertTrue(campo, cuerpo.get(campo).getAsString().matches("\\d+\\.\\d{2}"));
        }
        assertTrue(cuerpo.get("jornadas_contadas").getAsInt() >= 0);
        assertTrue(cuerpo.get("jornadas_pendientes").getAsInt() >= 0);
        // La anterior también responde
        assertEquals(200, api.miCalculo(quincena.anterior().desde, quincena.anterior().hasta).execute().code());
    }

    @Test
    public void aceptarUnTurnoPropuesto() throws Exception {
        ApiService api = entrar(System.getenv("PLANILLA_EMAIL"), System.getenv("PLANILLA_PASS"), new RenovadorTest.Almacen());
        String hoy = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        Response<JsonObject> lista = api.acuerdos(hoy, 50).execute();
        assertEquals(200, lista.code());
        String propuesto = null;
        for (JsonElement e : lista.body().getAsJsonArray("items")) {
            JsonObject acuerdo = e.getAsJsonObject();
            assertTrue("solo fechas desde hoy", acuerdo.get("fecha").getAsString().compareTo(hoy) >= 0);
            assertNotNull(acuerdo.getAsJsonObject("turno").get("hora_inicio"));
            if ("PROPUESTO".equals(acuerdo.get("estado").getAsString())) propuesto = acuerdo.get("id").getAsString();
        }
        assertNotNull("el script de la prueba deja un turno PROPUESTO", propuesto);

        JsonObject aceptar = new JsonObject();
        aceptar.addProperty("estado", "ACEPTADO");
        Response<JsonObject> r = api.responderAcuerdo(propuesto, aceptar).execute();
        assertEquals(200, r.code());
        assertEquals("ACEPTADO", r.body().get("estado").getAsString());
        // Ya no está PROPUESTO: responder otra vez es una transición inválida
        Response<JsonObject> otra = api.responderAcuerdo(propuesto, aceptar).execute();
        assertEquals(409, otra.code());
        assertEquals("TRANSICION_INVALIDA", codigo(otra));
    }

    @Test
    public void passwordTemporalBloqueaMarcasHastaCambiarla() throws Exception {
        String email = System.getenv("PLANILLA_EMAIL2");
        String temporal = System.getenv("PLANILLA_PASS2");
        assumeTrue("PLANILLA_EMAIL2 no definida", email != null);
        RenovadorTest.Almacen almacen = new RenovadorTest.Almacen();
        ApiService api = entrar(email, temporal, almacen);

        Perfil perfil = api.perfil().execute().body();
        assertTrue("el script marca la contraseña como temporal", perfil.debeCambiarPassword);

        // La marca no se rechaza como inválida: el 403 dice que falta cambiar la contraseña
        Response<JsonObject> marca = api.ingreso(java.util.UUID.randomUUID().toString(), new JsonObject()).execute();
        assertEquals(403, marca.code());
        assertTrue(ClasificadorRespuesta.requiereCambioPassword(marca.code(), codigo(marca)));

        JsonObject cuerpo = new JsonObject();
        cuerpo.addProperty("password_actual", "no-es-la-actual-123");
        cuerpo.addProperty("password_nueva", "Frase larga de prueba 2026");
        Response<Void> r = api.cambiarPassword(cuerpo).execute();
        assertEquals(403, r.code());
        assertEquals("PASSWORD_INCORRECTA", codigo(r));

        cuerpo.addProperty("password_actual", temporal);
        cuerpo.addProperty("password_nueva", "corta");
        r = api.cambiarPassword(cuerpo).execute();
        assertEquals(422, r.code());
        assertEquals("PASSWORD_DEBIL", codigo(r));

        cuerpo.addProperty("password_nueva", "Frase larga de prueba 2026");
        assertEquals(204, api.cambiarPassword(cuerpo).execute().code());
        // Se cerraron todas las sesiones: el token y el refresh viejos ya no sirven
        assertEquals(401, api.perfil().execute().code());
        assertEquals(null, almacen.token());

        ApiService nueva = entrar(email, "Frase larga de prueba 2026", new RenovadorTest.Almacen());
        assertFalse(nueva.perfil().execute().body().debeCambiarPassword);
        assertEquals(401, RetrofitClient.crear(servidor, new RenovadorTest.Almacen())
                .iniciarSesion("mobile", new SesionApi.Solicitud(email, temporal)).execute().code());
    }
}
