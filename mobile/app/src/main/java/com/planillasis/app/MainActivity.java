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
    private Button btnEntrada, btnSalida, btnEmergencia;

    private Handler handler;
    private Runnable runnable;
    private Toast toastActual; // Para evitar que se acumulen los mensajes

    // Base de datos local
    private DatabaseHelper dbHelper;

    // Variables para GPS
    private FusedLocationProviderClient fusedLocationClient;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1000;

    // Coordenadas de prueba
    private static final double EMPRESA_LAT = 14.635057784329875;
    private static final double EMPRESA_LON = -90.74818247343977;
    private static final float RADIO_PERMITIDO_METROS = 999.0f;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 1. Inicializar la base de datos local SQLite
        dbHelper = new DatabaseHelper(this);

        // 2. Vincular interfaz
        tvFechaHoraActual = findViewById(R.id.tvFechaHoraActual);
        tvEstado = findViewById(R.id.tvEstado);
        btnEntrada = findViewById(R.id.btnEntrada);
        btnSalida = findViewById(R.id.btnSalida);
        btnEmergencia = findViewById(R.id.btnEmergencia);

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        iniciarReloj();
        pedirPermisosGPS();

        // 3. Eventos de botones (Nota: La emergencia ignora la distancia permitida)
        btnEntrada.setOnClickListener(v -> procesarRegistro("ENTRADA", false));
        btnSalida.setOnClickListener(v -> procesarRegistro("SALIDA", false));
        btnEmergencia.setOnClickListener(v -> procesarRegistro("EMERGENCIA", true));
    }

    // Nuevo método para evitar que los mensajes se acumulen en pantalla
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

    // Se añadió un boolean para saber si es una emergencia y no validar la distancia
    private void procesarRegistro(String tipoRegistro, boolean ignorarGeocerca) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {

            mostrarMensaje("Se requiere permiso de ubicación para marcar.");
            pedirPermisosGPS();
            return;
        }

        fusedLocationClient.getLastLocation().addOnSuccessListener(this, location -> {
            if (location != null) {
                if (ignorarGeocerca) {
                    // Si es emergencia, guarda directamente sin importar dónde esté
                    guardarRegistroLocal(tipoRegistro, location);
                } else {
                    // Si es entrada o salida, revisa que esté en la empresa
                    verificarGeocerca(location, tipoRegistro);
                }
            } else {
                mostrarMensaje("El GPS está inactivo. Abre Google Maps un momento y vuelve a intentar.");
            }
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

            // Si está dentro de la distancia, se guarda en SQLite
            guardarRegistroLocal(tipoRegistro, ubicacionActual);
            mostrarMensaje(tipoRegistro + " autorizada. Guardado en modo Offline.");

        } else {
            mostrarMensaje("ESTÁS MUY LEJOS: A " + Math.round(distanciaMetros) + " metros de la empresa.");
        }
    }

    // Método que escribe en la base de datos local
    private void guardarRegistroLocal(String tipo, Location loc) {
        String fecha = obtenerHoraActual();
        boolean exito = dbHelper.insertarRegistro(tipo, fecha, loc.getLatitude(), loc.getLongitude());

        if (exito && tipo.equals("EMERGENCIA")) {
            mostrarMensaje("🚨 ALERTA DE EMERGENCIA REGISTRADA Y GUARDADA 🚨");
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

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
    }
}