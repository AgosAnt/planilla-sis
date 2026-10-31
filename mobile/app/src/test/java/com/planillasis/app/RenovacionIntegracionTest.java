package com.planillasis.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assume.assumeTrue;

import org.junit.Before;
import org.junit.Test;

import retrofit2.Response;

// El Renovador contra el backend real (POST /auth/refresh y /auth/logout). Se omite si no se definen
// PLANILLA_API, PLANILLA_EMAIL y PLANILLA_PASS, igual que ApiIntegracionTest.
public class RenovacionIntegracionTest {

    private String servidor;

    @Before
    public void requiereBackend() {
        servidor = System.getenv("PLANILLA_API");
        assumeTrue("PLANILLA_API no definida: prueba de integración omitida", servidor != null);
    }

    private RenovadorTest.Almacen iniciarSesion(ApiService api, RenovadorTest.Almacen almacen) throws Exception {
        Response<SesionApi.Respuesta> sesion = api.iniciarSesion("mobile",
                new SesionApi.Solicitud(System.getenv("PLANILLA_EMAIL"), System.getenv("PLANILLA_PASS"))).execute();
        assertEquals(200, sesion.code());
        assertNotNull("el login del móvil debe traer refresh_token", sesion.body().refreshToken);
        almacen.guardarTokens(sesion.body().accessToken, sesion.body().refreshToken);
        return almacen;
    }

    @Test
    public void accessVencidoSeRenuevaConElBackend() throws Exception {
        RenovadorTest.Almacen almacen = new RenovadorTest.Almacen();
        ApiService api = RetrofitClient.crear(servidor, almacen);
        iniciarSesion(api, almacen);
        String refreshOriginal = almacen.refreshToken();

        almacen.guardarTokens("token-vencido", refreshOriginal);
        Response<Perfil> perfil = api.perfil().execute();
        assertEquals(200, perfil.code());
        assertEquals("trabajador", perfil.body().rol);
        assertNotEquals("token-vencido", almacen.token());
        assertNotEquals(refreshOriginal, almacen.refreshToken());
    }

    @Test
    public void despuesDelLogoutHayQueVolverAEntrar() throws Exception {
        RenovadorTest.Almacen almacen = new RenovadorTest.Almacen();
        ApiService api = RetrofitClient.crear(servidor, almacen);
        iniciarSesion(api, almacen);

        assertEquals(204, api.cerrarSesion().execute().code());
        // El access token de la sesión cerrada se rechaza y su refresh ya no renueva: se descartan los tokens
        assertEquals(401, api.perfil().execute().code());
        assertEquals(null, almacen.token());
        assertEquals(null, almacen.refreshToken());
    }
}
