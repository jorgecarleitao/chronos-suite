import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { getPrimaryAccountId } from '../../data/accounts';
import { actions, type UICalendarEvent } from './data/calendarEvent';

const {
    fetchCalendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    deleteSingleOccurrence,
    updateSingleOccurrence,
    fetchCalendars,
    expandRecurringEvents,
} = actions;
import type { UICalendarEventFormData } from './data/calendarEvent/ui';
import CalendarHeader from './components/CalendarHeader';
import MonthView from './components/MonthView';
import WeekView from './components/WeekView';
import EventDialog from './components/EventDialog';
import CalendarSidebar from './components/CalendarSidebar';
import { useDocumentTitle } from '../../utils/useDocumentTitle';
import { useTranslation } from 'react-i18next';

interface CalendarProps {
    path: string;
}

export default function Calendar({ path }: CalendarProps) {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week'>('week');
    const [events, setEvents] = useState<UICalendarEvent[]>([]);
    const [calendars, setCalendars] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
    const [dialogEvent, setDialogEvent] = useState<UICalendarEvent | null | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    // Update document title with next event time/date
    const now = new Date();
    const upcomingEvents = events
        .filter((e) => new Date(e.start) > now)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const nextEvent = upcomingEvents[0];
    let title = t('calendar.title');

    if (nextEvent) {
        const eventDate = new Date(nextEvent.start);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = eventDate.toDateString() === today.toDateString();
        const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();

        if (isToday) {
            const timeStr = eventDate.toLocaleTimeString(i18n.language, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
            title = t('calendar.nextEventToday', { time: timeStr });
        } else if (isTomorrow) {
            const timeStr = eventDate.toLocaleTimeString(i18n.language, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
            title = t('calendar.nextEventTomorrow', { time: timeStr });
        } else {
            const dateStr = eventDate.toLocaleDateString(i18n.language, {
                month: 'short',
                day: 'numeric',
            });
            title = t('calendar.nextEventDate', { date: dateStr });
        }
    }

    useDocumentTitle(title);

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
            setError(t('calendar.failedToLoadCalendars'));
        }
    };

    const loadEvents = async (accId: string, calId: string) => {
        try {
            let startDate: Date;
            let endDate: Date;

            if (view === 'week') {
                // For week view, fetch only the current week
                const dayOfWeek = currentDate.getDay();
                startDate = new Date(currentDate);
                startDate.setDate(currentDate.getDate() - dayOfWeek); // Start of week (Sunday)
                startDate.setHours(0, 0, 0, 0);

                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 7); // End of week
                endDate.setHours(23, 59, 59, 999);
            } else {
                // For month view, fetch the entire month
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            }

            const evts = await fetchCalendarEvents(accId, calId, startDate, endDate);

            // Expand recurring events to individual occurrences
            const expandedEvents = expandRecurringEvents(evts, startDate, endDate);
            setEvents(expandedEvents);
        } catch (error) {
            console.error('Failed to load events:', error);
            setError(t('calendar.failedToLoadEvents'));
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
        setDialogEvent(null);
    };

    const openEditDialog = (event: UICalendarEvent) => {
        setDialogEvent(event);
    };

    const handleCreateEvent = async (data: UICalendarEventFormData) => {
        if (!accountId || !selectedCalendar) return;

        try {
            await createCalendarEvent(accountId, selectedCalendar, data);

            setDialogEvent(undefined);
            await loadEvents(accountId, selectedCalendar);
        } catch (error) {
            console.error('Failed to create event:', error);
            setError(t('calendar.failedToCreateEvent'));
        }
    };

    const handleUpdateEvent = async (
        eventId: string,
        data: UICalendarEventFormData,
        recurrenceId?: string
    ) => {
        if (!accountId) return;

        try {
            const calendarId = dialogEvent?.calendarId || calendars[0]?.id;

            if (recurrenceId) {
                // Update single occurrence
                await updateSingleOccurrence(accountId, calendarId, eventId, recurrenceId, data);
            } else {
                // Update entire event or series
                await updateCalendarEvent(accountId, calendarId, eventId, data);
            }

            setDialogEvent(undefined);
            if (selectedCalendar) {
                await loadEvents(accountId, selectedCalendar);
            }
        } catch (error) {
            console.error('Failed to update event:', error);
            setError(t('calendar.failedToUpdateEvent'));
        }
    };

    const handleDeleteEvent = async (eventId: string, recurrenceId?: string) => {
        if (!accountId || !selectedCalendar) return;

        try {
            if (recurrenceId) {
                // Delete single occurrence
                await deleteSingleOccurrence(accountId, eventId, recurrenceId);
            } else {
                // Delete entire event or series
                await deleteCalendarEvent(accountId, eventId);
            }

            setDialogEvent(undefined);
            await loadEvents(accountId, selectedCalendar);
        } catch (error) {
            console.error('Failed to delete event:', error);
            setError(t('calendar.failedToDeleteEvent'));
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
                        </>
                    )}
                </Box>
            </Box>

            {dialogEvent !== undefined && (
                <EventDialog
                    event={dialogEvent}
                    initialDate={selectedDate}
                    onClose={() => setDialogEvent(undefined)}
                    onCreate={handleCreateEvent}
                    onUpdate={handleUpdateEvent}
                    onDelete={handleDeleteEvent}
                />
            )}
        </Box>
    );
}
