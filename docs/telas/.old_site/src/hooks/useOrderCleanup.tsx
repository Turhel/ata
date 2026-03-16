import { useState } from 'react';
import { useAuth } from './useAuth';
import { subMonths } from 'date-fns';

interface ArchiveStats {
  archivedOrders: number;
  readyForDeletion: number;
  oldPoolOrders: number;
}

export function useOrderCleanup() {
  useAuth();
  const [isLoading] = useState(false);
  const isAvailable = false;

  const twoMonthsAgo = subMonths(new Date(), 2);
  const fourMonthsAgo = subMonths(new Date(), 4);

  const noop = async () => {};

  return {
    archivedOrders: [],
    cleanupBatches: [],
    cleanupHistory: [],
    stats: { archivedOrders: 0, readyForDeletion: 0, oldPoolOrders: 0 } as ArchiveStats,
    isAvailable,
    isLoading,
    refetch: noop,
    softDeleteOrder: noop,
    restoreOrder: noop,
    createCleanupBatch: async () => "",
    downloadBackupCSV: noop,
    hardDeleteOrders: noop,
    getOrdersReadyForDeletion: () => [],
    twoMonthsAgo,
    fourMonthsAgo,
  };
}
