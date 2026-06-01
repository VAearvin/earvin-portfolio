/* ============================================================
   Earvin Laureano — shared nav + footer + page wiring.
   Each page must:
     - have <div id="nav"></div> and <div id="footer"></div>
     - set <body data-active="hub|audit|new-website|rebrand|migration|funnel|partnership|care">
     - include FAQs as a JS array (window.FAQS) for FAQPage schema
   ============================================================ */

(function () {
  var active = document.body.getAttribute('data-active') || '';
  var isActive = function (key) { return active === key ? ' class="active"' : ''; };

  var nav =
    '<nav id="navbar">' +
      '<a href="/" class="logo">Earvin <span>Laureano</span></a>' +
      '<button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '<ul class="nav-links" id="navLinks">' +
        '<li><a href="/#support">Services</a></li>' +
        '<li><a href="/#how">How I Work</a></li>' +
        '<li><a href="/#experience">Experience</a></li>' +
        '<li><a href="/pricing"' + isActive('hub') + '>Work With Me</a></li>' +
        '<li><a href="/#contact">Contact</a></li>' +
        '<li><a href="/#contact" class="nav-cta">Get In Touch</a></li>' +
      '</ul>' +
    '</nav>';

  var footer =
    '<footer>' +
      '<div class="footer-logo">Earvin <span>Laureano</span></div>' +
      '<div class="footer-copy">© 2026 Earvin Laureano. All rights reserved.</div>' +
      '<div class="footer-sub">Operations &amp; Web Partner<br/><span>Remote Worldwide</span></div>' +
    '</footer>';

  var navMount = document.getElementById('nav');
  var footMount = document.getElementById('footer');
  if (navMount) navMount.outerHTML = nav;
  if (footMount) footMount.outerHTML = footer;

  // Fill prices from window.PRICING (single source of truth).
  // <span data-price="builds.foundation.from"></span>  -> "$1,800"
  // add data-mo to append "/mo"; add data-from to prepend "From "
  if (window.PRICING && window.money) {
    document.querySelectorAll('[data-price]').forEach(function (el) {
      var v = el.getAttribute('data-price').split('.').reduce(function (o, k) { return o && o[k]; }, window.PRICING);
      if (typeof v === 'number') {
        var txt = (el.hasAttribute('data-from') ? 'From ' : '') + window.money(v) + (el.hasAttribute('data-mo') ? '/mo' : '');
        el.textContent = txt;
      }
    });
  }

  // Nav scroll + mobile toggle
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () { navbar.classList.toggle('scrolled', window.scrollY > 50); });
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        toggle.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
      });
      links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          links.classList.remove('open');
          toggle.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  // Reveal-on-scroll
  if (window.IntersectionObserver) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (el) { if (el.isIntersecting) el.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });
  }

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.style.maxHeight = expanded ? null : panel.scrollHeight + 'px';
    });
  });

  // Auto-inject FAQPage JSON-LD from window.FAQS if present
  if (window.FAQS && window.FAQS.length) {
    var data = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": window.FAQS.map(function (f) {
        return { "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } };
      })
    };
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  // Render FAQ list if a container exists
  var faqMount = document.getElementById('faqList');
  if (faqMount && window.FAQS) {
    faqMount.innerHTML = window.FAQS.map(function (f, i) {
      return '<div class="faq-item">' +
        '<button class="faq-q" aria-expanded="false" aria-controls="faq-a-' + i + '" id="faq-q-' + i + '">' +
          '<span>' + f.q + '</span><span class="faq-plus" aria-hidden="true">+</span></button>' +
        '<div class="faq-a" id="faq-a-' + i + '" role="region" aria-labelledby="faq-q-' + i + '">' +
          '<div class="faq-a-inner">' + f.a + '</div></div>' +
      '</div>';
    }).join('');
    // re-wire after render
    faqMount.querySelectorAll('.faq-q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (panel) panel.style.maxHeight = expanded ? null : panel.scrollHeight + 'px';
      });
    });
  }
})();
