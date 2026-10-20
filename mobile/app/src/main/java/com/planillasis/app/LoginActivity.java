package com.planillasis.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.gson.JsonObject;

import java.security.GeneralSecurityException;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

// Inicio de sesión del trabajador (E-1, X-Client-Type: mobile). Después de entrar carga el perfil
// (GET /me, con la asignación del día) y, si la jornada quedó abierta en el servidor, la recupera.
public class LoginActivity extends AppCompatActivity {

    private EditText etEmail, etPassword, etServidor;
    private TextView tvError;
    private Button btnIniciarSesion;
    private SesionManager sesion;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        sesion = new SesionManager(this);
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        etServidor = findViewById(R.id.etServidor);
        tvError = findViewById(R.id.tvErrorLogin);
        btnIniciarSesion = findViewById(R.id.btnIniciarSesion);

        etServidor.setText(Configuracion.servidor(this));
        Perfil anterior = sesion.perfil();
        if (anterior != null) etEmail.setText(anterior.email); // sesión vencida: mismo trabajador

        btnIniciarSesion.setOnClickListener(v -> iniciarSesion());
    }

    private void iniciarSesion() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString();
        if (email.isEmpty() || password.isEmpty()) {
            mostrarError("Escribe tu correo y tu contraseña.");
            return;
        }
        Configuracion.guardarServidor(this, etServidor.getText().toString());
        ocupado(true);

        ApiService api = RetrofitClient.getApiService(this);
        api.iniciarSesion("mobile", new SesionApi.Solicitud(email, password)).enqueue(new Callback<SesionApi.Respuesta>() {
            @Override
            public void onResponse(@NonNull Call<SesionApi.Respuesta> call, @NonNull Response<SesionApi.Respuesta> response) {
                if (response.code() == 401 || response.code() == 400) {
                    ocupado(false);
                    mostrarError("Correo o contraseña incorrectos.");
                    return;
                }
                if (!response.isSuccessful() || response.body() == null || response.body().accessToken == null) {
                    ocupado(false);
                    mostrarError("El servidor respondió con un error (" + response.code() + "). Intenta de nuevo.");
                    return;
                }
                try {
                    sesion.guardarToken(response.body().accessToken);
                } catch (GeneralSecurityException e) {
                    ocupado(false);
                    mostrarError("No se pudo guardar la sesión de forma segura en este teléfono.");
                    return;
                }
                cargarPerfil(api);
            }

            @Override
            public void onFailure(@NonNull Call<SesionApi.Respuesta> call, @NonNull Throwable t) {
                ocupado(false);
                mostrarError("No se pudo conectar con " + Configuracion.servidor(LoginActivity.this)
                        + ". Verifica que estés en la red de la oficina.");
            }
        });
    }

    private void cargarPerfil(ApiService api) {
        api.perfil().enqueue(new Callback<Perfil>() {
            @Override
            public void onResponse(@NonNull Call<Perfil> call, @NonNull Response<Perfil> response) {
                Perfil perfil = response.body();
                if (!response.isSuccessful() || perfil == null) {
                    sesion.cerrar();
                    ocupado(false);
                    mostrarError("No se pudo cargar tu perfil (" + response.code() + ").");
                    return;
                }
                if (!"trabajador".equals(perfil.rol)) {
                    sesion.cerrar();
                    ocupado(false);
                    mostrarError("Esta aplicación es para trabajadores en ruta. Usa la web para tu rol.");
                    return;
                }
                sesion.guardarPerfil(perfil);
                recuperarJornadaAbierta(api, perfil);
            }

            @Override
            public void onFailure(@NonNull Call<Perfil> call, @NonNull Throwable t) {
                sesion.cerrar();
                ocupado(false);
                mostrarError("Se perdió la conexión con el servidor. Intenta de nuevo.");
            }
        });
    }

    // Si el servidor tiene una jornada abierta que el teléfono no conoce, se agrega a la cola local
    private void recuperarJornadaAbierta(ApiService api, Perfil perfil) {
        api.registros(5).enqueue(new Callback<JsonObject>() {
            @Override
            public void onResponse(@NonNull Call<JsonObject> call, @NonNull Response<JsonObject> response) {
                DatabaseHelper cola = new DatabaseHelper(LoginActivity.this);
                String registroId = response.isSuccessful() ? ClasificadorRespuesta.jornadaAbierta(response.body()) : null;
                if (registroId != null && cola.jornadaAbierta(perfil.id) == null) {
                    cola.registrarJornadaDelServidor(perfil.id, registroId);
                }
                abrirPrincipal();
            }

            @Override
            public void onFailure(@NonNull Call<JsonObject> call, @NonNull Throwable t) {
                abrirPrincipal(); // no es indispensable para empezar
            }
        });
    }

    private void abrirPrincipal() {
        startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK));
        finish();
    }

    private void ocupado(boolean ocupado) {
        btnIniciarSesion.setEnabled(!ocupado);
        btnIniciarSesion.setText(ocupado ? "Entrando..." : "Iniciar sesión");
        if (ocupado) tvError.setVisibility(View.GONE);
    }

    private void mostrarError(String mensaje) {
        tvError.setText(mensaje);
        tvError.setVisibility(View.VISIBLE);
    }
}
