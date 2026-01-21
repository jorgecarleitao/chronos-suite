// UI-focused participant interface (JMAP-agnostic)
export interface UIParticipant {
    email: string;
    name?: string;
    required: boolean;
}

export interface UICalendarEventFormData {
    title: string;
    start: Date;
    end: Date;
    description: string;
    location?: string;
    participants?: UIParticipant[];
    timeZone?: string; // IANA timezone identifier
    showWithoutTime?: boolean; // All-day event flag
}
