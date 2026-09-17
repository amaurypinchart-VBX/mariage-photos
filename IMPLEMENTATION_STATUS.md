# État d'avancement — Éclats

Dernière mise à jour : première version livrée.

## ✅ Terminé et vérifié (build de production OK)

- Structure Next.js 14 + TypeScript + Tailwind, `npm run build` passe (lint + types).
- **Espace invités** (priorité n°1) :
  - Accueil par mariage `/e/<slug>` : couverture, noms, date, lieu, message, saisie du prénom.
  - Upload photos **et** vidéos : sélection multiple, appareil photo, compression
    des images côté client, statut par fichier, **confirmation uniquement après
    enregistrement serveur**, réessai en cas d'échec.
  - **Roulette photo** : 30 défis, tirage aléatoire, progression, prise de photo
    liée au défi, **défi ultime déverrouillé après 10 défis**, confettis.
  - Thème clair/sombre, couleurs personnalisables par mariage.
- **Espace admin** :
  - Connexion par lien magique (sans mot de passe).
  - Liste des mariages de l'utilisateur.
  - Statistiques (photos, vidéos, invités).
  - Galerie avec **URLs signées**, filtres par invité et par défi, sélection
    multiple, téléchargement à l'unité ou en lot (ZIP, ou partage natif sur
    mobile).
  - **Activation/désactivation de la roulette** en un clic.
  - Gestion des défis (ajouter / activer / supprimer).
  - **Liens de partage nommés** (Famille, Amis, Tout…) : création/désactivation/
    suppression, assignation de la visibilité par photo (un lien précis, « Tout »
    de façon cumulative, ou non partagée).
  - QR code généré + téléchargeable.
- **Galerie invités** : chaque lien de partage ouvre une page publique
  `/e/<slug>/album/<token>` montrant uniquement les photos qui lui sont
  destinées, avec sélection multiple + téléchargement (ZIP sur ordinateur,
  partage natif vers la galerie sur mobile). Remplace l'ancien champ booléen
  `gallery_public` (laissé inutilisé en base) par un système multi-liens.
- **Base de données** : schéma complet, **RLS**, bucket privé + policies, données de démo.
- Documentation : `README.md`, `ARCHITECTURE.md`, `SECURITY_AND_GDPR.md`.

## 🧪 Terminé mais à vérifier en conditions réelles

- Test de bout en bout avec un **vrai** projet Supabase (upload d'un invité →
  visible dans l'admin). Le build et la logique sont validés ; il reste à faire
  l'essai en ligne après ton déploiement.
- Comportement HEIC (photos iPhone) : la compression convertit en JPEG ;
  à confirmer sur quelques modèles.

## 🚧 Simulé / non inclus dans cette v1 (par choix)

- **Tri par IA** (regrouper la même personne, hommes/femmes/enfants) : **non
  inclus**. Nécessite de la reconnaissance faciale (donnée biométrique) →
  consentement RGPD explicite. Fondations prêtes, à activer en v2.

## 🗺️ Prochaines étapes proposées (roadmap)

1. Test en ligne complet + petits ajustements visuels selon ton retour.
2. Tri IA **simple** (sans visages) : photos de groupe, extérieur/intérieur,
   moment de danse, détection de doublons — via un service d'IA à clé.
3. Modération : masquer/supprimer en un clic, signalement.
4. v2 sensible : regroupement facial **avec** case de consentement biométrique.
5. Diaporama en soirée / mur de photos (affichage plein écran, différent des
   liens de partage individuels).
6. Multi-langue (FR/EN/NL) pour les invités internationaux.
