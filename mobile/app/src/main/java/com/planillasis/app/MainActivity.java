package com.planillasis.app; // ¡Asegúrate de que esta línea coincida con tu paquete!

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private TextView tvFechaHoraActual;
    private TextView tvEstado;
    private Button btnEntrada;
    private Button btnSalida;
    private Handler handler;
    private Runnable runnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 1. Vincular las variables con los IDs del XML
        tvFechaHoraActual = findViewById(R.id.tvFechaHoraActual);
        tvEstado = findViewById(R.id.tvEstado);
        btnEntrada = findViewById(R.id.btnEntrada);
        btnSalida = findViewById(R.id.btnSalida);

        // 2. Iniciar el reloj en tiempo real
        iniciarReloj();

        // 3. Programar el botón de Entrada
        btnEntrada.setOnClickListener(v -> {
            String horaRegistro = obtenerHoraActual();
            tvEstado.setText("Estado: EN RUTA (Entrada: " + horaRegistro + ")");

            // Habilitar salida y deshabilitar entrada
            btnEntrada.setEnabled(false);
            btnSalida.setEnabled(true);

            // Aquí iría el código para guardar en la BD local o enviar a la API
            Toast.makeText(this, "Entrada registrada a las " + horaRegistro, Toast.LENGTH_SHORT).show();
        });

        // 4. Programar el botón de Salida
        btnSalida.setOnClickListener(v -> {
            String horaRegistro = obtenerHoraActual();
            tvEstado.setText("Estado: FINALIZADA (Salida: " + horaRegistro + ")");

            // Deshabilitar ambos botones (la jornada terminó)
            btnEntrada.setEnabled(false);
            btnSalida.setEnabled(false);

            // Aquí iría el código para guardar en la BD local o enviar a la API
            Toast.makeText(this, "Salida registrada a las " + horaRegistro, Toast.LENGTH_SHORT).show();
        });
    }

    // Método para obtener la hora formateada
    private String obtenerHoraActual() {
        SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault());
        return sdf.format(new Date());
    }

    // Método para actualizar el TextView del reloj cada segundo
    private void iniciarReloj() {
        handler = new Handler(Looper.getMainLooper());
        runnable = new Runnable() {
            @Override
            public void run() {
                tvFechaHoraActual.setText(obtenerHoraActual());
                handler.postDelayed(this, 1000); // Se repite cada 1000 ms (1 segundo)
            }
        };
        handler.post(runnable);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Detener el reloj cuando la app se cierra para no consumir memoria
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
    }
}