const DEFAULT_ENDPOINT = 'https://api.firecrawl.dev/v1/scrape';
const MAX_DETAIL_PAGES = 100;
const DETAIL_PAGE_CONCURRENCY = 6;
const DEFAULT_SCRAPE_TIMEOUT_MS = 180000;

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function numberFrom(value) {
  const number = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : null;
}

function decodeHtml(value) {
  return normalizeText(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function htmlAttribute(html, pattern) {
  const match = html.match(pattern);
  return match ? decodeHtml(match[1]) : '';
}

function hiddenInputValue(html, name) {
  return htmlAttribute(html, new RegExp(`<input[^>]+name=["']${name}["'][^>]+value=["']([^"']*)`, 'i'));
}

function metaContent(html, property) {
  return htmlAttribute(
    html,
    new RegExp(`<meta\\s+(?:property|name|itemprop)=["']${property}["'][^>]+content=["']([^"']*)`, 'i')
  );
}

function htmlText(value) {
  return decodeHtml(
    normalizeText(value)
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  );
}

function htmlSpecValue(html, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const detailRows = [...html.matchAll(/<div[^>]*vehicle_single_detail[^>]*>([\s\S]*?)<\/div>/gi)];
  for (const row of detailRows) {
    if (!new RegExp(`>${escapedLabel}<\\/span>`, 'i').test(row[1])) continue;
    const values = [...row[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
      .map((match) => htmlText(match[1]))
      .filter(Boolean);
    if (values.length > 1) return values.at(-1) ?? '';
  }

  const labelPattern = new RegExp(`>${escapedLabel}<\\/span>([\\s\\S]{0,900}?)<\\/div>`, 'i');
  const labelMatch = html.match(labelPattern);
  if (!labelMatch) return '';

  const values = [...labelMatch[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => htmlText(match[1]))
    .filter(Boolean);
  return values.at(-1) ?? '';
}

function compactVehicleToken(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function imagesForVehicle(imageUrls, record) {
  const year = compactVehicleToken(record.year);
  const make = compactVehicleToken(record.make);
  const model = compactVehicleToken(record.model);
  if (!year || !make || !model) return imageUrls;

  const vehicleImages = imageUrls.filter((url) => {
    try {
      const path = compactVehicleToken(decodeURIComponent(new URL(url).pathname));
      return path.includes(`${year}${make}${model}`) || (path.includes(`${year}${make}`) && path.includes(model));
    } catch {
      return false;
    }
  });
  return vehicleImages.length ? vehicleImages : imageUrls;
}

function vehicleFromRecord(record, sourceUrl) {
  if (!isRecord(record)) return null;

  const name = normalizeText(record.name || record.title);
  const nameParts = name.match(/\b(19\d{2}|20\d{2})\s+([^\s]+)\s+([^\s]+)/);
  const brand = isRecord(record.brand) ? record.brand.name : record.brand;
  const offers = isRecord(record.offers) ? record.offers : {};
  const images = asArray(record.image || record.images)
    .map((image) => (isRecord(image) ? image.url : image))
    .map(normalizeText)
    .filter((image) => /^https?:\/\//.test(image));
  const vehicle = {
    vin: normalizeText(record.vin || record.vehicleIdentificationNumber),
    stockNumber: normalizeText(record.stockNumber || record.sku),
    year: numberFrom(record.year || record.modelDate || nameParts?.[1]),
    make: normalizeText(record.make || brand || nameParts?.[2]),
    model: normalizeText(record.model || nameParts?.[3]),
    trim: normalizeText(record.trim || record.vehicleConfiguration),
    price: numberFrom(record.price || offers.price),
    mileage: numberFrom(record.mileage || record.odometer || record.mileageFromOdometer),
    description: normalizeText(record.description),
    photoUrls: images,
    vdpUrl: normalizeText(record.url || record['@id'] || sourceUrl),
    status: normalizeText(record.availability || record.status) || 'in_stock',
    bodyStyle: normalizeText(record.bodyType || record.bodyStyle),
    exteriorColor: normalizeText(record.color || record.exteriorColor),
    transmission: normalizeText(record.vehicleTransmission || record.transmission),
    drivetrain: normalizeText(record.driveWheelConfiguration || record.drivetrain),
    rawSource: {
      source: 'firecrawl',
      sourceUrl,
      record
    }
  };

  return vehicle.year && vehicle.make && vehicle.model ? vehicle : null;
}

function hasDetailGradeRecord(record) {
  if (!isRecord(record)) return false;
  const images = asArray(record.image || record.images);
  const offers = isRecord(record.offers) ? record.offers : {};
  return Boolean(
    (record.vin || record.vehicleIdentificationNumber || record.stockNumber || record.sku) &&
      (record.price || offers.price) &&
      images.length
  );
}

function collectVehicleRecords(value, records = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectVehicleRecords(item, records);
    return records;
  }

  if (!isRecord(value)) return records;
  const type = asArray(value['@type']).join(' ').toLowerCase();
  if (type.includes('vehicle') || (value.year && value.make && value.model)) {
    records.push(value);
  }

  for (const child of Object.values(value)) {
    if (isRecord(child) || Array.isArray(child)) collectVehicleRecords(child, records);
  }
  return records;
}

function structuredRecords(document) {
  const records = [];
  collectVehicleRecords(document?.json, records);
  const html = normalizeText(document?.html);
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptPattern.exec(html))) {
    try {
      collectVehicleRecords(JSON.parse(match[1]), records);
    } catch {
      // Invalid JSON-LD is ignored and the importer falls back to CSV rather than guessing.
    }
  }
  const htmlRecord = vehicleRecordFromHtml(html, documentSourceUrl(document, ''));
  if (htmlRecord) records.push(htmlRecord);
  return records;
}

function vehicleRecordFromHtml(html, sourceUrl) {
  if (!html) return null;
  const title = metaContent(html, 'og:title') || htmlAttribute(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = metaContent(html, 'og:description') || metaContent(html, 'description');
  const nameParts = title.match(/\b(19\d{2}|20\d{2})\s+([^\s]+)\s+([^\s]+)/);
  const stockMatch = `${title} ${description}`.match(/\bStock\s*:\s*([A-Za-z0-9-]+)/i);
  const mileageMatch = html.match(/"specsKM"\s*:\s*\[\s*"([^"]+)"/i);
  const stockSpecMatch = html.match(/"specsNoStock"\s*:\s*\[\s*"([^"]+)"/i);
  const vinSpecMatch = html.match(/"specsVin"\s*:\s*\[\s*"([^"]+)"/i);
  const transmissionMatch = html.match(/"specsTransmission"\s*:\s*\[\s*"([^"]+)"/i);
  const drivetrainMatch = html.match(/"specsDriveTrain"\s*:\s*\[\s*"([^"]+)"/i);
  const renderedTitle = htmlText(
    html.match(/<span[^>]+DetaileProductCustomrWeb-title[^>]*>([\s\S]*?)<\/span>\s*<span[^>]+DetaileProductCustomrWeb-subtitle[^>]*>([\s\S]*?)<\/span>/i)
      ?.slice(1)
      .join(' ') ?? ''
  );
  const renderedTitleParts = renderedTitle.match(/\b(19\d{2}|20\d{2})\s+([^\s]+)\s+([^\s]+)/);
  const renderedVin = htmlAttribute(html, /\sdata-cg-vin=["']([^"']+)["']/i);
  const renderedPrice = htmlAttribute(html, /\sdata-cg-price=["']([^"']+)["']/i);
  const imageUrls = [
    metaContent(html, 'og:image'),
    ...[...html.matchAll(/https:\/\/(?:imagescdn|carimages)\.d2cmedia\.ca\/[^"'<>\s]+/gi)].map((match) => match[0]),
    ...[...html.matchAll(/https:\/\/image123\.azureedge\.net\/[^"'<>\s]+/gi)].map((match) => match[0])
  ]
    .map((url) => decodeHtml(url))
    .filter((url) => url && !/logo|thumb-|image123\.azureedge\.netnull/i.test(url));

  const record = {
    '@type': 'Vehicle',
    name: renderedTitle || title,
    title,
    description,
    vin: hiddenInputValue(html, 'vin') || renderedVin || htmlSpecValue(html, 'VIN') || decodeHtml(vinSpecMatch?.[1] ?? ''),
    stockNumber: stockMatch?.[1] || htmlSpecValue(html, 'Stock') || decodeHtml(stockSpecMatch?.[1] ?? ''),
    year: hiddenInputValue(html, 'year') || htmlSpecValue(html, 'Year') || renderedTitleParts?.[1] || nameParts?.[1],
    make: hiddenInputValue(html, 'make') || htmlSpecValue(html, 'Make') || renderedTitleParts?.[2] || nameParts?.[2],
    model: hiddenInputValue(html, 'model') || htmlSpecValue(html, 'Model') || renderedTitleParts?.[3] || nameParts?.[3],
    trim: hiddenInputValue(html, 'trim'),
    price: hiddenInputValue(html, 'price') || renderedPrice || renderedTitle.match(/\$[\d,]+/)?.[0] || title.match(/\$[\d,]+/)?.[0],
    mileage: htmlSpecValue(html, 'Odometer') || decodeHtml(mileageMatch?.[1] ?? ''),
    image: [...new Set(imageUrls)].slice(0, 24),
    url: metaContent(html, 'og:url') || sourceUrl,
    bodyType: htmlSpecValue(html, 'Body Style'),
    exteriorColor: hiddenInputValue(html, 'extcolor') || htmlSpecValue(html, 'Exterior Color'),
    transmission: htmlSpecValue(html, 'Transmission') || decodeHtml(transmissionMatch?.[1] ?? ''),
    drivetrain: htmlSpecValue(html, 'Drivetrain') || decodeHtml(drivetrainMatch?.[1] ?? '')
  };
  record.image = imagesForVehicle(record.image, record);

  return record.vin && record.year && record.make && record.model ? record : null;
}

function shouldCrawlDetailPages(records, detailLinks) {
  if (!detailLinks.length) return false;
  if (!records.length) return true;
  if (records.length < detailLinks.length) return true;
  return records.some((record) => !hasDetailGradeRecord(record));
}

function documentSourceUrl(document, fallbackUrl) {
  return (
    normalizeText(document?.sourceUrl) ||
    normalizeText(document?.metadata?.sourceURL) ||
    normalizeText(document?.metadata?.url) ||
    fallbackUrl
  );
}

function vehicleKeys(vehicle) {
  return [
    vehicle.vin,
    vehicle.vdpUrl,
    vehicle.stockNumber ? `${vehicle.year}:${vehicle.make}:${vehicle.model}:${vehicle.stockNumber}` : null,
    `${vehicle.year}:${vehicle.make}:${vehicle.model}`
  ].filter(Boolean);
}

function filledValue(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function mergeVehicle(existing, incoming) {
  const merged = { ...existing, ...incoming };
  for (const [key, value] of Object.entries(existing)) {
    if (!filledValue(incoming[key]) && filledValue(value)) {
      merged[key] = value;
    }
  }
  return merged;
}

function isD2cVehicleDetailUrl(url) {
  try {
    return /\/used\/\d{4}-[^/]+-id\d+\.html$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function isHillzVehicleDetailUrl(url) {
  try {
    return /\/cars\/used\/(19\d{2}|20\d{2})-[^/]+-\d+\/?$/i.test(decodeURIComponent(new URL(url).pathname));
  } catch {
    return false;
  }
}

function normalizeDetailUrl(url) {
  try {
    const parsed = new URL(url);
    if (isD2cVehicleDetailUrl(parsed.href) || isHillzVehicleDetailUrl(parsed.href)) {
      parsed.search = '';
      parsed.hash = '';
    }
    return parsed.href;
  } catch {
    return url;
  }
}

function inventoryPageScore(url) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (isD2cVehicleDetailUrl(url)) return 0;
    if (isHillzVehicleDetailUrl(url)) return 0;
    if (/\/(19\d{2}|20\d{2})[-/]/.test(path)) return 0;
    if (/\/used\/search\.html$/.test(path)) return 100;
    if (/\/used\/?$/.test(path)) return 90;
    if (/\/cars\/?$/.test(path)) return 88;
    if (/\/inventory\/?$/.test(path)) return 85;
    if (/\/vehicles\/?$/.test(path)) return 80;
    if (/\/used\/(type|make|model)\//.test(path)) return 45;
    if (/(inventory|used|vehicles|cars|trucks)/.test(path)) return 30;
  } catch {
    return 0;
  }
  return 0;
}

function sameOriginLinks(links, sourceUrl) {
  const origin = new URL(sourceUrl).origin;
  return [...new Set(asArray(links).map((link) => (isRecord(link) ? link.url : link)).filter(Boolean))]
    .map((link) => {
      try {
        const url = new URL(link, sourceUrl);
        return url.origin === origin ? url.href : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function inventoryCandidateLinks(links, sourceUrl) {
  if (isD2cVehicleDetailUrl(sourceUrl)) return [];
  return sameOriginLinks(links, sourceUrl)
    .filter((link) => link !== sourceUrl)
    .map((link) => ({ link, score: inventoryPageScore(link) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((candidate) => candidate.link)
    .slice(0, 3);
}

function sameOriginDetailLinks(links, sourceUrl) {
  if (isD2cVehicleDetailUrl(sourceUrl) || isHillzVehicleDetailUrl(sourceUrl)) return [];
  const linksOnOrigin = sameOriginLinks(links, sourceUrl);
  const d2cDetailLinks = [...new Set(linksOnOrigin.filter(isD2cVehicleDetailUrl).map(normalizeDetailUrl))];
  if (d2cDetailLinks.length) return d2cDetailLinks.slice(0, MAX_DETAIL_PAGES);
  const hillzDetailLinks = [...new Set(linksOnOrigin.filter(isHillzVehicleDetailUrl).map(normalizeDetailUrl))];
  if (hillzDetailLinks.length) return hillzDetailLinks.slice(0, MAX_DETAIL_PAGES);
  return linksOnOrigin
    .filter((link) => {
      const path = new URL(link).pathname;
      return /(vehicle|inventory|detail|vdp|car|auto)/i.test(path) && !/\/forms?\//i.test(path) && inventoryPageScore(link) === 0;
    })
    .slice(0, MAX_DETAIL_PAGES);
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function authorizationHeader({ apiKey, basicAuth }) {
  if (basicAuth) {
    return `Basic ${Buffer.from(basicAuth).toString('base64')}`;
  }
  return `Bearer ${apiKey}`;
}

export function createFirecrawlInventoryAdapter({
  apiKey = process.env.FIRECRAWL_API_KEY,
  basicAuth = process.env.FIRECRAWL_API_BASIC_AUTH,
  scrapeTimeoutMs = numberFrom(process.env.FIRECRAWL_SCRAPE_TIMEOUT_MS) ?? DEFAULT_SCRAPE_TIMEOUT_MS,
  fetchImpl = fetch
} = {}) {
  async function scrape(url) {
    if (!apiKey && !basicAuth) {
      throw new Error('FIRECRAWL_API_KEY or FIRECRAWL_API_BASIC_AUTH is required for website inventory imports');
    }

    const response = await fetchImpl(process.env.FIRECRAWL_API_URL ?? DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: authorizationHeader({ apiKey, basicAuth }),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        formats: ['html', 'links'],
        onlyMainContent: false,
        timeout: scrapeTimeoutMs
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error ?? `Firecrawl request failed with ${response.status}`);
    }
    const document = payload.data ?? payload;
    return isRecord(document) ? { ...document, sourceUrl: documentSourceUrl(document, url) } : { sourceUrl: url };
  }

  async function scrapeDetail(url) {
    try {
      return await scrape(url);
    } catch (error) {
      try {
        return await scrape(url);
      } catch {
        throw error;
      }
    }
  }

  return {
    async importInventory(sourceUrl) {
      const firstDocument = await scrape(sourceUrl);
      const inventoryDocuments = [firstDocument];
      const discoveredInventoryPageUrls = [];

      for (const url of inventoryCandidateLinks(firstDocument.links, sourceUrl)) {
        try {
          const document = await scrape(url);
          inventoryDocuments.push(document);
          discoveredInventoryPageUrls.push(url);
          if (sameOriginDetailLinks(document.links, url).length >= sameOriginDetailLinks(firstDocument.links, sourceUrl).length) {
            break;
          }
        } catch {
          // Discovery pages are best effort; direct detail links on the submitted URL can still import.
        }
      }

      const records = inventoryDocuments.flatMap((document) => structuredRecords(document));
      const detailLinks = [
        ...new Set(inventoryDocuments.flatMap((document) => sameOriginDetailLinks(document.links, documentSourceUrl(document, sourceUrl))))
      ].slice(0, MAX_DETAIL_PAGES);
      let detailDocuments = [];
      if (shouldCrawlDetailPages(records, detailLinks)) {
        detailDocuments = (await mapConcurrent(detailLinks, DETAIL_PAGE_CONCURRENCY, async (url) => {
          try {
            return await scrapeDetail(url);
          } catch {
            // Detail page failures are captured by the source metadata; one bad VDP should not block the whole import.
            return null;
          }
        })).filter(Boolean);
      }
      const sourcedRecords = inventoryDocuments.flatMap((document) =>
        structuredRecords(document).map((record) => ({ record, sourceUrl: documentSourceUrl(document, sourceUrl) }))
      );
      for (const document of detailDocuments) {
        sourcedRecords.push(
          ...structuredRecords(document).map((record) => ({
            record,
            sourceUrl: documentSourceUrl(document, sourceUrl)
          }))
        );
      }

      const vehicleByKey = new Map();
      for (const { record, sourceUrl: recordSourceUrl } of sourcedRecords) {
        const vehicle = vehicleFromRecord(record, recordSourceUrl);
        if (!vehicle) continue;
        const keys = vehicleKeys(vehicle);
        const existing = keys.map((key) => vehicleByKey.get(key)).find(Boolean);
        const merged = existing ? mergeVehicle(existing, vehicle) : vehicle;
        for (const key of keys) vehicleByKey.set(key, merged);
      }

      return {
        vehicles: [...new Set(vehicleByKey.values())],
        raw: {
          inventoryPage: firstDocument,
          discoveredInventoryPageUrls,
          detailPageCount: detailDocuments.length
        }
      };
    }
  };
}
