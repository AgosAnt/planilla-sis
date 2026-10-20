import { useState, useEffect } from 'react';
import { rutasService, type Ruta } from '../../services/rutasService';

export default function Rutas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editingRuta, setEditingRuta] = useState<Ruta | null>(null);
  const [codigoInput, setCodigoInput] = useState('');
  const [nombreInput, setNombreInput] = useState('');

  useEffect(() => {
    let activo = true;
    rutasService
      .getRutas()
      .then((data) => {
        if (activo) setRutas(data);
      })
      .catch((err) => {
        if (activo) setErrorMsg(err instanceof Error ? err.message : 'Error al cargar las rutas');
      })
      .finally(() => {
        if (activo) setIsLoading(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const handleOpenCreateModal = () => {
    setEditingRuta(null);
    setCodigoInput('');
    setNombreInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ruta: Ruta) => {
    setEditingRuta(ruta);
    setCodigoInput(ruta.codigo);
    setNombreInput(ruta.nombre);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoInput.trim() || !nombreInput.trim()) return;

    try {
      if (editingRuta && editingRuta.id) {
        const rutaActualizada = await rutasService.updateRuta(editingRuta.id, {
          codigo: codigoInput,
          nombre: nombreInput,
        });

        setRutas((prev) =>
          prev.map((r) => (r.id === editingRuta.id ? { ...r, ...rutaActualizada } : r))
        );
      } else {
        const nuevaRuta = await rutasService.createRuta({
          codigo: codigoInput,
          nombre: nombreInput,
        });
        setRutas((prev) => [...prev, nuevaRuta]);
      }

      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar la ruta');
    }
  };

  const handleDarDeBaja = async (ruta: Ruta) => {
    if (!ruta.id) return;
    const confirmacion = window.confirm(`¿Estás segura de dar de baja la ruta "${ruta.nombre}"?`);
    if (!confirmacion) return;

    try {
      await rutasService.darDeBajaRuta(ruta.id);
      setRutas((prev) =>
        prev.map((r) => (r.id === ruta.id ? { ...r, activa: false } : r))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo dar de baja la ruta');
    }
  };

  return (
    <div className="min-h-screen text-gray-800 p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Rutas</h1>
          <p className="text-gray-400 text-sm mt-1">Configuración y estado de los trayectos activos.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="bg-[#00b8ff] hover:bg-[#009bd6] text-black font-bold px-5 py-2.5 rounded-full shadow-lg transition-all flex items-center gap-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Ruta
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 font-medium">
            Cargando rutas desde el servidor...
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rutas.map((ruta, index) => (
                <tr key={ruta.id ?? index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-900">{ruta.codigo}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{ruta.nombre}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full ${
                      ruta.activa 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {ruta.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEditModal(ruta)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" 
                        title="Editar ruta"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={() => handleDarDeBaja(ruta)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" 
                        title="Dar de baja"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181b] rounded-2xl border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden text-white">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {editingRuta ? 'Editar Ruta' : 'Registrar Nueva Ruta'}
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  {editingRuta ? 'Modifica los datos del trayecto' : 'Ingresa los datos para la nueva ruta'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Código de Ruta
                </label>
                <input 
                  type="text" 
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  className="w-full bg-[#0f1014] border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:border-[#00b8ff] focus:ring-1 focus:ring-[#00b8ff] transition-all text-sm placeholder-gray-600" 
                  placeholder="Ej. RUTA-002" 
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Nombre del Trayecto
                </label>
                <input 
                  type="text" 
                  value={nombreInput}
                  onChange={(e) => setNombreInput(e.target.value)}
                  className="w-full bg-[#0f1014] border border-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:border-[#00b8ff] focus:ring-1 focus:ring-[#00b8ff] transition-all text-sm placeholder-gray-600" 
                  placeholder="Ej. Ruta Carretera a El Salvador" 
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 text-gray-400 hover:text-white font-medium rounded-xl hover:bg-white/5 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-[#00b8ff] hover:bg-[#009bd6] text-black font-bold rounded-full transition-all text-sm"
                >
                  {editingRuta ? 'Actualizar Ruta' : 'Guardar Ruta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}