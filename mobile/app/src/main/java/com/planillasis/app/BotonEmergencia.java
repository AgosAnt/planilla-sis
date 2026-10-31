package com.planillasis.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.AttributeSet;
import android.view.HapticFeedbackConstants;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.material.card.MaterialCardView;

// Botón de emergencia que se envía al MANTENER presionado: la barra se llena en 1.5 s y, si se suelta antes, no
// pasa nada. Así un toque accidental (al buscar otro botón o con el teléfono en la bolsa) no avisa al supervisor.
// Con TalkBack o teclado no se puede mantener: performClick llama al OnClickListener, que pide confirmación.
public class BotonEmergencia extends MaterialCardView {

    public interface AlCompletar {
        void ejecutar();
    }

    static final long DURACION_MS = 1500;
    private static final long CUADRO_MS = 16;
    private static final long REINICIO_MS = 2000;
    private static final long AVISO_MS = 2500;

    private final View relleno;
    private final TextView tvTitulo;
    private final TextView tvDetalle;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final int tolerancia;
    private AlCompletar alCompletar;
    private boolean presionando;
    private long inicio;

    // El avance lo marca el reloj, no un Animator: así dura 1.5 s aunque el sistema tenga las animaciones apagadas
    private final Runnable avance = new Runnable() {
        @Override
        public void run() {
            float progreso = Math.min(1f, (SystemClock.uptimeMillis() - inicio) / (float) DURACION_MS);
            relleno.setScaleX(progreso);
            if (progreso >= 1f) completar();
            else handler.postDelayed(this, CUADRO_MS);
        }
    };

    private final Runnable restaurarTextos = this::textosNormales;

    public BotonEmergencia(@NonNull Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        LayoutInflater.from(context).inflate(R.layout.vista_boton_emergencia, this, true);
        relleno = findViewById(R.id.rellenoEmergencia);
        tvTitulo = findViewById(R.id.tvTituloEmergencia);
        tvDetalle = findViewById(R.id.tvDetalleEmergencia);
        tolerancia = ViewConfiguration.get(context).getScaledTouchSlop();
        relleno.setPivotX(0f);
        relleno.setScaleX(0f);
        setClickable(true);
        setFocusable(true);
    }

    public void setAlCompletar(AlCompletar alCompletar) {
        this.alCompletar = alCompletar;
    }

    @SuppressLint("ClickableViewAccessibility") // el toque se mantiene; performClick queda para TalkBack y teclado
    @Override
    public boolean onTouchEvent(MotionEvent evento) {
        if (!isEnabled()) return false;
        switch (evento.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                presionando = true;
                inicio = SystemClock.uptimeMillis();
                handler.removeCallbacks(restaurarTextos);
                tvTitulo.setText("Sigue presionando…");
                tvDetalle.setText("Se envía cuando se llene la barra");
                performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY);
                if (getParent() != null) getParent().requestDisallowInterceptTouchEvent(true);
                handler.post(avance);
                return true;
            case MotionEvent.ACTION_MOVE:
                if (presionando && fuera(evento)) cancelar();
                return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if (presionando) cancelar();
                return true;
            default:
                return super.onTouchEvent(evento);
        }
    }

    private boolean fuera(MotionEvent e) {
        return e.getX() < -tolerancia || e.getY() < -tolerancia
                || e.getX() > getWidth() + tolerancia || e.getY() > getHeight() + tolerancia;
    }

    // Soltó antes de tiempo: la barra se vacía y se recuerda cómo se usa
    private void cancelar() {
        presionando = false;
        handler.removeCallbacks(avance);
        relleno.animate().scaleX(0f).setDuration(200).start();
        tvTitulo.setText("Emergencia");
        tvDetalle.setText("No se envió: mantén presionado hasta llenar la barra");
        handler.postDelayed(restaurarTextos, AVISO_MS);
    }

    private void completar() {
        presionando = false;
        performHapticFeedback(Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.LONG_PRESS);
        tvTitulo.setText("Enviando emergencia…");
        tvDetalle.setText("Tu supervisor recibirá tu ubicación");
        handler.postDelayed(() -> {
            relleno.animate().scaleX(0f).setDuration(300).start();
            textosNormales();
        }, REINICIO_MS);
        if (alCompletar != null) alCompletar.ejecutar();
    }

    private void textosNormales() {
        tvTitulo.setText("Emergencia");
        tvDetalle.setText("Mantén presionado para pedir ayuda");
    }

    @Override
    public void setEnabled(boolean habilitado) {
        super.setEnabled(habilitado);
        if (!habilitado && presionando) cancelar();
        setAlpha(habilitado ? 1f : 0.6f);
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        handler.removeCallbacksAndMessages(null);
    }
}
