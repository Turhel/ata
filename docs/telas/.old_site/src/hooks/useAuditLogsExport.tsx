import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLogExport {
  id: string;
  created_at: string | null;
  user_name?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: unknown;
  ip_address: string | null;
}

const actionLabels: Record<string, string> = {
  create: 'Criação',
  insert: 'Inserção',
  update: 'Atualização',
  delete: 'Exclusão',
  approve: 'Aprovação',
  reject: 'Rejeição',
  login: 'Login',
  logout: 'Logout',
  status_change: 'Mudança de Status',
};

const resourceLabels: Record<string, string> = {
  order: 'Ordem',
  orders: 'Ordens',
  user: 'Usuário',
  users: 'Usuários',
  inspector: 'Inspetor',
  inspectors: 'Inspetores',
  inspectors_directory: 'Inspetores',
  pricing: 'Preço',
  order_pricing: 'Preços',
  invitation: 'Convite',
  invitation_codes: 'Convites',
  notification: 'Notificação',
  notifications: 'Notificações',
  work_type: 'Tipo de Trabalho',
  work_types: 'Tipos de Trabalho',
  team_assignment: 'Atribuição de Equipe',
  team_assignments: 'Atribuições',
  profile: 'Perfil',
  profiles: 'Perfis',
  payment: 'Pagamento',
  payment_records: 'Pagamentos',
  payment_batches: 'Pagamentos',
  payment_batch_items: 'Itens de Pagamento',
  order_scope_summaries: 'Resumos de Escopo',
};

async function loadXlsx() {
  const xlsxModule: any = await import('xlsx');
  const XLSX: any = xlsxModule?.utils ? xlsxModule : xlsxModule?.default ?? xlsxModule;
  return { XLSX };
}

async function loadPdf() {
  const [{ default: JsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable: any = autoTableModule?.default ?? autoTableModule;
  return { JsPDF, autoTable };
}

export function useAuditLogsExport() {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getActionLabel = (action: string) => {
    return actionLabels[action.toLowerCase()] || action;
  };

  const getResourceLabel = (resourceType: string) => {
    return resourceLabels[resourceType.toLowerCase()] || resourceType;
  };

  const formatDetails = (details: unknown) => {
    if (!details || typeof details !== 'object') return '-';
    try {
      return JSON.stringify(details);
    } catch {
      return '-';
    }
  };

  const exportToExcel = async (
    logs: AuditLogExport[],
    stats: { total: number; actions: Record<string, number>; resources: Record<string, number> },
  ) => {
    const { XLSX } = await loadXlsx();
    const workbook = XLSX.utils.book_new();
    const dateStr = format(new Date(), 'dd-MM-yyyy', { locale: ptBR });

    // Summary sheet
    const summaryData = [
      ['Relatório de Logs de Auditoria', ''],
      ['Data de Geração', format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })],
      ['Total de Registros', stats.total],
      ['', ''],
      ['Ações', 'Quantidade'],
      ...Object.entries(stats.actions).map(([action, count]) => [getActionLabel(action), count]),
      ['', ''],
      ['Recursos', 'Quantidade'],
      ...Object.entries(stats.resources).map(([resource, count]) => [getResourceLabel(resource), count]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    // Logs sheet
    const logsHeaders = ['Data/Hora', 'Usuário', 'Email', 'Ação', 'Recurso', 'ID Recurso', 'Detalhes', 'IP'];
    const logsData = [
      logsHeaders,
      ...logs.map(log => [
        formatDate(log.created_at),
        log.user_name || 'Desconhecido',
        log.user_email || '-',
        getActionLabel(log.action),
        getResourceLabel(log.resource_type),
        log.resource_id || '-',
        formatDetails(log.details),
        log.ip_address || '-',
      ]),
    ];
    const logsSheet = XLSX.utils.aoa_to_sheet(logsData);
    
    // Set column widths
    logsSheet['!cols'] = [
      { wch: 18 }, // Data/Hora
      { wch: 20 }, // Usuário
      { wch: 25 }, // Email
      { wch: 15 }, // Ação
      { wch: 18 }, // Recurso
      { wch: 15 }, // ID Recurso
      { wch: 40 }, // Detalhes
      { wch: 15 }, // IP
    ];
    
    XLSX.utils.book_append_sheet(workbook, logsSheet, 'Logs');

    // Download
    XLSX.writeFile(workbook, `logs_auditoria_${dateStr}.xlsx`);
  };

  const exportToPDF = async (logs: AuditLogExport[], stats: { total: number; actions: Record<string, number>; resources: Record<string, number> }) => {
    const { JsPDF, autoTable } = await loadPdf();
    const doc = new JsPDF('landscape');
    const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Logs de Auditoria', 148.5, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${dateStr} | Total de Registros: ${stats.total}`, 148.5, yPosition, { align: 'center' });
    
    yPosition += 15;

    // Stats summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo por Ação', 14, yPosition);
    
    const actionStats = Object.entries(stats.actions).map(([action, count]) => [getActionLabel(action), String(count)]);
    
    autoTable(doc, {
      startY: yPosition + 5,
      head: [['Ação', 'Quantidade']],
      body: actionStats,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
      tableWidth: 80,
    });

    // Resource stats on the right
    doc.text('Resumo por Recurso', 120, yPosition);
    
    const resourceStats = Object.entries(stats.resources).map(([resource, count]) => [getResourceLabel(resource), String(count)]);
    
    autoTable(doc, {
      startY: yPosition + 5,
      head: [['Recurso', 'Quantidade']],
      body: resourceStats,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 120 },
      tableWidth: 80,
    });

    // New page for logs
    doc.addPage('landscape');
    yPosition = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes dos Logs', 14, yPosition);
    yPosition += 8;

    // Logs table
    autoTable(doc, {
      startY: yPosition,
      head: [['Data/Hora', 'Usuário', 'Ação', 'Recurso', 'Detalhes', 'IP']],
      body: logs.slice(0, 100).map(log => [
        formatDate(log.created_at),
        log.user_name || 'Desconhecido',
        getActionLabel(log.action),
        getResourceLabel(log.resource_type),
        formatDetails(log.details).substring(0, 50) + (formatDetails(log.details).length > 50 ? '...' : ''),
        log.ip_address || '-',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 80 },
        5: { cellWidth: 25 },
      },
    });

    // Note if truncated
    if (logs.length > 100) {
      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(`* Exibindo 100 de ${logs.length} registros. Para ver todos, exporte em Excel.`, 14, finalY + 10);
    }

    // Download
    const fileName = `logs_auditoria_${format(new Date(), 'dd-MM-yyyy')}.pdf`;
    doc.save(fileName);
  };

  return {
    exportToExcel,
    exportToPDF,
  };
}
