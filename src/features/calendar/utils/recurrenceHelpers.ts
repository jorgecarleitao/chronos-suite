/**
 * Recurrence occurrence generation utilities
 * Implements JMAP RecurrenceRule expansion natively (JSCalendar RFC 8984)
 * No external dependencies
 */

import type { RecurrenceRule } from '../data/recurrenceRule/jmap';

/**
 * Generate occurrences from a single JMAP RecurrenceRule
 * Efficiently generates only the occurrences that should exist based on the rule
 * @param rule - Single JMAP RecurrenceRule
 * @param startDate - Start date of first occurrence
 * @param endDate - End date of occurrence search range
 * @param duration - Duration of event in milliseconds
 * @returns Array of event occurrences with start and end dates
 */
function generateOccurrencesFromRule(
    rule: RecurrenceRule,
    startDate: Date,
    endDate: Date,
    duration: number
): Array<{ start: Date; end: Date }> {
    if (!rule.frequency) {
        console.error('Invalid JMAP RecurrenceRule: missing frequency', rule);
        return [];
    }

    const occurrences: Array<{ start: Date; end: Date }> = [];
    const frequency = rule.frequency.toLowerCase();
    const interval = rule.interval || 1;
    const count = rule.count;
    const until = rule.until ? new Date(rule.until) : null;
    const byDay = rule.byDay || [];
    const byMonthDay = rule.byMonthDay || [];
    const byMonth =
        rule.byMonth?.map((m: any) => (typeof m === 'string' ? parseInt(m, 10) : m)) || [];

    let occurrenceCount = 0;

    // For weekly with specific days, generate each day in the week
    if (frequency === 'weekly' && byDay.length > 0) {
        const targetDays = byDay
            .map((d: any) => {
                const day = typeof d === 'string' ? d : d.day;
                return dayStringToNumber(day);
            })
            .filter((d) => d !== -1);

        let weekStart = new Date(startDate);

        while (occurrenceCount < count) {
            // Generate occurrences for each target day in this week
            for (const targetDay of targetDays) {
                const occurrence = new Date(weekStart);
                const currentDay = occurrence.getDay();
                const daysToAdd = (targetDay - currentDay + 7) % 7;
                occurrence.setDate(occurrence.getDate() + daysToAdd);

                // Check end conditions
                if (until && occurrence > until) return occurrences;
                if (occurrence > endDate) return occurrences;

                if (occurrence >= startDate) {
                    occurrences.push({
                        start: new Date(occurrence),
                        end: new Date(occurrence.getTime() + duration),
                    });
                    occurrenceCount++;
                    if (count && occurrenceCount >= count) return occurrences;
                }
            }

            // Advance to next week interval
            weekStart.setDate(weekStart.getDate() + 7 * interval);
        }

        return occurrences;
    }

    // For monthly with specific days
    if (frequency === 'monthly' && byMonthDay.length > 0) {
        let current = new Date(startDate);

        while (occurrenceCount < count) {
            for (const day of byMonthDay) {
                const occurrence = new Date(
                    current.getFullYear(),
                    current.getMonth(),
                    day,
                    startDate.getHours(),
                    startDate.getMinutes(),
                    startDate.getSeconds(),
                    startDate.getMilliseconds()
                );

                // Check end conditions
                if (until && occurrence > until) return occurrences;
                if (occurrence > endDate) return occurrences;

                if (occurrence >= startDate && occurrence.getMonth() === current.getMonth()) {
                    occurrences.push({
                        start: new Date(occurrence),
                        end: new Date(occurrence.getTime() + duration),
                    });
                    occurrenceCount++;
                    if (count && occurrenceCount >= count) return occurrences;
                }
            }

            // Advance to next month interval
            current.setMonth(current.getMonth() + interval);
        }

        return occurrences;
    }

    // For simple daily/weekly/monthly/yearly without byX constraints
    let current = new Date(startDate);

    while (occurrenceCount < count) {
        // Check end conditions
        if (until && current > until) break;
        if (current > endDate) break;

        // Check byMonth constraint for yearly recurrence
        if (frequency === 'yearly' && byMonth.length > 0) {
            const month = current.getMonth() + 1;
            if (!byMonth.includes(month)) {
                current = advanceDate(current, frequency, interval);
                continue;
            }
        }

        if (current >= startDate) {
            occurrences.push({
                start: new Date(current),
                end: new Date(current.getTime() + duration),
            });
            occurrenceCount++;
        }

        // Advance based on frequency
        current = advanceDate(current, frequency, interval);
    }

    return occurrences;
}

/**
 * Generate occurrences from JMAP RecurrenceRule array (RFC 8984)
 * Implements recurrence expansion natively without external dependencies
 * @param rules - Array of JMAP RecurrenceRule objects
 * @param startDate - Start date of first occurrence
 * @param endDate - End date of occurrence search range
 * @param duration - Duration of event in milliseconds
 * @returns Array of event occurrences with start and end dates, sorted by start time
 */
export function generateOccurrences(
    rules: RecurrenceRule[],
    startDate: Date,
    endDate: Date,
    duration: number
): Array<{ start: Date; end: Date }> {
    if (rules.length === 0) {
        return [];
    }

    // Generate occurrences from all rules and combine
    const allOccurrences = rules.flatMap((rule) =>
        generateOccurrencesFromRule(rule, startDate, endDate, duration)
    );

    // Sort by start time and remove duplicates
    const uniqueOccurrences = new Map<number, { start: Date; end: Date }>();
    for (const occurrence of allOccurrences) {
        const timestamp = occurrence.start.getTime();
        if (!uniqueOccurrences.has(timestamp)) {
            uniqueOccurrences.set(timestamp, occurrence);
        }
    }

    return Array.from(uniqueOccurrences.values()).sort(
        (a, b) => a.start.getTime() - b.start.getTime()
    );
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
            next.setDate(next.getDate() + 7 * interval);
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
 * Calculate duration between two dates in milliseconds
 */
export function calculateEventDuration(startDate: Date, endDate: Date): number {
    return endDate.getTime() - startDate.getTime();
}
