package com.planillasis.app;

import com.google.gson.annotations.SerializedName;

// Cuerpos de POST /api/v1/auth/session y /auth/refresh con X-Client-Type: mobile (E-1)
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

    // También es la respuesta de /auth/refresh (RefreshResponse): mismos campos de tokens
    public static class Respuesta {
        @SerializedName("access_token") public String accessToken;
        @SerializedName("refresh_token") public String refreshToken;
        @SerializedName("expira_en") public int expiraEn;
    }
}
