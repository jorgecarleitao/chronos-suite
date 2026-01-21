import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import PersonIcon from '@mui/icons-material/Person';
import { CalendarEvent } from '../../data/calendarEvents';
import { isSameDay } from '../../../../utils/dateHelpers';
import { getLocalTimezone } from '../../../../utils/timezoneHelpers';

interface WeekViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onTimeSlotClick: (date: Date) => void;
    onEventClick: (event: CalendarEvent) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

const getWeekDays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        days.push(date);
    }
    return days;
};

// Get events that should be rendered starting in this time slot for this day
const getEventsForTimeSlot = (date: Date, timeSlot: number, events: CalendarEvent[]) => {
    return events.filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        // Calculate the time slot's date-time boundaries (timeSlot is now the hour 0-23)
        const slotStartTime = new Date(date);
        slotStartTime.setHours(timeSlot, 0, 0, 0);

        const slotEndTime = new Date(date);
        slotEndTime.setHours(timeSlot + 1, 0, 0, 0);

        // Only render the event in the first slot where it appears for this day
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Event must overlap with this time slot
        if (!(eventStart < slotEndTime && eventEnd > slotStartTime)) {
            return false;
        }

        // Find the effective start time for this day (either event start or day start)
        const effectiveStart = eventStart > dayStart ? eventStart : dayStart;

        // Calculate which time slot the effective start falls into (now just the hour)
        const startHour = effectiveStart.getHours();
        const firstSlotForDay = startHour;

        // Only render in the first slot
        return timeSlot === firstSlotForDay;
    });
};

const getEventStyle = (event: CalendarEvent, date: Date, timeSlot: number) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Calculate day boundaries
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setHours(0, 0, 0, 0);

    // Calculate slot boundaries (timeSlot is now the hour 0-23)
    const slotStartTime = new Date(date);
    slotStartTime.setHours(timeSlot, 0, 0, 0);

    // Determine the visible portion of the event for this day
    const displayStart = eventStart > dayStart ? eventStart : dayStart;
    const displayEnd = eventEnd < dayEnd ? eventEnd : dayEnd;

    // Calculate position from the start of the current time slot
    const displayStartOffset = displayStart.getTime() - slotStartTime.getTime();
    const displayDuration = displayEnd.getTime() - displayStart.getTime();

    const slotDurationMs = 60 * 60 * 1000; // 60 minutes in milliseconds

    // Top position as percentage within the current slot
    const topPercent = (displayStartOffset / slotDurationMs) * 100;

    // Height as percentage - if event spans multiple slots, this will be > 100%
    const heightPercent = (displayDuration / slotDurationMs) * 100;

    return {
        position: 'absolute' as const,
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
        left: 0,
        right: 0,
        zIndex: 10,
    };
};

const formatTimeSlot = (timeSlot: number) => {
    // timeSlot is now just the hour (0-23)
    if (timeSlot === 0) return `12:00 AM`;
    if (timeSlot < 12) return `${timeSlot}:00 AM`;
    if (timeSlot === 12) return `12:00 PM`;
    return `${timeSlot - 12}:00 PM`;
};

const getEventColor = (status: string | undefined) => {
    if (!status || status === 'accepted') {
        return 'primary.main'; // Filled for accepted or no status
    }
    if (status === 'tentative') {
        return 'warning.light'; // Light for tentative
    }
    if (status === 'declined') {
        return 'grey.400'; // Grey for declined
    }
    return 'info.light'; // Light blue for needs-action
};

const getEventBorder = (status: string | undefined) => {
    if (status === 'tentative') {
        return '2px dashed';
    }
    return 'none';
};

const getEventOpacity = (status: string | undefined) => {
    if (status === 'declined') {
        return 0.5;
    }
    if (status === 'tentative') {
        return 0.8;
    }
    return 1;
};

interface EventTooltipContentProps {
    event: CalendarEvent;
}

function EventTooltipContent({ event }: EventTooltipContentProps) {
    const participants = event.participants ? Object.values(event.participants) : [];
    const participantCount = participants.length;
    const participantNames = participants.map((p) => p.name || p.email).join(', ') || '';

    return (
        <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {event.title}
            </Typography>
            {event.showWithoutTime ? (
                <Typography variant="caption" display="block">
                    All-day event
                </Typography>
            ) : (
                <Typography variant="caption" display="block">
                    {event.start.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {event.end.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                    {event.timeZone && event.timeZone !== getLocalTimezone() && (
                        <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.7 }}>
                            ({event.timeZone})
                        </Typography>
                    )}
                </Typography>
            )}
            {event.description && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    {event.description}
                </Typography>
            )}
            {event.location && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    📍 {event.location}
                </Typography>
            )}
            {participantCount > 0 && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    👥 {participantNames}
                </Typography>
            )}
        </Box>
    );
}

export default function WeekView({
    currentDate,
    events,
    onTimeSlotClick,
    onEventClick,
}: WeekViewProps) {
    const weekDays = getWeekDays(getWeekStart(currentDate));

    return (
        <Box sx={{ overflowX: 'auto' }}>
            <Box
                sx={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: 800 }}
            >
                {/* Header row with weekdays */}
                <Box sx={{ borderRight: 1, borderColor: 'divider' }} />
                {weekDays.map((day, idx) => {
                    const todayCheck = isSameDay(day, new Date());
                    return (
                        <Box
                            key={idx}
                            sx={{
                                p: 1,
                                textAlign: 'center',
                                fontWeight: 'bold',
                                borderBottom: 1,
                                borderRight: idx < 6 ? 1 : 0,
                                borderColor: 'divider',
                                bgcolor: todayCheck ? 'action.selected' : 'transparent',
                            }}
                        >
                            <Typography variant="caption" display="block">
                                {DAYS[idx]}
                            </Typography>
                            <Typography variant="h6">{day.getDate()}</Typography>
                        </Box>
                    );
                })}

                {/* Time slots - 24 hour slots */}
                {Array.from({ length: 24 }, (_, timeSlot) => {
                    const hour = timeSlot;
                    const minutes = 0;
                    return (
                        <Box key={`row-${timeSlot}`} sx={{ display: 'contents' }}>
                            {/* Time label */}
                            <Box
                                sx={{
                                    p: 1,
                                    textAlign: 'right',
                                    fontSize: '0.75rem',
                                    color: 'text.secondary',
                                    borderRight: 1,
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    bgcolor: 'background.default',
                                }}
                            >
                                {formatTimeSlot(timeSlot)}
                            </Box>
                            {/* Day columns */}
                            {weekDays.map((day, dayIdx) => {
                                const slotEvents = getEventsForTimeSlot(day, timeSlot, events);
                                return (
                                    <Box
                                        key={`${timeSlot}-${dayIdx}`}
                                        sx={{
                                            position: 'relative',
                                            minHeight: 30,
                                            borderBottom: 1,
                                            borderRight: dayIdx < 6 ? 1 : 0,
                                            borderColor: 'divider',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                        }}
                                        onClick={() => {
                                            const newDate = new Date(day);
                                            newDate.setHours(hour, minutes, 0, 0);
                                            onTimeSlotClick(newDate);
                                        }}
                                    >
                                        {slotEvents.map((event) => {
                                            const eventStart = new Date(event.start);
                                            const eventEnd = new Date(event.end);

                                            // Calculate day boundaries for visual indicators
                                            const dayStart = new Date(day);
                                            dayStart.setHours(0, 0, 0, 0);

                                            const dayEnd = new Date(day);
                                            dayEnd.setDate(dayEnd.getDate() + 1);
                                            dayEnd.setHours(0, 0, 0, 0);

                                            const continuesFromBefore = eventStart < dayStart;
                                            const continuesAfter = eventEnd >= dayEnd;

                                            // Determine visual style based on participation status
                                            const status = event.userParticipationStatus;
                                            const participantCount = event.participants
                                                ? Object.keys(event.participants).length
                                                : 0;

                                            return (
                                                <Tooltip
                                                    key={event.id}
                                                    title={<EventTooltipContent event={event} />}
                                                    arrow
                                                    placement="top"
                                                >
                                                    <Box
                                                        sx={{
                                                            ...getEventStyle(event, day, timeSlot),
                                                            px: 0.5,
                                                            bgcolor: getEventColor(status),
                                                            color: 'primary.contrastText',
                                                            opacity: getEventOpacity(status),
                                                            border: getEventBorder(status),
                                                            borderColor:
                                                                status === 'tentative'
                                                                    ? 'warning.main'
                                                                    : undefined,
                                                            borderTopLeftRadius: continuesFromBefore
                                                                ? 0
                                                                : 1,
                                                            borderTopRightRadius:
                                                                continuesFromBefore ? 0 : 1,
                                                            borderBottomLeftRadius: continuesAfter
                                                                ? 0
                                                                : 1,
                                                            borderBottomRightRadius: continuesAfter
                                                                ? 0
                                                                : 1,
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            overflow: 'hidden',
                                                            '&:hover': {
                                                                bgcolor: 'primary.dark',
                                                            },
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEventClick(event);
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            display="block"
                                                            noWrap
                                                            sx={{ fontWeight: 'bold' }}
                                                        >
                                                            {event.title}
                                                        </Typography>
                                                        {participantCount > 0 && (
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.25,
                                                                    mt: 0.25,
                                                                }}
                                                            >
                                                                <PersonIcon
                                                                    sx={{ fontSize: '0.7rem' }}
                                                                />
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{ fontSize: '0.6rem' }}
                                                                >
                                                                    {participantCount}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </Tooltip>
                                            );
                                        })}
                                    </Box>
                                );
                            })}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
