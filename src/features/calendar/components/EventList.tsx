import { useState } from 'preact/hooks';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import VideocamIcon from '@mui/icons-material/Videocam';
import type { UICalendarEvent } from '../data/calendarEvent';
import { formatDateWithTimezone, getLocalTimezone } from '../../../utils/timezoneHelpers';
import { useTranslation } from 'react-i18next';

interface EventListProps {
    selectedDate: Date;
    events: UICalendarEvent[];
    error: string | null;
    onEditEvent: (event: UICalendarEvent) => void;
    onDeleteEvent: (eventId: string, recurrenceId?: string) => void;
    onClearError: () => void;
}

export default function EventList({
    selectedDate,
    events,
    error,
    onEditEvent,
    onDeleteEvent,
    onClearError,
}: EventListProps) {
    const { t } = useTranslation();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<UICalendarEvent | null>(null);
    const [deleteChoice, setDeleteChoice] = useState<'this' | 'series'>('this');

    const handleDeleteClick = (event: UICalendarEvent) => {
        // If it's a recurring event instance, show the choice dialog
        if (event.isRecurringEventInstance && event.recurrenceRule && event.recurrenceId) {
            setEventToDelete(event);
            setDeleteChoice('this');
            setDeleteDialogOpen(true);
        } else {
            // Non-recurring event, delete directly
            onDeleteEvent(event.id);
        }
    };

    const handleConfirmDelete = () => {
        if (!eventToDelete) return;
        
        const baseEventId = eventToDelete.id.split('#')[0];
        
        if (deleteChoice === 'this') {
            // Delete only this occurrence
            onDeleteEvent(baseEventId, eventToDelete.recurrenceId!);
        } else {
            // Delete entire series
            onDeleteEvent(baseEventId);
        }
        
        setDeleteDialogOpen(false);
        setEventToDelete(null);
    };

    const getEventsForDate = (date: Date) => {
        return events.filter((event) => {
            const eventDate = new Date(event.start);
            return (
                eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear()
            );
        });
    };

    const selectedDateEvents = getEventsForDate(selectedDate);

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
                {t('calendar.eventsOn', { date: selectedDate.toLocaleDateString() })}
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
                    {error}
                </Alert>
            )}
            {selectedDateEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {t('calendar.noEventsScheduled')}
                </Typography>
            ) : (
                <Stack spacing={2}>
                    {selectedDateEvents.map((event) => (
                        <Paper key={event.id} variant="outlined" sx={{ p: 2 }}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                            >
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {event.title}
                                    </Typography>
                                    {event.showWithoutTime ? (
                                        <Typography variant="body2" color="text.secondary">
                                            {t('calendar.allDayEvent')}
                                        </Typography>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            {event.start.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                            {' - '}
                                            {event.end.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                            {event.timeZone &&
                                                event.timeZone !== getLocalTimezone() && (
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        sx={{ ml: 1, opacity: 0.7 }}
                                                    >
                                                        ({event.timeZone})
                                                    </Typography>
                                                )}
                                        </Typography>
                                    )}
                                    {event.description && (
                                        <Typography variant="body2" mt={1}>
                                            {event.description}
                                        </Typography>
                                    )}
                                    {event.location && (
                                        <Typography variant="body2" color="text.secondary" mt={1}>
                                            📍 {event.location}
                                        </Typography>
                                    )}
                                    {event.virtualLocations &&
                                        Object.keys(event.virtualLocations).length > 0 && (
                                            <Box
                                                sx={{
                                                    mt: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                <VideocamIcon fontSize="small" color="primary" />
                                                <Link
                                                    href={
                                                        (
                                                            Object.values(
                                                                event.virtualLocations
                                                            )[0] as { uri: string }
                                                        )?.uri
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    variant="body2"
                                                >
                                                    {t('calendar.joinVirtualMeeting')}
                                                </Link>
                                            </Box>
                                        )}
                                    {event.participants &&
                                        Object.keys(event.participants).length > 0 && (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    mt: 1,
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <PersonIcon fontSize="small" color="action" />
                                                {Object.values(event.participants).map(
                                                    (participant, idx) => (
                                                        <Chip
                                                            key={idx}
                                                            label={
                                                                (participant as any).name ||
                                                                (participant as any).email
                                                            }
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    )
                                                )}
                                            </Box>
                                        )}
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    <IconButton size="small" onClick={() => onEditEvent(event)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDeleteClick(event)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            )}

            {/* Delete confirmation dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('calendar.recurrence.deleteChoice')}</DialogTitle>
                <DialogContent>
                    <FormControl component="fieldset" sx={{ mt: 2 }}>
                        <RadioGroup
                            value={deleteChoice}
                            onChange={(e) => setDeleteChoice((e.target as HTMLInputElement).value as 'this' | 'series')}
                        >
                            <FormControlLabel
                                value="this"
                                control={<Radio />}
                                label={
                                    <Box>
                                        <Typography variant="body2">
                                            {t('calendar.recurrence.deleteThisEvent')}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {t('calendar.recurrence.deleteThisEventDesc')}
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
                                            {t('calendar.recurrence.deleteAllEvents')}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {t('calendar.recurrence.deleteAllEventsDesc')}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </RadioGroup>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handleConfirmDelete} variant="contained" color="error">
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
