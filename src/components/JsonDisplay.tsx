import React, { useState } from 'react';
import { Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { Box } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ReactJson from '@microlink/react-json-view';
import { copyToClipboard } from '../utils';

interface JsonDisplayProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: Record<string, any>;
  title: string;
  mode?: string;
}

const fixData = (data: Record<string, unknown>): Record<string, unknown> => {
  Object.keys(data).forEach(key => {
    if (data[key] === '' || (Array.isArray(data[key]) && data[key].length === 0)) {
      delete data[key];
    }
  });
  return data;
};

const JsonDisplay: React.FC<JsonDisplayProps> = ({
  result,
  title,
  mode,
}): React.ReactElement => {
  let json: Record<string, unknown> = {};
  if (result) {
    const toParse = { ...result };
    if (mode === 'popup') {
      delete toParse.param;
      delete toParse.signatureParam;
    }
    json = fixData(toParse);
  }

  const [copied, setCopied] = useState<string | null>(null);

  return (
    <Paper elevation={2} sx={{ p: 3, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Tooltip title={copied === 'json' ? 'Copied' : `Copy ${title}`}>
          <span>
            <IconButton
              size="small"
              onClick={copyToClipboard.bind(null, JSON.stringify(json, null, 2), 'json', setCopied)}
              disabled={!result || Object.keys(json).length === 0}
            >
              {copied === 'json' ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="h6" gutterBottom>{title}</Typography>
      </Box>
      {result && Object.keys(result as object).length > 0 ? (
        <Box sx={{ overflow: 'auto', minWidth: 0 }}>
          <ReactJson
            src={json}
            name={false}
            theme="monokai"
            style={{ fontSize: 14, borderRadius: 8, marginBottom: 16, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}
            collapsed={false}
            enableClipboard={false}
            displayDataTypes={false}
            displayObjectSize={false}
            collapseStringsAfterLength={50}
            iconStyle='circle'
            indentWidth={4}
          />
        </Box>
      ) : (
        <Paper sx={{ p: 2, bgcolor: '#222', color: '#fff', mb: 2 }}>
          Waiting for data...
        </Paper>
      )}
    </Paper>
  );
};
export default JsonDisplay;
