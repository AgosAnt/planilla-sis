package com.planillasis.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.gson.JsonObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {

    private TextView tvFechaHoraActual, tvEstado, tvTrabajador, tvRuta, tvSincronizacion;
    private Button btnEntrada, btnSalida, btnEmergencia, btnDescanso;

    private Handler handler;
    private Runnable runnable;
    private Toast toastActual;

    private DatabaseHelper dbHelper;
    private SesionManager sesion;
    private Perfil perfil;
    private FusedLocationProviderClient fusedLocationClient;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1000;
    private static final double EMPRESA_LAT = 14.635202183200219;
    private static final double EMPRESA_LON = -90.74817535490664;
    private static final float RADIO_PERMITIDO_METROS = 100.0f;

    // Catálogo tipos_descanso del seed de M004 (falta GET /catalogos/tipos-descanso en el backend)
    private static final String[] NOMBRES_DESCANSO = { "Almuerzo", "Pausa activa / café", "Imprevisto / sanitario" };
    private static final int[] TIPOS_DESCANSO = { 1, 2, 3 };

    private boolean procesandoRegistro = false;

    // Envío automático de pendientes: al volver el WiFi de la oficina y, mientras queden, cada 30 s
    private static final long REINTENTO_MS = 30_000;
    private ConnectivityManager.NetworkCallback escuchaRed;
    private final Runnable reintentoPeriodico = new Runnable() {
        @Override
        public void run() {
            if (dbHelper.contar(perfil.id, DatabaseHelper.PENDIENTE) > 0) sincronizar();
            handler.postDelayed(this, REINTENTO_MS);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        sesion = new SesionManager(this);
        if (!sesion.haySesion()) {
            irAlLogin();
            return;
        }
        perfil = sesion.perfil();

        setContentView(R.layout.activity_main);
        dbHelper = new DatabaseHelper(this);

        tvFechaHoraActual = findViewById(R.id.tvFechaHoraActual);
        tvEstado = findViewById(R.id.tvEstado);
        tvTrabajador = findViewById(R.id.tvTrabajador);
        tvRuta = findViewById(R.id.tvRuta);
        tvSincronizacion = findViewById(R.id.tvSincronizacion);
        btnEntrada = findViewById(R.id.btnEntrada);
        btnSalida = findViewById(R.id.btnSalida);
        btnDescanso = findViewById(R.id.btnDescanso);
        btnEmergencia = findViewById(R.id.btnEmergencia);

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        iniciarReloj();
        pedirPermisosGPS();
        mostrarPerfil();
        restaurarEstadoUI();

        btnEntrada.setOnClickListener(v -> procesarRegistro(DatabaseHelper.TIPO_INGRESO, false));
        btnSalida.setOnClickListener(v -> procesarRegistro(DatabaseHelper.TIPO_SALIDA, false));
        btnEmergencia.setOnClickListener(v -> procesarRegistro(DatabaseHelper.TIPO_EVENTO, true));
        btnDescanso.setOnClickListener(v -> alternarDescanso());
        findViewById(R.id.btnSalir).setOnClickListener(v -> confirmarSalida());
        tvSincronizacion.setOnClickListener(v -> {
            mostrarMensaje("Reintentando el envío...");
            sincronizar();
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (perfil == null) return;
        actualizarPerfil();
        sincronizar();
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (perfil == null) return;
        escucharWifi();
        handler.postDelayed(reintentoPeriodico, REINTENTO_MS);
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (perfil == null) return;
        handler.removeCallbacks(reintentoPeriodico);
        if (escuchaRed != null) {
            ((ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE)).unregisterNetworkCallback(escuchaRed);
            escuchaRed = null;
        }
    }

    // El servidor está en la LAN de la oficina: al conectarse a un WiFi se intenta enviar lo pendiente
    private void escucharWifi() {
        ConnectivityManager conectividad = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        NetworkRequest soloWifi = new NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build();
        escuchaRed = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network red) {
                runOnUiThread(() -> sincronizar());
            }
        };
        conectividad.registerNetworkCallback(soloWifi, escuchaRed);
    }

    private String obtenerHoraActual() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC")); // Siempre enviar UTC al servidor
        return sdf.format(new Date());
    }

    private void iniciarReloj() {
        handler = new Handler(Looper.getMainLooper());
        runnable = new Runnable() {
            @Override
            public void run() {
                SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault());
                tvFechaHoraActual.setText(sdf.format(new Date()));
                handler.postDelayed(this, 1000);
            }
        };
        handler.post(runnable);
    }

    // === Perfil y estado ===

    private void mostrarPerfil() {
        tvTrabajador.setText(perfil.nombreCompleto());
        Perfil.AsignacionActiva asignacion = perfil.asignacionActiva;
        if (asignacion == null) {
            tvRuta.setText("Sin ruta asignada hoy: consulta a tu supervisor");
            return;
        }
        StringBuilder texto = new StringBuilder("Ruta ").append(asignacion.ruta.codigo).append(" · ").append(asignacion.ruta.nombre);
        if (asignacion.turnoHoy != null) {
            texto.append("\nTurno: ").append(asignacion.turnoHoy.nombre).append(" ")
                    .append(asignacion.turnoHoy.horaInicio).append("-").append(asignacion.turnoHoy.horaFin);
        }
        tvRuta.setText(texto);
    }

    // Refresca la asignación del día cuando hay conexión; sin red se usa la guardada
    private void actualizarPerfil() {
        RetrofitClient.getApiService(this).perfil().enqueue(new Callback<Perfil>() {
            @Override
            public void onResponse(@NonNull Call<Perfil> call, @NonNull Response<Perfil> response) {
                if (response.isSuccessful() && response.body() != null) {
                    perfil = response.body();
                    sesion.guardarPerfil(perfil);
                    mostrarPerfil();
                    restaurarEstadoUI();
                }
            }

            @Override
            public void onFailure(@NonNull Call<Perfil> call, @NonNull Throwable t) {
                // Fuera de la red de la oficina: se sigue con el perfil guardado
            }
        });
    }

    private void restaurarEstadoUI() {
        boolean enRuta = dbHelper.jornadaAbierta(perfil.id) != null;
        String inicioDescanso = sesion.inicioDescanso();

        if (enRuta && inicioDescanso != null) {
            tvEstado.setText("Estado: EN DESCANSO");
        } else if (enRuta) {
            tvEstado.setText("Estado: EN RUTA");
        } else {
            tvEstado.setText("Estado: LISTO PARA INICIAR");
        }
        btnEntrada.setEnabled(!enRuta && perfil.asignacionActiva != null);
        btnSalida.setEnabled(enRuta && inicioDescanso == null);
        btnDescanso.setEnabled(enRuta);
        btnDescanso.setText(inicioDescanso == null ? "Iniciar descanso" : "Terminar descanso");
        mostrarEstadoCola(null);
    }

    private void mostrarEstadoCola(String mensaje) {
        int pendientes = dbHelper.contar(perfil.id, DatabaseHelper.PENDIENTE);
        int rechazados = dbHelper.contar(perfil.id, DatabaseHelper.RECHAZADO);
        StringBuilder texto = new StringBuilder();
        texto.append(pendientes == 0 ? "Todo enviado al servidor."
                : "Pendientes de enviar: " + pendientes + ". Se envían solos al conectarte a la red de la oficina (toca aquí para reintentar).");
        if (rechazados > 0) {
            DatabaseHelper.ItemCola ultimo = dbHelper.ultimoRechazado(perfil.id);
            texto.append("\nRechazados por el servidor: ").append(rechazados);
            if (ultimo != null && ultimo.detalleError != null) texto.append(". Último: ").append(ultimo.detalleError);
        }
        if (mensaje != null) texto.append("\n").append(mensaje);
        tvSincronizacion.setText(texto);
    }

    private void mostrarMensaje(String mensaje) {
        if (toastActual != null) toastActual.cancel();
        toastActual = Toast.makeText(this, mensaje, Toast.LENGTH_LONG);
        toastActual.show();
    }

    // === Marcas ===

    private void pedirPermisosGPS() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                    LOCATION_PERMISSION_REQUEST_CODE);
        }
    }

    private void procesarRegistro(String tipoRegistro, boolean ignorarGeocerca) {
        if (procesandoRegistro) {
            mostrarMensaje("Ya se está procesando un registro, espera un momento...");
            return;
        }

        // Apagar botones inmediatamente para evitar clicks multiples
        btnEntrada.setEnabled(false);
        btnSalida.setEnabled(false);
        btnEmergencia.setEnabled(false);
        mostrarMensaje("📍 Obteniendo ubicación...");

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            mostrarMensaje("Se requiere permiso de ubicación para marcar.");
            pedirPermisosGPS();
            restaurarEstadoUI();
            btnEmergencia.setEnabled(true);
            return;
        }

        procesandoRegistro = true;

        fusedLocationClient.getLastLocation()
                .addOnSuccessListener(this, location -> {
                    try {
                        if (location != null) {
                            if (ignorarGeocerca) {
                                guardarRegistroLocal(tipoRegistro, location);
                            } else {
                                verificarGeocerca(location, tipoRegistro);
                            }
                        } else {
                            mostrarMensaje("El GPS está inactivo. Abre Google Maps un momento y vuelve a intentar.");
                        }
                    } finally {
                        procesandoRegistro = false;
                        restaurarEstadoUI();
                        btnEmergencia.setEnabled(true);
                    }
                })
                .addOnFailureListener(this, e -> {
                    procesandoRegistro = false;
                    restaurarEstadoUI();
                    btnEmergencia.setEnabled(true);
                    mostrarMensaje("No se pudo obtener la ubicación. Intenta de nuevo.");
                });
    }

    // Misma geocerca de la empresa que antes: entrada y salida solo dentro del radio permitido
    private void verificarGeocerca(Location ubicacionActual, String tipoRegistro) {
        Location ubicacionEmpresa = new Location("");
        ubicacionEmpresa.setLatitude(EMPRESA_LAT);
        ubicacionEmpresa.setLongitude(EMPRESA_LON);

        float distanciaMetros = ubicacionActual.distanceTo(ubicacionEmpresa);
        if (distanciaMetros <= RADIO_PERMITIDO_METROS) {
            guardarRegistroLocal(tipoRegistro, ubicacionActual);
        } else {
            mostrarMensaje("ESTÁS MUY LEJOS: A " + Math.round(distanciaMetros) + " metros de la empresa.");
        }
    }

    // Guarda la marca en la cola local (funciona sin conexión) y luego intenta enviarla
    private void guardarRegistroLocal(String tipo, Location loc) {
        String fecha = obtenerHoraActual();
        String clientUuid = UUID.randomUUID().toString();
        DatabaseHelper.ItemCola jornada = dbHelper.jornadaAbierta(perfil.id);
        JsonObject cuerpo = new JsonObject();

        switch (tipo) {
            case DatabaseHelper.TIPO_INGRESO:
                if (perfil.asignacionActiva == null) {
                    mostrarMensaje("No tienes ruta asignada hoy. Consulta a tu supervisor.");
                    return;
                }
                cuerpo.addProperty("client_uuid", clientUuid);
                cuerpo.addProperty("asignacion_id", perfil.asignacionActiva.id);
                cuerpo.addProperty("ingreso_at", fecha);
                cuerpo.add("ubicacion", ubicacion(loc));
                cuerpo.add("dispositivo", dispositivo());
                dbHelper.encolar(perfil.id, tipo, clientUuid, cuerpo.toString(), null, null);
                mostrarMensaje("ENTRADA guardada. Enviando al servidor...");
                break;

            case DatabaseHelper.TIPO_SALIDA:
                if (jornada == null) return;
                cuerpo.addProperty("salida_at", fecha);
                cuerpo.add("ubicacion", ubicacion(loc));
                dbHelper.encolar(perfil.id, tipo, clientUuid, cuerpo.toString(), jornada.id, jornada.registroServidorId);
                mostrarMensaje("SALIDA guardada. Enviando al servidor...");
                break;

            default: // EVENTO de emergencia
                cuerpo.addProperty("client_uuid", clientUuid);
                cuerpo.addProperty("tipo_evento", "EMERGENCIA");
                cuerpo.addProperty("esquema_version", 1);
                cuerpo.addProperty("ocurrido_en", fecha);
                cuerpo.addProperty("latitud", loc.getLatitude());
                cuerpo.addProperty("longitud", loc.getLongitude());
                JsonObject payload = new JsonObject();
                payload.addProperty("origen", "boton_emergencia");
                payload.addProperty("precision_m", loc.getAccuracy());
                cuerpo.add("payload", payload);
                dbHelper.encolar(perfil.id, tipo, clientUuid, cuerpo.toString(),
                        jornada != null ? jornada.id : null, jornada != null ? jornada.registroServidorId : null);
                mostrarMensaje("🚨 EMERGENCIA GUARDADA. Enviando al servidor...");
                break;
        }
        sincronizar();
    }

    // Descanso completo (el servidor lo pide con inicio y fin): primer toque inicia, segundo termina
    private void alternarDescanso() {
        DatabaseHelper.ItemCola jornada = dbHelper.jornadaAbierta(perfil.id);
        if (jornada == null) return;
        String inicio = sesion.inicioDescanso();
        if (inicio == null) {
            sesion.guardarInicioDescanso(obtenerHoraActual());
            restaurarEstadoUI();
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle("¿Qué tipo de descanso fue?")
                .setItems(NOMBRES_DESCANSO, (dialogo, posicion) -> {
                    String clientUuid = UUID.randomUUID().toString();
                    JsonObject cuerpo = new JsonObject();
                    cuerpo.addProperty("client_uuid", clientUuid);
                    cuerpo.addProperty("tipo_id", TIPOS_DESCANSO[posicion]);
                    cuerpo.addProperty("inicio_at", inicio);
                    cuerpo.addProperty("fin_at", obtenerHoraActual());
                    dbHelper.encolar(perfil.id, DatabaseHelper.TIPO_DESCANSO, clientUuid, cuerpo.toString(),
                            jornada.id, jornada.registroServidorId);
                    sesion.limpiarDescanso();
                    restaurarEstadoUI();
                    sincronizar();
                })
                .setNegativeButton("Seguir en descanso", null)
                .show();
    }

    private JsonObject ubicacion(Location loc) {
        JsonObject ubicacion = new JsonObject();
        ubicacion.addProperty("lat", loc.getLatitude());
        ubicacion.addProperty("lng", loc.getLongitude());
        if (loc.hasAccuracy()) ubicacion.addProperty("precision_m", loc.getAccuracy());
        return ubicacion;
    }

    private JsonObject dispositivo() {
        JsonObject dispositivo = new JsonObject();
        dispositivo.addProperty("id", Build.MANUFACTURER + " " + Build.MODEL);
        try {
            dispositivo.addProperty("app_version", getPackageManager().getPackageInfo(getPackageName(), 0).versionName);
        } catch (PackageManager.NameNotFoundException e) {
            // Sin versión: el servidor la acepta opcional
        }
        return dispositivo;
    }

    // === Sincronización y sesión ===

    private void sincronizar() {
        Sincronizador.sincronizar(this, resumen -> {
            if (isFinishing()) return;
            if (resumen.requiereLogin) {
                mostrarMensaje("Tu sesión venció. Inicia sesión de nuevo para enviar lo pendiente.");
                irAlLogin();
                return;
            }
            restaurarEstadoUI();
            mostrarEstadoCola(resumen.sinConexion ? "Sin conexión con el servidor de la oficina." : resumen.mensaje);
        });
    }

    private void confirmarSalida() {
        int pendientes = dbHelper.contar(perfil.id, DatabaseHelper.PENDIENTE);
        String mensaje = pendientes == 0 ? "¿Cerrar sesión en este teléfono?"
                : "Tienes " + pendientes + " marcas sin enviar. Se guardan en el teléfono y se enviarán cuando vuelvas a iniciar sesión con tu usuario.";
        new AlertDialog.Builder(this)
                .setTitle("Cerrar sesión")
                .setMessage(mensaje)
                .setPositiveButton("Cerrar sesión", (d, w) -> {
                    sesion.cerrar();
                    irAlLogin();
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void irAlLogin() {
        startActivity(new Intent(this, LoginActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK));
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
    }
}
