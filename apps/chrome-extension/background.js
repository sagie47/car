const MAX_PHOTOS = 10;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
const DEFAULT_MIME_TYPE = 'image/jpeg';

function sanitizeSegment(value, fallback) {
  const clean = String(value || fallback || 'photo')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
  return clean || fallback || 'photo';
}

function extensionFor(mimeType, url) {
  const byMime = {
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  if (byMime[mimeType]) return byMime[mimeType];

  try {
    const ext = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
    if (['avif', 'gif', 'jpeg', 'jpg', 'png', 'webp'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {
    // Fall back below.
  }
  return 'jpg';
}

function nameForPhoto(url, index, listingId, title, mimeType) {
  const baseTitle = sanitizeSegment(title || listingId, 'listing');
  const ext = extensionFor(mimeType, url);
  return `${String(index + 1).padStart(2, '0')}-${baseTitle}.${ext}`;
}

function filenameForPhoto(url, index, listingId, title, mimeType) {
  return `LotPilot/${sanitizeSegment(listingId, 'listing')}/${nameForPhoto(url, index, listingId, title, mimeType)}`;
}

async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:${blob.type || DEFAULT_MIME_TYPE};base64,${btoa(binary)}`;
}

async function fetchPhoto(url, index, payload, totalBytes) {
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  const mimeType = blob.type || response.headers.get('content-type')?.split(';')[0] || DEFAULT_MIME_TYPE;
  if (!mimeType.startsWith('image/')) throw new Error(`Unexpected content type: ${mimeType}`);
  if (totalBytes + blob.size > MAX_TOTAL_BYTES) throw new Error('Photo payload limit reached.');

  return {
    url,
    name: nameForPhoto(url, index, payload.listingId, payload.title, mimeType),
    mimeType,
    size: blob.size,
    dataUrl: await blobToDataUrl(blob)
  };
}

async function fetchPhotos(payload = {}) {
  const urls = Array.from(new Set(Array.isArray(payload.photoUrls) ? payload.photoUrls : [])).slice(0, MAX_PHOTOS);
  const photos = [];
  const errors = [];
  let totalBytes = 0;

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    try {
      const photo = await fetchPhoto(url, index, payload, totalBytes);
      totalBytes += photo.size;
      photos.push(photo);
    } catch (error) {
      errors.push({
        url,
        name: nameForPhoto(url, index, payload.listingId, payload.title, DEFAULT_MIME_TYPE),
        error: error instanceof Error ? error.message : 'Photo fetch failed.'
      });
      if (String(error?.message || '').includes('payload limit')) break;
    }
  }

  return {
    ok: photos.length > 0,
    requested: urls.length,
    fetched: photos.length,
    maxPhotos: MAX_PHOTOS,
    maxTotalBytes: MAX_TOTAL_BYTES,
    totalBytes,
    photos,
    errors
  };
}

function download(url, filename) {
  return new Promise((resolve) => {
    chrome.downloads.download(
      {
        url,
        filename,
        conflictAction: 'uniquify',
        saveAs: false
      },
      (downloadId) => {
        const error = chrome.runtime.lastError;
        if (error) {
          resolve({ ok: false, url, filename, error: error.message });
          return;
        }
        resolve({ ok: true, url, filename, downloadId });
      }
    );
  });
}

async function downloadPhotos(payload = {}) {
  const urls = Array.from(new Set(Array.isArray(payload.photoUrls) ? payload.photoUrls : []));
  const details = [];

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    details.push(
      await download(
        url,
        filenameForPhoto(url, index, payload.listingId, payload.title, DEFAULT_MIME_TYPE)
      )
    );
  }

  return {
    ok: details.some((item) => item.ok),
    requested: urls.length,
    downloaded: details.filter((item) => item.ok).length,
    failed: details.filter((item) => !item.ok).length,
    details
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'LOTPILOT_FETCH_PHOTOS') {
    fetchPhotos(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, photos: [], errors: [{ error: error.message }] }));
    return true;
  }

  if (message?.type === 'LOTPILOT_DOWNLOAD_PHOTOS') {
    downloadPhotos(message.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, details: [], errors: [{ error: error.message }] }));
    return true;
  }

  return false;
});
