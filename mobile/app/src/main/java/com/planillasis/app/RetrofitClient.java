package com.planillasis.app;

import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class RetrofitClient {

    // ESTA ES LA URL DE TU SERVIDOR.
    // Como aún no tienes el backend de Node.js o .NET corriendo, usaremos una URL de prueba
    // gratuita llamada "Webhook.site" que recibe datos y nos muestra si llegaron bien.
    // LUEGO cambiaremos esto por la IP de tu computadora (ej: "http://192.168.1.15:3000/")
    private static final String BASE_URL = "http://192.168.1.76:3000/";

    private static Retrofit retrofit = null;

    public static ApiService getApiService() {
        if (retrofit == null) {
            retrofit = new Retrofit.Builder()
                    .baseUrl(BASE_URL)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build();
        }
        return retrofit.create(ApiService.class);
    }
}