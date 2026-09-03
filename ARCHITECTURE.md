# Architecture — Éclats

## Vue d'ensemble

Application **Next.js 14 (App Router)** déployée sur **Vercel**, adossée à
**Supabase** (PostgreSQL + Storage + Auth). Aucun serveur à gérer :
les invités déposent leurs médias **directement** dans le stockage Supabase
depuis le navigateur, protégés par des règles d'accès en base (RLS).

```
Invité (téléphone)                         Organisateur (admin)
   │  scan QR                                   │  lien magique e-mail
   ▼                                            ▼
/e/<slug>  ──►  upload direct  ──►  Supabase Storage (bucket privé)
   │                                   ▲   │
   │  insert                           │   │  URLs signées (2 h)
   ▼                                   │   ▼
guest_uploads (Postgres) ◄─ RLS ──►  /admin/<slug> (galerie, jeu, défis)
```

## Arborescence du code

```
src/
├─ app/
│  ├─ page.tsx                 Vitrine (racine)
│  ├─ layout.tsx               Layout global + polices Google Fonts
│  ├─ globals.css              Jetons de couleur (thème clair/sombre) + composants
│  ├─ e/[slug]/                ESPACE INVITÉS (public, sans compte)
│  │  ├─ layout.tsx            Charge le mariage + applique ses couleurs
│  │  ├─ page.tsx             Accueil : prénom + actions
│  │  ├─ partager/page.tsx    Upload de photos/vidéos
│  │  ├─ jeu/page.tsx         Roulette photo (30 défis)
│  │  └─ not-found.tsx        Lien invalide
│  ├─ admin/                   ESPACE ORGANISATEURS (protégé)
│  │  ├─ login/page.tsx       Connexion par lien magique
│  │  ├─ page.tsx             Liste des mariages de l'utilisateur
│  │  └─ [slug]/page.tsx      Galerie + stats + jeu + défis
│  └─ auth/callback/route.ts   Échange du code de connexion
├─ components/
│  ├─ guest/                   NameGate, Uploader, Roulette, GuestGreeting
│  ├─ admin/                   GameToggle, QrCard, AdminGallery, ChallengesManager
│  ├─ BrandBar.tsx / ThemeToggle.tsx
├─ lib/
│  ├─ supabase/{client,server,middleware}.ts   Clients Supabase (SSR)
│  ├─ events.ts               Lecture des événements/défis (serveur)
│  ├─ types.ts, env.ts, format.ts, useGuestName.ts
└─ middleware.ts              Rafraîchit la session + protège /admin
```

## Décisions clés

- **Upload direct navigateur → Storage** : pas de passage par un serveur, donc
  rapide et scalable. La confirmation n'est affichée qu'**après** l'enregistrement
  réel (upload résolu **puis** ligne insérée dans `guest_uploads`).
- **Compression côté client** des images (`browser-image-compression`,
  max 2560 px / ~3 Mo) pour des envois rapides même en 4G. Les vidéos passent telles quelles.
- **Multi-mariages** : une ligne dans `events` = un mariage, avec son `slug`, ses
  couleurs et ses défis. L'app est réutilisable sans redéploiement.
- **Thème par événement** : les couleurs (`color_primary`, `color_accent`) sont
  injectées en CSS variables ; les teintes s'adaptent au mode clair/sombre via `color-mix`.
- **Auth admin sans mot de passe** : lien magique (OTP e-mail) Supabase.
- **Sécurité en base, pas dans l'UI** : toutes les autorisations sont des
  politiques RLS PostgreSQL (voir `supabase/schema.sql`).

## Modèle de données (résumé)

| Table | Rôle |
|-------|------|
| `events` | Un mariage : slug, noms, date, lieu, couleurs, `game_active`, `is_active` |
| `event_admins` | Qui administre quel mariage (`user_id` ↔ `event_id`) |
| `photo_challenges` | Défis : `label`, `sort_order`, `unlock_threshold`, `is_active` |
| `guest_uploads` | Chaque média : `storage_path`, `guest_name`, `kind`, `challenge_id` |

Bucket de stockage : `wedding-media` (privé). Chemin d'un média :
`<event_id>/<identifiant>-photo.jpg`.
