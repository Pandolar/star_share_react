import dayjs from 'dayjs';

/** Convert any stored timestamp (UTC ISO or naive Shanghai) to a datetime-local input value. */
export const toLocalDateTimeInput = (value?: string | null): string =>
    value ? dayjs(value).format('YYYY-MM-DDTHH:mm') : '';

/** Convert a datetime-local input value to a UTC ISO string for transport. */
export const fromLocalDateTimeInput = (value: string): string =>
    value ? dayjs(value).toISOString() : '';
