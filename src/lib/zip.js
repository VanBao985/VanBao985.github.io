/**
 * A minimal ZIP writer — just enough to bundle a folder of photos in the browser.
 *
 * Entries are STORED, never deflated. Photos out of a camera are already
 * compressed, so deflating them would burn seconds of main-thread CPU per file
 * to save roughly nothing. Storing is also what keeps this small enough to
 * hand-roll: a general-purpose zip library is ~100 kB of bundle for a feature
 * that only ever packs JPEGs.
 *
 * No ZIP64 support, so the archive and every entry in it must stay under 4 GB.
 * In practice the browser runs out of memory long before that — callers should
 * check the total size first (see MAX_TOTAL_BYTES in downloadFolder.js).
 */

/** Bit 11 tells the extractor that names are UTF-8, not CP437. Vietnamese
 *  file names come out mangled in Windows Explorer without it. */
const FLAG_UTF8 = 0x0800;
const VERSION = 20; // 2.0 — the floor for a stored entry

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let bit = 0; bit < 8; bit += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** ZIP stores timestamps in the 1980-epoch DOS format, not Unix time. */
function dosStamp(when) {
  const year = Math.max(1980, when.getFullYear());
  return {
    time: (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate(),
  };
}

/**
 * Drive allows both slashes and duplicate names inside one folder; a zip
 * tolerates neither. A slash would silently become a directory, and a repeated
 * name leaves the extractor to pick a winner — one photo would just vanish.
 */
function entryName(taken, raw) {
  const flat = String(raw || 'photo').replace(/[\\/]+/g, '-');
  if (!taken.has(flat)) {
    taken.add(flat);
    return flat;
  }

  const dot = flat.lastIndexOf('.');
  const stem = dot > 0 ? flat.slice(0, dot) : flat;
  const ext = dot > 0 ? flat.slice(dot) : '';
  for (let n = 2; ; n += 1) {
    const candidate = `${stem} (${n})${ext}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
}

function localHeader(entry) {
  const head = new Uint8Array(30 + entry.name.length);
  const view = new DataView(head.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, VERSION, true);
  view.setUint16(6, FLAG_UTF8, true);
  view.setUint16(8, 0, true); // stored
  view.setUint16(10, entry.time, true);
  view.setUint16(12, entry.date, true);
  view.setUint32(14, entry.crc, true);
  view.setUint32(18, entry.size, true); // compressed
  view.setUint32(22, entry.size, true); // uncompressed
  view.setUint16(26, entry.name.length, true);
  view.setUint16(28, 0, true); // no extra field
  head.set(entry.name, 30);
  return head;
}

function centralHeader(entry) {
  const head = new Uint8Array(46 + entry.name.length);
  const view = new DataView(head.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, VERSION, true); // version made by
  view.setUint16(6, VERSION, true); // version needed
  view.setUint16(8, FLAG_UTF8, true);
  view.setUint16(10, 0, true); // stored
  view.setUint16(12, entry.time, true);
  view.setUint16(14, entry.date, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.size, true);
  view.setUint32(24, entry.size, true);
  view.setUint16(28, entry.name.length, true);
  view.setUint16(30, 0, true); // extra
  view.setUint16(32, 0, true); // comment
  view.setUint16(34, 0, true); // disk number
  view.setUint16(36, 0, true); // internal attributes
  view.setUint32(38, 0, true); // external attributes
  view.setUint32(42, entry.offset, true);
  head.set(entry.name, 46);
  return head;
}

function endOfCentralDirectory(count, size, offset) {
  const tail = new Uint8Array(22);
  const view = new DataView(tail.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true); // this disk
  view.setUint16(6, 0, true); // disk holding the directory
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, size, true);
  view.setUint32(16, offset, true);
  view.setUint16(20, 0, true); // no archive comment
  return tail;
}

export class ZipWriter {
  constructor() {
    this.parts = [];
    this.entries = [];
    this.taken = new Set();
    this.offset = 0;
    this.encoder = new TextEncoder();
  }

  /** Append one stored file. `bytes` is not retained — it is handed to a Blob,
   *  which lets the browser page it out to disk instead of holding the whole
   *  archive in JS memory. */
  add(name, bytes) {
    const stamp = dosStamp(new Date());
    const entry = {
      name: this.encoder.encode(entryName(this.taken, name)),
      crc: crc32(bytes),
      size: bytes.length,
      offset: this.offset,
      ...stamp,
    };

    const head = localHeader(entry);
    this.parts.push(head, new Blob([bytes]));
    this.offset += head.length + bytes.length;
    this.entries.push(entry);
  }

  /** Seal the archive and hand back something an <a download> can point at. */
  finish() {
    const directoryOffset = this.offset;
    let directorySize = 0;

    for (const entry of this.entries) {
      const head = centralHeader(entry);
      this.parts.push(head);
      directorySize += head.length;
    }

    this.parts.push(
      endOfCentralDirectory(this.entries.length, directorySize, directoryOffset),
    );
    return new Blob(this.parts, { type: 'application/zip' });
  }
}
