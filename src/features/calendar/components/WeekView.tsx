import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Link from '@mui/material/Link';
import PersonIcon from '@mui/icons-material/Person';
import VideocamIcon from '@mui/icons-material/Videocam';
import RepeatIcon from '@mui/icons-material/Repeat';
import type { UICalendarEvent } from '../data/calendarEvent';
import type { UICalendar } from '../data/calendar';
import { isSameDay } from '../../../utils/dateHelpers';
import { getLocalTimezone } from '../../../utils/timezoneHelpers';
import { useTranslation } from 'react-i18next';

interface WeekViewProps {
    currentDate: Date;
    events: UICalendarEvent[];
    calendars: UICalendar[];
    onTimeSlotClick: (date: Date) => void;
    onEventClick: (event: UICalendarEvent) => void;
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
const getEventsForTimeSlot = (date: Date, timeSlot: number, events: UICalendarEvent[]) => {
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

const getEventStyle = (event: UICalendarEvent, date: Date, timeSlot: number) => {
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
    event: UICalendarEvent;
}

function EventTooltipContent({ event }: EventTooltipContentProps) {
    const { t } = useTranslation();
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
                    {t('calendar.allDayEvent')}
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
                        <Typography
                            component="span"
                            variant="caption"
                            sx={{ ml: 0.5, opacity: 0.7 }}
                        >
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
            {event.virtualLocations && Object.keys(event.virtualLocations).length > 0 && (
                <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <VideocamIcon fontSize="small" />
                    <Link
                        href={(Object.values(event.virtualLocations)[0] as { uri: string })?.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                        sx={{ color: 'inherit' }}
                    >
                        {t('calendar.virtualMeeting')}
                    </Link>
                </Box>
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
    calendars,
    onTimeSlotClick,
    onEventClick,
}: WeekViewProps) {
    const { t } = useTranslation();

    const getCalendarColor = (calendarId?: string) => {
        if (!calendarId) return '#1976d2';
        const calendar = calendars.find((c) => c.id === calendarId);
        return calendar?.color || '#1976d2';
    };
    const weekDays = getWeekDays(getWeekStart(currentDate));

    const getDayName = (day: string) => {
        switch (day) {
            case 'Mon':
                return t('calendar.monday');
            case 'Tue':
                return t('calendar.tuesday');
            case 'Wed':
                return t('calendar.wednesday');
            case 'Thu':
                return t('calendar.thursday');
            case 'Fri':
                return t('calendar.friday');
            case 'Sat':
                return t('calendar.saturday');
            case 'Sun':
                return t('calendar.sunday');
            default:
                return day;
        }
    };

    return (
        <Box sx={{ overflowX: 'auto' }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '40px repeat(7, minmax(80px, 1fr))',
                        sm: '60px repeat(7, 1fr)'
                    },
                    minWidth: { xs: 600, sm: 800 }
                }}
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
                                {getDayName(DAYS[idx])}
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
                                                            bgcolor: getCalendarColor(
                                                                event.calendarId
                                                            ),
                                                            color: 'white',
                                                            opacity:
                                                                status === 'declined' ? 0.5 : 1,
                                                            border: status === 'tentative' ? 2 : 0,
                                                            borderColor: 'warning.main',
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
                                                                opacity: 0.9,
                                                                filter: 'brightness(0.9)',
                                                            },
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEventClick(event);
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.25,
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="caption"
                                                                display="block"
                                                                noWrap
                                                                sx={{ fontWeight: 'bold', flex: 1 }}
                                                            >
                                                                {event.title}
                                                            </Typography>
                                                            {event.recurrenceRule && (
                                                                <RepeatIcon
                                                                    sx={{
                                                                        fontSize: '0.75rem',
                                                                        flexShrink: 0,
                                                                    }}
                                                                />
                                                            )}
                                                        </Box>
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
