import React, { useState, useEffect } from 'react';
import { Users, FileText, Activity } from 'lucide-react';
import clienteAxios from '../../config/axios';

const Estadisticas = () => {
  const now = new Date();
  const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [estadisticas, setEstadisticas] = useState([]);
  const [mesActual, setMesActual] = useState('');
  const [periodo, setPeriodo] = useState('mes_actual');
  const [selectedYm, setSelectedYm] = useState(defaultYm);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('AUTH_TOKEN');
    setCargando(true);
    clienteAxios.get('/api/admin/estadisticas', {
      params: {
        period: 'month',
        ym: selectedYm,
      },
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        setMesActual(response.data.mes_actual);
        setPeriodo(response.data.periodo || 'historico');
        setEstadisticas(response.data.data);
      })
      .catch((error) => console.error('Error cargando estadísticas:', error))
      .finally(() => setCargando(false));
  }, [selectedYm]);

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 font-sans">
              Resumen de Psicólogos
            </h2>
            {periodo === 'month' ? (
              <p className="text-slate-500 capitalize">
                Actividad registrada en {mesActual}
              </p>
            ) : (
              <p className="text-slate-500">
                Actividad histórica acumulada
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="estadisticas-month" className="text-sm font-medium text-slate-600">
              Mes
            </label>
            <input
              id="estadisticas-month"
              type="month"
              value={selectedYm}
              onChange={(e) => setSelectedYm(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {estadisticas.map((psicologo) => (
          <div 
            key={psicologo.id} 
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6"
          >
            {/* Cabecera de la tarjeta */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-lg">
                  {psicologo.nombre_psicologo}
                </h3>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Psicólogo
                </span>
              </div>
            </div>

            {/* Metricas */}
            <div className="space-y-4">
              {/* Metrica 1: Pacientes Activos */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white shadow-sm text-teal-500">
                    <Activity size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    Pacientes con actividades<br /> realizadas
                  </span>
                </div>
                <span className="text-lg font-bold text-slate-800">
                  {psicologo.pacientes_activos_mes}
                </span>
              </div>

              {/* Metrica 2: Cuestionarios Contestados */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white shadow-sm text-indigo-500">
                    <FileText size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    Test contestados
                  </span>
                </div>
                <span className="text-lg font-bold text-slate-800">
                  {psicologo.cuestionarios_mes}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {estadisticas.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No hay datos de psicólogos registrados.
        </div>
      )}
    </div>
  );
};

export default Estadisticas;