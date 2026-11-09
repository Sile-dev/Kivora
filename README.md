# KIVORA Marketplace starter

This package is a more complete marketplace foundation, including:
- Responsive storefront, category filters and search
- Product cards that display real uploaded photos
- Cart stored in the visitor's browser
- Email sign-up and login using Supabase Auth
- Seller product listing form with image preview
- Uploads to Supabase Storage and product records in Supabase Database
- SQL setup with row-level security policies

## Setup required before real use

The website is not a fully launched commercial marketplace yet. You must connect a Supabase project and later configure a payment provider, shipping, refunds, seller verification, moderation and order management.

### 1. Create Supabase project
Create a project at https://supabase.com/. In Project Settings → API, copy the Project URL and public anon key.

### 2. Create database and image storage
Open Supabase → SQL Editor → New query. Copy all of `supabase_setup.sql`, run it, and confirm it succeeds. This creates the products table, storage bucket and security policies.

### 3. Connect the website
Open `app.js`. Replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` with the Project URL and public anon key. Do not put a `service_role` key in browser code.

### 4. Upload to GitHub
Upload `index.html`, `style.css`, `app.js`, `supabase_setup.sql`, and `README.md` to the root of your KIVORA repository. Keep the filenames unchanged.

### 5. Test
Deploy the site, create a test account, log in, open Sell, upload a test product photo, and confirm it appears in the storefront. Test with non-sensitive test data first.

## Important limitations
- Product image upload and listing persistence work only after Supabase is configured and SQL is run.
- The cart is currently browser-local; it is not synced between devices or saved as an order.
- Checkout is intentionally not active. A secure payment provider and server-side order validation are required.
- Seller profiles, seller dashboards, admin moderation, shipping integration, customer reviews, stock management, returns and notifications are future build stages.
- Do not collect real customer payment details or promise delivery until those systems are implemented and tested.
