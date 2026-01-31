/**
 * Dialog for creating and editing calendars
 */

import { useState, useEffect } from 'preact/hooks';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';
import type { UICalendar, UICalendarFormData } from '../data/calendar';

interface CalendarManagementDialogProps {
    open: boolean;
    calendar?: UICalendar | null;
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
    onClose,
    onSave,
}: CalendarManagementDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(DEFAULT_COLORS[0]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when dialog opens or calendar changes
    useEffect(() => {
        if (open) {
            if (calendar) {
                setName(calendar.name);
                setDescription(calendar.description || '');
                setColor(calendar.color || DEFAULT_COLORS[0]);
            } else {
                setName('');
                setDescription('');
                setColor(DEFAULT_COLORS[0]);
            }
            setError(null);
        }
    }, [open, calendar]);

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
            });
            onClose();
        } catch (err) {
            console.error('Failed to save calendar:', err);
            setError(t('calendar.failedToSaveCalendar'));
        } finally {
            setSaving(false);
        }
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
