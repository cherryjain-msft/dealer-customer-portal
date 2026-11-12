(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AppointmentView = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Customers can cancel online until this many hours before the start time.
  const CANCEL_WINDOW_HOURS = 2;
  const HISTORY_DAYS = 90;

  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;

  const CLOSED_STATUSES = ['completed', 'cancelled', 'no_show'];

  const STATUS_LABELS = {
    booked: 'Booked',
    checked_in: 'Checked in',
    in_service: 'In service',
    ready_for_pickup: 'Ready for pickup',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
  };

  function statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  function isClosed(appointment) {
    return CLOSED_STATUSES.includes(appointment.status);
  }

  function canShowCancel(appointment, now = new Date()) {
    if (isClosed(appointment)) return false;
    const hoursUntilStart = (Date.parse(appointment.start) - now.getTime()) / HOUR_MS;
    return hoursUntilStart > CANCEL_WINDOW_HOURS;
  }

  function splitAppointments(appointments, now = new Date()) {
    const historyStart = now.getTime() - HISTORY_DAYS * DAY_MS;
    const upcoming = [];
    const past = [];
    for (const appointment of appointments) {
      if (!isClosed(appointment)) {
        upcoming.push(appointment);
      } else if (Date.parse(appointment.start) >= historyStart) {
        past.push(appointment);
      }
    }
    upcoming.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    past.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
    return { upcoming, past };
  }

  function formatStart(iso, locale = 'en-US') {
    return new Date(iso).toLocaleString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return {
    CANCEL_WINDOW_HOURS,
    HISTORY_DAYS,
    CLOSED_STATUSES,
    statusLabel,
    isClosed,
    canShowCancel,
    splitAppointments,
    formatStart,
  };
});
