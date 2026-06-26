import { createId, isHttpUrl, nowIso } from '../lib/utils.js';

export const INVENTORY_SOURCE_TYPES = {
  XML_FEED_URL: 'xml_feed_url',
  WEBSITE_INVENTORY_URL: 'website_inventory_url',
  CSV_UPLOAD: 'csv_upload'
};

export const INVENTORY_SOURCE_FORMATS = {
  GENERIC_XML_V1: 'generic_xml_v1',
  FIRECRAWL_STRUCTURED_V1: 'firecrawl_structured_v1',
  GENERIC_CSV_V1: 'generic_csv_v1'
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

  const requiresUrl = payload.type !== INVENTORY_SOURCE_TYPES.CSV_UPLOAD;
  if (requiresUrl && !isHttpUrl(payload.sourceUrl)) {
    throw new Error('sourceUrl must be a valid http or https URL');
  }

  if (!requiresUrl && payload.sourceUrl) {
    throw new Error('CSV uploads must not include sourceUrl');
  }

  const formatByType = {
    [INVENTORY_SOURCE_TYPES.XML_FEED_URL]: INVENTORY_SOURCE_FORMATS.GENERIC_XML_V1,
    [INVENTORY_SOURCE_TYPES.WEBSITE_INVENTORY_URL]: INVENTORY_SOURCE_FORMATS.FIRECRAWL_STRUCTURED_V1,
    [INVENTORY_SOURCE_TYPES.CSV_UPLOAD]: INVENTORY_SOURCE_FORMATS.GENERIC_CSV_V1
  };
  if (formatByType[payload.type] !== payload.format) {
    throw new Error(`Unsupported format '${payload.format}' for source type '${payload.type}'`);
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
    sourceUrl: payload.sourceUrl ?? null,
    sourceConfig: payload.sourceConfig ?? {},
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
