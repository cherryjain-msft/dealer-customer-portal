(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AppointmentView = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HISTORY_DAYS = 90;

  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;

  const CLOSED_STATUSES = ['completed', 'canceled', 'no_show'];

  const STATUS_LABELS = {
    booked: 'Booked',
    checked_in: 'Checked in',
    in_service: 'In service',
    ready_for_pickup: 'Ready for pickup',
    completed: 'Completed',
    canceled: 'Canceled',
    no_show: 'No-show',
  };

  function statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  function isClosed(appointment) {
    return CLOSED_STATUSES.includes(appointment.status);
  }

  function canShowCancel(appointment) {
    return appointment.status === 'booked' && appointment.canCancel === true;
  }

  function cancellationMessage(appointment) {
    const deadline = formatDeadline(appointment.cancelDeadline);
    if (canShowCancel(appointment)) {
      return `You can cancel online through ${deadline}, including that time.`;
    }
    return `Online cancellation deadline: ${deadline}. ${appointment.cancellationReason}`;
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

  function formatDeadline(iso, locale = 'en-US') {
    const deadline = new Date(iso);
    return deadline.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      ...(deadline.getMilliseconds() ? { fractionalSecondDigits: 3 } : {}),
      timeZoneName: 'short',
    });
  }

  return {
    HISTORY_DAYS,
    CLOSED_STATUSES,
    statusLabel,
    isClosed,
    canShowCancel,
    cancellationMessage,
    splitAppointments,
    formatStart,
    formatDeadline,
  };
});
