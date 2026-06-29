import {
  getRooftopDashboard,
  listDealers,
  listInventorySources,
  listRooftops,
  listSyncRuns
} from './api';
import type { Dealer, InventorySource, Rooftop, RooftopDashboard, SyncRun } from './types';

export type AppContext = {
  dealers: Dealer[];
  activeDealer: Dealer | null;
  rooftops: Rooftop[];
  activeRooftop: Rooftop | null;
  inventorySources: InventorySource[];
  syncRuns: SyncRun[];
  dashboard: RooftopDashboard | null;
  setupStage: 'dealer' | 'rooftop' | 'inventory-source' | 'sync' | 'ready';
};

function latestSyncForRooftop(syncRuns: SyncRun[]) {
  return syncRuns
    .filter((syncRun) => syncRun.rooftopId)
    .sort((left, right) => {
      const leftTime = new Date(left.completedAt ?? left.startedAt).getTime();
      const rightTime = new Date(right.completedAt ?? right.startedAt).getTime();
      return rightTime - leftTime;
    })[0] ?? null;
}

function newestRooftop(rooftops: Rooftop[]) {
  return [...rooftops].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
}

export async function getAppContext(): Promise<AppContext> {
  const dealers = await listDealers();

  if (!dealers.length) {
    return {
      dealers,
      activeDealer: null,
      rooftops: [],
      activeRooftop: null,
      inventorySources: [],
      syncRuns: [],
      dashboard: null,
      setupStage: 'dealer'
    };
  }

  const [allRooftops, allSyncRuns] = await Promise.all([
    listRooftops(),
    listSyncRuns()
  ]);
  const latestSyncedRooftopId = latestSyncForRooftop(allSyncRuns)?.rooftopId ?? null;
  const activeRooftop = allRooftops.find((rooftop) => rooftop.id === latestSyncedRooftopId) ?? newestRooftop(allRooftops);
  const activeDealer = dealers.find((dealer) => dealer.id === activeRooftop?.dealerId) ?? dealers[0];
  const rooftops = allRooftops.filter((rooftop) => rooftop.dealerId === activeDealer.id);

  if (!activeRooftop) {
    return {
      dealers,
      activeDealer,
      rooftops,
      activeRooftop: null,
      inventorySources: [],
      syncRuns: [],
      dashboard: null,
      setupStage: 'rooftop'
    };
  }

  const [inventorySources, syncRuns, dashboard] = await Promise.all([
    listInventorySources(activeRooftop.id),
    listSyncRuns({ rooftopId: activeRooftop.id }),
    getRooftopDashboard(activeRooftop.id)
  ]);

  if (!inventorySources.length) {
    return {
      dealers,
      activeDealer,
      rooftops,
      activeRooftop,
      inventorySources,
      syncRuns,
      dashboard,
      setupStage: 'inventory-source'
    };
  }

  const hasSuccessfulSync = syncRuns.some((syncRun) => syncRun.status === 'completed' && syncRun.rowsImported > 0);

  return {
    dealers,
    activeDealer,
    rooftops,
    activeRooftop,
    inventorySources,
    syncRuns,
    dashboard,
    setupStage: hasSuccessfulSync ? 'ready' : 'sync'
  };
}
