import { useState, useEffect } from 'preact/hooks';
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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { CalendarEvent } from '../../data/calendarEvents';
import { UICalendarEventFormData, UIParticipant } from '../../types';
import { participantsToArray } from '../../../../utils/participantUtils';
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

interface EventDialogProps {
    event: CalendarEvent | null;
    initialDate: Date;
    onClose: () => void;
    onCreate: (data: UICalendarEventFormData) => void;
    onUpdate: (eventId: string, data: UICalendarEventFormData) => void;
    onDelete: (eventId: string) => void;
}

export default function EventDialog({
    event,
    initialDate,
    onClose,
    onCreate,
    onUpdate,
    onDelete,
}: EventDialogProps) {
    const mode = event ? 'edit' : 'create';
    const [formData, setFormData] = useState({
        title: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        description: '',
        location: '',
        allDay: false,
        timezone: getLocalTimezone(),
    });
    const [participantRows, setParticipantRows] = useState<ParticipantRow[]>([
        { email: '', name: '', required: true },
    ]);

    // Initialize form data when dialog mounts
    useEffect(() => {
        if (mode === 'edit' && event) {
            const isAllDay = event.showWithoutTime || false;
            setFormData({
                title: event.title,
                startDate: event.start.toISOString().split('T')[0],
                startTime: isAllDay ? '00:00' : event.start.toTimeString().slice(0, 5),
                endDate: event.end.toISOString().split('T')[0],
                endTime: isAllDay ? '23:59' : event.end.toTimeString().slice(0, 5),
                description: event.description || '',
                location: event.location || '',
                allDay: isAllDay,
                timezone: event.timeZone || getLocalTimezone(),
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
                allDay: false,
                timezone: getLocalTimezone(),
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
            participants,
            timeZone: formData.timezone,
            showWithoutTime: formData.allDay,
        };

        if (mode === 'edit' && event) {
            onUpdate(event.id, data);
        } else {
            onCreate(data);
        }
    };

    return (
        <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{mode === 'create' ? 'Create Event' : 'Edit Event'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Title"
                        fullWidth
                        value={formData.title}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                title: (e.target as HTMLInputElement).value,
                            })
                        }
                    />
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Start Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.startDate}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    startDate: (e.target as HTMLInputElement).value,
                                })
                            }
                        />
                        <TextField
                            label="Start Time"
                            type="time"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.startTime}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    startTime: (e.target as HTMLInputElement).value,
                                })
                            }
                            disabled={formData.allDay}
                        />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="End Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.endDate}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    endDate: (e.target as HTMLInputElement).value,
                                })
                            }
                        />
                        <TextField
                            label="End Time"
                            type="time"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.endTime}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    endTime: (e.target as HTMLInputElement).value,
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
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            allDay: (e.target as HTMLInputElement).checked,
                                        })
                                    }
                                />
                            }
                            label="All-day event"
                        />
                        <FormControl fullWidth>
                            <InputLabel id="timezone-label">Timezone</InputLabel>
                            <Select
                                labelId="timezone-label"
                                value={formData.timezone}
                                label="Timezone"
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
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                description: (e.target as HTMLInputElement).value,
                            })
                        }
                    />
                    <TextField
                        label="Location"
                        fullWidth
                        placeholder="Enter event location"
                        value={formData.location}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                location: (e.target as HTMLInputElement).value,
                            })
                        }
                    />

                    {/* Participants Section */}
                    <Box>
                        <Typography
                            variant="subtitle2"
                            gutterBottom
                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                            <PersonAddIcon fontSize="small" />
                            Invite Participants
                        </Typography>

                        {/* Participant rows */}
                        <Stack spacing={1.5}>
                            {participantRows.map((row, index) => (
                                <Stack key={index} direction="row" spacing={1} alignItems="center">
                                    <TextField
                                        size="small"
                                        label="Email"
                                        type="email"
                                        placeholder="attendee@example.com"
                                        value={row.email}
                                        onChange={(e) =>
                                            handleParticipantChange(
                                                index,
                                                'email',
                                                (e.target as HTMLInputElement).value
                                            )
                                        }
                                        sx={{ flex: 2 }}
                                    />
                                    <TextField
                                        size="small"
                                        label="Name (optional)"
                                        placeholder="John Doe"
                                        value={row.name}
                                        onChange={(e) =>
                                            handleParticipantChange(
                                                index,
                                                'name',
                                                (e.target as HTMLInputElement).value
                                            )
                                        }
                                        sx={{ flex: 2 }}
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={row.required}
                                                onChange={(e) =>
                                                    handleParticipantChange(
                                                        index,
                                                        'required',
                                                        (e.target as HTMLInputElement).checked
                                                    )
                                                }
                                                size="small"
                                            />
                                        }
                                        label={
                                            <Typography
                                                variant="caption"
                                                sx={{ whiteSpace: 'nowrap' }}
                                            >
                                                Required
                                            </Typography>
                                        }
                                        sx={{ minWidth: 110, mr: 0 }}
                                    />
                                    {row.email && (
                                        <IconButton
                                            size="small"
                                            onClick={() => handleRemoveParticipant(index)}
                                            color="error"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Stack>
                            ))}
                        </Stack>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 1, display: 'block' }}
                        >
                            Participants will receive email invitations. Toggle "Required" to mark
                            attendance as optional.
                        </Typography>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                {mode === 'edit' && event && (
                    <Button
                        onClick={() => onDelete(event.id)}
                        color="error"
                        startIcon={<DeleteIcon />}
                        sx={{ mr: 'auto' }}
                    >
                        Delete
                    </Button>
                )}
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!formData.title}>
                    {mode === 'create' ? 'Create & Send Invites' : 'Save & Update Invites'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
