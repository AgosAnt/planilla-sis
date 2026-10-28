package com.planillasis.app;

import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Interpolator;
import android.view.animation.PathInterpolator;

// Animaciones cortas con las curvas y duraciones de Material 3. Solo se animan transparencia, posición y escala
// (las más baratas para la GPU) y nada se repite en bucle. ViewPropertyAnimator respeta la escala de animación
// del sistema: si el usuario las desactiva (accesibilidad o ahorro de batería), los cambios son inmediatos.
final class Animaciones {

    private static final long CORTA_MS = 200;
    private static final long MEDIA_MS = 350;
    private static final long ESCALON_MS = 40;
    private static final Interpolator ENFATIZADA = new PathInterpolator(0.05f, 0.7f, 0.1f, 1f);
    private static final Interpolator ESTANDAR = new PathInterpolator(0.2f, 0f, 0f, 1f);

    private Animaciones() {
    }

    // Entrada de la pantalla: cada bloque aparece y sube un poco, uno tras otro
    static void entrada(ViewGroup contenedor) {
        float desplazamiento = 16 * contenedor.getResources().getDisplayMetrics().density;
        for (int i = 0; i < contenedor.getChildCount(); i++) {
            View hijo = contenedor.getChildAt(i);
            if (hijo.getVisibility() != View.VISIBLE) continue;
            hijo.setAlpha(0f);
            hijo.setTranslationY(desplazamiento);
            hijo.animate().alpha(1f).translationY(0f)
                    .setStartDelay(Math.min(i, 8) * ESCALON_MS)
                    .setDuration(MEDIA_MS).setInterpolator(ENFATIZADA).start();
        }
    }

    // Un dato que cambió (estado de la jornada, valores de Mi cálculo): se desvanece y vuelve
    static void cambio(View vista) {
        vista.animate().cancel();
        vista.setAlpha(0.3f);
        vista.animate().alpha(1f).setStartDelay(0).setDuration(CORTA_MS).setInterpolator(ESTANDAR).start();
    }

    // Un solo latido (no en bucle) para llamar la atención sobre un indicador
    static void latido(View vista) {
        vista.animate().cancel();
        vista.animate().scaleX(1.6f).scaleY(1.6f).setStartDelay(0).setDuration(CORTA_MS).setInterpolator(ESTANDAR)
                .withEndAction(() -> vista.animate().scaleX(1f).scaleY(1f).setDuration(CORTA_MS).start())
                .start();
    }
}
