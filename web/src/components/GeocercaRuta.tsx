import { useEffect, useState } from 'react';
import { rutasService, type PuntoGeocerca, type Ruta } from '../servicios/rutas';

// Mismos límites que la API (validarPuntos) y que M012
const MAX_PUNTOS = 20;
const RADIO_MIN = 10;
const RADIO_MAX = 5000;
const RADIO_POR_DEFECTO = '100';

// Los campos se editan como texto y se convierten al guardar
interface Fila {
  clave: number;
  nombre: string;
  latitud: string;
  longitud: string;
  radio: string;
}

let siguienteClave = 1;
const aFila = (p: PuntoGeocerca): Fila => ({
  clave: siguienteClave++,
  nombre: p.nombre,
  latitud: String(p.latitud),
  longitud: String(p.longitud),
  radio: String(p.radio_m),
});
const filaVacia = (): Fila => ({ clave: siguienteClave++, nombre: '', latitud: '', longitud: '', radio: RADIO_POR_DEFECTO });

const aNumero = (texto: string) => (texto.trim() === '' ? NaN : Number(texto.trim()));

// Devuelve el primer error de una fila, o null si está bien
const errorDeFila = (f: Fila): string | null => {
  if (!f.nombre.trim()) return 'Falta el nombre';
  if (f.nombre.trim().length > 100) return 'El nombre admite hasta 100 caracteres';
  const lat = aNumero(f.latitud);
  const lng = aNumero(f.longitud);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) return 'Latitud inválida (-90 a 90)';
  if (!Number.isFinite(lng) || Math.abs(lng) > 180) return 'Longitud inválida (-180 a 180)';
  const radio = aNumero(f.radio);
  if (!Number.isInteger(radio) || radio < RADIO_MIN || radio > RADIO_MAX) {
    return `El radio debe ser un entero de ${RADIO_MIN} a ${RADIO_MAX} m`;
  }
  return null;
};

const claseInput =
  'w-full bg-background border text-foreground rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm placeholder:text-muted-foreground';

interface Props {
  ruta: Ruta;
  onCerrar: () => void;
}

export default function GeocercaRuta({ ruta, onCerrar }: Props) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ubicandoClave, setUbicandoClave] = useState<number | null>(null);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const puntos = await rutasService.getPuntos(ruta.id!);
        if (activo) setFilas(puntos.map(aFila));
      } catch (err) {
        if (activo) setErrorMsg(err instanceof Error ? err.message : 'No se pudo cargar la geocerca');
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [ruta.id]);

  const cambiar = (clave: number, campo: keyof Omit<Fila, 'clave'>, valor: string) => {
    setAviso(null);
    setFilas((prev) => prev.map((f) => {
      if (f.clave !== clave) return f;
      // Pegar "14.5779, -90.7350" (como lo copia Google Maps) en la latitud llena las dos coordenadas
      if (campo === 'latitud' && valor.includes(',')) {
        const [lat, lng] = valor.split(',').map((v) => v.trim());
        return { ...f, latitud: lat, longitud: lng ?? f.longitud };
      }
      return { ...f, [campo]: valor };
    }));
  };

  const agregar = () => {
    setAviso(null);
    setFilas((prev) => (prev.length >= MAX_PUNTOS ? prev : [...prev, filaVacia()]));
  };

  const quitar = (clave: number) => {
    setAviso(null);
    setFilas((prev) => prev.filter((f) => f.clave !== clave));
  };

  const mover = (indice: number, paso: -1 | 1) => {
    setAviso(null);
    setFilas((prev) => {
      const destino = indice + paso;
      if (destino < 0 || destino >= prev.length) return prev;
      const copia = [...prev];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  };

  // Para el supervisor que está parado en el punto de control
  const usarMiUbicacion = (clave: number) => {
    if (!navigator.geolocation) {
      setErrorMsg('Este navegador no permite obtener la ubicación');
      return;
    }
    setUbicandoClave(clave);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicandoClave(null);
        setFilas((prev) => prev.map((f) => (f.clave === clave
          ? { ...f, latitud: pos.coords.latitude.toFixed(6), longitud: pos.coords.longitude.toFixed(6) }
          : f)));
      },
      () => {
        setUbicandoClave(null);
        setErrorMsg('No se pudo obtener la ubicación. Revisa el permiso de ubicación del navegador.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const guardar = async () => {
    setIntentoGuardar(true);
    setErrorMsg(null);
    setAviso(null);
    if (filas.some((f) => errorDeFila(f))) {
      setErrorMsg('Corrige los puntos marcados en rojo antes de guardar.');
      return;
    }
    if (filas.length === 0
      && !window.confirm('Sin puntos, los trabajadores de esta ruta podrán marcar desde cualquier lugar. ¿Quitar la geocerca?')) {
      return;
    }
    setGuardando(true);
    try {
      const puntos = await rutasService.reemplazarPuntos(ruta.id!, filas.map((f) => ({
        nombre: f.nombre.trim(),
        latitud: aNumero(f.latitud),
        longitud: aNumero(f.longitud),
        radio_m: aNumero(f.radio),
      })));
      setFilas(puntos.map(aFila));
      setIntentoGuardar(false);
      setAviso(puntos.length
        ? `Geocerca guardada con ${puntos.length} ${puntos.length === 1 ? 'punto' : 'puntos'}. La app la recibe al volver a abrir.`
        : 'Geocerca quitada. La app deja marcar desde cualquier lugar.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo guardar la geocerca');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-foreground">
        <div className="p-6 border-b flex justify-between items-start gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Geocerca: {ruta.nombre}</h2>
            <p className="text-muted-foreground text-xs mt-1">
              El trabajador solo puede marcar dentro del radio de alguno de estos puntos. Sin puntos, puede marcar desde
              cualquier lugar.
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-colors"
            title="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
              {errorMsg}
            </div>
          )}
          {aviso && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-600 text-sm">{aviso}</div>
          )}

          {cargando ? (
            <div className="p-8 text-center text-muted-foreground font-medium">Cargando la geocerca...</div>
          ) : (
            <>
              {filas.length === 0 && (
                <div className="p-4 border border-dashed rounded-xl text-sm text-muted-foreground text-center">
                  Esta ruta no tiene geocerca: se puede marcar desde cualquier lugar.
                </div>
              )}

              <ol className="space-y-3">
                {filas.map((f, i) => {
                  const error = intentoGuardar ? errorDeFila(f) : null;
                  const lat = aNumero(f.latitud);
                  const lng = aNumero(f.longitud);
                  const coordenadasValidas = Number.isFinite(lat) && Number.isFinite(lng);
                  return (
                    <li key={f.clave} className={`border rounded-xl p-4 ${error ? 'border-destructive/60' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Punto {i + 1}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => mover(i, -1)}
                            disabled={i === 0}
                            className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                            title="Subir"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <button
                            onClick={() => mover(i, 1)}
                            disabled={i === filas.length - 1}
                            className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                            title="Bajar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          <button
                            onClick={() => quitar(f.clave)}
                            className="p-1.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                            title="Quitar punto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <label className="sm:col-span-4 text-xs text-muted-foreground">
                          Nombre
                          <input
                            className={`${claseInput} mt-1`}
                            value={f.nombre}
                            maxLength={100}
                            onChange={(e) => cambiar(f.clave, 'nombre', e.target.value)}
                            placeholder="Ej. Bodega central"
                          />
                        </label>
                        <label className="sm:col-span-3 text-xs text-muted-foreground">
                          Latitud
                          <input
                            className={`${claseInput} mt-1`}
                            value={f.latitud}
                            inputMode="decimal"
                            onChange={(e) => cambiar(f.clave, 'latitud', e.target.value)}
                            placeholder="14.577900"
                          />
                        </label>
                        <label className="sm:col-span-3 text-xs text-muted-foreground">
                          Longitud
                          <input
                            className={`${claseInput} mt-1`}
                            value={f.longitud}
                            inputMode="decimal"
                            onChange={(e) => cambiar(f.clave, 'longitud', e.target.value)}
                            placeholder="-90.735000"
                          />
                        </label>
                        <label className="sm:col-span-2 text-xs text-muted-foreground">
                          Radio (m)
                          <input
                            className={`${claseInput} mt-1`}
                            value={f.radio}
                            inputMode="numeric"
                            onChange={(e) => cambiar(f.clave, 'radio', e.target.value)}
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                        <button
                          onClick={() => usarMiUbicacion(f.clave)}
                          disabled={ubicandoClave !== null}
                          className="text-primary font-medium hover:underline disabled:opacity-50"
                        >
                          {ubicandoClave === f.clave ? 'Obteniendo ubicación...' : 'Usar mi ubicación'}
                        </button>
                        {coordenadasValidas && (
                          <a
                            href={`https://www.google.com/maps?q=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-medium hover:underline"
                          >
                            Ver en el mapa
                          </a>
                        )}
                        {error && <span className="text-destructive font-medium">{error}</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>

              <button
                onClick={agregar}
                disabled={filas.length >= MAX_PUNTOS}
                className="w-full border border-dashed rounded-xl py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
              >
                {filas.length >= MAX_PUNTOS ? `Máximo ${MAX_PUNTOS} puntos` : '+ Agregar punto'}
              </button>
              <p className="text-xs text-muted-foreground">
                Puedes pegar las coordenadas como las copia Google Maps (por ejemplo "14.5779, -90.7350") en Latitud y se
                llenan las dos. El radio va de {RADIO_MIN} a {RADIO_MAX} metros; 100 m suele bastar para el GPS de un
                teléfono.
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            type="button"
            onClick={onCerrar}
            className="px-5 py-2.5 text-muted-foreground hover:text-foreground font-medium rounded-xl hover:bg-muted transition-colors text-sm"
          >
            Cerrar
          </button>
          <button
            onClick={guardar}
            disabled={cargando || guardando}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full transition-all text-sm disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar geocerca'}
          </button>
        </div>
      </div>
    </div>
  );
}
