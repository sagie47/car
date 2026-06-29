const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000';
const TARGET = 'facebook_marketplace_vehicle';
const STORAGE_KEYS = ['apiBaseUrl', 'listingId', 'rooftopId', 'accessToken', 'lastListing', 'lastVehicle', 'lastJob'];

const elements = {
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  listingId: document.getElementById('listingId'),
  rooftopId: document.getElementById('rooftopId'),
  accessToken: document.getElementById('accessToken'),
  loadListing: document.getElementById('loadListing'),
  postAssist: document.getElementById('postAssist'),
  runNextJob: document.getElementById('runNextJob'),
  fillText: document.getElementById('fillText'),
  uploadPhotos: document.getElementById('uploadPhotos'),
  downloadPhotos: document.getElementById('downloadPhotos'),
  clearToken: document.getElementById('clearToken'),
  preview: document.getElementById('preview'),
  steps: document.getElementById('steps'),
  status: document.getElementById('status')
};

function normalizeApiBaseUrl(value) {
  return (value || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.style.color = isError ? '#9d3b2f' : '';
}

function resetSteps() {
  elements.steps.hidden = true;
  elements.steps.replaceChildren();
}

function addStep(message, tone = '') {
  elements.steps.hidden = false;
  const row = document.createElement('p');
  if (tone) row.className = tone;
  row.textContent = message;
  elements.steps.append(row);
}

function extractListingIdFromUrl(url) {
  try {
    return new URL(url).pathname.match(/\/listings\/([^/?#]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function numberText(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? String(Math.round(number)) : '';
}

function titleCase(value) {
  return String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function conditionForMarketplace(value) {
  const condition = String(value || '').toLowerCase();
  if (condition.includes('new')) return 'New';
  if (condition.includes('certified') || condition.includes('used')) return 'Good';
  return condition ? titleCase(condition) : 'Good';
}

function normalizeTransmission(value) {
  const transmission = String(value || '').toLowerCase();
  if (transmission.includes('manual')) return 'Manual';
  if (transmission.includes('auto')) return 'Automatic';
  return value || '';
}

function normalizeFuelType(value) {
  const fuel = String(value || '').toLowerCase();
  if (fuel.includes('diesel')) return 'Diesel';
  if (fuel.includes('electric')) return 'Electric';
  if (fuel.includes('hybrid')) return 'Hybrid';
  if (fuel.includes('flex')) return 'Flex';
  if (fuel.includes('gas')) return 'Gasoline';
  return value || '';
}

function vehicleTitle(vehicle, fallbackTitle) {
  if (!vehicle) return fallbackTitle || '';
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ') || fallbackTitle || vehicle.vin || '';
}

function extractPost(listing, vehicle = null) {
  const post = listing?.draft?.marketplacePost;
  if (!post) throw new Error('This listing does not have a Marketplace post draft.');

  const title = post.title ?? listing.draft?.title ?? vehicleTitle(vehicle, '');
  return {
    listingId: listing.id,
    vehicleId: listing.vehicleId,
    target: TARGET,
    title,
    price: numberText(post.price ?? vehicle?.price),
    description: post.description ?? listing.draft?.longDescription ?? '',
    category: post.category ?? 'Vehicles',
    vehicle: {
      title: vehicleTitle(vehicle, title),
      year: vehicle?.year ? String(vehicle.year) : '',
      make: vehicle?.make ?? '',
      model: vehicle?.model ?? '',
      trim: vehicle?.trim ?? '',
      mileage: numberText(vehicle?.mileage),
      condition: conditionForMarketplace(vehicle?.condition),
      bodyStyle: vehicle?.bodyStyle ?? '',
      exteriorColor: vehicle?.exteriorColor ?? '',
      interiorColor: vehicle?.interiorColor ?? '',
      transmission: normalizeTransmission(vehicle?.transmission),
      fuelType: normalizeFuelType(vehicle?.fuelType),
      drivetrain: vehicle?.drivetrain ?? '',
      vin: vehicle?.vin ?? '',
      stockNumber: vehicle?.stockNumber ?? ''
    },
    photoUrls: Array.isArray(post.photoUrls) ? post.photoUrls : []
  };
}

function renderPreview(listing, vehicle = null) {
  const post = extractPost(listing, vehicle);
  elements.preview.hidden = false;
  elements.preview.innerHTML = `
    <div><strong>Target</strong><span class="copy"></span></div>
    <div><strong>Title</strong><span class="copy"></span></div>
    <div><strong>Price</strong><span class="copy"></span></div>
    <div><strong>Vehicle</strong><span class="copy"></span></div>
    <div><strong>Description</strong><span class="copy"></span></div>
    <div><strong>Photos</strong><span class="copy"></span></div>
  `;
  const copyFields = elements.preview.querySelectorAll('.copy');
  copyFields[0].textContent = 'Facebook Marketplace vehicle sale';
  copyFields[1].textContent = post.title;
  copyFields[2].textContent = post.price || 'No price';
  copyFields[3].textContent = [post.vehicle.year, post.vehicle.make, post.vehicle.model, post.vehicle.mileage ? `${post.vehicle.mileage} miles` : '']
    .filter(Boolean)
    .join(' ');
  copyFields[4].textContent = post.description.slice(0, 360) + (post.description.length > 360 ? '...' : '');
  copyFields[5].textContent = `${post.photoUrls.length} URL${post.photoUrls.length === 1 ? '' : 's'}; auto-upload tries first 10 / 15 MB.`;
}

async function saveSettings() {
  await chrome.storage.local.set({
    apiBaseUrl: normalizeApiBaseUrl(elements.apiBaseUrl.value),
    listingId: elements.listingId.value.trim(),
    rooftopId: elements.rooftopId.value.trim(),
    accessToken: elements.accessToken.value.trim()
  });
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS);
  elements.apiBaseUrl.value = stored.apiBaseUrl || DEFAULT_API_BASE_URL;
  elements.listingId.value = stored.listingId || '';
  elements.rooftopId.value = stored.rooftopId || '';
  elements.accessToken.value = stored.accessToken || '';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const inferredListingId = extractListingIdFromUrl(tab?.url);
  if (inferredListingId && !elements.listingId.value) {
    elements.listingId.value = inferredListingId;
    await saveSettings();
    setStatus('Detected listing ID from the active LotPilot tab.');
  }

  if (stored.lastListing) renderPreview(stored.lastListing, stored.lastVehicle ?? null);
}

async function fetchListing() {
  await saveSettings();
  const apiBaseUrl = normalizeApiBaseUrl(elements.apiBaseUrl.value);
  const headers = authHeaders();
  let listingId = elements.listingId.value.trim();

  if (!listingId) {
    const listingsResponse = await fetch(`${apiBaseUrl}/api/listings`, { headers });
    const listings = await listingsResponse.json().catch(() => []);
    if (!listingsResponse.ok) throw new Error(listings.error ?? `LotPilot returned ${listingsResponse.status}.`);
    const latest = listings
      .filter((listing) => listing?.draft?.marketplacePost)
      .sort((left, right) => new Date(right.updatedAt ?? right.createdAt).getTime() - new Date(left.updatedAt ?? left.createdAt).getTime())[0];
    if (!latest) throw new Error('No Marketplace drafts are available. Paste a listing ID or create a draft first.');
    listingId = latest.id;
    elements.listingId.value = listingId;
    await saveSettings();
  }

  const response = await fetch(`${apiBaseUrl}/api/listings/${encodeURIComponent(listingId)}`, { headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `LotPilot returned ${response.status}.`);
  const vehicleResponse = await fetch(`${apiBaseUrl}/api/vehicles/${encodeURIComponent(payload.vehicleId)}`, { headers });
  const vehicle = vehicleResponse.ok ? await vehicleResponse.json().catch(() => null) : null;
  await chrome.storage.local.set({ lastListing: payload, lastVehicle: vehicle });
  renderPreview(payload, vehicle);
  return { listing: payload, vehicle };
}

async function getListingFromCacheOrApi() {
  const stored = await chrome.storage.local.get(['lastListing', 'lastVehicle', 'listingId']);
  if (stored.lastListing?.id === elements.listingId.value.trim()) {
    return { listing: stored.lastListing, vehicle: stored.lastVehicle ?? null };
  }
  return fetchListing();
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab is available.');
  return tab;
}

function isSupportedTargetUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith('facebook.com') ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

async function ensureContentScript(tab) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js']
    });
  } catch {
    // The declared content script may already be present, or this page may block injection.
  }
}

async function sendToActiveTab(type, payload) {
  const tab = await activeTab();
  if (!isSupportedTargetUrl(tab.url)) {
    throw new Error('Open the Facebook Marketplace vehicle-sale form before running Post Vehicle.');
  }
  await ensureContentScript(tab);
  const result = await chrome.tabs.sendMessage(tab.id, { type, payload });
  return { tab, result };
}

function authHeaders(extra = {}) {
  const accessToken = elements.accessToken.value.trim();
  return {
    ...extra,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
}

async function apiJson(path, options = {}) {
  const apiBaseUrl = normalizeApiBaseUrl(elements.apiBaseUrl.value);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: authHeaders({
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `LotPilot returned ${response.status}.`);
  return payload;
}

async function claimNextJob() {
  await saveSettings();
  const rooftopId = elements.rooftopId.value.trim() || null;
  return apiJson('/api/posting-jobs/claim-next', {
    method: 'POST',
    body: JSON.stringify({ rooftopId, actor: 'chrome_extension' })
  });
}

async function completeJob(jobId, payload) {
  return apiJson(`/api/posting-jobs/${encodeURIComponent(jobId)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, actor: 'chrome_extension' })
  });
}

async function failJob(jobId, payload) {
  return apiJson(`/api/posting-jobs/${encodeURIComponent(jobId)}/fail`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, actor: 'chrome_extension' })
  });
}

function activityMetadata(post, tab, result, extra = {}) {
  return {
    method: extra.method ?? 'chrome_extension_post_assist',
    target: post.target,
    tabUrl: tab?.url,
    filledFields: result?.filledFields ?? [],
    missingFields: result?.missingFields ?? [],
    photoMode: extra.photoMode ?? 'none',
    photoRequested: extra.photoRequested ?? post.photoUrls.length,
    photoFetched: extra.photoFetched ?? 0,
    photoUploaded: extra.photoUploaded ?? 0,
    photoDownloaded: extra.photoDownloaded ?? 0,
    photoErrors: extra.photoErrors ?? []
  };
}

async function recordActivity(post, tab, result, extra = {}) {
  const apiBaseUrl = normalizeApiBaseUrl(elements.apiBaseUrl.value);
  const accessToken = elements.accessToken.value.trim();
  await fetch(`${apiBaseUrl}/api/listings/${encodeURIComponent(post.listingId)}/activities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({
      type: 'exported',
      metadata: activityMetadata(post, tab, result, extra)
    })
  }).catch(() => null);
}

async function fillText(post, options = {}) {
  const { tab, result } = await sendToActiveTab('LOTPILOT_AUTOFILL_MARKETPLACE', post);
  if (options.record !== false) {
    await recordActivity(post, tab, result, { method: options.method ?? 'chrome_extension_text_fill' });
  }
  return { tab, result };
}

async function fetchPhotoPayload(post) {
  if (!post.photoUrls.length) {
    return { ok: false, requested: 0, fetched: 0, photos: [], errors: [{ error: 'No photo URLs are available.' }] };
  }
  return chrome.runtime.sendMessage({
    type: 'LOTPILOT_FETCH_PHOTOS',
    payload: post
  });
}

async function uploadPhotos(post) {
  const photoPayload = await fetchPhotoPayload(post);
  if (!photoPayload.photos?.length) {
    return {
      photoPayload,
      tab: await activeTab(),
      result: {
        photoRequested: photoPayload.requested ?? post.photoUrls.length,
        photoUploaded: 0,
        errors: photoPayload.errors ?? [{ error: 'No photos could be fetched.' }]
      }
    };
  }

  const { tab, result } = await sendToActiveTab('LOTPILOT_UPLOAD_MARKETPLACE_PHOTOS', {
    target: post.target,
    listingId: post.listingId,
    photos: photoPayload.photos
  });

  return { photoPayload, tab, result };
}

async function downloadPhotos(post) {
  if (!post.photoUrls.length) throw new Error('No photo URLs are available on this listing.');
  const result = await chrome.runtime.sendMessage({
    type: 'LOTPILOT_DOWNLOAD_PHOTOS',
    payload: post
  });
  return { tab: await activeTab(), result };
}

async function runPostAssist() {
  resetSteps();
  addStep('Loading reviewed listing...');
  const { listing, vehicle } = await getListingFromCacheOrApi();
  const post = extractPost(listing, vehicle);

  addStep('Filling vehicle sale fields...');
  const text = await fillText(post, { record: false });
  const filled = text.result?.filledFields?.length ?? 0;
  const missing = text.result?.missingFields?.length ?? 0;
  addStep(`Text fill: ${filled} field${filled === 1 ? '' : 's'} filled${missing ? `, ${missing} missing` : ''}.`, missing ? 'warn' : 'ok');

  let photoMode = 'none';
  let photoFetched = 0;
  let photoUploaded = 0;
  let photoDownloaded = 0;
  let photoErrors = [];

  if (post.photoUrls.length) {
    addStep('Fetching photos for browser upload...');
    const upload = await uploadPhotos(post);
    photoFetched = upload.photoPayload?.fetched ?? upload.photoPayload?.photos?.length ?? 0;
    photoUploaded = upload.result?.photoUploaded ?? 0;
    photoErrors = [
      ...(upload.photoPayload?.errors ?? []),
      ...(upload.result?.errors ?? [])
    ];

    if (photoUploaded > 0) {
      photoMode = 'auto_upload';
      addStep(`Photo upload: ${photoUploaded} image${photoUploaded === 1 ? '' : 's'} attached.`, 'ok');
    } else {
      addStep('Auto-upload did not attach photos; downloading ordered fallback files.', 'warn');
      const fallback = await downloadPhotos(post);
      photoMode = fallback.result?.downloaded ? 'download_fallback' : 'none';
      photoDownloaded = fallback.result?.downloaded ?? 0;
      photoErrors = [...photoErrors, ...(fallback.result?.details ?? []).filter((item) => !item.ok)];
      addStep(`Download fallback: ${photoDownloaded} file${photoDownloaded === 1 ? '' : 's'} started.`, photoDownloaded ? 'ok' : 'warn');
    }
  } else {
    addStep('No photos are available on this listing.', 'warn');
  }

  await recordActivity(post, text.tab, text.result, {
    method: 'chrome_extension_post_assist',
    photoMode,
    photoRequested: post.photoUrls.length,
    photoFetched,
    photoUploaded,
    photoDownloaded,
    photoErrors
  });

  setStatus('Vehicle post assist complete. Review Facebook manually before publishing.');
}

async function submitMarketplace(post) {
  const { tab, result } = await sendToActiveTab('LOTPILOT_SUBMIT_MARKETPLACE', post);
  return { tab, result };
}

async function runNextPostingJob() {
  resetSteps();
  addStep('Claiming next ready posting job...');
  const payload = await claimNextJob();
  const { job, listing, vehicle, account } = payload;
  await chrome.storage.local.set({ lastJob: job, lastListing: listing, lastVehicle: vehicle, listingId: listing.id });
  elements.listingId.value = listing.id;
  renderPreview(listing, vehicle);

  if (job.action === 'remove') {
    await failJob(job.id, {
      method: 'chrome_extension_queue_runner',
      error: 'Removal jobs require a live Marketplace URL and manual delete support.',
      metadata: { action: job.action }
    });
    throw new Error('Claimed a removal job. It was marked for manual review because delete automation is not supported yet.');
  }

  const post = extractPost(listing, vehicle);
  post.jobId = job.id;
  addStep(`Claimed ${job.action} job for ${post.title}.`);

  addStep('Filling Marketplace vehicle fields...');
  const text = await fillText(post, { record: false, method: 'chrome_extension_queue_fill' });
  const filled = text.result?.filledFields?.length ?? 0;
  const missing = text.result?.missingFields?.length ?? 0;
  addStep(`Text fill: ${filled} field${filled === 1 ? '' : 's'} filled${missing ? `, ${missing} missing` : ''}.`, missing ? 'warn' : 'ok');

  let photoPayload = null;
  let photoResult = null;
  if (post.photoUrls.length) {
    addStep('Uploading ordered photos...');
    const upload = await uploadPhotos(post);
    photoPayload = upload.photoPayload;
    photoResult = upload.result;
    const uploaded = photoResult?.photoUploaded ?? 0;
    addStep(`Photo upload: ${uploaded} attached.`, uploaded ? 'ok' : 'warn');
  }

  const shouldSubmit = account?.autoSubmitEnabled !== false;
  let submit = { result: { submitted: false, clickedButtons: [], error: 'Auto-submit disabled.' }, tab: text.tab };
  if (shouldSubmit) {
    addStep('Attempting Marketplace publish flow...');
    submit = await submitMarketplace(post);
    const clicked = submit.result?.clickedButtons ?? [];
    addStep(`Submit flow clicked: ${clicked.length ? clicked.join(' -> ') : 'no publish button found'}.`, submit.result?.submitted ? 'ok' : 'warn');
  }

  const result = {
    liveUrl: submit.result?.liveUrl ?? submit.tab?.url,
    fill: text.result,
    photos: {
      requested: post.photoUrls.length,
      fetched: photoPayload?.fetched ?? 0,
      uploaded: photoResult?.photoUploaded ?? 0,
      errors: [...(photoPayload?.errors ?? []), ...(photoResult?.errors ?? [])]
    },
    submit: submit.result
  };

  if (shouldSubmit && submit.result?.submitted) {
    await completeJob(job.id, {
      method: 'chrome_extension_queue_runner',
      liveUrl: result.liveUrl,
      result
    });
    setStatus('Posting job completed and marked published.');
    return;
  }

  await failJob(job.id, {
    method: 'chrome_extension_queue_runner',
    error: submit.result?.error ?? 'The extension could not confirm Marketplace publish.',
    result,
    needsManualReview: true
  });
  throw new Error('Job filled, but publish could not be confirmed. It was marked for manual review.');
}

async function withPending(button, task) {
  const buttons = [elements.loadListing, elements.postAssist, elements.runNextJob, elements.fillText, elements.uploadPhotos, elements.downloadPhotos];
  buttons.forEach((item) => {
    item.disabled = true;
  });
  try {
    await task();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Unexpected extension error.', true);
  } finally {
    buttons.forEach((item) => {
      item.disabled = false;
    });
    button.focus();
  }
}

elements.loadListing.addEventListener('click', () =>
  withPending(elements.loadListing, async () => {
    resetSteps();
    const { listing } = await fetchListing();
    setStatus(`Loaded ${listing.id}.`);
  })
);

elements.postAssist.addEventListener('click', () =>
  withPending(elements.postAssist, runPostAssist)
);

elements.runNextJob.addEventListener('click', () =>
  withPending(elements.runNextJob, runNextPostingJob)
);

elements.fillText.addEventListener('click', () =>
  withPending(elements.fillText, async () => {
    resetSteps();
    const { listing, vehicle } = await getListingFromCacheOrApi();
    const post = extractPost(listing, vehicle);
    const { result } = await fillText(post, { method: 'chrome_extension_text_fill' });
    const filled = result?.filledFields?.length ?? 0;
    const missing = result?.missingFields?.length ?? 0;
    setStatus(`Filled ${filled} text field${filled === 1 ? '' : 's'}${missing ? `; ${missing} missing.` : '.'}`);
  })
);

elements.uploadPhotos.addEventListener('click', () =>
  withPending(elements.uploadPhotos, async () => {
    resetSteps();
    const { listing, vehicle } = await getListingFromCacheOrApi();
    const post = extractPost(listing, vehicle);
    const upload = await uploadPhotos(post);
    await recordActivity(post, upload.tab, {}, {
      method: 'chrome_extension_photo_upload',
      photoMode: upload.result?.photoUploaded ? 'auto_upload' : 'none',
      photoRequested: post.photoUrls.length,
      photoFetched: upload.photoPayload?.fetched ?? 0,
      photoUploaded: upload.result?.photoUploaded ?? 0,
      photoErrors: [...(upload.photoPayload?.errors ?? []), ...(upload.result?.errors ?? [])]
    });
    const uploaded = upload.result?.photoUploaded ?? 0;
    setStatus(uploaded ? `Attached ${uploaded} photo${uploaded === 1 ? '' : 's'}.` : 'No photos were attached; use Download Photos.');
  })
);

elements.downloadPhotos.addEventListener('click', () =>
  withPending(elements.downloadPhotos, async () => {
    resetSteps();
    const { listing, vehicle } = await getListingFromCacheOrApi();
    const post = extractPost(listing, vehicle);
    const { tab, result } = await downloadPhotos(post);
    await recordActivity(post, tab, {}, {
      method: 'chrome_extension_photo_download',
      photoMode: result?.downloaded ? 'download_fallback' : 'none',
      photoRequested: post.photoUrls.length,
      photoDownloaded: result?.downloaded ?? 0,
      photoErrors: (result?.details ?? []).filter((item) => !item.ok)
    });
    setStatus(`Started ${result?.downloaded ?? 0} photo download${result?.downloaded === 1 ? '' : 's'}.`);
  })
);

elements.clearToken.addEventListener('click', async () => {
  elements.accessToken.value = '';
  await chrome.storage.local.remove('accessToken');
  setStatus('Token cleared.');
});

for (const input of [elements.apiBaseUrl, elements.listingId, elements.rooftopId, elements.accessToken]) {
  input.addEventListener('change', saveSettings);
}

loadSettings().catch((error) => setStatus(error.message, true));
