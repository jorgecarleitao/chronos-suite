// UI-focused participant interface (JMAP-agnostic)
export interface UIParticipant {
    email: string;
    name?: string;
    required: boolean;
}

// Recurrence pattern UI representation
export interface UIRecurrencePattern {
    frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'; // Recurrence frequency
    interval: number; // Repeat every N days/weeks/months (default 1)
    endType: 'never' | 'after' | 'until'; // End type
    endCount?: number; // Number of occurrences (if endType === 'after')
    endDate?: Date; // End date (if endType === 'until')
    byDayOfWeek?: string[]; // For weekly: array of day names ['MO', 'WE', 'FR'] or ['monday', 'wednesday', 'friday']
    byMonthDay?: number[]; // For monthly: array of days [1, 15, 30]
    byMonth?: number[]; // For yearly: array of months [1, 6, 12]
}

export interface UICalendarEventFormData {
    title: string;
    start: Date;
    end: Date;
    description: string;
    location?: string;
    virtualLocation?: string; // Virtual meeting link (e.g., Zoom, Teams)
    participants?: UIParticipant[];
    timeZone?: string; // IANA timezone identifier
    showWithoutTime?: boolean; // All-day event flag
    recurrence?: UIRecurrencePattern; // Recurrence pattern for the event
}
