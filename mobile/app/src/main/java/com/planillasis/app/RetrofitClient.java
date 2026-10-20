package com.planillasis.app;

import android.content.Context;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

// Cliente HTTP hacia el servidor de la oficina (LAN). La dirección sale de Configuracion
// y cada petición lleva el token Bearer de la sesión si existe.
public final class RetrofitClient {

    public interface ProveedorToken {
        String token();
    }

    private static ApiService api;
    private static String servidorActual;

    private RetrofitClient() {}

    public static synchronized ApiService getApiService(Context contexto) {
        String servidor = Configuracion.servidor(contexto);
        if (api == null || !servidor.equals(servidorActual)) {
            SesionManager sesion = new SesionManager(contexto);
            api = crear(servidor, sesion::token);
            servidorActual = servidor;
        }
        return api;
    }

    // Sin dependencias de Android: también lo usan las pruebas de integración en la JVM
    public static ApiService crear(String servidor, ProveedorToken proveedor) {
        OkHttpClient http = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(20, TimeUnit.SECONDS)
                .addInterceptor(cadena -> {
                    String token = proveedor.token();
                    Request peticion = cadena.request();
                    if (token != null) {
                        peticion = peticion.newBuilder().header("Authorization", "Bearer " + token).build();
                    }
                    return cadena.proceed(peticion);
                })
                .build();
        return new Retrofit.Builder()
                .baseUrl(Configuracion.normalizarServidor(servidor))
                .client(http)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(ApiService.class);
    }
}
