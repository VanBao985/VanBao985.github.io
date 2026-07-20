/**
 * admin.js — giao dien quan li: dang nhap, nen anh, upload, xoa.
 *
 * Luong upload:
 *   file goc -> nen bang Canvas -> base64 -> PUT len repo (1 commit/anh)
 *   -> cap nhat memories.json (1 commit cuoi) -> GitHub Pages tu rebuild.
 */

import {
  REPO, IMAGE_DIR, auth, verifyToken, putFile, getFile, deleteFile,
  loadDatabase, saveDatabase, blobToBase64,
} from './github.js';

/* Cau hinh nen anh — chinh o day neu muon anh net hon / nhe hon */
const COMPRESS = {
  maxDimension: 2000,   // canh dai nhat, tinh bang pixel
  quality: 0.82,        // chat luong JPEG (0–1)
  skipUnder: 300 * 1024, // file nho hon nguong nay thi giu nguyen
};

const $ = (id) => document.getElementById(id);

const view = { login: $('login-view'), app: $('app-view') };
let db = { albums: [], photos: [] };
let queue = [];   // { id, file, blob, previewUrl, width, height, title, desc }

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const kb = (bytes) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

function notify(msg, kind = 'info') {
  const el = $('global-msg');
  el.className = `alert alert--${kind}`;
  el.innerHTML = msg;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

const clearNotify = () => { $('global-msg').innerHTML = ''; };

/** Bo dau tieng Viet + ki tu dac biet -> ten file an toan cho URL. */
function slugify(str) {
  return str
    .normalize('NFD')                 // tach nguyen am va dau thanh
    .replace(/\p{Diacritic}/gu, '')   // bo dau thanh
    .replace(/[đ]/g, 'd')        // d gach ngang (thuong)
    .replace(/[Đ]/g, 'D')        // D gach ngang (hoa)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'anh';
}

/* ------------------------------------------------------------------ *
 * Nen anh bang Canvas
 * ------------------------------------------------------------------ */

async function compress(file) {
  // imageOrientation:'from-image' -> ton trong EXIF orientation, tranh
  // truong hop anh chup doc bi xoay ngang sau khi ve len canvas.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const scale = Math.min(1, COMPRESS.maxDimension / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  // File da nho va khong can thu nho -> giu nguyen ban goc
  if (scale === 1 && file.size < COMPRESS.skipUnder) {
    bitmap.close();
    return { blob: file, width: w, height: h };
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', COMPRESS.quality)
  );

  // Neu nen xong lai to hon ban goc thi dung ban goc
  if (!blob || blob.size >= file.size) return { blob: file, width: w, height: h };
  return { blob, width: w, height: h };
}

/* ------------------------------------------------------------------ *
 * Dang nhap
 * ------------------------------------------------------------------ */

async function boot() {
  if (!auth.has()) return showLogin();

  try {
    await verifyToken();
    await showApp();
  } catch (err) {
    showLogin(err.message);
  }
}

function showLogin(errorMsg = '') {
  view.login.hidden = false;
  view.app.hidden = true;
  $('logout').hidden = true;
  $('login-error').textContent = errorMsg;
}

async function showApp() {
  view.login.hidden = true;
  view.app.hidden = false;
  $('logout').hidden = false;
  await refreshDatabase();
}

$('login-btn').addEventListener('click', async () => {
  const token = $('token').value.trim();
  if (!token) return void ($('login-error').textContent = 'Vui lòng dán token.');

  const btn = $('login-btn');
  btn.disabled = true;
  btn.textContent = 'Đang kiểm tra…';
  $('login-error').textContent = '';

  auth.set(token);
  try {
    await verifyToken();
    $('token').value = '';
    await showApp();
  } catch (err) {
    auth.clear();
    $('login-error').textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
  }
});

$('token').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('login-btn').click();
});

$('logout').addEventListener('click', () => {
  auth.clear();
  location.reload();
});

/* ------------------------------------------------------------------ *
 * Database
 * ------------------------------------------------------------------ */

async function refreshDatabase() {
  try {
    const result = await loadDatabase();
    db = result.db;
    renderAlbumOptions();
    renderManageList();
  } catch (err) {
    notify(`Không đọc được dữ liệu: ${esc(err.message)}`, 'error');
  }
}

function renderAlbumOptions() {
  $('album').innerHTML =
    '<option value="">— Không thuộc album nào —</option>' +
    db.albums
      .map((a) => `<option value="${esc(a.id)}">${esc(a.name)}</option>`)
      .join('');
}

function renderManageList() {
  const list = $('manage-list');
  const photos = [...db.photos].sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );

  $('manage-count').textContent = photos.length
    ? `${photos.length} ảnh đang hiển thị trên thư viện.`
    : 'Chưa có ảnh nào.';

  list.innerHTML = photos
    .map((p) => {
      const album = db.albums.find((a) => a.id === p.album)?.name;
      const meta = [album, p.date, p.location].filter(Boolean).join(' · ');
      return `
        <div class="manage-row" data-id="${esc(p.id)}">
          <img src="${esc(p.src)}" alt="" loading="lazy">
          <div>
            <div class="manage-row__title">${esc(p.title || '(không tiêu đề)')}</div>
            <div class="manage-row__meta">${esc(meta)}</div>
          </div>
          <button class="btn btn--danger" data-delete="${esc(p.id)}">Xoá</button>
        </div>`;
    })
    .join('');
}

$('manage-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-delete]');
  if (!btn) return;

  const id = btn.dataset.delete;
  const photo = db.photos.find((p) => p.id === id);
  if (!photo) return;

  if (!confirm(`Xoá "${photo.title || 'ảnh này'}"?\n\nHành động này không hoàn tác được.`)) return;

  btn.disabled = true;
  btn.textContent = 'Đang xoá…';
  clearNotify();

  try {
    // Xoa file anh truoc (bo qua neu file khong con ton tai), roi go
    // ban ghi khoi memories.json.
    const { sha } = await getFile(photo.src);
    if (sha) {
      await deleteFile({ path: photo.src, sha, message: `xoa anh: ${photo.title || photo.id}` });
    }

    db.photos = db.photos.filter((p) => p.id !== id);
    await saveDatabase(db, `xoa ki niem: ${photo.title || photo.id}`);

    renderManageList();
    notify('Đã xoá. Thư viện sẽ cập nhật sau khoảng 1 phút.', 'ok');
  } catch (err) {
    notify(`Xoá thất bại: ${esc(err.message)}`, 'error');
    btn.disabled = false;
    btn.textContent = 'Xoá';
  }
});

/* ------------------------------------------------------------------ *
 * Chon file
 * ------------------------------------------------------------------ */

const dz = $('dropzone');

dz.addEventListener('click', () => $('file-input').click());
dz.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    $('file-input').click();
  }
});

['dragenter', 'dragover'].forEach((ev) =>
  dz.addEventListener(ev, (e) => {
    e.preventDefault();
    dz.classList.add('is-over');
  })
);

['dragleave', 'drop'].forEach((ev) =>
  dz.addEventListener(ev, (e) => {
    e.preventDefault();
    dz.classList.remove('is-over');
  })
);

dz.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
$('file-input').addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = ''; // cho phep chon lai cung file
});

async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;

  clearNotify();
  dz.querySelector('strong').textContent = 'Đang xử lí ảnh…';

  for (const file of files) {
    try {
      const { blob, width, height } = await compress(file);
      queue.push({
        id: crypto.randomUUID(),
        file,
        blob,
        previewUrl: URL.createObjectURL(blob),
        width,
        height,
        title: file.name.replace(/\.[^.]+$/, ''),
        desc: '',
      });
    } catch {
      notify(`Không xử lí được ảnh "${esc(file.name)}" — có thể file bị lỗi.`, 'error');
    }
  }

  dz.querySelector('strong').textContent = 'Kéo thả ảnh vào đây';
  renderQueue();
}

function renderQueue() {
  const hasItems = queue.length > 0;
  $('batch-fields').hidden = !hasItems;
  $('upload-actions').hidden = !hasItems;
  $('upload-actions').style.display = hasItems ? 'flex' : 'none';

  $('queue').innerHTML = queue
    .map((item) => {
      const saved = item.file.size - item.blob.size;
      const note =
        saved > 1024
          ? `<span class="size-note">${kb(item.file.size)} → ${kb(item.blob.size)}</span>`
          : kb(item.blob.size);

      return `
        <div class="queue-item" data-id="${item.id}">
          <img class="queue-item__thumb" src="${item.previewUrl}" alt="">
          <div>
            <p class="queue-item__name">${esc(item.file.name)} · ${note} · ${item.width}×${item.height}</p>
            <div class="field" style="margin-bottom:.6rem">
              <input class="input" data-field="title" value="${esc(item.title)}" placeholder="Tiêu đề">
            </div>
            <textarea class="textarea" data-field="desc" rows="2"
              placeholder="Kể lại một chút về khoảnh khắc này…">${esc(item.desc)}</textarea>
          </div>
          <button class="btn btn--danger queue-item__remove" data-remove="${item.id}"
                  aria-label="Bỏ ảnh này">✕</button>
        </div>`;
    })
    .join('');

  $('upload-btn').textContent = `Tải lên ${queue.length} ảnh`;
}

// Ghi lai gia tri nguoi dung go, tranh mat khi re-render
$('queue').addEventListener('input', (e) => {
  const field = e.target.dataset.field;
  if (!field) return;
  const id = e.target.closest('.queue-item').dataset.id;
  const item = queue.find((q) => q.id === id);
  if (item) item[field === 'title' ? 'title' : 'desc'] = e.target.value;
});

$('queue').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-remove]');
  if (!btn) return;
  const id = btn.dataset.remove;
  const item = queue.find((q) => q.id === id);
  if (item) URL.revokeObjectURL(item.previewUrl);
  queue = queue.filter((q) => q.id !== id);
  renderQueue();
});

$('clear-btn').addEventListener('click', () => {
  queue.forEach((q) => URL.revokeObjectURL(q.previewUrl));
  queue = [];
  renderQueue();
});

/* ------------------------------------------------------------------ *
 * Upload
 * ------------------------------------------------------------------ */

$('upload-btn').addEventListener('click', async () => {
  if (!queue.length) return;

  const btn = $('upload-btn');
  btn.disabled = true;
  $('clear-btn').disabled = true;
  $('upload-progress').hidden = false;
  clearNotify();

  const setProgress = (done, total, label) => {
    $('progress-bar').style.width = `${(done / total) * 100}%`;
    $('progress-label').textContent = label;
  };

  try {
    // 1. Album: tao moi neu nguoi dung nhap ten
    let albumId = $('album').value;
    const newAlbumName = $('new-album').value.trim();

    if (newAlbumName) {
      albumId = slugify(newAlbumName);
      if (!db.albums.some((a) => a.id === albumId)) {
        db.albums.push({ id: albumId, name: newAlbumName, order: db.albums.length + 1 });
      }
    }

    const date = $('date').value || new Date().toISOString().slice(0, 10);
    const location = $('location').value.trim();
    const people = $('people').value.split(',').map((s) => s.trim()).filter(Boolean);

    // 2. Upload tung anh — moi anh la mot commit rieng
    const total = queue.length;
    const uploaded = [];

    for (let i = 0; i < total; i++) {
      const item = queue[i];
      setProgress(i, total, `Đang tải ảnh ${i + 1}/${total}: ${item.file.name}`);

      const ext = item.blob.type === 'image/png' ? 'png' : 'jpg';
      const path = `${IMAGE_DIR}/${date}-${slugify(item.title)}-${item.id.slice(0, 6)}.${ext}`;

      await putFile({
        path,
        contentBase64: await blobToBase64(item.blob),
        message: `them anh: ${item.title}`,
      });

      uploaded.push({
        id: item.id,
        src: path,
        title: item.title.trim(),
        description: item.desc.trim(),
        date,
        album: albumId,
        location,
        people,
        width: item.width,
        height: item.height,
        uploadedAt: new Date().toISOString(),
      });
    }

    // 3. Ghi metadata mot lan duy nhat o cuoi
    setProgress(total, total, 'Đang cập nhật dữ liệu…');
    db.photos.push(...uploaded);
    await saveDatabase(db, `them ${total} ki niem moi`);

    // 4. Don dep
    queue.forEach((q) => URL.revokeObjectURL(q.previewUrl));
    queue = [];
    renderQueue();
    $('new-album').value = '';
    renderAlbumOptions();
    renderManageList();

    notify(
      `Đã tải lên ${total} ảnh. GitHub Pages cần khoảng <strong>1–2 phút</strong> để build lại — ` +
      `sau đó ảnh sẽ hiện ở <a href="./">thư viện</a>.`,
      'ok'
    );
  } catch (err) {
    notify(
      `Tải lên thất bại: ${esc(err.message)}<br>` +
      `Những ảnh đã lên trước đó vẫn được giữ. Bạn có thể thử lại.`,
      'error'
    );
  } finally {
    btn.disabled = false;
    $('clear-btn').disabled = false;
    setTimeout(() => { $('upload-progress').hidden = true; }, 1200);
  }
});

/* Canh bao neu dong tab giua chung khi con anh chua upload */
window.addEventListener('beforeunload', (e) => {
  if (queue.length) e.preventDefault();
});

boot();
