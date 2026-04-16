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

export async function getAppContext(): Promise<AppContext> {
  const dealers = await listDealers();
  const activeDealer = dealers[0] ?? null;

  if (!activeDealer) {
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

  const rooftops = await listRooftops(activeDealer.id);
  const activeRooftop = rooftops[0] ?? null;

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
