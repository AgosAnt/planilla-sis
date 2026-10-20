const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Ruta {
  id?: string | number;
  codigo: string;
  nombre: string;
  estado: string;
}

export const rutasService = {
  // GET: Obtener la lista completa de rutas
  getRutas: async (): Promise<Ruta[]> => {
    try {
      const response = await fetch(`${API_URL}/rutas`);
      if (!response.ok) throw new Error('Error al consultar la API');
      return await response.json();
    } catch (error) {
      console.warn('Backend no disponible. Usando datos de respaldo temporal:', error);
      return [
        { id: 1, codigo: 'DEV-RUTA-01', nombre: 'Ruta Norte Central', estado: 'Activa' }
      ];
    }
  },

  // POST: Enviar una nueva ruta al servidor
  createRuta: async (nuevaRuta: Omit<Ruta, 'id'>): Promise<Ruta> => {
    try {
      const response = await fetch(`${API_URL}/rutas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaRuta),
      });
      if (!response.ok) throw new Error('Error al guardar en el servidor');
      return await response.json();
    } catch (error) {
      console.warn('No se pudo guardar en el backend. Simulando guardado local:', error);
      return { id: Date.now(), ...nuevaRuta };
    }
  },

  // PUT: Actualizar una ruta existente en el servidor
  updateRuta: async (id: string | number, rutaActualizada: Partial<Ruta>): Promise<Ruta> => {
    try {
      const response = await fetch(`${API_URL}/rutas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rutaActualizada),
      });
      if (!response.ok) throw new Error('Error al actualizar en el servidor');
      return await response.json();
    } catch (error) {
      console.warn('No se pudo actualizar en el backend. Simulando actualización local:', error);
      return { id, ...rutaActualizada } as Ruta;
    }
  },

  // DELETE: Eliminar una ruta del servidor
  deleteRuta: async (id: string | number): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/rutas/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.warn('No se pudo eliminar en el backend. Simulando eliminación local:', error);
      return true;
    }
  }
};