package com.planillasis.app;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButtonToggleGroup;
import com.google.gson.JsonObject;

import java.util.Calendar;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

// Mi cálculo: horas de la quincena según las reglas de cálculo (GET /me/calculo). Solo cuenta jornadas ya
// aprobadas por el supervisor y no muestra montos: la tarifa y el neto salen en la planilla.
public class MiCalculoActivity extends AppCompatActivity {

    private TextView tvPeriodo, tvOrdinarias, tvExtraDiurnas, tvExtraNocturnas, tvJornadas, tvPendientes, tvError;
    private Button btnActual, btnAnterior;
    private MaterialButtonToggleGroup grupoQuincena;
    private View cardCalculo;
    private Quincena actual, anterior;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_mi_calculo);

        tvPeriodo = findViewById(R.id.tvPeriodo);
        tvOrdinarias = findViewById(R.id.tvOrdinarias);
        tvExtraDiurnas = findViewById(R.id.tvExtraDiurnas);
        tvExtraNocturnas = findViewById(R.id.tvExtraNocturnas);
        tvJornadas = findViewById(R.id.tvJornadas);
        tvPendientes = findViewById(R.id.tvPendientes);
        tvError = findViewById(R.id.tvErrorCalculo);
        btnActual = findViewById(R.id.btnQuincenaActual);
        btnAnterior = findViewById(R.id.btnQuincenaAnterior);
        grupoQuincena = findViewById(R.id.grupoQuincena);
        cardCalculo = findViewById(R.id.cardCalculo);

        actual = Quincena.de(Calendar.getInstance());
        anterior = actual.anterior();
        btnActual.setOnClickListener(v -> cargar(actual));
        btnAnterior.setOnClickListener(v -> cargar(anterior));
        findViewById(R.id.btnVolverCalculo).setOnClickListener(v -> finish());

        cargar(actual);
        Animaciones.entrada(findViewById(R.id.contenidoCalculo));
    }

    private void cargar(Quincena quincena) {
        grupoQuincena.check(quincena == actual ? R.id.btnQuincenaActual : R.id.btnQuincenaAnterior);
        tvPeriodo.setText(quincena.nombre);
        tvError.setVisibility(View.GONE);
        for (TextView valor : new TextView[] { tvOrdinarias, tvExtraDiurnas, tvExtraNocturnas, tvJornadas }) valor.setText("…");
        tvPendientes.setVisibility(View.GONE);

        RetrofitClient.getApiService(this).miCalculo(quincena.desde, quincena.hasta).enqueue(new Callback<JsonObject>() {
            @Override
            public void onResponse(@NonNull Call<JsonObject> call, @NonNull Response<JsonObject> response) {
                if (isFinishing()) return;
                JsonObject cuerpo = response.body();
                if (!response.isSuccessful() || cuerpo == null) {
                    mostrarError(RespuestaApi.mensaje(response, RespuestaApi.problema(response)));
                    return;
                }
                tvOrdinarias.setText(horas(cuerpo, "horas_ordinarias"));
                tvExtraDiurnas.setText(horas(cuerpo, "horas_extra_diurnas"));
                tvExtraNocturnas.setText(horas(cuerpo, "horas_extra_nocturnas"));
                tvJornadas.setText(String.valueOf(cuerpo.get("jornadas_contadas").getAsInt()));
                Animaciones.cambio(cardCalculo);
                int pendientes = cuerpo.get("jornadas_pendientes").getAsInt();
                if (pendientes > 0) {
                    tvPendientes.setText(pendientes + (pendientes == 1 ? " jornada todavía no está aprobada" : " jornadas todavía no están aprobadas")
                            + " por tu supervisor; se sumarán cuando las apruebe.");
                    tvPendientes.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onFailure(@NonNull Call<JsonObject> call, @NonNull Throwable t) {
                if (!isFinishing()) mostrarError(RespuestaApi.SIN_CONEXION);
            }
        });
    }

    private static String horas(JsonObject cuerpo, String campo) {
        return cuerpo.get(campo).getAsString() + " h";
    }

    private void mostrarError(String mensaje) {
        for (TextView valor : new TextView[] { tvOrdinarias, tvExtraDiurnas, tvExtraNocturnas, tvJornadas }) valor.setText("—");
        tvError.setText(mensaje);
        tvError.setVisibility(View.VISIBLE);
    }
}
