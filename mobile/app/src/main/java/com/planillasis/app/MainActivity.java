package com.planillasis.app;

import android.Manifest;
import android.content.pm.PackageManager;
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

public class MainActivity extends AppCompatActivity {

    private TextView tvFechaHoraActual, tvEstado;
    private Button btnEntrada, btnSalida;
    private Handler handler;
    private Runnable runnable;
    private Toast toastActual;

    // Variables para GPS
    private FusedLocationProviderClient fusedLocationClient;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1000;

    // Coordenadas de prueba (Cámbialas por tu ubicación exacta para hacer la prueba)
    private static final double EMPRESA_LAT = 14.636350014706705;
    private static final double EMPRESA_LON = -90.7540528373286;
    private static final float RADIO_PERMITIDO_METROS = 100.0f; // 100 metros a la redonda

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Vincular interfaz
        tvFechaHoraActual = findViewById(R.id.tvFechaHoraActual);
        tvEstado = findViewById(R.id.tvEstado);
        btnEntrada = findViewById(R.id.btnEntrada);
        btnSalida = findViewById(R.id.btnSalida);

        // Inicializar cliente de ubicación
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        // Iniciar procesos
        iniciarReloj();
        pedirPermisosGPS();

        // Eventos de botones
        btnEntrada.setOnClickListener(v -> procesarRegistro("ENTRADA"));
        btnSalida.setOnClickListener(v -> procesarRegistro("SALIDA"));
    }

    private void pedirPermisosGPS() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {

            // Pedimos ambos permisos a la vez (obligatorio en Android 12+)
            ActivityCompat.requestPermissions(this,
                    new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    LOCATION_PERMISSION_REQUEST_CODE);
        }
    }

    private void procesarRegistro(String tipoRegistro) {
        // Verificar permisos nuevamente antes de usar el GPS
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {

            Toast.makeText(this, "Se requiere permiso de ubicación para marcar.", Toast.LENGTH_SHORT).show();
            pedirPermisosGPS(); // Volver a pedir si los denegó
            return;
        }

        // Obtener última ubicación conocida
        fusedLocationClient.getLastLocation().addOnSuccessListener(this, location -> {
            if (location != null) {
                verificarGeocerca(location, tipoRegistro);
            } else {
                Toast.makeText(this, "El GPS está inactivo. Abre Google Maps un momento y vuelve a intentar.", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void verificarGeocerca(Location ubicacionActual, String tipoRegistro) {
        // Crear un objeto Location con las coordenadas de la empresa
        Location ubicacionEmpresa = new Location("");
        ubicacionEmpresa.setLatitude(EMPRESA_LAT);
        ubicacionEmpresa.setLongitude(EMPRESA_LON);

        // Calcular distancia
        float distanciaMetros = ubicacionActual.distanceTo(ubicacionEmpresa);
        String horaRegistro = obtenerHoraActual();

        if (distanciaMetros <= RADIO_PERMITIDO_METROS) {
            // ÉXITO: Está dentro de la empresa
            if (tipoRegistro.equals("ENTRADA")) {
                tvEstado.setText("Estado: EN RUTA (Entrada: " + horaRegistro + ")");
                btnEntrada.setEnabled(false);
                btnSalida.setEnabled(true);
            } else {
                tvEstado.setText("Estado: FINALIZADA (Salida: " + horaRegistro + ")");
                btnEntrada.setEnabled(false);
                btnSalida.setEnabled(false);
            }

            Toast.makeText(this, tipoRegistro + " registrada correctamente. Distancia: " + Math.round(distanciaMetros) + "m", Toast.LENGTH_LONG).show();

        } else {
            // ERROR: Está muy lejos
            Toast.makeText(this, "ESTÁS MUY LEJOS: A " + Math.round(distanciaMetros) + " metros de la empresa. Acércate para marcar.", Toast.LENGTH_LONG).show();
        }
    }

    private String obtenerHoraActual() {
        SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault());
        return sdf.format(new Date());
    }

    private void iniciarReloj() {
        handler = new Handler(Looper.getMainLooper());
        runnable = new Runnable() {
            @Override
            public void run() {
                tvFechaHoraActual.setText(obtenerHoraActual());
                handler.postDelayed(this, 1000);
            }
        };
        handler.post(runnable);
    }

    private void mostrarMensaje(String mensaje) {
        if (toastActual != null) {
            toastActual.cancel(); // Cancela el anterior si existe
        }
        toastActual = Toast.makeText(this, mensaje, Toast.LENGTH_LONG);
        toastActual.show();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
    }
}