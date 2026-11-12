'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const view = require('../public/appointment-view');

const HOUR_MS = 60 * 60 * 1000;
const now = new Date('2026-03-02T15:00:00.000Z');
const at = (hours) => new Date(now.getTime() + hours * HOUR_MS).toISOString();

test('shows Cancel more than 2 hours before the start time', () => {
  assert.equal(view.canShowCancel({ status: 'booked', start: at(3) }, now), true);
});

test('hides Cancel within 2 hours of the start time', () => {
  assert.equal(view.canShowCancel({ status: 'booked', start: at(1.5) }, now), false);
});

test('hides Cancel for closed appointments', () => {
  for (const status of ['completed', 'cancelled', 'no_show']) {
    assert.equal(view.canShowCancel({ status, start: at(48) }, now), false, status);
  }
});

test('moves cancelled appointments to the past list', () => {
  const { upcoming, past } = view.splitAppointments([
    { id: 'a', status: 'booked', start: at(24) },
    { id: 'b', status: 'cancelled', start: at(48) },
  ], now);
  assert.deepEqual(upcoming.map((a) => a.id), ['a']);
  assert.deepEqual(past.map((a) => a.id), ['b']);
});

test('keeps 90 days of history', () => {
  const { past } = view.splitAppointments([
    { id: 'recent', status: 'completed', start: at(-30 * 24) },
    { id: 'old', status: 'completed', start: at(-120 * 24) },
  ], now);
  assert.deepEqual(past.map((a) => a.id), ['recent']);
});

test('uses customer-friendly status labels', () => {
  assert.equal(view.statusLabel('checked_in'), 'Checked in');
  assert.equal(view.statusLabel('no_show'), 'No-show');
  assert.equal(view.statusLabel('cancelled'), 'Cancelled');
});
