package com.planillasis.app;

import com.google.gson.annotations.SerializedName;

// Cuerpos de POST /api/v1/auth/session con X-Client-Type: mobile (E-1)
public final class SesionApi {

    private SesionApi() {}

    public static class Solicitud {
        public final String email;
        public final String password;

        public Solicitud(String email, String password) {
            this.email = email;
            this.password = password;
        }
    }

    public static class Respuesta {
        @SerializedName("access_token") public String accessToken;
        @SerializedName("expira_en") public int expiraEn;
    }
}
