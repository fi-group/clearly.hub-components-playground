# Clearly.HUB Components Playground

A developer tool for building, testing, and inspecting requests to **Clearly.HUB** components. It lets you craft requests, launch the component flow (via redirect or popup), and inspect both the decoded response payload and the raw cryptographic signature — all in one view.

The components are documented on the Clearly.HUB support site: [Hosted Components](https://support.clearly.app/hub/hosted-components.html). For example code to start from, see [clearly.hub-examples](https://github.com/fi-group/clearly.hub-examples).

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
| `SELECT_SUBSCRIPTION` | Let the user select which of their subscriptions to your app to use |
| `REGISTER_RESOURCE` | Let the user register an external resource (requires URL and format) |

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
- **Verifies the state token** to confirm the response matches the original request (CSRF protection). The result contains the original request, so the state comes back as `request.state`.
- **Shows the expiry** of a `jwt` result: a JWT result is only valid for 5 minutes.

Both `raw` and `jwt` signature formats are supported. Every check shows whether it passed or failed; when no state was sent with the request, the state check is skipped.

In this playground the checks run in the browser, to make them easy to inspect. In a real application, verify the result in your backend before trusting it.

---

## Getting Started

**Prerequisites:** Node.js 20.19+ or 22.12+ (required by Vite 7)

```bash
npm install
npm run dev
```

The app runs at [http://localhost:8080](http://localhost:8080).

### Required fields

Before launching a component, the following fields must be filled in:

| Field | Description |
|---|---|
| **Client ID** | The Client Id of an 'Authorization code grant' app client of your app (on the 'API Config' tab of the app in Clearly.HUB) |
| **Redirect URL** | Must exactly match a registered callback url of your `client_id` on Clearly.HUB, and must not contain a query string. For this playground to work as-is, you need to register both [http://localhost:8080](http://localhost:8080) and [https://hub.clearly.app/components](https://hub.clearly.app/components) as callback and sign out urls. If the Redirect URL is not registered, Clearly.HUB refuses to sign the result and the user stays on the component page |
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
