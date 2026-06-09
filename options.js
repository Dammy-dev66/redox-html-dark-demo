const SETTINGS_KEY = "groqSettings";

const form = document.querySelector("#settingsForm");
const groqApiKey = document.querySelector("#groqApiKey");
const groqModel = document.querySelector("#groqModel");
const statusEl = document.querySelector("#status");

async function loadSettings() {
  const result = await chrome.storage.local.get({
    [SETTINGS_KEY]: {
      apiKey: "",
      model: "llama-3.1-8b-instant"
    }
  });

  groqApiKey.value = result[SETTINGS_KEY].apiKey || "";
  groqModel.value = result[SETTINGS_KEY].model || "llama-3.1-8b-instant";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await chrome.storage.local.set({
    [SETTINGS_KEY]: {
      apiKey: groqApiKey.value.trim(),
      model: groqModel.value.trim() || "llama-3.1-8b-instant"
    }
  });
  statusEl.textContent = "Settings saved.";
});

loadSettings();
