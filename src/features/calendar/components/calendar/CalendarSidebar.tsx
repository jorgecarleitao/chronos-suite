import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Sidebar from '../../../../components/Sidebar';

interface CalendarSidebarProps {
    loading: boolean;
    calendars: Array<{ id: string; name: string }>;
    selectedCalendar: string | null;
    onCalendarSelect: (calendarId: string) => void;
    onCreateEvent: () => void;
}

export default function CalendarSidebar({
    loading,
    calendars,
    selectedCalendar,
    onCalendarSelect,
    onCreateEvent,
}: CalendarSidebarProps) {
    return (
        <Sidebar>
            {loading ? (
                <Stack justifyContent="center" padding={3}>
                    <CircularProgress />
                </Stack>
            ) : (
                <>
                    <Button
                        variant="contained"
                        fullWidth
                        sx={{ mb: 2 }}
                        onClick={onCreateEvent}
                    >
                        Create Event
                    </Button>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        My Calendars
                    </Typography>
                    <List>
                        {calendars.map(cal => (
                            <ListItem key={cal.id} disablePadding>
                                <ListItemButton
                                    selected={selectedCalendar === cal.id}
                                    onClick={() => onCalendarSelect(cal.id)}
                                >
                                    <ListItemText primary={cal.name} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </>
            )}
        </Sidebar>
    );
}
