# Puja Readiness Portal

A React and Next.js App Router starter using TypeScript and Carbon Design
System.

For instructions on using the portal, see the [User Guide](./USER_GUIDE.md).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

Carbon React components are available from `@carbon/react`. The global Carbon
stylesheet, including Plex typography, is imported in
`src/app/globals.css`.

The root page opens `/login`. Sign in using the NestJS API in `../backend`;
successful authentication sets a short-lived HttpOnly JWT cookie. The dashboard
checks the authenticated profile and links to the Users module for listing,
adding, editing, and deleting user accounts.
For Railway deployments, set `NEXT_PUBLIC_API_URL` to the corresponding API
origin (for example, `https://disapm-api-stage.up.railway.app` for staging)
and redeploy the frontend. The frontend also maps the production and staging
site origins to their API origins; the variable is required for other
production domains.
Create the initial account with the backend's `npm run user:create` command.
In development, sign-in and user management authenticate through the backend by
default. To enable the browser-only demo mode, set
`NEXT_PUBLIC_DEMO_LOGIN=true` in `.env.local` and restart the frontend. Demo
users are stored in browser storage and are not written to PostgreSQL.
The Users navigation is shown only to administrators, and the backend also
checks the account's current database role on every Users API request.
User records include a display name and a case-insensitively unique username.
Users sign in with their username and password.

The authenticated workspace includes the ghat register, joint inspection
checklists, deficiency rectification tracking, and a printable Action Taken
Report with the seven-day deadline based on the order date.
Ghat records include district, sub-division, block, and Nodal Officer details.
User, ghat, and inspection forms open as full pages, with their form state
available through the page URL.

## Available scripts

- `npm run dev` — start the development server
- `npm run build` — create a production build
- `npm run start` — serve the production build
- `npm run lint` — run ESLint

# disapm_ui
