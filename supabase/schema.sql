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

-- Les liens de partage créés par les mariés (ex. "Famille", "Amis", "Tout").
-- Chaque lien a un token aléatoire non-devinable ; c'est lui qui fait office de
-- secret d'accès pour les invités (validé côté serveur, voir README/SECURITY).
create table if not exists public.share_links (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  label      text not null,
  token      text unique not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_share_links_event on public.share_links(event_id);

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
  share_link_id uuid references public.share_links(id) on delete set null, -- partagée avec ce lien précis
  visible_to_all boolean not null default false,                          -- partagée avec "Tout"
  created_at   timestamptz not null default now()
);
create index if not exists idx_uploads_event on public.guest_uploads(event_id, created_at desc);

-- Colonnes ajoutées après la v1 : sans effet si la table existe déjà avec elles.
alter table public.guest_uploads add column if not exists share_link_id uuid references public.share_links(id) on delete set null;
alter table public.guest_uploads add column if not exists visible_to_all boolean not null default false;
alter table public.events add column if not exists guestbook_active boolean not null default false;

-- ---------- Livre d'or ----------
-- Un invité identifié par prénom + code PIN (haché côté Next.js avec scrypt),
-- sans compte email. Une ligne = un invité pour un mariage donné.
create table if not exists public.guests (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  name       text not null,
  name_key   text not null,                 -- lower(trim(name)), pour l'unicité
  pin_hash   text not null,                 -- format "salt:hash", calculé côté serveur
  created_at timestamptz not null default now(),
  unique (event_id, name_key)
);

-- La page (carte) d'un invité : message + stickers décoratifs positionnés.
create table if not exists public.guestbook_entries (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  guest_id   uuid not null unique references public.guests(id) on delete cascade,
  message    text,
  stickers   jsonb not null default '[]'::jsonb,  -- [{id,emoji,xPct,yPct,scale,rotationDeg}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Médias attachés à une page (photo/vidéo/message vocal). `bucket` vaut soit
-- 'guestbook-media' (upload direct), soit 'wedding-media' (référence à une
-- photo déjà partagée avec l'invité — pas de duplication de fichier).
create table if not exists public.guestbook_media (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references public.guestbook_entries(id) on delete cascade,
  bucket       text not null,
  storage_path text not null,
  kind         text not null check (kind in ('image','video','audio')),
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);
create index if not exists idx_guestbook_media_entry on public.guestbook_media(entry_id);

-- ---------- Vote destination lune de miel (public, mis à jour en direct) ----------
create table if not exists public.destination_options (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  label      text not null,
  label_key  text not null,                 -- lower(trim(label)), anti-doublons
  created_by uuid references public.guests(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, label_key)
);

create table if not exists public.destination_votes (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  option_id  uuid not null references public.destination_options(id) on delete cascade,
  guest_id   uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, guest_id)               -- un seul vote actif par invité (remplaçable)
);
create index if not exists idx_destination_votes_option on public.destination_votes(option_id);

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
alter table public.share_links      enable row level security;
alter table public.guests               enable row level security;
alter table public.guestbook_entries    enable row level security;
alter table public.guestbook_media      enable row level security;
alter table public.destination_options  enable row level security;
alter table public.destination_votes    enable row level security;

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

-- Mise à jour (ex. assigner un lien de partage / "Tout") : admins uniquement.
drop policy if exists "admins update uploads" on public.guest_uploads;
create policy "admins update uploads" on public.guest_uploads
  for update to authenticated
  using (public.is_event_admin(event_id))
  with check (public.is_event_admin(event_id));

-- ---------- share_links ----------
-- Aucune policy anon : la lecture publique d'un lien de partage passe
-- exclusivement par le client service_role côté serveur (jamais par la clé
-- anon, publique dans le navigateur) — voir SECURITY_AND_GDPR.md.
-- Les admins gèrent entièrement leurs propres liens.
drop policy if exists "admins manage share links" on public.share_links;
create policy "admins manage share links" on public.share_links
  for all to authenticated
  using (public.is_event_admin(event_id))
  with check (public.is_event_admin(event_id));

-- ---------- guests / guestbook_entries / guestbook_media ----------
-- Aucune policy anon : ces tables contiennent le hash du PIN et les pages
-- privées de chaque invité. Tout accès invité (créer/retrouver sa page,
-- sauvegarder son message, ajouter un média) passe par les Server Actions
-- Next.js qui utilisent la clé service_role après avoir validé le guest_id
-- (même principe que les tokens de share_links). Les mariés, eux, lisent/
-- écrivent tout directement via is_event_admin().
drop policy if exists "admins manage guests" on public.guests;
create policy "admins manage guests" on public.guests
  for all to authenticated
  using (public.is_event_admin(event_id))
  with check (public.is_event_admin(event_id));

drop policy if exists "admins manage guestbook entries" on public.guestbook_entries;
create policy "admins manage guestbook entries" on public.guestbook_entries
  for all to authenticated
  using (public.is_event_admin(event_id))
  with check (public.is_event_admin(event_id));

drop policy if exists "admins manage guestbook media" on public.guestbook_media;
create policy "admins manage guestbook media" on public.guestbook_media
  for all to authenticated
  using (
    exists (
      select 1 from public.guestbook_entries e
      where e.id = entry_id and public.is_event_admin(e.event_id)
    )
  )
  with check (
    exists (
      select 1 from public.guestbook_entries e
      where e.id = entry_id and public.is_event_admin(e.event_id)
    )
  );

-- ---------- destination_options / destination_votes ----------
-- Public et lisible par tous (nécessaire pour l'affichage + Supabase Realtime).
-- Les écritures passent par une Server Action qui valide le guest_id, mais la
-- lecture directe reste ouverte comme pour photo_challenges.
drop policy if exists "destinations readable" on public.destination_options;
create policy "destinations readable" on public.destination_options
  for select to anon, authenticated
  using (
    public.is_event_admin(event_id)
    or exists (select 1 from public.events e where e.id = event_id and e.is_active)
  );

drop policy if exists "admins manage destinations" on public.destination_options;
create policy "admins manage destinations" on public.destination_options
  for all to authenticated
  using (public.is_event_admin(event_id))
  with check (public.is_event_admin(event_id));

drop policy if exists "destination votes readable" on public.destination_votes;
create policy "destination votes readable" on public.destination_votes
  for select to anon, authenticated
  using (
    public.is_event_admin(event_id)
    or exists (select 1 from public.events e where e.id = event_id and e.is_active)
  );

drop policy if exists "admins manage destination votes" on public.destination_votes;
create policy "admins manage destination votes" on public.destination_votes
  for all to authenticated
  using (public.is_event_admin(event_id))
  with check (public.is_event_admin(event_id));

-- Realtime : pousse les changements de vote/options en direct à tous les invités.
do $$
begin
  alter publication supabase_realtime add table public.destination_options;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.destination_votes;
exception when others then null;
end $$;

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
--  5. STOCKAGE (bucket privé guestbook-media)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guestbook-media', 'guestbook-media', false,
  104857600,  -- 100 Mo par fichier
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif',
        'video/mp4','video/quicktime','video/webm',
        'audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Dépôt de médias par les invités (sans compte), dans le dossier d'un événement actif.
drop policy if exists "guests upload guestbook media" on storage.objects;
create policy "guests upload guestbook media" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'guestbook-media'
    and exists (
      select 1 from public.events e
      where e.id::text = split_part(name, '/', 1) and e.is_active
    )
  );

-- Lecture/suppression : admins de l'événement uniquement (les invités relisent
-- leurs propres médias via une URL signée générée par une Server Action).
drop policy if exists "admins read guestbook media" on storage.objects;
create policy "admins read guestbook media" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'guestbook-media'
    and public.is_event_admin( (split_part(name, '/', 1))::uuid )
  );

drop policy if exists "admins delete guestbook media" on storage.objects;
create policy "admins delete guestbook media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'guestbook-media'
    and public.is_event_admin( (split_part(name, '/', 1))::uuid )
  );

-- ============================================================================
--  Note : liens de partage invités (/e/<slug>/album/<token>)
--  Volontairement, aucune policy anon ci-dessus ne donne accès aux photos
--  partagées (share_link_id / visible_to_all) ni aux fichiers du bucket pour
--  ces photos. La page publique du lien lit ces données côté serveur avec la
--  clé service_role (jamais envoyée au navigateur) après avoir vérifié que le
--  token correspond à un share_links actif. Voir SECURITY_AND_GDPR.md.
-- ============================================================================

-- ============================================================================
--  Fin du schéma. Ensuite : exécute supabase/seed.sql pour créer le mariage démo.
-- ============================================================================
