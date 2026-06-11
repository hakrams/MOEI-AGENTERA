const fs = require("fs");
const path = require("path");

const STORE_DEFINITIONS = {
  events: [],
  profiles: [],
  channelSessions: [],
  proactiveNotifications: [],
  csatRatings: [],
  copilotNotes: [],
  idCounters: {}
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function createChallenge3LiveStore(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, "../../../..");
  const dataDir = options.dataDir || path.join(rootDir, "data", "live", "challenge-3");

  function storePath(storeName) {
    if (!Object.prototype.hasOwnProperty.call(STORE_DEFINITIONS, storeName)) {
      throw new Error(`Unknown Challenge 3 live store: ${storeName}`);
    }
    return path.join(dataDir, `${storeName}.json`);
  }

  function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  function ensureStore(storeName) {
    ensureDataDir();
    const filePath = storePath(storeName);
    if (!fs.existsSync(filePath)) {
      writeStore(storeName, clone(STORE_DEFINITIONS[storeName]));
    }
    return filePath;
  }

  function ensureAllStores() {
    Object.keys(STORE_DEFINITIONS).forEach(ensureStore);
  }

  function readStore(storeName) {
    const filePath = ensureStore(storeName);
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      throw new Error(`Failed to read ${storeName}: ${error.message}`);
    }
  }

  function writeStore(storeName, value) {
    ensureDataDir();
    const filePath = storePath(storeName);
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(tempPath, filePath);
    return value;
  }

  function updateStore(storeName, updater) {
    const current = readStore(storeName);
    const next = updater(clone(current));
    writeStore(storeName, next);
    return next;
  }

  function clearStores() {
    Object.entries(STORE_DEFINITIONS).forEach(([storeName, emptyValue]) => {
      writeStore(storeName, clone(emptyValue));
    });
  }

  function counts() {
    ensureAllStores();
    return Object.fromEntries(Object.keys(STORE_DEFINITIONS).map((storeName) => {
      const value = readStore(storeName);
      return [storeName, Array.isArray(value) ? value.length : Object.keys(value).length];
    }));
  }

  function health() {
    ensureAllStores();
    const stores = Object.keys(STORE_DEFINITIONS).map((storeName) => {
      const filePath = storePath(storeName);
      let writable = false;
      try {
        fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
        writable = true;
      } catch {
        writable = false;
      }
      const value = readStore(storeName);
      return {
        storeName,
        path: path.relative(rootDir, filePath),
        exists: fs.existsSync(filePath),
        writable,
        count: Array.isArray(value) ? value.length : Object.keys(value).length
      };
    });
    return {
      status: stores.every((store) => store.exists && store.writable) ? "ok" : "degraded",
      checkedAt: nowIso(),
      dataDir: path.relative(rootDir, dataDir),
      stores
    };
  }

  function nextId(prefix) {
    const counters = readStore("idCounters");
    const current = Number(counters[prefix] || 0) + 1;
    counters[prefix] = current;
    writeStore("idCounters", counters);
    return `${prefix}-${String(current).padStart(6, "0")}`;
  }

  function appendEvent(event) {
    return updateStore("events", (events) => {
      events.push(event);
      return events;
    });
  }

  function getCustomerEvents(customerId, limit = 10) {
    const events = readStore("events");
    return events
      .filter((e) => e.customerId === customerId)
      .slice(-limit);
  }

  function getOrCreateProfile(customerId, identityFromTrustGate) {
    const profiles = readStore("profiles");
    const existing = profiles.find((p) => p.customerId === customerId);
    if (existing) return existing;

    const profile = {
      customerId,
      ...identityFromTrustGate,
      firstSeenAt: nowIso(),
      lastSeenAt: nowIso(),
      repeatContactCount: 0,
      preferredChannel: identityFromTrustGate.preferredChannel || "website"
    };
    updateStore("profiles", (list) => {
      list.push(profile);
      return list;
    });
    return profile;
  }

  function updateProfileLastSeen(customerId, channel) {
    updateStore("profiles", (profiles) => {
      const idx = profiles.findIndex((p) => p.customerId === customerId);
      if (idx !== -1) {
        profiles[idx].lastSeenAt = nowIso();
        profiles[idx].repeatContactCount = (profiles[idx].repeatContactCount || 0) + 1;
        profiles[idx].preferredChannel = channel;
      }
      return profiles;
    });
  }

  return {
    dataDir,
    ensureAllStores,
    readStore,
    writeStore,
    updateStore,
    clearStores,
    counts,
    health,
    nextId,
    appendEvent,
    getCustomerEvents,
    getOrCreateProfile,
    updateProfileLastSeen
  };
}

module.exports = {
  STORE_DEFINITIONS,
  createChallenge3LiveStore
};
