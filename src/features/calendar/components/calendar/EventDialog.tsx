import { useState, useEffect } from 'preact/hooks';
import type { JSX } from 'preact';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormGroup from '@mui/material/FormGroup';
import Checkbox from '@mui/material/Checkbox';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { CalendarEvent } from '../../data/calendarEvents';
import { UICalendarEventFormData, UIParticipant, UIRecurrencePattern } from '../../types';
import { participantsToArray } from '../../../../utils/participantUtils';
import { generateRRuleString, parseRRule } from '../../../../utils/recurrenceHelpers';
import {
    getCommonTimezones,
    getLocalTimezone,
    formatTimezoneDisplay,
} from '../../../../utils/timezoneHelpers';

interface ParticipantRow {
    email: string;
    name: string;
    required: boolean;
}

interface ParticipantSectionProps {
    participantRows: ParticipantRow[];
    onParticipantChange: (
        index: number,
        field: keyof ParticipantRow,
        value: string | boolean
    ) => void;
    onRemoveParticipant: (index: number) => void;
}

function ParticipantSection({
    participantRows,
    onParticipantChange,
    onRemoveParticipant,
}: ParticipantSectionProps) {
    const { t } = useTranslation();
    return (
        <Box>
            <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
                <PersonAddIcon fontSize="small" />
                {t('calendar.inviteParticipants')}
            </Typography>

            {/* Participant rows */}
            <Stack spacing={1.5}>
                {participantRows.map((row, index) => (
                    <Stack key={index} direction="row" spacing={1} alignItems="center">
                        <TextField
                            size="small"
                            label={t('calendar.email')}
                            type="email"
                            placeholder={t('calendar.emailPlaceholder')}
                            value={row.email}
                            onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                onParticipantChange(index, 'email', e.currentTarget.value)
                            }
                            sx={{ flex: 2 }}
                        />
                        <TextField
                            size="small"
                            label={t('calendar.name')}
                            placeholder={t('calendar.namePlaceholder')}
                            value={row.name}
                            onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                onParticipantChange(index, 'name', e.currentTarget.value)
                            }
                            sx={{ flex: 2 }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={row.required}
                                    onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                        onParticipantChange(
                                            index,
                                            'required',
                                            e.currentTarget.checked
                                        )
                                    }
                                    size="small"
                                />
                            }
                            label={
                                <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                                    {t('calendar.required')}
                                </Typography>
                            }
                            sx={{ minWidth: 110, mr: 0 }}
                        />
                        {row.email && (
                            <IconButton
                                size="small"
                                onClick={() => onRemoveParticipant(index)}
                                color="error"
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Stack>
                ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('calendar.participantHelper')}
            </Typography>
        </Box>
    );
}

interface RecurrenceSectionProps {
    recurrence: UIRecurrencePattern;
    startDate: Date;
    onRecurrenceChange: (pattern: UIRecurrencePattern) => void;
}

function RecurrenceSection({ recurrence, startDate, onRecurrenceChange }: RecurrenceSectionProps) {
    const { t } = useTranslation();

    const daysOfWeek = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    const dayLabels = ['calendar.monday', 'calendar.tuesday', 'calendar.wednesday', 'calendar.thursday', 'calendar.friday', 'calendar.saturday', 'calendar.sunday'];

    return (
        <Box>
            <Typography variant="subtitle2" gutterBottom>
                {t('calendar.recurrence')}
            </Typography>

            {/* Frequency Selection */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>{t('calendar.recurrence')}</InputLabel>
                <Select
                    value={recurrence.frequency}
                    label={t('calendar.recurrence')}
                    onChange={(e) =>
                        onRecurrenceChange({
                            ...recurrence,
                            frequency: e.target.value as any,
                        })
                    }
                >
                    <MenuItem value="none">{t('calendar.noRecurrence')}</MenuItem>
                    <MenuItem value="daily">{t('calendar.frequency.daily')}</MenuItem>
                    <MenuItem value="weekly">{t('calendar.frequency.weekly')}</MenuItem>
                    <MenuItem value="monthly">{t('calendar.frequency.monthly')}</MenuItem>
                    <MenuItem value="yearly">{t('calendar.frequency.yearly')}</MenuItem>
                </Select>
            </FormControl>

            {recurrence.frequency !== 'none' && (
                <>
                    {/* Interval */}
                    <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                        <Typography variant="body2">{t('calendar.interval')}</Typography>
                        <TextField
                            type="number"
                            size="small"
                            inputProps={{ min: 1, max: 365 }}
                            value={recurrence.interval || 1}
                            onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                onRecurrenceChange({
                                    ...recurrence,
                                    interval: parseInt(e.currentTarget.value) || 1,
                                })
                            }
                            sx={{ width: 80 }}
                        />
                        <Typography variant="body2">
                            {recurrence.frequency === 'daily' && t('calendar.intervalDays')}
                            {recurrence.frequency === 'weekly' && t('calendar.intervalWeeks')}
                            {recurrence.frequency === 'monthly' && t('calendar.intervalMonths')}
                            {recurrence.frequency === 'yearly' && t('calendar.intervalYears')}
                        </Typography>
                    </Stack>

                    {/* Days of week for weekly recurrence */}
                    {recurrence.frequency === 'weekly' && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                {t('calendar.recurrence.byDayOfWeek')}
                            </Typography>
                            <FormGroup row>
                                {daysOfWeek.map((day, idx) => (
                                    <FormControlLabel
                                        key={day}
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={(recurrence.byDayOfWeek || []).includes(day)}
                                                onChange={(e: JSX.TargetedEvent<HTMLInputElement>) => {
                                                    const newDays = e.currentTarget.checked
                                                        ? [...(recurrence.byDayOfWeek || []), day]
                                                        : (recurrence.byDayOfWeek || []).filter(d => d !== day);
                                                    onRecurrenceChange({
                                                        ...recurrence,
                                                        byDayOfWeek: newDays.length > 0 ? newDays : undefined,
                                                    });
                                                }}
                                            />
                                        }
                                        label={
                                            <Typography variant="caption">{t(dayLabels[idx])}</Typography>
                                        }
                                    />
                                ))}
                            </FormGroup>
                        </Box>
                    )}

                    {/* End condition */}
                    <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
                        <Typography variant="body2">{t('calendar.recurrence.endType')}</Typography>
                        <Select
                            size="small"
                            value={recurrence.endType}
                            onChange={(e) =>
                                onRecurrenceChange({
                                    ...recurrence,
                                    endType: e.target.value as any,
                                    endCount: undefined,
                                    endDate: undefined,
                                })
                            }
                            sx={{ width: 120 }}
                        >
                            <MenuItem value="never">{t('calendar.recurrence.endType.never')}</MenuItem>
                            <MenuItem value="after">{t('calendar.recurrence.endType.after')}</MenuItem>
                            <MenuItem value="until">{t('calendar.recurrence.endType.until')}</MenuItem>
                        </Select>

                        {recurrence.endType === 'after' && (
                            <>
                                <TextField
                                    type="number"
                                    size="small"
                                    inputProps={{ min: 1, max: 999 }}
                                    value={recurrence.endCount || 1}
                                    onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                        onRecurrenceChange({
                                            ...recurrence,
                                            endCount: parseInt(e.currentTarget.value) || 1,
                                        })
                                    }
                                    sx={{ width: 80 }}
                                />
                                <Typography variant="caption">{t('calendar.recurrence.occurrences')}</Typography>
                            </>
                        )}

                        {recurrence.endType === 'until' && (
                            <TextField
                                type="date"
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                value={
                                    recurrence.endDate
                                        ? recurrence.endDate.toISOString().split('T')[0]
                                        : ''
                                }
                                onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                    onRecurrenceChange({
                                        ...recurrence,
                                        endDate: e.currentTarget.value ? new Date(e.currentTarget.value) : undefined,
                                    })
                                }
                            />
                        )}
                    </Stack>
                </>
            )}
        </Box>
    );
}

interface EventDialogProps {
    event: CalendarEvent | null;
    initialDate: Date;
    onClose: () => void;
    onCreate: (data: UICalendarEventFormData) => void;
    onUpdate: (eventId: string, data: UICalendarEventFormData) => void;
    onDelete: (eventId: string) => void;
}

interface RecurrenceModificationChoice {
    thisOnly: boolean;
}

/**
 * Dialog for choosing whether to modify a single occurrence or entire series
 */
function RecurrenceModificationDialog({
    open,
    onClose,
    onConfirm,
    action,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: (choice: RecurrenceModificationChoice) => void;
    action: 'edit' | 'delete';
}) {
    const { t } = useTranslation();
    const [choice, setChoice] = useState(true); // true = this event only, false = entire series

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {action === 'edit'
                    ? t('calendar.recurrence.editChoice')
                    : t('calendar.recurrence.deleteChoice')}
            </DialogTitle>
            <DialogContent>
                <FormControl component="fieldset" sx={{ mt: 2 }}>
                    <RadioGroup
                        value={choice ? 'this' : 'series'}
                        onChange={(e) => setChoice(e.target.value === 'this')}
                    >
                        <FormControlLabel
                            value="this"
                            control={<Radio />}
                            label={
                                <Box>
                                    <Typography variant="body2">
                                        {action === 'edit'
                                            ? t('calendar.recurrence.editThisEvent')
                                            : t('calendar.recurrence.deleteThisEvent')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {action === 'edit'
                                            ? t('calendar.recurrence.editThisEventDesc')
                                            : t('calendar.recurrence.deleteThisEventDesc')}
                                    </Typography>
                                </Box>
                            }
                        />
                        <FormControlLabel
                            value="series"
                            control={<Radio />}
                            label={
                                <Box>
                                    <Typography variant="body2">
                                        {action === 'edit'
                                            ? t('calendar.recurrence.editAllEvents')
                                            : t('calendar.recurrence.deleteAllEvents')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {action === 'edit'
                                            ? t('calendar.recurrence.editAllEventsDesc')
                                            : t('calendar.recurrence.deleteAllEventsDesc')}
                                    </Typography>
                                </Box>
                            }
                        />
                    </RadioGroup>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.cancel')}</Button>
                <Button onClick={() => onConfirm({ thisOnly: choice })} variant="contained">
                    {t('common.confirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default function EventDialog({
    event,
    initialDate,
    onClose,
    onCreate,
    onUpdate,
    onDelete,
}: EventDialogProps) {
    const { t } = useTranslation();
    const mode = event ? 'edit' : 'create';
    const [formData, setFormData] = useState({
        title: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        description: '',
        location: '',
        virtualLocation: '',
        allDay: false,
        timezone: getLocalTimezone(),
        recurrence: {
            frequency: 'none' as const,
            interval: 1,
            endType: 'never' as const,
        } as UIRecurrencePattern,
    });
    const [participantRows, setParticipantRows] = useState<ParticipantRow[]>([
        { email: '', name: '', required: true },
    ]);
    const [modificationDialogOpen, setModificationDialogOpen] = useState(false);
    const [pendingModification, setPendingModification] = useState<{
        action: 'edit' | 'delete';
        callback: (choice: RecurrenceModificationChoice) => void;
    } | null>(null);

    // Initialize form data when dialog mounts
    useEffect(() => {
        if (mode === 'edit' && event) {
            const isAllDay = event.showWithoutTime || false;
            // Extract virtual location from virtualLocations
            const virtualLocation = event.virtualLocations
                ? Object.values(event.virtualLocations)[0]?.uri || ''
                : '';
            
            // Parse recurrence if present
            let recurrence: UIRecurrencePattern = {
                frequency: 'none',
                interval: 1,
                endType: 'never',
            };
            if (event.recurrenceRule) {
                const parsed = parseRRule(event.recurrenceRule, event.start);
                if (parsed) recurrence = parsed;
            }

            setFormData({
                title: event.title,
                startDate: event.start.toISOString().split('T')[0],
                startTime: isAllDay ? '00:00' : event.start.toTimeString().slice(0, 5),
                endDate: event.end.toISOString().split('T')[0],
                endTime: isAllDay ? '23:59' : event.end.toTimeString().slice(0, 5),
                description: event.description || '',
                location: event.location || '',
                virtualLocation,
                allDay: isAllDay,
                timezone: event.timeZone || getLocalTimezone(),
                recurrence,
            });

            // Convert participants to rows
            const existingParticipants = participantsToArray(event.participants);
            const rows: ParticipantRow[] = existingParticipants.map((p) => ({
                email: p.email || '',
                name: p.name || '',
                required: p.expectReply !== false,
            }));
            // Always add an empty row at the end
            rows.push({ email: '', name: '', required: true });
            setParticipantRows(rows);
        } else if (mode === 'create') {
            const dateStr = initialDate.toISOString().split('T')[0];
            const startHour = initialDate.getHours();
            const startTime = `${String(startHour).padStart(2, '0')}:00`;
            const endTime = `${String(startHour + 1).padStart(2, '0')}:00`;
            setFormData({
                title: '',
                startDate: dateStr,
                startTime: startTime,
                endDate: dateStr,
                endTime: endTime,
                description: '',
                location: '',
                virtualLocation: '',
                allDay: false,
                timezone: getLocalTimezone(),
                recurrence: {
                    frequency: 'none',
                    interval: 1,
                    endType: 'never',
                },
            });
        }
    }, []);

    const handleParticipantChange = (
        index: number,
        field: keyof ParticipantRow,
        value: string | boolean
    ) => {
        const updatedRows = [...participantRows];
        updatedRows[index] = { ...updatedRows[index], [field]: value };

        // If this is the last row and email is not empty, add a new empty row
        if (index === participantRows.length - 1 && field === 'email' && value) {
            setParticipantRows([...updatedRows, { email: '', name: '', required: true }]);
        }
        // If the email is cleared on the last row and there are other rows, remove it
        else if (
            index === participantRows.length - 1 &&
            field === 'email' &&
            !value &&
            participantRows.length > 1
        ) {
            setParticipantRows(updatedRows.slice(0, -1));
        }
        // Otherwise just update the rows
        else {
            setParticipantRows(updatedRows);
        }
    };

    const handleRemoveParticipant = (index: number) => {
        const updatedRows = participantRows.filter((_, i) => i !== index);
        // Ensure there's always at least one empty row
        if (updatedRows.length === 0 || updatedRows[updatedRows.length - 1].email !== '') {
            updatedRows.push({ email: '', name: '', required: true });
        }
        setParticipantRows(updatedRows);
    };

    const handleSubmit = () => {
        const start = new Date(`${formData.startDate}T${formData.startTime}`);
        const end = new Date(`${formData.endDate}T${formData.endTime}`);

        // Convert participant rows to UI participant objects (filter out empty rows)
        const participants: UIParticipant[] = participantRows
            .filter((row) => row.email.trim())
            .map((row) => ({
                email: row.email.trim(),
                name: row.name.trim() || undefined,
                required: row.required,
            }));

        const data: UICalendarEventFormData = {
            title: formData.title,
            start,
            end,
            description: formData.description,
            location: formData.location,
            virtualLocation: formData.virtualLocation,
            participants,
            timeZone: formData.timezone,
            showWithoutTime: formData.allDay,
            recurrence: formData.recurrence,
        };

        if (mode === 'edit' && event) {
            // If editing a recurring event instance, ask if they want to modify just this or all
            if (event.isRecurringEventInstance && event.recurrenceRule) {
                setPendingModification({
                    action: 'edit',
                    callback: (choice) => {
                        if (choice.thisOnly) {
                            // For now, update the entire series
                            // TODO: In future, implement instance-specific modifications
                            onUpdate(event.id, data);
                        } else {
                            onUpdate(event.id, data);
                        }
                        setModificationDialogOpen(false);
                        setPendingModification(null);
                    },
                });
                setModificationDialogOpen(true);
            } else {
                onUpdate(event.id, data);
            }
        } else {
            onCreate(data);
        }
    };

    const handleDelete = () => {
        if (!event) return;

        // If deleting a recurring event instance, ask if they want to delete just this or all
        if (event.isRecurringEventInstance && event.recurrenceRule) {
            setPendingModification({
                action: 'delete',
                callback: (choice) => {
                    if (choice.thisOnly) {
                        // For now, delete the entire series
                        // TODO: In future, implement instance-specific deletion with exception dates
                        onDelete(event.id);
                    } else {
                        onDelete(event.id);
                    }
                    setModificationDialogOpen(false);
                    setPendingModification(null);
                },
            });
            setModificationDialogOpen(true);
        } else {
            onDelete(event.id);
        }
    };

    return (
        <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{mode === 'create' ? t('calendar.create') : t('calendar.edit')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label={t('calendar.title')}
                        fullWidth
                        value={formData.title}
                        onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                            setFormData({
                                ...formData,
                                title: e.currentTarget.value,
                            })
                        }
                    />
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label={t('calendar.startDate')}
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.startDate}
                            onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                setFormData({
                                    ...formData,
                                    startDate: e.currentTarget.value,
                                })
                            }
                        />
                        <TextField
                            label={t('calendar.startTime')}
                            type="time"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.startTime}
                            onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                setFormData({
                                    ...formData,
                                    startTime: e.currentTarget.value,
                                })
                            }
                            disabled={formData.allDay}
                        />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label={t('calendar.endDate')}
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.endDate}
                            onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                setFormData({
                                    ...formData,
                                    endDate: e.currentTarget.value,
                                })
                            }
                        />
                        <TextField
                            label={t('calendar.endTime')}
                            type="time"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.endTime}
                            onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                setFormData({
                                    ...formData,
                                    endTime: e.currentTarget.value,
                                })
                            }
                            disabled={formData.allDay}
                        />
                    </Stack>

                    {/* All-day and Timezone Section */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.allDay}
                                    onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                                        setFormData({
                                            ...formData,
                                            allDay: e.currentTarget.checked,
                                        })
                                    }
                                />
                            }
                            label={t('calendar.allDay')}
                        />
                        <FormControl fullWidth>
                            <InputLabel id="timezone-label">{t('calendar.timezone')}</InputLabel>
                            <Select
                                labelId="timezone-label"
                                value={formData.timezone}
                                label={t('calendar.timezone')}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        timezone: e.target.value as string,
                                    })
                                }
                                disabled={formData.allDay}
                            >
                                {getCommonTimezones().map((tz) => (
                                    <MenuItem key={tz} value={tz}>
                                        {formatTimezoneDisplay(tz)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    <TextField
                        label={t('calendar.description')}
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                            setFormData({
                                ...formData,
                                description: e.currentTarget.value,
                            })
                        }
                    />
                    <TextField
                        label={t('calendar.location')}
                        fullWidth
                        placeholder={t('calendar.locationPlaceholder')}
                        value={formData.location}
                        onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                            setFormData({
                                ...formData,
                                location: e.currentTarget.value,
                            })
                        }
                    />
                    <TextField
                        label={t('calendar.virtualLocation')}
                        fullWidth
                        placeholder={t('calendar.virtualLocationPlaceholder')}
                        value={formData.virtualLocation}
                        onChange={(e: JSX.TargetedEvent<HTMLInputElement>) =>
                            setFormData({
                                ...formData,
                                virtualLocation: e.currentTarget.value,
                            })
                        }
                        helperText={t('calendar.helperText')}
                    />

                    <ParticipantSection
                        participantRows={participantRows}
                        onParticipantChange={handleParticipantChange}
                        onRemoveParticipant={handleRemoveParticipant}
                    />

                    <RecurrenceSection
                        recurrence={formData.recurrence}
                        startDate={new Date(`${formData.startDate}T${formData.startTime}`)}
                        onRecurrenceChange={(pattern) =>
                            setFormData({
                                ...formData,
                                recurrence: pattern,
                            })
                        }
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                {mode === 'edit' && event && (
                    <Button
                        onClick={handleDelete}
                        color="error"
                        startIcon={<DeleteIcon />}
                        sx={{ mr: 'auto' }}
                    >
                        {t('common.delete')}
                    </Button>
                )}
                <Button onClick={onClose}>{t('common.cancel')}</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!formData.title}>
                    {mode === 'create' ? t('calendar.createAndSendInvites') : t('calendar.saveAndUpdateInvites')}
                </Button>
            </DialogActions>

            {/* Recurrence modification choice dialog */}
            {pendingModification && (
                <RecurrenceModificationDialog
                    open={modificationDialogOpen}
                    onClose={() => {
                        setModificationDialogOpen(false);
                        setPendingModification(null);
                    }}
                    onConfirm={(choice) => {
                        pendingModification.callback(choice);
                    }}
                    action={pendingModification.action}
                />
            )}
        </Dialog>
    );
}
