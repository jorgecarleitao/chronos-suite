import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import Sidebar from '../components/Sidebar';
import { getPrimaryAccountId } from '../data/accounts';

interface CalendarProps {
    path: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Calendar({ path }: CalendarProps) {
    const [loading, setLoading] = useState(true);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        loadAccount();
    }, []);

    const loadAccount = async () => {
        try {
            const id = await getPrimaryAccountId();
            setAccountId(id);
        } catch (error) {
            console.error('Failed to load account:', error);
            if (error instanceof Error && error.message.includes('not initialized')) {
                route('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear();
    };

    const isSelected = (day: number) => {
        return day === selectedDate.getDate() &&
            currentDate.getMonth() === selectedDate.getMonth() &&
            currentDate.getFullYear() === selectedDate.getFullYear();
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <Box
                    key={`empty-${i}`}
                    sx={{
                        aspectRatio: '1',
                        p: 1,
                    }}
                />
            );
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const today = isToday(day);
            const selected = isSelected(day);

            days.push(
                <Box
                    key={day}
                    onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                    sx={{
                        aspectRatio: '1',
                        p: 1,
                        cursor: 'pointer',
                        borderRadius: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        bgcolor: selected ? 'primary.main' : today ? 'action.hover' : 'transparent',
                        color: selected ? 'primary.contrastText' : 'inherit',
                        '&:hover': {
                            bgcolor: selected ? 'primary.dark' : 'action.hover',
                        },
                    }}
                >
                    <Typography
                        variant="body2"
                        fontWeight={today ? 'bold' : 'normal'}
                    >
                        {day}
                    </Typography>
                </Box>
            );
        }

        return days;
    };

    return (
        <Box display="flex">
            {/* Calendar sidebar */}
            <Sidebar>
                {!accountId ? (
                    <Stack justifyContent="center" padding={3}>
                        <CircularProgress />
                    </Stack>
                ) : (
                    <>
                        <Button
                            variant="contained"
                            fullWidth
                            sx={{ mb: 2 }}
                            onClick={() => alert('Create event - coming soon!')}
                        >
                            Create Event
                        </Button>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            My Calendars
                        </Typography>
                        <List>
                            <ListItem disablePadding>
                                <ListItemButton selected>
                                    <ListItemText primary="Personal" />
                                </ListItemButton>
                            </ListItem>
                        </List>
                    </>
                )}
            </Sidebar>

            {/* Main calendar view */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    height: '100vh',
                    overflow: 'auto',
                }}
            >
                <Toolbar />
                <Box p={3}>
                    {loading ? (
                        <Stack justifyContent="center" alignItems="center" minHeight="50vh">
                            <CircularProgress />
                        </Stack>
                    ) : (
                        <>
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <IconButton onClick={previousMonth}>
                                            <ChevronLeftIcon />
                                        </IconButton>
                                        <Typography variant="h5">
                                            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                        </Typography>
                                        <IconButton onClick={nextMonth}>
                                            <ChevronRightIcon />
                                        </IconButton>
                                    </Stack>
                                    <Button
                                        variant="outlined"
                                        startIcon={<TodayIcon />}
                                        onClick={goToToday}
                                    >
                                        Today
                                    </Button>
                                </Stack>

                                <Box
                                    display="grid"
                                    gridTemplateColumns="repeat(7, 1fr)"
                                    gap={1}
                                >
                                    {DAYS.map(day => (
                                        <Box
                                            key={day}
                                            sx={{
                                                p: 1,
                                                textAlign: 'center',
                                                fontWeight: 'bold',
                                                borderBottom: 1,
                                                borderColor: 'divider',
                                            }}
                                        >
                                            {day}
                                        </Box>
                                    ))}
                                    {renderCalendar()}
                                </Box>
                            </Paper>

                            <Paper sx={{ p: 3 }}>
                                <Typography variant="h6" mb={2}>
                                    Events on {selectedDate.toLocaleDateString()}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    No events scheduled
                                </Typography>
                            </Paper>
                        </>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
