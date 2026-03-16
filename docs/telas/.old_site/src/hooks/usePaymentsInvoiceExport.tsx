import { format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";

export type PaymentsInvoiceBatch = {
  id: string;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  status?: string | null;
};

export type PaymentsInvoiceItem = {
  external_id?: string | null;
  work_type?: string | null;
  category?: string | null;
  amount?: number | null;
};

export type PaymentsInvoiceData = {
  assistantName: string;
  assistantEmail?: string | null;
  batch: PaymentsInvoiceBatch;
  items: PaymentsInvoiceItem[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

function getInitials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function safeFileToken(v: string) {
  return String(v || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "_")
    .replace(/^_+|_+$/g, "");
}

async function loadJsPdf() {
  const [{ default: JsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable: any = (autoTableModule as any).default ?? autoTableModule;
  return { JsPDF, autoTable };
}

async function loadXlsx() {
  const xlsxModule: any = await import("xlsx");
  const XLSX: any = xlsxModule?.utils ? xlsxModule : xlsxModule?.default ?? xlsxModule;
  return { XLSX };
}

export function usePaymentsInvoiceExport() {
  const exportToPDF = async (data: PaymentsInvoiceData) => {
    const { JsPDF, autoTable } = await loadJsPdf();

    const assistantName = data.assistantName || "Assistant";
    const assistantEmail = data.assistantEmail ?? null;

    const periodStart = parseISO(data.batch.period_start);
    const periodEnd = parseISO(data.batch.period_end);

    const invoiceNumber = `PAY-${getInitials(assistantName)}-${format(periodStart, "yyMMdd")}-${String(
      data.batch.id || "",
    )
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 4)
      .toUpperCase()}`;

    const issueDate = format(new Date(), "MMM dd, yyyy", { locale: enUS });

    const doc = new JsPDF();

    const colors = {
      primary: [7, 89, 133] as [number, number, number],
      secondary: [248, 250, 252] as [number, number, number],
      textGray: [100, 116, 139] as [number, number, number],
      textDark: [15, 23, 42] as [number, number, number],
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;

    const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
    const setLine = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
    const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);

    // Header
    setText(colors.primary);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ATA MANAGEMENT", margin, 22);

    setText(colors.textGray);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Inspection Services Portal", margin, 28);

    setText(colors.primary);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth - margin, 22, { align: "right" });

    // Invoice meta (right)
    const metaY = 36;
    const metaLabelX = pageWidth - margin - 42;
    const metaValueX = pageWidth - margin;

    setText(colors.textDark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice #:", metaLabelX, metaY);
    doc.text("Date:", metaLabelX, metaY + 5);
    doc.text("Batch:", metaLabelX, metaY + 10);

    doc.setFont("helvetica", "normal");
    doc.text(invoiceNumber, metaValueX, metaY, { align: "right" });
    doc.text(issueDate, metaValueX, metaY + 5, { align: "right" });
    doc.text(String(data.batch.id || "").slice(0, 8), metaValueX, metaY + 10, { align: "right" });

    setLine(colors.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, 52, pageWidth - margin, 52);

    // From / To blocks
    let yPos = 64;

    setText(colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("FROM (PROVIDER):", margin, yPos);

    setText(colors.textDark);
    doc.setFont("helvetica", "bold");
    doc.text(assistantName, margin, yPos + 6);

    setText(colors.textGray);
    doc.setFont("helvetica", "normal");
    if (assistantEmail) doc.text(assistantEmail, margin, yPos + 11);
    doc.text("Assistant", margin, yPos + 16);

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

    // Billing period pill
    yPos += 30;
    setFill(colors.secondary);
    setLine(colors.primary);
    doc.setLineWidth(0.1);
    doc.rect(margin, yPos, pageWidth - margin * 2, 14, "FD");

    const periodStartStr = format(periodStart, "MMM do", { locale: enUS });
    const periodEndStr = format(periodEnd, "MMM do, yyyy", { locale: enUS });

    setText(colors.textDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Billing Period: ${periodStartStr} to ${periodEndStr}`, pageWidth / 2, yPos + 9, { align: "center" });

    const normalizedItems = (data.items || []).map((i) => ({
      external_id: i.external_id ?? "-",
      work_type: i.work_type ?? "-",
      category: (i.category == null || String(i.category).trim() === "" ? "Uncategorized" : String(i.category).trim())
        .replace(/\s+/g, " "),
      amount: Number(i.amount ?? 0) || 0,
    }));

    const totalOrders = normalizedItems.length;
    const totalValue = normalizedItems.reduce((acc, i) => acc + i.amount, 0);

    const categoryTotals = new Map<string, { count: number; total: number }>();
    normalizedItems.forEach((item) => {
      const current = categoryTotals.get(item.category) ?? { count: 0, total: 0 };
      current.count += 1;
      current.total += item.amount;
      categoryTotals.set(item.category, current);
    });

    const categoryRows = Array.from(categoryTotals.entries())
      .map(([category, v]) => ({ category, count: v.count, total: v.total }))
      .sort((a, b) => b.total - a.total);

    setText(colors.textGray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Summary by category (full order list available in Excel export).", margin, yPos + 21);
    doc.text(`Orders: ${totalOrders}`, pageWidth - margin, yPos + 21, { align: "right" });

    const tableBody = categoryRows.map((row) => [row.category, String(row.count), formatCurrency(row.total)]);

    autoTable(doc, {
      startY: yPos + 26,
      head: [["CATEGORY", "ORDERS", "AMOUNT"]],
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
        1: { cellWidth: 24, halign: "right" },
        2: { cellWidth: 36, halign: "right" },
      },
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 4,
        textColor: colors.textDark,
      },
      alternateRowStyles: { fillColor: colors.secondary },
    });

    let finalY = ((doc as any).lastAutoTable?.finalY ?? yPos + 26) + 10;
    if (finalY > pageHeight - 35) {
      doc.addPage();
      finalY = margin;
    }

    // Totals
    setText(colors.textDark);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Subtotal:", pageWidth - margin - 40, finalY, { align: "right" });
    doc.text(formatCurrency(totalValue), pageWidth - margin, finalY, { align: "right" });

    doc.text("Taxes (0%):", pageWidth - margin - 40, finalY + 5, { align: "right" });
    doc.text("$0.00", pageWidth - margin, finalY + 5, { align: "right" });

    setText(colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("TOTAL DUE:", pageWidth - margin - 40, finalY + 15, { align: "right" });
    doc.text(formatCurrency(totalValue), pageWidth - margin, finalY + 15, { align: "right" });

    // Footer
    const footerY = pageHeight - 12;
    doc.setFontSize(8);
    setText(colors.textGray);
    doc.setFont("helvetica", "normal");
    doc.text("Document generated by ATA Management Portal.", pageWidth / 2, footerY, { align: "center" });

    const filename = `Invoice_${safeFileToken(getInitials(assistantName))}_${safeFileToken(
      data.batch.period_start,
    )}_${safeFileToken(data.batch.period_end)}.pdf`;
    doc.save(filename);
  };

  const exportToExcel = async (data: PaymentsInvoiceData) => {
    const { XLSX } = await loadXlsx();

    const assistantName = data.assistantName || "Assistant";
    const assistantEmail = data.assistantEmail ?? null;
    const periodStart = data.batch.period_start;
    const periodEnd = data.batch.period_end;

    const items = (data.items || []).map((i) => ({
      Order: i.external_id ?? "",
      Type: i.work_type ?? "",
      Category: i.category ?? "",
      Amount: Number(i.amount ?? 0) || 0,
    }));

    const totalValue = items.reduce((acc, i) => acc + (Number(i.Amount) || 0), 0);

    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["Invoice (Payments)", ""],
      ["Generated At", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
      ["Assistant", assistantName],
      ["Assistant Email", assistantEmail ?? ""],
      ["Batch ID", data.batch.id],
      ["Status", data.batch.status ?? ""],
      ["Period Start", periodStart],
      ["Period End", periodEnd],
      ["Orders", items.length],
      ["Total", totalValue],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const itemsSheet = XLSX.utils.json_to_sheet(items);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, "Items");

    const filename = `Invoice_${safeFileToken(getInitials(assistantName))}_${safeFileToken(periodStart)}_${safeFileToken(
      periodEnd,
    )}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  return { exportToPDF, exportToExcel };
}
