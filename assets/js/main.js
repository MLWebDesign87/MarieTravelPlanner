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
 *   5. Liens de paiement Stripe & présélection de formule
 *   6. Validation de formulaire (générique)
 *   7. Formulaire de devis (Web3Forms)
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

    /**
     * Ouvre ou ferme le menu.
     * @param {boolean} shouldOpen
     */
    const setMenuOpen = (shouldOpen) => {
      navToggle.setAttribute("aria-expanded", String(shouldOpen));
      primaryNav.classList.toggle("is-open", shouldOpen);
      document.body.classList.toggle("is-menu-open", shouldOpen);
      if (toggleLabel) toggleLabel.textContent = shouldOpen ? "Fermer le menu" : "Ouvrir le menu";
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
   * 5. Stripe Payment Links & présélection de formule
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

  const initPaymentLinks = () => {
    const paymentLinks = config.stripePaymentLinks || {};

    qsa("[data-payment-link]").forEach((paymentButton) => {
      const paymentKey = paymentButton.dataset.paymentLink;
      const paymentUrl = paymentLinks[paymentKey];

      if (paymentUrl) {
        // Paiement hébergé par Stripe : aucune donnée bancaire ne transite par le site
        paymentButton.href = paymentUrl;
        paymentButton.rel = "noopener";
        paymentButton.removeAttribute("data-formula"); // pas de présélection : on quitte la page
      } else {
        console.warn(`[siteConfig] Lien Stripe manquant pour « ${paymentKey} » : repli sur le formulaire de devis.`);
      }
    });

    // Tous les liens vers #devis porteurs d’une formule la présélectionnent
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
   * 7. Formulaire de devis → e-mail via Web3Forms
   * --------------------------------------------------------------------- */
  const initQuoteForm = () => {
    const quoteForm = qs("#quoteForm");
    if (!quoteForm) return;

    const statusElement = qs("#quoteStatus");
    const submitButton = qs("button[type='submit']", quoteForm);
    const accessKeyInput = qs("[data-config='web3formsAccessKey']", quoteForm);
    const validateForm = attachValidation(quoteForm);

    // Injection de la clé publique (permet aussi l’envoi sans JS une fois renseignée en dur)
    if (accessKeyInput && config.web3formsAccessKey) {
      accessKeyInput.value = config.web3formsAccessKey;
    }

    quoteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(statusElement, "");

      if (!validateForm()) {
        setStatus(statusElement, "Certains champs sont à compléter : ils sont signalés ci-dessus.", "error");
        return;
      }

      if (!config.web3formsAccessKey) {
        console.warn("[siteConfig] web3formsAccessKey manquante : configurez assets/js/config.js.");
        setStatus(statusElement, "L’envoi en ligne n’est pas encore activé. Écrivez-moi directement par e-mail en attendant.", "error");
        return;
      }

      // Construction du message : les « name » français deviennent les intitulés de l’e-mail
      const formData = new FormData(quoteForm);
      const payload = Object.fromEntries(formData.entries());
      payload.subject = `Demande de devis — ${payload["Formule"]} — ${payload["Prénom"]} ${payload["Nom"]}`;
      delete payload.redirect; // redirection réservée à l’envoi sans JS

      setButtonBusy(submitButton, true);

      try {
        const response = await fetch(config.web3formsEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || `HTTP ${response.status}`);
        }

        quoteForm.reset();
        qsa("[data-touched]", quoteForm).forEach((field) => delete field.dataset.touched);
        setStatus(statusElement, `Merci ${payload["Prénom"]}, votre demande est bien envoyée. Je vous réponds par e-mail très vite.`, "success");
      } catch (error) {
        console.error("[quoteForm] Échec de l’envoi :", error);
        setStatus(statusElement, "L’envoi n’a pas abouti. Vérifiez votre connexion puis réessayez.", "error");
      } finally {
        setButtonBusy(submitButton, false);
      }
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

    heroVideo.load();
    heroVideo.addEventListener("playing", () => {
      qs("#heroDisc")?.classList.add("is-playing");
      videoToggle.hidden = false;
      syncToggle(false);
    }, { once: true });
    playVideo();

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
   * 11. Ligne de vol des étapes : l’avion part une seule fois, à l’arrivée
   *     de la section à l’écran (animation décrite dans styles.css)
   * --------------------------------------------------------------------- */
  const initStepsFlight = () => {
    const stepsRoute = qs("#stepsRoute");
    const lastStep = qs(".step:last-child", stepsRoute || document);
    if (!stepsRoute || !lastStep) return;

    /**
     * Mesure le centre de la dernière pastille (coin haut-gauche de l’étape)
     * et l’expose en variables CSS : la ligne et l’avion s’arrêtent dessus.
     */
    const measureFlightEnd = () => {
      // Taille réelle de la pastille (respecte le zoom et la taille de police de l’utilisateur)
      const dotRadius = parseFloat(getComputedStyle(lastStep, "::before").width) / 2;
      const routeBox = stepsRoute.getBoundingClientRect();
      const stepBox = lastStep.getBoundingClientRect();
      stepsRoute.style.setProperty("--flight-end-x", `${stepBox.left - routeBox.left + dotRadius}px`);
      stepsRoute.style.setProperty("--flight-end-y", `${stepBox.top - routeBox.top + dotRadius}px`);
    };

    // Mesure différée à l’arrivée de la section : aucun recalcul de mise en page au chargement
    let resizeFrame = 0;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(measureFlightEnd);
    });

    if (!("IntersectionObserver" in window)) {
      measureFlightEnd();
      return;
    }

    const flightObserver = new IntersectionObserver(([routeEntry]) => {
      if (!routeEntry.isIntersecting) return;
      measureFlightEnd();
      stepsRoute.classList.add("is-flying");
      flightObserver.disconnect();
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
  initPaymentLinks();
  initQuoteForm();
  initNewsletterForm();
  initThankYouPage();
  initHeroVideo();
  initStepsFlight();
})();
