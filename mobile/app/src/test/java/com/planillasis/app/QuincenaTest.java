package com.planillasis.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.util.Calendar;

public class QuincenaTest {

    private static Calendar dia(int anio, int mes, int dia) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(anio, mes - 1, dia);
        return c;
    }

    @Test
    public void primeraQuincena() {
        Quincena q = Quincena.de(dia(2026, 11, 15));
        assertEquals("2026-11-01", q.desde);
        assertEquals("2026-11-15", q.hasta);
        assertEquals("1 al 15 de noviembre de 2026", q.nombre);
    }

    @Test
    public void segundaQuincenaTerminaElUltimoDiaDelMes() {
        assertEquals("2026-11-30", Quincena.de(dia(2026, 11, 16)).hasta);
        assertEquals("2026-12-31", Quincena.de(dia(2026, 12, 20)).hasta);
        assertEquals("2026-02-28", Quincena.de(dia(2026, 2, 16)).hasta);
        assertEquals("2028-02-29", Quincena.de(dia(2028, 2, 29)).hasta); // bisiesto
    }

    @Test
    public void anterior() {
        Quincena segunda = Quincena.de(dia(2026, 11, 20));
        assertEquals("2026-11-01", segunda.anterior().desde);
        Quincena primera = Quincena.de(dia(2026, 11, 3));
        assertEquals("2026-10-16", primera.anterior().desde);
        assertEquals("2026-10-31", primera.anterior().hasta);
        Quincena enero = Quincena.de(dia(2027, 1, 10));
        assertEquals("2026-12-16", enero.anterior().desde);
        assertEquals("16 al 31 de diciembre de 2026", enero.anterior().nombre);
    }
}
