(function () {
  'use strict';

  const { apiBaseUrl } = window.PORTAL_CONFIG;
  const view = window.AppointmentView;

  const upcomingList = document.getElementById('upcoming-list');
  const pastList = document.getElementById('past-list');
  const message = document.getElementById('message');
  const dialog = document.getElementById('cancel-dialog');
  const dialogSummary = document.getElementById('cancel-summary');
  const dialogDeadline = document.getElementById('cancel-deadline');

  let pendingId = null;
  let appointments = [];
  let cancelInFlight = false;

  function showMessage(text, tone = 'info') {
    message.textContent = text;
    message.dataset.tone = tone;
  }

  function renderAppointment(appointment) {
    const item = document.createElement('li');
    item.className = 'appointment';

    const title = document.createElement('h3');
    title.textContent = appointment.service;

    const details = document.createElement('p');
    details.textContent = `${view.formatStart(appointment.start)} · ${appointment.vehicle} · ${appointment.dealer}`;

    const status = document.createElement('span');
    status.className = 'status';
    status.textContent = view.statusLabel(appointment.status);

    const cancellation = document.createElement('p');
    cancellation.textContent = view.cancellationMessage(appointment);

    item.append(title, details, status, cancellation);

    if (view.canShowCancel(appointment)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cancel';
      button.textContent = 'Cancel appointment';
      button.disabled = cancelInFlight;
      button.addEventListener('click', () => openCancelDialog(appointment));
      item.append(button);
    }
    return item;
  }

  function renderList(list, appointments, emptyText) {
    list.replaceChildren();
    if (appointments.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = emptyText;
      list.append(empty);
      return;
    }
    for (const appointment of appointments) {
      list.append(renderAppointment(appointment));
    }
  }

  function renderAppointments() {
    const { upcoming, past } = view.splitAppointments(appointments);
    renderList(upcomingList, upcoming, 'You have no upcoming appointments.');
    renderList(pastList, past, 'Nothing in the last 90 days.');
  }

  function updateAppointment(appointment) {
    appointments = appointments.map((current) => current.id === appointment.id ? appointment : current);
    renderAppointments();
  }

  async function loadAppointments() {
    try {
      const res = await fetch(`${apiBaseUrl}/api/appointments`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      appointments = data.appointments;
      renderAppointments();
    } catch {
      showMessage("We couldn't load your appointments. Please refresh the page.", 'error');
    }
  }

  function openCancelDialog(appointment) {
    if (cancelInFlight) return;
    pendingId = appointment.id;
    dialogSummary.textContent = `${appointment.service} on ${view.formatStart(appointment.start)}`;
    dialogDeadline.textContent = view.cancellationMessage(appointment);
    dialog.returnValue = '';
    dialog.showModal();
  }

  dialog.addEventListener('close', async () => {
    const id = pendingId;
    pendingId = null;
    if (dialog.returnValue !== 'confirm' || !id) return;

    cancelInFlight = true;
    renderAppointments();
    showMessage('Canceling your appointment...');
    try {
      const res = await fetch(`${apiBaseUrl}/api/appointments/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
      if (res.status === 409) {
        const data = await res.json();
        updateAppointment(data.appointment);
        showMessage(data.error, 'info');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const appointment = await res.json();
      updateAppointment(appointment);
      showMessage('Your appointment is canceled.', 'success');
    } catch {
      showMessage("We couldn't confirm the cancellation. Please refresh your appointments before trying again.", 'error');
    } finally {
      cancelInFlight = false;
      renderAppointments();
    }
  });

  loadAppointments();
})();
