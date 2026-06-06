import React, { useMemo } from 'react';
import {
  ChevronRight,
  FileText,
  Smile,
  CalendarCheck,
  CheckCircle2,
  Plus,
  Brain,
  Eye,
  ArrowLeft,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import useSWR from 'swr';
import clienteAxios from '../../config/axios';
import usePaciente from '../../hooks/usePaciente';
import BrandDialog from '../../components/BrandDialog';

// --- CONFIGURACIÓN DE CHART.JS ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Paciente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('AUTH_TOKEN');

  // Referencia para el contenedor del PDF y estado de carga
  const printRef = useRef();
  const [feedbackDialog, setFeedbackDialog] = useState({
    open: false,
    type: 'info',
    message: ''
  });

  const { formarPDF, isGeneratingPDF, setIsGeneratingPDF } = usePaciente();

  // --- FETCHER PARA SWR ---
  const fetcher = (url) => clienteAxios.get(url, {
    params: { role: 'psicologo' },
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.data);

  const { data: apiData, isLoading, error } = useSWR(id ? `/api/pacientes/${id}` : null, fetcher);

  // --- FETCH JOURNALING ---
  const { data: journalingData } = useSWR(
    id ? `/api/psicologo/pacientes/${id}/journaling` : null,
    (url) => clienteAxios.get(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data)
  );

  // --- PROCESAMIENTO DE DATOS DEL GRÁFICO ---
  const chartData = useMemo(() => {
    if (!apiData || !apiData.grafico_estres) return { labels: [], datasets: [] };

    return {
      labels: apiData.grafico_estres.labels || [], // Eje X: Fechas
      datasets: [
        {
          label: 'Nivel de Estrés',
          data: apiData.grafico_estres.data || [], // Eje Y: Valores
          borderColor: '#85C1E9', // Sky Blue
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(133, 193, 233, 0.5)');
            gradient.addColorStop(1, 'rgba(133, 193, 233, 0.0)');
            return gradient;
          },
          borderWidth: 3,
          pointBackgroundColor: '#FBFCFC',
          pointBorderColor: '#2C3E50',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [apiData]);

  const resumenModulos = useMemo(() => {
    if (apiData?.stats?.modulos_completados?.length) {
      return apiData.stats.modulos_completados;
    }

    if (!apiData?.modulos?.length) {
      return [];
    }

    const agrupado = apiData.modulos.reduce((acc, actividad) => {
      const modulo = Number(actividad.modulo) || 0;
      if (!acc[modulo]) {
        acc[modulo] = { suma: 0, total: 0 };
      }

      acc[modulo].suma += Number(actividad.progreso) || 0;
      acc[modulo].total += 1;
      return acc;
    }, {});

    return Object.entries(agrupado)
      .map(([modulo, valores]) => ({
        modulo: Number(modulo),
        porcentaje: valores.total > 0 ? Math.round(valores.suma / valores.total) : 0,
      }))
      .sort((a, b) => a.modulo - b.modulo);
  }, [apiData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2C3E50',
        titleColor: '#FBFCFC',
        bodyColor: '#FBFCFC',
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 56,
        title: {
          display: true,
          text: 'Nivel de Estrés',
          color: '#9ca3af',
          font: { family: "'Nunito Sans', sans-serif", size: 12, weight: 'bold' }
        },
        grid: { color: 'rgba(160, 160, 160, 0.1)', drawBorder: false },
        ticks: { color: '#9ca3af' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af' }
      },
    },
  };

  const datosParaPDF = apiData ? { perfil: apiData.perfil, stats: apiData.stats, modulos: apiData.modulos, actividad_reciente: apiData.actividad_reciente, id: apiData.perfil.id } : null;
  console.log("apiData:", apiData);

  const generarPDF = async () => {
    if (!apiData) return;
    setIsGeneratingPDF(true);

    const resultado = await formarPDF(datosParaPDF);

    setFeedbackDialog({
      open: true,
      type: resultado?.ok ? 'success' : 'error',
      message: resultado?.message || 'No fue posible generar el reporte.'
    });
  };

  // --- ESTADO DE CARGA Y ERROR ---
  if (isLoading) return (
    <div className="flex-1 md:ml-64 p-10 flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#85C1E9]"></div>
    </div>
  );

  if (error || !apiData) return (
    <div className="flex-1 md:ml-64 p-10 text-center text-red-500">
      Error al cargar los datos del paciente.
    </div>
  );

  // Desestructuración para facilitar el uso en el JSX
  const { perfil, stats, modulos, actividad_reciente } = apiData;

  return (
    <div className="flex-1 md:ml-64 p-6 lg:p-10 transition-all duration-300 font-['Nunito_Sans']">
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap');`}
      </style>

      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <button onClick={() => navigate(-1)} className="hover:text-[#85C1E9] flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Atrás
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#85C1E9]">Perfil del Paciente</span>
          </div>
          <h2 className="text-3xl font-bold text-[#2C3E50] dark:text-white">
            {perfil.nombre}
          </h2>
          <p className="text-sm text-gray-400">{perfil.email}</p>
        </div>
        <div className="flex gap-3">
          {/* <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#2C3E50] border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm font-medium">
            <FileText className="w-5 h-5" />
            Notas
          </button> */}
          <button
            onClick={generarPDF}
            disabled={isGeneratingPDF}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[#85C1E9] text-white rounded-xl hover:bg-[#6eb2e0] transition-colors shadow-md font-bold disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <FileText className="w-5 h-5" />
            {isGeneratingPDF ? 'Generando...' : 'Generar reporte'}
          </button>
        </div>
      </header>

      {/* CONTENEDOR DEL PDF: Todo lo que esté dentro de este div saldrá en el reporte */}
      <div ref={printRef}>
        {/* --- STATS GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Stat 1: Estado de Ánimo */}
            <div className="bg-white dark:bg-[#2C3E50] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado de estres</p>
                <p className="text-2xl font-bold text-[#2C3E50] dark:text-white mt-1">
                  {stats.animo_actual || 'Estable'}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#A2D9CE]/20 rounded-full flex items-center justify-center text-[#A2D9CE]">
                <Smile className="w-6 h-6" />
              </div>
            </div>

            {/* Stat 2: Total Sesiones */}
            <div className="bg-white dark:bg-[#2C3E50] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de sesiones</p>
                <p className="text-2xl font-bold text-[#2C3E50] dark:text-white mt-1">
                  {stats.total_sesiones}
                </p>
                <span className="text-xs text-[#85C1E9] font-semibold flex items-center mt-1">
                  {stats.proxima_sesion ? `Próxima: ${new Date(stats.proxima_sesion).toLocaleDateString()}` : 'Sin próxima sesión agendada'}
                </span>
              </div>
              <div className="w-12 h-12 bg-[#85C1E9]/20 rounded-full flex items-center justify-center text-[#85C1E9]">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Stat 3: Módulos Completados */}
            <div className="bg-white dark:bg-[#2C3E50] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Módulos Completados</p>
                {resumenModulos.length > 0 ? (
                  <div className="mt-2 space-y-1 max-h-20 overflow-y-auto pr-1">
                    {resumenModulos.map((item) => (
                      <p key={item.modulo} className="text-sm font-semibold text-[#2C3E50] dark:text-white truncate">
                        Módulo {item.modulo}: {item.porcentaje}%
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Sin módulos con avance.</p>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-2 block">
                  Total: {stats.total_tareas} actividades asignadas
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
                  Módulo actual: {stats.modulo_actual ? `Módulo ${stats.modulo_actual}` : 'Sin asignar'}
                </span>
              </div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* --- GRAPH SECTION --- */}
          <div className="col-span-1 lg:col-span-2 bg-white dark:bg-[#2C3E50] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[#2C3E50] dark:text-white">Historial de Estrés</h3>
            </div>

            {/* IMPORTANTE: El div contenedor debe tener altura (h-64) */}
            <div className="relative h-64 w-full">
              {chartData.labels && chartData.labels.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No hay suficientes datos para graficar.
                </div>
              )}
            </div>
          </div>

          {/* --- MODULES SECTION (Dinámico) --- */}
          <div className="col-span-1 bg-white dark:bg-[#2C3E50] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-[#2C3E50] dark:text-white mb-6">Actividades Asignadas</h3>
            <div className="space-y-6 max-h-64 overflow-y-auto pr-2">

              {modulos && modulos.length > 0 ? (
                modulos.map((modulo) => (
                  <div
                    key={modulo.id}
                    onClick={() => navigate(`/psicologo/pacientes/${id}/editar-actividad/${modulo.id}`)}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-[#85C1E9] hover:bg-[#85C1E9]/5 cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-[#85C1E9] transition-colors">{modulo.nombre}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${modulo.progreso >= 80 ? 'text-indigo-400' : 'text-[#85C1E9]'}`}>
                          {modulo.progreso}%
                        </span>
                        <Eye className="w-4 h-4 text-gray-400 group-hover:text-[#85C1E9] transition-colors opacity-0 group-hover:opacity-100" />
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${modulo.progreso >= 80 ? 'bg-indigo-400' : 'bg-[#85C1E9]'}`}
                        style={{ width: `${modulo.progreso}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 capitalize">Estado: {modulo.estado}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No hay actividades asignadas actualmente.</p>
              )}

              <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => navigate(`/psicologo/pacientes/${id}/nueva-actividad`)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-[#85C1E9] hover:text-[#85C1E9] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Asignar/Mover Actividad
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- ACTIVITY TABLE (Dinámica) --- */}
        <div className="bg-white dark:bg-[#2C3E50] rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#2C3E50] dark:text-white">Actividad Reciente</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#FBFCFC] dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Actividad</th>
                  <th className="px-6 py-4 font-semibold">Fecha Actualización</th>
                  <th className="px-6 py-4 font-semibold">Progreso</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">

                {actividad_reciente && actividad_reciente.length > 0 ? (
                  actividad_reciente.map((actividad) => (
                    <tr key={actividad.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#A2D9CE]/20 flex items-center justify-center text-[#A2D9CE]">
                            <Brain className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-[#2C3E50] dark:text-gray-200">
                            {actividad.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {actividad.fecha_actualizacion}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {actividad.progreso}%
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize 
                              ${actividad.estado === 'completado' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {actividad.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/psicologo/pacientes/${id}/editar-actividad/${actividad.id}`)}
                          className="text-gray-400 hover:text-[#85C1E9] transition-colors"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                      No hay actividad reciente registrada.
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* FIN DEL CONTENEDOR DEL PDF */}

      {/* --- JOURNALING SECTION (fuera del PDF) --- */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-500">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-[#2C3E50] dark:text-white">Actividades Journaling</h3>
        </div>

        {!journalingData || journalingData.length === 0 ? (
          <div className="bg-white dark:bg-[#2C3E50] rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              El paciente aún no ha completado ninguna actividad de journaling.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {journalingData.map((resp) => (
              <div
                key={resp.id}
                className="bg-white dark:bg-[#2C3E50] rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/psicologo/pacientes/${id}/editar-actividad/${resp.actividad?.id}`)}
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-500">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-[#2C3E50] dark:text-white text-sm group-hover:text-[#85C1E9] transition-colors">
                      {resp.actividad?.nombre ?? 'Actividad de journaling'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(resp.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <Eye className="w-5 h-5 text-gray-400 group-hover:text-[#85C1E9] transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Preguntas guía */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                      Preguntas guía
                    </p>
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      {resp.actividad?.descripcion ?? '—'}
                    </div>
                  </div>

                  {/* Respuesta del paciente */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                      Respuesta del paciente
                    </p>
                    <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border-l-4 border-indigo-300 dark:border-indigo-600">
                      {resp.respuesta}
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BrandDialog
        isOpen={feedbackDialog.open}
        title="VidaZen"
        message={feedbackDialog.message}
        variant={feedbackDialog.type}
        onClose={() => setFeedbackDialog({ open: false, type: 'info', message: '' })}
      />

    </div>
  );
}