'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const view = require('../public/appointment-view');

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.textContent = '';
    this.dataset = {};
    this.listeners = {};
  }

  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  showModal() { this.open = true; }
  async emit(name) { await this.listeners[name](); }
}

function text(element) {
  return [element.textContent, ...element.children.map(text)].join(' ');
}

const appointment = {
  id: 'appointment/1',
  service: 'Oil change',
  vehicle: '2025 Sedan',
  dealer: 'Northgate Service Center',
  status: 'booked',
  start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  cancelDeadline: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
  canCancel: true,
  cancellationReason: null,
};

function response(status, data) {
  return { status, ok: status >= 200 && status < 300, json: async () => data };
}

async function portal(cancelResponse, initial = appointment) {
  const elements = Object.fromEntries([
    'upcoming-list', 'past-list', 'message', 'cancel-dialog', 'cancel-summary', 'cancel-deadline',
  ].map((id) => [id, new Element(id)]));
  const requests = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8'), {
    window: { PORTAL_CONFIG: { apiBaseUrl: 'http://api.test' }, AppointmentView: view },
    document: {
      getElementById: (id) => elements[id],
      createElement: (tagName) => new Element(tagName),
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (options?.method === 'POST') return await cancelResponse();
      return response(200, { appointments: [initial] });
    },
  });
  await new Promise(setImmediate);
  return {
    elements,
    requests,
    async open() {
      const button = elements['upcoming-list'].children[0].children.find((child) => child.tagName === 'button');
      assert.ok(button, 'Cancel button exists');
      await button.emit('click');
    },
    async close(value) {
      elements['cancel-dialog'].returnValue = value;
      elements['cancel-dialog'].open = false;
      await elements['cancel-dialog'].emit('close');
    },
  };
}

test('cancel dialog displays the deadline and keeping an appointment does not POST', async () => {
  const app = await portal(() => { throw new Error('Unexpected POST'); });
  await app.open();
  assert.equal(app.elements['cancel-dialog'].open, true);
  assert.equal(app.elements['cancel-deadline'].textContent, view.cancellationMessage(appointment));
  await app.close('keep');
  assert.equal(app.requests.length, 1);
  const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.doesNotMatch(html, /fee-warning|\$25|late-cancellation fee/);
  assert.match(html, /aria-describedby="cancel-summary cancel-deadline"/);
});

test('a successful bare appointment response moves Canceled to history without another fetch', async () => {
  const canceled = { ...appointment, status: 'canceled', canCancel: false, cancellationReason: 'This appointment is already canceled.' };
  const app = await portal(() => response(200, canceled));
  await app.open();
  await app.close('confirm');
  assert.equal(app.requests[1].url, 'http://api.test/api/appointments/appointment%2F1/cancel');
  assert.equal(app.requests.length, 2);
  assert.match(text(app.elements['upcoming-list']), /no upcoming appointments/);
  assert.match(text(app.elements['past-list']), /Canceled/);
  assert.doesNotMatch(text(app.elements['past-list']), /Cancel appointment/);
  assert.equal(app.elements.message.textContent, 'Your appointment is canceled.');
  assert.equal(app.elements.message.dataset.tone, 'success');
});

test('stale refusals update status and deadline and announce the expected reason', async () => {
  for (const status of ['booked', 'checked_in', 'canceled']) {
    const reason = status === 'booked'
      ? 'The online cancellation deadline has passed. Call your dealer.'
      : status === 'checked_in'
        ? 'Your vehicle is checked in. Contact your service advisor.'
        : 'This appointment is already canceled.';
    const current = {
      ...appointment, status, canCancel: false,
      cancelDeadline: new Date(Date.now() - 1000).toISOString(),
      cancellationReason: reason,
    };
    const app = await portal(() => response(409, { error: reason, appointment: current }));
    await app.open();
    await app.close('confirm');
    const list = app.elements[status === 'canceled' ? 'past-list' : 'upcoming-list'];
    assert.match(text(list), new RegExp(view.statusLabel(status)));
    assert.ok(text(list).includes(view.cancellationMessage(current)));
    assert.doesNotMatch(text(list), /Cancel appointment/);
    assert.equal(app.elements.message.textContent, reason);
    assert.equal(app.elements.message.dataset.tone, 'info');
    assert.equal(app.requests.length, 2, 'No later GET can overwrite the current refusal state');
  }
});

test('unexpected server and network failures are not reported as cancellation success', async () => {
  for (const cancelResponse of [
    () => response(500, { error: 'Internal server error' }),
    () => response(404, { error: 'Appointment not found' }),
    () => { throw new Error('Network unavailable'); },
  ]) {
    const app = await portal(cancelResponse);
    await app.open();
    await app.close('confirm');
    assert.match(app.elements.message.textContent, /couldn't confirm the cancellation.*refresh/);
    assert.equal(app.elements.message.dataset.tone, 'error');
    assert.doesNotMatch(text(app.elements['past-list']), /Canceled/);
  }
});

test('cancel buttons stay disabled while a cancellation is in flight', async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const app = await portal(() => pending);
  await app.open();
  const closing = app.close('confirm');
  const button = app.elements['upcoming-list'].children[0].children.find((child) => child.tagName === 'button');
  assert.equal(button.disabled, true);
  await button.emit('click');
  assert.equal(app.elements['cancel-dialog'].open, false);
  resolve(response(409, {
    error: 'Call your dealer.',
    appointment: { ...appointment, canCancel: false, cancellationReason: 'Call your dealer.' },
  }));
  await closing;
  assert.equal(app.requests.length, 2);
});
