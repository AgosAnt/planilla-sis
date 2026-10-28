package com.planillasis.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import org.junit.Test;

public class ClasificadorRespuestaTest {

    @Test
    public void exitosEnviados() {
        assertEquals(ClasificadorRespuesta.Resultado.ENVIADO, ClasificadorRespuesta.clasificar(200));
        assertEquals(ClasificadorRespuesta.Resultado.ENVIADO, ClasificadorRespuesta.clasificar(201));
        assertEquals(ClasificadorRespuesta.Resultado.ENVIADO, ClasificadorRespuesta.clasificar(207));
    }

    @Test
    public void rechazosNoSeMarcanComoEnviados() {
        // C-05: antes la app marcaba 400 y 409 como sincronizados y se perdían
        for (int status : new int[] { 400, 403, 404, 409, 413, 422 }) {
            assertEquals("HTTP " + status, ClasificadorRespuesta.Resultado.RECHAZADO, ClasificadorRespuesta.clasificar(status));
        }
    }

    @Test
    public void passwordTemporalNoEsUnRechazoDeLaMarca() {
        assertEquals(true, ClasificadorRespuesta.requiereCambioPassword(403, "DEBE_CAMBIAR_PASSWORD"));
        // Otros 403 sí son rechazos de verdad (rol o recurso ajeno)
        assertEquals(false, ClasificadorRespuesta.requiereCambioPassword(403, "PROHIBIDO"));
        assertEquals(false, ClasificadorRespuesta.requiereCambioPassword(403, null));
        assertEquals(false, ClasificadorRespuesta.requiereCambioPassword(422, "DEBE_CAMBIAR_PASSWORD"));
    }

    @Test
    public void sesionVencidaPideLogin() {
        assertEquals(ClasificadorRespuesta.Resultado.REQUIERE_LOGIN, ClasificadorRespuesta.clasificar(401));
    }

    @Test
    public void fallasTemporalesSeReintentan() {
        for (int status : new int[] { 408, 429, 500, 502, 503 }) {
            assertEquals("HTTP " + status, ClasificadorRespuesta.Resultado.REINTENTAR, ClasificadorRespuesta.clasificar(status));
        }
    }

    @Test
    public void estadosDelLoteDeEventos() {
        assertEquals(ClasificadorRespuesta.Resultado.ENVIADO, ClasificadorRespuesta.clasificarEvento("CREADO"));
        assertEquals(ClasificadorRespuesta.Resultado.ENVIADO, ClasificadorRespuesta.clasificarEvento("DUPLICADO"));
        assertEquals(ClasificadorRespuesta.Resultado.RECHAZADO, ClasificadorRespuesta.clasificarEvento("RECHAZADO"));
        assertEquals(ClasificadorRespuesta.Resultado.REINTENTAR, ClasificadorRespuesta.clasificarEvento(null));
    }

    @Test
    public void leeElProblemaDeLaApi() {
        String[] problema = ClasificadorRespuesta.problema(
                "{\"type\":\"about:blank\",\"status\":409,\"detail\":\"Ya tienes un ingreso sin salida\",\"code\":\"REGISTRO_ABIERTO\"}");
        assertEquals("REGISTRO_ABIERTO", problema[0]);
        assertEquals("Ya tienes un ingreso sin salida", problema[1]);
        assertNull(ClasificadorRespuesta.problema("<html>error</html>"));
        assertNull(ClasificadorRespuesta.problema(null));
    }

    @Test
    public void encuentraLaJornadaAbierta() {
        JsonObject registros = new Gson().fromJson("{\"items\":["
                + "{\"id\":\"b2\",\"salida_at\":null},"
                + "{\"id\":\"a1\",\"salida_at\":\"2026-10-19T23:00:00.000Z\"}]}", JsonObject.class);
        assertEquals("b2", ClasificadorRespuesta.jornadaAbierta(registros));
        assertNull(ClasificadorRespuesta.jornadaAbierta(new Gson().fromJson(
                "{\"items\":[{\"id\":\"a1\",\"salida_at\":\"2026-10-19T23:00:00.000Z\"}]}", JsonObject.class)));
        assertNull(ClasificadorRespuesta.jornadaAbierta(null));
    }

    @Test
    public void normalizaLaDireccionDelServidor() {
        assertEquals("http://192.168.1.76:3000/", Configuracion.normalizarServidor("192.168.1.76:3000"));
        assertEquals("http://192.168.1.76:3000/", Configuracion.normalizarServidor(" http://192.168.1.76:3000 "));
        assertEquals("http://servidor.local:3000/", Configuracion.normalizarServidor("http://servidor.local:3000/"));
    }

    @Test
    public void muestraElServidorSinProtocoloNiBarra() {
        assertEquals("planilla.azurewebsites.net", Configuracion.nombreCorto("https://planilla.azurewebsites.net/"));
        assertEquals("192.168.1.76:3000", Configuracion.nombreCorto("http://192.168.1.76:3000/"));
    }
}
