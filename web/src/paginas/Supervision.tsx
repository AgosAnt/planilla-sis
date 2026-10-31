import { Fragment, useState, useEffect, type SyntheticEvent } from 'react';
import { api } from "../lib/api";

interface RegistroTiempo {
  id: string | number;
  trabajador_id: string;
  ingreso_at: string;
  salida_at: string | null;
  estado_validacion: 'PENDIENTE' | 'APROBADA' | 'CORREGIDA' | 'RECHAZADA';
}

export default function Supervision() {
  const [registros, setRegistros] = useState<RegistroTiempo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;
    const cargarDatos = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await api<{ items: RegistroTiempo[] }>('GET', '/registros-tiempo?page_size=50');
        if (activo) setRegistros(res.items || []);
      } catch (err) {
        if (activo) setErrorMsg(err instanceof Error ? err.message : 'Error al cargar jornadas');
      } finally {
        if (activo) setIsLoading(false);
      }
    };
    cargarDatos();
    return () => { activo = false; };
  }, []);

  const handleValidacion = async (id: string | number, estado: 'APROBADA' | 'RECHAZADA', observaciones?: string) => {
    setEnviando(true);
    try {
      await api('PATCH', `/registros-tiempo/${id}/validacion`, { estado_validacion: estado, observaciones });
      setRegistros(prev => prev.map(r => r.id === id ? { ...r, estado_validacion: estado } : r));
      cancelarRechazo();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al validar la jornada');
    } finally {
      setEnviando(false);
    }
  };

  const iniciarRechazo = (id: string | number) => {
    setRechazandoId(id);
    setMotivo('');
  };

  const cancelarRechazo = () => {
    setRechazandoId(null);
    setMotivo('');
  };

  const confirmarRechazo = (evento: SyntheticEvent<HTMLFormElement>, id: string | number) => {
    evento.preventDefault();
    handleValidacion(id, 'RECHAZADA', motivo.trim());
  };

  const enJornada = registros.filter(r => r.salida_at === null).length;
  const pendientes = registros.filter(r => r.estado_validacion === 'PENDIENTE').length;

  return (
    <div className="min-h-screen p-6 text-foreground">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Supervisión Operativa</h1>
        <p className="text-muted-foreground text-sm mt-1">Control de asistencia y validación de jornadas.</p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="text-muted-foreground text-sm font-bold uppercase">Total Registros</h3>
          <p className="text-3xl font-bold text-foreground mt-2">{registros.length}</p>
        </div>
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="text-muted-foreground text-sm font-bold uppercase">En Jornada</h3>
          <p className="text-3xl font-bold text-foreground mt-2">{enJornada}</p>
        </div>
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="text-muted-foreground text-sm font-bold uppercase">Pendientes de Validar</h3>
          <p className="text-3xl font-bold text-orange-500 mt-2">{pendientes}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground font-medium">Cargando jornadas desde el servidor...</div>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Trabajador</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Ingreso</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Salida</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {registros.map((reg) => (
                <Fragment key={reg.id}>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-foreground">
                    {reg.trabajador_id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-foreground">
                    {new Date(reg.ingreso_at).toLocaleString('es-GT')}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-muted-foreground">
                    {reg.salida_at ? new Date(reg.salida_at).toLocaleString('es-GT') : 'En curso'}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                      reg.estado_validacion === 'APROBADA' ? 'bg-green-500/10 text-green-600' :
                      reg.estado_validacion === 'RECHAZADA' ? 'bg-destructive/10 text-destructive' :
                      'bg-orange-500/10 text-orange-600'
                    }`}>
                      {reg.estado_validacion}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                    {reg.salida_at && reg.estado_validacion === 'PENDIENTE' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleValidacion(reg.id, 'APROBADA')} disabled={enviando} className="p-2 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500/20 transition-colors" title="Aprobar">
                          ✓
                        </button>
                        <button onClick={() => iniciarRechazo(reg.id)} disabled={enviando} className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors" title="Rechazar">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Sin acciones</span>
                    )}
                  </td>
                </tr>
                {rechazandoId === reg.id && (
                  <tr className="bg-muted/30">
                    <td colSpan={5} className="px-6 py-4">
                      <form onSubmit={(evento) => confirmarRechazo(evento, reg.id)} className="space-y-3">
                        <label className="block space-y-1 text-sm">
                          <span className="font-medium">Motivo del rechazo</span>
                          <textarea
                            rows={2}
                            maxLength={1000}
                            required
                            autoFocus
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          />
                        </label>
                        <div className="flex gap-2">
                          <button type="submit" disabled={enviando || !motivo.trim()} className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-white hover:bg-destructive/90 transition-colors disabled:opacity-50">
                            Rechazar jornada
                          </button>
                          <button type="button" onClick={cancelarRechazo} disabled={enviando} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
