# Clearly.HUB Components Playground

A developer tool for building, testing, and inspecting requests to **Clearly.HUB** components. It lets you craft requests, launch the component flow (via redirect or popup), and inspect both the decoded response payload and the raw cryptographic signature — all in one view.

---

## What it does

The playground provides a three-panel interface:

| Panel | Description |
|---|---|
| **Request Builder** | Form to configure and send a component request |
| **Payload Viewer** | Live JSON view of the outgoing request and incoming response |
| **Raw Display** | Base64 raw data, signature, and Ed25519 signature/state verification |

---

## Supported Actions

| Action | Description |
|---|---|
| `SELECT_HUB` | Let the user select a hub |
| `SELECT_SUBSCRIPTION` | Let the user select a subscription |
| `REGISTER_RESOURCE` | Register an external resource (requires URL and format) |

---

## Launch Modes

### Popup
Opens the component in a new browser window. The response is returned to the main window via the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel). The `param` and `signatureParam` fields are ignored in this mode.

### Redirect
Navigates the current page to the component URL. The component redirects back to the configured **Redirect URL** with the response encoded in query parameters.

---

## Response Verification

When a response is received, the Raw Display panel automatically:

- **Verifies the Ed25519 signature** against the Clearly.HUB public key (`https://hub.clearly.app/.well-known/public-key.pem`)
- **Verifies the state token** to confirm the response matches the original request (CSRF protection)

Both `raw` and `jwt` signature formats are supported.

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

The app runs at [http://localhost:8080](http://localhost:8080).

### Required fields

Before launching a component, the following fields must be filled in:

| Field | Description |
|---|---|
| **Client ID** | Your client identifier, registered on Clearly.HUB |
| **Redirect URL** | Must match a registered redirect URI for your `client_id` on Clearly.HUB. For this playground to work as-is, you need to register both [http://localhost:8080](http://localhost:8080) and [https://hub.clearly.app/components](https://hub.clearly.app/components) as redirect urls |
| **Action** | One of the supported actions above |
| **Resource URL** / **Resource Format** | Required only for `REGISTER_RESOURCE` |

Form values are automatically persisted to `localStorage` between sessions.

---

## Tech Stack

- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [MUI (Material UI v7)](https://mui.com/)

---
