# dealer-customer-portal

The customer portal where dealer-network customers view and cancel service appointments. It's a static site that calls [dealer-appointments-api](https://github.com/cherryjain-msft/dealer-appointments-api).

> Fictional demo app.

## Run it locally

Requires Node.js 20 or later. There are no dependencies to install.

1. In `dealer-appointments-api`, run `npm start`. The API runs at http://localhost:4000.
2. In this repo, run `npm start` and open http://localhost:5173.

The API address is set in `public/config.js`.

```bash
npm test
```

## How it works

| File | Purpose |
| --- | --- |
| `public/app.js` | Loads appointments, renders both lists and handles the cancel dialog. |
| `public/appointment-view.js` | Display rules as small pure functions: status labels, Upcoming vs. Past and canceled, and when to show **Cancel appointment**. Shared with the tests. |
| `public/config.js` | API base URL. |
| `server.js` | Static file server for local development. |

The API supplies `cancelDeadline` (UTC ISO 8601), `canCancel`, and
`cancellationReason` on each appointment. The portal displays the exact deadline
in the customer's local time with a time zone and trusts the server's eligibility
decision rather than recalculating the cutoff using the customer's clock.
Only booked appointments are eligible, through the inclusive two-hour deadline.
Checked-in vehicles require contacting the service advisor; after the deadline,
customers call their dealer.

Cancellation responses return the bare appointment on success and
`{ error, appointment }` on an expected 409 refusal. The portal immediately
replaces the stale appointment with the server's current version and announces
the refusal without a generic error. Completed, canceled, and no-show appointments
appear under **Past and canceled** through 90 days after their start time,
including the 90-day boundary. Cancellation and no-show fees do not apply.

## Related repositories

- [dealer-appointments-api](https://github.com/cherryjain-msft/dealer-appointments-api): appointment data and cancellation.
- [dealer-help-center](https://github.com/cherryjain-msft/dealer-help-center): customer help articles.
