# KIVORA Marketplace — custom backend edition

This version replaces the browser-only Supabase integration with a custom Node.js + Express API and PostgreSQL database. It includes:

- Black-and-gold animated KIVORA intro (automatically transitions after 4 seconds; no skip button).
- Buyer and seller registration and login using email + password.
- Password hashing with bcrypt; signed session in an HttpOnly cookie.
- Seller product listing with JPG/PNG/WEBP photo upload (max 5 MB).
- Public product catalogue, category filtering, and search.
- Admin dashboard for viewing accounts/listings, suspending non-admin accounts, and hiding/restoring listings.
- Buyer/seller role checks on the server, not just in browser JavaScript.

## Important before going live

This is a working application codebase, but it is **not live until you create a PostgreSQL database, configure environment variables, install dependencies, and deploy it to a host that runs Node.js**. GitHub Pages alone cannot run this backend. Do not put database passwords or `JWT_SECRET` in frontend JavaScript or commit `.env` to GitHub.

Product images in this starter are saved in the server's `uploads/` directory. Use a host with a persistent disk, or replace this with object storage (for example S3-compatible storage) before production. Ephemeral server filesystems can erase uploads after redeploy/restart.

Checkout is intentionally disabled. Payment gateway integration, order management, shipping, refunds, seller verification/KYC, moderation workflows, privacy policy, terms, backups, monitoring, and security review are still required before accepting real orders or payments.

## 1. Create the database

Create a PostgreSQL database with your hosting provider. Run the entire `schema.sql` file in its SQL console. It creates `users` and `products` tables and indexes.

## 2. Configure the server

Install Node.js 20 or newer. In this folder:

```bash
npm install
```

Copy `.env.example` to `.env`, then set:

- `DATABASE_URL`: your PostgreSQL connection string.
- `JWT_SECRET`: a long random secret (at least 32 characters).
- `ADMIN_EMAIL`: the exact email address you want to use for the first admin account.
- `DATABASE_SSL=true` if your database provider requires SSL.
- `COOKIE_SECURE=true` in production (HTTPS).

Never share `.env` or publish it to GitHub.

## 3. Run locally

```bash
npm start
```

Open `http://localhost:3000`. The API health check is `http://localhost:3000/api/health`.

Register with the exact `ADMIN_EMAIL` address to receive the admin role. Other visitors can register as buyers or sellers. Admin status cannot be selected from the public sign-up form.

## 4. Deploy

Deploy the whole `kivora` folder to a Node.js hosting service (not GitHub Pages as a standalone static site). Add the environment variables in the host's dashboard, run `npm install`, and use `npm start`. Point your domain to that service and ensure HTTPS is enabled. Set `COOKIE_SECURE=true` once HTTPS is active.

If deploying to a platform with an ephemeral filesystem, configure persistent disk storage for `/uploads` or migrate uploaded images to durable object storage. Back up PostgreSQL regularly.

## 5. GitHub

You can use GitHub to store/version the code, but GitHub is not the backend host. Upload the contents of this folder to the repository. Keep `.env` out of GitHub; `.gitignore` excludes it.

## API overview

- `POST /api/auth/signup` — create buyer/seller account.
- `POST /api/auth/login` — sign in.
- `GET /api/auth/me` — current session.
- `POST /api/auth/logout` — sign out.
- `GET /api/products` — public active listings.
- `POST /api/products` — seller/admin image + product upload.
- `DELETE /api/products/:id` — seller removes own listing; admin can remove any.
- `GET /api/admin/overview` — admin-only accounts and listings.
- `PATCH /api/admin/users/:id/status` — admin suspends/reactivates non-admin account.
- `PATCH /api/admin/products/:id/status` — admin hides/restores listing.
