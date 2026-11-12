/* Warrant — local storage layer (IndexedDB with localStorage + memory fallbacks). All data stays on device. */
(function (root) {
  'use strict';
  const DB = 'warrant', STORE = 'kv', VERSION = 1;
  let dbp = null;
  const mem = {};

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      try {
        if (!root.indexedDB) return resolve(null);
        const req = root.indexedDB.open(DB, VERSION);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return dbp;
  }

  async function get(key) {
    const db = await open();
    if (db) {
      try {
        return await new Promise((res, rej) => {
          const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      } catch (e) { /* fall through */ }
    }
    try { const v = root.localStorage.getItem('warrant:' + key); if (v != null) return JSON.parse(v); } catch (e) { }
    return mem[key];
  }

  async function set(key, value) {
    mem[key] = value;
    const db = await open();
    if (db) {
      try {
        await new Promise((res, rej) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(value, key);
          tx.oncomplete = res; tx.onerror = () => rej(tx.error);
        });
        return true;
      } catch (e) { /* fall through */ }
    }
    try { root.localStorage.setItem('warrant:' + key, JSON.stringify(value)); return true; } catch (e) { }
    return false;
  }

  async function persist() {
    try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { }
    return false;
  }

  root.Store = { get, set, persist };
})(window);
