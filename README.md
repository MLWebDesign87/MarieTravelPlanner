# Marie Dream Planner — Site vitrine

Site statique (HTML, CSS, JavaScript vanilla), sans backend ni étape de build.
Paiement, devis et newsletter passent par des services tiers configurables dans un seul fichier.

## Arborescence

```
├── index.html               Page unique : hero, travel planner, étapes, formules, à propos, FAQ, devis
├── merci.html               Confirmation après l'envoi d'une demande de devis
├── outils/documents.html    Outil privé de Marie : devis et factures Word (non indexé)
├── outils/modeles/          Modèles Word devis.docx et facture.docx
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
    ├── media/               Illustrations des formules + animation du hero (créations originales)
    └── icons/               Favicons et icônes PWA
scripts/                     Outils de production (non déployés, bloqués par .htaccess)
├── documents/               Générateur des modèles Word (build-templates.js)
├── art/                     Générateurs des illustrations et de l'animation (build-art.sh)
└── fetch-media.sh           Option : remplacer par des photos/vidéo libres de droits
```

## 0. Médias : illustrations et vidéo d'accueil

Les visuels sont des **créations originales**, déjà en place dans `assets/media/`. Il n'y a donc aucune licence à gérer.

- **Formules** : trois illustrations vectorielles « papier découpé » dans la palette du logo : Amsterdam (Week-end), New York (Escapade) et la Polynésie (Évasion). Elles sont en WebP 640/960/1280 px plus un JPEG de secours, de 13 à 31 Ko chacune.
- **Accueil** : une animation de 12 s qui boucle sans à-coup : coucher de soleil, vagues, palmiers, oiseaux, reflets. Elle est carrée, en 960 px, et pèse 460 Ko en MP4 et 380 Ko en WebM, sans piste son. Chaque mouvement est périodique sur 12 s, et l'écart entre la dernière et la première image est inférieur à 0,01 px.

**Modifier ou régénérer les visuels** (`scripts/art/`) :

```bash
pip install playwright pillow && playwright install chromium   # une seule fois
./scripts/art/build-art.sh                                     # ≈ 2 minutes
```

- `illus.py` : les trois scènes. Couleurs, positions et éléments sont paramétrés dans chaque fonction `sceneXxx()`.
- `video.py` : l'animation. Vitesse des vagues, oscillation des palmes et trajectoire des oiseaux sont réglables dans `frameSvg()`.
- Les rendus intermédiaires vont dans `scripts/art/build/`. Ce dossier n'est pas à déployer et il est ignoré par Git.

**Comportement de la vidéo** (`main.js › initHeroVideo`) :
- elle n'est jamais chargée si le visiteur a activé « réduire les animations » ou l'économie de données ; l'image d'attente, qui est la première image de la boucle, reste alors affichée ;
- elle apparaît en fondu et se met en pause hors écran ;
- un bouton pause/lecture est proposé, comme l'exige le critère WCAG 2.2.2.

**Préférer de vraies photos ?** `scripts/fetch-media.sh` télécharge des photos et une vidéo libres de droits sélectionnées (Unsplash, Pexels, Mixkit ; sources et licences en tête du script) et remplace les illustrations. Pensez alors à rétablir les crédits photo dans `mentions-legales.html`.

## 1. Remplacer le domaine

Rechercher/remplacer `https://www.mariedreamplanner.fr` dans tout le projet (balises canonical, Open Graph, JSON-LD, sitemap, robots, .htaccess, redirection du formulaire).

## 2. Paiement par virement et outil devis / factures

**Il n'y a pas de paiement en ligne.** Le parcours est le suivant :
1. La cliente remplit le formulaire de devis.
2. Marie envoie un devis.
3. La cliente le signe et verse un acompte de 10 % par virement.
4. Le solde est réglé selon l'échéance indiquée sur le devis.

L'outil privé `/outils/documents.html` produit les documents Word correspondants.

**Utilisation**
1. **Une seule fois** : ouvrir l'outil et remplir « Mes informations d'entreprise » : nom avec la mention EI, adresse, IBAN, médiateur, échéance du solde… Ces informations sont enregistrées dans le navigateur de Marie uniquement, jamais dans le code du site : l'IBAN n'est donc pas publié.
2. **À chaque demande**, l'e-mail reçu contient un champ « Préparer le devis ». Le lien ouvre l'outil pré-rempli avec le nom, l'e-mail, la formule, le nombre de voyageurs, la destination et la période. Il reste à compléter l'adresse du client, puis à cliquer sur « Télécharger le devis (Word) ».
3. **Envoyer le devis** avec `cgv.html` enregistrée en PDF, puisque les CGV contiennent le formulaire de rétractation.
4. **Devis signé reçu** : envoyer l'e-mail de confirmation (modèle en section 7), puis générer la facture d'acompte à réception du virement, et plus tard la facture de solde, qui déduit automatiquement l'acompte.

**Calculs** : la formule, 10 € par voyageur au-delà de 4, l'acompte de 10 % et le solde de 90 % sont calculés en centimes, donc sans erreur d'arrondi. La TVA est gérée selon le régime choisi : franchise (mention art. 293 B) ou assujettie (HT, TVA, TTC). Si les tarifs changent, mettre à jour `formulaPrices` dans `assets/js/documents.js`, en même temps que la page d'accueil et les CGV.

**Numérotation** : le format est D-AAAA-NNN pour les devis et F-AAAA-NNN pour les factures, et elle repart à 1 chaque année. Une facture doit être numérotée de façon chronologique et sans trou. Il faut donc toujours utiliser le même ordinateur et le même navigateur, et conserver chaque facture émise. Le numéro reste modifiable en cas de besoin.

**Confidentialité** : les données de la demande voyagent dans la partie de l'adresse après `#`, qui n'est jamais envoyée au serveur. L'outil efface cette partie de la barre d'adresse après lecture. Rien n'est transmis sur Internet : les fichiers Word sont fabriqués dans le navigateur, avec PizZip et docxtemplater (licence MIT, `assets/vendor/`).

**Mentions légales couvertes par les modèles**
- **Devis** : identification avec la mention EI, validité, détail du prix, nature de l'opération, acompte expressément qualifié (non des arrhes, article L214-1 du Code de la consommation), échéance du solde, IBAN, rétractation, médiateur, et deux cases distinctes pour l'acceptation des CGV et la demande d'exécution anticipée.
- **Facture** : numéro, dates d'émission et d'exécution, nature de l'opération, SIREN du client s'il est professionnel, mention TVA, échéance ou date d'acquittement, escompte, et pénalités plus indemnité de 40 € pour les clients professionnels uniquement.

**Personnaliser les modèles** : on peut ouvrir `outils/modeles/devis.docx` ou `facture.docx` dans Word et modifier la mise en page librement. Les balises entre accolades (`{clientName}`, `{#lines}`…) doivent rester d'un seul tenant : il faut les retaper ou les coller entières, jamais les modifier caractère par caractère. Pour repartir des modèles d'origine, lancer `npm install docx`, puis `node scripts/documents/build-templates.js`.

**Facturation électronique** : pour des clients particuliers, les factures Word ou PDF restent valables. Pour des clients professionnels, l'émission de factures électroniques via une plateforme agréée deviendra obligatoire pour les micro-entreprises selon le calendrier de la réforme (annoncé pour septembre 2027). Il faudra alors passer par une plateforme agréée.

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
- **Confirmation de commande sur support durable** : à réception du devis signé, envoyer l'e-mail ci-dessous, avec `cgv.html` en PDF (impression navigateur > PDF).
- **Acompte et non arrhes** : la qualification figure dans les CGV (art. 7) et sur le devis. Ne pas parler d'« arrhes » dans les échanges : sans précision, la loi présume des arrhes, que le client peut abandonner pour se dégager.
- **Archivage** : conserver 10 ans les commandes de 120 € et plus (Escapade et Évasion).
- **Assurance RC professionnelle** : non obligatoire pour cette activité, mais fortement recommandée.
- **Relecture par un avocat** : recommandée, notamment pour la grille de rétractation (art. 9.3) et les délais (art. 8).

### Modèle d'e-mail de confirmation de commande

```
Objet : Confirmation de votre commande — Devis [D-2026-001]

Bonjour [Prénom],

Merci pour votre confiance ! J'ai bien reçu votre devis signé. Récapitulatif :
- Prestation : formule [Escapade], organisation de voyage sur mesure
- Voyageurs : [2]
- Prix total : [169,00] € [TVA non applicable, art. 293 B du CGI]
- Acompte de 10 % : [16,90] €, à régler par virement (référence [D-2026-001])
- Solde : [152,10] €, [à la remise du carnet de voyage]
- Date de commande : [jj/mm/aaaa]

Démarrage de la prestation : [vous avez demandé, en cochant la case du devis,
que je commence sans attendre la fin du délai de rétractation de 14 jours.
Vous perdrez ce droit à la remise de votre carnet ; en cas de rétractation
avant, seule la part déjà réalisée restera due.]
OU [je commencerai à l'issue du délai de rétractation de 14 jours, le [date],
dès réception de l'acompte.]

Vous trouverez en pièce jointe nos conditions générales de vente, qui
contiennent le formulaire de rétractation (annexe).

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

Mesurés le 23/10/2026 avec les visuels définitifs, sur un serveur local (sans cache ni compression, que le `.htaccess` ajoute en production) :

| Audit | Mobile (simulé, CPU ÷4) | Desktop |
|---|---|---|
| Lighthouse Performance | 75 à 97 selon les passes | 100 |
| Lighthouse Accessibilité / Bonnes pratiques / SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| LCP / CLS | 2,2 s / 0 | 0,6 s / 0 |
| Poids total de la page d'accueil | 578 Ko, vidéo comprise | idem |
| axe-core (WCAG 2.2 AA + bonnes pratiques), 5 pages | 0 violation | 0 violation |

Le score de performance mobile varie fortement d'une passe à l'autre dans un environnement de test partagé. Une mesure contrôlée (3 passes par variante) montre un temps de blocage médian d'environ 300 ms, à peu près identique avec ou sans vidéo, bandeau ou animations d'entrée : c'est le coût de base du chargement, sans élément fautif isolable. Mesurez sur l'hébergement réel avec PageSpeed Insights, qui teste depuis les serveurs de Google.

Optimisations en place :
- **Image d'attente** : responsive, préchargée et prioritaire.
- **Vidéo** : démarrée seulement une fois la page chargée et le navigateur au repos, jamais chargée en mode économie de données ou mouvement réduit, et mise en pause hors écran.
- **Rendu** : grain du hero statique ; ligne de vol mesurée à l'arrivée de la section ; emblème servi aux tailles affichées.

## Conventions de code

- **CSS** : méthode BEM (`bloc__element--modificateur`), variables CSS en kebab-case, sommaire numéroté en tête de fichier.
- **JavaScript** : camelCase, fonctions `initXxx()` indépendantes, JSDoc, aucune dépendance.
- **HTML** : identifiants en camelCase, validé avec `html-validate` (0 erreur).
- **Accessibilité** : lien d'évitement, focus visible, menu mobile au clavier (Échap), erreurs reliées aux champs (`aria-describedby`, `aria-invalid`), zones `aria-live`, animations désactivées si `prefers-reduced-motion`.

## Reste à fournir par la cliente

- [ ] Domaine définitif
- [ ] Clé Web3Forms, URL Brevo
- [ ] Informations d'entreprise saisies dans l'outil devis/factures (IBAN, médiateur, échéance du solde)
- [ ] Informations légales : nom, SIRET, adresse, téléphone, hébergeur, régime de TVA
- [ ] Médiateur de la consommation désigné
- [ ] Délais de remise par formule, nombre de modifications incluses, grille de rétractation
- [ ] Politique d'affiliation (liens commissionnés ou non), CGV art. 12
- [ ] Lien Instagram et fiche Google Business Profile
