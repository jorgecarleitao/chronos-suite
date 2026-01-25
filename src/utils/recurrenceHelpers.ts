/**
 * Recurrence pattern utilities for calendar events
 * Handles iCalendar RRULE format and event occurrence generation
 */

import { RRule, Frequency, Weekday, rrulestr } from 'rrule';
import type { UIRecurrencePattern } from '../features/calendar/types';

/**
 * Convert UI recurrence pattern to iCalendar RRULE string
 * @param pattern - UI recurrence pattern
 * @param startDate - Start date of the event
 * @returns RRULE string or undefined if frequency is 'none'
 */
export function generateRRuleString(pattern: UIRecurrencePattern, startDate: Date): string | undefined {
    if (pattern.frequency === 'none') {
        return undefined;
    }

    const frequencyMap: Record<string, Frequency> = {
        daily: Frequency.DAILY,
        weekly: Frequency.WEEKLY,
        monthly: Frequency.MONTHLY,
        yearly: Frequency.YEARLY,
    };

    const options: any = {
        freq: frequencyMap[pattern.frequency],
        interval: pattern.interval || 1,
        dtstart: startDate,
    };

    // Handle end conditions
    if (pattern.endType === 'after' && pattern.endCount) {
        options.count = pattern.endCount;
    } else if (pattern.endType === 'until' && pattern.endDate) {
        options.until = pattern.endDate;
    }

    // Handle day-specific recurrences
    if (pattern.frequency === 'weekly' && pattern.byDayOfWeek?.length) {
        options.byweekday = pattern.byDayOfWeek.map(day => parseDayOfWeek(day));
    }

    if (pattern.frequency === 'monthly' && pattern.byMonthDay?.length) {
        options.bymonthday = pattern.byMonthDay;
    }

    if (pattern.frequency === 'yearly' && pattern.byMonth?.length) {
        options.bymonth = pattern.byMonth;
    }

    const rule = new RRule(options);
    return rule.toString().split('\n')[0].replace('DTSTART:', ''); // Return just the RRULE part
}

/**
 * Parse iCalendar RRULE string to UI recurrence pattern
 * @param rruleString - RRULE string (e.g., 'FREQ=WEEKLY;BYDAY=MO,WE,FR')
 * @param startDate - Start date of the event (for DTSTART)
 * @returns UI recurrence pattern or null if invalid
 */
export function parseRRule(rruleString: string, startDate: Date): UIRecurrencePattern | null {
    try {
        // Parse RRULE string manually by splitting on semicolons
        const parts = rruleString.split(';');
        const params: Record<string, string> = {};

        for (const part of parts) {
            const [key, value] = part.split('=');
            if (key && value) {
                params[key.trim()] = value.trim();
            }
        }

        // Map frequency string to our frequency type
        const frequencyMap: Record<string, 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
            DAILY: 'daily',
            WEEKLY: 'weekly',
            MONTHLY: 'monthly',
            YEARLY: 'yearly',
        };

        const frequency = frequencyMap[params.FREQ] || 'daily';
        const interval = params.INTERVAL ? parseInt(params.INTERVAL, 10) : 1;

        const pattern: UIRecurrencePattern = {
            frequency,
            interval,
            endType: 'never',
        };

        // Parse end condition
        if (params.COUNT) {
            pattern.endType = 'after';
            pattern.endCount = parseInt(params.COUNT, 10);
        } else if (params.UNTIL) {
            pattern.endType = 'until';
            // Parse UNTIL date (format: YYYYMMDD or YYYYMMDDTHHMMSSZ)
            const untilStr = params.UNTIL;
            const year = parseInt(untilStr.substring(0, 4), 10);
            const month = parseInt(untilStr.substring(4, 6), 10);
            const day = parseInt(untilStr.substring(6, 8), 10);
            pattern.endDate = new Date(year, month - 1, day);
        }

        // Parse BYDAY (e.g., 'MO,WE,FR')
        if (params.BYDAY) {
            pattern.byDayOfWeek = params.BYDAY.split(',').map(day => day.trim());
        }

        // Parse BYMONTHDAY (e.g., '1,15,30')
        if (params.BYMONTHDAY) {
            pattern.byMonthDay = params.BYMONTHDAY.split(',').map(day => parseInt(day.trim(), 10));
        }

        // Parse BYMONTH (e.g., '1,6,12')
        if (params.BYMONTH) {
            pattern.byMonth = params.BYMONTH.split(',').map(month => parseInt(month.trim(), 10));
        }

        return pattern;
    } catch (e) {
        console.error('Failed to parse RRULE:', rruleString, e);
        return null;
    }
}

/**
 * Generate all occurrences of a recurring event within a date range
 * @param rruleString - RRULE string
 * @param startDate - Start date of first occurrence
 * @param endDate - End date of occurrence search range
 * @param duration - Duration of event in milliseconds
 * @returns Array of event occurrences with start and end dates
 */
export function generateOccurrences(
    rruleString: string,
    startDate: Date,
    endDate: Date,
    duration: number
): Array<{ start: Date; end: Date }> {
    try {
        const rule = rrulestr(rruleString, { dtstart: startDate });
        const occurrences: Array<{ start: Date; end: Date }> = [];

        const instances = rule.between(startDate, endDate, true);

        for (const instance of instances) {
            occurrences.push({
                start: instance,
                end: new Date(instance.getTime() + duration),
            });
        }

        return occurrences;
    } catch (e) {
        console.error('Failed to generate occurrences:', rruleString, e);
        return [];
    }
}

/**
 * Format recurrence pattern for human-readable display
 * @param pattern - UI recurrence pattern
 * @returns Human-readable string (e.g., "Every week on Monday and Wednesday")
 */
export function formatRecurrenceDisplay(pattern: UIRecurrencePattern, t?: (key: string) => string): string {
    // Use a simple format if no translation function provided
    const translate = t || ((key: string) => key);

    if (pattern.frequency === 'none') {
        return translate('calendar.noRecurrence');
    }

    const frequencyText = translate(`calendar.frequency.${pattern.frequency}`);
    let display = frequencyText;

    // Add interval if not 1
    if (pattern.interval && pattern.interval > 1) {
        display = translate('calendar.recurrence.everyN').replace('{{count}}', pattern.interval.toString()).replace('{{unit}}', frequencyText.toLowerCase());
    }

    // Add day-specific info
    if (pattern.byDayOfWeek?.length && pattern.frequency === 'weekly') {
        const days = pattern.byDayOfWeek.map(day => translate(`calendar.dayAbbr.${day.toLowerCase()}`)).join(', ');
        display += ` ${translate('calendar.recurrence.on')} ${days}`;
    }

    // Add end condition
    if (pattern.endType === 'after' && pattern.endCount) {
        display += ` ${translate('calendar.recurrence.times').replace('{{count}}', pattern.endCount.toString())}`;
    } else if (pattern.endType === 'until' && pattern.endDate) {
        const until = pattern.endDate.toLocaleDateString();
        display += ` ${translate('calendar.recurrence.until')} ${until}`;
    }

    return display;
}

/**
 * Parse day of week abbreviation to rrule Weekday
 * Accepts formats: 'MO', 'monday', 'Monday'
 */
function parseDayOfWeek(day: string): Weekday {
    const normalizedDay = day.toUpperCase();
    const dayMap: Record<string, Weekday> = {
        MO: RRule.MO,
        MONDAY: RRule.MO,
        TU: RRule.TU,
        TUESDAY: RRule.TU,
        WE: RRule.WE,
        WEDNESDAY: RRule.WE,
        TH: RRule.TH,
        THURSDAY: RRule.TH,
        FR: RRule.FR,
        FRIDAY: RRule.FR,
        SA: RRule.SA,
        SATURDAY: RRule.SA,
        SU: RRule.SU,
        SUNDAY: RRule.SU,
    };

    return dayMap[normalizedDay] || RRule.MO;
}

/**
 * Calculate duration between two dates in milliseconds
 */
export function calculateEventDuration(startDate: Date, endDate: Date): number {
    return endDate.getTime() - startDate.getTime();
}

/**
 * Check if event is recurring
 */
export function isRecurringEvent(rruleString?: string): boolean {
    return !!rruleString && rruleString.length > 0;
}
