const STORAGE_KEY = "quickNotesRichText";

const editor = document.querySelector("#editor");
const clearButton = document.querySelector("#clearButton");
const addTabButton = document.querySelector("#addTabButton");
const renameTabButton = document.querySelector("#renameTabButton");
const deleteTabButton = document.querySelector("#deleteTabButton");
const tabsBar = document.querySelector("#tabsBar");
const saveStatus = document.querySelector("#saveStatus");
const toolbarButtons = Array.from(document.querySelectorAll("[data-command]"));
const stateButtons = Array.from(document.querySelectorAll("[data-state-command]"));

let saveTimer = null;
let notesState = createDefaultState();
let activeTabId = notesState.activeTabId;
let tabIdCounter = 1;

function createDefaultTab(id = "tab-1", name = "Tab 1", content = "") {
  return { id, name, content };
}

function createDefaultState(content = "") {
  return {
    activeTabId: "tab-1",
    tabs: [createDefaultTab("tab-1", "Tab 1", content)]
  };
}

function setSaveStatus(message, pending = false) {
  saveStatus.textContent = message;
  saveStatus.dataset.pending = String(pending);
}

function focusEditor() {
  editor.focus();
}

function getActiveTab() {
  return notesState.tabs.find((tab) => tab.id === activeTabId) || notesState.tabs[0];
}

function ensureValidState(rawState) {
  if (typeof rawState === "string") {
    return createDefaultState(rawState);
  }

  if (!rawState || !Array.isArray(rawState.tabs) || rawState.tabs.length === 0) {
    return createDefaultState();
  }

  const tabs = rawState.tabs.map((tab, index) => ({
    id: typeof tab.id === "string" && tab.id ? tab.id : `tab-${index + 1}`,
    name: typeof tab.name === "string" && tab.name.trim() ? tab.name.trim() : `Tab ${index + 1}`,
    content: typeof tab.content === "string" ? tab.content : ""
  }));

  const tabIds = new Set(tabs.map((tab) => tab.id));
  const nextActiveTabId = tabIds.has(rawState.activeTabId) ? rawState.activeTabId : tabs[0].id;

  return {
    activeTabId: nextActiveTabId,
    tabs
  };
}

function updateTabCounter() {
  const highest = notesState.tabs.reduce((max, tab) => {
    const match = /tab-(\d+)/.exec(tab.id);
    return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
  }, 0);

  tabIdCounter = highest + 1;
}

function renderTabs() {
  tabsBar.replaceChildren();

  notesState.tabs.forEach((tab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab-button";
    button.dataset.tabId = tab.id;
    button.textContent = tab.name;

    const isActive = tab.id === activeTabId;
    button.classList.toggle("tab-button-active", isActive);
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(isActive));

    button.addEventListener("click", () => {
      switchTab(tab.id);
    });

    tabsBar.append(button);
  });

  deleteTabButton.disabled = notesState.tabs.length <= 1;
}

function renderActiveTab() {
  const activeTab = getActiveTab();
  activeTabId = activeTab.id;
  notesState.activeTabId = activeTab.id;
  editor.innerHTML = activeTab.content;
  renderTabs();
  updateToolbarState();
}

async function saveNotes() {
  await chrome.storage.local.set({
    [STORAGE_KEY]: notesState
  });
  setSaveStatus("Saved");
}

function queueSave() {
  setSaveStatus("Saving...", true);

  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
  }

  saveTimer = window.setTimeout(() => {
    saveNotes().catch(() => {
      setSaveStatus("Save failed");
    });
  }, 200);
}

function updateToolbarState() {
  stateButtons.forEach((button) => {
    const isActive = document.queryCommandState(button.dataset.stateCommand);
    button.classList.toggle("tool-button-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function syncEditorToActiveTab() {
  const activeTab = getActiveTab();
  activeTab.content = editor.innerHTML;
}

function runCommand(command) {
  focusEditor();
  document.execCommand(command, false, null);
  syncEditorToActiveTab();
  updateToolbarState();
  queueSave();
}

function switchTab(tabId) {
  if (tabId === activeTabId) {
    return;
  }

  syncEditorToActiveTab();
  activeTabId = tabId;
  notesState.activeTabId = tabId;
  renderActiveTab();
  queueSave();
}

function createNewTab() {
  syncEditorToActiveTab();

  const nextId = `tab-${tabIdCounter}`;
  tabIdCounter += 1;
  const nextIndex = notesState.tabs.length + 1;
  const newTab = createDefaultTab(nextId, `Tab ${nextIndex}`, "");

  notesState.tabs.push(newTab);
  activeTabId = newTab.id;
  notesState.activeTabId = newTab.id;
  renderActiveTab();
  queueSave();
}

function renameCurrentTab() {
  const activeTab = getActiveTab();
  const nextName = window.prompt("Rename tab", activeTab.name);

  if (nextName === null) {
    return;
  }

  activeTab.name = nextName.trim() || activeTab.name;
  renderTabs();
  queueSave();
}

function deleteCurrentTab() {
  if (notesState.tabs.length <= 1) {
    return;
  }

  const activeTab = getActiveTab();
  const confirmed = window.confirm(`Delete "${activeTab.name}"?`);

  if (!confirmed) {
    return;
  }

  const currentIndex = notesState.tabs.findIndex((tab) => tab.id === activeTabId);
  notesState.tabs = notesState.tabs.filter((tab) => tab.id !== activeTabId);

  const fallbackTab = notesState.tabs[Math.max(0, currentIndex - 1)] || notesState.tabs[0];
  activeTabId = fallbackTab.id;
  notesState.activeTabId = fallbackTab.id;
  renderActiveTab();
  queueSave();
}

async function loadNotes() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  notesState = ensureValidState(stored[STORAGE_KEY]);
  activeTabId = notesState.activeTabId;
  updateTabCounter();
  renderActiveTab();
  setSaveStatus("Saved");
}

toolbarButtons.forEach((button) => {
  button.addEventListener("click", () => {
    runCommand(button.dataset.command);
  });
});

addTabButton.addEventListener("click", () => {
  createNewTab();
});

renameTabButton.addEventListener("click", () => {
  renameCurrentTab();
});

deleteTabButton.addEventListener("click", () => {
  deleteCurrentTab();
});

editor.addEventListener("input", () => {
  syncEditorToActiveTab();
  queueSave();
  updateToolbarState();
});

editor.addEventListener("keyup", () => {
  updateToolbarState();
});

editor.addEventListener("mouseup", () => {
  updateToolbarState();
});

document.addEventListener("selectionchange", () => {
  if (document.activeElement === editor || editor.contains(document.activeElement)) {
    updateToolbarState();
  }
});

editor.addEventListener("keydown", (event) => {
  if (!(event.metaKey || event.ctrlKey)) {
    return;
  }

  const key = event.key.toLowerCase();
  const shortcuts = {
    b: "bold",
    i: "italic",
    u: "underline"
  };

  if (!shortcuts[key]) {
    return;
  }

  event.preventDefault();
  runCommand(shortcuts[key]);
});

clearButton.addEventListener("click", async () => {
  editor.innerHTML = "";
  syncEditorToActiveTab();
  focusEditor();
  await saveNotes();
  setSaveStatus("Cleared");
  updateToolbarState();
});

loadNotes().catch(() => {
  setSaveStatus("Unable to load notes");
});
