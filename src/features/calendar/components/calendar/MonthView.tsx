import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { CalendarEvent } from '../../data/calendarEvents';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay } from '../../../../utils/dateHelpers';
import { useTranslation } from 'react-i18next';
import RepeatIcon from '@mui/icons-material/Repeat';

interface MonthViewProps {
    currentDate: Date;
    selectedDate: Date;
    events: CalendarEvent[];
    onDateSelect: (date: Date) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthView({
    currentDate,
    selectedDate,
    events,
    onDateSelect,
}: MonthViewProps) {
    const { t } = useTranslation();
    
    const getDayName = (day: string) => {
        switch (day) {
            case 'Sun': return t('calendar.sunday');
            case 'Mon': return t('calendar.monday');
            case 'Tue': return t('calendar.tuesday');
            case 'Wed': return t('calendar.wednesday');
            case 'Thu': return t('calendar.thursday');
            case 'Fri': return t('calendar.friday');
            case 'Sat': return t('calendar.saturday');
            default: return day;
        }
    };
    
    const isSelected = (day: number) => {
        return (
            day === selectedDate.getDate() &&
            currentDate.getMonth() === selectedDate.getMonth() &&
            currentDate.getFullYear() === selectedDate.getFullYear()
        );
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
            const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const today = isSameDay(dayDate, new Date());
            const selected = isSelected(day);

            // Get events for this day
            const dayEvents = events.filter(event => isSameDay(event.start, dayDate));
            const hasRecurringEvents = dayEvents.some(e => e.recurrenceRule);

            days.push(
                <Box
                    key={day}
                    onClick={() =>
                        onDateSelect(
                            new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                        )
                    }
                    sx={{
                        aspectRatio: '1',
                        p: 1,
                        cursor: 'pointer',
                        borderRadius: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        bgcolor: selected ? 'primary.main' : today ? 'action.hover' : 'transparent',
                        color: selected ? 'primary.contrastText' : 'inherit',
                        '&:hover': {
                            bgcolor: selected ? 'primary.dark' : 'action.hover',
                        },
                    }}
                >
                    <Typography variant="body2" fontWeight={today ? 'bold' : 'normal'}>
                        {day}
                    </Typography>
                    {dayEvents.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, alignItems: 'center', fontSize: '0.7rem' }}>
                            <Chip
                                size="small"
                                label={`${dayEvents.length}`}
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.7rem' }}
                            />
                            {hasRecurringEvents && (
                                <RepeatIcon sx={{ fontSize: '0.9rem' }} />
                            )}
                        </Box>
                    )}
                </Box>
            );
        }

        return days;
    };

    return (
        <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={1}>
            {DAYS.map((day) => (
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
                    {getDayName(day)}
                </Box>
            ))}
            {renderCalendar()}
        </Box>
    );
}
