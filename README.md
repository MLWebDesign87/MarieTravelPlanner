# Marie Dream Planner — Site vitrine

Site statique (HTML, CSS, JavaScript vanilla), sans backend ni étape de build.
Paiement, devis et newsletter passent par des services tiers configurables dans un seul fichier.

## Arborescence

```
├── index.html               Page unique : hero, travel planner, étapes, formules, à propos, FAQ, devis
├── merci.html               Confirmation (devis : ?type=devis, paiement Stripe : ?type=paiement)
├── mentions-legales.html    Mentions légales, confidentialité, cookies  ← à compléter
├── cgv.html                 Trame de CGV                                ← à compléter et faire valider
├── 404.html                 Page introuvable
├── robots.txt / sitemap.xml / site.webmanifest
├── .htaccess                HTTPS, www, cache, compression, sécurité (hébergement Apache)
└── assets/
    ├── css/styles.css       Styles (BEM, design tokens en variables CSS)
    ├── js/config.js         ← SEUL fichier de configuration des services
    ├── js/main.js           Navigation, validation, envois (camelCase, commenté)
    ├── fonts/               Gloock + Poppins auto-hébergées (woff2, sous-ensemble latin)
    ├── img/                 Logos (Marie Dream Planner, ML Web Design en SVG), portrait, image de partage
    ├── media/               Photos des formules + vidéo du hero  ← générés par scripts/fetch-media.sh
    └── icons/               Favicons et icônes PWA
scripts/
└── fetch-media.sh           Télécharge et optimise les médias libres de droits (ne pas déployer)
```

## 0. Médias : photos des formules et vidéo du hero

Le dossier `assets/media/` contient pour l'instant des **visuels de remplacement** aux couleurs de la marque. Pour installer les vrais médias, lancer une fois :

```bash
chmod +x scripts/fetch-media.sh
./scripts/fetch-media.sh
```

Prérequis : `curl` et `ffmpeg` (avec libx264, libvpx-vp9, libwebp ; c'est le cas des paquets Debian/Ubuntu et Homebrew).

Le script télécharge trois photos (Unsplash, Pexels) et une vidéo (Mixkit), toutes libres de droits pour un usage commercial. Les sources et licences sont listées en tête du script. Il produit ensuite :
- les photos en WebP 640/960/1280 px plus un JPEG de secours, recadrées en 4:3 ;
- la vidéo en MP4 H.264 et WebM VP9, en 720p, sans piste son ;
- l'image d'attente carrée du disque.

Si un téléchargement échoue, il suffit de récupérer les fichiers à la main depuis les pages indiquées, de les renommer `weekend.jpg`, `escapade.jpg`, `evasion.jpg` et `hero.mp4`, puis de lancer `./scripts/fetch-media.sh --from-dir ~/Téléchargements`.

Pour remplacer un média plus tard, il suffit de déposer le nouveau fichier source et de relancer le script avec `--from-dir`.

**Comportement de la vidéo** (`main.js › initHeroVideo`) :
- elle n'est jamais chargée si le visiteur a activé « réduire les animations » ou l'économie de données ; l'image d'attente s'affiche alors ;
- elle est muette et se met en pause hors écran ;
- un bouton pause/lecture est proposé, comme l'exige le critère WCAG 2.2.2 pour une animation de plus de 5 secondes.

## Lancer en local

Les pages secondaires utilisent des chemins absolus (`/assets/…`) : passez par un petit serveur plutôt que d'ouvrir le fichier directement.

```bash
python3 -m http.server 8080      # ou : npx serve .
# puis http://localhost:8080
```

## 1. Remplacer le domaine

Rechercher/remplacer `https://www.mariedreamplanner.fr` dans tout le projet (balises canonical, Open Graph, JSON-LD, sitemap, robots, .htaccess, redirection du formulaire).

## 2. Paiement — Stripe Payment Links

1. Dashboard Stripe › **Paramètres › Informations publiques** : renseigner l'URL des CGV (`https://www.mariedreamplanner.fr/cgv.html`). C'est un prérequis pour l'étape 4.
2. **Catalogue de produits** : créer les 3 produits (Week-end 79 €, Escapade 169 €, Évasion 299 €) et un produit « Voyageur supplémentaire » à 10 €.
3. **Liens de paiement** › créer un lien par formule. Ajouter la ligne « Voyageur supplémentaire » avec une quantité ajustable par le client (vérifier dans le dashboard que le minimum peut être réglé à 0).
4. Dans chaque lien, recueillir **deux consentements distincts** (exigés par le droit de la consommation, cf. CGV art. 6 et 9) :
   - **Exiger l'acceptation des conditions d'utilisation** (case à cocher Stripe), avec le texte personnalisé : `J'accepte les [conditions générales de vente](https://www.mariedreamplanner.fr/cgv.html).`
   - **Champ personnalisé** de type *liste déroulante*, obligatoire, libellé `Démarrage de la prestation`, avec deux options :
     - `Démarrer sans attendre : je perds la rétractation une fois le carnet livré`
     - `Attendre la fin du délai de rétractation de 14 jours`

     Stripe limite la longueur des libellés : raccourcir si le dashboard l'exige, sans perdre les deux idées (demande de démarrage + perte du droit à la livraison).
   - **Texte personnalisé au-dessus du bouton de paiement** :
     `Vous disposez de 14 jours pour vous rétracter. Si vous demandez que la prestation démarre sans attendre, vous reconnaissez perdre ce droit une fois votre carnet de voyage livré ; en cas de rétractation avant, seule la part déjà réalisée reste due. Détails dans nos CGV.`
5. Onglet **Après le paiement** : rediriger vers `https://www.mariedreamplanner.fr/merci.html?type=paiement`.
6. Coller les 3 URL `https://buy.stripe.com/…` dans `assets/js/config.js` › `stripePaymentLinks`.

Le choix « Démarrage de la prestation » est enregistré sur chaque paiement dans Stripe : c'est la preuve de la demande expresse du client. **Si le client choisit d'attendre, Marie ne commence qu'au 15e jour.**

Tant qu'un lien est vide, le bouton « Réserver » renvoie vers le formulaire de devis avec la formule présélectionnée (un avertissement apparaît dans la console).

## 3. Demande de devis — Web3Forms

1. Créer une clé d'accès sur https://web3forms.com avec l'adresse e-mail de Marie.
2. La coller dans `config.js` › `web3formsAccessKey`.
3. Optionnel (fonctionnement sans JavaScript) : la coller aussi dans l'attribut `value` du champ caché `access_key` de `index.html`.

Les attributs `name` des champs sont en français : ce sont eux qui servent d'intitulés dans l'e-mail reçu. L'objet de l'e-mail est généré automatiquement (« Demande de devis — Escapade — Julie Martin »). Un champ pot de miel (`botcheck`) filtre les robots.

## 4. Newsletter — Brevo

1. Brevo › **Contacts** › **Formulaires** › créer un formulaire d'inscription relié à une liste. Activer la **double confirmation (double opt-in)**, recommandée pour le RGPD.
2. Dans le code HTML d'intégration fourni par Brevo, copier l'URL de l'attribut `action` du `<form>` (`https://xxxx.sibforms.com/serve/…`).
3. La coller dans `config.js` › `brevoFormUrl`.

Le formulaire envoie `EMAIL`, `OPT_IN`, `locale` et le pot de miel `email_address_check`, attendus par Brevo. Si l'envoi en arrière-plan échoue, le script bascule sur une soumission classique dans un nouvel onglet.

## 5. Déploiement

- **Apache (OVH, o2switch, Hostinger…)** : envoyer le dossier tel quel. Le `.htaccess` force HTTPS et `www`, gère la 404, le cache, la compression et les en-têtes de sécurité (CSP limitée à Web3Forms et Brevo). Si vous ajoutez un service (analytics…), complétez la CSP.
- **Netlify / Cloudflare Pages / Vercel** : glisser-déposer le dossier. Le `.htaccess` est ignoré ; reporter si besoin les en-têtes dans un fichier `_headers`.

Pour forcer la mise à jour des CSS/JS mis en cache un an, versionner leur URL dans le HTML (`styles.css?v=2`).

## 6. SEO — après la mise en ligne

1. **Google Search Console** : valider le domaine, soumettre `sitemap.xml`, demander l'indexation de la page d'accueil.
2. **Fiche d'établissement Google** (Google Business Profile) : la créer en tant qu'**entreprise de zone de service** (adresse masquée si Marie travaille de chez elle), catégorie proche de « conseiller en voyages », zone desservie : Cannes et Alpes-Maritimes. C'est le levier principal pour « travel planner Cannes ». Ensuite, ajouter son URL dans le JSON-LD de `index.html` sous `"sameAs"`.
3. Récolter des **avis Google** après chaque voyage : ils pèsent fortement dans le classement local.
4. Ajouter le vrai lien Instagram (pied de page) et l'inscrire aussi dans `"sameAs"`.
5. Tester les données structurées avec le **test des résultats enrichis** de Google, et les performances avec PageSpeed Insights.

Déjà en place : title et meta description ciblés (« travel planner à Cannes », « voyage sur mesure »), Cannes intégrée naturellement dans le hero, la présentation, la FAQ et le pied de page, JSON-LD `ProfessionalService` avec localité (Cannes, Alpes-Maritimes) et zone desservie, les 3 offres et leurs prix, `Person`, `FAQPage`, `WebSite`. Également : un seul H1, canonical, Open Graph, images responsives WebP, polices préchargées, sitemap, pages légales en `noindex`.

## 7. Conformité juridique — à faire avant la mise en ligne

Les CGV (`cgv.html`) sont rédigées pour une prestation de conseil vendue en ligne à des consommateurs. Les champs **surlignés en jaune** sont à compléter. Points clés :

- **Statut** : prestation de conseil, sans vente de voyage, sans réservation pour le client, sans encaissement de fonds destinés aux prestataires. C'est ce qui permet de ne pas être immatriculé chez Atout France (réponse ministérielle n° 10480, JO AN du 5 mai 2026). **Si Marie se met un jour à réserver ou encaisser pour ses clients, ce cadre ne tient plus** : il faudra s'immatriculer.
- **Médiateur de la consommation** : obligatoire. En choisir un sur la liste officielle (economie.gouv.fr/mediation-conso), signer la convention, puis renseigner ses coordonnées dans les CGV (art. 17). Ne plus mentionner la plateforme européenne RLL, fermée depuis le 20 juillet 2025.
- **Confirmation de commande sur support durable** : le reçu Stripe ne suffit pas. Après chaque paiement, envoyer l'e-mail ci-dessous, avec `cgv.html` en PDF (impression navigateur > PDF).
- **Archivage** : conserver 10 ans les commandes de 120 € et plus (Escapade et Évasion).
- **Assurance RC professionnelle** : non obligatoire pour cette activité, mais fortement recommandée.
- **Relecture par un avocat** : recommandée, notamment pour la grille de rétractation (art. 9.3) et les délais (art. 8).

### Modèle d'e-mail de confirmation de commande

```
Objet : Confirmation de votre commande — Formule [Escapade]

Bonjour [Prénom],

Merci pour votre confiance ! Voici le récapitulatif de votre commande :
- Prestation : formule [Escapade], organisation de voyage sur mesure
- Voyageurs : [2]
- Prix payé : [169] € [TVA non applicable, art. 293 B du CGI]
- Date de commande : [jj/mm/aaaa]

Démarrage de la prestation : [vous avez demandé que je commence sans attendre
la fin du délai de rétractation de 14 jours. Vous perdrez ce droit à la remise
de votre carnet ; en cas de rétractation avant, seule la part déjà réalisée
restera due.]
OU [conformément à votre choix, je commencerai à l'issue du délai de
rétractation de 14 jours, le [date].]

Vous trouverez en pièce jointe nos conditions générales de vente, qui
contiennent le formulaire de rétractation (annexe).

Pour démarrer, pouvez-vous me décrire votre projet : destination, dates,
voyageurs, budget, envies ?

À très vite,
Marie — Marie Dream Planner
```

## Crédit ML Web Design

Le pied de page de toutes les pages affiche « Site conçu par ML Web Design » avec le logo (`assets/img/ml-web-design.svg`, conservé en vectoriel : 4 Ko, net sur écran Retina). Le crédit apparaît aussi dans les mentions légales et dans les données structurées (`creator` du `WebSite`). Pour le rendre cliquable vers votre site, remplacer dans chaque page HTML le `<p class="credit">` par `<a class="credit" href="https://votre-site" rel="noopener">`.

## Animations

Volontairement rares, toutes désactivées si le visiteur préfère réduire les animations :
- **Hero** : le titre monte ligne par ligne, puis le disque solaire se lève (CSS pur, pas de clignotement en attendant le JavaScript).
- **Bandeau des continents** : défilement lent et continu, qui se met en pause au survol.
- **Étapes** : un avion parcourt la ligne de vol et allume les pastilles à son passage. Il ne se déclenche qu'une fois, et sa fin est mesurée en JavaScript pour tomber juste quelle que soit la largeur d'écran.
- **Interactions** : zoom lent des photos au survol, ouverture animée des questions de la FAQ (navigateurs compatibles), retour visuel sur les boutons.

## Qualité : résultats d'audit

Mesurés le 23/10/2026 avec les médias en place, sur un serveur local (donc sans cache ni compression, que le `.htaccess` ajoute en production) :

| Audit | Mobile | Desktop |
|---|---|---|
| Lighthouse Performance | 97 | 100 |
| Lighthouse Accessibilité | 100 | 100 |
| Lighthouse Bonnes pratiques | 100 | 100 |
| Lighthouse SEO | 100 | 100 |
| LCP / TBT / CLS | 2,3 s / 60 ms / 0 | 0,6 s / 0 ms / 0 |
| axe-core (WCAG 2.2 AA + bonnes pratiques), 5 pages | 0 violation | 0 violation |

Pour relancer après modification : `npx lighthouse https://www.mariedreamplanner.fr/ --view`, et l'extension axe DevTools pour l'accessibilité.

Optimisations notables :
- **Images** : l'image d'attente du hero est responsive (640/960/1280 px), préchargée et prioritaire. L'emblème est servi aux tailles réellement affichées (1x/2x).
- **Rendu** : le grain du hero est un calque statique, sans mode de fusion, ce qui a fait passer le temps de blocage mobile de 320 à 60 ms.
- **JavaScript** : la ligne de vol n'est mesurée qu'à l'arrivée de la section, donc pas de recalcul de mise en page au chargement.

## Conventions de code

- **CSS** : méthode BEM (`bloc__element--modificateur`), variables CSS en kebab-case, sommaire numéroté en tête de fichier.
- **JavaScript** : camelCase, fonctions `initXxx()` indépendantes, JSDoc, aucune dépendance.
- **HTML** : identifiants en camelCase, validé avec `html-validate` (0 erreur).
- **Accessibilité** : lien d'évitement, focus visible, menu mobile au clavier (Échap), erreurs reliées aux champs (`aria-describedby`, `aria-invalid`), zones `aria-live`, animations désactivées si `prefers-reduced-motion`.

## Reste à fournir par la cliente

- [ ] Domaine définitif
- [ ] Liens Stripe (avec les deux consentements), clé Web3Forms, URL Brevo
- [ ] Informations légales : nom, SIRET, adresse, téléphone, hébergeur, régime de TVA
- [ ] Médiateur de la consommation désigné
- [ ] Délais de remise par formule, nombre de modifications incluses, grille de rétractation
- [ ] Politique d'affiliation (liens commissionnés ou non), CGV art. 12
- [ ] Lien Instagram et fiche Google Business Profile
