package com.planillasis.app;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

public interface ApiService {

    // Se envian los datos por el método POST a la ruta de tu futuro servidor
    @POST("api/registros")
    Call<Void> enviarRegistroAlServidor(@Body Registro registro);

}