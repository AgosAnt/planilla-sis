export default function Planillas() {
  return (
    <div className="min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Planillas</h1>
          <p className="text-gray-400 mt-1">Cálculo de pagos, bonos y descuentos del personal operativo.</p>
        </div>
      </div>

      {/* --- RESUMEN --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total a Pagar (Quincena)</div>
            <div className="text-2xl font-bold text-gray-800 mt-2">Q 45,250.00</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pilotos Procesados</div>
            <div className="text-2xl font-bold text-gray-800 mt-2">12 / 18</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
        </div>
      </div>

      {/* --- DETALLE --- */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Piloto</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Salario Base</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bonos</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Descuentos</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Neto</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-5 whitespace-nowrap">
                <div className="text-sm font-bold text-gray-900">Carlos Méndez</div>
                <div className="text-xs text-gray-500">PIL-042</div>
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">Q 3,500.00</td>
              <td className="px-6 py-5 whitespace-nowrap text-sm text-green-600 font-medium">+ Q 500.00</td>
              <td className="px-6 py-5 whitespace-nowrap text-sm text-red-500 font-medium">- Q 0.00</td>
              <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-gray-900">Q 4,000.00</td>
              <td className="px-6 py-5 whitespace-nowrap">
                <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                  Calculado
                </span>
              </td>
            </tr>
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-5 whitespace-nowrap">
                <div className="text-sm font-bold text-gray-900">Luis Ramírez</div>
                <div className="text-xs text-gray-500">PIL-018</div>
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">Q 3,500.00</td>
              <td className="px-6 py-5 whitespace-nowrap text-sm text-green-600 font-medium">+ Q 0.00</td>
              <td className="px-6 py-5 whitespace-nowrap text-sm text-red-500 font-medium">- Q 150.00</td>
              <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-gray-900">Q 3,350.00</td>
              <td className="px-6 py-5 whitespace-nowrap">
                <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                  Pendiente
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}