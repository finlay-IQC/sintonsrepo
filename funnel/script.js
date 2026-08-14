/* ==========================================================================
   Sintons Projects — Renovation Funnel
   script.js  |  UTM capture + pass-through, sticky CTA, FAQ accordion,
                 smooth-scroll to form, GHL form -> thank-you redirect helper
   Lightweight vanilla JS. No dependencies.
   ========================================================================== */
(function () {
  "use strict";

  /* ----------------------------------------------------------------------
     1. UTM / click-id capture and persistence
        Captured on any landing page and stored in sessionStorage so the
        values survive the hop from landing.html -> thank-you.html.
     ---------------------------------------------------------------------- */
  var TRACKED_KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "fbclid", "gclid", "ttclid", "msclkid"
  ];
  var STORE_KEY = "sintons_utms";

  function getStoredUtms() {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function captureUtms() {
    var params = new URLSearchParams(window.location.search);
    var stored = getStoredUtms();
    var changed = false;
    TRACKED_KEYS.forEach(function (key) {
      var val = params.get(key);
      if (val && !stored[key]) { stored[key] = val; changed = true; }
    });
    if (changed) {
      try { sessionStorage.setItem(STORE_KEY, JSON.stringify(stored)); } catch (e) {}
    }
    return stored;
  }

  function utmQueryString() {
    var stored = getStoredUtms();
    var parts = [];
    Object.keys(stored).forEach(function (k) {
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(stored[k]));
    });
    return parts.join("&");
  }

  // Append stored UTMs to internal links (e.g. footer legal + any manual links).
  function decorateInternalLinks() {
    var qs = utmQueryString();
    if (!qs) return;
    var links = document.querySelectorAll('a[href]');
    links.forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href) return;
      // Only same-site .html links, skip anchors / tel / external.
      if (/^(mailto:|tel:|#|https?:\/\/)/i.test(href)) return;
      if (href.indexOf(".html") === -1) return;
      a.setAttribute("href", href + (href.indexOf("?") === -1 ? "?" : "&") + qs);
    });
  }

  /* ----------------------------------------------------------------------
     2. Push UTMs into the GHL form iframe
        GoHighLevel forms read query params from the iframe URL and map them
        to matching hidden fields. We append the stored UTMs to the iframe
        src so they arrive with the submission.

        >>> MANUAL STEP: In the GHL form builder add hidden fields named
            exactly: utm_source, utm_medium, utm_campaign, utm_content,
            utm_term, fbclid, gclid, ttclid, msclkid  <<<
     ---------------------------------------------------------------------- */
  function injectUtmsIntoForm() {
    var qs = utmQueryString();
    var iframe = document.querySelector('iframe[data-form-id]');
    if (!iframe || !qs) return;
    var src = iframe.getAttribute("src");
    if (!src || src.indexOf("utm_") !== -1) return; // already decorated
    iframe.setAttribute("src", src + (src.indexOf("?") === -1 ? "?" : "&") + qs);
  }

  /* ----------------------------------------------------------------------
     3. Smooth scroll to the form section for every in-page CTA
        Any element with [data-scroll-to-form] scrolls to #form.
     ---------------------------------------------------------------------- */
  function wireScrollButtons() {
    var target = document.getElementById("form");
    document.querySelectorAll("[data-scroll-to-form]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ----------------------------------------------------------------------
     4. Sticky bottom CTA — appears after the hero scrolls out of view (mobile)
     ---------------------------------------------------------------------- */
  function wireStickyCta() {
    var sticky = document.querySelector(".sticky-cta");
    var hero = document.querySelector(".hero");
    if (!sticky || !hero) return;

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          sticky.classList.toggle("show", !entry.isIntersecting);
        });
      }, { rootMargin: "-40% 0px 0px 0px" });
      io.observe(hero);
    } else {
      window.addEventListener("scroll", function () {
        sticky.classList.toggle("show", window.scrollY > window.innerHeight * 0.6);
      }, { passive: true });
    }
  }

  /* ----------------------------------------------------------------------
     5. FAQ accordion
     ---------------------------------------------------------------------- */
  function wireFaq() {
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var q = item.querySelector(".faq-q");
      if (!q) return;
      q.addEventListener("click", function () {
        var isOpen = item.classList.contains("open");
        // Close others for a clean single-open accordion.
        document.querySelectorAll(".faq-item.open").forEach(function (o) {
          if (o !== item) { o.classList.remove("open"); o.querySelector(".faq-q").setAttribute("aria-expanded", "false"); }
        });
        item.classList.toggle("open", !isOpen);
        q.setAttribute("aria-expanded", String(!isOpen));
      });
    });
  }

  /* ----------------------------------------------------------------------
     6. GHL form submit -> redirect to thank-you.html (helper)
        Preferred: set the redirect URL inside the GHL form settings.
        This listener is a fallback that also forwards the UTMs.
        It only runs on pages that contain the form (landing pages).
     ---------------------------------------------------------------------- */
  function wireFormRedirect() {
    var iframe = document.querySelector('iframe[data-form-id]');
    if (!iframe) return;
    window.addEventListener("message", function (e) {
      // GHL posts messages from its embed domains on submit.
      if (!/leadconnectorhq|msgsndr/i.test(e.origin)) return;
      var data = e.data;
      var isSubmit =
        (typeof data === "string" && /submit|form.?submit/i.test(data)) ||
        (data && typeof data === "object" &&
          /submit|success|thank/i.test(JSON.stringify(data)));
      if (isSubmit) {
        var qs = utmQueryString();
        window.location.href = "thank-you.html" + (qs ? "?" + qs : "");
      }
    });
  }

  /* ----------------------------------------------------------------------
     Init
     ---------------------------------------------------------------------- */
  function init() {
    captureUtms();
    decorateInternalLinks();
    injectUtmsIntoForm();
    wireScrollButtons();
    wireStickyCta();
    wireFaq();
    wireFormRedirect();
    // Stamp the current year in any [data-year] element.
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
