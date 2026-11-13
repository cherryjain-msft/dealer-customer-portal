'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const view = require('../public/appointment-view');

const HOUR_MS = 60 * 60 * 1000;
const now = new Date('2026-03-02T15:00:00.000Z');
const at = (hours) => new Date(now.getTime() + hours * HOUR_MS).toISOString();

test('uses server eligibility before, at, and after the inclusive two-hour deadline', () => {
  const cancelDeadline = now.toISOString();
  const appointment = { status: 'booked', start: at(2), cancelDeadline };
  for (const [boundary, canCancel] of [['1 ms before', true], ['at the deadline', true], ['1 ms after', false]]) {
    assert.equal(view.canShowCancel({ ...appointment, canCancel }), canCancel, boundary);
  }
  // A customer's clock must not override an eligible server response.
  assert.equal(view.canShowCancel({ ...appointment, canCancel: true }, new Date(at(24))), true);
  assert.equal(view.canShowCancel({ ...appointment, canCancel: false }, new Date(at(-24))), false);
});

test('only booked appointments with explicit server eligibility show Cancel', () => {
  for (const status of ['checked_in', 'in_service', 'ready_for_pickup', 'completed', 'canceled', 'no_show']) {
    assert.equal(view.canShowCancel({ status, start: at(48), canCancel: false }), false, status);
    assert.equal(view.canShowCancel({ status, start: at(48), canCancel: true }), false, status);
  }
  assert.equal(view.canShowCancel({ status: 'booked', start: at(48) }), false);
});

test('groups all terminal statuses in Past and canceled, including future cancellations', () => {
  const { upcoming, past } = view.splitAppointments([
    { id: 'a', status: 'booked', start: at(24) },
    { id: 'b', status: 'canceled', start: at(48) },
    { id: 'c', status: 'completed', start: at(-24) },
    { id: 'd', status: 'no_show', start: at(-48) },
    { id: 'e', status: 'checked_in', start: at(-72) },
    { id: 'f', status: 'in_service', start: at(-48) },
    { id: 'g', status: 'ready_for_pickup', start: at(-24) },
  ], now);
  assert.deepEqual(upcoming.map((a) => a.id), ['e', 'f', 'g', 'a']);
  assert.deepEqual(past.map((a) => a.id), ['b', 'c', 'd']);
});

test('keeps each terminal status through exactly 90 days after start', () => {
  const boundary = now.getTime() - 90 * 24 * HOUR_MS;
  for (const status of ['completed', 'canceled', 'no_show']) {
    const { past } = view.splitAppointments([
      { id: 'inside', status, start: new Date(boundary + 1).toISOString() },
      { id: 'boundary', status, start: new Date(boundary).toISOString() },
      { id: 'expired', status, start: new Date(boundary - 1).toISOString() },
    ], now);
    assert.deepEqual(past.map((a) => a.id), ['inside', 'boundary'], status);
  }
});

test('displays the supplied exact deadline and preserves the actionable refusal', () => {
  const appointment = {
    status: 'booked',
    start: at(2),
    cancelDeadline: '2026-03-02T15:00:17.123Z',
    canCancel: true,
    cancellationReason: null,
  };
  const deadline = view.formatDeadline(appointment.cancelDeadline);
  assert.equal(view.cancellationMessage(appointment), `You can cancel online through ${deadline}, including that time.`);
  const reason = 'Your vehicle is checked in. Contact your service advisor.';
  assert.equal(view.cancellationMessage({ ...appointment, status: 'checked_in', canCancel: false, cancellationReason: reason }),
    `Online cancellation deadline: ${deadline}. ${reason}`);
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric',
    minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, timeZoneName: 'short',
  }).formatToParts(new Date(appointment.cancelDeadline));
  for (const type of ['year', 'second', 'fractionalSecond', 'timeZoneName']) {
    assert.ok(deadline.includes(parts.find((part) => part.type === type).value), type);
  }
});

test('uses customer-friendly status labels', () => {
  assert.equal(view.statusLabel('checked_in'), 'Checked in');
  assert.equal(view.statusLabel('no_show'), 'No-show');
  assert.equal(view.statusLabel('canceled'), 'Canceled');
  assert.equal(view.statusLabel('booked'), 'Booked');
  assert.equal(view.statusLabel('in_service'), 'In service');
  assert.equal(view.statusLabel('ready_for_pickup'), 'Ready for pickup');
  assert.equal(view.statusLabel('completed'), 'Completed');
});
