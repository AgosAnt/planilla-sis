package com.planillasis.app;

import com.google.gson.JsonObject;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.Path;
import retrofit2.http.Query;

// Endpoints de /api/v1 que usa la app (docs/openapi.yaml). El token Bearer lo agrega RetrofitClient.
public interface ApiService {

    @POST("api/v1/auth/session")
    Call<SesionApi.Respuesta> iniciarSesion(@Header("X-Client-Type") String tipoCliente, @Body SesionApi.Solicitud cuerpo);

    @GET("api/v1/me")
    Call<Perfil> perfil();

    @GET("api/v1/registros-tiempo")
    Call<JsonObject> registros(@Query("page_size") int tamanoPagina);

    @POST("api/v1/registros-tiempo/ingreso")
    Call<JsonObject> ingreso(@Header("Idempotency-Key") String clave, @Body JsonObject cuerpo);

    @PATCH("api/v1/registros-tiempo/{id}/salida")
    Call<JsonObject> salida(@Path("id") String registroId, @Header("Idempotency-Key") String clave, @Body JsonObject cuerpo);

    @POST("api/v1/registros-tiempo/{id}/descansos")
    Call<JsonObject> descanso(@Path("id") String registroId, @Header("Idempotency-Key") String clave, @Body JsonObject cuerpo);

    @POST("api/v1/eventos:batch")
    Call<JsonObject> eventos(@Header("Idempotency-Key") String clave, @Body JsonObject cuerpo);
}
