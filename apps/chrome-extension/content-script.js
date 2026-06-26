(() => {
  if (window.__lotPilotAutofillInstalled) return;
  window.__lotPilotAutofillInstalled = true;

  const FIELD_TYPES = {
    title: {
      keywords: ['title', 'listing title', 'vehicle title', 'what are you selling'],
      reject: ['subtitle'],
      prefer: ['input', '[role="textbox"]', '[contenteditable="true"]']
    },
    price: {
      keywords: ['price', 'amount', 'asking price', 'list price'],
      reject: ['description'],
      prefer: ['input']
    },
    description: {
      keywords: ['description', 'details', 'seller notes', 'body', 'message', 'tell buyers'],
      reject: ['title'],
      prefer: ['textarea', '[contenteditable="true"]', '[role="textbox"]']
    }
  };

  function normalize(text) {
    return String(text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function isFacebook() {
    return location.hostname.includes('facebook.com');
  }

  function isEditable(element) {
    if (element.isContentEditable) return true;
    if (element.tagName === 'TEXTAREA') return true;
    if (element.getAttribute('role') === 'textbox') return true;
    if (element.tagName !== 'INPUT') return false;
    return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(element.type);
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
  }

  function safeCssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function labelFor(element) {
    const labels = [];
    if (element.labels) {
      labels.push(...Array.from(element.labels).map((label) => label.textContent));
    }
    if (element.id) {
      labels.push(document.querySelector(`label[for="${safeCssEscape(element.id)}"]`)?.textContent);
    }
    const labelledBySelector = (element.getAttribute('aria-labelledby') || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => `#${safeCssEscape(id)}`)
      .join(',');
    labels.push(
      element.getAttribute('aria-label'),
      labelledBySelector ? Array.from(document.querySelectorAll(labelledBySelector)).map((node) => node.textContent).join(' ') : '',
      element.getAttribute('name'),
      element.getAttribute('id'),
      element.getAttribute('placeholder'),
      element.getAttribute('data-testid'),
      element.closest('label')?.textContent,
      element.parentElement?.textContent?.slice(0, 220)
    );
    return normalize(labels.filter(Boolean).join(' '));
  }

  function selectorScore(element, type) {
    const config = FIELD_TYPES[type];
    const tag = element.tagName.toLowerCase();
    const descriptor = labelFor(element);
    if (config.reject.some((keyword) => descriptor.includes(keyword))) return -100;

    let score = 0;
    for (const keyword of config.keywords) {
      if (descriptor.includes(keyword)) score += keyword.length + 10;
    }
    for (const preferred of config.prefer) {
      if (preferred === tag || element.matches(preferred)) score += 6;
    }
    if (element.getAttribute('aria-label')) score += 5;
    if (element.placeholder) score += 2;
    if (type === 'description' && (tag === 'textarea' || element.isContentEditable)) score += 12;
    if (type === 'price' && element.tagName === 'INPUT' && ['number', 'text', 'tel', ''].includes(element.type)) score += 8;
    if (isFacebook() && element.getAttribute('role') === 'textbox') score += 4;
    return score;
  }

  function candidates() {
    return Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"], [aria-label]'))
      .filter((element) => isEditable(element) && isVisible(element));
  }

  function findField(type, used) {
    const scored = candidates()
      .filter((element) => !used.has(element))
      .map((element) => ({ element, score: selectorScore(element, type) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score);

    if (scored[0]) return scored[0].element;

    const unused = candidates().filter((element) => !used.has(element));
    if (type === 'description') return unused.find((element) => element.tagName === 'TEXTAREA' || element.isContentEditable) ?? null;
    if (type === 'price') return unused.find((element) => element.tagName === 'INPUT' && ['number', 'text', 'tel', ''].includes(element.type)) ?? null;
    if (type === 'title') return unused.find((element) => element.tagName === 'INPUT' || element.getAttribute('role') === 'textbox') ?? null;
    return null;
  }

  function setNativeValue(element, value) {
    element.focus();
    if (element.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();
      element.textContent = value;
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillMarketplace(payload) {
    const values = {
      title: payload.title ?? '',
      price: payload.price ?? '',
      description: payload.description ?? ''
    };
    const used = new Set();
    const filledFields = [];
    const missingFields = [];

    for (const type of ['title', 'price', 'description']) {
      if (!values[type]) {
        missingFields.push(type);
        continue;
      }
      const field = findField(type, used);
      if (!field) {
        missingFields.push(type);
        continue;
      }
      used.add(field);
      setNativeValue(field, values[type]);
      filledFields.push(type);
    }

    return {
      target: payload.target ?? 'facebook_marketplace',
      site: isFacebook() ? 'facebook' : location.hostname,
      filledFields,
      missingFields
    };
  }

  function dataUrlToFile(photo, index) {
    const match = String(photo.dataUrl || '').match(/^data:([^;]+);base64,(.*)$/);
    if (!match) throw new Error(`Photo ${index + 1} is not a data URL.`);

    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let cursor = 0; cursor < binary.length; cursor += 1) {
      bytes[cursor] = binary.charCodeAt(cursor);
    }

    return new File([bytes], photo.name || `lotpilot-photo-${index + 1}.jpg`, {
      type: photo.mimeType || match[1] || 'image/jpeg',
      lastModified: Date.now()
    });
  }

  function fileInputs() {
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    const imageInputs = inputs.filter((input) => normalize(input.accept).includes('image') || input.multiple);
    return imageInputs.length ? imageInputs : inputs;
  }

  function findPhotoDropzones() {
    const textHints = ['add photos', 'add photo', 'photos', 'upload', 'drag'];
    return Array.from(document.querySelectorAll('[role="button"], [aria-label], label, button, div, span'))
      .filter((element) => {
        if (!isVisible(element)) return false;
        const descriptor = normalize([
          element.getAttribute('aria-label'),
          element.getAttribute('data-testid'),
          element.textContent?.slice(0, 120)
        ].filter(Boolean).join(' '));
        return textHints.some((hint) => descriptor.includes(hint));
      })
      .slice(0, 8);
  }

  function dispatchDrop(target, dataTransfer) {
    try {
      target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }));
      target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
      return true;
    } catch {
      try {
        const drop = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
        target.dispatchEvent(drop);
        return true;
      } catch {
        return false;
      }
    }
  }

  function uploadMarketplacePhotos(payload) {
    const photos = Array.isArray(payload.photos) ? payload.photos : [];
    if (!photos.length) {
      return {
        target: payload.target ?? 'facebook_marketplace',
        photoRequested: 0,
        photoUploaded: 0,
        uploadMethod: 'none',
        errors: [{ error: 'No photo payloads were provided.' }]
      };
    }

    const errors = [];
    const files = [];
    for (let index = 0; index < photos.length; index += 1) {
      try {
        files.push(dataUrlToFile(photos[index], index));
      } catch (error) {
        errors.push({ name: photos[index]?.name, error: error instanceof Error ? error.message : 'Invalid photo payload.' });
      }
    }
    if (!files.length) {
      return {
        target: payload.target ?? 'facebook_marketplace',
        photoRequested: photos.length,
        photoUploaded: 0,
        uploadMethod: 'none',
        errors
      };
    }

    const dataTransfer = new DataTransfer();
    for (const file of files) dataTransfer.items.add(file);

    const input = fileInputs()[0];
    if (input) {
      try {
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return {
          target: payload.target ?? 'facebook_marketplace',
          photoRequested: photos.length,
          photoUploaded: files.length,
          uploadMethod: 'file_input',
          errors
        };
      } catch (error) {
        errors.push({ error: error instanceof Error ? error.message : 'File input assignment failed.' });
      }
    }

    for (const dropzone of findPhotoDropzones()) {
      if (dispatchDrop(dropzone, dataTransfer)) {
        return {
          target: payload.target ?? 'facebook_marketplace',
          photoRequested: photos.length,
          photoUploaded: files.length,
          uploadMethod: 'dropzone',
          errors
        };
      }
    }

    return {
      target: payload.target ?? 'facebook_marketplace',
      photoRequested: photos.length,
      photoUploaded: 0,
      uploadMethod: 'none',
      errors: [...errors, { error: 'No file input or photo dropzone was found on this page.' }]
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'LOTPILOT_AUTOFILL_MARKETPLACE') {
      try {
        sendResponse(fillMarketplace(message.payload ?? {}));
      } catch (error) {
        sendResponse({
          target: message.payload?.target ?? 'facebook_marketplace',
          filledFields: [],
          missingFields: ['title', 'price', 'description'],
          error: error instanceof Error ? error.message : 'Unknown autofill error.'
        });
      }
      return false;
    }

    if (message?.type === 'LOTPILOT_UPLOAD_MARKETPLACE_PHOTOS') {
      try {
        sendResponse(uploadMarketplacePhotos(message.payload ?? {}));
      } catch (error) {
        sendResponse({
          target: message.payload?.target ?? 'facebook_marketplace',
          photoRequested: message.payload?.photos?.length ?? 0,
          photoUploaded: 0,
          uploadMethod: 'none',
          errors: [{ error: error instanceof Error ? error.message : 'Unknown photo upload error.' }]
        });
      }
      return false;
    }

    return false;
  });
})();
