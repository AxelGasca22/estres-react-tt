import { createContext, useState, useEffect } from "react";
import clienteAxios from "../config/axios";
import jsPDF from "jspdf";

const PacienteContext = createContext();

const PacienteProvider = ({ children }) => {

    // SECCION PDF
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const formarPDF = async (datosParaPDF) => {
        const { id, perfil, stats, modulos } = datosParaPDF;
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            let currentY = 20;

            // --- 1. ENCABEZADO ESTILO BANNER ---
            doc.setFillColor(44, 62, 80); // Azul oscuro (#2C3E50)
            doc.rect(0, 0, pageWidth, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('REPORTE DE SEGUIMIENTO PSICOLÓGICO', margin, 22);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`ID de Control: ${id}`, margin, 30);
            doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, margin, 35);

            // --- 2. INFORMACIÓN PERSONAL (2 COLUMNAS) ---
            currentY = 55;
            doc.setTextColor(44, 62, 80);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Información del Paciente', margin, currentY);

            currentY += 4;
            doc.setDrawColor(133, 193, 233); // Azul claro (#85C1E9)
            doc.setLineWidth(0.8);
            doc.line(margin, currentY, pageWidth - margin, currentY);

            currentY += 10;
            doc.setFontSize(11);

            // Columna 1
            doc.setFont('helvetica', 'bold');
            doc.text('Nombre:', margin, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${perfil.nombre}`, margin + 20, currentY);

            doc.setFont('helvetica', 'bold');
            doc.text('Email:', margin, currentY + 8);
            doc.setFont('helvetica', 'normal');
            doc.text(`${perfil.email}`, margin + 20, currentY + 8);

            // Columna 2 (Sexo y Edad)
            const rightCol = pageWidth / 2 + 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Edad:', rightCol, currentY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${perfil.edad || 'N/A'} años`, rightCol + 15, currentY);

            doc.setFont('helvetica', 'bold');
            doc.text('Sexo:', rightCol, currentY + 8);
            doc.setFont('helvetica', 'normal');
            doc.text(`${perfil.sexo || 'N/A'}`, rightCol + 15, currentY + 8);

            // --- 3. ESTADÍSTICAS RÁPIDAS (TARJETAS) ---
            currentY += 20;
            doc.setFillColor(245, 247, 250);
            doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 3, 3, 'F');

            const colWidth = (pageWidth - (margin * 2)) / 3;

            // Nivel de Estrés
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('ESTADO DE ESTRÉS', margin + 10, currentY + 8);
            doc.setFontSize(12);
            doc.setTextColor(44, 62, 80);
            doc.setFont('helvetica', 'bold');
            doc.text(`${stats.animo_actual || 'Estable'}`, margin + 10, currentY + 18);

            // Sesiones
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text('SESIONES TOTALES', margin + colWidth + 5, currentY + 8);
            doc.setFontSize(12);
            doc.setTextColor(44, 62, 80);
            doc.setFont('helvetica', 'bold');
            doc.text(`${stats.total_sesiones}`, margin + colWidth + 5, currentY + 18);

            // Tareas
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text('% CUMPLIMIENTO', margin + (colWidth * 2) + 5, currentY + 8);
            doc.setFontSize(12);
            doc.setTextColor(44, 62, 80);
            doc.setFont('helvetica', 'bold');
            doc.text(`${stats.tareas_completadas_porcentaje}%`, margin + (colWidth * 2) + 5, currentY + 18);

            // --- 4. TABLA DE MÓDULOS ---
            currentY += 40;
            doc.setFontSize(14);
            doc.text('Avance de Módulos', margin, currentY);

            currentY += 6;
            // Cabecera Tabla
            doc.setFillColor(133, 193, 233);
            doc.rect(margin, currentY, pageWidth - (margin * 2), 10, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text('Módulo Asignado', margin + 5, currentY + 6.5);
            doc.text('Estado', margin + 90, currentY + 6.5);
            doc.text('Progreso', margin + 140, currentY + 6.5);

            currentY += 10;
            doc.setTextColor(60, 60, 60);
            doc.setFont('helvetica', 'normal');

            modulos.forEach((modulo, index) => {
                // Salto de página si la fila no cabe (20mm de margen para el footer)
                if (currentY + 10 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 20;

                    // Repetir cabecera de tabla en la nueva página
                    doc.setFillColor(133, 193, 233);
                    doc.rect(margin, currentY, pageWidth - (margin * 2), 10, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Módulo Asignado', margin + 5, currentY + 6.5);
                    doc.text('Estado', margin + 90, currentY + 6.5);
                    doc.text('Progreso', margin + 140, currentY + 6.5);
                    currentY += 10;

                    doc.setTextColor(60, 60, 60);
                    doc.setFont('helvetica', 'normal');
                }

                // Filas con color alterno
                if (index % 2 === 0) {
                    doc.setFillColor(249, 251, 253);
                    doc.rect(margin, currentY, pageWidth - (margin * 2), 10, 'F');
                }

                doc.setFontSize(9);
                doc.text(modulo.nombre, margin + 5, currentY + 6.5);
                doc.text(modulo.estado.charAt(0).toUpperCase() + modulo.estado.slice(1), margin + 90, currentY + 6.5);
                doc.text(`${modulo.progreso}%`, margin + 140, currentY + 6.5);

                doc.setDrawColor(240, 240, 240);
                doc.line(margin, currentY + 10, pageWidth - margin, currentY + 10);
                currentY += 10;
            });

            // --- 5. GRÁFICO DE ESTRÉS ---
            const chartCanvas = document.querySelector('canvas');
            if (chartCanvas) {
                if (currentY + 80 > pageHeight) {
                    doc.addPage();
                    currentY = 20;
                } else {
                    currentY += 15;
                }

                doc.setFontSize(14);
                doc.setTextColor(44, 62, 80);
                doc.setFont('helvetica', 'bold');
                doc.text('Análisis Evolutivo de Estrés', margin, currentY);

                const chartImg = chartCanvas.toDataURL('image/png', 1.0);
                // Centramos el gráfico
                doc.addImage(chartImg, 'PNG', margin, currentY + 5, pageWidth - (margin * 2), 65);
            }

            // --- PIE DE PÁGINA ---
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(170, 170, 170);
                doc.text(
                    `Este reporte es un documento informativo generado por la plataforma. Página ${i} de ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            doc.save(`Reporte_Paciente_${perfil.nombre.replace(/\s+/g, '_')}.pdf`);
            return {
                ok: true,
                message: 'Reporte generado exitosamente.'
            };

        } catch (err) {
            console.error('Error al generar el PDF:', err);
            return {
                ok: false,
                message: 'Hubo un error. Intentelo mas tarde.'
            };
        } finally {
            setIsGeneratingPDF(false);
        }
    }

    return (
        <PacienteContext.Provider
            value={{
                formarPDF,
                isGeneratingPDF,
                setIsGeneratingPDF
            }}
        >
            {children}
        </PacienteContext.Provider>
    );
};

export { PacienteProvider };
export default PacienteContext;
