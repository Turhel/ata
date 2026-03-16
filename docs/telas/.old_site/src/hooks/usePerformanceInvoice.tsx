import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

// --- Interfaces ---
export interface CategoryBreakdown {
  name: string;
  count: number;
  unitValue: number;
  totalValue: number;
}

export interface InspectorBreakdown {
  code: string;
  name: string;
  orders: number;
  approved: number;
  value: number;
}

export interface ChartDataItem {
  day?: string;
  week?: string;
  ordens: number;
  aprovadas: number;
}

export interface InvoiceData {
  assistantName: string;
  // Mantemos 'string' para aceitar 'week', 'month', 'custom' sem erro
  period: string;
  periodStart: Date;
  periodEnd: Date;
  totalOrders: number;
  approvedOrders: number;
  approvalRate: number;
  categoryBreakdown: CategoryBreakdown[];
  inspectorBreakdown: InspectorBreakdown[];
  totalValue: number;
  chartData?: ChartDataItem[];
  dailyAverage?: number;
}

export function usePerformanceInvoice() {
  const generateInvoice = (data: InvoiceData) => {
    const doc = new jsPDF();

    const colors = {
      primary: [7, 89, 133] as [number, number, number],
      secondary: [248, 250, 252] as [number, number, number],
      textGray: [100, 116, 139] as [number, number, number],
      textDark: [15, 23, 42] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Funções auxiliares para facilitar
    const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
    const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
    const setLine = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

    // --- 1. CABEÇALHO ---
    setText(colors.primary);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ATA MANAGEMENT", margin, 25);

    setText(colors.textGray);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Inspection Services Portal", margin, 31);

    setText(colors.primary);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth - margin, 25, { align: "right" });

    // Gerar Número
    const initials = (data.assistantName || "User")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    const invoiceNum = `${initials}-${format(new Date(), "yyMM")}-${randomId}`;
    const issueDate = format(new Date(), "MMM dd, yyyy", { locale: enUS });

    const detailsY = 35;
    const rightColX = pageWidth - margin;
    const labelX = rightColX - 40;

    setText(colors.textDark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Invoice #:`, labelX, detailsY, { align: "left" });
    doc.text(`Date:`, labelX, detailsY + 5, { align: "left" });
    doc.text(`Due Date:`, labelX, detailsY + 10, { align: "left" });

    doc.setFont("helvetica", "normal");
    doc.text(invoiceNum, rightColX, detailsY, { align: "right" });
    doc.text(issueDate, rightColX, detailsY + 5, { align: "right" });
    doc.text("Upon Receipt", rightColX, detailsY + 10, { align: "right" });

    setLine(colors.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, 52, pageWidth - margin, 52);

    // --- 2. DE / PARA ---
    let yPos = 65;

    setText(colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("FROM (PROVIDER):", margin, yPos);

    setText(colors.textDark);
    doc.setFont("helvetica", "bold");
    doc.text(data.assistantName || "Assistant Name", margin, yPos + 6);

    setText(colors.textGray);
    doc.setFont("helvetica", "normal");
    doc.text("Processing Team", margin, yPos + 11);

    const col2X = pageWidth / 2 + 10;
    setText(colors.primary);
    doc.setFont("helvetica", "bold");
    doc.text("TO (CLIENT):", col2X, yPos);

    setText(colors.textDark);
    doc.setFont("helvetica", "normal");
    doc.text("ATA Management", col2X, yPos + 6);
    setText(colors.textGray);
    doc.text("Finance Department", col2X, yPos + 11);
    doc.text("Accounts Payable", col2X, yPos + 16);
    doc.text("orders@ataemailexample.com", col2X, yPos + 21);

    // --- 3. PERÍODO ---
    yPos += 35;
    setFill(colors.secondary);
    setLine(colors.primary);
    doc.setLineWidth(0.1);
    doc.rect(margin, yPos, pageWidth - margin * 2, 14, "FD");

    const periodStartStr = format(data.periodStart, "MMM do", { locale: enUS });
    const periodEndStr = format(data.periodEnd, "MMM do, yyyy", { locale: enUS });

    setText(colors.textDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Billing Period: ${periodStartStr} to ${periodEndStr}`, pageWidth / 2, yPos + 9, { align: "center" });

    // --- 4. TABELA PRINCIPAL ---
    yPos += 25;
    const tableBody = data.categoryBreakdown.map((cat) => [
      `Services - ${cat.name}`,
      cat.count.toString(),
      `$ ${cat.unitValue.toFixed(2)}`,
      `$ ${cat.totalValue.toFixed(2)}`,
    ]);

    // CORREÇÃO CRÍTICA: Chamando autoTable como função
    autoTable(doc, {
      startY: yPos,
      head: [["SERVICE DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"]],
      body: tableBody,
      theme: "striped",
      headStyles: {
        fillColor: colors.primary,
        textColor: 255,
        fontStyle: "bold",
        halign: "left",
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right" },
      },
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 4,
        textColor: colors.textDark,
      },
      alternateRowStyles: { fillColor: colors.secondary },
    });

    // --- 5. TOTAIS ---
    // Acessa a posição final da tabela
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    setText(colors.textDark);

    doc.text("Subtotal:", 155, finalY, { align: "right" });
    doc.text(`$ ${data.totalValue.toFixed(2)}`, pageWidth - margin, finalY, { align: "right" });

    doc.text("Taxes (0%):", 155, finalY + 5, { align: "right" });
    doc.text("$ 0.00", pageWidth - margin, finalY + 5, { align: "right" });

    doc.setFontSize(14);
    setText(colors.primary);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL DUE:", 155, finalY + 15, { align: "right" });
    doc.text(`$ ${data.totalValue.toFixed(2)}`, pageWidth - margin, finalY + 15, { align: "right" });

    // --- 6. SUMÁRIO (TABELA PEQUENA) ---
    const metricsY = finalY + 30;
    doc.setFontSize(10);
    setText(colors.primary);
    doc.text("Productivity Summary:", margin, metricsY);

    autoTable(doc, {
      startY: metricsY + 3,
      head: [["Total Orders Processed", "Approval Rate", "Daily Average"]],
      body: [
        [
          `${data.totalOrders} Orders`,
          `${data.approvalRate.toFixed(0)}%`,
          `${(data.dailyAverage || 0).toFixed(1)} / day`,
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: colors.secondary,
        textColor: colors.textDark,
        fontStyle: "bold",
        halign: "center",
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
      },
      bodyStyles: {
        halign: "center",
        textColor: colors.textDark,
      },
      tableWidth: "wrap",
      margin: { left: margin },
    });

    // --- RODAPÉ ---
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    setText(colors.textGray);
    doc.setFont("helvetica", "normal");

    const footerText =
      "Document automatically generated by ATA Management Portal.\nThis invoice serves as a formal payment request for the specified period.";
    doc.text(footerText, pageWidth / 2, footerY, { align: "center" });

    // --- PÁGINA 2 (Detalhes) ---
    if (data.chartData && data.chartData.length > 0) {
      doc.addPage();

      setFill(colors.secondary);
      doc.rect(0, 0, pageWidth, 30, "F");
      doc.setFontSize(14);
      setText(colors.textDark);
      doc.setFont("helvetica", "bold");
      doc.text("DETAILED ACTIVITY REPORT", margin, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Daily Breakdown", margin, 45);

      const dailyBody = data.chartData.map((item) => [
        item.day || item.week || "-",
        item.ordens.toString(),
        item.aprovadas.toString(),
        item.ordens > 0 ? `${((item.aprovadas / item.ordens) * 100).toFixed(0)}%` : "0%",
      ]);

      autoTable(doc, {
        startY: 50,
        head: [["Date / Period", "Orders Sent", "Approved", "Efficiency"]],
        body: dailyBody,
        theme: "striped",
        headStyles: { fillColor: colors.primary },
      });

      doc.setFontSize(8);
      setText(colors.textGray);
      doc.text("ATA Management Portal - Detailed Report", margin, pageHeight - 10);
    }

    doc.save(`Invoice_${initials}_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  return { generateInvoice };
}
