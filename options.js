import {
  getAliasReference,
  getDefaultProfile,
  getDefaultRules,
  getSupportedProfiles,
  rulesToText,
  sanitizeRules
} from "./lib/parser.js";

const STORAGE_KEY = "payloadInspectorRules";
const MODE_KEY = "payloadInspectorMode";

const profileSelect = document.querySelector("#profileSelect");
const requiredInput = document.querySelector("#requiredInput");
const recommendedInput = document.querySelector("#recommendedInput");
const optionalInput = document.querySelector("#optionalInput");
const aliasSection = document.querySelector("#aliasSection");
const aliasList = document.querySelector("#aliasList");
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

function getSelectedProfile() {
  return profileSelect.value || getDefaultProfile();
}

function populateProfiles() {
  profileSelect.replaceChildren();
  getSupportedProfiles().forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = `${profile.label} integration`;
    profileSelect.append(option);
  });
}

async function loadSelectedProfile() {
  const stored = await chrome.storage.local.get(MODE_KEY);
  const selectedProfile = stored[MODE_KEY] || getDefaultProfile();
  profileSelect.value = selectedProfile;
}

function renderAliasReference() {
  const profile = getSelectedProfile();
  const aliases = getAliasReference(profile);

  aliasList.replaceChildren();
  aliasSection.hidden = aliases.length === 0;

  aliases.forEach((alias) => {
    const row = document.createElement("div");
    row.className = "alias-row";

    const shortened = document.createElement("code");
    shortened.textContent = alias.shortened;

    const arrow = document.createElement("span");
    arrow.className = "alias-arrow";
    arrow.textContent = "->";

    const canonical = document.createElement("code");
    canonical.textContent = alias.canonical;

    row.append(shortened, arrow, canonical);
    aliasList.append(row);
  });
}

async function loadRules() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const allStoredRules = stored[STORAGE_KEY] || {};
  const profile = getSelectedProfile();
  const hasLegacyShape = allStoredRules.requiredText || allStoredRules.recommendedText || allStoredRules.optionalText;
  const rules = profile === "api" && hasLegacyShape
    ? sanitizeRules(allStoredRules, profile)
    : allStoredRules[profile]
      ? sanitizeRules(allStoredRules[profile], profile)
      : getDefaultRules(profile);
  const { requiredText, recommendedText, optionalText } = rulesToText(rules);

  requiredInput.value = requiredText;
  recommendedInput.value = recommendedText;
  optionalInput.value = optionalText;
  renderAliasReference();
}

async function saveRules() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const allStoredRules = stored[STORAGE_KEY] || {};
  const hasLegacyShape = allStoredRules.requiredText || allStoredRules.recommendedText || allStoredRules.optionalText;
  const profile = getSelectedProfile();
  const payload = {
    requiredText: requiredInput.value,
    recommendedText: recommendedInput.value,
    optionalText: optionalInput.value
  };

  const nextStoredRules = hasLegacyShape
    ? {
        api: {
          requiredText: allStoredRules.requiredText || "",
          recommendedText: allStoredRules.recommendedText || "",
          optionalText: allStoredRules.optionalText || ""
        }
      }
    : allStoredRules;

  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...nextStoredRules,
      [profile]: payload
    }
  });

  setStatus("Rules saved");
}

async function resetDefaults() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const allStoredRules = stored[STORAGE_KEY] || {};
  const hasLegacyShape = allStoredRules.requiredText || allStoredRules.recommendedText || allStoredRules.optionalText;
  const profile = getSelectedProfile();
  const defaults = getDefaultRules(profile);
  const { requiredText, recommendedText, optionalText } = rulesToText(defaults);

  requiredInput.value = requiredText;
  recommendedInput.value = recommendedText;
  optionalInput.value = optionalText;

  const nextStoredRules = hasLegacyShape
    ? {
        api: {
          requiredText: allStoredRules.requiredText || "",
          recommendedText: allStoredRules.recommendedText || "",
          optionalText: allStoredRules.optionalText || ""
        }
      }
    : allStoredRules;

  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...nextStoredRules,
      [profile]: {
        requiredText,
        recommendedText,
        optionalText
      }
    }
  });

  setStatus("Defaults restored");
}

profileSelect.addEventListener("change", loadRules);
saveButton.addEventListener("click", saveRules);
resetButton.addEventListener("click", resetDefaults);

populateProfiles();
loadSelectedProfile().then(loadRules);
