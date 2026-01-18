import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { CalendarEvent } from '../../../../data/calendarEvents';

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
                                    </Typography>
                                    {event.description && (
                                        <Typography variant="body2" mt={1}>
                                            {event.description}
                                        </Typography>
                                    )}
                                    {event.participants && event.participants.length > 0 && (
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
                                            {event.participants.map((participant, idx) => (
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
