package com.planillasis.app;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import retrofit2.Response;

// Envía la cola al servidor de la oficina de a una marca y en orden (C-04), en un hilo aparte.
// Se detiene ante falta de conexión (la marca queda pendiente) o sesión vencida (se pide login).
public final class Sincronizador {

    public static class Resumen {
        public int enviados;
        public int rechazados;
        public boolean sinConexion;
        public boolean requiereLogin;
        public String mensaje; // detalle del último rechazo o datos del ingreso (turno, geocerca)
        String ultimoCodigo;   // code del último rechazo (problem+json)
    }

    public interface Escucha {
        void alTerminar(Resumen resumen);
    }

    // Un solo hilo: nunca hay dos sincronizaciones en paralelo
    private static final ExecutorService HILO = Executors.newSingleThreadExecutor();
    private static final Handler PRINCIPAL = new Handler(Looper.getMainLooper());
    private static final Gson GSON = new Gson();

    private Sincronizador() {}

    public static void sincronizar(Context contexto, Escucha escucha) {
        Context app = contexto.getApplicationContext();
        HILO.execute(() -> {
            Resumen resumen = procesar(app);
            if (escucha != null) PRINCIPAL.post(() -> escucha.alTerminar(resumen));
        });
    }

    private static Resumen procesar(Context contexto) {
        Resumen resumen = new Resumen();
        SesionManager sesion = new SesionManager(contexto);
        Perfil perfil = sesion.perfil();
        if (perfil == null || sesion.token() == null) {
            resumen.requiereLogin = true;
            return resumen;
        }
        DatabaseHelper cola = new DatabaseHelper(contexto);
        ApiService api = RetrofitClient.getApiService(contexto);

        DatabaseHelper.ItemCola item;
        while ((item = cola.siguientePendiente(perfil.id)) != null) {
            try {
                ClasificadorRespuesta.Resultado resultado = enviar(cola, api, item, resumen);
                // El servidor ya tenía una jornada abierta (por ejemplo, marcada desde otro teléfono):
                // se recupera para que la salida y los descansos vayan a esa jornada
                if (resultado == ClasificadorRespuesta.Resultado.RECHAZADO
                        && DatabaseHelper.TIPO_INGRESO.equals(item.tipo) && "REGISTRO_ABIERTO".equals(resumen.ultimoCodigo)) {
                    recuperarJornadaAbierta(cola, api, perfil.id);
                }
                if (resultado == ClasificadorRespuesta.Resultado.REQUIERE_LOGIN) {
                    sesion.invalidarToken();
                    resumen.requiereLogin = true;
                    return resumen;
                }
                if (resultado == ClasificadorRespuesta.Resultado.REINTENTAR) {
                    cola.sumarIntento(item.id);
                    resumen.sinConexion = true;
                    return resumen;
                }
            } catch (IOException e) {
                // Fuera de la red de la oficina o servidor apagado: se reintenta en la próxima sincronización
                cola.sumarIntento(item.id);
                resumen.sinConexion = true;
                return resumen;
            }
        }
        return resumen;
    }

    private static ClasificadorRespuesta.Resultado enviar(DatabaseHelper cola, ApiService api,
                                                         DatabaseHelper.ItemCola item, Resumen resumen) throws IOException {
        JsonObject cuerpo = GSON.fromJson(item.cuerpo, JsonObject.class);

        if (DatabaseHelper.TIPO_INGRESO.equals(item.tipo)) {
            Response<JsonObject> respuesta = api.ingreso(item.clientUuid, cuerpo).execute();
            return registrar(cola, item, respuesta, resumen, true);
        }

        // Salida, descanso y evento necesitan el id del registro de tiempo en el servidor
        String registroId = item.registroServidorId;
        if (registroId == null && item.ingresoLocalId != null) {
            DatabaseHelper.ItemCola ingreso = cola.porId(item.ingresoLocalId);
            if (ingreso != null && DatabaseHelper.RECHAZADO.equals(ingreso.estado)) {
                if (!DatabaseHelper.TIPO_EVENTO.equals(item.tipo)) {
                    cola.marcarRechazado(item.id, "INGRESO_RECHAZADO", "El ingreso de esta jornada fue rechazado por el servidor");
                    resumen.rechazados++;
                    return ClasificadorRespuesta.Resultado.RECHAZADO;
                }
            } else if (ingreso != null) {
                registroId = ingreso.registroServidorId;
            }
        }

        switch (item.tipo) {
            case DatabaseHelper.TIPO_SALIDA:
                if (registroId == null) return ClasificadorRespuesta.Resultado.REINTENTAR;
                return registrar(cola, item, api.salida(registroId, item.clientUuid, cuerpo).execute(), resumen, false);
            case DatabaseHelper.TIPO_DESCANSO:
                if (registroId == null) return ClasificadorRespuesta.Resultado.REINTENTAR;
                return registrar(cola, item, api.descanso(registroId, item.clientUuid, cuerpo).execute(), resumen, false);
            case DatabaseHelper.TIPO_EVENTO:
                // Una emergencia se envía aunque no haya jornada: registro_tiempo_id es opcional
                if (registroId != null) cuerpo.addProperty("registro_tiempo_id", registroId);
                JsonObject lote = new JsonObject();
                JsonArray eventos = new JsonArray();
                eventos.add(cuerpo);
                lote.add("eventos", eventos);
                return registrarEvento(cola, item, api.eventos(item.clientUuid, lote).execute(), resumen);
            default:
                cola.marcarRechazado(item.id, "TIPO_DESCONOCIDO", "Tipo de marca desconocido: " + item.tipo);
                return ClasificadorRespuesta.Resultado.RECHAZADO;
        }
    }

    private static ClasificadorRespuesta.Resultado registrar(DatabaseHelper cola, DatabaseHelper.ItemCola item,
                                                            Response<JsonObject> respuesta, Resumen resumen,
                                                            boolean esIngreso) throws IOException {
        ClasificadorRespuesta.Resultado resultado = ClasificadorRespuesta.clasificar(respuesta.code());
        if (resultado == ClasificadorRespuesta.Resultado.ENVIADO) {
            JsonObject cuerpo = respuesta.body();
            String registroId = esIngreso && cuerpo != null && cuerpo.has("id") ? cuerpo.get("id").getAsString() : null;
            cola.marcarEnviado(item.id, registroId);
            resumen.enviados++;
            if (esIngreso && cuerpo != null) resumen.mensaje = describirIngreso(cuerpo);
        } else if (resultado == ClasificadorRespuesta.Resultado.RECHAZADO) {
            String[] problema = ClasificadorRespuesta.problema(respuesta.errorBody() != null ? respuesta.errorBody().string() : null);
            String codigo = problema != null ? problema[0] : "HTTP_" + respuesta.code();
            String detalle = problema != null && problema[1] != null ? problema[1] : "El servidor rechazó la marca (" + respuesta.code() + ")";
            cola.marcarRechazado(item.id, codigo, detalle);
            resumen.rechazados++;
            resumen.mensaje = detalle;
            resumen.ultimoCodigo = codigo;
        }
        return resultado;
    }

    private static void recuperarJornadaAbierta(DatabaseHelper cola, ApiService api, String trabajadorId) throws IOException {
        if (cola.jornadaAbierta(trabajadorId) != null) return;
        Response<JsonObject> respuesta = api.registros(5).execute();
        if (!respuesta.isSuccessful() || respuesta.body() == null) return;
        for (JsonElement elemento : respuesta.body().getAsJsonArray("items")) {
            JsonObject registro = elemento.getAsJsonObject();
            if (registro.get("salida_at").isJsonNull()) {
                cola.registrarJornadaDelServidor(trabajadorId, registro.get("id").getAsString());
                return;
            }
        }
    }

    private static ClasificadorRespuesta.Resultado registrarEvento(DatabaseHelper cola, DatabaseHelper.ItemCola item,
                                                                  Response<JsonObject> respuesta, Resumen resumen) throws IOException {
        if (respuesta.code() != 207 || respuesta.body() == null) {
            return registrar(cola, item, respuesta, resumen, false);
        }
        JsonObject primero = respuesta.body().getAsJsonArray("resultados").get(0).getAsJsonObject();
        String estado = primero.get("estado").getAsString();
        ClasificadorRespuesta.Resultado resultado = ClasificadorRespuesta.clasificarEvento(estado);
        if (resultado == ClasificadorRespuesta.Resultado.ENVIADO) {
            cola.marcarEnviado(item.id, null);
            resumen.enviados++;
        } else if (resultado == ClasificadorRespuesta.Resultado.RECHAZADO) {
            JsonElement codigo = primero.get("code");
            cola.marcarRechazado(item.id, codigo != null ? codigo.getAsString() : "EVENTO_RECHAZADO", "El servidor rechazó el evento");
            resumen.rechazados++;
            resumen.mensaje = "El servidor rechazó la emergencia";
        }
        return resultado;
    }

    private static String describirIngreso(JsonObject cuerpo) {
        StringBuilder texto = new StringBuilder("Ingreso registrado en el servidor");
        if (cuerpo.has("turno") && cuerpo.get("turno").isJsonObject()) {
            JsonObject turno = cuerpo.getAsJsonObject("turno");
            texto.append(". Turno: ").append(turno.get("nombre").getAsString())
                    .append(" ").append(turno.get("hora_inicio").getAsString())
                    .append("-").append(turno.get("hora_fin").getAsString());
        }
        if (cuerpo.has("dentro_de_geocerca") && !cuerpo.get("dentro_de_geocerca").getAsBoolean()) {
            texto.append(". Aviso: la ubicación quedó fuera de la geocerca de la ruta");
        }
        return texto.toString();
    }
}
