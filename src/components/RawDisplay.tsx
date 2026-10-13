import { Divider, Paper, Typography, IconButton, Tooltip, Box } from "@mui/material"
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { copyToClipboard, decodeResult, verifySignature, verifyState } from "../utils";
import { useEffect, useState } from "react";

interface RawDisplayProps {
  data?: string;
  signature?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: Record<string, any>;
  publicKeyUrl: string;
}

const RawDisplay: React.FC<RawDisplayProps> = ({
  data,
  signature,
  form,
  publicKeyUrl,
}): React.ReactElement => {
  const [sigValid, setSigValid] = useState<boolean | null>(null);
  const [stateValid, setStateValid] = useState<boolean | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [responseForat, setResponseFormat] = useState<string>('');
  const [jwtExpiry, setJwtExpiry] = useState<{ at: Date; expired: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setResponseFormat('');
      setSigValid(null);
      setStateValid(null);
      setJwtExpiry(null);

      if (!data) return;
      const format = form.signatureFormat || 'raw';
      setResponseFormat(format ?? '');

      try {
        const valid = await verifySignature(
          data,
          signature || '',
          format,
          publicKeyUrl,
        );
        if (!active) return;

        setSigValid(valid);
        if (form.state) {
          const sValid = verifyState(data, form.state);
          if (!active) return;
          setStateValid(sValid);
        }
        if (format === 'jwt') {
          const { exp } = decodeResult(data) as { exp?: number };
          if (!active) return;
          setJwtExpiry(exp ? { at: new Date(exp * 1000), expired: exp * 1000 <= Date.now() } : null);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      active = false;
    };
  }, [data, signature, form, publicKeyUrl]);


  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Raw Display {responseForat ? `(${responseForat})` : ''}
      </Typography>

      {stateValid !== null && (
        <Typography variant="subtitle2" sx={{ color: stateValid ? 'lightgreen' : 'red', mt: 2 }}>
          State is {stateValid ? 'VALID' : 'INVALID'}
          <br />
          {stateValid
            ? '(request was sent by US)'
            : '(request.state in the result does not match the state that was sent)'}
        </Typography>
      )}
      {data && sigValid !== null && stateValid === null && (
        <Typography variant="subtitle2" sx={{ color: 'orange', mt: 2 }}>
          State not checked
          <br />
          (no state was sent with the request)
        </Typography>
      )}
      {sigValid !== null && (
        <Typography variant="subtitle2" sx={{ color: sigValid ? 'lightgreen' : 'red', mt: 1 }}>
          Signature is {sigValid ? 'VALID' : 'INVALID'}
          <br />
          {sigValid
            ? '(response is sent by OUP)'
            : '(the result was not signed with the Clearly.HUB key, or was changed)'}
        </Typography>
      )}
      {jwtExpiry && (
        <Typography
          variant="subtitle2"
          sx={{ color: jwtExpiry.expired ? 'red' : 'lightgreen', mt: 1 }}
        >
          JWT {jwtExpiry.expired ? 'EXPIRED at' : 'valid until'} {jwtExpiry.at.toLocaleTimeString()}
          <br />
          (a jwt result is only valid for 5 minutes)
        </Typography>
      )}

      {
        sigValid !== null || stateValid !== null
          ? <Divider sx={{ my: 2 }} />
          : null
      }

      {data && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={copied === 'data' ? 'Copied' : 'Copy data'}>
              <IconButton size="small" onClick={copyToClipboard.bind(null, data, 'data', setCopied)}>
                {copied === 'data' ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Typography variant="subtitle2" sx={{ mr: 1 }}>Data:</Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {data.length > 500 ? `${data.slice(0, 500)}...` : data}
          </Typography>
        </>
      )}

      {signature && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={copied === 'signature' ? 'Copied' : 'Copy signature'}>
              <IconButton size="small" onClick={copyToClipboard.bind(null, signature, 'signature', setCopied)}>
                {copied === 'signature'
                  ? <CheckIcon fontSize="small" />
                  : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Typography variant="subtitle2" sx={{ mr: 1 }}>Signature:</Typography>
          </Box>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {signature.length > 500 ? `${signature.slice(0, 500)}...` : signature}
          </Typography>
        </>
      )}

      {
        !data && (
          <Paper sx={{ p: 2, bgcolor: '#222', color: '#fff', mb: 2 }}>
            Waiting for data...
          </Paper>
        )
      }
    </Paper >
  )
};
export default RawDisplay;
