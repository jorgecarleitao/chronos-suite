/**
 * Recurrence pattern utilities for calendar events
 * Supports JMAP RecurrenceRule objects (JSCalendar RFC 8984) and ICS format
 * No external dependencies - implements recurrence expansion natively
 */

import type { UIRecurrencePattern } from '../types';
import type { RecurrenceRule, NDay } from '../../../types/calendar';

/**
 * Generate JMAP RecurrenceRule from UI pattern
 * @param pattern - UI recurrence pattern
 * @returns JMAP RecurrenceRule object or undefined if frequency is 'none'
 */
export function generateRecurrenceRule(pattern: UIRecurrencePattern): RecurrenceRule | undefined {
    if (pattern.frequency === 'none') {
        return undefined;
    }

    const rule: RecurrenceRule = {
        '@type': 'RecurrenceRule',
        frequency: pattern.frequency as RecurrenceRule['frequency'],
    };

    // Add interval if > 1
    if (pattern.interval && pattern.interval > 1) {
        rule.interval = pattern.interval;
    }

    // Handle end conditions
    if (pattern.endType === 'after' && pattern.endCount) {
        rule.count = pattern.endCount;
    } else if (pattern.endType === 'until' && pattern.endDate) {
        rule.until = pattern.endDate.toISOString();
    }

    // Handle day-specific recurrences
    if (pattern.frequency === 'weekly' && pattern.byDayOfWeek?.length) {
        rule.byDay = pattern.byDayOfWeek.map(day => ({
            '@type': 'NDay',
            day: day.toLowerCase() as NDay['day'],
        }));
    }

    if (pattern.frequency === 'monthly' && pattern.byMonthDay?.length) {
        rule.byMonthDay = pattern.byMonthDay;
    }

    if (pattern.frequency === 'yearly' && pattern.byMonth?.length) {
        rule.byMonth = pattern.byMonth.map(m => m.toString());
    }

    return rule;
}

/**
 * Parse JMAP RecurrenceRule to UI pattern
 * Converts JMAP RecurrenceRule object back to UIRecurrencePattern for editing
 * @param recurrenceRule - JMAP RecurrenceRule object
 * @returns UIRecurrencePattern or null if invalid
 */
export function parseRecurrenceRule(recurrenceRule: RecurrenceRule | undefined): UIRecurrencePattern | null {
    if (!recurrenceRule) {
        return null;
    }

    // Only support daily, weekly, monthly, yearly in UI (not hourly, minutely, secondly)
    const supportedFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!supportedFrequencies.includes(recurrenceRule.frequency)) {
        console.warn(`Unsupported frequency for UI: ${recurrenceRule.frequency}`);
        return null;
    }

    const pattern: UIRecurrencePattern = {
        frequency: recurrenceRule.frequency as UIRecurrencePattern['frequency'],
        interval: recurrenceRule.interval || 1,
        endType: 'never',
    };

    // Parse end conditions
    if (recurrenceRule.count) {
        pattern.endType = 'after';
        pattern.endCount = recurrenceRule.count;
    } else if (recurrenceRule.until) {
        pattern.endType = 'until';
        pattern.endDate = new Date(recurrenceRule.until);
    }

    // Parse byDay to byDayOfWeek
    if (recurrenceRule.byDay?.length) {
        pattern.byDayOfWeek = recurrenceRule.byDay.map((d: any) => {
            const day = typeof d === 'string' ? d : d.day;
            return day.toUpperCase();
        });
    }

    // Parse byMonthDay
    if (recurrenceRule.byMonthDay?.length) {
        pattern.byMonthDay = recurrenceRule.byMonthDay;
    }

    // Parse byMonth
    if (recurrenceRule.byMonth?.length) {
        pattern.byMonth = recurrenceRule.byMonth.map((m: any) => typeof m === 'string' ? parseInt(m, 10) : m);
    }

    return pattern;
}

/**
 * Generate occurrences from JMAP RecurrenceRule object (RFC 8984)
 * Implements recurrence expansion natively without external dependencies
 * @param recurrenceRule - JMAP RecurrenceRule object or array of rules
 * @param startDate - Start date of first occurrence
 * @param endDate - End date of occurrence search range
 * @param duration - Duration of event in milliseconds
 * @returns Array of event occurrences with start and end dates
 */
export function generateOccurrences(
    recurrenceRule: RecurrenceRule | RecurrenceRule[] | undefined,
    startDate: Date,
    endDate: Date,
    duration: number
): Array<{ start: Date; end: Date }> {
    try {
        if (!recurrenceRule) {
            return [];
        }

        // Handle array of rules (JMAP allows multiple recurrence rules)
        const rules = Array.isArray(recurrenceRule) ? recurrenceRule : [recurrenceRule];
        
        if (rules.length === 0) {
            return [];
        }

        const rule = rules[0]; // Use first rule
        if (!rule.frequency) {
            console.error('Invalid JMAP RecurrenceRule: missing frequency', rule);
            return [];
        }

        const occurrences: Array<{ start: Date; end: Date }> = [];
        let current = new Date(startDate);
        current.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), startDate.getMilliseconds());

        // Parse recurrence parameters
        const frequency = rule.frequency.toLowerCase();
        const interval = rule.interval || 1;
        const count = rule.count;
        const until = rule.until ? new Date(rule.until) : null;
        const byDay = rule.byDay || [];
        const byMonthDay = rule.byMonthDay || [];
        const byMonth = rule.byMonth?.map((m: any) => typeof m === 'string' ? parseInt(m, 10) : m) || [];

        let occurrenceCount = 0;
        const maxIterations = 10000; // Safety limit to prevent infinite loops
        let iterations = 0;

        while (iterations < maxIterations && current <= endDate) {
            iterations++;

            // Check end conditions
            if (count && occurrenceCount >= count) break;
            if (until && current > until) break;

            // Check if current date matches recurrence rules
            if (matchesRecurrenceRules(current, frequency, byDay, byMonthDay, byMonth)) {
                if (current >= startDate && current <= endDate) {
                    occurrences.push({
                        start: new Date(current),
                        end: new Date(current.getTime() + duration),
                    });
                    occurrenceCount++;
                }
            }

            // Advance to next candidate based on frequency
            current = advanceDate(current, frequency, interval);
        }

        return occurrences;
    } catch (e) {
        console.error('Failed to generate occurrences from JMAP RecurrenceRule:', recurrenceRule, e);
        return [];
    }
}

/**
 * Check if a date matches the recurrence rules
 */
function matchesRecurrenceRules(
    date: Date,
    frequency: string,
    byDay: any[],
    byMonthDay: number[],
    byMonth: number[]
): boolean {
    // For weekly recurrence, check byDay
    if (frequency === 'weekly' && byDay.length > 0) {
        const dayOfWeek = date.getDay();
        const matches = byDay.some((d: any) => {
            const day = typeof d === 'string' ? dayStringToNumber(d) : d?.day ? dayStringToNumber(d.day) : null;
            return day === dayOfWeek;
        });
        if (!matches) return false;
    }

    // For monthly recurrence, check byMonthDay
    if (frequency === 'monthly' && byMonthDay.length > 0) {
        const dateOfMonth = date.getDate();
        if (!byMonthDay.includes(dateOfMonth)) return false;
    }

    // For yearly recurrence, check byMonth
    if (frequency === 'yearly' && byMonth.length > 0) {
        const month = date.getMonth() + 1; // getMonth() is 0-indexed
        if (!byMonth.includes(month)) return false;
    }

    return true;
}

/**
 * Convert day string to weekday number (0=Sunday, 6=Saturday)
 */
function dayStringToNumber(day: string): number {
    const dayMap: Record<string, number> = {
        su: 0,
        mo: 1,
        tu: 2,
        we: 3,
        th: 4,
        fr: 5,
        sa: 6,
    };
    return dayMap[day.toLowerCase()] ?? -1;
}

/**
 * Advance date to next recurrence candidate based on frequency
 */
function advanceDate(date: Date, frequency: string, interval: number): Date {
    const next = new Date(date);

    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + interval);
            break;
        case 'weekly':
            next.setDate(next.getDate() + (7 * interval));
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + interval);
            break;
        case 'yearly':
            next.setFullYear(next.getFullYear() + interval);
            break;
        case 'hourly':
            next.setHours(next.getHours() + interval);
            break;
        case 'minutely':
            next.setMinutes(next.getMinutes() + interval);
            break;
        case 'secondly':
            next.setSeconds(next.getSeconds() + interval);
            break;
    }

    return next;
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
 * Calculate duration between two dates in milliseconds
 */
export function calculateEventDuration(startDate: Date, endDate: Date): number {
    return endDate.getTime() - startDate.getTime();
}

/**
 * Check if event is recurring
 */
export function isRecurringEvent(recurrenceRule?: RecurrenceRule | RecurrenceRule[]): boolean {
    return !!recurrenceRule;
}
