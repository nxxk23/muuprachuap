/* Shared app logic across all pages. State persists in localStorage. */

const STORAGE = {
  lang: 'mp_lang',
  cart: 'mp_cart',
  activeSet: 'mp_activeSet',
  search: 'mp_search'
};

const state = {
  get lang() {
    return localStorage.getItem(STORAGE.lang) || 'th';
  },
  set lang(value) {
    localStorage.setItem(STORAGE.lang, value);
  },
  get activeSet() {
    return Number(localStorage.getItem(STORAGE.activeSet) || 0);
  },
  set activeSet(value) {
    localStorage.setItem(STORAGE.activeSet, String(value));
  },
  get search() {
    return localStorage.getItem(STORAGE.search) || '';
  },
  set search(value) {
    localStorage.setItem(STORAGE.search, value);
  },
  get cart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.cart)) || {};
    } catch (e) {
      return {};
    }
  },
  set cart(value) {
    localStorage.setItem(STORAGE.cart, JSON.stringify(value));
  }
};

const money = value => `฿${value.toLocaleString('th-TH')}`;
const dict = () => translations[state.lang];
const dataset = () => content[state.lang];
const textOf = key => dict()[key] || translations.th[key] || key;
const param = name => new URLSearchParams(location.search).get(name);
const searchQuery = () => param('q') || state.search || '';
const categorySearchTargets = {
  th: ['เสริมดวง', 'เสริมทรัพย์', 'เสริมดวง', 'มหาเฮง', 'เสริมดวง', 'วัดอ่าวน้อย', 'ศาลหลักเมือง', 'วัดอ่าวน้อย', 'เสริมทรัพย์', 'พระอุปคุต'],
  zh: ['转运套装', '招财套装', '转运套装', '好运大发套装', '转运套装', '奥诺寺', '巴蜀府城市柱神庙', '奥诺寺', '招财套装', '优婆掬尊者'],
  vi: ['Bộ tăng vận', 'Bộ tài lộc', 'Bộ tăng vận', 'Bộ Maha Heng', 'Bộ tăng vận', 'Wat Ao Noi', 'Đền Trụ Cột Thành Phố Prachuap', 'Wat Ao Noi', 'Bộ tài lộc', 'Phra Upakhut'],
  en: ['Fortune boost set', 'Wealth set', 'Fortune boost set', 'Maha Heng set', 'Fortune boost set', 'Wat Ao Noi', 'Prachuap City Pillar Shrine', 'Wat Ao Noi', 'Wealth set', 'Phra Upakhut']
};

function cartEntries() {
  return Object.entries(state.cart).filter(([, qty]) => qty > 0);
}

function cartQuantity() {
  return cartEntries().reduce((sum, [, qty]) => sum + qty, 0);
}

function addToCart(index) {
  const cart = state.cart;
  cart[index] = (cart[index] || 0) + 1;
  state.cart = cart;
  state.activeSet = index;
  updateBadge();
  showToast(dataset().sets[index][0]);
}

function updateCart(index, diff) {
  const cart = state.cart;
  cart[index] = Math.max(0, (cart[index] || 0) + diff);
  if (!cart[index]) delete cart[index];
  state.cart = cart;
  updateBadge();
}

function updateBadge() {
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = cartQuantity();
  });
}

function setSearch(value) {
  state.search = value.trim();
}

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1400);
}

function applyText() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-Hans' : state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = textOf(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = textOf(el.dataset.i18nPlaceholder);
  });
}

function syncCartTabLabel() {
  document.querySelectorAll('[data-i18n="cartTab"]').forEach(el => {
    el.innerHTML = textOf('cartTab');
  });
}

function itemMatches(items, search) {
  const term = (search || '').trim().toLocaleLowerCase();
  if (!term) return true;
  return items.join(' ').toLocaleLowerCase().includes(term);
}

/* ---------------- Page renderers ---------------- */

function renderCategories(search) {
  const root = document.getElementById('categories');
  if (!root) return;
  root.innerHTML = dataset().categories.map((item, index) => `
    <button class="category" data-category="${index}">
      ${item[1]}
      <span>${item[0]}</span>
    </button>
  `).join('');
  root.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.category);
      const keyword = (categorySearchTargets[state.lang] || categorySearchTargets.th)[index] || dataset().categories[index][0];
      setSearch(keyword);
      location.href = `sets.html?q=${encodeURIComponent(keyword)}`;
    });
  });
}

function placeCardHtml(place, index) {
  return `
    <a class="place-card" href="place.html?id=${index}">
      <div class="place-photo"></div>
      <div class="place-body">
        <h3>${place[0]}</h3>
        <div class="meta"><span>${place[1]}</span></div>
        <div class="meta"><span class="rating">★ ${place[2]}</span><span>${place[3]}</span></div>
        <p class="place-note">${place[4]}</p>
      </div>
    </a>
  `;
}

function renderPlaces(targetId, search, limit) {
  const root = document.getElementById(targetId);
  if (!root) return;
  let list = dataset().places.map((place, index) => ({ place, index }))
    .filter(({ place }) => itemMatches(place, search));
  if (limit) list = list.slice(0, limit);
  root.innerHTML = list.length
    ? list.map(({ place, index }) => placeCardHtml(place, index)).join('')
    : `<div class="empty-state">${textOf('noResults')}</div>`;
}

function shopItemHtml(set, index) {
  return `
    <article class="shop-item ${state.activeSet === index ? 'active' : ''}" data-select-set="${index}">
      <div class="shop-img"></div>
      <div>
        <h3>${set[0]}</h3>
        <p>${set[1]}</p>
        <div class="price">${money(set[2])}</div>
      </div>
      <button class="add-btn" aria-label="Add ${set[0]}" data-add="${index}">+</button>
    </article>
  `;
}

function renderShop(search) {
  const root = document.getElementById('shop');
  if (!root) return;
  const list = dataset().sets.map((set, index) => ({ set, index }))
    .filter(({ set }) => itemMatches(set, search));
  if (list.length && !list.some(({ index }) => index === state.activeSet)) {
    state.activeSet = list[0].index;
  }
  root.innerHTML = list.length
    ? list.map(({ set, index }) => shopItemHtml(set, index)).join('')
    : `<div class="empty-state">${textOf('noResults')}</div>`;
  root.querySelectorAll('[data-select-set]').forEach(item => {
    item.addEventListener('click', () => {
      state.activeSet = Number(item.dataset.selectSet);
      renderShop(search);
      renderSetDetail();
    });
  });
  root.querySelectorAll('[data-add]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      addToCart(Number(button.dataset.add));
      renderSetDetail();
    });
  });
}

function renderSetDetail() {
  const root = document.getElementById('detailTitle');
  if (!root) return;
  const set = dataset().sets[state.activeSet] || dataset().sets[0];
  document.getElementById('detailTitle').textContent = set[0];
  document.getElementById('detailPrice').textContent = money(set[2]);
  document.getElementById('detailCopy').textContent = set[3] || dataset().detailCopy;
  document.getElementById('includes').innerHTML = (set[4] || []).map((item, index) => `
    <div class="include">${index % 2 ? icon.gift : icon.stars}<span>${item}</span></div>
  `).join('');
}

function renderCartLines() {
  const root = document.getElementById('cartLines');
  if (!root) return;
  const lines = cartEntries();
  if (!lines.length) {
    root.innerHTML = `<div class="cart-line"><span>${textOf('emptyCart')}</span><strong>฿0</strong></div>`;
  } else {
    root.innerHTML = lines.map(([id, qty]) => {
      const set = dataset().sets[id];
      return `<div class="cart-line interactive">
          <span>${set[0]}</span>
          <span class="qty-control">
            <button data-qty-minus="${id}">-</button>
            <strong>${qty}</strong>
            <button data-qty-plus="${id}">+</button>
          </span>
          <strong>${money(set[2] * qty)}</strong>
        </div>`;
    }).join('');
  }
  const subtotal = lines.reduce((sum, [id, qty]) => sum + dataset().sets[id][2] * qty, 0);
  const fee = subtotal ? 50 : 0;
  document.getElementById('deliveryFee').textContent = money(fee);
  document.getElementById('total').textContent = money(subtotal + fee);

  root.querySelectorAll('[data-qty-plus]').forEach(button => {
    button.addEventListener('click', () => {
      updateCart(Number(button.dataset.qtyPlus), 1);
      renderCartLines();
    });
  });
  root.querySelectorAll('[data-qty-minus]').forEach(button => {
    button.addEventListener('click', () => {
      updateCart(Number(button.dataset.qtyMinus), -1);
      renderCartLines();
    });
  });
}

function renderLanguages() {
  const root = document.getElementById('languageList');
  if (!root) return;
  root.innerHTML = languageOptions.map(([code, label, flag]) => `
    <button class="lang-button ${state.lang === code ? 'active' : ''}" data-lang="${code}">
      <span class="flag ${flag}">${flag === 'cn' || flag === 'vn' ? '★' : ''}</span><span>${label}</span>
    </button>
  `).join('');
  root.querySelectorAll('[data-lang]').forEach(button => {
    button.addEventListener('click', () => {
      state.lang = button.dataset.lang;
      showToast(button.textContent.trim());
      setTimeout(() => location.reload(), 250);
    });
  });
}

function renderUserPage() {
  const root = document.getElementById('userProfile');
  if (!root) return;
  root.innerHTML = `
    <section class="profile-grid">
      <article class="profile-card">
        <h3 data-i18n="userTitle">${textOf('userTitle')}</h3>
        <p data-i18n="userGreeting">${textOf('userGreeting')}</p>
      </article>
      <article class="profile-card">
        <h3 data-i18n="selectedLanguageLabel">${textOf('selectedLanguageLabel')}</h3>
        <p>${languageOptions.find(([code]) => code === state.lang)?.[1] || 'ไทย'}</p>
        <a class="ruby-btn full" style="margin-top:12px;" href="language.html" data-i18n="languageShortcut">${textOf('languageShortcut')}</a>
      </article>
      <article class="profile-card">
        <h3 data-i18n="openCartShortcut">${textOf('openCartShortcut')}</h3>
        <p>${cartQuantity()} item(s)</p>
        <a class="gold-btn full" style="margin-top:12px;" href="cart.html" data-i18n="openCartShortcut">${textOf('openCartShortcut')}</a>
      </article>
    </section>
  `;
}

function renderPlaceDetail() {
  const root = document.getElementById('placeDetail');
  if (!root) return;
  const id = Number(param('id') || 0);
  const place = dataset().places[id] || dataset().places[0];
  document.getElementById('placeTitle').textContent = place[0];
  document.getElementById('placeMeta').innerHTML =
    `<span>${place[1]}</span><span class="rating">★ ${place[2]}</span><span>${place[3]}</span>`;
  document.getElementById('placeCopy').textContent = place[4];
  const recommend = document.getElementById('placeRecommend');
  if (recommend) {
    recommend.addEventListener('click', () => {
      const recommendSet = Number(place[5] ?? 0);
      state.activeSet = recommendSet;
      location.href = `sets.html?set=${recommendSet}`;
    });
  }
}

/* ---------------- Init ---------------- */

function initSearch(handler) {
  const input = document.getElementById('search');
  if (!input) return;
  input.value = searchQuery();
  const submit = input.parentElement?.querySelector('.icon-btn');
  const currentPage = location.pathname.split('/').pop() || 'places.html';
  const targetPage = document.body.dataset.page === 'home' ? 'places.html' : currentPage;
  const navigateToSearch = () => {
    location.href = `${targetPage}?q=${encodeURIComponent(input.value.trim())}`;
  };
  const commit = () => {
    setSearch(input.value);
    handler(input.value);
  };
  input.addEventListener('input', event => handler(event.target.value));
  input.addEventListener('change', commit);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      commit();
      navigateToSearch();
    }
  });
  if (submit) {
    submit.addEventListener('click', () => {
      commit();
      navigateToSearch();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyText();
  syncCartTabLabel();
  updateBadge();

  const page = document.body.dataset.page;

  if (page === 'home') {
    renderCategories();
    const query = searchQuery();
    renderPlaces('places', query, 3);
    initSearch(value => {
      setSearch(value);
      renderPlaces('places', value, 3);
    });
  }

  if (page === 'places') {
    const query = searchQuery();
    renderPlaces('placesFull', query);
    initSearch(value => {
      setSearch(value);
      renderPlaces('placesFull', value);
    });
  }

  if (page === 'place') {
    renderPlaceDetail();
  }

  if (page === 'sets') {
    const requestedSet = Number(param('set'));
    if (Number.isInteger(requestedSet) && dataset().sets[requestedSet]) {
      state.activeSet = requestedSet;
    }
    const query = searchQuery();
    renderShop(query);
    renderSetDetail();
    initSearch(value => {
      setSearch(value);
      renderShop(value);
    });
    const add = document.getElementById('addDetail');
    if (add) add.addEventListener('click', () => {
      addToCart(state.activeSet);
      renderSetDetail();
    });
  }

  if (page === 'cart') {
    renderCartLines();
    const confirm = document.getElementById('confirmOrder');
    if (confirm) confirm.addEventListener('click', () => showToast(textOf('orderReady')));
  }

  if (page === 'lang') {
    renderLanguages();
  }

  if (page === 'user') {
    renderUserPage();
  }
});
