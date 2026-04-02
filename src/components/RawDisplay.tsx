import { Divider, Paper, Typography, IconButton, Tooltip, Box } from "@mui/material"
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { copyToClipboard, verifySignature, verifyState } from "../utils";
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

  useEffect(() => {
    let active = true;
    void (async () => {
      setResponseFormat('');
      setSigValid(null);
      setStateValid(null);

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
          const sValid = verifyState(data, form.state, format);
          if (!active) return;
          setStateValid(sValid);
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

      {stateValid && (
        <Typography variant="subtitle2" sx={{ color: stateValid ? 'lightgreen' : 'red', mt: 2 }}>
          State is {stateValid ? 'VALID' : 'INVALID'}
          {stateValid && (
            <>
              <br />
              (request was sent by US)
            </>
          )}
        </Typography>
      )}
      {sigValid && (
        <>
          <Typography variant="subtitle2" sx={{ color: sigValid ? 'lightgreen' : 'red', mt: 1 }}>
            Signature is {sigValid ? 'VALID ' : 'INVALID'}
            {sigValid && (
              <>
                <br />
                (response is sent by OUP)
              </>
            )}
          </Typography>
        </>
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
