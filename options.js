import {
  getDefaultRules,
  rulesToText,
  sanitizeRules
} from "./lib/parser.js";

const STORAGE_KEY = "payloadInspectorRules";

const requiredInput = document.querySelector("#requiredInput");
const recommendedInput = document.querySelector("#recommendedInput");
const optionalInput = document.querySelector("#optionalInput");
const saveButton = document.querySelector("#saveButton");
const resetButton = document.querySelector("#resetButton");
const statusMessage = document.querySelector("#statusMessage");

function setStatus(message) {
  statusMessage.textContent = message;
  window.setTimeout(() => {
    if (statusMessage.textContent === message) {
      statusMessage.textContent = "";
    }
  }, 2500);
}

async function loadRules() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const rules = stored[STORAGE_KEY] ? sanitizeRules(stored[STORAGE_KEY]) : getDefaultRules();
  const { requiredText, recommendedText, optionalText } = rulesToText(rules);

  requiredInput.value = requiredText;
  recommendedInput.value = recommendedText;
  optionalInput.value = optionalText;
}

async function saveRules() {
  const payload = {
    requiredText: requiredInput.value,
    recommendedText: recommendedInput.value,
    optionalText: optionalInput.value
  };

  await chrome.storage.local.set({
    [STORAGE_KEY]: payload
  });

  setStatus("Rules saved");
}

async function resetDefaults() {
  const defaults = getDefaultRules();
  const { requiredText, recommendedText, optionalText } = rulesToText(defaults);

  requiredInput.value = requiredText;
  recommendedInput.value = recommendedText;
  optionalInput.value = optionalText;

  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      requiredText,
      recommendedText,
      optionalText
    }
  });

  setStatus("Defaults restored");
}

saveButton.addEventListener("click", saveRules);
resetButton.addEventListener("click", resetDefaults);

loadRules();
