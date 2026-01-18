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
