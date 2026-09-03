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

## Règles RLS (dans `supabase/schema.sql`)

- `events` : lecture publique si `is_active`, écriture réservée aux admins.
- `guest_uploads` : `insert` autorisé aux invités si l'événement est actif ;
  `select`/`delete` réservés aux admins.
- `photo_challenges` : lecture publique (défis actifs), écriture admin.
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
- Ne partage jamais la clé `service_role`. L'app n'en utilise pas.
