(function () {
  'use strict';

  const { apiBaseUrl } = window.PORTAL_CONFIG;
  const view = window.AppointmentView;

  const upcomingList = document.getElementById('upcoming-list');
  const pastList = document.getElementById('past-list');
  const message = document.getElementById('message');
  const dialog = document.getElementById('cancel-dialog');
  const dialogSummary = document.getElementById('cancel-summary');

  let pendingId = null;

  function showMessage(text, tone = 'info') {
    message.textContent = text;
    message.dataset.tone = tone;
  }

  function renderAppointment(appointment, now) {
    const item = document.createElement('li');
    item.className = 'appointment';

    const title = document.createElement('h3');
    title.textContent = appointment.service;

    const details = document.createElement('p');
    details.textContent = `${view.formatStart(appointment.start)} · ${appointment.vehicle} · ${appointment.dealer}`;

    const status = document.createElement('span');
    status.className = 'status';
    status.textContent = view.statusLabel(appointment.status);

    item.append(title, details, status);

    if (view.canShowCancel(appointment, now)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cancel';
      button.textContent = 'Cancel appointment';
      button.addEventListener('click', () => openCancelDialog(appointment));
      item.append(button);
    }
    return item;
  }

  function renderList(list, appointments, emptyText, now) {
    list.replaceChildren();
    if (appointments.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = emptyText;
      list.append(empty);
      return;
    }
    for (const appointment of appointments) {
      list.append(renderAppointment(appointment, now));
    }
  }

  async function loadAppointments() {
    try {
      const res = await fetch(`${apiBaseUrl}/api/appointments`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { appointments } = await res.json();
      const now = new Date();
      const { upcoming, past } = view.splitAppointments(appointments, now);
      renderList(upcomingList, upcoming, 'You have no upcoming appointments.', now);
      renderList(pastList, past, 'Nothing in the last 90 days.', now);
    } catch {
      showMessage("We couldn't load your appointments. Please refresh the page.", 'error');
    }
  }

  function openCancelDialog(appointment) {
    pendingId = appointment.id;
    dialogSummary.textContent = `${appointment.service} on ${view.formatStart(appointment.start)}`;
    dialog.returnValue = '';
    dialog.showModal();
  }

  dialog.addEventListener('close', async () => {
    const id = pendingId;
    pendingId = null;
    if (dialog.returnValue !== 'confirm' || !id) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/appointments/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMessage('Your appointment is canceled.', 'success');
    } catch {
      showMessage('Something went wrong. Please try again.', 'error');
    }
    await loadAppointments();
  });

  loadAppointments();
})();
