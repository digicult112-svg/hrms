/**
 * Date Utility Functions
 * Addresses timezone issues where standard Date methods default to UTC
 */

/**
 * Returns the date string in YYYY-MM-DD format based on the Local Timezone.
 * Standard .toISOString() returns UTC, which can cause 'tomorrow' dates for users in western timezones.
 */
export const toLocalISOString = (date: Date = new Date()): string => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

/**
 * Formats a timestamp into a readable date and time string using local locale
 */
export const formatDateTime = (isoString: string): string => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};
