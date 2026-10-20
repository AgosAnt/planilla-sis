export default function Supervision() {
  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Supervisión</h1>
        <p className="text-gray-400 mt-1">Control de asistencia y estado de la flota operativa.</p>
      </div>

      {/* --- TARJETA DE MÉTRICAS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pilotos Activos</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">18</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Rutas en Curso</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">5</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Retrasos / Faltas</div>
          <div className="text-2xl font-bold text-gray-800 mt-2">2</div>
        </div>
      </div>

      {/* --- TABLA  --- */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-bold text-gray-700">Registro de Asistencia de Hoy</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Piloto</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ruta Asignada</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hora de Entrada</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-5 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">CM</div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Carlos Méndez</div>
                    <div className="text-xs text-gray-500">ID: PIL-042</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-medium">Ruta Norte Central</td>
              <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">06:00 AM</td>
              <td className="px-6 py-5 whitespace-nowrap">
                <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-green-100 text-green-800">
                  En tiempo
                </span>
              </td>
            </tr>
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-5 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-700">LR</div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Luis Ramírez</div>
                    <div className="text-xs text-gray-500">ID: PIL-018</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-medium">Ruta Sur</td>
              <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">06:15 AM</td>
              <td className="px-6 py-5 whitespace-nowrap">
                <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                  Retraso leve
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}