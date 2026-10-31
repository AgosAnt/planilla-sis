import { api } from "../lib/api";

export interface Ruta {
  id?: string | number;
  codigo: string;
  nombre: string;
  activa: boolean;
}

interface RutasResponse {
  items: Ruta[];
}

// Punto de la geocerca: el trabajador solo puede marcar dentro del radio de alguno
export interface PuntoGeocerca {
  orden?: number;
  nombre: string;
  latitud: number;
  longitud: number;
  radio_m: number;
}

interface PuntosResponse {
  ruta_id: string;
  puntos: PuntoGeocerca[];
}

export const rutasService = {
  // GET: Obtener lista desde /rutas
  getRutas: async (): Promise<Ruta[]> => {
    const data = await api<RutasResponse>('GET', '/rutas');
    return data.items || [];
  },

  // POST: Crear una nueva ruta
  createRuta: async (nuevaRuta: { codigo: string; nombre: string }): Promise<Ruta> => {
    return await api<Ruta>('POST', '/rutas', { ...nuevaRuta, activa: true });
  },

  // PATCH: Editar datos de una ruta existente
  updateRuta: async (id: string | number, datosActualizados: Partial<Ruta>): Promise<Ruta> => {
    return await api<Ruta>('PATCH', `/rutas/${id}`, datosActualizados);
  },

  // PATCH: Dar de baja (cambiar activa a false)
  darDeBajaRuta: async (id: string | number): Promise<Ruta> => {
    return await api<Ruta>('PATCH', `/rutas/${id}`, { activa: false });
  },

  // GET: Puntos de la geocerca, en orden
  getPuntos: async (id: string | number): Promise<PuntoGeocerca[]> => {
    const data = await api<PuntosResponse>('GET', `/rutas/${id}/puntos`);
    return data.puntos || [];
  },

  // PUT: Reemplaza todos los puntos (el orden es el de la lista). Una lista vacía quita la geocerca
  reemplazarPuntos: async (id: string | number, puntos: PuntoGeocerca[]): Promise<PuntoGeocerca[]> => {
    const data = await api<PuntosResponse>('PUT', `/rutas/${id}/puntos`, {
      puntos: puntos.map(({ nombre, latitud, longitud, radio_m }) => ({ nombre, latitud, longitud, radio_m })),
    });
    return data.puntos || [];
  }
};
