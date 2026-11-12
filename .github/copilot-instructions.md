# Copilot instructions

- Static HTML, CSS and JavaScript in `public/`, with no build step and no npm dependencies. `server.js` is only for local development.
- Keep display rules in `public/appointment-view.js` as small pure functions so `node --test` can cover them. Keep `public/app.js` focused on rendering and API calls.
- Keep the page accessible: real buttons, a labeled dialog and status messages in the `#message` live region.
- Use US English in customer-facing copy.
- Run `npm test` before opening a pull request.
