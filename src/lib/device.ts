/**
 * Anonymous per-device identity for guests. Stored in an httpOnly cookie
 * (set by the join endpoint) so shot limits persist without an account
 * and the token is invisible to page scripts.
 */
export const DEVICE_COOKIE = "kadr_device";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
