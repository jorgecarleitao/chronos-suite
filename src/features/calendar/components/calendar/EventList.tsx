import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import VideocamIcon from '@mui/icons-material/Videocam';
import { CalendarEvent } from '../../data/calendarEvents';
import { formatDateWithTimezone, getLocalTimezone } from '../../../../utils/timezoneHelpers';

interface EventListProps {
    selectedDate: Date;
    events: CalendarEvent[];
    error: string | null;
    onEditEvent: (event: CalendarEvent) => void;
    onDeleteEvent: (eventId: string) => void;
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
                Events on {selectedDate.toLocaleDateString()}
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
                    {error}
                </Alert>
            )}
            {selectedDateEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No events scheduled
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
                                            All-day event
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
                                    {event.virtualLocations && Object.keys(event.virtualLocations).length > 0 && (
                                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <VideocamIcon fontSize="small" color="primary" />
                                            <Link
                                                href={Object.values(event.virtualLocations)[0]?.uri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                variant="body2"
                                            >
                                                Join Virtual Meeting
                                            </Link>
                                        </Box>
                                    )}
                                    {event.participants && Object.keys(event.participants).length > 0 && (
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
                                            {Object.values(event.participants).map((participant, idx) => (
                                                <Chip
                                                    key={idx}
                                                    label={participant.name || participant.email}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    <IconButton size="small" onClick={() => onEditEvent(event)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => onDeleteEvent(event.id)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            )}
        </Paper>
    );
}
