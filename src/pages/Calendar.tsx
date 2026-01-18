import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { getPrimaryAccountId } from '../data/accounts';
import {
    fetchCalendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    fetchCalendars,
    CalendarEvent,
} from '../data/calendarEvents';
import CalendarHeader from '../components/calendar/CalendarHeader';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import EventList from '../components/calendar/EventList';
import EventDialog from '../components/calendar/EventDialog';
import CalendarSidebar from '../components/calendar/CalendarSidebar';
import { getWeekStart } from '../utils/dateHelpers';

interface CalendarProps {
    path: string;
}

export default function Calendar({ path }: CalendarProps) {
    const [loading, setLoading] = useState(true);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week'>('month');
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [calendars, setCalendars] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        description: '',
    });

    useEffect(() => {
        loadAccount();
    }, []);

    const loadAccount = async () => {
        try {
            const id = await getPrimaryAccountId();
            setAccountId(id);
            await loadCalendars(id);
        } catch (error) {
            console.error('Failed to load account:', error);
            if (error instanceof Error && error.message.includes('not initialized')) {
                route('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadCalendars = async (accId: string) => {
        try {
            const cals = await fetchCalendars(accId);
            setCalendars(cals);
            if (cals.length > 0) {
                setSelectedCalendar(cals[0].id);
                await loadEvents(accId, cals[0].id);
            }
        } catch (error) {
            console.error('Failed to load calendars:', error);
            setError('Failed to load calendars');
        }
    };

    const loadEvents = async (accId: string, calId: string) => {
        try {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            const evts = await fetchCalendarEvents(accId, calId, startOfMonth, endOfMonth);
            setEvents(evts);
        } catch (error) {
            console.error('Failed to load events:', error);
            setError('Failed to load events');
        }
    };

    useEffect(() => {
        if (accountId && selectedCalendar) {
            loadEvents(accountId, selectedCalendar);
        }
    }, [currentDate, selectedCalendar]);

    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const previousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const nextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const handlePrevious = () => {
        view === 'month' ? previousMonth() : previousWeek();
    };

    const handleNext = () => {
        view === 'month' ? nextMonth() : nextWeek();
    };

    const openCreateDialog = () => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const startHour = selectedDate.getHours();
        const startTime = `${String(startHour).padStart(2, '0')}:00`;
        const endTime = `${String(startHour + 1).padStart(2, '0')}:00`;
        setFormData({
            title: '',
            startDate: dateStr,
            startTime: startTime,
            endDate: dateStr,
            endTime: endTime,
            description: '',
        });
        setDialogMode('create');
        setIsDialogOpen(true);
    };

    const openEditDialog = (event: CalendarEvent) => {
        setEditingEvent(event);
        setFormData({
            title: event.title,
            startDate: event.start.toISOString().split('T')[0],
            startTime: event.start.toTimeString().slice(0, 5),
            endDate: event.end.toISOString().split('T')[0],
            endTime: event.end.toTimeString().slice(0, 5),
            description: event.description || '',
        });
        setDialogMode('edit');
        setIsDialogOpen(true);
    };

    const handleDialogSubmit = async () => {
        if (dialogMode === 'create') {
            await handleCreateEvent();
        } else {
            await handleUpdateEvent();
        }
    };

    const handleCreateEvent = async () => {
        if (!accountId || !selectedCalendar) return;

        try {
            const start = new Date(`${formData.startDate}T${formData.startTime}`);
            const end = new Date(`${formData.endDate}T${formData.endTime}`);

            await createCalendarEvent(accountId, selectedCalendar, {
                title: formData.title,
                start,
                end,
                description: formData.description,
            });

            setIsDialogOpen(false);
            await loadEvents(accountId, selectedCalendar);
        } catch (error) {
            console.error('Failed to create event:', error);
            setError('Failed to create event');
        }
    };

    const handleUpdateEvent = async () => {
        if (!accountId || !editingEvent) return;

        try {
            const start = new Date(`${formData.startDate}T${formData.startTime}`);
            const end = new Date(`${formData.endDate}T${formData.endTime}`);

            await updateCalendarEvent(accountId, editingEvent.id, {
                title: formData.title,
                start,
                end,
                description: formData.description,
            });

            setIsDialogOpen(false);
            setEditingEvent(null);
            if (selectedCalendar) {
                await loadEvents(accountId, selectedCalendar);
            }
        } catch (error) {
            console.error('Failed to update event:', error);
            setError('Failed to update event');
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!accountId || !selectedCalendar) return;

        try {
            await deleteCalendarEvent(accountId, eventId);
            await loadEvents(accountId, selectedCalendar);
        } catch (error) {
            console.error('Failed to delete event:', error);
            setError('Failed to delete event');
        }
    };

    const handleTimeSlotClick = (date: Date) => {
        setSelectedDate(date);
        openCreateDialog();
    };

    return (
        <Box display="flex">
            <CalendarSidebar
                loading={!accountId}
                calendars={calendars}
                selectedCalendar={selectedCalendar}
                onCalendarSelect={setSelectedCalendar}
                onCreateEvent={openCreateDialog}
            />

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
                                <CalendarHeader
                                    view={view}
                                    currentDate={currentDate}
                                    onViewChange={setView}
                                    onPrevious={handlePrevious}
                                    onNext={handleNext}
                                    onToday={goToToday}
                                />

                                {view === 'month' ? (
                                    <MonthView
                                        currentDate={currentDate}
                                        selectedDate={selectedDate}
                                        events={events}
                                        onDateSelect={setSelectedDate}
                                    />
                                ) : (
                                    <WeekView
                                        currentDate={currentDate}
                                        events={events}
                                        onTimeSlotClick={handleTimeSlotClick}
                                        onEventClick={openEditDialog}
                                    />
                                )}
                            </Paper>

                            <EventList
                                selectedDate={selectedDate}
                                events={events}
                                error={error}
                                onEditEvent={openEditDialog}
                                onDeleteEvent={handleDeleteEvent}
                                onClearError={() => setError(null)}
                            />
                        </>
                    )}
                </Box>
            </Box>

            <EventDialog
                open={isDialogOpen}
                mode={dialogMode}
                event={editingEvent}
                formData={formData}
                onClose={() => setIsDialogOpen(false)}
                onSubmit={handleDialogSubmit}
                onFormChange={setFormData}
            />
        </Box>
    );
}
