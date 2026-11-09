# KIVORA Marketplace

This package includes the animated KIVORA opening screen, mandatory buyer/seller account entry, storefront, product search/categories, cart, Supabase email authentication, and seller product image uploads.

## Upload to GitHub
Upload every file in this folder to the ROOT of your existing `kivora` repository, replacing the old `index.html`, `style.css`, and `app.js`. Keep `supabase_setup.sql`, `README.md`, and `kivora-logo.png` too. GitHub Pages should serve `index.html` from the repository root.

## Required Supabase setup
1. Create a Supabase project.
2. In SQL Editor, run all of `supabase_setup.sql`.
3. In Project Settings → API, copy the Project URL and public anon key.
4. Put them into `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top of `app.js`. Never use the service-role key in browser code.
5. In Authentication → URL Configuration, add your published website URL to Site URL and Redirect URLs.

Visitors see the animated intro, then choose Buyer or Seller, then log in or sign up. The storefront is hidden until authentication succeeds. The selected account type is stored in Supabase user metadata. Sellers can upload product images to the `product-images` bucket; uploaded image URLs are shown on product cards.

## Important
Real account storage and product uploads require Supabase configuration. Payment checkout is not connected, so do not accept real payments/orders yet. Configure payment processing, shipping, moderation, and seller verification before operating commercially.
