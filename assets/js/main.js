/**
 * ==========================================================================
 * Marie Dream Planner — Script principal
 * --------------------------------------------------------------------------
 * JavaScript « vanilla », sans dépendance ni étape de build.
 * Chargé en `defer` : le DOM est prêt à l’exécution.
 *
 * Le site reste utilisable sans JavaScript (amélioration progressive) :
 * ancres natives, accordéons <details>, formulaire de devis en POST classique.
 *
 * Sommaire
 *   1. Utilitaires
 *   2. En-tête (transparent → plein)
 *   3. Menu mobile
 *   4. Lien de navigation actif
 *   5. Présélection de la formule dans le formulaire de devis
 *   6. Validation de formulaire (générique)
 *   7. Formulaire de devis (e-mail + devis Word joint)
 *   8. Newsletter (Brevo)
 *   9. Page de remerciement
 *  10. Vidéo du hero
 *  11. Ligne de vol des étapes
 *  12. Initialisation
 * ==========================================================================
 */

(function () {
  "use strict";

  const config = window.siteConfig || {};

  /* ------------------------------------------------------------------------
   * 1. Utilitaires
   * --------------------------------------------------------------------- */

  /**
   * Raccourci de sélection d’un élément.
   * @param {string} selector
   * @param {ParentNode} [scope=document]
   * @returns {Element|null}
   */
  const qs = (selector, scope = document) => scope.querySelector(selector);

  /**
   * Raccourci de sélection de plusieurs éléments (tableau).
   * @param {string} selector
   * @param {ParentNode} [scope=document]
   * @returns {Element[]}
   */
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /**
   * Affiche un message dans une zone de statut (role="status").
   * @param {HTMLElement} statusElement
   * @param {string} message
   * @param {"success"|"error"|""} [statusType=""]
   */
  const setStatus = (statusElement, message, statusType = "") => {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.dataset.status = statusType;
  };

  /**
   * Bascule l’état « en cours d’envoi » d’un bouton.
   * @param {HTMLButtonElement} button
   * @param {boolean} isBusy
   * @param {string} [busyLabel]
   */
  const setButtonBusy = (button, isBusy, busyLabel = "Envoi en cours…") => {
    if (!button) return;
    if (isBusy) {
      button.dataset.idleLabel = button.textContent;
      button.textContent = busyLabel;
      button.setAttribute("aria-busy", "true");
      button.disabled = true;
    } else {
      button.textContent = button.dataset.idleLabel || button.textContent;
      button.removeAttribute("aria-busy");
      button.disabled = false;
    }
  };

  /* ------------------------------------------------------------------------
   * 2. En-tête : transparent sur le hero, plein ensuite
   * --------------------------------------------------------------------- */
  const initHeaderState = () => {
    const siteHeader = qs("#siteHeader");
    const heroSection = qs(".hero");
    if (!siteHeader) return;

    // Pages sans hero : en-tête plein en permanence
    if (!heroSection || !("IntersectionObserver" in window)) {
      siteHeader.dataset.state = "solid";
      return;
    }

    // L’en-tête devient plein dès que le hero est presque sorti de l’écran
    const headerObserver = new IntersectionObserver(
      ([heroEntry]) => {
        siteHeader.dataset.state = heroEntry.isIntersecting ? "transparent" : "solid";
      },
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 }
    );
    // On observe le titre : au-delà, le texte du menu croiserait le contenu clair
    headerObserver.observe(qs(".hero__content") || heroSection);
  };

  /* ------------------------------------------------------------------------
   * 3. Menu mobile accessible
   * --------------------------------------------------------------------- */
  const initMobileNav = () => {
    const navToggle = qs("#navToggle");
    const primaryNav = qs("#primaryNav");
    if (!navToggle || !primaryNav) return;

    const toggleLabel = qs(".visually-hidden", navToggle);
    // Contenu situé derrière le menu : rendu inerte quand le menu est ouvert
    const backgroundRegions = qsa("main, footer, .skip-link");

    /**
     * Ouvre ou ferme le menu.
     * Ouvert : le contenu d’arrière-plan devient inerte (ni clic ni tabulation),
     * le focus va sur le premier lien. Fermé : tout redevient interactif.
     * @param {boolean} shouldOpen
     */
    const setMenuOpen = (shouldOpen) => {
      navToggle.setAttribute("aria-expanded", String(shouldOpen));
      primaryNav.classList.toggle("is-open", shouldOpen);
      document.body.classList.toggle("is-menu-open", shouldOpen);
      backgroundRegions.forEach((region) => {
        region.inert = shouldOpen;
      });
      if (toggleLabel) toggleLabel.textContent = shouldOpen ? "Fermer le menu" : "Ouvrir le menu";
      if (shouldOpen) qs("a", primaryNav)?.focus();
    };

    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isOpen);
    });

    // Fermeture au clic sur un lien (navigation par ancre)
    primaryNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    // Fermeture avec Échap, focus rendu au bouton
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && primaryNav.classList.contains("is-open")) {
        setMenuOpen(false);
        navToggle.focus();
      }
    });

    // Repasse en mode bureau : on referme proprement
    window.matchMedia("(min-width: 56.25em)").addEventListener("change", (mediaQuery) => {
      if (mediaQuery.matches) setMenuOpen(false);
    });
  };

  /* ------------------------------------------------------------------------
   * 4. Lien de navigation actif selon la section visible
   * --------------------------------------------------------------------- */
  const initActiveNavLinks = () => {
    const navLinks = qsa(".primary-nav__link[href^='#']");
    if (!navLinks.length || !("IntersectionObserver" in window)) return;

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((navLink) => {
            const isCurrent = navLink.getAttribute("href") === `#${entry.target.id}`;
            navLink.classList.toggle("is-active", isCurrent);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" } // bande au milieu de l’écran
    );

    navLinks.forEach((navLink) => {
      const targetSection = qs(navLink.getAttribute("href"));
      if (targetSection) sectionObserver.observe(targetSection);
    });
  };

  /* ------------------------------------------------------------------------
   * 5. Présélection de la formule (boutons « Demander un devis » des cartes)
   * --------------------------------------------------------------------- */

  /**
   * Présélectionne une formule dans le formulaire de devis.
   * @param {string} formulaName
   */
  const preselectFormula = (formulaName) => {
    const formulaSelect = qs("#formula");
    if (!formulaSelect || !formulaName) return;
    const hasOption = qsa("option", formulaSelect).some((option) => option.value === formulaName);
    if (hasOption) formulaSelect.value = formulaName;
  };

  const initFormulaPreselect = () => {
    // Pas de paiement en ligne : chaque formule mène au formulaire de devis, formule présélectionnée
    qsa("a[href='#devis'][data-formula]").forEach((quoteLink) => {
      quoteLink.addEventListener("click", () => preselectFormula(quoteLink.dataset.formula));
    });
  };

  /* ------------------------------------------------------------------------
   * 6. Validation de formulaire (générique, messages en français)
   * --------------------------------------------------------------------- */

  /** Messages d’erreur personnalisés, indexés par id de champ puis par type d’erreur. */
  const validationMessages = {
    firstName: { valueMissing: "Indiquez votre prénom." },
    lastName: { valueMissing: "Indiquez votre nom." },
    email: {
      valueMissing: "Indiquez votre adresse e-mail pour que je puisse vous répondre.",
      typeMismatch: "Cette adresse e-mail semble incomplète, par exemple : nom@domaine.fr.",
      patternMismatch: "Cette adresse e-mail semble incomplète, par exemple : nom@domaine.fr.",
    },
    formula: { valueMissing: "Choisissez la formule qui se rapproche le plus de votre projet." },
    message: {
      valueMissing: "Décrivez votre projet en quelques phrases.",
      tooShort: "Ajoutez quelques détails (20 caractères minimum).",
    },
    quoteConsent: { valueMissing: "Cochez cette case pour que je puisse traiter votre demande." },
  };

  /**
   * Renvoie le message d’erreur adapté à l’état de validité d’un champ.
   * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
   * @returns {string} chaîne vide si le champ est valide
   */
  const getErrorMessage = (field) => {
    const { validity } = field;
    if (validity.valid) return "";

    const fieldMessages = validationMessages[field.id] || {};
    const errorType = ["valueMissing", "typeMismatch", "patternMismatch", "tooShort", "rangeOverflow", "rangeUnderflow"]
      .find((type) => validity[type]);

    return fieldMessages[errorType] || field.validationMessage;
  };

  /**
   * Valide un champ et met à jour son message d’erreur associé.
   * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
   * @returns {boolean} true si valide
   */
  const validateField = (field) => {
    const errorMessage = getErrorMessage(field);
    const errorElement = qs(`#${field.id}Error`);

    field.setAttribute("aria-invalid", String(Boolean(errorMessage)));
    if (errorElement) errorElement.textContent = errorMessage;

    return !errorMessage;
  };

  /**
   * Active la validation « en direct » : après la première sortie du champ.
   * @param {HTMLFormElement} form
   * @returns {() => boolean} fonction qui valide tout le formulaire
   */
  const attachValidation = (form) => {
    const validatableFields = qsa("[required], [minlength], [type='email']", form)
      .filter((field) => field.id && !field.classList.contains("form__honeypot"));

    validatableFields.forEach((field) => {
      field.addEventListener("blur", () => {
        field.dataset.touched = "true";
        validateField(field);
      });
      field.addEventListener("input", () => {
        if (field.dataset.touched) validateField(field);
      });
      field.addEventListener("change", () => {
        if (field.type === "checkbox" || field.tagName === "SELECT") validateField(field);
      });
    });

    // Valide tout le formulaire et place le focus sur le premier champ en erreur.
    // Les champs passent en mode « touché » : leurs erreurs s’effacent dès la saisie,
    // ce qui évite un saut de mise en page au moment de cliquer ailleurs.
    return () => {
      validatableFields.forEach((field) => {
        field.dataset.touched = "true";
      });
      const invalidFields = validatableFields.filter((field) => !validateField(field));
      if (invalidFields.length) invalidFields[0].focus();
      return invalidFields.length === 0;
    };
  };

  /* ------------------------------------------------------------------------
   * 7. Formulaire de devis → e-mail à Marie, devis Word en pièce jointe
   * ------------------------------------------------------------------------
   * Les pièces jointes exigent un envoi classique (multipart) : le devis est
   * généré dans le navigateur, placé dans le champ fichier caché, puis le
   * formulaire est soumis normalement (redirection vers merci.html).
   * --------------------------------------------------------------------- */

  /** Bibliothèques du devis, chargées seulement au moment de l’envoi. */
  const quoteScripts = ["/assets/vendor/pizzip.min.js", "/assets/vendor/docxtemplater.min.js", "/assets/js/quote-generator.js"];

  /**
   * Charge un script une seule fois.
   * @param {string} src
   * @returns {Promise<void>}
   */
  const loadScript = (src) => new Promise((resolve, reject) => {
    if (qs(`script[src="${src}"][data-loaded]`)) return resolve();
    const script = Object.assign(document.createElement("script"), { src, async: false });
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Chargement impossible : ${src}`)));
    document.head.append(script);
  });

  /**
   * Adapte les champs techniques au fournisseur choisi dans config.js.
   * Par défaut, le HTML est prêt pour FormSubmit.
   * @param {HTMLFormElement} quoteForm
   */
  const configureFormProvider = (quoteForm) => {
    if (config.formEndpoint) quoteForm.action = config.formEndpoint;
    if (config.formProvider !== "web3forms") return;

    quoteForm.action = config.formEndpoint || "https://api.web3forms.com/submit";
    const fieldNames = { subject: "subject", redirect: "redirect", honeypot: "botcheck" };
    Object.entries(fieldNames).forEach(([role, name]) => {
      const field = qs(`[data-role='${role}']`, quoteForm);
      if (field) field.name = name;
    });
    const honeypot = qs("[data-role='honeypot']", quoteForm);
    if (honeypot) honeypot.type = "checkbox"; // Web3Forms attend une case à cocher
    qsa("input[name='_captcha'], input[name='_template']", quoteForm).forEach((field) => field.remove());
    quoteForm.append(Object.assign(document.createElement("input"), {
      type: "hidden", name: "access_key", value: config.web3formsAccessKey || "",
    }));
  };

  /** Le fournisseur d’envoi est-il configuré ? */
  const isFormProviderReady = (quoteForm) => (config.formProvider === "web3forms"
    ? Boolean(config.web3formsAccessKey)
    : !quoteForm.action.includes("VOTRE-ALIAS"));

  /**
   * Génère le devis et le place dans le champ fichier caché.
   * N’échoue jamais : en cas de problème, la demande part sans pièce jointe.
   * @param {HTMLFormElement} quoteForm
   * @returns {Promise<boolean>} true si le devis est joint
   */
  const attachQuoteFile = async (quoteForm) => {
    const fileInput = qs("#quoteAttachment", quoteForm);
    if (!fileInput || typeof DataTransfer === "undefined") return false;
    const read = (name) => (quoteForm.elements.namedItem(name)?.value || "").trim();

    try {
      for (const src of quoteScripts) {
        await loadScript(src);
      }
      const quoteFile = await window.quoteGenerator.createQuoteFile({
        firstName: read("Prénom"), lastName: read("Nom"), email: read("email"), phone: read("Téléphone"),
        formula: read("Formule"), travelers: read("Voyageurs"), destination: read("Destination"), period: read("Période"),
      });
      const transfer = new DataTransfer();
      transfer.items.add(quoteFile);
      fileInput.files = transfer.files;
      return true;
    } catch (error) {
      console.error("[quoteForm] Devis non généré, envoi sans pièce jointe :", error);
      return false;
    }
  };

  const initQuoteForm = () => {
    const quoteForm = qs("#quoteForm");
    if (!quoteForm) return;

    const statusElement = qs("#quoteStatus");
    const submitButton = qs("button[type='submit']", quoteForm);
    const subjectField = qs("[data-role='subject']", quoteForm);
    const validateForm = attachValidation(quoteForm);

    configureFormProvider(quoteForm);

    // Retour arrière depuis merci.html (cache du navigateur) : bouton réactivé
    window.addEventListener("pageshow", () => setButtonBusy(submitButton, false));

    quoteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(statusElement, "");

      if (!validateForm()) {
        setStatus(statusElement, "Certains champs sont à compléter : ils sont signalés ci-dessus.", "error");
        return;
      }

      if (!isFormProviderReady(quoteForm)) {
        console.warn("[siteConfig] Envoi non configuré : renseignez formEndpoint (ou web3formsAccessKey) dans assets/js/config.js.");
        setStatus(statusElement, "L’envoi n’est pas disponible pour le moment. Merci de réessayer un peu plus tard.", "error");
        return;
      }

      setButtonBusy(submitButton, true, "Envoi de votre demande…");

      // Objet explicite pour Marie : formule et nom du client
      const read = (name) => (quoteForm.elements.namedItem(name)?.value || "").trim();
      if (subjectField) subjectField.value = `Demande de devis — ${read("Formule")} — ${read("Prénom")} ${read("Nom")}`;

      await attachQuoteFile(quoteForm);

      // Envoi classique (multipart) : seul mode qui transporte la pièce jointe
      HTMLFormElement.prototype.submit.call(quoteForm);
    });
  };

  /* ------------------------------------------------------------------------
   * 8. Newsletter → liste de contacts Brevo
   * --------------------------------------------------------------------- */
  const initNewsletterForm = () => {
    const newsletterForm = qs("#newsletterForm");
    if (!newsletterForm) return;

    const emailInput = qs("#newsletterEmail", newsletterForm);
    const consentInput = qs("#newsletterConsent", newsletterForm);
    const statusElement = qs("#newsletterStatus");
    const submitButton = qs("button[type='submit']", newsletterForm);

    newsletterForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Validation simple (deux champs) : messages dans la zone de statut
      if (!emailInput.validity.valid) {
        setStatus(statusElement, "Saisissez une adresse e-mail valide, par exemple : nom@domaine.fr.", "error");
        emailInput.focus();
        return;
      }
      if (!consentInput.checked) {
        setStatus(statusElement, "Cochez la case de consentement pour vous inscrire.", "error");
        consentInput.focus();
        return;
      }

      if (!config.brevoFormUrl) {
        console.warn("[siteConfig] brevoFormUrl manquante : configurez assets/js/config.js.");
        setStatus(statusElement, "Les inscriptions ouvrent très bientôt.", "error");
        return;
      }

      setButtonBusy(submitButton, true, "Inscription…");

      try {
        // Point d’entrée AJAX des formulaires Brevo
        const response = await fetch(`${config.brevoFormUrl}?isAjax=1`, {
          method: "POST",
          body: new FormData(newsletterForm),
        });
        const result = await response.json();

        if (!result.success) throw new Error(result.message || "Inscription refusée");

        newsletterForm.reset();
        setStatus(statusElement, "C’est noté ! Confirmez votre inscription grâce à l’e-mail que vous allez recevoir.", "success");
      } catch (error) {
        // Repli : soumission classique dans un nouvel onglet (ex. blocage CORS)
        console.error("[newsletterForm] Envoi AJAX impossible, repli natif :", error);
        newsletterForm.action = config.brevoFormUrl;
        newsletterForm.target = "_blank";
        HTMLFormElement.prototype.submit.call(newsletterForm);
        setStatus(statusElement, "Finalisez votre inscription dans l’onglet qui vient de s’ouvrir.", "");
      } finally {
        setButtonBusy(submitButton, false);
      }
    });
  };

  /* ------------------------------------------------------------------------
   * 9. Page de remerciement : message selon l’origine (devis / paiement)
   * --------------------------------------------------------------------- */
  const initThankYouPage = () => {
    const thankYouBlocks = qsa("[data-thank-you]");
    if (!thankYouBlocks.length) return;

    const thankYouType = new URLSearchParams(window.location.search).get("type") || "devis";
    const hasMatchingBlock = thankYouBlocks.some((block) => block.dataset.thankYou === thankYouType);

    thankYouBlocks.forEach((block) => {
      block.hidden = hasMatchingBlock ? block.dataset.thankYou !== thankYouType : block.dataset.thankYou !== "devis";
    });
  };

  /* ------------------------------------------------------------------------
   * 10. Vidéo du hero
   * ------------------------------------------------------------------------
   * Les sources ne sont injectées qu’au besoin : aucun octet de vidéo n’est
   * téléchargé si l’utilisateur préfère limiter les animations ou ses données.
   * Dans ce cas, ou si le fichier manque, l’image d’attente reste affichée.
   * --------------------------------------------------------------------- */
  const initHeroVideo = () => {
    const heroVideo = qs("#heroVideo");
    const videoToggle = qs("#heroVideoToggle");
    if (!heroVideo || !videoToggle) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const prefersSavingData = Boolean(navigator.connection && navigator.connection.saveData);
    if (prefersReducedMotion || prefersSavingData) return;

    let videoSources = [];
    try {
      videoSources = JSON.parse(heroVideo.dataset.sources || "[]");
    } catch (error) {
      console.error("[heroVideo] Liste de sources illisible :", error);
      return;
    }

    videoSources.forEach(({ src, type }) => {
      const sourceElement = document.createElement("source");
      sourceElement.src = src;
      sourceElement.type = type;
      heroVideo.append(sourceElement);
    });

    const toggleLabel = qs("[data-label]", videoToggle);
    let isPausedByUser = false;

    /**
     * Met à jour l’icône et le libellé du bouton.
     * @param {boolean} isPaused
     */
    const syncToggle = (isPaused) => {
      videoToggle.dataset.state = isPaused ? "paused" : "playing";
      if (toggleLabel) toggleLabel.textContent = isPaused ? "Lire la vidéo" : "Mettre la vidéo en pause";
    };

    const playVideo = () => heroVideo.play().catch(() => {
      /* Lecture refusée (fichier absent, économie d’énergie…) : l’image d’attente reste visible */
    });

    heroVideo.addEventListener("playing", () => {
      qs("#heroDisc")?.classList.add("is-playing");
      videoToggle.hidden = false;
      syncToggle(false);
    }, { once: true });

    // Démarrage différé : une fois la page chargée et le navigateur au repos,
    // la vidéo ne concurrence jamais le premier affichage (l'image d'attente le couvre)
    const startVideo = () => {
      heroVideo.load();
      playVideo();
    };
    const scheduleStart = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(startVideo, { timeout: 1500 });
      } else {
        window.setTimeout(startVideo, 300);
      }
    };
    if (document.readyState === "complete") {
      scheduleStart();
    } else {
      window.addEventListener("load", scheduleStart, { once: true });
    }

    videoToggle.addEventListener("click", () => {
      isPausedByUser = !heroVideo.paused;
      if (isPausedByUser) {
        heroVideo.pause();
      } else {
        playVideo();
      }
      syncToggle(isPausedByUser);
    });

    // Pause automatique hors écran (batterie, processeur), reprise au retour
    if ("IntersectionObserver" in window) {
      const visibilityObserver = new IntersectionObserver(([videoEntry]) => {
        if (isPausedByUser) return;
        if (videoEntry.isIntersecting) {
          playVideo();
        } else {
          heroVideo.pause();
        }
      }, { threshold: 0.1 });
      visibilityObserver.observe(heroVideo);
    }
  };

  /* ------------------------------------------------------------------------
   * 11. Ligne de vol des étapes
   * ------------------------------------------------------------------------
   * L’avion fait escale à chaque étape : il décolle d’une pastille, suit un
   * arc jusqu’à la suivante et s’y pose, puis repart. En vol, il grossit
   * (altitude) et son ombre s’éloigne ; une traînée corail se dessine derrière
   * lui. Chaque pastille s’allume à l’atterrissage. Déclenché une seule fois,
   * à l’arrivée de la section à l’écran.
   * Sans animation (préférence système) : arcs affichés, pastilles allumées.
   * --------------------------------------------------------------------- */
  const initStepsFlight = () => {
    const stepsRoute = qs("#stepsRoute");
    if (!stepsRoute) return;
    const plane = qs(".steps__plane", stepsRoute);
    const steps = qsa(".step", stepsRoute);
    if (!plane || steps.length < 2) return;

    const svgNamespace = "http://www.w3.org/2000/svg";
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hopDuration = 2000;     // durée d’un vol entre deux étapes (ms)
    const groundPause = 700;      // escale sur chaque pastille (ms)

    // Calque SVG des trajectoires, glissé sous les pastilles
    const flightLayer = document.createElementNS(svgNamespace, "svg");
    flightLayer.classList.add("steps__flight");
    flightLayer.setAttribute("aria-hidden", "true");
    flightLayer.setAttribute("focusable", "false");
    stepsRoute.prepend(flightLayer);
    stepsRoute.classList.add("has-flight-path");

    /** @type {{trail: SVGPathElement, length: number}[]} */
    let hops = [];
    const trailProgress = new Array(steps.length - 1).fill(0); // 0 → 1 par vol
    let planeState = null;  // { hopIndex, progress } pendant le vol

    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

    /** Centre de chaque pastille, relatif à la route (la pastille est en haut à gauche de l’étape). */
    const dotCenters = () => {
      const routeBox = stepsRoute.getBoundingClientRect();
      return steps.map((step) => {
        const stepBox = step.getBoundingClientRect();
        const radius = parseFloat(getComputedStyle(step, "::before").width) / 2;
        return { x: stepBox.left - routeBox.left + radius, y: stepBox.top - routeBox.top + radius };
      });
    };

    const createPath = (pathData, className) => {
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", pathData);
      path.setAttribute("class", className);
      flightLayer.append(path);
      return path;
    };

    /** Affiche la portion parcourue de la traînée d’un vol. */
    const drawTrail = (hopIndex) => {
      const hop = hops[hopIndex];
      if (hop) hop.trail.style.strokeDashoffset = String(hop.length * (1 - trailProgress[hopIndex]));
    };

    /**
     * Trace un arc par vol : vers le haut sur bureau (étapes en ligne),
     * vers la gauche sur mobile (étapes en colonne, le texte est à droite).
     */
    const buildFlightPaths = () => {
      const centers = dotCenters();
      flightLayer.replaceChildren();
      hops = centers.slice(0, -1).map((from, index) => {
        const to = centers[index + 1];
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const isVertical = Math.abs(to.y - from.y) > Math.abs(to.x - from.x);
        const bulge = isVertical ? Math.min(34, distance * 0.22) : Math.min(70, distance * 0.32);
        const control = isVertical
          ? { x: (from.x + to.x) / 2 - bulge, y: (from.y + to.y) / 2 }
          : { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - bulge };
        const pathData = `M${from.x} ${from.y} Q${control.x} ${control.y} ${to.x} ${to.y}`;

        createPath(pathData, "steps__flight-dash");
        const trail = createPath(pathData, "steps__flight-trail");
        const length = trail.getTotalLength();
        trail.style.strokeDasharray = String(length);
        return { trail, length };
      });
      hops.forEach((hop, index) => drawTrail(index));
      if (planeState) placePlane(planeState.hopIndex, planeState.progress);
    };

    /**
     * Place l’avion sur un vol : position sur l’arc, cap (tangente),
     * altitude (échelle) et ombre portée.
     * @param {number} hopIndex
     * @param {number} progress  0 = décollage, 1 = atterrissage
     */
    const placePlane = (hopIndex, progress) => {
      const { trail, length } = hops[hopIndex];
      const distance = length * progress;
      const point = trail.getPointAtLength(distance);
      const ahead = trail.getPointAtLength(Math.min(length, distance + 1));
      const behind = trail.getPointAtLength(Math.max(0, distance - 1));
      const heading = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI + 90; // icône orientée vers le haut
      const altitude = Math.sin(Math.PI * progress);
      const scale = 0.72 + 0.5 * altitude;

      planeState = { hopIndex, progress };
      plane.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) rotate(${heading}deg) scale(${scale})`;
      plane.style.filter = `drop-shadow(0 ${(2 + 9 * altitude).toFixed(1)}px ${(2 + 4 * altitude).toFixed(1)}px rgba(43, 7, 9, ${(0.35 - 0.17 * altitude).toFixed(2)}))`;
    };

    /** Un vol complet entre deux étapes. */
    const flyHop = (hopIndex) => new Promise((resolve) => {
      const startTime = performance.now();
      const renderFrame = (now) => {
        const linearProgress = Math.min(1, (now - startTime) / hopDuration);
        const progress = easeInOutCubic(linearProgress); // accélère au décollage, freine à l’approche
        trailProgress[hopIndex] = progress;
        drawTrail(hopIndex);
        placePlane(hopIndex, progress);
        if (linearProgress < 1) {
          requestAnimationFrame(renderFrame);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(renderFrame);
    });

    const reachStep = (step) => step.classList.add("is-reached");

    /** Le voyage complet : escale sur chaque étape, puis l’avion s’efface. */
    const startJourney = async () => {
      reachStep(steps[0]);
      placePlane(0, 0);
      plane.classList.add("is-visible");
      await wait(700); // l’avion attend au sol avant le premier décollage
      for (let hopIndex = 0; hopIndex < hops.length; hopIndex += 1) {
        await flyHop(hopIndex);
        reachStep(steps[hopIndex + 1]);
        if (hopIndex < hops.length - 1) await wait(groundPause);
      }
      await wait(1000);
      plane.classList.remove("is-visible"); // le numéro de la dernière étape redevient lisible
      planeState = null;
    };

    buildFlightPaths();

    // Recalcul des arcs si la mise en page change (rotation d’écran, redimensionnement)
    let resizeFrame = 0;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(buildFlightPaths);
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      steps.forEach(reachStep);
      return;
    }

    const flightObserver = new IntersectionObserver(([routeEntry]) => {
      if (!routeEntry.isIntersecting) return;
      flightObserver.disconnect();
      buildFlightPaths(); // mesures à jour (polices chargées, mise en page stable)
      startJourney();
    }, { threshold: 0.45 });

    flightObserver.observe(stepsRoute);
  };

  /* ------------------------------------------------------------------------
   * 12. Initialisation
   * --------------------------------------------------------------------- */
  const initCurrentYear = () => {
    const yearElement = qs("#currentYear");
    if (yearElement) yearElement.textContent = String(new Date().getFullYear());
  };

  initCurrentYear();
  initHeaderState();
  initMobileNav();
  initActiveNavLinks();
  initFormulaPreselect();
  initQuoteForm();
  initNewsletterForm();
  initThankYouPage();
  initHeroVideo();
  initStepsFlight();
})();
