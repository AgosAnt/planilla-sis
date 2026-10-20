export default function Planillas() {
  return (
    <div className="min-h-screen p-6 text-foreground">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Planillas</h1>
          <p className="text-muted-foreground mt-1">Cálculo de pagos, bonos y descuentos del personal operativo.</p>
        </div>
      </div>

      {/* AVISO DE DATOS DE EJEMPLO */}
      <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 text-orange-600 rounded-xl text-sm font-medium">
        ⚠️ Datos de ejemplo: el cálculo de planillas todavía no está disponible.
      </div>

      {/* --- RESUMEN --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card p-6 rounded-xl shadow-sm border flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total a Pagar (Quincena)</div>
            <div className="text-2xl font-bold mt-2">Q 45,200.00</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-sm border flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pilotos Procesados</div>
            <div className="text-2xl font-bold mt-2">12 / 18</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
        </div>
      </div>
      
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-8 text-center text-muted-foreground font-medium">Tabla de planillas en construcción...</div>
      </div>
    </div>
  );
}