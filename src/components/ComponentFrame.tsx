import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dialog, DialogContent } from '@mui/material';
import { getFreshTokens } from '../utils/auth';

// The messages between a framed component and the page around it
const MESSAGE = {
  tokenRequest: 'clearly-hub.token-request',
  token: 'clearly-hub.token',
  answer: 'clearly-hub.answer',
};

interface ComponentFrameProps {
  url: string | undefined;
  componentUrl: string;
  authUrl: string;
  clientId: string;
  redirectUrl: string;
  onAnswer: (data: string, signature?: string) => void;
  onClose: () => void;
}

const originOf = (url: string): string | undefined => {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
};

// Shows a component with display: 'iframe' in a dialog. The component asks for
// the signed-in person's tokens with a token-request message and posts its
// signed answer back, both by postMessage.
const ComponentFrame: React.FC<ComponentFrameProps> = ({
  url,
  componentUrl,
  authUrl,
  clientId,
  redirectUrl,
  onAnswer,
  onClose,
}): React.ReactElement => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | undefined>();

  const componentOrigin = originOf(componentUrl);
  // The component only posts its answer to the origin of redirect_url
  const isRedirectOnThisOrigin = originOf(redirectUrl) === window.location.origin;

  useEffect(() => {
    if (!url) return;

    const onMessage = async (event: MessageEvent) => {
      // Only messages from this iframe, on the components' origin
      if (event.origin !== componentOrigin || event.source !== frameRef.current?.contentWindow) {
        return;
      }
      const source = event.source as Window;
      switch (event.data?.type) {
        case MESSAGE.tokenRequest: {
          const tokens = await getFreshTokens(authUrl, clientId);
          // Without tokens the component answers right away with an empty answer,
          // instead of waiting for its timeout
          source.postMessage(
            { type: MESSAGE.token, accessToken: tokens?.accessToken, idToken: tokens?.idToken },
            event.origin,
          );
          break;
        }
        case MESSAGE.answer: {
          const { data, signature, token } = event.data;
          if (!data && !token) {
            setError('The component returned an empty answer: the playground has no sign-in to hand over. Sign in first.');
            return;
          }
          // With signatureFormat jwt, the answer is the token
          onAnswer(token || data, token ? undefined : signature);
          setError(undefined);
          onClose();
          break;
        }
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [url, componentOrigin, authUrl, clientId, onAnswer, onClose]);

  return (
    <Dialog open={!!url} onClose={close} maxWidth="md" fullWidth>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, p:0 }}>
        {!isRedirectOnThisOrigin && (
          <Alert severity="warning">
            The Redirect URL is not on {window.location.origin}: the component posts its answer only to the
            origin of the Redirect URL, so the playground won't receive it.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {url && (
          <iframe
            ref={frameRef}
            src={url}
            title="Clearly.HUB component"
            style={{ border: 0, width: '100%', height: '75vh' }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ComponentFrame;
