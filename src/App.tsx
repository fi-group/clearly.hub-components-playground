import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import RequestBuilderForm from "./components/RequestBuilderForm";
import JsonDisplay from "./components/JsonDisplay";
import RawDisplay from "./components/RawDisplay";
import ComponentFrame from "./components/ComponentFrame";
import { useCallback, useEffect, useState, useMemo } from "react";
import { CONFIGS, decodeResult, loadEnvironment, storeForm, type Environment } from "./utils";
import { completeSignIn, decodeJwtPayload, getSignedIn, handOverSignInPopup, isSignInCallback, isSignInPopupCallback, signInWithPopup, signOut } from "./utils/auth";

type Mode = 'redirect' | 'popup' | 'iframe';

const storedMode = (): Mode => {
  const stored = localStorage.getItem('playground-mode');
  return stored === 'redirect' || stored === 'iframe' ? stored : 'popup';
};

const App = (): React.ReactElement | null => {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);

  const [mode, setMode] = useState<Mode>(storedMode);
  const [layout, setLayout] = useState<'default' | 'minimal'>(
    localStorage.getItem('playground-layout') === 'minimal' ? 'minimal' : 'default',
  );
  const [environment, setEnvironment] = useState<Environment>(loadEnvironment);
  const { componentUrl, publicKeyUrl, authUrl } = CONFIGS[environment];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setFormState] = useState<Record<string, any>>(
    localStorage.getItem('playground-form')
      ? JSON.parse(localStorage.getItem('playground-form')!)
      : {
      }
  );

  const [receivedData, setReceivedData] = useState<string | undefined>();
  const [receivedParsedData, setReceivedParsedData] = useState<Record<string, unknown> | undefined>();
  const [receivedSignature, setReceivedSignature] = useState<string | undefined>();

  // A changed request makes the response shown so far stale
  const setForm: typeof setFormState = useCallback((update) => {
    setFormState(update);
    setReceivedData(undefined);
    setReceivedParsedData(undefined);
    setReceivedSignature(undefined);
  }, []);

  // Render nothing while the URL is being handled: a sign-in coming back to
  // this window, or a popup that hands over its result and closes
  const [checking, setChecking] = useState(() =>
    isSignInCallback(urlParams) ||
    isSignInPopupCallback(urlParams) ||
    sessionStorage.getItem('playground-is-popup') === 'true',
  );

  // Component shown in an iframe, and the sign-in it gets its tokens from
  const [frameUrl, setFrameUrl] = useState<string | undefined>();
  const [signInVersion, setSignInVersion] = useState(0);
  const [signInError, setSignInError] = useState<string | undefined>();
  const signedInAs = useMemo(() => {
    const tokens = getSignedIn(authUrl, form.client_id);
    if (!tokens) return undefined;
    const claims = tokens.idToken ? decodeJwtPayload(tokens.idToken) : undefined;
    return (claims?.email as string | undefined) ?? (claims?.sub as string | undefined) ?? 'unknown';
    // signInVersion: re-read after signing in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUrl, form.client_id, signInVersion]);

  // The request as it is sent in the current mode
  const request = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = { ...form };
    if (mode !== 'redirect') {
      delete payload.param;
      delete payload.signatureParam;
    }
    if (mode === 'iframe') {
      payload.display = 'iframe';
      if (layout === 'minimal') payload.layout = 'minimal';
    }
    return payload;
  }, [form, mode, layout]);

  const handleData = useCallback((data: string, signature?: string) => {
    const fixedData = data?.replace(/ /g, '+');
    const fixedSignature = signature?.replace(/ /g, '+');

    let parsed: Record<string, unknown> = {};

    try {
      parsed = decodeResult(fixedData || '');
    } catch {
      console.error('Could not decode the result of the component');
    }

    setReceivedData(fixedData);
    setReceivedParsedData(parsed);
    setReceivedSignature(fixedSignature);
  }, []);

  const closeFrame = useCallback(() => setFrameUrl(undefined), []);

  const sendRequest = (mode: Mode): void => {
    const payloadToSend = request;
    switch (mode) {
      case 'iframe': {
        const requestBase64 = btoa(JSON.stringify(payloadToSend));
        setFrameUrl(`${componentUrl.replace(/\/$/, '')}/${requestBase64}`);
        break;
      }
      case 'popup': {
        const requestBase64 = btoa(JSON.stringify(payloadToSend));
        const height = screen.availHeight;
        const popupWidth = 450;
        const opts = `width=${popupWidth},height=${height},left=${(screen.availWidth - popupWidth)}`;
        window.open(
          `?request=${encodeURIComponent(requestBase64)}`,
          'playground-popup',
          opts,
        );
        break;
      }
      case 'redirect': {
        const requestBase64 = btoa(JSON.stringify(payloadToSend));
        window.location.href = `${componentUrl.replace(/\/$/, '')}/${requestBase64}`;
        break;
      }
    }
  };

  useEffect(() => {
    const channel = new BroadcastChannel('playground-channel');
    // normal window::
    if (window.menubar.visible) {
      channel.onmessage = (event) => {
        if (event.data.type === 'result') {
          const { data, signature } = event.data;
          handleData(data, signature);
        }
      };
    }
    return () => channel.close();
  }, [handleData]);


  useEffect(() => {
    localStorage.setItem('playground-mode', mode);
    localStorage.setItem('playground-layout', layout);
    localStorage.setItem('playground-environment', environment);
  }, [mode, layout, environment]);

  useEffect(() => {
    const params: Record<string, string> = {};

    for (const [key, value] of urlParams.entries()) {
      params[key] = value;
    }

    // The sign-in popup, back from the sign-in: hands over and closes
    if (handOverSignInPopup(urlParams)) {
      return;
    }

    // Back from the playground's own sign-in in this window (when the popup was blocked)
    if (isSignInCallback(urlParams)) {
      window.history.replaceState({}, '', window.location.pathname);
      completeSignIn(urlParams)
        .then(() => setSignInError(undefined))
        .catch((error: Error) => {
          console.error('Sign-in failed:', error);
          setSignInError(`Sign-in failed: ${error.message}`);
        })
        .finally(() => {
          setSignInVersion(v => v + 1);
          setChecking(false);
        });
      return;
    }

    const requestPayload = params.request;
    if (requestPayload) {
      // inside popup:
      sessionStorage.setItem('playground-is-popup', 'true');
      const payload = JSON.parse(atob(requestPayload));
      const base64 = btoa(JSON.stringify(payload));

      window.location.href = `${componentUrl.replace(/\/$/, '')}/${base64}`;
    } else {
      const dataParam = params[form.param] || params['data'];
      const sigParam = params[form.signatureParam] || params['signature'];
      if (sessionStorage.getItem('playground-is-popup') === 'true') {
        const channel = new BroadcastChannel('playground-channel');
        channel.postMessage({
          type: 'result',
          data: dataParam,
          signature: sigParam,
        });
        window.close();
      } else {
        // inside main
      }

      if (dataParam) {
        Promise.resolve().then(() => handleData(dataParam, sigParam));
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParams]);

  useEffect(() => {
    storeForm(form);
  }, [form]);

  if (urlParams.has('request')) {
    return null;
  }
  if (checking) {
    return null;
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'row',
      gap: 2,
      width: '100%',
      maxWidth: '100vw',
      height: '100vh',
      boxSizing: 'border-box',
      p: 4,
      alignItems: 'flex-start',
    }}>
      <Box sx={{ flexGrow: 0, width: 375 }}>
        {signInError && (
          <Alert severity="error" onClose={() => setSignInError(undefined)} sx={{ mb: 2 }}>
            {signInError}
          </Alert>
        )}
        <RequestBuilderForm
          form={form}
          setForm={setForm}
          mode={mode}
          setMode={setMode}
          environment={environment}
          setEnvironment={setEnvironment}
          componentUrl={componentUrl}
          publicKeyUrl={publicKeyUrl}
          onSubmit={sendRequest}
          authUrl={authUrl}
          layout={layout}
          setLayout={setLayout}
          signedInAs={signedInAs}
          onSignIn={() => {
            signInWithPopup(authUrl, form.client_id, form.redirect_url, (error) => {
              setSignInError(error ? `Sign-in failed: ${error.message}` : undefined);
              setSignInVersion(v => v + 1);
            });
          }}
          onSignOut={() => signOut(authUrl, form.client_id, form.redirect_url)}
        />
      </Box>
      <Box sx={{ flex: 1, display: 'flex', rowGap: 2, flexDirection: 'column', minWidth: 0 }}>
        <JsonDisplay result={request} mode={mode} title="Request Payload" />
        <JsonDisplay result={receivedParsedData} mode={mode} title="Response Payload" />
      </Box>
      <Box sx={{ flexGrow: 0, width: 300 }}>
        <RawDisplay
          data={receivedData}
          signature={receivedSignature}
          form={form}
          publicKeyUrl={publicKeyUrl}
        />
      </Box>
      <ComponentFrame
        url={frameUrl}
        componentUrl={componentUrl}
        authUrl={authUrl}
        clientId={form.client_id}
        redirectUrl={form.redirect_url ?? ''}
        onAnswer={handleData}
        onClose={closeFrame}
      />
    </Box>
  );
}

export default App
