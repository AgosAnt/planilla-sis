package com.planillasis.app;

import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

public interface ApiService {
    @POST("/api/registros") // Asegúrate de que esta ruta coincida con tu backend
    Call<ResponseBody> registrarAsistencia(@Body AsistenciaRequest request);
}