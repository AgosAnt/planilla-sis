package com.planillasis.app;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

// Cifra el token de sesión con una llave AES que vive en el Android Keystore (F.1: el token del móvil
// se guarda en el almacén seguro del sistema, nunca en texto plano).
final class AlmacenSeguro {

    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String ALIAS = "planilla_sesion";
    private static final String TRANSFORMACION = "AES/GCM/NoPadding";

    private AlmacenSeguro() {}

    static String cifrar(String texto) throws GeneralSecurityException {
        Cipher cifrador = Cipher.getInstance(TRANSFORMACION);
        cifrador.init(Cipher.ENCRYPT_MODE, llave());
        byte[] cifrado = cifrador.doFinal(texto.getBytes(StandardCharsets.UTF_8));
        return codificar(cifrador.getIV()) + ":" + codificar(cifrado);
    }

    static String descifrar(String guardado) throws GeneralSecurityException {
        String[] partes = guardado.split(":", 2);
        if (partes.length != 2) throw new GeneralSecurityException("Formato de token inválido");
        Cipher cifrador = Cipher.getInstance(TRANSFORMACION);
        cifrador.init(Cipher.DECRYPT_MODE, llave(), new GCMParameterSpec(128, decodificar(partes[0])));
        return new String(cifrador.doFinal(decodificar(partes[1])), StandardCharsets.UTF_8);
    }

    private static SecretKey llave() throws GeneralSecurityException {
        try {
            KeyStore almacen = KeyStore.getInstance(KEYSTORE);
            almacen.load(null);
            if (almacen.containsAlias(ALIAS)) {
                return ((KeyStore.SecretKeyEntry) almacen.getEntry(ALIAS, null)).getSecretKey();
            }
            KeyGenerator generador = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
            generador.init(new KeyGenParameterSpec.Builder(ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .build());
            return generador.generateKey();
        } catch (java.io.IOException e) {
            throw new GeneralSecurityException("No se pudo abrir el Keystore", e);
        }
    }

    private static String codificar(byte[] datos) {
        return Base64.encodeToString(datos, Base64.NO_WRAP);
    }

    private static byte[] decodificar(String texto) {
        return Base64.decode(texto, Base64.NO_WRAP);
    }
}
