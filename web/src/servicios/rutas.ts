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
  }
};
