/** Thời gian chờ thanh toán (khớp Redis lock / temp_order TTL). */
export const BOOKING_CHECKOUT_TTL_MS = 10 * 60 * 1000;

export const BOOKING_EXPIRATION_QUEUE = 'booking-expiration';

export const BOOKING_EXPIRATION_JOB = 'expire-checkout';
