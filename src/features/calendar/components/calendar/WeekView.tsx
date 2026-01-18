import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import PersonIcon from '@mui/icons-material/Person';
import { CalendarEvent } from '../../../../data/calendarEvents';
import { isSameDay } from '../../../../utils/dateHelpers';

interface WeekViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onTimeSlotClick: (date: Date) => void;
    onEventClick: (event: CalendarEvent) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekView({
    currentDate,
    events,
    onTimeSlotClick,
    onEventClick,
}: WeekViewProps) {
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

    const getEventsForTimeSlot = (date: Date, timeSlot: number) => {
        return events.filter((event) => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);

            if (
                eventStart.getDate() !== date.getDate() ||
                eventStart.getMonth() !== date.getMonth() ||
                eventStart.getFullYear() !== date.getFullYear()
            ) {
                return false;
            }

            const slotStart = timeSlot * 0.5;
            const slotEnd = (timeSlot + 1) * 0.5;
            const eventStartHour = eventStart.getHours() + eventStart.getMinutes() / 60;
            const eventEndHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;

            return eventStartHour < slotEnd && eventEndHour > slotStart;
        });
    };

    const getEventStyle = (event: CalendarEvent, timeSlot: number) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
        const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
        const slotStartMinutes = timeSlot * 30;
        const slotEndMinutes = (timeSlot + 1) * 30;

        const displayStartMinutes = Math.max(startMinutes, slotStartMinutes);
        const displayEndMinutes = Math.min(endMinutes, slotEndMinutes);

        const topPercent = ((displayStartMinutes - slotStartMinutes) / 30) * 100;
        const heightPercent = ((displayEndMinutes - displayStartMinutes) / 30) * 100;

        return {
            position: 'absolute' as const,
            top: `${topPercent}%`,
            height: `${heightPercent}%`,
            left: 0,
            right: 0,
        };
    };

    const formatTimeSlot = (timeSlot: number) => {
        const hour = Math.floor(timeSlot / 2);
        const minutes = (timeSlot % 2) * 30;
        const minuteStr = minutes === 0 ? '00' : '30';

        if (hour === 0) return `12:${minuteStr} AM`;
        if (hour < 12) return `${hour}:${minuteStr} AM`;
        if (hour === 12) return `12:${minuteStr} PM`;
        return `${hour - 12}:${minuteStr} PM`;
    };

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

                {/* Time slots - 48 half-hour slots */}
                {Array.from({ length: 48 }, (_, timeSlot) => {
                    const hour = Math.floor(timeSlot / 2);
                    const minutes = (timeSlot % 2) * 30;
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
                                const slotEvents = getEventsForTimeSlot(day, timeSlot);
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
                                            const participantCount =
                                                event.participants?.length || 0;
                                            const participantNames =
                                                event.participants
                                                    ?.map((p) => p.name || p.email)
                                                    .join(', ') || '';
                                            const tooltipTitle = (
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 'bold' }}
                                                    >
                                                        {event.title}
                                                    </Typography>
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
                                                    </Typography>
                                                    {event.description && (
                                                        <Typography
                                                            variant="caption"
                                                            display="block"
                                                            sx={{ mt: 0.5 }}
                                                        >
                                                            {event.description}
                                                        </Typography>
                                                    )}
                                                    {participantCount > 0 && (
                                                        <Typography
                                                            variant="caption"
                                                            display="block"
                                                            sx={{ mt: 0.5 }}
                                                        >
                                                            👥 {participantNames}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            );

                                            return (
                                                <Tooltip
                                                    key={event.id}
                                                    title={tooltipTitle}
                                                    arrow
                                                    placement="top"
                                                >
                                                    <Box
                                                        sx={{
                                                            ...getEventStyle(event, timeSlot),
                                                            px: 0.5,
                                                            bgcolor: 'primary.main',
                                                            color: 'primary.contrastText',
                                                            borderRadius: 1,
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
                                                            sx={{ fontWeight: 'bold' }}
                                                        >
                                                            {event.start.toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            display="block"
                                                            noWrap
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
