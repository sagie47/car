import { pickFirst, stableHash, normalizeString, toNumber, uniqueStrings } from '../lib/utils.js';

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase().replace(/\s+/g, '_');
}

function normalizePriceHistory(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => ({
      amount: toNumber(entry?.amount ?? entry?.price),
      changedAt: normalizeString(entry?.changedAt ?? entry?.date) || null
    }))
    .filter((entry) => entry.amount !== null);
}

export function buildVehicleNaturalKey({ rooftopId, vin, stockNumber, raw }) {
  if (vin) {
    return `${rooftopId}:vin:${vin}`;
  }

  if (stockNumber) {
    return `${rooftopId}:stock:${stockNumber.toUpperCase()}`;
  }

  return `${rooftopId}:row:${stableHash(raw)}`;
}

export function normalizeIncomingVehicle(rawVehicle, context = {}) {
  const vin = normalizeString(pickFirst(rawVehicle.vin, rawVehicle.VIN)).toUpperCase();
  const stockNumber = normalizeString(
    pickFirst(rawVehicle.stockNumber, rawVehicle.stock_number, rawVehicle.stock, rawVehicle.stockNo)
  );
  const year = toNumber(pickFirst(rawVehicle.year, rawVehicle.Year));
  const make = normalizeString(pickFirst(rawVehicle.make, rawVehicle.Make));
  const model = normalizeString(pickFirst(rawVehicle.model, rawVehicle.Model));
  const trim = normalizeString(pickFirst(rawVehicle.trim, rawVehicle.Trim));
  const condition = normalizeString(pickFirst(rawVehicle.condition, rawVehicle.Condition));
  const mileage = toNumber(pickFirst(rawVehicle.mileage, rawVehicle.odometer, rawVehicle.Mileage));
  const price = toNumber(pickFirst(rawVehicle.price, rawVehicle.internetPrice, rawVehicle.Price));
  const bodyStyle = normalizeString(
    pickFirst(rawVehicle.bodyStyle, rawVehicle.body_style, rawVehicle.body, rawVehicle.BodyStyle)
  );
  const exteriorColor = normalizeString(
    pickFirst(rawVehicle.exteriorColor, rawVehicle.exterior_color, rawVehicle.color, rawVehicle.Color)
  );
  const interiorColor = normalizeString(
    pickFirst(rawVehicle.interiorColor, rawVehicle.interior_color, rawVehicle.interior)
  );
  const photoUrls = uniqueStrings(
    pickFirst(rawVehicle.photoUrls, rawVehicle.photos, rawVehicle.images, rawVehicle.photo_urls) ?? []
  );
  const status = normalizeStatus(
    pickFirst(rawVehicle.status, rawVehicle.vehicleStatus, rawVehicle.availability, rawVehicle.inventoryStatus)
  );
  const vdpUrl = normalizeString(pickFirst(rawVehicle.vdpUrl, rawVehicle.vdp_url, rawVehicle.url));
  const salespersonAssignment = normalizeString(
    pickFirst(rawVehicle.salespersonAssignment, rawVehicle.salesperson, rawVehicle.repName)
  );
  const carfaxUrl = normalizeString(pickFirst(rawVehicle.carfaxUrl, rawVehicle.autoCheckUrl));
  const optionsList = Array.isArray(rawVehicle.optionsList)
    ? rawVehicle.optionsList.map((option) => normalizeString(option)).filter(Boolean)
    : [];
  const drivetrain = normalizeString(rawVehicle.drivetrain);
  const transmission = normalizeString(rawVehicle.transmission);
  const fuelType = normalizeString(pickFirst(rawVehicle.fuelType, rawVehicle.fuel_type));
  const engine = normalizeString(rawVehicle.engine);
  const daysInInventory = toNumber(
    pickFirst(rawVehicle.daysInInventory, rawVehicle.days_in_inventory, rawVehicle.ageInDays)
  );
  const featured = Boolean(rawVehicle.featured);
  const rooftopId = context.rooftopId;
  const dealerId = context.dealerId;

  return {
    dealerId,
    rooftopId,
    vin,
    stockNumber,
    year,
    make,
    model,
    trim,
    condition,
    mileage,
    price,
    bodyStyle,
    exteriorColor,
    interiorColor,
    photoUrls,
    status,
    vdpUrl,
    salespersonAssignment,
    carfaxUrl,
    optionsList,
    drivetrain,
    transmission,
    fuelType,
    engine,
    daysInInventory,
    featured,
    priceHistory: normalizePriceHistory(rawVehicle.priceHistory),
    rawSource: rawVehicle,
    naturalKey: buildVehicleNaturalKey({
      rooftopId,
      vin,
      stockNumber,
      raw: rawVehicle
    })
  };
}
