const FIELD_MAP = [
  {
    key: "title",
    labels: ["project title"],
    selectors: [
      "input[placeholder*='brief but descriptive title' i]",
      "input[maxlength='70']",
      "input[name*='title' i]",
      "input[aria-label*='project title' i]"
    ]
  },
  {
    key: "role",
    labels: ["your role"],
    selectors: [
      "input[placeholder*='front-end engineer' i]",
      "input[maxlength='100']",
      "input[name*='role' i]",
      "input[aria-label*='role' i]"
    ]
  },
  {
    key: "description",
    labels: ["project description"],
    selectors: [
      "textarea[placeholder*='goals' i]",
      "textarea[maxlength='600']",
      "textarea[name*='description' i]",
      "textarea[aria-label*='description' i]"
    ]
  }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function visible(element) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function dispatchInputEvents(element) {
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: element.value || element.textContent }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function setElementValue(element, value) {
  element.focus();

  if (element.isContentEditable) {
    element.textContent = value;
  } else {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor.set.call(element, value);
  }

  dispatchInputEvents(element);
}

function findBySelectors(selectors) {
  for (const selector of selectors) {
    const match = [...document.querySelectorAll(selector)].find(visible);
    if (match) {
      return match;
    }
  }
  return null;
}

function findByNearbyLabel(labels) {
  const controls = [...document.querySelectorAll("input, textarea, [contenteditable='true']")].filter(visible);

  for (const control of controls) {
    const idLabel = control.id
      ? document.querySelector(`label[for='${CSS.escape(control.id)}']`)?.textContent || ""
      : "";
    const parent = control.closest("div, label, section, form");
    const parentLabel = parent?.textContent || "";
    const ariaLabel = control.getAttribute("aria-label") || "";
    const placeholder = control.getAttribute("placeholder") || "";
    const nearbyText = normalize(`${idLabel} ${parentLabel} ${ariaLabel} ${placeholder}`);

    if (labels.some((label) => nearbyText.includes(label))) {
      return control;
    }
  }

  return null;
}

function fillField(config, draft) {
  const value = draft[config.key];
  if (!value) {
    return false;
  }

  const element = findBySelectors(config.selectors) || findByNearbyLabel(config.labels);
  if (!element) {
    return false;
  }

  setElementValue(element, value);
  return true;
}

function keyboardEvent(type, key) {
  return new KeyboardEvent(type, {
    key,
    code: key === "Enter" ? "Enter" : undefined,
    bubbles: true,
    cancelable: true
  });
}

async function addSkill(skill) {
  const input = findBySelectors([
    "input[placeholder*='add skill' i]",
    "input[aria-label*='skill' i]",
    "input[name*='skill' i]"
  ]) || findByNearbyLabel(["skills and deliverables"]);

  if (!input) {
    return false;
  }

  setElementValue(input, skill);
  input.dispatchEvent(keyboardEvent("keydown", "Enter"));
  input.dispatchEvent(keyboardEvent("keyup", "Enter"));
  await delay(350);

  const suggestion = [...document.querySelectorAll("button, [role='option'], li, div")]
    .filter(visible)
    .find((element) => normalize(element.textContent || "") === normalize(skill));

  if (suggestion) {
    suggestion.click();
  } else {
    input.dispatchEvent(keyboardEvent("keydown", "Enter"));
    input.dispatchEvent(keyboardEvent("keyup", "Enter"));
  }

  await delay(250);
  return true;
}

async function addSkills(skills) {
  let added = 0;
  for (const skill of skills) {
    if (await addSkill(skill)) {
      added += 1;
    }
  }
  return added;
}

function bytesToFile(payload) {
  const bytes = new Uint8Array(payload.bytes);
  return new File([bytes], payload.name, { type: payload.type });
}

async function uploadImage(payload) {
  if (!payload?.bytes?.length) {
    return false;
  }

  const directInput = [...document.querySelectorAll("input[type='file']")].find((input) => {
    const accept = input.getAttribute("accept") || "";
    return !accept || accept.includes("image") || accept.includes("*");
  });

  if (!directInput) {
    const imageButton = [...document.querySelectorAll("button, [role='button']")]
      .filter(visible)
      .find((button) => {
        const label = normalize(`${button.getAttribute("aria-label") || ""} ${button.title || ""} ${button.textContent || ""}`);
        return label.includes("image") || label.includes("photo") || label.includes("add content");
      });

    if (imageButton) {
      imageButton.click();
      await delay(700);
    }
  }

  const fileInput = [...document.querySelectorAll("input[type='file']")].find((input) => {
    const accept = input.getAttribute("accept") || "";
    return !accept || accept.includes("image") || accept.includes("*");
  });

  if (!fileInput) {
    return false;
  }

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(bytesToFile(payload));
  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event("input", { bubbles: true }));
  fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  await delay(1200);
  return true;
}

function findButtonByText(text) {
  const target = normalize(text);
  return [...document.querySelectorAll("button, [role='button']")]
    .filter(visible)
    .find((button) => normalize(button.textContent || "").includes(target));
}

async function fillPortfolio(message) {
  const filledKeys = FIELD_MAP
    .filter((field) => fillField(field, message.draft))
    .map((field) => field.key);

  const skillsAdded = await addSkills(message.draft.skills || []);
  const imageUploaded = await uploadImage(message.image);

  let previewClicked = false;
  if (message.clickPreview) {
    const previewButton = findButtonByText("next: preview") || findButtonByText("preview");
    if (previewButton) {
      previewButton.click();
      previewClicked = true;
    }
  }

  const parts = [
    `filled ${filledKeys.length}/3 text fields`,
    `added ${skillsAdded}/5 skills`,
    imageUploaded ? "attached image" : "image needs manual upload"
  ];

  if (message.clickPreview) {
    parts.push(previewClicked ? "opened preview" : "preview button not found");
  }

  return `Done: ${parts.join(", ")}. Review before submitting.`;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "FILL_UPWORK_PORTFOLIO") {
    return false;
  }

  fillPortfolio(message)
    .then((responseMessage) => sendResponse({ ok: true, message: responseMessage }))
    .catch((error) => sendResponse({ ok: false, message: error.message || "Could not fill the form." }));

  return true;
});
