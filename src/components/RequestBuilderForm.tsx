import React from 'react';
import {
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Select,
  InputLabel,
  FormControl,
  Paper,
  IconButton,
  InputAdornment,
  Tooltip,
  Box,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { v4 as uuidv4 } from 'uuid';
import { HELP } from '../utils';

const ACTIONS = [
  'SELECT_HUB',
  'SELECT_SUBSCRIPTION',
  'REGISTER_RESOURCE',
];

interface RequestBuilderFormProps {
  mode: 'redirect' | 'popup';
  setMode: React.Dispatch<React.SetStateAction<'redirect' | 'popup'>>;
  componentUrl: string;
  setComponentUrl: React.Dispatch<React.SetStateAction<string>>;
  publicKeyUrl: string;
  setPublicKeyUrl: React.Dispatch<React.SetStateAction<string>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onSubmit: (mode: 'redirect' | 'popup') => void;
}

const RequestBuilderForm: React.FC<RequestBuilderFormProps> = ({
  mode,
  setMode,
  componentUrl,
  setComponentUrl,
  publicKeyUrl,
  setPublicKeyUrl,
  form,
  setForm,
  onSubmit,
}): React.ReactElement => {
  const handleChange = (field: string, value: unknown) => {
    if (field.includes('.')) {
      const keys = field.split('.');
      setForm(prev => {
        const next: Record<string, unknown> = { ...prev };
        let cur: Record<string, unknown> = next;
        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
          cur = cur[k] as Record<string, unknown>;
        }
        cur[keys[keys.length - 1]] = value;
        return next;
      });
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };


  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Request Builder
      </Typography>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={() => { onSubmit(mode); }}
          disabled={
            !componentUrl ||
            !publicKeyUrl ||
            !form.actions?.[0] ||
            !form.client_id ||
            !form.redirect_url ||
            (form.actions?.[0] === 'REGISTER_RESOURCE' && (!form.data?.url || !form.data?.format))
          }
        >
          Start Component
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="mode-label">Mode</InputLabel>
            <Select
              labelId="mode-label"
              value={mode}
              label="Mode"
              onChange={e => setMode(e.target.value as 'redirect' | 'popup')}
            >
              <MenuItem value="redirect">Redirect</MenuItem>
              <MenuItem value="popup">Popup</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.mode}</Typography>} arrow>
            <IconButton size="small" aria-label="mode-help">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            label="Client ID"
            value={form.client_id ?? ''}
            onChange={e => handleChange('client_id', e.target.value)}
            fullWidth
            required
            error={!form.client_id}
          />
          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.client_id}</Typography>} arrow>
            <IconButton size="small" aria-label="client-id-help">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            label="Component URL"
            value={componentUrl}
            onChange={e => setComponentUrl(e.target.value)}
            fullWidth
            required
            error={!componentUrl}
            disabled
          />
          <Box component="span" aria-hidden="true" sx={{ width: 36, display: 'inline-block' }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            label="Public Key URL"
            value={publicKeyUrl}
            onChange={e => setPublicKeyUrl(e.target.value)}
            fullWidth
            required
            error={!publicKeyUrl}
            disabled
          />
          <Box component="span" aria-hidden="true" sx={{ width: 36, display: 'inline-block' }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            label="Redirect URL"
            value={form.redirect_url ?? ''}
            onChange={e => handleChange('redirect_url', e.target.value)}
            fullWidth
            required
            error={!form.redirect_url}
          />
          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.redirect_url}</Typography>} arrow>
            <IconButton size="small" aria-label="redirect-url-help">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl fullWidth required error={!form.actions?.[0]}>
            <InputLabel id="actions-label">Action</InputLabel>
            <Select
              labelId="actions-label"
              value={form.actions?.[0] ?? ''}
              label="Action"
              onChange={e => {
                const val = e.target.value as string;
                handleChange('actions', [val]);
                if (val !== 'REGISTER_RESOURCE') {
                  // clear resource-specific fields so they become empty strings
                  handleChange('data', '');
                }
              }}
            >
              {ACTIONS.map(action => (
                <MenuItem key={action} value={action}>{action}</MenuItem>
              ))}
            </Select>
            {!form.actions?.[0] && <Typography color="error" variant="caption">Action is required</Typography>}
          </FormControl>
          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.action}</Typography>} arrow>
            <IconButton size="small" aria-label="action-help">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {form.actions?.[0] === 'REGISTER_RESOURCE' && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Resource URL"
                value={form.data?.url ?? ''}
                onChange={e => handleChange('data.url', e.target.value)}
                fullWidth
                required
                error={!form.data?.url}
              />
              <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.resourceUrl}</Typography>} arrow>
                <IconButton size="small" aria-label="resource-url-help">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl fullWidth required error={!form.data?.format}>
                <InputLabel id="resource-format-label">Resource Format</InputLabel>
                <Select
                  labelId="resource-format-label"
                  value={form.data?.format ?? ''}
                  label="Resource Format"
                  onChange={e => handleChange('data.format', e.target.value)}
                >
                  <MenuItem value="">Select format…</MenuItem>
                  <MenuItem value="api">api</MenuItem>
                  <MenuItem value="api_documentation">api_documentation</MenuItem>
                  <MenuItem value="3dtiles">3dtiles</MenuItem>
                  <MenuItem value="3dterrain">3dterrain</MenuItem>
                  <MenuItem value="3dpointclouds">3dpointclouds</MenuItem>
                  <MenuItem value="bim">bim</MenuItem>
                  <MenuItem value="geojson">geojson</MenuItem>
                  <MenuItem value="sensor_data_rest">sensor_data_rest</MenuItem>
                  <MenuItem value="sensor_data_mqtt">sensor_data_mqtt</MenuItem>
                  <MenuItem value="sensor_data_websocket">sensor_data_websocket</MenuItem>
                  <MenuItem value="tilejson">tilejson</MenuItem>
                  <MenuItem value="tms">tms</MenuItem>
                  <MenuItem value="wfs">wfs</MenuItem>
                  <MenuItem value="wms">wms</MenuItem>
                  <MenuItem value="wmts">wmts</MenuItem>
                  <MenuItem value="xyz">xyz</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.resourceFormat}</Typography>} arrow>
                <IconButton size="small" aria-label="resource-format-help">
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            label="Param"
            value={form.param ?? ''}
            onChange={e => handleChange('param', e.target.value)}
            disabled={mode === 'popup'}
            fullWidth
          />
          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.param}</Typography>} arrow>
            <IconButton size="small" aria-label="param-help">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            label="Sig Param"
            value={form.signatureParam ?? ''}
            onChange={e => handleChange('signatureParam', e.target.value)}
            disabled={mode === 'popup'}
            fullWidth
          />
          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.signatureParam}</Typography>} arrow>
            <IconButton size="small" aria-label="sigparam-help">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="signature-format-label">Signature Format</InputLabel>
            <Select
              labelId="signature-format-label"
              value={form.signatureFormat ?? ''}
              label="Signature Format"
              onChange={e => handleChange('signatureFormat', e.target.value)}
              disabled={form.actions?.[0] === 'LOGOUT'}
            >
              <MenuItem value="">Select format…</MenuItem>
              <MenuItem value="raw">raw</MenuItem>
              <MenuItem value="jwt">jwt</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.signatureFormat}</Typography>} arrow>
            <IconButton size="small" aria-label="signature-format-help">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            label="Require email"
            value={form.email ?? ''}
            onChange={e => handleChange('email', e.target.value)}
            disabled={form.actions?.[0] === 'LOGOUT'}
            fullWidth
          />
          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.email}</Typography>} arrow>
            <IconButton size="small" aria-label="email-help">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            label="State"
            value={form.state ?? ''}
            onChange={e => handleChange('state', e.target.value)}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleChange('state', uuidv4())}
                    title="Generate new state UUID"
                    tabIndex={-1}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title={<Typography sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{HELP.state}</Typography>} arrow>
            <IconButton size="small" aria-label="state-help">
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Stack>
    </Paper>
  );
};
export default RequestBuilderForm;
