import Box from "@mui/material/Box";
import RequestBuilderForm from "./components/RequestBuilderForm";
import JsonDisplay from "./components/JsonDisplay";
import RawDisplay from "./components/RawDisplay";
import { useEffect, useState, useMemo } from "react";
import { CONFIG, storeForm } from "./utils";

const App = (): React.ReactElement | null => {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);

  const [mode, setMode] = useState<'redirect' | 'popup'>(
    localStorage.getItem('playground-mode') === 'redirect' ? 'redirect' : 'popup',
  );

  const [componentUrl, setComponentUrl] = useState<string>(() => CONFIG.componentUrl);
  const [publicKeyUrl, setPublicKeyUrl] = useState<string>(() => CONFIG.publicKeyUrl);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<Record<string, any>>(
    localStorage.getItem('playground-form')
      ? JSON.parse(localStorage.getItem('playground-form')!)
      : {
      }
  );

  const [receivedData, setReceivedData] = useState<string | undefined>();
  const [receivedParsedData, setReceivedParsedData] = useState<Record<string, unknown> | undefined>();
  const [receivedSignature, setReceivedSignature] = useState<string | undefined>();

  const [checking, setChecking] = useState(true);

  const handleData = (data: string, signature?: string) => {
    const fixedData = data?.replace(/ /g, '+');
    const fixedSignature = signature?.replace(/ /g, '+');

    let parsed: Record<string, unknown> = {};

    try {
      parsed = JSON.parse(atob(fixedData || ''));
    } catch {
      parsed = JSON.parse(atob(fixedData?.split('.')[1] || ''))
    }

    setReceivedData(fixedData);
    setReceivedParsedData(parsed);
    setReceivedSignature(fixedSignature);
  };

  const sendRequest = (mode: 'redirect' | 'popup'): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = { ...form };
    const payloadToSend = { ...payload };
    if (mode === 'popup') {
      delete payloadToSend.param;
      delete payloadToSend.signatureParam;
    }
    if (payloadToSend.actions?.[0] === 'LOGOUT') {
      delete payloadToSend.email;
      delete payloadToSend.signatureFormat;
    }
    switch (mode) {
      case 'popup': {
        // omit email for logout action

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
  }, []);


  useEffect(() => {
    localStorage.setItem('playground-mode', mode);
    localStorage.setItem('playground-component-url', componentUrl);
    localStorage.setItem('playground-public-key-url', publicKeyUrl);
  }, [mode, componentUrl, publicKeyUrl]);

  useEffect(() => {
    setChecking(true);
    const params: Record<string, string> = {};

    for (const [key, value] of urlParams.entries()) {
      params[key] = value;
    }

    const requestPayload = params.request;
    if (requestPayload) {
      // inside popup:
      sessionStorage.setItem('playground-is-popup', 'true');
      const payload = JSON.parse(atob(requestPayload));
      const base64 = btoa(JSON.stringify(payload));

      setChecking(false);
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
      setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParams]);

  useEffect(() => {
    storeForm(form);

    setReceivedData(undefined);
    setReceivedParsedData(undefined);
    setReceivedSignature(undefined);
  }, [form]);

  if (urlParams.has('request')) {
    return null;
  }
  if (checking) {
    return null;
  }

  return (
    <Box display="flex" flexDirection="row" gap={2} sx={{
      width: '100%',
      maxWidth: '100vw',
      height: '100vh',
      boxSizing: 'border-box',
      p: 4,
      alignItems: 'flex-start',
    }}>
      <Box flexGrow={0} sx={{ width: 375 }}>
        <RequestBuilderForm
          form={form}
          setForm={setForm}
          mode={mode}
          setMode={setMode}
          componentUrl={componentUrl}
          setComponentUrl={setComponentUrl}
          publicKeyUrl={publicKeyUrl}
          setPublicKeyUrl={setPublicKeyUrl}
          onSubmit={sendRequest}
        />
      </Box>
      <Box flex={1} display="flex" rowGap={2} flexDirection="column" sx={{ minWidth: 0 }}>
        <JsonDisplay result={form} mode={mode} title="Request Payload" />
        <JsonDisplay result={receivedParsedData} mode={mode} title="Response Payload" />
      </Box>
      <Box flexGrow={0} sx={{ width: 300 }}>
        <RawDisplay
          data={receivedData}
          signature={receivedSignature}
          form={form}
          publicKeyUrl={publicKeyUrl}
        />
      </Box>
    </Box>
  );
}

export default App
