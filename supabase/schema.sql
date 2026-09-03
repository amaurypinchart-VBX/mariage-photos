-- ============================================================================
--  Éclats — schéma de base de données Supabase
--  À exécuter dans : Supabase > SQL Editor > New query > Run
--  (Copie tout ce fichier, colle-le, exécute.)
-- ============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";  -- pour gen_random_uuid()

-- ============================================================================
--  1. TABLES
-- ============================================================================

-- Un mariage / événement (l'app est multi-mariages et réutilisable).
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,               -- ex. "amaury-charlie"
  couple_names    text not null,                      -- ex. "Amaury & Charlie"
  event_date      date,
  place           text,
  welcome_message text,
  color_primary   text default '#4f6152',             -- sauge (bouton principal)
  color_accent    text default '#b08748',             -- champagne (jeu / accents)
  game_active     boolean not null default false,     -- la roulette photo est-elle ouverte ?
  gallery_public  boolean not null default false,     -- galerie visible par les invités ? (v2)
  is_active       boolean not null default true,      -- événement ouvert aux dépôts
  created_at      timestamptz not null default now()
);

-- Qui peut administrer quel mariage (toi + ta femme).
create table if not exists public.event_admins (
  event_id  uuid not null references public.events(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- Les défis de la roulette photo.
create table if not exists public.photo_challenges (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  label             text not null,
  sort_order        int not null default 0,
  unlock_threshold  int not null default 0,   -- nb de défis "normaux" à faire avant de débloquer (0 = dispo direct)
  is_active         boolean not null default true
);
create index if not exists idx_challenges_event on public.photo_challenges(event_id);

-- Les photos/vidéos déposées par les invités.
create table if not exists public.guest_uploads (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  guest_name   text,
  storage_path text not null,               -- chemin dans le bucket wedding-media
  kind         text not null default 'image' check (kind in ('image','video')),
  mime_type    text,
  size_bytes   bigint,
  challenge_id uuid references public.photo_challenges(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_uploads_event on public.guest_uploads(event_id, created_at desc);

-- ============================================================================
--  2. FONCTION D'AIDE — est-ce que l'utilisateur connecté administre ce mariage ?
--     SECURITY DEFINER pour éviter la récursion RLS.
-- ============================================================================
create or replace function public.is_event_admin(event uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.event_admins
    where event_id = event and user_id = auth.uid()
  );
$$;

-- ============================================================================
--  3. ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.events           enable row level security;
alter table public.event_admins     enable row level security;
alter table public.photo_challenges enable row level security;
alter table public.guest_uploads    enable row level security;

-- ---------- events ----------
-- Lecture : événement actif visible par tous (les invités doivent lire le nom/date),
-- + les admins voient toujours leurs événements.
drop policy if exists "events readable" on public.events;
create policy "events readable" on public.events
  for select to anon, authenticated
  using (is_active or public.is_event_admin(id));

-- Écriture : uniquement les admins de l'événement.
drop policy if exists "events admin write" on public.events;
create policy "events admin write" on public.events
  for update to authenticated
  using (public.is_event_admin(id))
  with check (public.is_event_admin(id));

-- ---------- event_admins ----------
-- Chaque utilisateur voit ses propres appartenances (pour lister ses mariages).
drop policy if exists "own admin rows" on public.event_admins;
create policy "own admin rows" on public.event_admins
  for select to authenticated
  using (user_id = auth.uid());
-- (Les insertions dans event_admins se font via le SQL Editor — voir README.)

-- ---------- photo_challenges ----------
-- Lecture : défis actifs des événements actifs, visibles par tous ; admins voient tout.
drop policy if exists "challenges readable" on public.photo_challenges;
create policy "challenges readable" on public.photo_challenges
  for select to anon, authenticated
  using (
    public.is_event_admin(event_id)
    or exists (select 1 from public.events e where e.id = event_id and e.is_active)
  );

-- Écriture : admins uniquement.
drop policy if exists "challenges admin write" on public.photo_challenges;
create policy "challenges admin write" on public.photo_challenges
  for all to authenticated
  using (public.is_event_admin(event_id))
  with check (public.is_event_admin(event_id));

-- ---------- guest_uploads ----------
-- Dépôt : autorisé sans compte (anon), à condition que l'événement soit actif.
drop policy if exists "guests insert uploads" on public.guest_uploads;
create policy "guests insert uploads" on public.guest_uploads
  for insert to anon, authenticated
  with check (
    exists (select 1 from public.events e where e.id = event_id and e.is_active)
  );

-- Lecture / suppression : admins de l'événement uniquement (les invités ne voient
-- jamais les photos des autres).
drop policy if exists "admins read uploads" on public.guest_uploads;
create policy "admins read uploads" on public.guest_uploads
  for select to authenticated
  using (public.is_event_admin(event_id));

drop policy if exists "admins delete uploads" on public.guest_uploads;
create policy "admins delete uploads" on public.guest_uploads
  for delete to authenticated
  using (public.is_event_admin(event_id));

-- ============================================================================
--  4. STOCKAGE (bucket privé wedding-media)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-media', 'wedding-media', false,
  104857600,  -- 100 Mo par fichier
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif',
        'video/mp4','video/quicktime','video/webm']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Dépôt de médias par les invités (sans compte), dans le dossier d'un événement actif.
drop policy if exists "guests upload media" on storage.objects;
create policy "guests upload media" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'wedding-media'
    and exists (
      select 1 from public.events e
      where e.id::text = split_part(name, '/', 1) and e.is_active
    )
  );

-- Lecture des médias : uniquement les admins de l'événement (1er segment du chemin = event_id).
drop policy if exists "admins read media" on storage.objects;
create policy "admins read media" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wedding-media'
    and public.is_event_admin( (split_part(name, '/', 1))::uuid )
  );

-- Suppression des médias : admins de l'événement.
drop policy if exists "admins delete media" on storage.objects;
create policy "admins delete media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wedding-media'
    and public.is_event_admin( (split_part(name, '/', 1))::uuid )
  );

-- ============================================================================
--  Fin du schéma. Ensuite : exécute supabase/seed.sql pour créer le mariage démo.
-- ============================================================================
