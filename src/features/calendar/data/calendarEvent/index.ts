/**
 * CalendarEvent module - JMAP and UI interfaces with conversion utilities
 */

// Re-export JMAP types (server format)
export type {
    CalendarEvent as JmapCalendarEvent,
    VirtualLocation,
    Location,
    ParticipationStatus,
} from './jmap';

// Re-export UI namespace
import * as UI from './ui';
export { UI };

// Re-export UI types for convenience (client format)
export type { UICalendarEvent, UICalendarEventFormData } from './ui';

// Re-export actions namespace
import * as actions from './actions';
export { actions };
