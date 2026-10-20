import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Rutas from './pages/rutas/Rutas';
import Supervision from './pages/supervision/Supervision';
import Planillas from './pages/planillas/Planillas';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex justify-center h-screen bg-[#0f1014] text-white font-sans overflow-hidden">

        {/* --- MENÚ LATERAL --- */}
        <div className="w-64 flex flex-col py-6 px-4">
          <h1 className="text-3xl font-bold mb-8 px-4 text-white tracking-tighter">PLANILLA</h1>

          <nav className="flex flex-col space-y-1">
            <Link to="/" className="flex items-center gap-4 px-4 py-3 rounded-md hover:bg-white/10 transition-colors font-bold text-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Rutas
            </Link>
            <Link to="/supervision" className="flex items-center gap-4 px-4 py-3 rounded-md hover:bg-white/10 transition-colors font-bold text-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Supervisión
            </Link>
            <Link to="/planillas" className="flex items-center gap-4 px-4 py-3 rounded-md hover:bg-white/10 transition-colors font-bold text-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Planillas
            </Link>
          </nav>

          <div className="mt-8 px-4">
            <button className="w-full bg-[#00b8ff] hover:bg-[#009bd6] text-black font-bold text-lg py-3 rounded-full flex items-center justify-center gap-2 transition-colors shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Crear
            </button>
          </div>
        </div>

        <div className="w-[850px] border-x border-gray-800 flex flex-col h-full bg-[#0f1014]">

          <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden">
            <Routes>
              <Route path="/" element={<Rutas />} />
              <Route path="/supervision" element={<Supervision />} />
              <Route path="/planillas" element={<Planillas />} />
            </Routes>
          </div>
        </div>

        <div className="w-80 p-6 hidden xl:block">
          {/* Buscador */}
          <div className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input type="text" className="bg-[#222222] text-white rounded-md w-full py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#00b8ff] placeholder-gray-500 border border-transparent focus:border-[#00b8ff] transition-all" placeholder="Buscar en Planilla..." />
          </div>

          {/* --- STATUS RÁPIDO --- */}
          <h3 className="font-bold text-lg mb-4 text-white">Radar de Ruta</h3>
          <div className="bg-[#222222] rounded-xl border border-gray-800 p-4 space-y-3">
            <div className="flex justify-between items-center text-sm border-b border-gray-800 pb-2">
              <span className="text-gray-400">Ruta seleccionada:</span>
              <span className="font-bold text-blue-400">Ruta Norte</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Pilotos en ruta:</span>
              <span className="font-bold text-white">3 activos</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Estado general:</span>
              <span className="bg-green-500/20 text-green-400 text-xs px-2.5 py-1 rounded-full font-bold">
                Sin retrasos
              </span>
            </div>
          </div>
        </div>

      </div>
    </BrowserRouter>
  );
}