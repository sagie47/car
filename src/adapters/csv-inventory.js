const HEADER_ALIASES = {
  vin: ['vin', 'vehicle vin'],
  stockNumber: ['stock', 'stock number', 'stock #', 'stocknumber'],
  year: ['year'],
  make: ['make'],
  model: ['model'],
  trim: ['trim'],
  price: ['price', 'sale price', 'internet price'],
  mileage: ['mileage', 'miles', 'odometer'],
  description: ['description', 'comments'],
  photoUrls: ['photo urls', 'photos', 'images', 'image urls'],
  vdpUrl: ['vdp url', 'vehicle url', 'detail url', 'url'],
  status: ['status', 'vehicle status'],
  bodyStyle: ['body style', 'body'],
  exteriorColor: ['exterior color', 'color'],
  transmission: ['transmission'],
  drivetrain: ['drivetrain', 'drive train']
};

function parseRows(csvText) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const next = csvText[index + 1];

    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function findColumn(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(header));
}

function readValue(row, headers, field) {
  const column = findColumn(headers, HEADER_ALIASES[field]);
  return column >= 0 ? row[column] ?? '' : '';
}

function parseNumber(value) {
  if (!value) return null;
  const numeric = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

export function parseCsvInventory(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()) {
    throw new Error('CSV upload is empty');
  }

  const rows = parseRows(csvText);
  if (rows.length < 2) {
    throw new Error('CSV upload must include a header row and at least one vehicle');
  }

  const headers = rows[0].map(normalizeHeader);
  const hasYear = findColumn(headers, HEADER_ALIASES.year) >= 0;
  const hasMake = findColumn(headers, HEADER_ALIASES.make) >= 0;
  if (!hasYear || !hasMake) {
    throw new Error('CSV upload must include year and make columns');
  }

  return rows.slice(1).map((row, index) => {
    const photoUrls = readValue(row, headers, 'photoUrls')
      .split(/[|;\n]/)
      .map((url) => url.trim())
      .filter(Boolean);

    return {
      vin: readValue(row, headers, 'vin'),
      stockNumber: readValue(row, headers, 'stockNumber'),
      year: parseNumber(readValue(row, headers, 'year')),
      make: readValue(row, headers, 'make'),
      model: readValue(row, headers, 'model'),
      trim: readValue(row, headers, 'trim'),
      price: parseNumber(readValue(row, headers, 'price')),
      mileage: parseNumber(readValue(row, headers, 'mileage')),
      description: readValue(row, headers, 'description'),
      photoUrls,
      vdpUrl: readValue(row, headers, 'vdpUrl'),
      status: readValue(row, headers, 'status') || 'in_stock',
      bodyStyle: readValue(row, headers, 'bodyStyle'),
      exteriorColor: readValue(row, headers, 'exteriorColor'),
      transmission: readValue(row, headers, 'transmission'),
      drivetrain: readValue(row, headers, 'drivetrain'),
      rawSource: {
        source: 'csv_upload',
        row: index + 2,
        headers,
        values: row
      }
    };
  });
}
