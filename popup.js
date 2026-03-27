import {
  comparePayloadToRules,
  getDefaultRules,
  parsePayload,
  sanitizeRules
} from "./lib/parser.js";

const STORAGE_KEY = "payloadInspectorRules";

const payloadInput = document.querySelector("#payloadInput");
const analyzeButton = document.querySelector("#analyzeButton");
const clearButton = document.querySelector("#clearButton");
const openOptionsButton = document.querySelector("#openOptionsButton");
const copyReadableButton = document.querySelector("#copyReadableButton");
const validationCard = document.querySelector("#validationCard");
const parsedCard = document.querySelector("#parsedCard");
const parsedSummary = document.querySelector("#parsedSummary");
const missingRequiredSummary = document.querySelector("#missingRequiredSummary");
const missingRecommendedSummary = document.querySelector("#missingRecommendedSummary");
const extraSummary = document.querySelector("#extraSummary");
const missingRequiredList = document.querySelector("#missingRequiredList");
const missingRecommendedList = document.querySelector("#missingRecommendedList");
const extraList = document.querySelector("#extraList");
const parsedTableBody = document.querySelector("#parsedTableBody");

let lastReadablePayload = "";
const TEXTAREA_MAX_LINES = 25;

function autoSizeTextarea() {
  const styles = window.getComputedStyle(payloadInput);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 20;
  const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
  const borderTop = Number.parseFloat(styles.borderTopWidth) || 0;
  const borderBottom = Number.parseFloat(styles.borderBottomWidth) || 0;
  const maxHeight = (lineHeight * TEXTAREA_MAX_LINES) + paddingTop + paddingBottom + borderTop + borderBottom;

  payloadInput.style.height = "auto";
  payloadInput.style.height = `${Math.min(payloadInput.scrollHeight, maxHeight)}px`;
  payloadInput.style.overflowY = payloadInput.scrollHeight > maxHeight ? "auto" : "hidden";
}

async function getRules() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!stored[STORAGE_KEY]) {
    return getDefaultRules();
  }

  return sanitizeRules(stored[STORAGE_KEY]);
}

function renderResultCards(container, items, emptyLabel, variant) {
  container.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "result-item result-item-empty";
    empty.textContent = emptyLabel;
    container.append(empty);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = `result-item result-item-${variant}`;

    const name = document.createElement("strong");
    name.textContent = item.raw || item.key || "";

    const description = document.createElement("span");
    description.textContent = item.description || "";

    row.append(name, description);
    container.append(row);
  });
}

function formatReadablePayload(entries) {
  return entries
    .map((entry) => `${entry.key}=${entry.value}`)
    .join("\n");
}

function toTitleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderParsedRows(rows) {
  parsedTableBody.replaceChildren();

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    const parameterCell = document.createElement("td");
    parameterCell.className = "parameter-cell";
    parameterCell.textContent = row.key;

    const valueCell = document.createElement("td");
    valueCell.className = "value-cell";
    valueCell.textContent = row.value || "(empty)";

    const levelCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `level-badge level-${row.level}`;
    badge.textContent = toTitleCase(row.level);
    levelCell.append(badge);

    tr.append(parameterCell, valueCell, levelCell);
    parsedTableBody.append(tr);
  });
}

async function analyzePayload() {
  const rawPayload = payloadInput.value.trim();

  if (!rawPayload) {
    validationCard.hidden = true;
    parsedCard.hidden = true;
    lastReadablePayload = "";
    parsedTableBody.replaceChildren();
    return;
  }

  const rules = await getRules();
  const parsed = parsePayload(rawPayload);
  const comparison = comparePayloadToRules(parsed, rules);

  lastReadablePayload = formatReadablePayload(parsed.entries);
  payloadInput.value = lastReadablePayload;
  autoSizeTextarea();

  parsedSummary.textContent = `${parsed.entries.length} params`;
  missingRequiredSummary.textContent = `${comparison.missingRequired.length} Missing Required`;
  missingRecommendedSummary.textContent = `${comparison.missingRecommended.length} Missing Recommended`;
  extraSummary.textContent = `${comparison.extras.length} Unexpected`;

  renderResultCards(missingRequiredList, comparison.missingRequired, "No required parameters missing", "required");
  renderResultCards(missingRecommendedList, comparison.missingRecommended, "No recommended parameters missing", "recommended");
  renderResultCards(extraList, comparison.extras, "No unexpected parameters", "extra");
  renderParsedRows(comparison.parsedRows);

  validationCard.hidden = false;
  parsedCard.hidden = false;
}

analyzeButton.addEventListener("click", () => {
  analyzePayload();
});

payloadInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    analyzePayload();
  }
});

payloadInput.addEventListener("input", autoSizeTextarea);

clearButton.addEventListener("click", () => {
  payloadInput.value = "";
  validationCard.hidden = true;
  parsedCard.hidden = true;
  parsedTableBody.replaceChildren();
  lastReadablePayload = "";
  autoSizeTextarea();
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

copyReadableButton.addEventListener("click", async () => {
  if (!lastReadablePayload) {
    return;
  }

  await navigator.clipboard.writeText(lastReadablePayload);
  copyReadableButton.textContent = "Copied";

  window.setTimeout(() => {
    copyReadableButton.textContent = "Copy parsed";
  }, 1500);
});

autoSizeTextarea();
