/**
 * app.js — trang thu vien cong khai.
 *
 * Doc truc tiep data/memories.json tu chinh site (khong goi GitHub API,
 * khong can token) nen khach vao xem hoan toan an danh.
 */

const els = {
  gallery: document.getElementById('gallery'),
  state: document.getElementById('state'),
  toolbar: document.getElementById('toolbar'),
  chips: document.getElementById('album-chips'),
  search: document.getElementById('q'),
  stats: document.getElementById('stats'),
  statPhotos: document.getElementById('stat-photos'),
  statAlbums: document.getElementById('stat-albums'),
  statSpan: document.getElementById('stat-span'),
};

const lb = {
  root: document.getElementById('lightbox'),
  img: document.getElementById('lb-img'),
  title: document.getElementById('lb-title'),
  desc: document.getElementById('lb-desc'),
  meta: document.getElementById('lb-meta'),
  close: document.getElementById('lb-close'),
  prev: document.getElementById('lb-prev'),
  next: document.getElementById('lb-next'),
};

let db = { albums: [], photos: [] };
let visible = [];          // ket qua sau khi loc — lightbox dieu huong tren mang nay
let activeAlbum = 'all';
let query = '';
let lbIndex = -1;

document.getElementById('year').textContent = new Date().getFullYear();

/* ------------------------------------------------------------------ *
 * Utils
 * ------------------------------------------------------------------ */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const albumName = (id) =>
  db.albums.find((a) => a.id === id)?.name || '';

/* ------------------------------------------------------------------ *
 * Load
 * ------------------------------------------------------------------ */

async function load() {
  showState('<div class="spinner" style="margin:0 auto 1rem"></div><p>Đang tải kỉ niệm…</p>');

  try {
    // cache-bust: GitHub Pages dat Cache-Control kha dai, khong co tham so
    // nay thi anh moi upload se khong hien ngay.
    const res = await fetch(`data/memories.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    db.albums = raw.albums || [];
    db.photos = (raw.photos || []).sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
  } catch (err) {
    showState(`
      <h2>Chưa tải được dữ liệu</h2>
      <p>Không đọc được <code>data/memories.json</code> (${esc(err.message)}).
      Nếu bạn vừa tạo site, hãy chờ GitHub Pages build xong rồi tải lại trang.</p>`);
    return;
  }

  if (!db.photos.length) {
    showState(`
      <h2>Chưa có kỉ niệm nào</h2>
      <p>Bộ sưu tập đang trống. Vào trang <a href="admin.html">Quản lí</a>
      để tải những tấm ảnh đầu tiên lên.</p>`);
    return;
  }

  renderStats();
  renderChips();
  els.toolbar.hidden = false;
  els.stats.hidden = false;
  render();
}

function showState(html) {
  els.state.innerHTML = html;
  els.state.style.display = html ? '' : 'none';
}

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

function renderStats() {
  els.statPhotos.textContent = db.photos.length;
  els.statAlbums.textContent = db.albums.length;

  const years = db.photos
    .map((p) => new Date(p.date).getFullYear())
    .filter((y) => !Number.isNaN(y));

  if (years.length) {
    const lo = Math.min(...years);
    const hi = Math.max(...years);
    els.statSpan.textContent = lo === hi ? String(lo) : `${lo}–${hi}`;
  }
}

function renderChips() {
  const counts = new Map();
  for (const p of db.photos) {
    counts.set(p.album, (counts.get(p.album) || 0) + 1);
  }

  const items = [
    { id: 'all', name: 'Tất cả', count: db.photos.length },
    ...db.albums
      .filter((a) => counts.get(a.id))
      .map((a) => ({ id: a.id, name: a.name, count: counts.get(a.id) })),
  ];

  els.chips.innerHTML = items
    .map(
      (a) => `<button class="chip" data-album="${esc(a.id)}"
                aria-pressed="${a.id === activeAlbum}">
                ${esc(a.name)}<span class="chip__count">${a.count}</span>
              </button>`
    )
    .join('');
}

function matches(p) {
  if (activeAlbum !== 'all' && p.album !== activeAlbum) return false;
  if (!query) return true;

  const haystack = [
    p.title, p.description, p.location, albumName(p.album),
    ...(p.people || []),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function render() {
  visible = db.photos.filter(matches);

  if (!visible.length) {
    els.gallery.innerHTML = '';
    showState(`
      <h2>Không tìm thấy</h2>
      <p>Không có kỉ niệm nào khớp với bộ lọc hiện tại. Thử từ khoá khác xem sao.</p>`);
    return;
  }

  showState('');

  els.gallery.innerHTML = visible
    .map((p, i) => {
      // width/height duoc luu luc upload -> dat san aspect-ratio de trinh
      // duyet chua cho san cho anh, tranh layout shift (CLS) khi anh load.
      const ratio = p.width && p.height ? `style="aspect-ratio:${p.width}/${p.height}"` : '';
      const album = albumName(p.album);

      const meta = [
        p.date ? `<span>${esc(formatDate(p.date))}</span>` : '',
        p.location ? `<span>📍 ${esc(p.location)}</span>` : '',
        p.people?.length ? `<span>👥 ${esc(p.people.join(', '))}</span>` : '',
      ].join('');

      return `
        <article class="card" data-index="${i}" tabindex="0" role="button"
                 aria-label="Xem ảnh: ${esc(p.title || 'không tiêu đề')}"
                 style="animation-delay:${Math.min(i * 35, 500)}ms">
          <div class="card__media">
            ${album ? `<span class="badge">${esc(album)}</span>` : ''}
            <img src="${esc(p.src)}" alt="${esc(p.title || '')}"
                 loading="lazy" decoding="async" ${ratio}>
          </div>
          <div class="card__body">
            ${p.title ? `<h3 class="card__title">${esc(p.title)}</h3>` : ''}
            ${p.description ? `<p class="card__desc">${esc(p.description)}</p>` : ''}
            ${meta ? `<div class="card__meta">${meta}</div>` : ''}
          </div>
        </article>`;
    })
    .join('');
}

/* ------------------------------------------------------------------ *
 * Lightbox
 * ------------------------------------------------------------------ */

function openLightbox(i) {
  if (i < 0 || i >= visible.length) return;
  lbIndex = i;
  const p = visible[i];

  lb.img.src = p.src;
  lb.img.alt = p.title || '';
  lb.title.textContent = p.title || '';
  lb.desc.textContent = p.description || '';

  lb.meta.innerHTML = [
    p.date ? `<span>${esc(formatDate(p.date))}</span>` : '',
    p.location ? `<span>📍 ${esc(p.location)}</span>` : '',
    albumName(p.album) ? `<span>${esc(albumName(p.album))}</span>` : '',
    p.people?.length ? `<span>👥 ${esc(p.people.join(', '))}</span>` : '',
  ].join('');

  lb.root.hidden = false;
  requestAnimationFrame(() => lb.root.classList.add('is-open'));
  document.body.style.overflow = 'hidden';
  lb.close.focus();

  // preload anh ke tiep de bam mui ten khong bi giat
  const next = visible[i + 1];
  if (next) new Image().src = next.src;
}

function closeLightbox() {
  lb.root.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => {
    lb.root.hidden = true;
    lb.img.src = '';
  }, 250);

  const card = els.gallery.querySelector(`[data-index="${lbIndex}"]`);
  card?.focus();
  lbIndex = -1;
}

const step = (delta) => openLightbox((lbIndex + delta + visible.length) % visible.length);

/* ------------------------------------------------------------------ *
 * Events — dung event delegation, khong gan listener cho tung card
 * ------------------------------------------------------------------ */

els.gallery.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) openLightbox(Number(card.dataset.index));
});

els.gallery.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.card');
  if (!card) return;
  e.preventDefault();
  openLightbox(Number(card.dataset.index));
});

els.chips.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  activeAlbum = chip.dataset.album;
  els.chips.querySelectorAll('.chip').forEach((c) =>
    c.setAttribute('aria-pressed', String(c === chip))
  );
  render();
});

// debounce 180ms de khong render lai sau moi phim go
let searchTimer;
els.search.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const value = e.target.value.trim().toLowerCase();
  searchTimer = setTimeout(() => {
    query = value;
    render();
  }, 180);
});

lb.close.addEventListener('click', closeLightbox);
lb.prev.addEventListener('click', () => step(-1));
lb.next.addEventListener('click', () => step(1));

lb.root.addEventListener('click', (e) => {
  // chi dong khi bam vao nen, khong dong khi bam trung anh
  if (e.target === lb.root || e.target.classList.contains('lightbox__stage')) {
    closeLightbox();
  }
});

document.addEventListener('keydown', (e) => {
  if (lb.root.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'ArrowRight') step(1);
});

load();
