import {
  DIETS,
  SECTIONS,
  SMS_DISPLAY,
  buildOrderText,
  buildSmsUrl,
  denverClock,
  formatCents,
  isOpenAt,
  itemTitle,
  lineKey,
  lineUnitCents,
  missingRequired,
  optionText,
  priceColumn,
  pricedSubtotalCents,
} from './order.js';

const STORAGE_KEY = 'olas-cart-v1';

const $ = (id) => document.getElementById(id);

let cart = loadCart();
let open = false;

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value != null) node.setAttribute(key, String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function loadCart() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((line) => line
      && typeof line.key === 'string'
      && typeof line.title === 'string'
      && Number.isInteger(line.qty)
      && line.qty > 0
      && line.qty <= 20
      && (line.unitCents == null || Number.isInteger(line.unitCents)));
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* private mode */
  }
}

function syncChips(scope) {
  for (const label of scope.querySelectorAll('.chip')) {
    const input = label.querySelector('input');
    label.classList.toggle('on', Boolean(input && input.checked));
  }
}

function readSelection(card, item) {
  const selection = {};
  for (const group of item.options || []) {
    const picked = card.querySelector(`input[name="${item.id}-${group.key}"]:checked`);
    if (picked) selection[group.key] = picked.value;
  }
  for (const field of item.fields || []) {
    const input = card.querySelector(`[data-field="${field.key}"]`);
    selection[field.key] = input ? input.value : '';
  }
  return selection;
}

function renderItem(item) {
  const column = priceColumn(item);
  const card = el('article', { class: 'item', 'data-id': item.id });
  const head = el('div', { class: 'item-head' }, [
    el('h3', {}, [
      item.num ? el('span', { class: 'num' }, `#${item.num} `) : null,
      item.name,
    ]),
    el('div', { class: 'prices' }, column.map((line) => {
      const inquire = line.endsWith('inquire') || line === 'inquire';
      return el('p', { class: inquire ? 'price inquire' : 'price' }, line);
    })),
  ]);
  card.append(head);
  if (item.detail) card.append(el('p', { class: 'detail' }, item.detail));

  for (const group of item.options || []) {
    const fieldset = el('fieldset', { class: 'opt-group' }, [
      el('legend', {}, group.label),
    ]);
    const chips = el('div', { class: 'chips' });
    group.choices.forEach((choice, index) => {
      const inquire = Boolean(choice.inquire || (item.priceFrom === group.key && choice.cents == null));
      const input = el('input', {
        type: 'radio',
        name: `${item.id}-${group.key}`,
        value: choice.id,
        checked: index === 0 ? true : null,
      });
      const caption = inquire ? `${choice.label} · inquire` : (
        item.priceFrom === group.key && choice.cents != null
          ? `${choice.label} · ${formatCents(choice.cents)}`
          : choice.label
      );
      const label = el('label', { class: inquire ? 'chip inquire' : 'chip' }, [input, caption]);
      chips.append(label);
    });
    fieldset.append(chips);
    fieldset.addEventListener('change', () => syncChips(fieldset));
    card.append(fieldset);
  }

  for (const field of item.fields || []) {
    const input = el('input', {
      type: 'text',
      'data-field': field.key,
      maxlength: '80',
      placeholder: field.placeholder || '',
      'aria-label': field.label,
    });
    card.append(el('label', { class: 'form-row' }, [
      el('span', {}, field.label),
      input,
    ]));
  }

  const qtyOut = el('span', { class: 'qty-val' }, '1');
  const dec = el('button', { type: 'button', 'aria-label': `Fewer ${item.name}` }, '−');
  const inc = el('button', { type: 'button', 'aria-label': `More ${item.name}` }, '+');
  let qty = 1;
  const paintQty = () => { qtyOut.textContent = String(qty); };
  dec.addEventListener('click', () => { qty = Math.max(1, qty - 1); paintQty(); });
  inc.addEventListener('click', () => { qty = Math.min(20, qty + 1); paintQty(); });

  const add = el('button', { type: 'button', class: 'add' }, 'Add to order');
  const flash = el('p', { class: 'added', 'aria-live': 'polite' });
  add.addEventListener('click', () => {
    const selection = readSelection(card, item);
    const missing = missingRequired(item, selection);
    if (missing.length) {
      flash.textContent = `Add ${missing[0].toLowerCase()} before this goes on the order.`;
      return;
    }
    const unitCents = lineUnitCents(item, selection);
    const opt = optionText(item, selection);
    const key = lineKey(item, selection);
    const existing = cart.find((line) => line.key === key);
    if (existing) existing.qty = Math.min(20, existing.qty + qty);
    else {
      cart.push({
        key,
        id: item.id,
        title: itemTitle(item),
        optionText: opt,
        unitCents,
        qty,
      });
    }
    qty = 1;
    paintQty();
    saveCart();
    flash.textContent = unitCents == null ? 'Added · inquire' : 'Added';
    updateTicket();
  });

  card.append(el('div', { class: 'addrow' }, [
    el('div', { class: 'qty' }, [dec, qtyOut, inc]),
    add,
  ]));
  card.append(flash);
  syncChips(card);
  return card;
}

function renderMenu() {
  for (const section of SECTIONS) {
    const host = $(section.id);
    host.append(el('h2', {}, section.title));
    if (section.note) host.append(el('p', { class: 'section-note' }, section.note));
    for (const item of section.items) host.append(renderItem(item));
  }
}

function selectedDiets() {
  return DIETS.filter((diet) => {
    const box = document.querySelector(`input[name="diet"][value="${diet}"]`);
    return Boolean(box && box.checked);
  });
}

function draftBody() {
  return buildOrderText({
    name: $('cust-name').value,
    phone: $('cust-phone').value,
    diets: selectedDiets(),
    notes: $('cust-notes').value,
    lines: cart,
  });
}

function formState() {
  const name = $('cust-name').value.trim();
  const phoneDigits = $('cust-phone').value.replace(/\D/g, '');
  if (!open) {
    return { ok: false, hint: 'Ordering is closed. The menu stays up so you can look, but the text button stays off until Wednesday–Saturday, 8:00 AM–1:00 PM Mountain time.' };
  }
  if (!cart.length) return { ok: false, hint: 'Add at least one item.' };
  if (!/[A-Za-z]/.test(name)) return { ok: false, hint: 'Enter the name for the order.' };
  if (phoneDigits.length < 10 || phoneDigits.length > 15) return { ok: false, hint: 'Enter a phone number so Ola’s can reach you.' };
  return { ok: true, hint: `This opens Messages with the order filled in to ${SMS_DISPLAY}. Nothing is sent until you tap Send there.` };
}

function renderCart() {
  const box = $('cart-lines');
  box.replaceChildren();
  if (!cart.length) {
    box.append(el('p', { class: 'empty' }, 'Nothing in the order yet.'));
    return;
  }
  for (const line of cart) {
    const priceText = line.unitCents == null ? 'inquire' : formatCents(line.unitCents * line.qty);
    const info = el('div', {}, [
      el('p', { class: 'cart-title' }, line.title),
      line.optionText ? el('p', { class: 'opt' }, line.optionText) : null,
      el('p', { class: line.unitCents == null ? 'price inquire' : 'price' }, priceText),
    ]);
    const controls = el('div', { class: 'qty' }, [
      el('button', { type: 'button', 'data-act': 'dec', 'data-key': line.key, 'aria-label': `Fewer ${line.title}` }, '−'),
      el('span', {}, String(line.qty)),
      el('button', { type: 'button', 'data-act': 'inc', 'data-key': line.key, 'aria-label': `More ${line.title}` }, '+'),
      el('button', { type: 'button', class: 'texty', 'data-act': 'remove', 'data-key': line.key }, 'Remove'),
    ]);
    box.append(el('article', { class: 'cart-line' }, [info, controls]));
  }
}

function renderAction(state, body) {
  const slot = $('action-slot');
  slot.replaceChildren();
  if (!state.ok) {
    const button = el('button', { type: 'button', class: 'send', disabled: true }, open ? 'Send text to Ola’s' : 'Closed — text orders are off');
    slot.append(button);
    return;
  }
  const link = el('a', { class: 'send', href: buildSmsUrl(body) }, 'Send text to Ola’s');
  link.addEventListener('click', (event) => {
    if (!isOpenAt(new Date())) {
      event.preventDefault();
      refreshHours();
    }
  });
  slot.append(link);
}

function renderDock() {
  const dock = $('dock');
  const count = cart.reduce((sum, line) => sum + line.qty, 0);
  const sub = pricedSubtotalCents(cart);
  const inquire = cart.some((line) => line.unitCents == null);
  let label = 'Nothing selected yet';
  if (count) {
    label = `${count} ${count === 1 ? 'item' : 'items'} · ${formatCents(sub)} priced`;
    if (inquire) label += ' · inquire not included';
  }
  const button = el('button', { type: 'button' }, 'Review order');
  button.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('order').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (!$('cust-name').value.trim()) $('cust-name').focus({ preventScroll: true });
  });
  dock.replaceChildren(el('p', {}, label), button);
  dock.hidden = false;
}

function updateTicket() {
  renderCart();
  const sub = pricedSubtotalCents(cart);
  const inquire = cart.some((line) => line.unitCents == null);
  $('subtotal').textContent = cart.length ? `Priced subtotal: ${formatCents(sub)}` : 'Priced subtotal: —';
  let tax = 'Tax is not included.';
  if (inquire && cart.length) tax += ' Inquire items have no dollar amount and are not in the subtotal.';
  if (cart.length && sub === 0 && inquire) tax += ' Ola’s will confirm those prices.';
  $('tax-note').textContent = tax;
  const state = formState();
  const body = cart.length ? draftBody() : '';
  $('preview').textContent = body || 'Add items from the menu. The text Ola’s will receive shows here.';
  $('send-hint').textContent = state.hint;
  $('copy-order').disabled = !cart.length;
  renderAction(state, body);
  renderDock();
  document.body.classList.toggle('is-closed', !open);
}

function refreshHours() {
  const now = new Date();
  open = isOpenAt(now);
  const status = $('status');
  status.textContent = open ? 'Open for text orders' : 'Closed';
  status.className = open ? 'status open' : 'status closed';
  $('clock').textContent = denverClock(now);
  updateTicket();
}


const LIVE_URL = 'https://computingmadeeasy.org/olas-ordering/';
let deferredInstallPrompt = null;
let toastTimer = null;

function showToast(message) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2200);
}

function copyLiveUrl() {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(LIVE_URL);
  }
  return new Promise((resolve, reject) => {
    const area = document.createElement('textarea');
    area.value = LIVE_URL;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { copied = false; }
    document.body.removeChild(area);
    if (copied) resolve();
    else reject(new Error('Clipboard unavailable'));
  });
}

function showShareQr() {
  const panel = $('share-panel');
  const target = $('share-qr');
  if (!panel || !target) return;
  panel.hidden = false;
  if (target.getAttribute('data-url') === LIVE_URL) return;
  target.replaceChildren();
  target.classList.remove('qr-error');
  const makeQr = window.qrcode;
  if (typeof makeQr !== 'function') {
    target.classList.add('qr-error');
    target.textContent = 'QR code unavailable. Copy the link instead.';
    return;
  }
  try {
    const code = makeQr(0, 'M');
    code.addData(LIVE_URL);
    code.make();
    target.innerHTML = code.createSvgTag({
      cellSize: 4,
      margin: 16,
      scalable: true,
      alt: { text: "QR code for Ola's Route 66 Lunch Box" },
      title: { text: "Scan to open Ola's Route 66 Lunch Box" },
    });
    target.setAttribute('data-url', LIVE_URL);
  } catch {
    target.classList.add('qr-error');
    target.textContent = 'QR code unavailable. Copy the link instead.';
  }
}

function shareSite() {
  showShareQr();
  const shareData = {
    title: "Ola's Route 66 Lunch Box",
    text: "Build an order and text it to Ola's Route 66 Lunch Box.",
    url: LIVE_URL,
  };
  if (navigator.share) {
    navigator.share(shareData).catch((error) => {
      if (error && error.name === 'AbortError') return;
      copyLiveUrl().then(() => showToast('Link copied')).catch(() => {
        showToast('QR ready — or copy the link below');
      });
    });
    return;
  }
  copyLiveUrl().then(() => showToast('Link copied — QR is ready too')).catch(() => {
    showToast('QR ready — use Copy link');
  });
}

function browserIsStandalone() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function updateInstallUi() {
  const button = $('install-app');
  const tip = $('install-tip');
  if (!button || !tip) return;
  if (browserIsStandalone()) {
    button.hidden = false;
    button.disabled = true;
    button.textContent = 'Installed';
    tip.hidden = true;
    return;
  }
  button.hidden = false;
  button.disabled = false;
  button.textContent = 'Install';
  tip.hidden = true;
}

function showInstallTip() {
  const tip = $('install-tip');
  if (!tip) return;
  tip.hidden = false;
  tip.textContent = isIOS()
    ? 'On iPhone/iPad: tap Share → Add to Home Screen.'
    : 'One-tap install is unavailable here. Use your browser menu → Install app / Add to Home Screen.';
}

function initInstall() {
  const button = $('install-app');
  if (!button) return;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallUi();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallUi();
    showToast('Installed');
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (browserIsStandalone()) {
      updateInstallUi();
      return;
    }
    if (!deferredInstallPrompt) {
      showInstallTip();
      showToast(isIOS() ? 'Use Share → Add to Home Screen' : 'Use browser Install / Add to Home Screen');
      return;
    }
    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    promptEvent.prompt();
    promptEvent.userChoice.finally(() => updateInstallUi());
  });
  updateInstallUi();
  window.setTimeout(updateInstallUi, 1500);
}

function initSiteActions() {
  const share = $('share-site');
  if (share) {
    share.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      shareSite();
    });
  }
  const copyLink = $('copy-share-link');
  if (copyLink) {
    copyLink.addEventListener('click', () => {
      copyLiveUrl().then(() => showToast('Link copied')).catch(() => {
        showToast('Copy the link from the address bar');
      });
    });
  }
  initInstall();
  setupAutoUpdate();
}

function setupAutoUpdate() {
  if (!('serviceWorker' in navigator)) return;
  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  function checkForUpdate(reg) {
    if (!reg || typeof reg.update !== 'function') return;
    reg.update().catch(function () {});
    if (reg.waiting) {
      try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
    }
  }

  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
    checkForUpdate(reg);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') checkForUpdate(reg);
    });
    window.addEventListener('pageshow', function () { checkForUpdate(reg); });
    window.addEventListener('focus', function () { checkForUpdate(reg); });
    setInterval(function () { checkForUpdate(reg); }, 60 * 60 * 1000);
  }).catch(function () { /* file:// / unsupported hosts */ });
}

function wire() {
  initSiteActions();
  renderMenu();
  $('cart-lines').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-act]');
    if (!btn) return;
    const line = cart.find((entry) => entry.key === btn.getAttribute('data-key'));
    if (!line) return;
    if (btn.dataset.act === 'inc') line.qty = Math.min(20, line.qty + 1);
    if (btn.dataset.act === 'dec') {
      line.qty -= 1;
      if (line.qty <= 0) cart = cart.filter((entry) => entry.key !== line.key);
    }
    if (btn.dataset.act === 'remove') cart = cart.filter((entry) => entry.key !== line.key);
    saveCart();
    updateTicket();
  });

  for (const id of ['cust-name', 'cust-phone', 'cust-notes']) {
    $(id).addEventListener('input', updateTicket);
  }
  for (const box of document.querySelectorAll('input[name="diet"]')) {
    box.addEventListener('change', () => {
      box.closest('.chip').classList.toggle('on', box.checked);
      updateTicket();
    });
  }

  $('copy-order').addEventListener('click', async () => {
    const text = draftBody();
    const btn = $('copy-order');
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
    } catch {
      const pre = $('preview');
      const range = document.createRange();
      range.selectNodeContents(pre);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      btn.textContent = 'Copy the order above';
    }
    setTimeout(() => { btn.textContent = 'Copy order text'; }, 1800);
  });

  refreshHours();
  setInterval(refreshHours, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshHours();
  });
}

wire();
