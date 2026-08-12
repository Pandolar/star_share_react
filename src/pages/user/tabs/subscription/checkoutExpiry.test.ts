import { getCheckoutRemainingMs } from './checkoutExpiry';

describe('getCheckoutRemainingMs', () => {
  it('uses the server-relative lifetime when the device clock is fast', () => {
    expect(getCheckoutRemainingMs({
      expires_at: '2026-08-12T10:05:00+08:00',
      expires_in_seconds: 299,
    }, Date.parse('2026-08-12T11:00:00+08:00'))).toBe(299_000);
  });

  it('treats a server-reported zero lifetime as expired', () => {
    expect(getCheckoutRemainingMs({
      expires_at: '2099-01-01T00:00:00+08:00',
      expires_in_seconds: 0,
    })).toBe(0);
  });

  it('falls back to the absolute expiry for legacy responses', () => {
    expect(getCheckoutRemainingMs({
      expires_at: '2026-08-12T10:05:00+08:00',
    }, Date.parse('2026-08-12T10:00:00+08:00'))).toBe(300_000);
  });

  it('uses five minutes when both server expiry fields are unavailable', () => {
    expect(getCheckoutRemainingMs({})).toBe(300_000);
  });
});
