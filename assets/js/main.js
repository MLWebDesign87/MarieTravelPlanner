/**
 * ==========================================================================
 * Marie Dream Planner — Main script
 * --------------------------------------------------------------------------
 * Vanilla JavaScript, no dependencies, no build step.
 * Loaded with `defer`: the DOM is ready when this runs.
 *
 * The site stays usable without JavaScript (progressive enhancement):
 * native anchors, <details> accordions, classic POST for the quote form.
 * Visitor-facing strings are in French; code and comments are in English.
 *
 * Contents
 *   1. Utilities
 *   2. Header (transparent → solid)
 *   3. Mobile navigation
 *   4. Active navigation link
 *   5. Formula preselection in the quote form
 *   6. Form validation (generic)
 *   7. Quote form (email + attached Word quote)
 *   8. Newsletter (Brevo)
 *   9. Hero video
 *  10. Steps flight line
 *  11. Footer year
 *  12. Bootstrapping
 * ==========================================================================
 */

(function () {
  "use strict";

  const config = window.siteConfig || {};

  /* ------------------------------------------------------------------------
   * 1. Utilities
   * --------------------------------------------------------------------- */

  /**
   * Shorthand for querySelector.
   * @param {string} selector
   * @param {ParentNode} [scope=document]
   * @returns {Element|null}
   */
  const qs = (selector, scope = document) => scope.querySelector(selector);

  /**
   * Shorthand for querySelectorAll, returned as an array.
   * @param {string} selector
   * @param {ParentNode} [scope=document]
   * @returns {Element[]}
   */
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /**
   * Shows a message in a live status region (role="status").
   * @param {HTMLElement|null} statusElement
   * @param {string} message
   * @param {"success"|"error"|""} [statusType=""]
   */
  const setStatus = (statusElement, message, statusType = "") => {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.dataset.status = statusType;
  };

  /**
   * Toggles the "sending" state of a submit button.
   * @param {HTMLButtonElement|null} button
   * @param {boolean} isBusy
   * @param {string} [busyLabel] Label shown while busy (French, visitor-facing)
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

  /**
   * Returns the trimmed value of a named form control.
   * @param {HTMLFormElement} form
   * @param {string} fieldName Value of the control's `name` attribute
   * @returns {string}
   */
  const readFieldValue = (form, fieldName) => (form.elements.namedItem(fieldName)?.value || "").trim();

  /* ------------------------------------------------------------------------
   * 2. Header: transparent over the hero, solid afterwards
   * --------------------------------------------------------------------- */
  const initHeaderState = () => {
    const siteHeader = qs("#siteHeader");
    const heroSection = qs(".hero");
    if (!siteHeader) return;

    // Pages without a hero keep a solid header
    if (!heroSection || !("IntersectionObserver" in window)) {
      siteHeader.dataset.state = "solid";
      return;
    }

    // The header turns solid as soon as the hero has almost left the screen.
    // The hero content is observed: past it, the menu text would overlap light content.
    const headerObserver = new IntersectionObserver(
      ([heroEntry]) => {
        siteHeader.dataset.state = heroEntry.isIntersecting ? "transparent" : "solid";
      },
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 }
    );
    headerObserver.observe(qs(".hero__content") || heroSection);
  };

  /* ------------------------------------------------------------------------
   * 3. Accessible mobile navigation
   * --------------------------------------------------------------------- */
  const initMobileNav = () => {
    const navToggle = qs("#navToggle");
    const primaryNav = qs("#primaryNav");
    if (!navToggle || !primaryNav) return;

    const toggleLabel = qs(".visually-hidden", navToggle);
    // Content behind the open menu, made inert while the menu is open
    const backgroundRegions = qsa("main, footer, .skip-link");

    /**
     * Opens or closes the menu.
     * Open: background content becomes inert (no click, no tab stop) and the
     * first link receives focus. Closed: everything becomes interactive again.
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

    // Close when a link is followed (in-page anchor navigation)
    primaryNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    // Close with Escape and give focus back to the toggle
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && primaryNav.classList.contains("is-open")) {
        setMenuOpen(false);
        navToggle.focus();
      }
    });

    // Back to the desktop layout: close the menu cleanly (breakpoint mirrors the CSS)
    window.matchMedia("(min-width: 56.25em)").addEventListener("change", (mediaQuery) => {
      if (mediaQuery.matches) setMenuOpen(false);
    });
  };

  /* ------------------------------------------------------------------------
   * 4. Active navigation link, based on the section in view
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
      { rootMargin: "-45% 0px -50% 0px" } // thin band in the middle of the viewport
    );

    navLinks.forEach((navLink) => {
      const targetSection = qs(navLink.getAttribute("href"));
      if (targetSection) sectionObserver.observe(targetSection);
    });
  };

  /* ------------------------------------------------------------------------
   * 5. Formula preselection (the "Demander un devis" buttons on the cards)
   * --------------------------------------------------------------------- */

  /**
   * Selects a formula in the quote form, if such an option exists.
   * @param {string} formulaName
   */
  const preselectFormula = (formulaName) => {
    const formulaSelect = qs("#formula");
    if (!formulaSelect || !formulaName) return;
    const hasOption = qsa("option", formulaSelect).some((option) => option.value === formulaName);
    if (hasOption) formulaSelect.value = formulaName;
  };

  const initFormulaPreselect = () => {
    // No online payment: every formula leads to the quote form, with that formula preselected
    qsa("a[href='#devis'][data-formula]").forEach((quoteLink) => {
      quoteLink.addEventListener("click", () => preselectFormula(quoteLink.dataset.formula));
    });
  };

  /* ------------------------------------------------------------------------
   * 6. Form validation (generic, French messages)
   * --------------------------------------------------------------------- */

  /** Custom error messages, keyed by field id, then by ValidityState flag. */
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
    assistanceDays: {
      valueMissing: "Indiquez le nombre de jours d’assistance souhaités.",
      rangeUnderflow: "Indiquez au moins 1 jour d’assistance.",
      rangeOverflow: "Indiquez 60 jours d’assistance au maximum.",
      badInput: "Indiquez un nombre de jours, par exemple : 7.",
    },
  };

  /** ValidityState flags checked, in order of priority. */
  const validityFlags = ["valueMissing", "badInput", "typeMismatch", "patternMismatch", "tooShort", "rangeOverflow", "rangeUnderflow"];

  /**
   * Returns the error message matching a field's validity state.
   * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
   * @returns {string} Empty string when the field is valid
   */
  const getErrorMessage = (field) => {
    const { validity } = field;
    if (field.disabled || validity.valid) return ""; // disabled fields are neither validated nor sent

    const fieldMessages = validationMessages[field.id] || {};
    const errorType = validityFlags.find((flag) => validity[flag]);
    return fieldMessages[errorType] || field.validationMessage;
  };

  /**
   * Validates a field and updates its associated error message.
   * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
   * @returns {boolean} true when valid
   */
  const validateField = (field) => {
    const errorMessage = getErrorMessage(field);
    const errorElement = qs(`#${field.id}Error`);

    field.setAttribute("aria-invalid", String(Boolean(errorMessage)));
    if (errorElement) errorElement.textContent = errorMessage;

    return !errorMessage;
  };

  /**
   * Enables live validation, starting after a field is first left.
   * @param {HTMLFormElement} form
   * @returns {() => boolean} Validates the whole form
   */
  const attachValidation = (form) => {
    const validatableFields = qsa("[required], [minlength], [type='email'], [data-validate]", form)
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

    // Validates every field and focuses the first invalid one. Fields are marked
    // as "touched" so their errors clear while typing, which avoids a layout
    // jump when the visitor clicks elsewhere.
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
   * 7. Quote form → email to Marie, with the Word quote attached
   * ------------------------------------------------------------------------
   * Attachments require a classic multipart submission: the quote is built in
   * the browser, put into the hidden file input, then the form is submitted
   * natively (the provider then redirects to /merci).
   * --------------------------------------------------------------------- */

  /** Quote libraries, loaded only when the form is submitted. */
  const quoteScripts = ["/assets/vendor/pizzip.min.js", "/assets/vendor/docxtemplater.min.js", "/assets/js/quote-generator.js"];

  /**
   * `name` attributes of the quote form controls. They are in French on
   * purpose: they become the row labels of the email Marie receives.
   */
  const quoteFieldNames = {
    firstName: "Prénom",
    lastName: "Nom",
    email: "email",
    phone: "Téléphone",
    formula: "Formule",
    travelers: "Voyageurs",
    destination: "Destination",
    period: "Période",
    assistanceDays: "Jours d’assistance",
  };

  /** Placeholder left in the form endpoint until the FormSubmit alias is set. */
  const formEndpointPlaceholder = "VOTRE-ALIAS-FORMSUBMIT";

  /**
   * Loads a script once.
   * @param {string} src
   * @returns {Promise<void>}
   */
  const loadScript = (src) => new Promise((resolve, reject) => {
    if (qs(`script[src="${src}"][data-loaded]`)) {
      resolve();
      return;
    }
    const script = Object.assign(document.createElement("script"), { src, async: false });
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Could not load ${src}`)));
    document.head.append(script);
  });

  /**
   * Adapts the technical fields to the provider chosen in config.js.
   * The HTML is ready for FormSubmit by default.
   * @param {HTMLFormElement} quoteForm
   */
  const configureFormProvider = (quoteForm) => {
    if (config.formProvider !== "web3forms") {
      if (config.formEndpoint) quoteForm.action = config.formEndpoint;
      return;
    }

    quoteForm.action = config.formEndpoint || "https://api.web3forms.com/submit";
    const web3formsFieldNames = { subject: "subject", redirect: "redirect", honeypot: "botcheck" };
    Object.entries(web3formsFieldNames).forEach(([role, name]) => {
      const field = qs(`[data-role='${role}']`, quoteForm);
      if (field) field.name = name;
    });
    const honeypot = qs("[data-role='honeypot']", quoteForm);
    if (honeypot) honeypot.type = "checkbox"; // Web3Forms expects a checkbox
    qsa("input[name='_captcha'], input[name='_template']", quoteForm).forEach((field) => field.remove());
    quoteForm.append(Object.assign(document.createElement("input"), {
      type: "hidden", name: "access_key", value: config.web3formsAccessKey || "",
    }));
  };

  /**
   * Tells whether the sending provider is configured.
   * @param {HTMLFormElement} quoteForm
   * @returns {boolean}
   */
  const isFormProviderReady = (quoteForm) => (config.formProvider === "web3forms"
    ? Boolean(config.web3formsAccessKey)
    : !quoteForm.action.includes(formEndpointPlaceholder));

  /**
   * Builds the quote and puts it into the hidden file input.
   * Never throws: on failure, the request is sent without an attachment.
   * @param {HTMLFormElement} quoteForm
   * @returns {Promise<boolean>} true when the quote is attached
   */
  const attachQuoteFile = async (quoteForm) => {
    const fileInput = qs("#quoteAttachment", quoteForm);
    if (!fileInput || typeof DataTransfer === "undefined") return false;

    try {
      for (const src of quoteScripts) {
        await loadScript(src); // sequential: docxtemplater needs PizZip first
      }
      const quoteRequest = Object.fromEntries(
        Object.entries(quoteFieldNames).map(([key, fieldName]) => [key, readFieldValue(quoteForm, fieldName)])
      );
      if (!qs("#assistanceOption", quoteForm)?.checked) quoteRequest.assistanceDays = "";
      const quoteFile = await window.quoteGenerator.createQuoteFile(quoteRequest);
      const transfer = new DataTransfer();
      transfer.items.add(quoteFile);
      fileInput.files = transfer.files;
      return true;
    } catch (error) {
      console.error("[quoteForm] Quote not generated, sending without attachment:", error);
      return false;
    }
  };

  /**
   * Shows the day count only when the WhatsApp assistance option is ticked.
   * When hidden, the field is disabled: it is neither validated nor sent.
   * @param {HTMLFormElement} quoteForm
   */
  const initAssistanceOption = (quoteForm) => {
    const optionCheckbox = qs("#assistanceOption", quoteForm);
    const daysField = qs("#assistanceDaysField", quoteForm);
    const daysInput = qs("#assistanceDays", quoteForm);
    if (!optionCheckbox || !daysField || !daysInput) return;

    const syncDaysField = () => {
      const isSelected = optionCheckbox.checked;
      optionCheckbox.setAttribute("aria-expanded", String(isSelected));
      daysField.hidden = !isSelected;
      daysInput.disabled = !isSelected;
      daysInput.required = isSelected;
      if (!isSelected) {
        daysInput.removeAttribute("aria-invalid");
        const errorElement = qs(`#${daysInput.id}Error`, quoteForm);
        if (errorElement) errorElement.textContent = "";
      }
    };

    optionCheckbox.addEventListener("change", () => {
      syncDaysField();
      if (optionCheckbox.checked) daysInput.focus();
    });
    syncDaysField();
  };

  const initQuoteForm = () => {
    const quoteForm = qs("#quoteForm");
    if (!quoteForm) return;

    const statusElement = qs("#quoteStatus");
    const submitButton = qs("button[type='submit']", quoteForm);
    const subjectField = qs("[data-role='subject']", quoteForm);
    const validateForm = attachValidation(quoteForm);

    initAssistanceOption(quoteForm);
    configureFormProvider(quoteForm);

    // Back navigation from /merci (back/forward cache): re-enable the button
    window.addEventListener("pageshow", () => setButtonBusy(submitButton, false));

    quoteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(statusElement, "");

      if (!validateForm()) {
        setStatus(statusElement, "Certains champs sont à compléter : ils sont signalés ci-dessus.", "error");
        return;
      }

      if (!isFormProviderReady(quoteForm)) {
        console.warn("[siteConfig] Sending is not configured: set formEndpoint (or web3formsAccessKey) in assets/js/config.js.");
        setStatus(statusElement, "L’envoi n’est pas disponible pour le moment. Merci de réessayer un peu plus tard.", "error");
        return;
      }

      setButtonBusy(submitButton, true, "Envoi de votre demande…");

      // Explicit subject for Marie: formula and client name
      if (subjectField) {
        const formula = readFieldValue(quoteForm, quoteFieldNames.formula);
        const fullName = `${readFieldValue(quoteForm, quoteFieldNames.firstName)} ${readFieldValue(quoteForm, quoteFieldNames.lastName)}`;
        subjectField.value = `Demande de devis — ${formula} — ${fullName}`;
      }

      await attachQuoteFile(quoteForm);

      // Native multipart submission: the only mode that carries the attachment
      HTMLFormElement.prototype.submit.call(quoteForm);
    });
  };

  /* ------------------------------------------------------------------------
   * 8. Newsletter → Brevo contact list
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

      // Simple two-field validation, reported in the status region
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
        console.warn("[siteConfig] brevoFormUrl is missing: configure assets/js/config.js.");
        setStatus(statusElement, "Les inscriptions ouvrent très bientôt.", "error");
        return;
      }

      setButtonBusy(submitButton, true, "Inscription…");

      try {
        // AJAX endpoint of Brevo forms
        const response = await fetch(`${config.brevoFormUrl}?isAjax=1`, {
          method: "POST",
          body: new FormData(newsletterForm),
        });
        const result = await response.json();

        if (!result.success) throw new Error(result.message || "Subscription rejected");

        newsletterForm.reset();
        setStatus(statusElement, "C’est noté ! Confirmez votre inscription grâce à l’e-mail que vous allez recevoir.", "success");
      } catch (error) {
        // Fallback: native submission in a new tab (e.g. CORS blocked)
        console.error("[newsletterForm] AJAX submission failed, using native fallback:", error);
        newsletterForm.action = config.brevoFormUrl;
        newsletterForm.target = "_blank";
        HTMLFormElement.prototype.submit.call(newsletterForm);
        setStatus(statusElement, "Finalisez votre inscription dans l’onglet qui vient de s’ouvrir.");
      } finally {
        setButtonBusy(submitButton, false);
      }
    });
  };

  /* ------------------------------------------------------------------------
   * 9. Hero video
   * ------------------------------------------------------------------------
   * Sources are injected only when needed: no video byte is downloaded when
   * the visitor prefers reduced motion or reduced data usage. In that case,
   * or if the file is missing, the poster image stays visible.
   * --------------------------------------------------------------------- */
  const initHeroVideo = () => {
    const heroVideo = qs("#heroVideo");
    const videoToggle = qs("#heroVideoToggle");
    if (!heroVideo || !videoToggle) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const prefersSavingData = Boolean(navigator.connection?.saveData);
    if (prefersReducedMotion || prefersSavingData) return;

    let videoSources = [];
    try {
      videoSources = JSON.parse(heroVideo.dataset.sources || "[]");
    } catch (error) {
      console.error("[heroVideo] Unreadable source list:", error);
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
     * Updates the toggle icon and accessible label.
     * @param {boolean} isPaused
     */
    const syncToggle = (isPaused) => {
      videoToggle.dataset.state = isPaused ? "paused" : "playing";
      if (toggleLabel) toggleLabel.textContent = isPaused ? "Lire la vidéo" : "Mettre la vidéo en pause";
    };

    const playVideo = () => heroVideo.play().catch(() => {
      // Playback refused (missing file, power saving…): the poster stays visible
    });

    heroVideo.addEventListener("playing", () => {
      qs("#heroDisc")?.classList.add("is-playing");
      videoToggle.hidden = false;
      syncToggle(false);
    }, { once: true });

    // Deferred start, once the page has loaded and the browser is idle: the
    // video never competes with the first render (the poster covers it).
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

    // Automatic pause when off screen (battery, CPU), resumed when back
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
   * 10. Steps flight line
   * ------------------------------------------------------------------------
   * The plane stops over at each step: it takes off from a dot, follows an
   * arc to the next one, lands, then flies on. In flight it grows (altitude)
   * and its shadow drifts away; a coral trail is drawn behind it. Each dot
   * lights up on landing. Runs once, when the section comes into view.
   * With reduced motion: arcs are shown and every dot is lit, no plane.
   * --------------------------------------------------------------------- */
  const initStepsFlight = () => {
    const stepsRoute = qs("#stepsRoute");
    if (!stepsRoute) return;
    const plane = qs(".steps__plane", stepsRoute);
    const steps = qsa(".step", stepsRoute);
    if (!plane || steps.length < 2) return;

    const svgNamespace = "http://www.w3.org/2000/svg";
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Timings, in milliseconds
    const hopDuration = 2000; // one flight between two steps
    const groundPause = 700; // stopover on each intermediate dot
    const takeoffDelay = 700; // wait on the first dot before taking off
    const fadeOutDelay = 1000; // wait on the last dot before the plane fades out

    // SVG layer holding the flight paths, placed under the dots
    const flightLayer = document.createElementNS(svgNamespace, "svg");
    flightLayer.classList.add("steps__flight");
    flightLayer.setAttribute("aria-hidden", "true");
    flightLayer.setAttribute("focusable", "false");
    stepsRoute.prepend(flightLayer);
    stepsRoute.classList.add("has-flight-path");

    /** @type {{trail: SVGPathElement, length: number}[]} */
    let hops = [];
    const trailProgress = new Array(steps.length - 1).fill(0); // 0 → 1 for each hop
    /** @type {{hopIndex: number, progress: number}|null} Plane position while flying */
    let planeState = null;

    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

    /** Center of each dot, relative to the route (the dot sits at the top left of its step). */
    const getDotCenters = () => {
      const routeBox = stepsRoute.getBoundingClientRect();
      return steps.map((step) => {
        const stepBox = step.getBoundingClientRect();
        const radius = parseFloat(getComputedStyle(step, "::before").width) / 2;
        return { x: stepBox.left - routeBox.left + radius, y: stepBox.top - routeBox.top + radius };
      });
    };

    /**
     * Appends a path to the flight layer.
     * @param {string} pathData
     * @param {string} className
     * @returns {SVGPathElement}
     */
    const createPath = (pathData, className) => {
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", pathData);
      path.setAttribute("class", className);
      flightLayer.append(path);
      return path;
    };

    /**
     * Shows the travelled part of a hop's trail.
     * @param {number} hopIndex
     */
    const drawTrail = (hopIndex) => {
      const hop = hops[hopIndex];
      if (hop) hop.trail.style.strokeDashoffset = String(hop.length * (1 - trailProgress[hopIndex]));
    };

    /**
     * Places the plane on a hop: position on the arc, heading (tangent),
     * altitude (scale) and drop shadow.
     * @param {number} hopIndex
     * @param {number} progress 0 = takeoff, 1 = landing
     */
    const placePlane = (hopIndex, progress) => {
      const { trail, length } = hops[hopIndex];
      const distance = length * progress;
      const point = trail.getPointAtLength(distance);
      const ahead = trail.getPointAtLength(Math.min(length, distance + 1));
      const behind = trail.getPointAtLength(Math.max(0, distance - 1));
      const heading = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI + 90; // the icon points up
      const altitude = Math.sin(Math.PI * progress);
      const scale = 0.72 + 0.5 * altitude;

      planeState = { hopIndex, progress };
      plane.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) rotate(${heading}deg) scale(${scale})`;
      plane.style.filter = `drop-shadow(0 ${(2 + 9 * altitude).toFixed(1)}px ${(2 + 4 * altitude).toFixed(1)}px rgb(43 7 9 / ${(0.35 - 0.17 * altitude).toFixed(2)}))`;
    };

    /**
     * Draws one arc per hop: upwards on desktop (steps in a row), leftwards
     * on mobile (steps in a column, with the text on the right).
     */
    const buildFlightPaths = () => {
      const centers = getDotCenters();
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
     * Animates one full hop between two steps.
     * @param {number} hopIndex
     * @returns {Promise<void>}
     */
    const flyHop = (hopIndex) => new Promise((resolve) => {
      const startTime = performance.now();
      const renderFrame = (now) => {
        const linearProgress = Math.min(1, (now - startTime) / hopDuration);
        const progress = easeInOutCubic(linearProgress); // speeds up on takeoff, slows down on approach
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

    /** The whole journey: a stopover on each step, then the plane fades out. */
    const startJourney = async () => {
      reachStep(steps[0]);
      placePlane(0, 0);
      plane.classList.add("is-visible");
      await wait(takeoffDelay);
      for (let hopIndex = 0; hopIndex < hops.length; hopIndex += 1) {
        await flyHop(hopIndex);
        reachStep(steps[hopIndex + 1]);
        if (hopIndex < hops.length - 1) await wait(groundPause);
      }
      await wait(fadeOutDelay);
      plane.classList.remove("is-visible"); // the last step number becomes readable again
      planeState = null;
    };

    buildFlightPaths();

    // Rebuild the arcs when the layout changes (rotation, resize)
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
      buildFlightPaths(); // fresh measurements (fonts loaded, layout settled)
      startJourney();
    }, { threshold: 0.45 });

    flightObserver.observe(stepsRoute);
  };

  /* ------------------------------------------------------------------------
   * 11. Footer: current year in the copyright line
   * --------------------------------------------------------------------- */
  const initCurrentYear = () => {
    const yearElement = qs("#currentYear");
    if (yearElement) yearElement.textContent = String(new Date().getFullYear());
  };

  /* ------------------------------------------------------------------------
   * 12. Bootstrapping
   * --------------------------------------------------------------------- */
  initCurrentYear();
  initHeaderState();
  initMobileNav();
  initActiveNavLinks();
  initFormulaPreselect();
  initQuoteForm();
  initNewsletterForm();
  initHeroVideo();
  initStepsFlight();
})();
