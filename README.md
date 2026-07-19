# Qortium Bookmarks

Qortium Bookmarks is a first-party QDN app for managing the saved places held
by Qortium Home. It manages ordinary bookmarks, toolbar links, dashboard pins,
start pages, and the toolbar visibility setting from one responsive screen.

QDN identity: `qdn://APP/Bookmarks/Bookmarks`

## Requirements

The manager bridge was introduced at Qortium platform level 1.5. The app
feature-detects all required actions and shows a clear Home requirement instead
of creating a separate browser-local data set. The first manager read asks for
a durable, device-local Home permission. It does not publish bookmark data to
QDN.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

The browser development build can render the shell, themes, and responsive
layout, but real bookmark data is only available when the app is embedded in
Qortium Home 1.5 or newer.

## Features

- Add, edit, and remove links and nested folders.
- Move and reorder links between bookmarks and toolbar trees.
- Move links between trees, dashboard pins, and start pages.
- Reorder dashboard pins and start pages.
- Change Home's bookmark toolbar visibility.
- Refresh automatically after Home bookmark changes.
- Preserve a stale pending edit for explicit review and retry.
- Follow Home theme, language, accent, text size, and Classic/Modern/Fun UI.
- Keep route state in fragment history for working Back and Forward controls.

See [docs/HOME_BOOKMARKS_BRIDGE.md](docs/HOME_BOOKMARKS_BRIDGE.md) for the
bridge contract used by the app.

## QAVS version

The version in `package.json` follows the Qortium App Versioning Standard.
`1.5` is the minimum platform level because this app requires the Home bookmark
manager actions. The build shows that version and emits `dist/qortium-app.json`.

## Publishing

Build first, then publish with the local trusted Core:

```bash
npm run build
npm run qdn:publish
```

The helper defaults to `APP/Bookmarks/Bookmarks`. Overrides use the
`QORTIUM_BOOKMARKS_` prefix, including `QDN_NAME`, `QDN_IDENTIFIER`,
`NODE_API_URL`, `NODE_API_KEY_PATH`, and `PREVIEW_ACCOUNTS_PATH`.

The helper refuses to publish a missing or version-stale build. It also refuses
to send the preview account private key to a non-loopback plaintext HTTP node.
Use a local node or HTTPS. `QORTIUM_BOOKMARKS_ALLOW_REMOTE_SIGN=1` is an explicit
unsafe override for an operator who has independently accepted that risk.

## License

[0BSD](LICENSE)
