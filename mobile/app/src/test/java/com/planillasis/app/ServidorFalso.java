package com.planillasis.app;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// Servidor HTTP mínimo para las pruebas en la JVM (las pruebas unitarias de Android no traen com.sun.net.httpserver).
// Atiende cada conexión en un hilo y la cierra al responder.
final class ServidorFalso implements AutoCloseable {

    static final class Peticion {
        String metodo;
        String ruta;
        final Map<String, String> cabeceras = new HashMap<>();
        String cuerpo = "";

        String cabecera(String nombre) {
            return cabeceras.get(nombre.toLowerCase(Locale.ROOT));
        }
    }

    static final class Respuesta {
        final int estado;
        final String json;

        Respuesta(int estado, String json) {
            this.estado = estado;
            this.json = json;
        }
    }

    interface Manejador {
        Respuesta atender(Peticion peticion);
    }

    private final ServerSocket socket;
    private final ExecutorService hilos = Executors.newCachedThreadPool();

    ServidorFalso(Manejador manejador) throws IOException {
        socket = new ServerSocket(0, 50, InetAddress.getLoopbackAddress());
        hilos.execute(() -> {
            while (!socket.isClosed()) {
                try {
                    Socket conexion = socket.accept();
                    hilos.execute(() -> atender(conexion, manejador));
                } catch (IOException e) {
                    return; // servidor cerrado
                }
            }
        });
    }

    String url() {
        return "http://127.0.0.1:" + socket.getLocalPort() + "/";
    }

    private static void atender(Socket conexion, Manejador manejador) {
        try (Socket s = conexion) {
            BufferedReader entrada = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
            Peticion peticion = new Peticion();
            String[] primera = entrada.readLine().split(" ");
            peticion.metodo = primera[0];
            peticion.ruta = primera[1];
            String linea;
            while ((linea = entrada.readLine()) != null && !linea.isEmpty()) {
                int dosPuntos = linea.indexOf(':');
                peticion.cabeceras.put(linea.substring(0, dosPuntos).trim().toLowerCase(Locale.ROOT), linea.substring(dosPuntos + 1).trim());
            }
            String largo = peticion.cabecera("Content-Length");
            if (largo != null) {
                char[] cuerpo = new char[Integer.parseInt(largo)];
                int leidos = 0;
                while (leidos < cuerpo.length) {
                    int n = entrada.read(cuerpo, leidos, cuerpo.length - leidos);
                    if (n < 0) break;
                    leidos += n;
                }
                peticion.cuerpo = new String(cuerpo, 0, leidos);
            }
            Respuesta respuesta = manejador.atender(peticion);
            byte[] bytes = respuesta.json.getBytes(StandardCharsets.UTF_8);
            OutputStream salida = s.getOutputStream();
            salida.write(("HTTP/1.1 " + respuesta.estado + " X\r\nContent-Type: application/json\r\nContent-Length: "
                    + bytes.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
            salida.write(bytes);
            salida.flush();
        } catch (IOException e) {
            // El cliente cortó la conexión: nada que responder
        }
    }

    @Override
    public void close() throws IOException {
        socket.close();
        hilos.shutdownNow();
    }
}
