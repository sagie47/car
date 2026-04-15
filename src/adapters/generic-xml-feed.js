import { XMLParser } from 'fast-xml-parser';
import { arrayify, normalizeString } from '../lib/utils.js';

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false
});

function normalizeKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findKey(record, aliases) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return null;
  }

  const wanted = new Set(aliases.map(normalizeKey));

  return Object.keys(record).find((key) => wanted.has(normalizeKey(key))) ?? null;
}

function readField(record, aliases) {
  const key = findKey(record, aliases);
  return key ? record[key] : null;
}

function looksLikeVehicleRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return false;
  }

  const keys = Object.keys(record).map(normalizeKey);
  const hasIdentity = keys.some((key) => ['vin', 'stocknumber', 'stock', 'stockno'].includes(key));
  const hasDescriptor = keys.some((key) => ['year', 'make', 'model'].includes(key));
  const hasCommerce = keys.some((key) =>
    ['price', 'internetprice', 'status', 'vehiclestatus', 'photos', 'images', 'photourl'].includes(key)
  );

  return (hasIdentity && hasDescriptor) || (hasDescriptor && hasCommerce);
}

function extractVehicleNodes(node, results = []) {
  if (Array.isArray(node)) {
    for (const item of node) {
      extractVehicleNodes(item, results);
    }
    return results;
  }

  if (!node || typeof node !== 'object') {
    return results;
  }

  if (looksLikeVehicleRecord(node)) {
    results.push(node);
    return results;
  }

  for (const [key, value] of Object.entries(node)) {
    const normalized = normalizeKey(key);

    if (normalized === 'vehicle' || normalized === 'item') {
      for (const record of arrayify(value)) {
        if (record && typeof record === 'object') {
          results.push(record);
        }
      }
      continue;
    }

    extractVehicleNodes(value, results);
  }

  return results;
}

function collectStringValues(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringValues(item));
  }

  if (typeof value === 'object') {
    const directUrl = readField(value, ['url', 'loc', 'location', 'href']);
    if (directUrl) {
      return collectStringValues(directUrl);
    }

    return Object.values(value).flatMap((item) => collectStringValues(item));
  }

  return [String(value)];
}

function extractPhotoUrls(record) {
  const photoContainer = readField(record, ['photos', 'images', 'photourls', 'photo_urls']);
  const directPhoto = readField(record, ['photourl', 'photo_url', 'imageurl', 'image_url', 'image']);

  return [...collectStringValues(photoContainer), ...collectStringValues(directPhoto)]
    .map((value) => normalizeString(value))
    .filter(Boolean);
}

function extractOptionsList(record) {
  const optionsContainer = readField(record, ['options', 'optionlist', 'option_list']);
  return collectStringValues(optionsContainer)
    .map((value) => normalizeString(value))
    .filter(Boolean);
}

function normalizeVehicleRecord(record) {
  return {
    vin: readField(record, ['vin']),
    stockNumber: readField(record, ['stocknumber', 'stock_number', 'stock', 'stockno']),
    year: readField(record, ['year']),
    make: readField(record, ['make']),
    model: readField(record, ['model']),
    trim: readField(record, ['trim']),
    condition: readField(record, ['condition']),
    mileage: readField(record, ['mileage', 'odometer', 'miles']),
    price: readField(record, ['price', 'internetprice', 'saleprice']),
    bodyStyle: readField(record, ['bodystyle', 'body_style', 'body']),
    exteriorColor: readField(record, ['exteriorcolor', 'exterior_color', 'color', 'extcolor']),
    interiorColor: readField(record, ['interiorcolor', 'interior_color', 'intcolor']),
    photoUrls: extractPhotoUrls(record),
    status: readField(record, ['status', 'vehiclestatus', 'availability', 'inventorystatus']),
    vdpUrl: readField(record, ['vdpurl', 'vdp_url', 'url', 'vehicleurl']),
    salespersonAssignment: readField(record, ['salespersonassignment', 'salesperson', 'repname']),
    carfaxUrl: readField(record, ['carfaxurl', 'autocheckurl']),
    optionsList: extractOptionsList(record),
    drivetrain: readField(record, ['drivetrain']),
    transmission: readField(record, ['transmission']),
    fuelType: readField(record, ['fueltype', 'fuel_type']),
    engine: readField(record, ['engine']),
    daysInInventory: readField(record, ['daysininventory', 'days_in_inventory', 'ageindays']),
    featured: readField(record, ['featured'])
  };
}

export async function fetchXmlFeed(sourceUrl, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(sourceUrl, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Feed request failed with status ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Feed request timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function parseGenericXmlFeed(xml) {
  let parsed;

  try {
    parsed = XML_PARSER.parse(xml);
  } catch {
    throw new Error('Feed XML could not be parsed');
  }

  const vehicleNodes = extractVehicleNodes(parsed);

  if (!vehicleNodes.length) {
    throw new Error('Feed XML does not match the supported generic_xml_v1 shape');
  }

  const vehicles = vehicleNodes.map(normalizeVehicleRecord);

  if (!vehicles.length) {
    throw new Error('Feed XML does not contain any usable vehicle records');
  }

  return vehicles;
}
