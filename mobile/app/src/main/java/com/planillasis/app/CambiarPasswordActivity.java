package com.planillasis.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.gson.JsonObject;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

// Cambiar contraseña (POST /auth/password, política de ADR-001). El servidor cierra todas las sesiones del
// trabajador, así que después se vuelve a iniciar sesión con la nueva. Las marcas pendientes se conservan.
// Con EXTRA_OBLIGATORIA (contraseña temporal) no se puede volver a la pantalla principal: solo cambiarla o salir.
public class CambiarPasswordActivity extends AppCompatActivity {

    public static final String EXTRA_OBLIGATORIA = "obligatoria";
    private static final int LONGITUD_MINIMA = 12; // politicaPassword.js del backend

    private EditText etActual, etNueva, etConfirmar;
    private TextView tvError;
    private Button btnCambiar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_cambiar_password);

        etActual = findViewById(R.id.etPasswordActual);
        etNueva = findViewById(R.id.etPasswordNueva);
        etConfirmar = findViewById(R.id.etPasswordConfirmar);
        tvError = findViewById(R.id.tvErrorPassword);
        btnCambiar = findViewById(R.id.btnCambiarPassword);
        btnCambiar.setOnClickListener(v -> cambiar());
        Animaciones.entrada(findViewById(R.id.contenidoPassword));

        boolean obligatoria = getIntent().getBooleanExtra(EXTRA_OBLIGATORIA, false);
        TextView volver = findViewById(R.id.btnVolverPassword);
        if (obligatoria) {
            ((TextView) findViewById(R.id.tvAvisoPassword)).setText(
                    "Tu contraseña es temporal. Cámbiala para poder marcar; tus marcas guardadas se enviarán después.");
            volver.setText("Salir de la app");
            volver.setOnClickListener(v -> finishAffinity());
            getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    finishAffinity();
                }
            });
        } else {
            volver.setOnClickListener(v -> finish());
        }
    }

    private void cambiar() {
        String actual = etActual.getText().toString();
        String nueva = etNueva.getText().toString();
        if (actual.isEmpty() || nueva.isEmpty()) {
            mostrarError("Escribe tu contraseña actual y la nueva.");
            return;
        }
        if (nueva.length() < LONGITUD_MINIMA) {
            mostrarError("La contraseña nueva debe tener al menos " + LONGITUD_MINIMA + " caracteres.");
            return;
        }
        if (!nueva.equals(etConfirmar.getText().toString())) {
            mostrarError("La confirmación no coincide con la contraseña nueva.");
            return;
        }
        ocupado(true);
        JsonObject cuerpo = new JsonObject();
        cuerpo.addProperty("password_actual", actual);
        cuerpo.addProperty("password_nueva", nueva);
        RetrofitClient.getApiService(this).cambiarPassword(cuerpo).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                if (isFinishing()) return;
                ocupado(false);
                if (response.code() == 204) {
                    terminar();
                    return;
                }
                mostrarError(RespuestaApi.mensaje(response, RespuestaApi.problema(response)));
            }

            @Override
            public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                if (isFinishing()) return;
                ocupado(false);
                mostrarError(RespuestaApi.SIN_CONEXION);
            }
        });
    }

    // Las sesiones ya quedaron cerradas en el servidor: se borran los tokens (no el perfil ni la cola) y se entra de nuevo
    private void terminar() {
        new SesionManager(this).descartarTokens();
        Toast.makeText(this, "Contraseña cambiada. Inicia sesión con la nueva.", Toast.LENGTH_LONG).show();
        startActivity(new Intent(this, LoginActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK));
        finish();
    }

    private void ocupado(boolean ocupado) {
        btnCambiar.setEnabled(!ocupado);
        btnCambiar.setText(ocupado ? "Cambiando..." : "Cambiar contraseña");
        if (ocupado) tvError.setVisibility(View.GONE);
    }

    private void mostrarError(String mensaje) {
        tvError.setText(mensaje);
        tvError.setVisibility(View.VISIBLE);
    }
}
