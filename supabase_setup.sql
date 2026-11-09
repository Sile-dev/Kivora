-- Run this entire script in Supabase Dashboard > SQL Editor.
-- Creates seller product listings, public product-image storage, and row-level security.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  category text not null,
  price numeric(12,2) not null check (price > 0),
  description text not null check (char_length(description) <= 1000),
  image_url text not null,
  store_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products"
on public.products for select
using (is_active = true or auth.uid() = seller_id);

drop policy if exists "Sellers can add their own products" on public.products;
create policy "Sellers can add their own products"
on public.products for insert
to authenticated
with check (auth.uid() = seller_id);

drop policy if exists "Sellers can update their own products" on public.products;
create policy "Sellers can update their own products"
on public.products for update
to authenticated
using (auth.uid() = seller_id)
with check (auth.uid() = seller_id);

drop policy if exists "Sellers can delete their own products" on public.products;
create policy "Sellers can delete their own products"
on public.products for delete
to authenticated
using (auth.uid() = seller_id);

-- Public bucket allows shoppers to see listing photos. Uploads are limited to
-- authenticated users, inside a folder named with their auth user ID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Anyone can view product images" on storage.objects;
create policy "Anyone can view product images"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Authenticated sellers upload to own folder" on storage.objects;
create policy "Authenticated sellers upload to own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Sellers update own product images" on storage.objects;
create policy "Sellers update own product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Sellers delete own product images" on storage.objects;
create policy "Sellers delete own product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
