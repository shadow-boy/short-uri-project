-- enable extension for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  destination_url text not null,
  owner_id uuid null,
  is_active boolean not null default true,
  expires_at timestamptz null,
  click_limit int null,
  password_hash text null,
  tags text[] null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_links_slug_unique on links (slug);

create table if not exists clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references links(id) on delete cascade,
  ts timestamptz not null default now(),
  ip_hash text null,
  user_agent text null,
  referrer text null,
  country text null,
  ua_device text null,
  ua_browser text null
);

create index if not exists idx_clicks_linkid_ts on clicks (link_id, ts desc);


