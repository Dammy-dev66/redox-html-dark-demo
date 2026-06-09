# Upwork Portfolio Assistant

A local Chrome extension that helps generate and fill your own Upwork portfolio form from a batch of selected images.

It does not log in for you, bypass security checks, scrape Upwork, or silently auto-submit portfolio entries. Open the Upwork portfolio form yourself, choose an image-generated draft, click **Fill This Item** or **Fill + Preview**, then review everything before you submit.

## Free AI generation

The extension supports Groq's API for free-tier AI generation.

1. Create a Groq API key at `https://console.groq.com/`.
2. In Chrome, right-click the extension icon and open **Options**.
3. Paste your API key and save.
4. Upload images in the popup, then click **Generate With AI**.

Your API key is stored locally in Chrome storage. Do not publish your personal key inside the source code.

## Install locally

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the folder containing `manifest.json`.

## Use

1. Open the extension popup.
2. Select all portfolio images.
3. Choose a project style and optionally add context.
4. In Upwork, click the plus button to open **Add a new portfolio project**.
5. Click **Fill This Item** in the extension.
6. Review the preview/submission screen yourself before submitting.
7. After submitting, open the next blank portfolio modal, click **Next** in the extension, and fill the next image.

## Notes

The extension always uses these five skills and deliverables:

- Landing page
- Landing page optimization
- Web design
- UX & UI
- Graphic Design

Upwork may change form labels or field structure. If a field is not filled, inspect the form and tune `content.js` selectors in `FIELD_MAP`.

Chrome blocks direct file-path upload automation. This extension uses files that you selected in the popup and attempts to attach them to Upwork's image file input. If Upwork rejects a synthetic upload event, upload the image manually and continue with the filled text and skills.
