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

## Related repositories

- [dealer-appointments-api](https://github.com/cherryjain-msft/dealer-appointments-api): appointment data and cancellation.
- [dealer-help-center](https://github.com/cherryjain-msft/dealer-help-center): customer help articles.
