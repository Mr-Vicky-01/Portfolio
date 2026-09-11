/* Navigation and content work independently of WebGL and its dependencies. */
(() => {
  const nav = document.querySelector("#main-nav");
  const toggle = document.querySelector(".menu-toggle");
  const shell = document.querySelector(".nav-shell");
  const mobile = matchMedia("(max-width: 760px)");
  if (nav && toggle && shell) {
    const setOpen = (open, restoreFocus = false) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = open
        ? 'Close <span aria-hidden="true">×</span>'
        : 'Menu <span aria-hidden="true">☰</span>';
      if (restoreFocus) toggle.focus();
    };
    toggle.hidden = !mobile.matches;
    shell.classList.add("menu-ready");
    toggle.addEventListener("click", () =>
      setOpen(toggle.getAttribute("aria-expanded") !== "true"),
    );
    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const url = new URL(link.href);
      const target =
        url.pathname === location.pathname && url.hash
          ? document.getElementById(decodeURIComponent(url.hash.slice(1)))
          : null;
      setOpen(false);
      // Keep keyboard focus out of the collapsed menu after anchor navigation.
      if (target && mobile.matches) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        target.addEventListener(
          "blur",
          () => target.removeAttribute("tabindex"),
          { once: true },
        );
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open"))
        setOpen(false, true);
    });
    document.addEventListener("click", (event) => {
      if (!shell.contains(event.target)) setOpen(false);
    });
    shell.addEventListener("focusout", (event) => {
      if (!shell.contains(event.relatedTarget)) setOpen(false);
    });
    mobile.addEventListener("change", () => {
      const focusInside = nav.contains(document.activeElement);
      toggle.hidden = !mobile.matches;
      setOpen(false, mobile.matches && focusInside);
    });
  }
  if ("IntersectionObserver" in window) {
    const activeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          nav?.querySelectorAll("a").forEach((link) => {
            if (link.getAttribute("href") === "#" + entry.target.id)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    document
      .querySelectorAll("main > section[id]")
      .forEach((section) => activeObserver.observe(section));
  }
  // Optional enhancement: content and navigation remain usable if it cannot load.
  import("./motion.js").catch(() => {
    document
      .querySelectorAll(".reveal-pending, .is-entering")
      .forEach((element) => {
        element.classList.remove("reveal-pending", "is-entering");
      });
  });
})();
