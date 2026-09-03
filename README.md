# Éclats — plateforme photos de mariage

Une plateforme simple, belle et sûre pour que **vos invités partagent leurs photos**
via un **QR code**, et pour jouer à la **roulette photo** (30 défis).
Côté organisateurs, un **espace admin privé** (toi + Charlie) permet de voir,
filtrer et télécharger toutes les photos, et d'activer le jeu au bon moment.

Pensée pour être **réutilisable pour d'autres mariages** : chaque mariage a son
propre lien, ses couleurs et ses défis.

- 📱 **Invités** : aucun compte, aucune app à installer. Ils scannent, déposent, jouent.
- 🔒 **Sûr** : stockage privé, liens temporaires signés, règles d'accès en base (RLS).
- 🛠️ **Stack** : Next.js 14 + TypeScript + Tailwind + Supabase (base de données + stockage + authentification).

---

## ⏱️ En résumé (ce que tu vas faire)

1. Créer un projet **Supabase** (gratuit).
2. Coller `supabase/schema.sql` puis `supabase/seed.sql` dans Supabase.
3. Copier 2 clés depuis Supabase.
4. Déployer sur **Vercel** (gratuit) en collant ces clés.
5. Régler 2 URLs dans Supabase (authentification).
6. Te déclarer **admin** avec une petite requête SQL.
7. Récupérer ton **QR code** depuis l'espace admin. 🎉

Compte ~30–45 minutes la première fois. Ensuite, ajouter un nouveau mariage prend 5 minutes.

---

## 0. Prérequis

Trois comptes gratuits :

- **GitHub** (pour héberger le code) — https://github.com
- **Supabase** (base de données + stockage + auth) — https://supabase.com
- **Vercel** (mise en ligne du site) — https://vercel.com

Et le code de ce projet sur ton ordinateur ou dans un dépôt GitHub (voir la
section « Mettre le code sur GitHub » plus bas si besoin).

---

## 1. Créer le projet Supabase

1. Va sur https://supabase.com → **New project**.
2. Donne un nom (ex. `mariage-photos`), choisis une région proche (ex. *Frankfurt*
   ou *Paris*), et **note bien le mot de passe** de la base (tu n'en auras pas
   besoin pour l'app, mais Supabase le demande).
3. Attends ~1 minute que le projet soit prêt.

---

## 2. Créer les tables et les règles de sécurité

> **Fichier concerné : `supabase/schema.sql`**

1. Dans Supabase, menu de gauche : **SQL Editor** → **New query**.
2. Ouvre le fichier `supabase/schema.sql` de ce projet, **copie tout son contenu**.
3. Colle-le dans l'éditeur SQL, puis clique **Run** (en bas à droite).
4. Tu dois voir « Success. No rows returned ». ✅

Cette étape crée les tables (`events`, `event_admins`, `photo_challenges`,
`guest_uploads`), les règles d'accès (RLS) et le **bucket de stockage privé**
`wedding-media`.

### Puis les données de démo (le mariage « Amaury & Charlie » + les 30 défis)

> **Fichier concerné : `supabase/seed.sql`**

1. Toujours dans **SQL Editor** → **New query**.
2. Copie tout le contenu de `supabase/seed.sql`, colle, **Run**.

Ça crée un mariage de démonstration avec le slug `amaury-charlie` et tes 30 défis
(le défi ultime se débloque après 10 défis réalisés).

---

## 3. Récupérer les 2 clés Supabase

1. Dans Supabase : **Project Settings** (roue crantée) → **API**.
2. Note ces deux valeurs :
   - **Project URL** → ex. `https://abcdefgh.supabase.co`
   - **Project API keys → `anon` `public`** → une longue chaîne.

> ⚠️ N'utilise **jamais** la clé `service_role` dans ce projet. On n'en a pas besoin :
> toute la sécurité passe par les règles RLS.

---

## 4. (Optionnel) Tester en local sur ton ordinateur

Si tu veux voir le site tourner chez toi avant de déployer :

1. Copie le fichier `.env.example` en `.env.local`.
2. Remplis-le :

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ta_cle_anon
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. Dans un terminal, à la racine du projet :

   ```bash
   npm install
   npm run dev
   ```

4. Ouvre http://localhost:3000/e/amaury-charlie → la page invités. 🎉

---

## 5. Mettre le code sur GitHub (si ce n'est pas déjà fait)

1. Crée un dépôt vide sur https://github.com/new (ex. `mariage-photos`).
2. À la racine du projet :

   ```bash
   git init
   git add .
   git commit -m "Éclats — plateforme photos de mariage"
   git branch -M main
   git remote add origin https://github.com/TON-COMPTE/mariage-photos.git
   git push -u origin main
   ```

> Le fichier `.gitignore` empêche déjà d'envoyer tes clés (`.env.local`) sur GitHub.

---

## 6. Déployer sur Vercel

1. Va sur https://vercel.com → **Add New… → Project** → importe ton dépôt GitHub.
2. Vercel détecte Next.js tout seul. Avant de cliquer **Deploy**, ouvre
   **Environment Variables** et ajoute :

   | Nom | Valeur |
   |-----|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | ton Project URL Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ta clé `anon public` |
   | `NEXT_PUBLIC_SITE_URL` | *(laisse vide pour l'instant, on revient après)* |

3. Clique **Deploy**. Au bout d'1–2 minutes, tu obtiens une URL du type
   `https://mariage-photos.vercel.app`.
4. **Reviens dans Vercel → Settings → Environment Variables**, mets
   `NEXT_PUBLIC_SITE_URL` = ton URL Vercel exacte (ex.
   `https://mariage-photos.vercel.app`), puis **redeploy** (onglet Deployments →
   ⋯ → Redeploy). Cette variable sert à générer les liens et le QR code.

---

## 7. Régler l'authentification admin dans Supabase

Pour que le lien de connexion admin (par e-mail) fonctionne :

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL** : mets ton URL Vercel (ex. `https://mariage-photos.vercel.app`).
3. **Redirect URLs** : ajoute :
   - `https://mariage-photos.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` *(si tu testes aussi en local)*
4. Enregistre.

---

## 8. Créer ton accès admin (toi + Charlie)

1. Va sur `https://TON-SITE.vercel.app/admin` → tu es redirigé vers la connexion.
2. Entre **ton e-mail** → tu reçois un lien magique → clique dessus.
   (Tu es maintenant un utilisateur connu de Supabase, mais **pas encore** relié
   au mariage.)
3. Répète pour Charlie avec **son e-mail**.
4. Dans Supabase → **SQL Editor** → **New query**, exécute (en remplaçant les e-mails) :

   ```sql
   insert into public.event_admins (event_id, user_id, role)
   select e.id, u.id, 'owner'
   from public.events e, auth.users u
   where e.slug = 'amaury-charlie'
     and u.email in ('ton.email@exemple.com', 'email.de.charlie@exemple.com')
   on conflict do nothing;
   ```

5. Recharge `https://TON-SITE.vercel.app/admin` → le mariage apparaît. ✅

---

## 9. Récupérer le QR code

1. Dans l'espace admin, ouvre le mariage.
2. La carte **« QR code invités »** affiche le QR + le lien.
   Clique **⬇ Télécharger** pour l'imprimer (menus, chevalets, panneaux…).

Le QR pointe vers `https://TON-SITE.vercel.app/e/amaury-charlie`.

---

## 🔁 Créer un autre mariage (réutilisation)

Dans Supabase → **SQL Editor**, exécute (adapte les valeurs) :

```sql
insert into public.events (slug, couple_names, event_date, place, welcome_message, color_primary, color_accent, game_active)
values ('julie-thomas', 'Julie & Thomas', '2027-09-04', 'Château de … · France',
        'Partagez vos plus beaux moments avec nous !',
        '#4f6152', '#b08748', false);
```

Puis relie l'admin comme à l'**étape 8** (en changeant le `slug`), ajoute des défis
depuis l'espace admin (section « Défis »), et le nouveau lien est
`https://TON-SITE.vercel.app/e/julie-thomas`.

---

## 🎨 Personnaliser

- **Couleurs** : `color_primary` (boutons, sauge) et `color_accent` (jeu, champagne)
  dans la table `events`. Toute couleur hex fonctionne.
- **Message d'accueil / lieu / date** : colonnes `welcome_message`, `place`,
  `event_date` de la table `events`.
- **Défis** : directement dans l'espace admin (ajouter / activer / supprimer),
  ou en modifiant `supabase/seed.sql`.
- **Nom du produit / logo** : le mot « Éclats » se change dans le code
  (`src/components/BrandBar.tsx` et les en-têtes des pages).

---

## 🔒 Sécurité & RGPD (résumé)

- Le bucket `wedding-media` est **privé**. Les invités peuvent **déposer** mais
  **jamais lister ni voir** les photos des autres.
- Les admins accèdent aux photos via des **URLs signées temporaires** (2 h).
- Les règles **RLS** (dans `supabase/schema.sql`) isolent chaque mariage : un
  admin ne voit que **ses** mariages.
- Aucune reconnaissance faciale n'est activée (voir `ROADMAP` dans
  `IMPLEMENTATION_STATUS.md` — prévue en v2 avec consentement explicite).
- Détails complets : `SECURITY_AND_GDPR.md`.

---

## 🩺 Dépannage

- **« Ce mariage est introuvable »** → le `slug` dans l'URL ne correspond à aucun
  événement `is_active = true`. Vérifie la table `events`.
- **La connexion admin ne marche pas** → vérifie l'étape 7 (Site URL + Redirect
  URLs) et que `NEXT_PUBLIC_SITE_URL` est bien ton URL Vercel.
- **« Aucun mariage lié à ce compte »** → l'étape 8 (insertion dans
  `event_admins`) n'a pas été faite avec le bon e-mail.
- **Un upload échoue** → vérifie que l'événement est `is_active = true` et que le
  fichier respecte les formats/taille (100 Mo max) définis dans `schema.sql`.

---

Fait avec soin pour votre journée. 💍
