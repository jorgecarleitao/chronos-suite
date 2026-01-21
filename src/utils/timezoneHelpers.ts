/**
 * Timezone utility functions for calendar events
 */

/**
 * Get a list of common IANA timezone identifiers
 */
export function getCommonTimezones(): string[] {
    return [
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Anchorage',
        'Pacific/Honolulu',
        'America/Toronto',
        'America/Vancouver',
        'America/Mexico_City',
        'America/Sao_Paulo',
        'America/Argentina/Buenos_Aires',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Europe/Madrid',
        'Europe/Rome',
        'Europe/Amsterdam',
        'Europe/Brussels',
        'Europe/Vienna',
        'Europe/Zurich',
        'Europe/Stockholm',
        'Europe/Oslo',
        'Europe/Copenhagen',
        'Europe/Helsinki',
        'Europe/Warsaw',
        'Europe/Prague',
        'Europe/Budapest',
        'Europe/Bucharest',
        'Europe/Athens',
        'Europe/Istanbul',
        'Europe/Moscow',
        'Africa/Cairo',
        'Africa/Johannesburg',
        'Africa/Lagos',
        'Africa/Nairobi',
        'Asia/Dubai',
        'Asia/Kolkata',
        'Asia/Bangkok',
        'Asia/Singapore',
        'Asia/Hong_Kong',
        'Asia/Shanghai',
        'Asia/Tokyo',
        'Asia/Seoul',
        'Australia/Sydney',
        'Australia/Melbourne',
        'Australia/Brisbane',
        'Australia/Perth',
        'Pacific/Auckland',
        'Pacific/Fiji',
    ];
}

/**
 * Get all available timezones (if Intl API supports it)
 */
export function getAllTimezones(): string[] {
    try {
        // Modern browsers support this
        if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
            return (Intl as any).supportedValuesOf('timeZone');
        }
    } catch (e) {
        console.warn('Intl.supportedValuesOf not available, falling back to common timezones');
    }
    return getCommonTimezones();
}

/**
 * Get the user's local timezone
 */
export function getLocalTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        console.warn('Could not detect timezone, defaulting to UTC');
        return 'UTC';
    }
}

/**
 * Format timezone for display (e.g., "America/New_York (EST)" or "America/New_York (EDT)")
 */
export function formatTimezoneDisplay(timezone: string, date?: Date): string {
    try {
        const targetDate = date || new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'short',
        });

        const parts = formatter.formatToParts(targetDate);
        const timeZoneName = parts.find((part) => part.type === 'timeZoneName')?.value;

        if (timeZoneName) {
            return `${timezone} (${timeZoneName})`;
        }
    } catch (e) {
        console.warn(`Could not format timezone ${timezone}:`, e);
    }

    return timezone;
}

/**
 * Convert a Date to ISO string in a specific timezone
 * Returns the local date-time in that timezone as an ISO string without the Z
 */
export function dateToTimezoneISOString(date: Date, timezone: string): string {
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });

        const parts = formatter.formatToParts(date);
        const getValue = (type: string) => parts.find((p) => p.type === type)?.value || '';

        return `${getValue('year')}-${getValue('month')}-${getValue('day')}T${getValue('hour')}:${getValue('minute')}:${getValue('second')}`;
    } catch (e) {
        console.warn(`Could not convert date to timezone ${timezone}:`, e);
        // Fallback to UTC ISO string
        return date.toISOString().replace('Z', '');
    }
}

/**
 * Format a date for display with timezone awareness
 */
export function formatDateWithTimezone(
    date: Date,
    timezone?: string,
    showTimezone: boolean = false
): string {
    if (!timezone || timezone === getLocalTimezone()) {
        // Use local time
        const formatted = date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        return showTimezone ? `${formatted} (Local)` : formatted;
    }

    try {
        const formatted = date.toLocaleString('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        if (showTimezone) {
            const tzAbbr = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                timeZoneName: 'short',
            })
                .formatToParts(date)
                .find((part) => part.type === 'timeZoneName')?.value;

            return tzAbbr ? `${formatted} ${tzAbbr}` : formatted;
        }

        return formatted;
    } catch (e) {
        console.warn(`Could not format date with timezone ${timezone}:`, e);
        return date.toLocaleString();
    }
}

/**
 * Check if a timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone });
        return true;
    } catch (e) {
        return false;
    }
}
