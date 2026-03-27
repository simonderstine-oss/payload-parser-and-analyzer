# Chrome Web Store Release Checklist

This project is close to ready for first-time Chrome Web Store submission.

## Included in the repo

- Manifest V3 extension
- Local-only permission footprint (`storage`)
- README
- Privacy policy draft: `PRIVACY.md`
- Source icon artwork: `assets/icon-source.svg`

## Still needed before submission

- PNG icons generated from the source artwork in these sizes:
  - `16x16`
  - `32x32`
  - `48x48`
  - `128x128`
- At least 1 Chrome Web Store screenshot
  - Google currently accepts `1280x800` or `640x400`
- Store listing copy
- Optional promotional artwork if you want a more polished listing

## Suggested listing copy

### Name

Payload Parameter Inspector

### Summary

Parse raw conversion payloads, highlight missing parameters, and validate required and recommended fields directly in Chrome.

### Description

Payload Parameter Inspector helps integration and marketing operations teams review raw payloads faster. Paste an inbound payload into the extension and it will:

- parse `&`-delimited payloads into a readable format
- validate required, recommended, and optional parameters
- flag missing and unexpected fields
- support indexed parameter patterns like `ItemSku{i}` and `ItemQuantity{i}`
- store custom rule lists locally in the browser

The extension processes payloads locally in the browser and uses Chrome storage only to save your configured rule lists.

## Packaging

Create a ZIP containing the extension files at the repo root. Do not zip the parent folder; zip the files themselves.

## Submission notes

- Fill out the Privacy tab accurately
- State the extension's single purpose clearly: parse and validate pasted payloads
- Declare that data is processed locally and not sold or transferred, if that remains true
