import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { getPrimaryAccountId } from '../../data/accounts';
import { actions as calendarEventActions, type UICalendarEvent } from './data/calendarEvent';
import {
    actions as calendarActions,
    type UICalendar,
    type UICalendarFormData,
} from './data/calendar';

const {
    fetchCalendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    deleteSingleOccurrence,
    updateSingleOccurrence,
    expandRecurringEvents,
} = calendarEventActions;

const { fetchCalendars, createCalendar, updateCalendar, deleteCalendar } = calendarActions;
import type { UICalendarEventFormData } from './data/calendarEvent/ui';
import CalendarHeader from './components/CalendarHeader';
import MonthView from './components/MonthView';
import WeekView from './components/WeekView';
import EventDialog from './components/EventDialog';
import CalendarSidebar from './components/CalendarSidebar';
import CalendarManagementDialog from './components/CalendarManagementDialog';
import { useDocumentTitle } from '../../utils/useDocumentTitle';
import { useTranslation } from 'react-i18next';

export default function Calendar() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week'>('week');
    const [events, setEvents] = useState<UICalendarEvent[]>([]);
    const [calendars, setCalendars] = useState<UICalendar[]>([]);
    const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[]>([]);
    const [dialogEvent, setDialogEvent] = useState<UICalendarEvent | null | undefined>(undefined);
    const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
    const [editingCalendar, setEditingCalendar] = useState<UICalendar | null>(null);
    const [deleteConfirmCalendar, setDeleteConfirmCalendar] = useState<UICalendar | null>(null);
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
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadCalendars = async (accId: string, preserveVisibility = false) => {
        try {
            const cals = await fetchCalendars(accId);
            setCalendars(cals);
            if (cals.length > 0) {
                if (preserveVisibility) {
                    // Keep existing visibility, but ensure deleted calendars are removed
                    const validIds = cals.map((c) => c.id);
                    setVisibleCalendarIds((prev) => prev.filter((id) => validIds.includes(id)));
                    const currentVisible = visibleCalendarIds.filter((id) => validIds.includes(id));
                    if (currentVisible.length > 0) {
                        await loadEvents(accId, currentVisible);
                    }
                } else {
                    // Set all calendars as visible by default
                    const allIds = cals.map((c) => c.id);
                    setVisibleCalendarIds(allIds);
                    await loadEvents(accId, allIds);
                }
            }
        } catch (error) {
            console.error('Failed to load calendars:', error);
            setError(t('calendar.failedToLoadCalendars'));
        }
    };

    const loadEvents = async (accId: string, calendarIds: string[]) => {
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

            // Fetch events from all visible calendars
            const allEvents: UICalendarEvent[] = [];
            for (const calId of calendarIds) {
                const evts = await fetchCalendarEvents(accId, calId, startDate, endDate);
                allEvents.push(...evts);
            }

            // Expand recurring events to individual occurrences
            const expandedEvents = expandRecurringEvents(allEvents, startDate, endDate);
            setEvents(expandedEvents);
        } catch (error) {
            console.error('Failed to load events:', error);
            setError(t('calendar.failedToLoadEvents'));
        }
    };

    useEffect(() => {
        if (accountId && visibleCalendarIds.length > 0) {
            loadEvents(accountId, visibleCalendarIds);
        }
    }, [currentDate, visibleCalendarIds]);

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

    const handleCreateEvent = async (calendarId: string, data: UICalendarEventFormData) => {
        if (!accountId) return;

        try {
            await createCalendarEvent(accountId, calendarId, data);

            setDialogEvent(undefined);
            if (visibleCalendarIds.length > 0) {
                await loadEvents(accountId, visibleCalendarIds);
            }
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
            if (visibleCalendarIds.length > 0) {
                await loadEvents(accountId, visibleCalendarIds);
            }
        } catch (error) {
            console.error('Failed to update event:', error);
            setError(t('calendar.failedToUpdateEvent'));
        }
    };

    const handleDeleteEvent = async (eventId: string, recurrenceId?: string) => {
        if (!accountId) return;

        try {
            if (recurrenceId) {
                // Delete single occurrence
                await deleteSingleOccurrence(accountId, eventId, recurrenceId);
            } else {
                // Delete entire event or series
                await deleteCalendarEvent(accountId, eventId);
            }

            setDialogEvent(undefined);
            if (visibleCalendarIds.length > 0) {
                await loadEvents(accountId, visibleCalendarIds);
            }
        } catch (error) {
            console.error('Failed to delete event:', error);
            setError(t('calendar.failedToDeleteEvent'));
        }
    };

    const handleTimeSlotClick = (date: Date) => {
        setSelectedDate(date);
        openCreateDialog();
    };

    const handleToggleCalendar = (calendarId: string) => {
        setVisibleCalendarIds((prev) => {
            if (prev.includes(calendarId)) {
                // Remove from visible list
                return prev.filter((id) => id !== calendarId);
            } else {
                // Add to visible list
                return [...prev, calendarId];
            }
        });
    };

    const handleCreateCalendar = () => {
        setEditingCalendar(null);
        setCalendarDialogOpen(true);
    };

    const handleEditCalendar = (calendar: UICalendar) => {
        setEditingCalendar(calendar);
        setCalendarDialogOpen(true);
    };

    const handleDeleteCalendar = (calendar: UICalendar) => {
        setDeleteConfirmCalendar(calendar);
    };

    const confirmDeleteCalendar = async () => {
        if (!accountId || !deleteConfirmCalendar) return;

        try {
            await deleteCalendar(accountId, deleteConfirmCalendar.id);

            // Remove from visible calendar IDs before reloading
            const newVisibleIds = visibleCalendarIds.filter(
                (id) => id !== deleteConfirmCalendar.id
            );
            setVisibleCalendarIds(newVisibleIds);
            setDeleteConfirmCalendar(null);

            // Reload calendars (this will update the list)
            const cals = await fetchCalendars(accountId);
            setCalendars(cals);

            // Reload events from remaining visible calendars
            if (newVisibleIds.length > 0) {
                await loadEvents(accountId, newVisibleIds);
            } else {
                setEvents([]);
            }
        } catch (error) {
            console.error('Failed to delete calendar:', error);
            setError(t('calendar.failedToDeleteCalendar'));
        }
    };

    const handleSaveCalendar = async (calendarData: UICalendarFormData) => {
        if (!accountId) return;

        try {
            if (editingCalendar) {
                // Update existing calendar
                await updateCalendar(accountId, editingCalendar.id, calendarData);
                // Reload calendars and preserve visibility
                await loadCalendars(accountId, true);
            } else {
                // Create new calendar and add it to visible list
                const newCalendar = await createCalendar(accountId, calendarData);
                // Reload calendars first
                const cals = await fetchCalendars(accountId);
                setCalendars(cals);
                // Add new calendar to visible list
                setVisibleCalendarIds((prev) => [...prev, newCalendar.id]);
                // Reload events with new calendar included
                await loadEvents(accountId, [...visibleCalendarIds, newCalendar.id]);
            }

            setCalendarDialogOpen(false);
            setEditingCalendar(null);
        } catch (error) {
            console.error('Failed to save calendar:', error);
            throw error; // Let dialog handle the error
        }
    };

    return (
        <Box display="flex">
            <CalendarSidebar
                loading={!accountId}
                calendars={calendars}
                visibleCalendarIds={visibleCalendarIds}
                onToggleCalendar={handleToggleCalendar}
                onCreateEvent={openCreateDialog}
                onCreateCalendar={handleCreateCalendar}
                onEditCalendar={handleEditCalendar}
                onDeleteCalendar={handleDeleteCalendar}
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
                                        calendars={calendars}
                                        onDateSelect={setSelectedDate}
                                    />
                                ) : (
                                    <WeekView
                                        currentDate={currentDate}
                                        events={events}
                                        calendars={calendars}
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
                    calendars={calendars}
                    selectedCalendarId={visibleCalendarIds[0] || null}
                    onClose={() => setDialogEvent(undefined)}
                    onCreate={handleCreateEvent}
                    onUpdate={handleUpdateEvent}
                    onDelete={handleDeleteEvent}
                />
            )}

            {/* Calendar Management Dialog */}
            <CalendarManagementDialog
                open={calendarDialogOpen}
                calendar={editingCalendar}
                accountId={accountId}
                onClose={() => {
                    setCalendarDialogOpen(false);
                    setEditingCalendar(null);
                }}
                onSave={handleSaveCalendar}
            />

            {/* Delete Calendar Confirmation Dialog */}
            <Dialog
                open={Boolean(deleteConfirmCalendar)}
                onClose={() => setDeleteConfirmCalendar(null)}
            >
                <DialogTitle>{t('calendar.deleteCalendarTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t('calendar.deleteCalendarConfirm', { name: deleteConfirmCalendar?.name })}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmCalendar(null)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={confirmDeleteCalendar} color="error" variant="contained">
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
