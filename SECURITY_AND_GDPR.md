# Sécurité & RGPD — Éclats

## Principes

1. **Stockage privé.** Le bucket `wedding-media` est privé (`public = false`).
   Personne ne peut deviner une URL et voir les photos.
2. **Dépôt sans lecture.** Un invité (rôle `anon`) peut **insérer** un média dans
   un événement **actif**, mais ne peut **jamais lister ni lire** les médias.
3. **Lecture réservée aux admins.** Seuls les membres de `event_admins` du mariage
   concerné peuvent lire les photos, via des **URLs signées temporaires** (2 h).
4. **Isolation entre mariages.** Les politiques RLS filtrent par événement : un
   admin d'un mariage n'accède pas aux données d'un autre.
5. **Liens de partage = jeton porteur.** Un lien `/e/<slug>/album/<token>`
   (Famille, Amis, Tout…) n'est protégé par **aucune règle RLS anon** : le
   `token` (aléatoire, 32 caractères) est lui-même le secret d'accès. La page
   qui le sert est un composant **serveur** qui (a) vérifie que le token
   correspond à un `share_links` actif de l'événement demandé, puis (b) lit les
   photos correspondantes et génère leurs URLs signées avec la clé
   **`service_role`** (voir ci-dessous). Rien de tout cela ne passe par la clé
   `anon`, publique dans le navigateur — sans quoi n'importe qui pourrait lister
   toutes les photos partagées de tous les mariages sans connaître aucun lien.

## Règles RLS (dans `supabase/schema.sql`)

- `events` : lecture publique si `is_active`, écriture réservée aux admins.
- `guest_uploads` : `insert` autorisé aux invités si l'événement est actif ;
  `select`/`delete` réservés aux admins.
- `photo_challenges` : lecture publique (défis actifs), écriture admin.
- `share_links` : lecture/écriture réservées aux admins (`is_event_admin`).
  Aucune policy anon — la lecture publique d'un lien passe par `service_role`
  côté serveur (voir « Liens de partage » ci-dessus).
- `storage.objects` (bucket `wedding-media`) : `insert` invité si l'événement
  (1er segment du chemin) est actif ; `select`/`delete` admin uniquement.
- Fonction `is_event_admin(event uuid)` (`SECURITY DEFINER`) pour éviter la
  récursion RLS.

## Limites d'upload

- **Taille** : 100 Mo par fichier (`file_size_limit`).
- **Formats autorisés** : JPEG, PNG, WebP, HEIC/HEIF, GIF, MP4, MOV, WebM
  (`allowed_mime_types`). Validés côté Storage.

## RGPD — points d'attention

- **Finalité** : partage privé de souvenirs entre les mariés et leurs invités.
- **Minimisation** : on ne collecte qu'un **prénom libre** (facultatif) et le média.
  Aucun compte invité, aucun e-mail invité, aucun tracker.
- **Consentement** : la page d'accueil indique clairement « Tes photos ne sont
  visibles que par les mariés ». À adapter selon ton contexte.
- **Conservation / suppression** : les admins peuvent supprimer un média (photo +
  fichier). Pour une purge complète après le mariage, supprimer l'événement
  (`delete from events …`) supprime en cascade uploads et défis ; pense aussi à
  vider le dossier correspondant dans le Storage.
- **Reconnaissance faciale** : **désactivée**. Le tri « même personne / hommes /
  femmes / enfants » relève de données biométriques et nécessitera un
  **consentement explicite** et une base légale claire. Prévu en v2 (isolé).

## Recommandations d'exploitation

- Garde le lien invité **peu devinable** (le slug fait office de secret léger) ;
  pour plus de discrétion, utilise un slug long/aléatoire.
- Fais une **sauvegarde** des photos après le mariage (téléchargement depuis
  l'admin ou export depuis le dashboard Supabase Storage).
- La clé `service_role` (utilisée pour les liens de partage, voir plus haut) est
  **secrète** : ne la mets que dans `SUPABASE_SERVICE_ROLE_KEY` (jamais dans une
  variable `NEXT_PUBLIC_*`, jamais commit, jamais partagée), en local ou dans les
  variables d'environnement Vercel. Elle n'est utilisée que dans le code serveur
  (`src/lib/supabase/admin.ts`), jamais côté navigateur.
- Chaque lien de partage donne accès à toutes les photos qui lui sont
  assignées, sans autre vérification que la possession du lien : traite-le
  comme tu traiterais un mot de passe partagé (ne le publie pas sur un canal
  public), et désactive-le (bouton « Inactif » dans l'admin) quand il n'est
  plus utile.
