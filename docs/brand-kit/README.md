# KinoBooking — kit de marque v1

Symbole retenu : **J1, « la part gardée »** — un anneau ouvert, et un quart plein soudé à l'anneau.
Logotype : **Kino** en DM Serif Display, **Booking** en DM Sans.

## Contenu

    logo/symbol/            le symbole seul, une couleur par fichier
      symbol-brass.svg        laiton, sur fond encre  (usage principal)
      symbol-ink.svg          encre, sur fond clair
      symbol-paper.svg        papier, sur fond encre
      symbol-black/white.svg  monochrome pur (reçus, tampons, fax)
      symbol-currentcolor.svg hérite de la couleur du texte (icônes en ligne)
      symbol-small-24px-*.svg trait épaissi pour 17–24 px
      symbol-small-16px-*.svg trait épaissi pour 16 px
    logo/lockup-horizontal/ symbole + nom, version par défaut
    logo/lockup-vertical/   quand la largeur manque
    logo/icons/             favicon, icône d'app, avatar WhatsApp 640 px
    brand/tokens.css        variables CSS (couleurs, polices, rayons)
    brand/tokens.json       les mêmes jetons, pour un build ou un thème
    brand/fonts.css         import Google Fonts des deux polices
    code/                   composant React, snippet HTML, snippet <head>
    charte/                 la charte complète (8 pages) + les planches d'exploration

## Règles courtes

- **Une seule couleur** par occurrence du symbole. Jamais de dégradé, jamais d'ombre.
- **Orientation fixe** : part en haut à droite, ouverture en haut à gauche. Le symbole ne pivote pas.
- **Le trait s'épaissit quand la taille baisse** : 9 au-delà de 40 px, 10 à 40 px, 12 à 24 px, 14 à 16 px (grille de 100).
- **Tailles minimales** : symbole 16 px / 6 mm ; verrouillage horizontal 110 px / 30 mm.
- **Zone de protection** : un vide égal au diamètre du symbole tout autour.
- **Laiton clair (#D4AF4F) uniquement sur fond encre.** Sur fond clair, utiliser #94741F.
- **À ne pas faire** : refermer l'anneau, colorer la part différemment de l'anneau, étirer le logotype, remplacer une des deux polices.

## Pour l'imprimeur

Les fichiers de verrouillage contiennent du **texte vivant** (polices DM Serif Display et DM Sans).
Avant d'envoyer à un imprimeur, vectoriser le texte, ou fournir les deux polices avec le fichier.
Le symbole seul est déjà 100 % vectoriel, sans texte.

## Pour Claude Code

Point de départ : `brand/tokens.css` (ou `tokens.json`), `code/KinoBookingLogo.jsx`, `code/head-snippet.html`.
Copier `logo/icons/favicon.svg` et `logo/icons/app-icon-rounded.svg` dans le dossier public de l'app,
puis remplacer tout logo existant par `<KinoBookingLockup />` (`onDark` sur fond encre).
Les règles ci-dessus sont contraignantes : ne pas introduire d'autre couleur ni d'autre police.
