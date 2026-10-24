package com.planillasis.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;

// Coordenadas de ejemplo (Plaza de la Constitución y Parque Central de Antigua), no las de la empresa
public class GeocercaTest {

    private static Geocerca.Punto punto(String nombre, double lat, double lng, int radio) {
        Geocerca.Punto p = new Geocerca.Punto();
        p.nombre = nombre;
        p.latitud = lat;
        p.longitud = lng;
        p.radioM = radio;
        return p;
    }

    private final Geocerca.Punto plaza = punto("Plaza", 14.642472, -90.513229, 100);
    private final Geocerca.Punto antigua = punto("Antigua", 14.556845, -90.733774, 50);

    @Test
    public void rutaSinPuntosDejaMarcar() {
        assertTrue(Geocerca.evaluar(null, 14.6, -90.5).dentro);
        Geocerca.Resultado r = Geocerca.evaluar(Collections.emptyList(), 14.6, -90.5);
        assertTrue(r.dentro);
        assertTrue(r.sinPuntos());
    }

    @Test
    public void dentroDelRadio() {
        // ~55 m al norte de la plaza
        Geocerca.Resultado r = Geocerca.evaluar(Collections.singletonList(plaza), 14.642967, -90.513229);
        assertTrue(r.dentro);
        assertEquals(55, r.distanciaM, 2);
    }

    @Test
    public void fueraDelRadioInformaElPuntoMasCercano() {
        // ~220 m al norte de la plaza; Antigua queda a ~25 km
        Geocerca.Resultado r = Geocerca.evaluar(Arrays.asList(antigua, plaza), 14.644450, -90.513229);
        assertFalse(r.dentro);
        assertSame(plaza, r.masCercano);
        assertEquals(220, r.distanciaM, 3);
    }

    @Test
    public void bastaConEstarEnUnoDeVariosPuntos() {
        Geocerca.Resultado r = Geocerca.evaluar(Arrays.asList(plaza, antigua), 14.556845, -90.733774);
        assertTrue(r.dentro);
        assertSame(antigua, r.masCercano);
        assertEquals(0, r.distanciaM, 0.01);
    }

    @Test
    public void distanciaConocida() {
        // Plaza de la Constitución -> Parque Central de Antigua: 9,52 km en latitud y 23,73 km en longitud,
        // ~25,57 km en línea recta
        assertEquals(25_570, Geocerca.distanciaM(14.642472, -90.513229, 14.556845, -90.733774), 50);
    }
}
