// Sign-in for components shown in an iframe. A framed component can't sign in
// itself (Clearly.HUB's sign-in page can't be framed), so it asks the page
// around it for the tokens of the person signed in to the app. The playground
// gets those tokens itself, in the browser: an authorization code flow with
// PKCE against the app client, which is public (no client secret).
//
// A real app keeps these tokens on its server and never hands the refresh
// token to the browser. The playground keeps them in sessionStorage, to stay
// a standalone tool.

const SIGN_IN_KEY = 'playground-sign-in';
const TOKENS_KEY = 'playground-tokens';
const EXPIRY_MARGIN_MS = 60_000;

interface PendingSignIn {
  state: string;
  codeVerifier: string;
  authUrl: string;
  clientId: string;
  redirectUri: string;
}

export interface Tokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number; // ms
  authUrl: string;
  clientId: string;
}

const base64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const randomString = (): string => base64Url(crypto.getRandomValues(new Uint8Array(32)));

const trimSlash = (url: string): string => url.replace(/\/$/, '');

export const decodeJwtPayload = (jwt: string): Record<string, unknown> | undefined => {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return undefined;
  }
};

const readTokens = (): Tokens | undefined => {
  try {
    const stored = sessionStorage.getItem(TOKENS_KEY);
    return stored ? JSON.parse(stored) : undefined;
  } catch {
    return undefined;
  }
};

const storeTokens = (
  response: { access_token: string; id_token?: string; refresh_token?: string; expires_in?: number },
  authUrl: string,
  clientId: string,
  previousRefreshToken?: string,
): Tokens => {
  const tokens: Tokens = {
    accessToken: response.access_token,
    idToken: response.id_token,
    // A refresh doesn't send a new refresh token: keep the old one
    refreshToken: response.refresh_token ?? previousRefreshToken,
    expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
    authUrl,
    clientId,
  };
  sessionStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  return tokens;
};

const requestTokens = async (authUrl: string, body: Record<string, string>) => {
  const res = await fetch(`${trimSlash(authUrl)}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
};

// The tokens of this sign-in, only if they belong to this auth URL and client
export const getSignedIn = (authUrl: string, clientId: string): Tokens | undefined => {
  const tokens = readTokens();
  if (!tokens || tokens.authUrl !== authUrl || tokens.clientId !== clientId) return undefined;
  return tokens;
};

const buildAuthorizeUrl = async (authUrl: string, clientId: string, redirectUri: string): Promise<string> => {
  const codeVerifier = randomString();
  const state = randomString();
  const challenge = base64Url(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))),
  );
  const pending: PendingSignIn = { state, codeVerifier, authUrl, clientId, redirectUri };
  sessionStorage.setItem(SIGN_IN_KEY, JSON.stringify(pending));

  const url = new URL(`${trimSlash(authUrl)}/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
};

// Sign-in in a popup. The popup comes back to the Redirect URL (this
// playground), hands the code to this window on a BroadcastChannel and closes;
// this window then gets the tokens, so they end up in its own sessionStorage.
// The state goes in localStorage, so the popup knows it is the sign-in popup
// (a popup doesn't reliably share this window's sessionStorage).
const SIGN_IN_POPUP_KEY = 'playground-sign-in-popup';
const SIGN_IN_CHANNEL = 'playground-sign-in';

export const signInWithPopup = async (
  authUrl: string,
  clientId: string,
  redirectUri: string,
  onSignedIn: (error?: Error) => void,
): Promise<void> => {
  // Open the popup right away, on the click: after an await it may be blocked
  const width = 500;
  const height = 700;
  const popup = window.open(
    'about:blank',
    'playground-sign-in',
    `width=${width},height=${height},left=${(screen.availWidth - width) / 2},top=${(screen.availHeight - height) / 2}`,
  );
  const authorizeUrl = await buildAuthorizeUrl(authUrl, clientId, redirectUri);
  if (!popup) {
    // Blocked: sign in in this window instead
    window.location.href = authorizeUrl;
    return;
  }
  const { state } = JSON.parse(sessionStorage.getItem(SIGN_IN_KEY)!) as PendingSignIn;
  localStorage.setItem(SIGN_IN_POPUP_KEY, state);

  const channel = new BroadcastChannel(SIGN_IN_CHANNEL);
  channel.onmessage = (event) => {
    if (event.data?.type !== 'sign-in') return;
    const params = new URLSearchParams(event.data.search);
    if (params.get('state') !== state) return;
    channel.close();
    localStorage.removeItem(SIGN_IN_POPUP_KEY);
    completeSignIn(params).then(() => onSignedIn(), onSignedIn);
  };
  popup.location.href = authorizeUrl;
};

// In the sign-in popup, back from the sign-in: hands the result to the
// window that opened it and closes. True when this page is that popup.
export const isSignInPopupCallback = (params: URLSearchParams): boolean => {
  const state = params.get('state');
  return !!state && localStorage.getItem(SIGN_IN_POPUP_KEY) === state;
};

export const handOverSignInPopup = (params: URLSearchParams): boolean => {
  if (!isSignInPopupCallback(params)) return false;
  const channel = new BroadcastChannel(SIGN_IN_CHANNEL);
  channel.postMessage({ type: 'sign-in', search: params.toString() });
  channel.close();
  window.close();
  return true;
};

// True when the page was opened by the playground's own sign-in coming back
export const isSignInCallback = (params: URLSearchParams): boolean => {
  const state = params.get('state');
  if (!state || !(params.has('code') || params.has('error'))) return false;
  try {
    const pending: PendingSignIn = JSON.parse(sessionStorage.getItem(SIGN_IN_KEY) ?? 'null');
    return pending?.state === state;
  } catch {
    return false;
  }
};

export const completeSignIn = async (params: URLSearchParams): Promise<Tokens> => {
  const pending: PendingSignIn = JSON.parse(sessionStorage.getItem(SIGN_IN_KEY) ?? 'null');
  sessionStorage.removeItem(SIGN_IN_KEY);
  if (!pending || pending.state !== params.get('state')) {
    throw new Error('Sign-in state does not match');
  }
  if (params.has('error')) {
    throw new Error(`${params.get('error')}: ${params.get('error_description') ?? ''}`);
  }
  const response = await requestTokens(pending.authUrl, {
    grant_type: 'authorization_code',
    client_id: pending.clientId,
    code: params.get('code') ?? '',
    redirect_uri: pending.redirectUri,
    code_verifier: pending.codeVerifier,
  });
  return storeTokens(response, pending.authUrl, pending.clientId);
};

// Fresh tokens for the component, refreshed when they (almost) expired
export const getFreshTokens = async (authUrl: string, clientId: string): Promise<Tokens | undefined> => {
  const tokens = getSignedIn(authUrl, clientId);
  if (!tokens) return undefined;
  if (tokens.expiresAt > Date.now() + EXPIRY_MARGIN_MS) return tokens;
  if (!tokens.refreshToken) return undefined;
  try {
    const response = await requestTokens(authUrl, {
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: tokens.refreshToken,
    });
    return storeTokens(response, authUrl, clientId, tokens.refreshToken);
  } catch (error) {
    console.error('Could not refresh the sign-in:', error);
    sessionStorage.removeItem(TOKENS_KEY);
    return undefined;
  }
};

// Also signs out of Clearly.HUB; otherwise the next sign-in goes straight through.
// logoutUri must be one of the client's sign-out URLs.
export const signOut = (authUrl: string, clientId: string, logoutUri: string): void => {
  sessionStorage.removeItem(TOKENS_KEY);
  const url = new URL(`${trimSlash(authUrl)}/logout`);
  url.search = new URLSearchParams({ client_id: clientId, logout_uri: logoutUri }).toString();
  window.location.href = url.toString();
};
