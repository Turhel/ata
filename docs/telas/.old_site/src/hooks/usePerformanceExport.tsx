import { useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CategoryData {
  name: string;
  value: number;
}

interface InspectorData {
  name: string;
  code: string;
  ordens: number;
  aprovadas: number;
}

interface PerformanceMetrics {
  totalOrders: number;
  approvalRate: number;
  estimatedValue: number;
  dailyAverage: number;
}

interface ChartDataItem {
  day?: string;
  week?: string;
  ordens: number;
  aprovadas: number;
}

interface ExportData {
  metrics: PerformanceMetrics;
  chartData: ChartDataItem[];
  categoryData: CategoryData[];
  inspectorData: InspectorData[];
  period: 'week' | 'month';
}

export function usePerformanceExport() {
  const exportToExcel = (data: ExportData) => {
    const workbook = XLSX.utils.book_new();
    const periodLabel = data.period === 'week' ? 'Semana' : 'Mês';
    const dateStr = format(new Date(), 'dd-MM-yyyy', { locale: ptBR });

    // Summary sheet
    const summaryData = [
      ['Relatório de Desempenho', ''],
      ['Período', periodLabel],
      ['Data de Geração', format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })],
      ['', ''],
      ['Métricas', 'Valor'],
      ['Total de Ordens', data.metrics.totalOrders],
      ['Taxa de Aprovação', `${data.metrics.approvalRate.toFixed(0)}%`],
      ['Valor Estimado', `$ ${data.metrics.estimatedValue.toFixed(2)}`],
      ['Média Diária', data.metrics.dailyAverage.toFixed(1)],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    // Orders by period sheet
    const ordersHeaders = data.period === 'week' 
      ? ['Dia', 'Ordens Enviadas', 'Ordens Aprovadas']
      : ['Semana', 'Ordens Enviadas', 'Ordens Aprovadas'];
    const ordersData = [
      ordersHeaders,
      ...data.chartData.map(item => [
        item.day || item.week || '',
        item.ordens,
        item.aprovadas,
      ]),
    ];
    const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Ordens por Período');

    // Categories sheet
    if (data.categoryData.length > 0) {
      const categoryHeaders = ['Categoria', 'Quantidade'];
      const categorySheetData = [
        categoryHeaders,
        ...data.categoryData.map(cat => [cat.name, cat.value]),
      ];
      const categorySheet = XLSX.utils.aoa_to_sheet(categorySheetData);
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categorias');
    }

    // Inspectors sheet
    if (data.inspectorData.length > 0) {
      const inspectorHeaders = ['Código', 'Nome', 'Total Ordens', 'Aprovadas', 'Taxa Aprovação'];
      const inspectorSheetData = [
        inspectorHeaders,
        ...data.inspectorData.map(insp => [
          insp.code,
          insp.name,
          insp.ordens,
          insp.aprovadas,
          insp.ordens > 0 ? `${((insp.aprovadas / insp.ordens) * 100).toFixed(0)}%` : '0%',
        ]),
      ];
      const inspectorSheet = XLSX.utils.aoa_to_sheet(inspectorSheetData);
      XLSX.utils.book_append_sheet(workbook, inspectorSheet, 'Inspetores');
    }

    // Download
    XLSX.writeFile(workbook, `desempenho_${dateStr}.xlsx`);
  };

  const exportToPDF = (data: ExportData) => {
    const doc = new jsPDF();
    const periodLabel = data.period === 'week' ? 'Semana' : 'Mês';
    const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Desempenho', 105, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodLabel} | Gerado em: ${dateStr}`, 105, yPosition, { align: 'center' });
    
    yPosition += 15;

    // Metrics summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo', 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Ordens', String(data.metrics.totalOrders)],
        ['Taxa de Aprovação', `${data.metrics.approvalRate.toFixed(0)}%`],
        ['Valor Estimado', `$ ${data.metrics.estimatedValue.toFixed(2)}`],
        ['Média Diária', data.metrics.dailyAverage.toFixed(1)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Orders by period
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ordens por ${data.period === 'week' ? 'Dia' : 'Semana'}`, 14, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [[data.period === 'week' ? 'Dia' : 'Semana', 'Enviadas', 'Aprovadas']],
      body: data.chartData.map(item => [
        item.day || item.week || '',
        String(item.ordens),
        String(item.aprovadas),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Categories (if fits on page)
    if (data.categoryData.length > 0 && yPosition < 220) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Distribuição por Categoria', 14, yPosition);
      yPosition += 8;

      autoTable(doc, {
        startY: yPosition,
        head: [['Categoria', 'Quantidade']],
        body: data.categoryData.map(cat => [cat.name, String(cat.value)]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Inspectors (new page if needed)
    if (data.inspectorData.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Ordens por Inspetor', 14, yPosition);
      yPosition += 8;

      autoTable(doc, {
        startY: yPosition,
        head: [['Código', 'Nome', 'Total', 'Aprovadas', 'Taxa']],
        body: data.inspectorData.map(insp => [
          insp.code,
          insp.name,
          String(insp.ordens),
          String(insp.aprovadas),
          insp.ordens > 0 ? `${((insp.aprovadas / insp.ordens) * 100).toFixed(0)}%` : '0%',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
      });
    }

    // Download
    const fileName = `desempenho_${format(new Date(), 'dd-MM-yyyy')}.pdf`;
    doc.save(fileName);
  };

  return {
    exportToExcel,
    exportToPDF,
  };
}
