package com.planillasis.app;

import android.content.Context;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

// Cliente HTTP hacia el servidor. La dirección sale de Configuracion y cada petición lleva el token Bearer
// de la sesión si existe. Con un AlmacenTokens, un 401 renueva la sesión sola (Renovador).
public final class RetrofitClient {

    public interface ProveedorToken {
        String token();
    }

    // Sesión completa: además del access token, el refresh token para renovarla
    public interface AlmacenTokens extends ProveedorToken {
        String refreshToken();

        void guardarTokens(String accessToken, String refreshToken);

        void descartarTokens();
    }

    private static ApiService api;
    private static String servidorActual;

    private RetrofitClient() {}

    public static synchronized ApiService getApiService(Context contexto) {
        String servidor = Configuracion.servidor(contexto);
        if (api == null || !servidor.equals(servidorActual)) {
            api = crear(servidor, new SesionManager(contexto));
            servidorActual = servidor;
        }
        return api;
    }

    // Sin dependencias de Android: también lo usan las pruebas de integración en la JVM
    public static ApiService crear(String servidor, ProveedorToken proveedor) {
        OkHttpClient.Builder http = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(20, TimeUnit.SECONDS)
                .addInterceptor(cadena -> {
                    String token = proveedor.token();
                    Request peticion = cadena.request();
                    if (token != null) {
                        peticion = peticion.newBuilder().header("Authorization", "Bearer " + token).build();
                    }
                    return cadena.proceed(peticion);
                });
        if (proveedor instanceof AlmacenTokens) {
            http.authenticator(new Renovador(servidor, (AlmacenTokens) proveedor));
        }
        return new Retrofit.Builder()
                .baseUrl(Configuracion.normalizarServidor(servidor))
                .client(http.build())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(ApiService.class);
    }
}
