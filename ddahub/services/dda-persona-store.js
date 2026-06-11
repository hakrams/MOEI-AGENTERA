"use strict";

const fs = require("fs");
const path = require("path");

const STORE_DEFAULTS = {
  personas: [],
  links: [],
  audit: []
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDdaPersonaStore(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, "../..");
  const dataDir = options.dataDir || path.join(rootDir, "ddahub", "data");
  const seedPersonasPath = options.seedPersonasPath || path.join(__dirname, "..", "data", "demo-personas.seed.json");

  function storePath(name) {
    if (!Object.prototype.hasOwnProperty.call(STORE_DEFAULTS, name)) {
      throw new Error(`Unknown DDAHub store: ${name}`);
    }
    const fileName = name === "personas"
      ? "dda-personas.json"
      : name === "links"
        ? "dda-links.json"
        : "dda-audit.json";
    return path.join(dataDir, fileName);
  }

  function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  function writeStore(name, value) {
    ensureDataDir();
    const filePath = storePath(name);
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(tempPath, filePath);
    return value;
  }

  function readSeedPersonas() {
    return JSON.parse(fs.readFileSync(seedPersonasPath, "utf8"));
  }

  function ensureStore(name) {
    ensureDataDir();
    const filePath = storePath(name);
    if (!fs.existsSync(filePath)) {
      const value = name === "personas" ? readSeedPersonas() : clone(STORE_DEFAULTS[name]);
      writeStore(name, value);
    }
    return filePath;
  }

  function ensureAllStores() {
    Object.keys(STORE_DEFAULTS).forEach(ensureStore);
  }

  function readStore(name) {
    const filePath = ensureStore(name);
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      throw new Error(`Failed to read DDAHub ${name}: ${error.message}`);
    }
  }

  function updateStore(name, updater) {
    const current = readStore(name);
    const next = updater(clone(current));
    writeStore(name, next);
    return next;
  }

  function resetDemo() {
    const personas = readSeedPersonas().map((persona) => ({
      ...persona,
      linked: false,
      linkedTrustGateId: null,
      linkedEmiratesId: null,
      lockStatus: "available"
    }));
    writeStore("personas", personas);
    writeStore("links", []);
    writeStore("audit", []);
    return { personas: personas.length, links: 0, audit: 0 };
  }

  function health() {
    ensureAllStores();
    const stores = Object.keys(STORE_DEFAULTS).map((name) => {
      const filePath = storePath(name);
      const value = readStore(name);
      return {
        storeName: name,
        path: path.relative(rootDir, filePath),
        exists: fs.existsSync(filePath),
        count: Array.isArray(value) ? value.length : 0
      };
    });
    return {
      service: "ddahub",
      status: stores.every((store) => store.exists) ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      dataDir: path.relative(rootDir, dataDir),
      stores
    };
  }

  return {
    rootDir,
    dataDir,
    ensureAllStores,
    readStore,
    writeStore,
    updateStore,
    resetDemo,
    health
  };
}

module.exports = { createDdaPersonaStore };
