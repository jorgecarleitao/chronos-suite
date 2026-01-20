import { Participant } from '../../types/calendar';

export interface CalendarEventFormData {
    title: string;
    start: Date;
    end: Date;
    description: string;
    location?: string;
    participants: Participant[];
}
