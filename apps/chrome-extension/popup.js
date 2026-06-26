const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000';
const TARGET = 'facebook_marketplace';
const STORAGE_KEYS = ['apiBaseUrl', 'listingId', 'accessToken', 'lastListing'];

const elements = {
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  listingId: document.getElementById('listingId'),
  accessToken: document.getElementById('accessToken'),
  loadListing: document.getElementById('loadListing'),
  postAssist: document.getElementById('postAssist'),
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

function extractPost(listing) {
  const post = listing?.draft?.marketplacePost;
  if (!post) throw new Error('This listing does not have a Marketplace post draft.');

  return {
    listingId: listing.id,
    target: TARGET,
    title: post.title ?? listing.draft?.title ?? '',
    price: post.price === null || post.price === undefined ? '' : String(post.price),
    description: post.description ?? listing.draft?.longDescription ?? '',
    category: post.category ?? 'Vehicles',
    photoUrls: Array.isArray(post.photoUrls) ? post.photoUrls : []
  };
}

function renderPreview(listing) {
  const post = extractPost(listing);
  elements.preview.hidden = false;
  elements.preview.innerHTML = `
    <div><strong>Target</strong><span class="copy"></span></div>
    <div><strong>Title</strong><span class="copy"></span></div>
    <div><strong>Price</strong><span class="copy"></span></div>
    <div><strong>Description</strong><span class="copy"></span></div>
    <div><strong>Photos</strong><span class="copy"></span></div>
  `;
  const copyFields = elements.preview.querySelectorAll('.copy');
  copyFields[0].textContent = 'Facebook Marketplace';
  copyFields[1].textContent = post.title;
  copyFields[2].textContent = post.price || 'No price';
  copyFields[3].textContent = post.description.slice(0, 360) + (post.description.length > 360 ? '...' : '');
  copyFields[4].textContent = `${post.photoUrls.length} URL${post.photoUrls.length === 1 ? '' : 's'}; auto-upload tries first 10 / 15 MB.`;
}

async function saveSettings() {
  await chrome.storage.local.set({
    apiBaseUrl: normalizeApiBaseUrl(elements.apiBaseUrl.value),
    listingId: elements.listingId.value.trim(),
    accessToken: elements.accessToken.value.trim()
  });
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS);
  elements.apiBaseUrl.value = stored.apiBaseUrl || DEFAULT_API_BASE_URL;
  elements.listingId.value = stored.listingId || '';
  elements.accessToken.value = stored.accessToken || '';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const inferredListingId = extractListingIdFromUrl(tab?.url);
  if (inferredListingId && !elements.listingId.value) {
    elements.listingId.value = inferredListingId;
    await saveSettings();
    setStatus('Detected listing ID from the active LotPilot tab.');
  }

  if (stored.lastListing) renderPreview(stored.lastListing);
}

async function fetchListing() {
  await saveSettings();
  const apiBaseUrl = normalizeApiBaseUrl(elements.apiBaseUrl.value);
  const listingId = elements.listingId.value.trim();
  const accessToken = elements.accessToken.value.trim();
  if (!listingId) throw new Error('Listing ID is required.');

  const response = await fetch(`${apiBaseUrl}/api/listings/${encodeURIComponent(listingId)}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `LotPilot returned ${response.status}.`);
  await chrome.storage.local.set({ lastListing: payload });
  renderPreview(payload);
  return payload;
}

async function getListingFromCacheOrApi() {
  const stored = await chrome.storage.local.get(['lastListing', 'listingId']);
  if (stored.lastListing?.id === elements.listingId.value.trim()) return stored.lastListing;
  return fetchListing();
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab is available.');
  return tab;
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
  await ensureContentScript(tab);
  const result = await chrome.tabs.sendMessage(tab.id, { type, payload });
  return { tab, result };
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
  const listing = await getListingFromCacheOrApi();
  const post = extractPost(listing);

  addStep('Filling title, price, and description...');
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

  setStatus(`Post Assist complete. Review the tab manually before publishing.`);
}

async function withPending(button, task) {
  const buttons = [elements.loadListing, elements.postAssist, elements.fillText, elements.uploadPhotos, elements.downloadPhotos];
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
    const listing = await fetchListing();
    setStatus(`Loaded ${listing.id}.`);
  })
);

elements.postAssist.addEventListener('click', () =>
  withPending(elements.postAssist, runPostAssist)
);

elements.fillText.addEventListener('click', () =>
  withPending(elements.fillText, async () => {
    resetSteps();
    const listing = await getListingFromCacheOrApi();
    const post = extractPost(listing);
    const { result } = await fillText(post, { method: 'chrome_extension_text_fill' });
    const filled = result?.filledFields?.length ?? 0;
    const missing = result?.missingFields?.length ?? 0;
    setStatus(`Filled ${filled} text field${filled === 1 ? '' : 's'}${missing ? `; ${missing} missing.` : '.'}`);
  })
);

elements.uploadPhotos.addEventListener('click', () =>
  withPending(elements.uploadPhotos, async () => {
    resetSteps();
    const listing = await getListingFromCacheOrApi();
    const post = extractPost(listing);
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
    const listing = await getListingFromCacheOrApi();
    const post = extractPost(listing);
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

for (const input of [elements.apiBaseUrl, elements.listingId, elements.accessToken]) {
  input.addEventListener('change', saveSettings);
}

loadSettings().catch((error) => setStatus(error.message, true));
