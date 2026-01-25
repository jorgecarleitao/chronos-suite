/**
 * JMAP RecurrenceRule interfaces following JSCalendar RFC 8984
 * These are the canonical JMAP types received from/sent to the server
 */

/**
 * JMAP RecurrenceRule following JSCalendar RFC 8984
 */
export interface RecurrenceRule {
    '@type': 'RecurrenceRule';
    frequency: 'yearly' | 'monthly' | 'weekly' | 'daily' | 'hourly' | 'minutely' | 'secondly';
    interval?: number; // Default is 1
    rscale?: string; // Calendar system (default is 'gregorian')
    skip?: 'omit' | 'backward' | 'forward'; // How to handle invalid dates
    firstDayOfWeek?: 'mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su'; // Default is 'mo'
    byDay?: NDay[]; // Days of week/month
    byMonthDay?: number[]; // Days of month (1-31, negative for end of month)
    byMonth?: string[]; // Months (1-12 as strings)
    byYearDay?: number[]; // Days of year (1-366, negative for end of year)
    byWeekNo?: number[]; // Week numbers (1-53, negative for end of year)
    byHour?: number[]; // Hours (0-23)
    byMinute?: number[]; // Minutes (0-59)
    bySecond?: number[]; // Seconds (0-60 for leap seconds)
    bySetPosition?: number[]; // Positions in the recurrence set
    count?: number; // Maximum number of occurrences
    until?: string; // ISO 8601 date-time or date
}

/**
 * NDay object for byDay in RecurrenceRule (JSCalendar RFC 8984)
 */
export interface NDay {
    '@type'?: 'NDay';
    day: 'mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su';
    nthOfPeriod?: number; // e.g., 1 for first Monday, -1 for last Monday
}
