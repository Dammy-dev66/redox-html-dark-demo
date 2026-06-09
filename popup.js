const FIXED_SKILLS = [
  "Landing page",
  "Landing page optimization",
  "Web design",
  "UX & UI",
  "Graphic Design"
];

const SETTINGS_KEY = "groqSettings";

const STYLE_COPY = {
  landing: {
    title: "High-Converting Landing Page Design",
    role: "Landing Page Designer",
    angle: "a focused landing page experience built to make the offer clear, credible, and easy to act on"
  },
  optimization: {
    title: "Landing Page Optimization Project",
    role: "Conversion Optimization Designer",
    angle: "a refined landing page layout designed to improve clarity, visual hierarchy, and conversion flow"
  },
  webdesign: {
    title: "Responsive Website Design Project",
    role: "Web Designer",
    angle: "a polished web design concept with clean sections, responsive structure, and strong brand presentation"
  },
  uxui: {
    title: "UX & UI Interface Design",
    role: "UX/UI Designer",
    angle: "a user-centered interface layout shaped around usability, visual balance, and smooth decision-making"
  },
  graphic: {
    title: "Graphic Design Portfolio Project",
    role: "Graphic Designer",
    angle: "a branded visual design project created to communicate the message clearly and professionally"
  }
};

const imageFiles = document.querySelector("#imageFiles");
const projectStyle = document.querySelector("#projectStyle");
const context = document.querySelector("#context");
const portfolioSelect = document.querySelector("#portfolioSelect");
const fillCurrent = document.querySelector("#fillCurrent");
const fillAndPreview = document.querySelector("#fillAndPreview");
const generateAi = document.querySelector("#generateAi");
const openSettings = document.querySelector("#openSettings");
const previousItem = document.querySelector("#previousItem");
const nextItem = document.querySelector("#nextItem");
const queueCount = document.querySelector("#queueCount");
const currentPosition = document.querySelector("#currentPosition");
const statusEl = document.querySelector("#status");

let queue = [];

function setStatus(message) {
  statusEl.textContent = message;
}

function cleanName(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength - 1).trimEnd() + ".";
}

function buildDraft(file, index) {
  const style = STYLE_COPY[projectStyle.value];
  const sourceName = cleanName(file.name);
  const nameSignal = sourceName ? titleCase(sourceName) : `Portfolio Project ${index + 1}`;
  const contextText = context.value.trim();
  const title = truncate(`${nameSignal} ${style.title}`, 70);
  const contextSentence = contextText
    ? `The project context was ${contextText}.`
    : "The project was created for a business that needed a sharper online presentation.";

  return {
    id: `${file.name}-${file.lastModified}-${index}`,
    title,
    role: truncate(style.role, 100),
    description: truncate(
      `${contextSentence} I designed ${style.angle}, using strong spacing, clear section flow, practical call-to-action placement, and a modern visual system. The final work gives visitors a faster way to understand the offer and take the next step.`,
      600
    ),
    skills: FIXED_SKILLS,
    imageName: file.name,
    imageType: file.type || "image/png",
    file
  };
}

function parseAiJson(content) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

async function loadGroqSettings() {
  const result = await chrome.storage.local.get({
    [SETTINGS_KEY]: {
      apiKey: "",
      model: "llama-3.1-8b-instant"
    }
  });
  return result[SETTINGS_KEY];
}

async function generateDraftWithGroq(item, index, settings) {
  const style = STYLE_COPY[projectStyle.value];
  const sourceName = cleanName(item.file.name);
  const contextText = context.value.trim() || "No extra context was provided.";
  const prompt = [
    "Generate one Upwork portfolio project entry.",
    "Return only valid JSON with keys: title, role, description.",
    "Constraints:",
    "- title must be 70 characters or fewer",
    "- role must be 100 characters or fewer",
    "- description must be 600 characters or fewer",
    "- tone: confident, specific, professional",
    "- do not mention AI, automation, screenshots, file names, or Upwork",
    `Project style: ${projectStyle.options[projectStyle.selectedIndex].text}`,
    `Base angle: ${style.angle}`,
    `Image/project name signal: ${sourceName || `Portfolio Project ${index + 1}`}`,
    `Extra context: ${contextText}`,
    `Fixed deliverables: ${FIXED_SKILLS.join(", ")}`
  ].join("\n");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model || "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content: "You write concise portfolio copy for web design, UX/UI, landing page, and graphic design projects."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq request failed: ${response.status} ${errorText.slice(0, 120)}`);
  }

  const data = await response.json();
  const generated = parseAiJson(data.choices?.[0]?.message?.content || "{}");

  return {
    ...item,
    title: truncate(String(generated.title || item.title), 70),
    role: truncate(String(generated.role || item.role), 100),
    description: truncate(String(generated.description || item.description), 600),
    skills: FIXED_SKILLS
  };
}

function renderQueue() {
  portfolioSelect.innerHTML = "";
  queueCount.textContent = `${queue.length} image${queue.length === 1 ? "" : "s"} loaded`;

  if (queue.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Upload images to create portfolio items";
    portfolioSelect.append(option);
    currentPosition.textContent = "No active item";
    fillCurrent.disabled = true;
    fillAndPreview.disabled = true;
    previousItem.disabled = true;
    nextItem.disabled = true;
    generateAi.disabled = true;
    return;
  }

  queue.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${index + 1}. ${item.title}`;
    portfolioSelect.append(option);
  });

  fillCurrent.disabled = false;
  fillAndPreview.disabled = false;
  generateAi.disabled = false;
  updatePosition();
}

function updatePosition() {
  const index = portfolioSelect.selectedIndex;
  const active = index >= 0 && queue[index];
  currentPosition.textContent = active ? `${index + 1} of ${queue.length}` : "No active item";
  previousItem.disabled = index <= 0;
  nextItem.disabled = index < 0 || index >= queue.length - 1;
}

async function fileToPayload(file) {
  const buffer = await file.arrayBuffer();
  return {
    name: file.name,
    type: file.type || "image/png",
    bytes: Array.from(new Uint8Array(buffer))
  };
}

async function sendActiveDraft(options = {}) {
  const draft = queue[portfolioSelect.selectedIndex];
  if (!draft) {
    setStatus("Upload images first.");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://www.upwork.com/")) {
    setStatus("Open the Upwork portfolio modal first.");
    return;
  }

  setStatus("Sending portfolio item to Upwork...");
  const image = await fileToPayload(draft.file);
  const response = await chrome.tabs.sendMessage(tab.id, {
    type: "FILL_UPWORK_PORTFOLIO",
    draft: {
      title: draft.title,
      role: draft.role,
      description: draft.description,
      skills: draft.skills
    },
    image,
    clickPreview: Boolean(options.clickPreview)
  });

  setStatus(response?.message || "Fill request sent.");
}

imageFiles.addEventListener("change", () => {
  queue = [...imageFiles.files].map(buildDraft);
  renderQueue();
  setStatus(queue.length ? "Portfolio queue generated." : "No images selected.");
});

projectStyle.addEventListener("change", () => {
  queue = [...imageFiles.files].map(buildDraft);
  renderQueue();
});

context.addEventListener("input", () => {
  queue = [...imageFiles.files].map(buildDraft);
  renderQueue();
});

portfolioSelect.addEventListener("change", updatePosition);
fillCurrent.addEventListener("click", () => sendActiveDraft());
fillAndPreview.addEventListener("click", () => sendActiveDraft({ clickPreview: true }));

generateAi.addEventListener("click", async () => {
  if (queue.length === 0) {
    setStatus("Upload images first.");
    return;
  }

  const settings = await loadGroqSettings();
  if (!settings.apiKey) {
    setStatus("Add your Groq API key in Settings first.");
    chrome.runtime.openOptionsPage();
    return;
  }

  generateAi.disabled = true;
  setStatus("Generating portfolio copy with Groq...");

  try {
    const generated = [];
    for (let index = 0; index < queue.length; index += 1) {
      setStatus(`Generating ${index + 1} of ${queue.length}...`);
      generated.push(await generateDraftWithGroq(queue[index], index, settings));
    }
    queue = generated;
    renderQueue();
    setStatus("AI portfolio copy generated.");
  } catch (error) {
    setStatus(`${error.message}. Using fallback copy.`);
  } finally {
    generateAi.disabled = false;
  }
});

openSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

previousItem.addEventListener("click", () => {
  portfolioSelect.selectedIndex = Math.max(0, portfolioSelect.selectedIndex - 1);
  updatePosition();
});

nextItem.addEventListener("click", () => {
  portfolioSelect.selectedIndex = Math.min(queue.length - 1, portfolioSelect.selectedIndex + 1);
  updatePosition();
});

renderQueue();
