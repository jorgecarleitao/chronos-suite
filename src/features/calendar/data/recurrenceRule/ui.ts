/**
 * UI RecurrencePattern interface and JMAP conversion utilities
 * Handles conversion between JMAP RecurrenceRule and UI-friendly pattern
 */

import type { RecurrenceRule, NDay } from './jmap';

/**
 * UI-friendly recurrence pattern for form editing
 * Simplified subset of JMAP RecurrenceRule for common use cases
 */
export interface UIRecurrencePattern {
    frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // Repeat every N days/weeks/months (default 1)
    endType: 'never' | 'after' | 'until';
    endCount?: number; // Number of occurrences (if endType === 'after')
    endDate?: Date; // End date (if endType === 'until')
    byDayOfWeek?: string[]; // For weekly: ['MO', 'WE', 'FR']
    byMonthDay?: number[]; // For monthly: [1, 15, 30]
    byMonth?: number[]; // For yearly: [1, 6, 12]
}

/**
 * Convert UI pattern to JMAP RecurrenceRule
 * @param pattern - UI recurrence pattern
 * @returns JMAP RecurrenceRule object or undefined if frequency is 'none'
 */
export function toJmap(pattern: UIRecurrencePattern): RecurrenceRule | null {
    if (pattern.frequency === 'none') {
        return null;
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
        rule.byDay = pattern.byDayOfWeek.map((day) => ({
            day: day.toLowerCase() as NDay['day'],
        }));
    }

    if (pattern.frequency === 'monthly' && pattern.byMonthDay?.length) {
        rule.byMonthDay = pattern.byMonthDay;
    }

    if (pattern.frequency === 'yearly' && pattern.byMonth?.length) {
        rule.byMonth = pattern.byMonth.map((m) => m.toString());
    }

    return rule;
}

/**
 * Convert JMAP RecurrenceRule to UI pattern
 * @param recurrenceRule - JMAP RecurrenceRule object
 * @returns UIRecurrencePattern or null if invalid/unsupported
 */
export function fromJmap(recurrenceRule: RecurrenceRule): UIRecurrencePattern | null {
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
        pattern.byDayOfWeek = recurrenceRule.byDay.map((d: NDay | string) => {
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
        pattern.byMonth = recurrenceRule.byMonth.map((m: string) => parseInt(m, 10));
    }

    return pattern;
}

/**
 * Format UI recurrence pattern for human-readable display
 * @param pattern - UI recurrence pattern
 * @param t - Translation function
 * @returns Human-readable string (e.g., "Every week on Monday and Wednesday")
 */
export function formatDisplay(pattern: UIRecurrencePattern, t?: (key: string) => string): string {
    const translate = t || ((key: string) => key);

    if (pattern.frequency === 'none') {
        return translate('calendar.noRecurrence');
    }

    const frequencyText = translate(`calendar.frequency.${pattern.frequency}`);
    let display = frequencyText;

    // Add interval if not 1
    if (pattern.interval && pattern.interval > 1) {
        display = translate('calendar.recurrence.everyN')
            .replace('{{count}}', pattern.interval.toString())
            .replace('{{unit}}', frequencyText.toLowerCase());
    }

    // Add day-specific info
    if (pattern.byDayOfWeek?.length && pattern.frequency === 'weekly') {
        const days = pattern.byDayOfWeek
            .map((day) => translate(`calendar.dayAbbr.${day.toLowerCase()}`))
            .join(', ');
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
