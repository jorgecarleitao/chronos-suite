import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CalendarEvent } from '../../data/calendarEvents';

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
                    onClick={() => onDateSelect(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
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
    );
}
