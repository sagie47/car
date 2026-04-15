import { createId, isHttpUrl, nowIso } from '../lib/utils.js';

export const INVENTORY_SOURCE_TYPES = {
  XML_FEED_URL: 'xml_feed_url'
};

export const INVENTORY_SOURCE_FORMATS = {
  GENERIC_XML_V1: 'generic_xml_v1'
};

const VALID_TYPES = new Set(Object.values(INVENTORY_SOURCE_TYPES));
const VALID_FORMATS = new Set(Object.values(INVENTORY_SOURCE_FORMATS));

export function validateInventorySourcePayload(payload) {
  if (!payload?.rooftopId) {
    throw new Error('rooftopId is required');
  }

  if (!payload?.name) {
    throw new Error('Inventory source name is required');
  }

  if (!VALID_TYPES.has(payload.type)) {
    throw new Error(`Unsupported inventory source type '${payload?.type ?? ''}'`);
  }

  if (!VALID_FORMATS.has(payload.format)) {
    throw new Error(`Unsupported inventory source format '${payload?.format ?? ''}'`);
  }

  if (!isHttpUrl(payload.sourceUrl)) {
    throw new Error('sourceUrl must be a valid http or https URL');
  }
}

export function createInventorySourceRecord(payload) {
  validateInventorySourcePayload(payload);

  const timestamp = nowIso();

  return {
    id: createId('inventory_source'),
    rooftopId: payload.rooftopId,
    name: payload.name,
    type: payload.type,
    format: payload.format,
    sourceUrl: payload.sourceUrl,
    isActive: payload.isActive ?? true,
    lastSyncedAt: null,
    lastSyncStatus: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function buildSyncRunRecord({ rooftop, inventorySourceId = null, sourceType, sourceName, trigger = 'manual' }) {
  const timestamp = nowIso();

  return {
    id: createId('sync'),
    dealerId: rooftop.dealerId,
    rooftopId: rooftop.id,
    inventorySourceId,
    sourceType,
    sourceName: sourceName ?? null,
    status: 'running',
    trigger,
    startedAt: timestamp,
    completedAt: null,
    rowsReceived: 0,
    rowsImported: 0,
    rowsSkipped: 0,
    duplicateVins: [],
    errors: []
  };
}
