package com.planillasis.app;

import android.content.res.ColorStateList;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.ViewCompat;

import com.google.android.material.color.MaterialColors;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

// Mis turnos (CU-06): los turnos que el supervisor propone desde hoy. El trabajador acepta o rechaza los
// PROPUESTOS; después el supervisor confirma los aceptados.
public class TurnosActivity extends AppCompatActivity {

    private LinearLayout lista;
    private TextView tvMensaje;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_turnos);
        lista = findViewById(R.id.listaTurnos);
        tvMensaje = findViewById(R.id.tvMensajeTurnos);
        findViewById(R.id.btnVolverTurnos).setOnClickListener(v -> finish());
        cargar();
    }

    private void cargar() {
        mostrarMensaje("Cargando turnos…", false);
        String hoy = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        RetrofitClient.getApiService(this).acuerdos(hoy, 50).enqueue(new Callback<JsonObject>() {
            @Override
            public void onResponse(@NonNull Call<JsonObject> call, @NonNull Response<JsonObject> response) {
                if (isFinishing()) return;
                if (!response.isSuccessful() || response.body() == null) {
                    mostrarMensaje(RespuestaApi.mensaje(response, RespuestaApi.problema(response)), true);
                    return;
                }
                mostrar(response.body());
            }

            @Override
            public void onFailure(@NonNull Call<JsonObject> call, @NonNull Throwable t) {
                if (!isFinishing()) mostrarMensaje(RespuestaApi.SIN_CONEXION, true);
            }
        });
    }

    private void mostrar(JsonObject pagina) {
        lista.removeAllViews();
        if (pagina.getAsJsonArray("items").size() == 0) {
            mostrarMensaje("No tienes turnos propuestos desde hoy. Tu supervisor te los asigna desde la web.", false);
            return;
        }
        tvMensaje.setVisibility(View.GONE);
        for (JsonElement elemento : pagina.getAsJsonArray("items")) {
            lista.addView(tarjeta(elemento.getAsJsonObject()));
        }
        Animaciones.entrada(lista);
    }

    private View tarjeta(JsonObject acuerdo) {
        View vista = getLayoutInflater().inflate(R.layout.item_turno, lista, false);
        JsonObject turno = acuerdo.getAsJsonObject("turno");
        String estado = acuerdo.get("estado").getAsString();

        ((TextView) vista.findViewById(R.id.tvFechaTurno)).setText(fecha(acuerdo.get("fecha").getAsString()));
        ((TextView) vista.findViewById(R.id.tvDetalleTurno)).setText(turno.get("nombre").getAsString() + " · "
                + turno.get("hora_inicio").getAsString() + " a " + turno.get("hora_fin").getAsString());
        TextView tvEstado = vista.findViewById(R.id.tvEstadoTurno);
        tvEstado.setText(textoEstado(estado));
        colorearEstado(tvEstado, estado);

        View botones = vista.findViewById(R.id.botonesTurno);
        botones.setVisibility("PROPUESTO".equals(estado) ? View.VISIBLE : View.GONE);
        String id = acuerdo.get("id").getAsString();
        Button aceptar = vista.findViewById(R.id.btnAceptarTurno);
        Button rechazar = vista.findViewById(R.id.btnRechazarTurno);
        aceptar.setOnClickListener(v -> responder(id, "ACEPTADO", aceptar, rechazar));
        rechazar.setOnClickListener(v -> new MaterialAlertDialogBuilder(this)
                .setTitle("Rechazar turno")
                .setMessage("¿Rechazar el turno del " + fecha(acuerdo.get("fecha").getAsString()) + "? Tu supervisor verá que no puedes.")
                .setPositiveButton("Rechazar", (d, w) -> responder(id, "RECHAZADO", aceptar, rechazar))
                .setNegativeButton("Cancelar", null)
                .show());
        return vista;
    }

    private void responder(String acuerdoId, String estado, Button aceptar, Button rechazar) {
        aceptar.setEnabled(false);
        rechazar.setEnabled(false);
        JsonObject cuerpo = new JsonObject();
        cuerpo.addProperty("estado", estado);
        RetrofitClient.getApiService(this).responderAcuerdo(acuerdoId, cuerpo).enqueue(new Callback<JsonObject>() {
            @Override
            public void onResponse(@NonNull Call<JsonObject> call, @NonNull Response<JsonObject> response) {
                if (isFinishing()) return;
                if (!response.isSuccessful()) {
                    aceptar.setEnabled(true);
                    rechazar.setEnabled(true);
                    new MaterialAlertDialogBuilder(TurnosActivity.this)
                            .setMessage(RespuestaApi.mensaje(response, RespuestaApi.problema(response)))
                            .setPositiveButton("Aceptar", null)
                            .show();
                    return;
                }
                cargar();
            }

            @Override
            public void onFailure(@NonNull Call<JsonObject> call, @NonNull Throwable t) {
                if (isFinishing()) return;
                aceptar.setEnabled(true);
                rechazar.setEnabled(true);
                new MaterialAlertDialogBuilder(TurnosActivity.this).setMessage(RespuestaApi.SIN_CONEXION).setPositiveButton("Aceptar", null).show();
            }
        });
    }

    // Etiqueta con los contenedores de M3: por responder (secundario), esperando al supervisor (terciario, ocre),
    // confirmado (primario, verde) y rechazado (error)
    private static void colorearEstado(TextView etiqueta, String estado) {
        int fondo, texto;
        switch (estado) {
            case "ACEPTADO":
                fondo = com.google.android.material.R.attr.colorTertiaryContainer;
                texto = com.google.android.material.R.attr.colorOnTertiaryContainer;
                break;
            case "CONFIRMADO":
                fondo = com.google.android.material.R.attr.colorPrimaryContainer;
                texto = com.google.android.material.R.attr.colorOnPrimaryContainer;
                break;
            case "RECHAZADO":
                fondo = com.google.android.material.R.attr.colorErrorContainer;
                texto = com.google.android.material.R.attr.colorOnErrorContainer;
                break;
            default:
                fondo = com.google.android.material.R.attr.colorSecondaryContainer;
                texto = com.google.android.material.R.attr.colorOnSecondaryContainer;
        }
        ViewCompat.setBackgroundTintList(etiqueta, ColorStateList.valueOf(MaterialColors.getColor(etiqueta, fondo)));
        etiqueta.setTextColor(MaterialColors.getColor(etiqueta, texto));
    }

    private static String textoEstado(String estado) {
        switch (estado) {
            case "PROPUESTO": return "Propuesto: ¿puedes trabajarlo?";
            case "ACEPTADO": return "Aceptado: falta que tu supervisor lo confirme";
            case "CONFIRMADO": return "Confirmado";
            case "RECHAZADO": return "Rechazado";
            default: return estado;
        }
    }

    // "2026-10-28" -> "miércoles 28/10"
    private static String fecha(String iso) {
        try {
            Date dia = new SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(iso);
            return new SimpleDateFormat("EEEE dd/MM", Locale.forLanguageTag("es")).format(dia);
        } catch (ParseException e) {
            return iso;
        }
    }

    private void mostrarMensaje(String mensaje, boolean error) {
        lista.removeAllViews();
        tvMensaje.setText(mensaje);
        tvMensaje.setTextColor(MaterialColors.getColor(tvMensaje, error
                ? com.google.android.material.R.attr.colorError : com.google.android.material.R.attr.colorOnSurfaceVariant));
        tvMensaje.setVisibility(View.VISIBLE);
    }
}
