/**
 * Dialog for creating and editing calendars
 */

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { UICalendar, UICalendarFormData, UIShareRights } from '../data/calendar';
import type { UIPrincipal } from '../data/principal';
import { fetchPrincipals } from '../data/principal/actions';

interface CalendarManagementDialogProps {
    open: boolean;
    calendar?: UICalendar | null;
    accountId: string | null;
    onClose: () => void;
    onSave: (data: UICalendarFormData) => Promise<void>;
}

const DEFAULT_COLORS = [
    '#1976d2', // Blue
    '#388e3c', // Green
    '#d32f2f', // Red
    '#f57c00', // Orange
    '#7b1fa2', // Purple
    '#c2185b', // Pink
    '#0097a7', // Cyan
    '#5d4037', // Brown
];

export default function CalendarManagementDialog({
    open,
    calendar,
    accountId,
    onClose,
    onSave,
}: CalendarManagementDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(DEFAULT_COLORS[0]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const permissionConfig = [
        { key: 'mayReadFreeBusy' as keyof UIShareRights, label: t('calendar.mayReadFreeBusy') },
        { key: 'mayReadItems' as keyof UIShareRights, label: t('calendar.mayReadItems') },
        { key: 'mayWriteAll' as keyof UIShareRights, label: t('calendar.mayWriteAll') },
        { key: 'mayWriteOwn' as keyof UIShareRights, label: t('calendar.mayWriteOwn') },
        { key: 'mayUpdatePrivate' as keyof UIShareRights, label: t('calendar.mayUpdatePrivate') },
        { key: 'mayRSVP' as keyof UIShareRights, label: t('calendar.mayRSVP') },
        { key: 'mayAdmin' as keyof UIShareRights, label: t('calendar.mayAdmin') },
    ];

    // Sharing state
    const [principals, setPrincipals] = useState<UIPrincipal[]>([]);
    const [selectedPrincipal, setSelectedPrincipal] = useState<UIPrincipal | null>(null);
    const [shareWith, setShareWith] = useState<Record<string, UIShareRights>>({});
    const [selectedRights, setSelectedRights] = useState<UIShareRights>({
        mayReadFreeBusy: true,
        mayReadItems: false,
        mayWriteAll: false,
        mayWriteOwn: false,
        mayUpdatePrivate: false,
        mayRSVP: false,
        mayAdmin: false,
    });

    // Reset form when dialog opens or calendar changes
    useEffect(() => {
        if (open) {
            if (calendar) {
                setName(calendar.name);
                setDescription(calendar.description || '');
                setColor(calendar.color || DEFAULT_COLORS[0]);
                setShareWith(calendar.shareWith || {});
            } else {
                setName('');
                setDescription('');
                setColor(DEFAULT_COLORS[0]);
                setShareWith({});
            }
            setSelectedPrincipal(null);
            setSelectedRights({
                mayReadFreeBusy: true,
                mayReadItems: false,
                mayWriteAll: false,
                mayWriteOwn: false,
                mayUpdatePrivate: false,
                mayRSVP: false,
                mayAdmin: false,
            });
            setError(null);

            // Load principals if editing and user has mayAdmin permission
            if (calendar?.permissions?.mayAdmin && accountId) {
                fetchPrincipals(accountId)
                    .then(setPrincipals)
                    .catch((err) => console.error('Failed to load principals:', err));
            }
        }
    }, [open, calendar, accountId]);

    const handleSave = async () => {
        if (!name.trim()) {
            setError(t('calendar.nameRequired'));
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave({
                name: name.trim(),
                description: description.trim() || undefined,
                color,
                shareWith: Object.keys(shareWith).length > 0 ? shareWith : undefined,
            });
            onClose();
        } catch (err) {
            console.error('Failed to save calendar:', err);
            setError(t('calendar.failedToSaveCalendar'));
        } finally {
            setSaving(false);
        }
    };

    const handleAddShare = () => {
        if (!selectedPrincipal) return;

        setShareWith((prev) => ({
            ...prev,
            [selectedPrincipal.id]: { ...selectedRights },
        }));
        setSelectedPrincipal(null);
        setSelectedRights({
            mayReadFreeBusy: true,
            mayReadItems: false,
            mayWriteAll: false,
            mayWriteOwn: false,
            mayUpdatePrivate: false,
            mayRSVP: false,
            mayAdmin: false,
        });
    };

    const handleRemoveShare = (principalId: string) => {
        setShareWith((prev) => {
            const updated = { ...prev };
            delete updated[principalId];
            return updated;
        });
    };

    const handleRightChange = (right: keyof UIShareRights) => (event: any) => {
        setSelectedRights((prev) => ({
            ...prev,
            [right]: event.target.checked,
        }));
    };

    const handleCancel = () => {
        setError(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
            <DialogTitle>
                {calendar ? t('calendar.editCalendar') : t('calendar.createCalendar')}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 2 }}>
                    <TextField
                        autoFocus
                        label={t('calendar.calendarName')}
                        fullWidth
                        required
                        value={name}
                        onChange={(e) => setName((e.target as HTMLInputElement).value)}
                        error={!!error && !name.trim()}
                        helperText={error && !name.trim() ? error : ''}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        label={t('calendar.calendarDescription')}
                        fullWidth
                        multiline
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription((e.target as HTMLInputElement).value)}
                        sx={{ mb: 3 }}
                    />

                    <Box>
                        <Box sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                            {t('calendar.calendarColor')}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {DEFAULT_COLORS.map((c) => (
                                <Box
                                    key={c}
                                    onClick={() => setColor(c)}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        backgroundColor: c,
                                        cursor: 'pointer',
                                        border: color === c ? '3px solid #000' : '2px solid #ccc',
                                        boxShadow: color === c ? '0 0 0 2px #fff' : 'none',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'scale(1.1)',
                                        },
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>

                    {calendar?.permissions && (
                        <Box sx={{ mt: 3 }}>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                {t('calendar.permissions')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {permissionConfig.map(({ key, label }) => (
                                    <Box
                                        key={key}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                    >
                                        {calendar.permissions![key] ? (
                                            <CheckCircleIcon
                                                sx={{ fontSize: 18, color: 'success.main' }}
                                            />
                                        ) : (
                                            <CancelIcon
                                                sx={{ fontSize: 18, color: 'text.disabled' }}
                                            />
                                        )}
                                        <Typography variant="body2">{label}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {calendar?.permissions?.mayAdmin && (
                        <Box sx={{ mt: 3 }}>
                            <Divider sx={{ mb: 2 }} />
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                {t('calendar.sharing')}
                            </Typography>

                            {/* Add new share */}
                            <Box sx={{ mb: 3 }}>
                                <Autocomplete
                                    options={principals.filter((p) => !shareWith[p.id])}
                                    getOptionLabel={(option) => option.email || option.name}
                                    value={selectedPrincipal}
                                    onChange={(_, newValue) => setSelectedPrincipal(newValue)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={t('calendar.selectPrincipal')}
                                            size="small"
                                        />
                                    )}
                                    sx={{ mb: 2 }}
                                />

                                {selectedPrincipal && (
                                    <Box>
                                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                                            {t('calendar.selectPermissions')}
                                        </Typography>
                                        <FormGroup sx={{ pl: 1 }}>
                                            {permissionConfig.map(({ key, label }) => (
                                                <FormControlLabel
                                                    key={key}
                                                    control={
                                                        <Checkbox
                                                            checked={selectedRights[key]}
                                                            onChange={handleRightChange(key)}
                                                            size="small"
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="body2">
                                                            {label}
                                                        </Typography>
                                                    }
                                                />
                                            ))}
                                        </FormGroup>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={handleAddShare}
                                            sx={{ mt: 1 }}
                                        >
                                            {t('calendar.addShare')}
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            {/* Current shares */}
                            {Object.keys(shareWith).length > 0 && (
                                <Box>
                                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                                        {t('calendar.currentShares')}
                                    </Typography>
                                    {Object.entries(shareWith).map(([principalId, rights]) => {
                                        const principal = principals.find(
                                            (p) => p.id === principalId
                                        );
                                        const displayName = principal
                                            ? principal.email || principal.name
                                            : principalId;
                                        const activeRights = Object.entries(rights)
                                            .filter(([_, value]) => value)
                                            .map(([key]) => {
                                                const config = permissionConfig.find(
                                                    (c) => c.key === key
                                                );
                                                return config ? config.label : key;
                                            })
                                            .join(', ');

                                        return (
                                            <Box
                                                key={principalId}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    p: 1,
                                                    mb: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                }}
                                            >
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 500 }}
                                                    >
                                                        {displayName}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {activeRights ||
                                                            t('calendar.noPermissions')}
                                                    </Typography>
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRemoveShare(principalId)}
                                                    sx={{ color: 'error.main' }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>
                    )}

                    {error && name.trim() && (
                        <Box sx={{ mt: 2, color: 'error.main', fontSize: '0.875rem' }}>{error}</Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel} disabled={saving}>
                    {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} variant="contained" disabled={saving}>
                    {calendar ? t('common.save') : t('common.create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
