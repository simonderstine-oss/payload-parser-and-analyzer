# Payload Parameter Inspector

A lightweight Chrome extension for integration engineers who need to:

- paste a raw inbound payload
- turn `&`-delimited query strings into a readable list
- compare the payload against required and recommended parameters
- quickly spot missing or unexpected fields

## What the first version does

- Parses payloads like `email=test@example.com&first_name=Sam&last_name=Lee`
- Decodes URL-encoded values
- Displays one `key=value` pair per line
- Flags missing required parameters
- Flags missing recommended parameters
- Understands indexed fields like `ItemCategory{i}` and matches them against `ItemCategory1`, `ItemCategory2`, and so on
- Supports optional parameter patterns so expected optional fields are not flagged as unexpected
- Flags unexpected parameters not present in either saved list
- Stores your parameter lists locally in the extension settings

## Install locally in Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this folder:

`/Users/simonderstine/Documents/Playground`

## How to use it

1. Click the extension icon
2. Paste a raw payload into the text box
3. Click **Analyze Payload**
4. Review:
   - parsed parameter count
   - missing required parameters
   - missing recommended parameters
   - unexpected parameters
   - a readable one-line-per-parameter version of the payload
5. Click **Edit Rules** to maintain your required, recommended, and optional parameter lists

## Default rule set included

The extension now ships with your provided defaults:

- Required: `CampaignId`, `ActionTrackerId`, `EventDate`, `ClickId`, `OrderId`, `OrderDiscount`, `ItemCategory{i}`, `ItemSku{i}`, `ItemSubTotal{i}`, `ItemQuantity{i}`
- Recommended: `IpAddress`, `CustomerId`, `CustomerEmail`, `CustomerStatus`, `OrderPromoCode`, `CurrencyCode`
- Optional: `ItemName{i}`

## Good next enhancements

- Export the results as CSV or JSON
- Highlight parameters with blank values separately from truly missing parameters
- Support multiple payload templates by integration or client
- Add a side-by-side template comparison view
- Add a “copy missing params” button for faster QA handoff
