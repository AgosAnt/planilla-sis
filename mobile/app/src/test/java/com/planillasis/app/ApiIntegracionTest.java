package com.planillasis.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assume.assumeTrue;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import org.junit.Before;
import org.junit.FixMethodOrder;
import org.junit.Test;
import org.junit.runners.MethodSorters;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;

import retrofit2.Response;

// Prueba el ApiService de la app contra un backend real (rutas, cabeceras y cuerpos del contrato).
// Se omite si no se definen PLANILLA_API, PLANILLA_EMAIL y PLANILLA_PASS. Usa un trabajador con
// asignación activa (por ejemplo trabajador@local.test del seed S001) y deja una jornada completa.
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class ApiIntegracionTest {

    private ApiService api;
    private String token;

    @Before
    public void prepararSesion() throws Exception {
        String servidor = System.getenv("PLANILLA_API");
        assumeTrue("PLANILLA_API no definida: prueba de integración omitida", servidor != null);
        api = RetrofitClient.crear(servidor, () -> token);

        Response<SesionApi.Respuesta> sesion = api.iniciarSesion("mobile",
                new SesionApi.Solicitud(System.getenv("PLANILLA_EMAIL"), System.getenv("PLANILLA_PASS"))).execute();
        assertEquals(200, sesion.code());
        token = sesion.body().accessToken;
        assertNotNull(token);
    }

    @Test
    public void jornadaCompletaComoLaApp() throws Exception {
        Perfil perfil = api.perfil().execute().body();
        assertNotNull(perfil);
        assertEquals("trabajador", perfil.rol);
        assertNotNull("el trabajador necesita una asignación activa", perfil.asignacionActiva);

        // Cerrar una jornada que haya quedado abierta (como hace LoginActivity al recuperarla)
        JsonObject registros = api.registros(5).execute().body();
        for (JsonElement elemento : registros.getAsJsonArray("items")) {
            JsonObject registro = elemento.getAsJsonObject();
            if (registro.get("salida_at").isJsonNull()) {
                JsonObject salida = new JsonObject();
                // Después del ingreso del seed (hace 2 h) y antes del ingreso de esta prueba (hace 60 min)
                salida.addProperty("salida_at", hace(90));
                assertEquals(200, api.salida(registro.get("id").getAsString(), uuid(), salida).execute().code());
            }
        }

        // Ingreso con la asignación de /me
        String clientUuid = uuid();
        JsonObject ingreso = new JsonObject();
        ingreso.addProperty("client_uuid", clientUuid);
        ingreso.addProperty("asignacion_id", perfil.asignacionActiva.id);
        ingreso.addProperty("ingreso_at", hace(60));
        JsonObject ubicacion = new JsonObject();
        ubicacion.addProperty("lat", 14.6349);
        ubicacion.addProperty("lng", -90.5069);
        ingreso.add("ubicacion", ubicacion);
        Response<JsonObject> respuesta = api.ingreso(clientUuid, ingreso).execute();
        assertEquals(201, respuesta.code());
        String registroId = respuesta.body().get("id").getAsString();

        // Reintento idéntico (la cola reenvía tras perder la conexión): sigue siendo éxito
        assertEquals(ClasificadorRespuesta.Resultado.ENVIADO,
                ClasificadorRespuesta.clasificar(api.ingreso(clientUuid, ingreso).execute().code()));

        // Segundo ingreso con la jornada abierta: rechazo con su código, que la app muestra
        JsonObject otro = ingreso.deepCopy();
        otro.addProperty("client_uuid", uuid());
        Response<JsonObject> rechazo = api.ingreso(uuid(), otro).execute();
        assertEquals(ClasificadorRespuesta.Resultado.RECHAZADO, ClasificadorRespuesta.clasificar(rechazo.code()));
        assertEquals("REGISTRO_ABIERTO", ClasificadorRespuesta.problema(rechazo.errorBody().string())[0]);

        // Descanso completo
        JsonObject descanso = new JsonObject();
        descanso.addProperty("client_uuid", uuid());
        descanso.addProperty("tipo_id", 1);
        descanso.addProperty("inicio_at", hace(40));
        descanso.addProperty("fin_at", hace(30));
        assertEquals(201, api.descanso(registroId, uuid(), descanso).execute().code());

        // Emergencia por eventos:batch (la ruta lleva ":")
        JsonObject evento = new JsonObject();
        evento.addProperty("client_uuid", uuid());
        evento.addProperty("tipo_evento", "EMERGENCIA");
        evento.addProperty("esquema_version", 1);
        evento.addProperty("ocurrido_en", hace(20));
        evento.addProperty("registro_tiempo_id", registroId);
        JsonObject lote = new JsonObject();
        JsonArray eventos = new JsonArray();
        eventos.add(evento);
        lote.add("eventos", eventos);
        Response<JsonObject> loteRespuesta = api.eventos(uuid(), lote).execute();
        assertEquals(207, loteRespuesta.code());
        String estado = loteRespuesta.body().getAsJsonArray("resultados").get(0).getAsJsonObject().get("estado").getAsString();
        assertEquals(ClasificadorRespuesta.Resultado.ENVIADO, ClasificadorRespuesta.clasificarEvento(estado));

        // Salida
        JsonObject salida = new JsonObject();
        salida.addProperty("salida_at", hace(5));
        Response<JsonObject> fin = api.salida(registroId, uuid(), salida).execute();
        assertEquals(200, fin.code());
        assertEquals("PENDIENTE", fin.body().get("estado_validacion").getAsString());
    }

    // Prueba de rechazo: el teléfono marcó la entrada sin conexión y, mientras tanto, la jornada se abrió
    // desde otro equipo. Al sincronizar, la entrada del teléfono se rechaza y la app recupera la otra.
    // Corre después de jornadaCompletaComoLaApp (orden por nombre) y usa horas posteriores a su salida.
    @Test
    public void rechazoSiLaJornadaSeAbrioEnOtroEquipo() throws Exception {
        Perfil perfil = api.perfil().execute().body();
        assertNotNull(perfil.asignacionActiva);

        // Otro equipo (por ejemplo Postman) abre la jornada primero
        Response<JsonObject> otroEquipo = api.ingreso(uuid(), ingreso(perfil, hace(4))).execute();
        assertEquals(201, otroEquipo.code());
        String jornadaDelServidor = otroEquipo.body().get("id").getAsString();

        // Llega la entrada que el teléfono tenía en cola: rechazada, no enviada, y con su código
        JsonObject delTelefono = ingreso(perfil, hace(3));
        Response<JsonObject> rechazo = api.ingreso(delTelefono.get("client_uuid").getAsString(), delTelefono).execute();
        assertEquals(ClasificadorRespuesta.Resultado.RECHAZADO, ClasificadorRespuesta.clasificar(rechazo.code()));
        assertEquals("REGISTRO_ABIERTO", ClasificadorRespuesta.problema(rechazo.errorBody().string())[0]);

        // La app recupera la jornada abierta del servidor (Sincronizador.recuperarJornadaAbierta)
        assertEquals(jornadaDelServidor, ClasificadorRespuesta.jornadaAbierta(api.registros(5).execute().body()));

        // La salida que marca el trabajador después va a esa jornada
        JsonObject salida = new JsonObject();
        salida.addProperty("salida_at", hace(1));
        assertEquals(200, api.salida(jornadaDelServidor, uuid(), salida).execute().code());
        assertNull(ClasificadorRespuesta.jornadaAbierta(api.registros(5).execute().body()));
    }

    @Test
    public void sinTokenElServidorPideLogin() throws Exception {
        token = null;
        assertEquals(ClasificadorRespuesta.Resultado.REQUIERE_LOGIN, ClasificadorRespuesta.clasificar(api.perfil().execute().code()));
    }

    private static JsonObject ingreso(Perfil perfil, String ingresoAt) {
        JsonObject ingreso = new JsonObject();
        ingreso.addProperty("client_uuid", uuid());
        ingreso.addProperty("asignacion_id", perfil.asignacionActiva.id);
        ingreso.addProperty("ingreso_at", ingresoAt);
        JsonObject ubicacion = new JsonObject();
        ubicacion.addProperty("lat", 14.6349);
        ubicacion.addProperty("lng", -90.5069);
        ingreso.add("ubicacion", ubicacion);
        return ingreso;
    }

    private static String uuid() {
        return UUID.randomUUID().toString();
    }

    private static String hace(int minutos) {
        SimpleDateFormat formato = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        formato.setTimeZone(TimeZone.getTimeZone("UTC"));
        return formato.format(new Date(System.currentTimeMillis() - minutos * 60000L));
    }
}
