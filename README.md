# Marie Dream Planner — Site vitrine

Site statique (HTML, CSS, JavaScript vanilla), sans backend ni étape de build.
Paiement, devis et newsletter passent par des services tiers configurables dans un seul fichier.

## Arborescence

```
├── index.html               Page unique : hero, travel planner, étapes, formules, à propos, FAQ, devis
├── merci.html               Confirmation après l'envoi d'une demande de devis
├── mentions-legales.html    Mentions légales, confidentialité, cookies  ← à compléter
├── cgv.html                 Trame de CGV                                ← à compléter et faire valider
├── 404.html                 Page introuvable
├── robots.txt / sitemap.xml / site.webmanifest
├── .htaccess                HTTPS, www, cache, compression, sécurité (hébergement Apache)
└── assets/
    ├── css/styles.css       Styles (BEM, design tokens en variables CSS)
    ├── js/config.js         ← SEUL fichier de configuration (envoi, infos du devis, newsletter)
    ├── js/quote-generator.js  Génération du devis Word (chargé à l'envoi du formulaire)
    ├── documents/devis.docx Modèle Word du devis (balises {…})
    ├── vendor/              PizZip + docxtemplater (MIT), chargés à l'envoi uniquement
    ├── js/main.js           Navigation, validation, envois (camelCase, commenté)
    ├── fonts/               Gloock + Poppins auto-hébergées (woff2, sous-ensemble latin)
    ├── img/                 Logos (Marie Dream Planner, ML Web Design en SVG), portrait, image de partage
    ├── media/               Photos des formules (Pexels, retouchées) + animation du hero
    └── icons/               Favicons et icônes PWA
scripts/                     Outils de production (non déployés, bloqués par .htaccess)
├── documents/               Générateur du modèle Word du devis (build-templates.js)
└── art/                     Générateur de l'animation du hero (build-art.sh)
```

## 0. Médias : photos des formules et vidéo d'accueil

- **Formules** : trois photos Pexels, libres de droits pour un usage commercial et sans attribution obligatoire. Les crédits figurent quand même dans les mentions légales, par courtoisie.
  - Week-end : Prague, photographe airamdphoto.
  - Escapade : New York, peederopecta.
  - Évasion : Polynésie, gapeppy1.

  Elles sont recadrées en 4:3 et légèrement retouchées pour s'accorder à la palette chaude du site (chaleur, contraste, saturation). Elles sont exportées en WebP 640/960/1280 px, plus un JPEG de secours, sans métadonnées.
- **Accueil** : une animation originale de 12 s qui boucle sans à-coup : coucher de soleil, vagues, palmiers, oiseaux, reflets. Elle est carrée, en 960 px, et pèse 460 Ko en MP4 et 380 Ko en WebM, sans piste son.

**Changer une photo de formule** : remplacer les 4 fichiers `assets/media/formula-<weekend|escapade|evasion>-{640,960,1280}.webp` et `-960.jpg`, au ratio 4:3, en conservant les noms. Mettre aussi à jour le texte alternatif dans `index.html` et les crédits dans les mentions légales.

**Régénérer l'animation** (`scripts/art/`) :

```bash
pip install playwright pillow && playwright install chromium   # une seule fois
./scripts/art/build-art.sh                                     # ≈ 1 minute
```

`video.py` contient la scène : vitesse des vagues, oscillation des palmes et trajectoire des oiseaux sont réglables dans `frameSvg()`. Les rendus intermédiaires vont dans `scripts/art/build/`, ignoré par Git.

**Comportement de la vidéo** (`main.js › initHeroVideo`) :
- elle n'est jamais chargée si le visiteur a activé « réduire les animations » ou l'économie de données ; l'image d'attente, qui est la première image de la boucle, reste alors affichée ;
- elle apparaît en fondu et se met en pause hors écran ;
- un bouton pause/lecture est proposé, comme l'exige le critère WCAG 2.2.2.

## 1. Remplacer le domaine

Rechercher/remplacer `https://www.mariedreamplanner.fr` dans tout le projet (balises canonical, Open Graph, JSON-LD, sitemap, robots, .htaccess, redirection du formulaire).

## 2. Paiement par virement et devis Word automatique

**Il n'y a pas de paiement en ligne.** Le parcours :
1. La cliente envoie le formulaire de devis.
2. **Marie reçoit l'e-mail de la demande avec le devis Word pré-rempli en pièce jointe.**
3. Elle le vérifie, le complète si besoin, puis l'envoie à la cliente.
4. La cliente le signe et verse un acompte de 50 % par virement.
5. Le solde est réglé selon l'échéance indiquée sur le devis.

**Ce que contient le devis généré** :
- le nom, l'e-mail et le téléphone de la cliente, la formule, le nombre de voyageurs, la destination et la période ;
- le prix calculé : formule plus 10 € par voyageur au-delà de 4, acompte de 50 % et solde de 50 %, en centimes pour éviter toute erreur d'arrondi ;
- un numéro unique (D-AAAAMMJJ-HHMM-INITIALES), la date et la validité ;
- toutes les mentions légales : mention EI, SIRET, nature de l'opération, TVA, acompte qualifié comme tel (non des arrhes, article L214-1 du Code de la consommation), rétractation, médiateur, et deux cases distinctes pour l'acceptation des CGV et la demande d'exécution anticipée.

**Avant d'envoyer le devis à la cliente**, Marie complète dans Word les mentions « à compléter » :
- l'adresse de la cliente ;
- le prix, pour un EVJF / EVG ou un projet sur mesure ;
- l'IBAN, si elle préfère ne pas le publier dans `config.js`.

Elle joint ensuite les CGV en PDF, qui contiennent le formulaire de rétractation.

**Informations de Marie sur le devis** : elles se règlent dans `config.js` › `quoteIssuer` (nom avec mention EI, adresse, e-mail, médiateur, échéance du solde, délai, validité, banque). Ce fichier est public : n'y mettre l'IBAN que si Marie accepte qu'il soit lisible dans le code du site. Si le champ reste vide, le devis affiche « à compléter ».

**Tarifs** : ils figurent dans `assets/js/quote-generator.js` (`formulaPrices`). En cas de changement, mettre à jour aussi la page d'accueil et les CGV.

**Robustesse** : si la génération du devis échoue (navigateur très ancien, réseau…), la demande part quand même, sans pièce jointe. Aucun prospect n'est perdu. Sans JavaScript, le formulaire s'envoie normalement, également sans devis.

**Personnaliser le modèle** : on peut ouvrir `assets/documents/devis.docx` dans Word et modifier la mise en page librement. Les balises entre accolades (`{clientName}`, `{#lines}`…) doivent rester d'un seul tenant : il faut les retaper ou les coller entières. Pour repartir du modèle d'origine : `npm install docx` puis `node scripts/documents/build-templates.js`.

**Factures** : elles restent obligatoires pour chaque paiement. Marie les établit avec son outil habituel : tableur, logiciel de facturation, ou l'espace gratuit de son organisme. La numérotation doit être chronologique et sans trou.

## 3. Envoi du formulaire — FormSubmit (gratuit, avec pièce jointe)

Le formulaire est envoyé par **FormSubmit** (formsubmit.co). C'est gratuit, sans inscription, et les pièces jointes sont acceptées jusqu'à 10 Mo ; le devis pèse environ 25 Ko. Les fichiers ne sont pas stockés.

1. Les demandes sont envoyées **directement sur la boîte Gmail de Marie**, et non sur `contact@mariedreamplanner.fr`. Ce choix est volontaire : les demandes de devis ne dépendent pas de la redirection de contact@. L'adresse publique affichée sur le site (mentions légales, CGV, devis, données Google) est **contact@mariedreamplanner.fr**.
2. **Le dépôt ne contient jamais l'adresse Gmail**, seulement l'**alias** fourni par FormSubmit. Tant que l'emplacement `VOTRE-ALIAS-FORMSUBMIT` n'est pas remplacé, le formulaire affiche « envoi non disponible ».
3. **Activation, en local et sans committer** :
   1. Dans `config.js` › `formEndpoint` et dans l'`action` du `<form id="quoteForm">` de `index.html`, mettre temporairement `https://formsubmit.co/` suivi de l'adresse Gmail de Marie.
   2. Servir le site en local (`python3 -m http.server 8080`) et envoyer une demande de test.
   3. Marie reçoit un e-mail d'activation de FormSubmit (pensez aux spams) et clique sur le lien. Cet e-mail fournit aussi un **alias aléatoire**.
   4. Remplacer l'adresse par `https://formsubmit.co/<alias>` aux deux endroits. **Vérifier avec `git diff` que l'adresse n'apparaît plus**, puis committer.
4. Si FormSubmit redemande une activation une fois le site en ligne, il suffit de cliquer à nouveau.

L'e-mail reçu présente les champs sous forme de tableau, avec pour objet « Demande de devis — Formule — Prénom Nom ». L'adresse de la cliente y figure comme adresse de réponse : il suffit de répondre. Un champ pot de miel filtre les robots ; le captcha de FormSubmit est désactivé pour ne pas freiner les clientes.

**Alternative** : Web3Forms reste disponible (`formProvider: "web3forms"` + `web3formsAccessKey`), mais les pièces jointes y sont réservées à l'offre Pro, payante.

## 4. Newsletter — Brevo

1. Brevo › **Contacts** › **Formulaires** › créer un formulaire d'inscription relié à une liste. Activer la **double confirmation (double opt-in)**, recommandée pour le RGPD.
2. Dans le code HTML d'intégration fourni par Brevo, copier l'URL de l'attribut `action` du `<form>` (`https://xxxx.sibforms.com/serve/…`).
3. La coller dans `config.js` › `brevoFormUrl`.

Le formulaire envoie `EMAIL`, `OPT_IN`, `locale` et le pot de miel `email_address_check`, attendus par Brevo. Si l'envoi en arrière-plan échoue, le script bascule sur une soumission classique dans un nouvel onglet.

## 5. Déploiement

- **Apache (OVH, o2switch, Hostinger…)** : envoyer le dossier tel quel. Le `.htaccess` force HTTPS et `www`, gère la 404, le cache, la compression et les en-têtes de sécurité (CSP limitée à FormSubmit, Web3Forms et Brevo). Si vous ajoutez un service (analytics…), complétez la CSP.
- **Netlify / Cloudflare Pages / Vercel** : glisser-déposer le dossier. Le `.htaccess` est ignoré ; reporter si besoin les en-têtes dans un fichier `_headers`.

Pour forcer la mise à jour des CSS/JS mis en cache un an, versionner leur URL dans le HTML (`styles.css?v=2`).

## 6. SEO — après la mise en ligne

1. **Google Search Console** : valider le domaine, soumettre `sitemap.xml`, demander l'indexation de la page d'accueil.
2. **Fiche d'établissement Google** (Google Business Profile) : la créer en tant qu'**entreprise de zone de service** (adresse masquée si Marie travaille de chez elle), catégorie proche de « conseiller en voyages », zone desservie : Cannes et Alpes-Maritimes. C'est le levier principal pour « travel planner Cannes ». Ensuite, ajouter son URL dans le JSON-LD de `index.html` sous `"sameAs"`.
3. Récolter des **avis Google** après chaque voyage : ils pèsent fortement dans le classement local.
4. Le compte Instagram (@mariedreamplanner) est déjà relié : lien dans le pied de page et dans `"sameAs"` des données structurées. Y ajouter l'URL de la fiche Google une fois créée.
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
- Acompte de 50 % : [84,50] €, à régler par virement (référence [D-2026-001])
- Solde : [84,50] €, [à la remise du carnet de voyage]
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
- **Hero** : le titre apparaît ligne par ligne en fondu avec une légère montée, puis le disque solaire se lève. C'est du CSS pur. Le titre n'utilise **pas de masque** (`overflow: hidden`) : sur mobile, quand l'animation saccadait pendant le chargement, ou dans Safari, le masque laissait voir des lignes coupées en deux. Avec un simple fondu, une ligne reste entière à tout instant. La vidéo et son image d'attente sont découpées en cercle par un `clip-path` posé sur le média lui-même, la méthode fiable dans Safari.
- **Bandeau des continents** : défilement lent et continu, qui se met en pause au survol.
- **« Comment ça se passe »** : l'avion fait escale à chaque étape. Il décolle d'une pastille, suit un arc (vers le haut sur ordinateur, vers la gauche sur mobile pour ne pas couper les textes) et se pose sur la suivante, qui s'allume avec une onde. En vol, il grossit et son ombre s'éloigne pour suggérer l'altitude, et une traînée corail se dessine derrière lui. À la fin, il s'efface pour laisser le « 4 » lisible.
  - Les arcs sont recalculés au redimensionnement et à la rotation d'écran.
  - Durées réglables dans `main.js` › `initStepsFlight` (`hopDuration`, `groundPause`).
  - Sans JavaScript : ligne pointillée droite.
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

## Publication sur GitHub : ce qui ne doit jamais être commité

Le dépôt est public, et tout ce qu'il contient est lisible par n'importe qui, historique compris.

- **Jamais dans le dépôt** :
  - l'adresse Gmail de Marie (utiliser l'alias FormSubmit, voir section 3) ;
  - son IBAN ;
  - une clé API Brevo ;
  - une adresse personnelle non destinée à être publiée ;
  - tout fichier de clients ou de devis réels.
- **IBAN** : laisser `iban` vide dans `config.js`. Les devis afficheront « à compléter » et Marie l'ajoutera dans Word avant envoi.
- **Adresse postale** : elle est légalement obligatoire dans les mentions légales. Si Marie ne souhaite pas publier son adresse personnelle, elle peut recourir à une domiciliation d'entreprise.
- **Déjà publiés volontairement**, sans risque : le SIRET (donnée publique du répertoire SIRENE) et contact@mariedreamplanner.fr.
- **Avant chaque commit** : `git diff` pour relire les changements. Pour un contrôle rapide : `git grep -n -i "gmail\|iban"`.
- **Si une donnée a déjà été poussée** : la retirer d'un fichier ne suffit pas, elle reste dans l'historique Git. Il faut réécrire l'historique (`git filter-repo`) ou recréer le dépôt, et changer la donnée si c'est possible.

## Reste à fournir par la cliente

- [ ] Domaine définitif
- [ ] Activation FormSubmit en local, puis alias dans `config.js` et `index.html` ; URL Brevo
- [ ] Informations de Marie pour le devis dans `config.js` › `quoteIssuer` (nom + EI, adresse, médiateur, échéance du solde, banque)
- [ ] Informations légales : nom, SIRET, adresse, téléphone, hébergeur, régime de TVA
- [ ] Médiateur de la consommation désigné
- [ ] Délais de remise par formule, nombre de modifications incluses, grille de rétractation
- [ ] Politique d'affiliation (liens commissionnés ou non), CGV art. 12
- [ ] Fiche Google Business Profile
