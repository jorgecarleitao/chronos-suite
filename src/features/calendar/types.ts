import { Participant } from '../../data/calendarEvents';

export interface CalendarEventFormData {
    title: string;
    start: Date;
    end: Date;
    description: string;
    participants: Participant[];
}
