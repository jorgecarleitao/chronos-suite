export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

export function getDaysInMonth(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
}

export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(d.setDate(diff));
}

export function getWeekDays(startDate: Date): Date[] {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        days.push(date);
    }
    return days;
}

export function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
}

export function formatTimeSlot(timeSlot: number): string {
    const hour = Math.floor(timeSlot / 2);
    const minutes = (timeSlot % 2) * 30;
    const minuteStr = minutes === 0 ? '00' : '30';

    if (hour === 0) return `12:${minuteStr} AM`;
    if (hour < 12) return `${hour}:${minuteStr} AM`;
    if (hour === 12) return `12:${minuteStr} PM`;
    return `${hour - 12}:${minuteStr} PM`;
}

export function getWeekDisplayText(currentDate: Date, locale: string): string {
    const weekStart = getWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // If week spans two months
    if (weekStart.getMonth() !== weekEnd.getMonth()) {
        const startStr = weekStart.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
        const endStr = weekEnd.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
        return `${startStr} - ${endStr}`;
    }
    
    // Same month
    const monthYear = weekStart.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    return `${monthYear} ${weekStart.getDate()} - ${weekEnd.getDate()}`;
}
