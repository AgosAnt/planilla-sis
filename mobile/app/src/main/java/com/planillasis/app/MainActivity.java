package com.planillasis.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.location.Location;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {

    private TextView tvFechaHoraActual, tvEstado;
    private Button btnEntrada, btnSalida, btnEmergencia;

    private Handler handler;
    private Runnable runnable;
    private Toast toastActual;

    private DatabaseHelper dbHelper;
    private FusedLocationProviderClient fusedLocationClient;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1000;
    private static final double EMPRESA_LAT = 14.635202183200219;
    private static final double EMPRESA_LON = -90.74817535490664;
    private static final float RADIO_PERMITIDO_METROS = 100.0f;

    private boolean procesandoRegistro = false;
    private int solicitudesPendientes = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        dbHelper = new DatabaseHelper(this);

        tvFechaHoraActual = findViewById(R.id.tvFechaHoraActual);
        tvEstado = findViewById(R.id.tvEstado);
        btnEntrada = findViewById(R.id.btnEntrada);
        btnSalida = findViewById(R.id.btnSalida);
        btnEmergencia = findViewById(R.id.btnEmergencia);

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        iniciarReloj();
        pedirPermisosGPS();
        restaurarEstadoUI();

        btnEntrada.setOnClickListener(v -> procesarRegistro("ENTRADA", false));
        btnSalida.setOnClickListener(v -> procesarRegistro("SALIDA", false));
        btnEmergencia.setOnClickListener(v -> procesarRegistro("EMERGENCIA", true));
    } // <--- AQUÍ TERMINA EL ONCREATE CORRECTAMENTE

    // === MÉTODOS NUEVOS AFUERA DEL ONCREATE ===

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
                String fechaHoraStr = sdf.format(new Date());
                tvFechaHoraActual.setText(fechaHoraStr);
                handler.postDelayed(this, 1000);
            }
        };
        handler.post(runnable);
    }

    // === RESTO DE TUS MÉTODOS ===

    private void restaurarEstadoUI() {
        String ultimoEstado = dbHelper.obtenerUltimoEstado();

        if ("ENTRADA".equals(ultimoEstado)) {
            tvEstado.setText("Estado: EN RUTA");
            btnEntrada.setEnabled(false);
            btnSalida.setEnabled(true);
        } else {
            tvEstado.setText("Estado: LISTO PARA INICIAR");
            btnEntrada.setEnabled(true);
            btnSalida.setEnabled(false);
        }
    }

    private void mostrarMensaje(String mensaje) {
        if (toastActual != null) {
            toastActual.cancel();
        }
        toastActual = Toast.makeText(this, mensaje, Toast.LENGTH_LONG);
        toastActual.show();
    }

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

    private void verificarGeocerca(Location ubicacionActual, String tipoRegistro) {
        Location ubicacionEmpresa = new Location("");
        ubicacionEmpresa.setLatitude(EMPRESA_LAT);
        ubicacionEmpresa.setLongitude(EMPRESA_LON);

        float distanciaMetros = ubicacionActual.distanceTo(ubicacionEmpresa);
        String horaRegistro = obtenerHoraActual();

        if (distanciaMetros <= RADIO_PERMITIDO_METROS) {
            if (tipoRegistro.equals("ENTRADA")) {
                tvEstado.setText("Estado: EN RUTA (Entrada: " + horaRegistro + ")");
                btnEntrada.setEnabled(false);
                btnSalida.setEnabled(true);
            } else if (tipoRegistro.equals("SALIDA")) {
                tvEstado.setText("Estado: FINALIZADA (Salida: " + horaRegistro + ")");
                btnEntrada.setEnabled(false);
                btnSalida.setEnabled(false);
            }

            guardarRegistroLocal(tipoRegistro, ubicacionActual);

        } else {
            mostrarMensaje("ESTÁS MUY LEJOS: A " + Math.round(distanciaMetros) + " metros de la empresa.");
        }
    }

    private void guardarRegistroLocal(String tipo, Location loc) {
        String fecha = obtenerHoraActual();
        boolean exito = dbHelper.insertarRegistro(tipo, fecha, loc.getLatitude(), loc.getLongitude());

        if (exito) {
            if (tipo.equals("EMERGENCIA")) {
                mostrarMensaje("🚨 EMERGENCIA GUARDADA OFFLINE. Intentando enviar...");
            } else {
                mostrarMensaje(tipo + " guardada en modo Offline. Intentando enviar...");
            }
            sincronizarConServidor();
        }
    }

    private void sincronizarConServidor() {
        if (solicitudesPendientes > 0) {
            return;
        }

        Cursor cursor = dbHelper.obtenerRegistrosPendientes();
        ApiService apiService = RetrofitClient.getApiService();

        if (cursor != null && cursor.moveToFirst()) {
            do {
                int idCol = cursor.getColumnIndex(DatabaseHelper.COL_ID);
                int tipoCol = cursor.getColumnIndex(DatabaseHelper.COL_TIPO);
                int fechaCol = cursor.getColumnIndex(DatabaseHelper.COL_FECHA);
                int latCol = cursor.getColumnIndex(DatabaseHelper.COL_LATITUD);
                int lonCol = cursor.getColumnIndex(DatabaseHelper.COL_LONGITUD);

                final int idLocal = cursor.getInt(idCol);
                String tipo = cursor.getString(tipoCol);
                String fecha = cursor.getString(fechaCol);
                double lat = cursor.getDouble(latCol);
                double lon = cursor.getDouble(lonCol);

                AsistenciaRequest request = new AsistenciaRequest(1, tipo, fecha, lat, lon);
                solicitudesPendientes++;

                Call<ResponseBody> call = apiService.registrarAsistencia(request);

                call.enqueue(new Callback<ResponseBody>() {
                    @Override
                    public void onResponse(Call<ResponseBody> call, Response<ResponseBody> response) {
                        solicitudesPendientes--;
                        if (response.isSuccessful() || response.code() == 409 || response.code() == 400) {
                            dbHelper.marcarComoSincronizado(idLocal);
                            mostrarMensaje("Sincronización exitosa con el servidor.");
                        } else {
                            mostrarMensaje("Error del servidor al sincronizar.");
                        }
                    }

                    @Override
                    public void onFailure(Call<ResponseBody> call, Throwable t) {
                        solicitudesPendientes--;
                        mostrarMensaje("Sin conexión al servidor. Datos guardados Offline.");
                    }
                });

            } while (cursor.moveToNext());
            cursor.close();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
    }
}