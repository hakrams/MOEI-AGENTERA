"use strict";

const fs = require("fs");
const path = require("path");

const COUNTRIES_DIR = path.join(__dirname, "../../data/countries");

let countryCache = null;

function loadCountries() {
  if (countryCache) return countryCache;

  const files = fs.readdirSync(COUNTRIES_DIR).filter((f) => f.endsWith(".json"));
  const countries = {};

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(COUNTRIES_DIR, file), "utf8"));
      countries[data.countryCode] = data;
    } catch (err) {
      console.error(`[country-intelligence] Failed to load ${file}:`, err.message);
    }
  }

  countryCache = countries;
  return countries;
}

function listCountries() {
  const countries = loadCountries();
  return Object.values(countries).map((c) => ({
    countryCode: c.countryCode,
    countryName: c.countryName,
    countryNameAr: c.countryNameAr,
    region: c.region,
    gdpUsd: c.gdpUsd,
    bilateralTradeUsd: c.uaeRelations?.bilateralTradeUsd || 0,
    strategicImportance: c.uaeRelations?.strategicImportance || "",
    dataConfidence: c.dataConfidence || "Medium"
  }));
}

function getCountry(codeOrName) {
  const countries = loadCountries();
  const key = String(codeOrName || "").toUpperCase();

  // Direct code lookup
  if (countries[key]) return countries[key];

  // Name-based search
  const lower = String(codeOrName || "").toLowerCase();
  const match = Object.values(countries).find(
    (c) => c.countryName.toLowerCase() === lower || c.countryNameAr === codeOrName
  );
  return match || null;
}

function getOpportunities(countryCode) {
  const country = getCountry(countryCode);
  return country?.opportunities || [];
}

function getRisks(countryCode) {
  const country = getCountry(countryCode);
  return country?.riskFactors || [];
}

function getUAERelations(countryCode) {
  const country = getCountry(countryCode);
  return country?.uaeRelations || null;
}

function invalidateCache() {
  countryCache = null;
}

module.exports = {
  listCountries,
  getCountry,
  getOpportunities,
  getRisks,
  getUAERelations,
  invalidateCache
};
