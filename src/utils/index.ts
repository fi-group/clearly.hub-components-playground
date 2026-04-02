export const CONFIG: {
  componentUrl: string;
  publicKeyUrl: string;
} = {
  componentUrl: 'https://hub.clearly.app/components',
  publicKeyUrl: 'https://hub.clearly.app/.well-known/public-key.pem',
};

export const HELP: Record<string, string> = {
  mode: 'Choose popup or redirect behavior.\n\nWhen choosing popup, the request will be sent in a new window. \n\nWhen choosing redirect, the request will be sent by navigating to the component URL.\n\nFor popup, the param and signatureParam fields will be ignored, since the data will be sent on a BroadcastChannel.',
  client_id: 'Client identifier used by the component. Must be registered on Clearly.HUB',
  action: 'Action to perform:\n- SELECT_SUBSCRIPTION\n-REGISTER_RESOURCE\n...',
  redirect_url: 'The redirect url of the request AND the redirect URI registered on Clearly.HUB where the components will send their result.\nMUST be registered as redirect Url on the API Config for this client_id on Clearly.HUB.',
  param: 'Name of the response data param (ignored for popup).\nDefaults to "data".',
  signatureParam: 'Name of the response signature param (ignored for popup). \nDefaults to "signature".',
  signatureFormat: 'Choose payload signature format (raw/jwt).\nNot available for LOGOUT (always: "raw")\nDefaults to "raw".',
  email: 'Email with which the user has to sign into the components. Can be used to force the user to sign in with a specific email.\n\n Disabled for LOGOUT action.',
  state: 'CSRF/state token used to match responses and prevent replay attacks. For each request, a new random state should be generated and registered on the server side, then verified when receiving the response.',
  resourceUrl: 'URL of the resource to register (only for REGISTER_RESOURCE).\nLeave empty otherwise.',
  resourceFormat: 'Format of the resource to register (only for REGISTER_RESOURCE).\nExamples: 3dtiles, wms, etc..',
};


const pemToSpkiBytes = (pem: string): Uint8Array => {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const verifyState = (
  data: string,
  sentState: string,
  format: 'jwt' | 'raw' | '',
): boolean => {
  if (format === 'jwt') {
    try {
      const payloadPart = data.split('.')[1];
      if (!payloadPart) return false;
      const payloadJson = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((payloadPart.length + 3) % 4));
      const payload = JSON.parse(payloadJson);
      return payload.state === sentState;
    } catch {
      return false;
    }
  } else {
    try {
      const parsed = JSON.parse(atob(data));
      return parsed.state === sentState;
    } catch {
      return false;
    }
  }
};

export const verifySignature = async (
  data: string,
  signature: string,
  payloadType: 'jwt' | 'raw' | '',
  publicKeyUrl: string,
): Promise<boolean> => {
  const publicKeyPem = await fetch(publicKeyUrl).then(res => res.text());
  const publicKeyBytes = pemToSpkiBytes(publicKeyPem);

  let dataBytes: Uint8Array<ArrayBuffer>;
  let signatureBytes: Uint8Array<ArrayBuffer>;

  if (payloadType !== 'jwt') {
    dataBytes = new TextEncoder().encode(data);
    signatureBytes = new Uint8Array(atob(signature).split('').map(c => c.charCodeAt(0)));
  } else {
    const [headerB64, payloadB64, signatureB64] = data.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return false;
    const signingInput = `${headerB64}.${payloadB64}`;

    const sigReplaced = signatureB64
      .replace(/-/g, '+')
      .replace(/_/g, '/') + '==='.slice((signatureB64.length + 3) % 4);

    signatureBytes = new Uint8Array(Array.from(atob(sigReplaced), c => c.charCodeAt(0)));
    dataBytes = new TextEncoder().encode(signingInput);

  }

  const cryptoKey = await window.crypto.subtle.importKey(
    'spki',
    publicKeyBytes.buffer as ArrayBuffer,
    { name: 'Ed25519' },
    false,
    ['verify']
  );

  const isValid = await window.crypto.subtle.verify(
    { name: 'Ed25519' },
    cryptoKey,
    signatureBytes,
    dataBytes
  );

  return isValid;
}

export const storeForm = (form: Record<string, unknown>): void => {
  localStorage.setItem('playground-form', JSON.stringify(form));
}

export const loadForm = (): Record<string, unknown> => {
  const stored = localStorage.getItem('playground-form');
  return stored ? JSON.parse(stored) : {};
}


export const copyToClipboard = async (
  text: string,
  type: string,
  setCopied: React.Dispatch<React.SetStateAction<string | null>>,
): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(prev => prev === type ? null : prev), 2000);
  } catch {
    // ignore
  }
};
