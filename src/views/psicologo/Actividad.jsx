import React from 'react';
import {
  Save,
  Info,
  Clock,
  Delete,
  Layers,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import clienteAxios from '../../config/axios';

export default function Actividad() {

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { id: pacienteId, idActividad } = useParams();

  const isEditing = (!!idActividad && idActividad !== undefined);

  const token = localStorage.getItem('AUTH_TOKEN');

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    duracion: '',
    modulo: 1,
  });

  const [currentActividadId, setCurrentActividadId] = useState(null);
  const [allActivities, setAllActivities] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [movingActivityId, setMovingActivityId] = useState(null);
  const [moveSuccessId, setMoveSuccessId] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [filterModulo, setFilterModulo] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [searchNombre, setSearchNombre] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const categoryDropdownRef = useRef(null);

  const availableModules = Array.from(
    new Set(
      allActivities
        .map((actividad) => Number(actividad.modulo))
        .filter((modulo) => Number.isInteger(modulo) && modulo > 0)
    )
  ).sort((a, b) => a - b);

  const tipoOptions = Array.from(
    new Set(
      allActivities
        .map((actividad) => (actividad.tipo || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const categoryOptions = Array.from(
    new Set([...tipoOptions, (formData.categoria || '').trim()].filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const normalizeSearchValue = (value) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const filteredActivities = allActivities.filter((actividad) => {
    const normalizedSearch = normalizeSearchValue(searchNombre);
    const normalizedName = normalizeSearchValue(actividad.nombre);

    const moduloMatches = filterModulo === 'all' || actividad.modulo === Number(filterModulo);
    const tipoMatches = filterTipo === 'all' || (actividad.tipo || '').toLowerCase() === filterTipo.toLowerCase();
    const nombreMatches = normalizedSearch === '' || normalizedName.includes(normalizedSearch);
    return moduloMatches && tipoMatches && nombreMatches;
  });

  const fetchActivitiesCatalog = () => {
    setCatalogLoading(true);
    setCatalogError('');

    clienteAxios
      .get('/api/actividades', {
        params: { role: 'psicologo', paciente_id: pacienteId },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setAllActivities(res.data?.data || []);
      })
      .catch(() => {
        setCatalogError('No se pudo cargar el catálogo de actividades.');
      })
      .finally(() => setCatalogLoading(false));
  };

  useEffect(() => {
    if (isEditing) {
      try {
        clienteAxios.get(`/api/actividades/${idActividad}`, {
          params: { role: 'psicologo' },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then(res => {
            const {
              id,
              nombre,
              descripcion,
              tipo,
              tiempo_estimado_min,
              modulo,
            } = res.data;

            setCurrentActividadId(id);
            setFormData({
              nombre,
              descripcion,
              categoria: tipo,
              duracion: tiempo_estimado_min,
              modulo: modulo || 1,
            });
            setLoading(false);
          })
          .catch(error => {
            console.error("Error al obtener datos de la actividad:", error);
            setLoading(false);
          });
      } catch (error) {
        console.error("Error al obtener datos de la actividad:", error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [idActividad, isEditing]);

  useEffect(() => {
    fetchActivitiesCatalog();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!categoryDropdownRef.current?.contains(event.target)) {
        setIsCategoryOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSave = () => {
    if (isEditing) {
      //   PUT
      try {
        const token = localStorage.getItem('AUTH_TOKEN');
        clienteAxios.put(`/api/actividades/${idActividad}`, { ...formData, role: 'psicologo' }, {

          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then(res => {
            console.log("Actividad actualizada:", res.data);
            navigate(`/psicologo/pacientes/${pacienteId}`);
          })
          .catch(error => {
            console.error("Error al actualizar actividad:", error);
          });
      } catch (error) {

      }
    } else {
      //   POST
      try {
        const token = localStorage.getItem('AUTH_TOKEN');
        const createPayload = {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          categoria: formData.categoria,
          duracion: formData.duracion,
          role: 'psicologo',
        };

        clienteAxios.post(`/api/actividades`, createPayload, {
          params: { role: 'psicologo', paciente_id: pacienteId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then(res => {
            console.log("Actividad creada:", res.data);
            navigate(`/psicologo/pacientes/${pacienteId}`);
          })
          .catch(error => {
            console.error("Error al crear actividad:", error);
          });
      } catch (error) {

      }
    }
  };

  const handleMoveActivityModule = (activityId, nextModulo) => {
    setMovingActivityId(activityId);
    setMoveSuccessId(null);

    clienteAxios
      .patch(
        `/api/actividades/${activityId}/modulo`,
        { modulo: Number(nextModulo), role: 'psicologo', paciente_id: Number(pacienteId) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then(() => {
        setAllActivities((prev) =>
          prev.map((actividad) =>
            actividad.id === activityId
              ? { ...actividad, modulo: Number(nextModulo) }
              : actividad
          )
        );

        if (currentActividadId === activityId) {
          setFormData((prev) => ({ ...prev, modulo: Number(nextModulo) }));
        }

        setMoveSuccessId(activityId);
      })
      .catch(() => {
        setCatalogError('No se pudo mover la actividad de módulo.');
      })
      .finally(() => {
        setMovingActivityId(null);
      });
  };

  const isMeditationType = (typeValue) => {
    const normalized = (typeValue || '').toLowerCase();
    return normalized.includes('meditaci');
  };

  const handleDelete = () => {
    if (!confirm('¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.')) return;
    try {
      const token = localStorage.getItem('AUTH_TOKEN');
      clienteAxios.delete(`/api/actividades/${idActividad}`, {
        params: { role: 'psicologo', paciente_id: pacienteId },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => {
          console.log("Actividad eliminada:", res.data);
          navigate(`/psicologo/pacientes/${pacienteId}`);
        })
        .catch(error => {
          console.error("Error al eliminar actividad:", error);
        });
    } catch (error) {
      console.error("Error al eliminar actividad:", error);
    }
  }

  if (loading && isEditing) {
    return (
      <div className="flex-1 md:ml-64 p-6 lg:p-10 transition-all duration-300 font-['Nunito_Sans']">
        <p className="text-center text-gray-500 dark:text-gray-400">Cargando datos de la actividad...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 md:ml-64 p-6 lg:p-10 transition-all duration-300 font-['Nunito_Sans']">

      {/* Inyección de fuente */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap');`}
      </style>

      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-2 text-sm text-[#5D6D7E] dark:text-[#BDC3C7]">
            <span className="text-[#85C1E9]">
              {isEditing ? 'Editar Actividad' : 'Nueva Actividad'}
            </span>
          </div>

          <h2 className="text-3xl font-bold text-[#2C3E50] dark:text-white">Editor de Actividad</h2>
          <p className="text-[#5D6D7E] dark:text-[#BDC3C7] mt-1">Configure los detalles básicos de la nueva actividad terapéutica.</p>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-xl text-[#5D6D7E] dark:text-[#BDC3C7] bg-gray-200 dark:bg-[#2C3E50] hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors font-medium text-sm">
            Cancelar
          </button>
          {isEditing && (
            <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-bold text-sm">
              <Delete className="w-5 h-5" />
              Eliminar
            </button>
          )}
          <button onClick={handleSave} className="bg-[#A2D9CE] hover:bg-[#8ecfc3] text-[#2C3E50] px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-bold text-sm">
            <Save className="w-5 h-5" />
            Guardar Cambios
          </button>
        </div>
      </header>

      {/* --- FORMULARIO PRINCIPAL --- */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-[#2C3E50] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">

          {/* Título de la sección */}
          <h3 className="text-xl font-bold text-[#2C3E50] dark:text-white mb-8 flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-700">
            <Info className="text-[#85C1E9] w-6 h-6" />
            Información General
          </h3>

          <div className="space-y-8">

            {/* Campo: Nombre */}
            <div>
              <label htmlFor="activity-name" className="block text-sm font-semibold text-[#2C3E50] dark:text-white mb-2">
                Nombre de la Actividad
              </label>
              <input
                id="activity-name"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                type="text"
                placeholder="Ej. Meditación Matutina de 5 Minutos"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-[#FBFCFC] dark:bg-black/20 focus:border-[#85C1E9] focus:ring-1 focus:ring-[#85C1E9] text-base p-3.5 outline-none transition-colors dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {/* Campo: Descripción */}
            <div>
              <label htmlFor="activity-desc" className="block text-sm font-semibold text-[#2C3E50] dark:text-white mb-2">
                Descripción Detallada
              </label>
              <textarea
                id="activity-desc"
                rows="6"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describa el propósito y los pasos de esta actividad..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-[#FBFCFC] dark:bg-black/20 focus:border-[#85C1E9] focus:ring-1 focus:ring-[#85C1E9] text-base p-3.5 outline-none transition-colors resize-y min-h-[120px] dark:text-white dark:placeholder-gray-400"
              />
              <p className="text-xs text-[#5D6D7E] dark:text-[#BDC3C7] mt-2 text-right">{formData.descripcion.length}/500 caracteres</p>
            </div>

            {/* Fila: Categoría y Duración */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Select: Categoría */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-[#2C3E50] dark:text-white mb-2">
                  Categoría
                </label>
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    id="category"
                    type="button"
                    onClick={() => setIsCategoryOpen((prev) => !prev)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-[#FBFCFC] dark:bg-black/20 focus:border-[#85C1E9] focus:ring-1 focus:ring-[#85C1E9] text-base p-3.5 outline-none transition-colors dark:text-white text-left flex items-center justify-between"
                    aria-expanded={isCategoryOpen}
                    aria-haspopup="listbox"
                  >
                    <span className={formData.categoria ? 'text-[#2C3E50] dark:text-white' : 'text-[#5D6D7E] dark:text-[#BDC3C7]'}>
                      {formData.categoria || 'Seleccione una categoría...'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-[#5D6D7E] dark:text-[#BDC3C7] transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isCategoryOpen && (
                    <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1f2c3a] shadow-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full text-left px-3.5 py-2.5 text-[#5D6D7E] dark:text-[#BDC3C7] hover:bg-gray-100 dark:hover:bg-[#2a3a4c]"
                        onClick={() => {
                          setFormData({ ...formData, categoria: '' });
                          setIsCategoryOpen(false);
                        }}
                      >
                        Seleccione una categoría...
                      </button>

                      {categoryOptions.map((category) => {
                        const isSelected = formData.categoria === category;

                        return (
                          <button
                            key={category}
                            type="button"
                            className={`w-full text-left px-3.5 py-2.5 transition-colors ${isSelected
                              ? 'bg-[#85C1E9]/20 text-[#2C3E50] dark:text-white'
                              : 'text-[#2C3E50] dark:text-white hover:bg-gray-100 dark:hover:bg-[#2a3a4c]'
                              }`}
                            onClick={() => {
                              setFormData({ ...formData, categoria: category });
                              setIsCategoryOpen(false);
                            }}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Input: Duración */}
              <div>
                <label htmlFor="duration" className="block text-sm font-semibold text-[#2C3E50] dark:text-white mb-2">
                  Duración Estimada (min)
                </label>
                <div className="relative">
                  <input
                    id="duration"
                    value={formData.duracion}
                    onChange={(e) => setFormData({ ...formData, duracion: e.target.value })}
                    type="number"
                    min="1"
                    placeholder="15"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-[#FBFCFC] dark:bg-black/20 focus:border-[#85C1E9] focus:ring-1 focus:ring-[#85C1E9] text-base p-3.5 pl-10 outline-none transition-colors dark:text-white dark:placeholder-gray-400"
                  />
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-5 h-5" />
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#2C3E50] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-[#2C3E50] dark:text-white flex items-center gap-2">
              <Layers className="text-[#85C1E9] w-6 h-6" />
              Catálogo de Actividades
            </h3>

            <button
              type="button"
              onClick={fetchActivitiesCatalog}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#1f2c3a] hover:bg-gray-200 dark:hover:bg-[#1a2633] text-[#2C3E50] dark:text-white text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar catálogo
            </button>
          </div>

          <p className="text-sm text-[#5D6D7E] dark:text-[#BDC3C7] mt-4 mb-4">
            Aquí puedes revisar actividades disponibles y filtrar por módulo o tipo para cambiar progresivamente el módulo de cada actividad.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[#2C3E50] dark:text-white mb-2" htmlFor="filtro-modulo">
                Filtrar por módulo
              </label>
              <select
                id="filtro-modulo"
                value={filterModulo}
                onChange={(e) => setFilterModulo(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1f2c3a] px-3 py-2.5 text-[#2C3E50] dark:text-white outline-none focus:border-[#85C1E9]"
              >
                <option value="all">Todos los módulos</option>
                {availableModules.map((moduleNumber) => (
                  <option key={moduleNumber} value={moduleNumber}>
                    Módulo {moduleNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2C3E50] dark:text-white mb-2" htmlFor="filtro-nombre">
                Buscar por nombre
              </label>
              <input
                id="filtro-nombre"
                type="text"
                value={searchNombre}
                onChange={(e) => setSearchNombre(e.target.value)}
                placeholder="Ej. meditacion, respiración..."
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1f2c3a] px-3 py-2.5 text-[#2C3E50] dark:text-white outline-none focus:border-[#85C1E9]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2C3E50] dark:text-white mb-2" htmlFor="filtro-tipo">
                Filtrar por tipo
              </label>
              <select
                id="filtro-tipo"
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1f2c3a] px-3 py-2.5 text-[#2C3E50] dark:text-white outline-none focus:border-[#85C1E9]"
              >
                <option value="all">Todos los tipos</option>
                {tipoOptions.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {catalogError && (
            <div className="mb-4 text-sm rounded-lg px-4 py-3 bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/50">
              {catalogError}
            </div>
          )}

          {catalogLoading ? (
            <p className="text-sm text-[#5D6D7E] dark:text-[#BDC3C7]">Cargando actividades...</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F7FAFC] dark:bg-[#243447] text-left text-[#5D6D7E] dark:text-[#BDC3C7]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Actividad</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Duración</th>
                    <th className="px-4 py-3 font-semibold">Módulo actual</th>
                    <th className="px-4 py-3 font-semibold">Completada</th>
                    <th className="px-4 py-3 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-[#2C3E50] divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredActivities.length > 0 ? (
                    filteredActivities.map((actividad) => {
                      const isMoving = movingActivityId === actividad.id;
                      const isMoved = moveSuccessId === actividad.id;
                      const isCompleted = actividad.completada === true;
                      const showAudioPlayer = isMeditationType(actividad.tipo) && !!actividad.audio_url;
                      const moveTargets = availableModules.filter((modulo) => modulo !== Number(actividad.modulo));

                      return (
                        <React.Fragment key={actividad.id}>
                          <tr
                            className="hover:bg-gray-50/60 dark:hover:bg-[#223142] transition-colors cursor-pointer"
                            onClick={() => setSelectedActivity(actividad)}
                          >
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#2C3E50] dark:text-white">{actividad.nombre}</p>
                              <p className="text-xs text-[#5D6D7E] dark:text-[#BDC3C7] mt-1 line-clamp-2">{actividad.descripcion || 'Sin descripción'}</p>
                            </td>
                            <td className="px-4 py-3 text-[#2C3E50] dark:text-white capitalize">{actividad.tipo || '-'}</td>
                            <td className="px-4 py-3 text-[#2C3E50] dark:text-white">{actividad.tiempo_estimado_min} min</td>
                            <td className="px-4 py-3 text-[#2C3E50] dark:text-white">Módulo {actividad.modulo}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center justify-center text-base font-bold ${isCompleted ? 'text-emerald-500' : 'text-red-500'}`}
                                title={isCompleted ? 'Completada' : 'No completada'}
                              >
                                {isCompleted ? '✓' : '✗'}
                              </span>
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <select
                                  disabled={isMoving || isCompleted}
                                  defaultValue=""
                                  onChange={(e) => {
                                    const selectedModulo = Number(e.target.value);
                                    if (selectedModulo > 0) {
                                      handleMoveActivityModule(actividad.id, selectedModulo);
                                    }
                                    e.target.value = '';
                                  }}
                                  className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1f2c3a] px-3 py-2 text-[#2C3E50] dark:text-white outline-none hover:border-[#85C1E9]"
                                >
                                  <option value="" disabled>
                                    {isCompleted ? 'Completada' : 'Mover módulo...'}
                                  </option>
                                  {moveTargets.map((targetModulo) => (
                                    <option key={`${actividad.id}-${targetModulo}`} value={targetModulo}>
                                      Mover a módulo {targetModulo}
                                    </option>
                                  ))}
                                  {moveTargets.length === 0 && !isCompleted && (
                                    <option value="" disabled>
                                      Sin módulos alternativos
                                    </option>
                                  )}
                                </select>

                                {isMoving && <span className="text-xs text-[#5D6D7E] dark:text-[#BDC3C7]">Guardando...</span>}
                                {isMoved && !isMoving && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                              </div>
                            </td>
                          </tr>

                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-center text-[#5D6D7E] dark:text-[#BDC3C7]" colSpan={6}>
                        No hay actividades para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedActivity(null)}>
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1f2c3a] border border-gray-200 dark:border-gray-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h4 className="text-2xl font-bold text-[#2C3E50] dark:text-white">{selectedActivity.nombre}</h4>
                <p className="text-sm text-[#5D6D7E] dark:text-[#BDC3C7] mt-2">
                  Tipo: <span className="capitalize">{selectedActivity.tipo || '-'}</span> | Duración: {selectedActivity.tiempo_estimado_min} min | Módulo actual: {selectedActivity.modulo}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#243447] text-[#2C3E50] dark:text-white hover:bg-gray-200 dark:hover:bg-[#2d435b]"
              >
                Cerrar
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#5D6D7E] dark:text-[#BDC3C7] font-semibold">Descripción completa</p>
                <p className="text-base text-[#2C3E50] dark:text-white mt-2 whitespace-pre-wrap">
                  {selectedActivity.descripcion || 'Sin descripción'}
                </p>
              </div>

              {isMeditationType(selectedActivity.tipo) && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#5D6D7E] dark:text-[#BDC3C7] font-semibold">Audio de la actividad</p>
                  {selectedActivity.audio_url ? (
                    <audio className="w-full mt-2" controls preload="none" src={selectedActivity.audio_url}>
                      Tu navegador no soporta reproducción de audio.
                    </audio>
                  ) : (
                    <p className="text-sm text-[#5D6D7E] dark:text-[#BDC3C7] mt-2">Esta actividad es de meditación, pero no tiene audio disponible.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}