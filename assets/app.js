/* Folio & Hearth — shared interactivity. All state persists in the browser via localStorage. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clean = function (s) { return (s || "").replace(/\s+/g, " ").trim(); };
  var cardText = function (el) {
    var clone = el.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll("[aria-hidden], .material-symbols-outlined"), function (n) { n.remove(); });
    var t = clone.innerText || el.innerText || clone.textContent;
    return clean(t || "");
  };

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("fh:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("fh:" + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- Toast ---------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "fh-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("fh-show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("fh-show"); }, 2400);
  }
  function done(btn, msg) { if (btn) btn.dataset.fhDone = "1"; toast(msg); }

  var inject = document.createElement("style");
  inject.textContent =
    "#fh-toast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%) translateY(20px);" +
    "background:#3A2E2B;color:#FBF8F3;padding:12px 20px;border-radius:9999px;font:600 14px/1.2 'Plus Jakarta Sans',sans-serif;" +
    "box-shadow:0 8px 30px -4px rgba(58,46,43,.4);opacity:0;pointer-events:none;transition:all .25s ease;z-index:1000;max-width:90vw;text-align:center}" +
    "#fh-toast.fh-show{opacity:1;transform:translateX(-50%) translateY(0)}" +
    "@media(min-width:1024px){#fh-toast{bottom:32px}}" +
    ".fh-hidden{display:none!important}" +
    ".fh-menu{position:absolute;z-index:60;background:#fff;border:1px solid #E8DFD3;border-radius:12px;box-shadow:0 8px 30px -6px rgba(58,46,43,.18);padding:6px;min-width:190px}" +
    ".fh-menu button{display:flex;width:100%;text-align:left;padding:9px 12px;border-radius:8px;font:600 13px 'Plus Jakarta Sans',sans-serif;color:#3A2E2B;background:none;border:0;cursor:pointer}" +
    ".fh-menu button:hover{background:#F5EFEB}";
  document.head.appendChild(inject);

  var page = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";

  /* ---------- Reading minutes (header pill, all pages) ---------- */
  var readMin = store.get("read", 42);
  function renderRead() {
    $$("span").forEach(function (el) {
      if (el.children.length === 0 && /^\d+m read today$/.test(clean(el.textContent))) {
        el.textContent = readMin + "m read today";
      }
    });
  }
  function bumpRead(m) { readMin += m; store.set("read", readMin); renderRead(); }
  renderRead();

  /* ---------- Filter state + search box ---------- */
  var filter = { search: "", shelf: "all", category: "all", format: "all", mood: "", rating: "", sort: "logged" };
  var searchBox = $("input[placeholder^='Titles']");
  var applyFn = function () {};  // each page installs its own filter routine
  function pageCards() {
    if (page === "bookshelf" || page === "community" || page === "workshop") return $$("article");
    return [];
  }
  function refresh() { applyFn(); }
  if (searchBox) {
    searchBox.addEventListener("input", function () { filter.search = clean(searchBox.value).toLowerCase(); applyFn(); });
    searchBox.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      filter.search = clean(searchBox.value).toLowerCase();
      applyFn();
      if (!filter.search) { toast("Showing everything"); return; }
      if (page === "discovery") { toast("Search works on your Sanctuary shelf"); return; }
      var vis = pageCards().filter(function (c) { return !c.classList.contains("fh-hidden"); }).length;
      toast(vis + " match" + (vis === 1 ? "" : "es") + " for “" + clean(searchBox.value) + "”");
    });
  }

  function applyCardFilters(cards) {
    cards.forEach(function (card) {
      var t = cardText(card).toLowerCase();
      var ok = true;
      if (filter.search && t.indexOf(filter.search) === -1) ok = false;
      if (ok && filter.shelf !== "all" && !card.dataset.shelf.match(new RegExp(filter.shelf, "i"))) ok = false;
      if (ok && filter.category !== "all" && (card.dataset.category || "") !== filter.category) ok = false;
      if (ok && filter.format !== "all" && (card.dataset.format || "").toLowerCase().indexOf(filter.format) === -1) ok = false;
      if (ok && filter.mood && t.indexOf(filter.mood.toLowerCase()) === -1) ok = false;
      if (ok && filter.rating) {
        var r = parseFloat(card.dataset.rating || "0");
        if (filter.rating === "45" && !(r >= 4.5)) ok = false;
        if (filter.rating === "40" && !(r >= 4.0 && r < 4.5)) ok = false;
        if (filter.rating === "0" && !(r > 0 && r < 4.0)) ok = false;
        if (filter.rating === "none" && r > 0) ok = false;
      }
      card.classList.toggle("fh-hidden", !ok);
    });
  }

  function tagBookCards(cards) {
    cards.forEach(function (c, i) {
      if (c.dataset.tagged) return;
      c.dataset.tagged = "1";
      c.dataset.index = i;
      var t = cardText(c);
      var status = /Currently Reading/i.test(t) ? "reading" : /Finished/i.test(t) ? "finished" :
        /Held Close/i.test(t) ? "held" : /Nightstand/i.test(t) ? "nightstand" :
        /Wishlist/i.test(t) ? "wishlist" : "reading";
      c.dataset.shelf = status;
      var fmt = /\b(Hardcover|Paperback|Cloth|Audiobook|Annotated|Leather)\b/i.exec(t);
      c.dataset.format = fmt ? fmt[1].toLowerCase() : "";
      var r = /(\d\.\d)\s*(?:★|Read|\/|$)/.exec(t) || /(\d\.\d)/.exec(t.slice(t.search(/star|\d\.\d/)));
      var rr = /\b([45]\.\d)\b/.exec(t);
      c.dataset.rating = rr ? rr[1] : "0";
      var lg = /(\w+ \d{4})/.exec(t);
      c.dataset.date = lg ? lg[1] : "";
    });
  }

  /* ---------- Reusable dropdown menu ---------- */
  function openMenu(anchor, items, onPick) {
    var old = $(".fh-menu"); if (old) old.remove();
    var menu = document.createElement("div");
    menu.className = "fh-menu";
    items.forEach(function (label) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = label;
      b.addEventListener("click", function () { onPick(label); menu.remove(); });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    var r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + window.scrollY + 6) + "px";
    menu.style.left = Math.min(r.left + window.scrollX, window.innerWidth - 210) + "px";
    setTimeout(function () { document.addEventListener("click", function h(e) { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("click", h); } }); }, 0);
  }

  /* ---------- .ics download ---------- */
  function downloadICS() {
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Folio and Hearth//EN", "BEGIN:VEVENT",
      "UID:hearth-salon@foliohearth", "SUMMARY:Hearth Book Club - The Secret History",
      "DESCRIPTION:Salon discussion around the parlor fire.", "LOCATION:Virtual parlor",
      "DTSTART:" + stamp(2), "DTEND:" + stamp(2, 2), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    var blob = new Blob([ics], { type: "text/calendar" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "hearth-salon.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("Salon added to your calendar (.ics)");
  }
  function stamp(daysAhead, hoursAhead) {
    var d = new Date(); d.setDate(d.getDate() + daysAhead); d.setHours(19, 0, 0, 0);
    if (hoursAhead) d.setHours(19 + hoursAhead);
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  /* ---------- Counter button (teacups / pledges) ---------- */
  function wireCounter(btn, key, noun) {
    var numEl = btn.querySelector("[id*='count']") || btn;
    var base = parseInt((cardText(btn).match(/\d+/) || ["0"])[0], 10) || 0;
    var liked = store.get(key, false);
    var label = btn.querySelector("span:last-child") || btn;
    function paint() {
      var n = base + (liked ? 1 : 0);
      // rewrite only the numeric portion of the button's text span
      var txt = label.textContent.replace(/\d+/, String(n));
      label.textContent = txt;
      btn.classList.toggle("bg-secondary-fixed", liked);
      btn.style.color = liked ? "#77331d" : "";
    }
    if (liked) paint();
    btn.addEventListener("click", function () {
      liked = !liked; store.set(key, liked); paint();
      done(btn, liked ? "Added your " + noun : "Removed your " + noun);
    });
    paint();
  }

  /* ---------- Pledge button (send a coffee of encouragement) ---------- */
  function wirePledge(btn, key) {
    var on = store.get(key, false);
    var tag = document.createElement("span");
    tag.className = "font-label-sm";
    btn.appendChild(tag);
    function paint() {
      tag.textContent = on ? " · 1 from you" : "";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("bg-secondary", on);
      btn.classList.toggle("text-on-secondary", on);
      btn.classList.toggle("bg-secondary-fixed", !on);
      btn.classList.toggle("text-on-secondary-fixed", !on);
    }
    btn.dataset.fhDone = "1";
    btn.addEventListener("click", function () { on = !on; store.set(key, on); paint(); toast(on ? "You sent a coffee of encouragement" : "Encouragement withdrawn"); });
    paint();
  }

  /* ---------- Toggle button (join / rsvp / bookmark / nightstand) ---------- */
  function wireToggle(btn, onLabel, offLabel, msg) {
    var stateEl = btn.querySelector("span") && btn.querySelector("span:not([aria-hidden])") ? btn.querySelector("span:not([aria-hidden])") : btn;
    var on = store.get(btn.dataset.key || ("tgl:" + btn.textContent.slice(0, 12)), false);
    function paint() {
      if (onLabel) stateEl.textContent = on ? onLabel : offLabel;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("bg-secondary", !!on);
    }
    btn.addEventListener("click", function () {
      on = !on; if (btn.dataset.key) store.set(btn.dataset.key, on);
      paint(); done(btn, msg ? (on ? msg.on : msg.off) : "Done");
    });
    paint();
  }

  /* ---------- Inline composer + number helpers ---------- */
  function setLeadingNum(el, n) { if (el) el.textContent = el.textContent.replace(/\d+/, String(n)); }
  function leadingNum(str) { var m = /(\d+)/.exec(str || ""); return m ? parseInt(m[1], 10) : 0; }
  function makeComposer(host, placeholder, onSubmit) {
    var box = document.createElement("div");
    box.className = "fh-reply-box";
    box.style.cssText = "margin-top:10px;display:flex;gap:8px;align-items:flex-start;width:100%";
    var ta = document.createElement("textarea");
    ta.placeholder = placeholder; ta.rows = 1;
    ta.style.cssText = "flex:1;min-width:0;resize:vertical;padding:9px 12px;border-radius:10px;border:1px solid #E8DFD3;background:#F5EFEB;color:#1c1c19;font:400 14px/1.4 'Plus Jakarta Sans',sans-serif";
    var post = document.createElement("button");
    post.type = "button"; post.textContent = "Post";
    post.className = "px-4 py-2 rounded-full bg-secondary text-on-secondary font-label-sm";
    box.appendChild(ta); box.appendChild(post); host.appendChild(box); ta.focus();
    post.addEventListener("click", function () {
      var v = clean(ta.value);
      if (!v) { ta.focus(); toast("Write a few words first"); return; }
      onSubmit(v); ta.value = "";
    });
    return box;
  }

  /* ================= INDEX — The Hearth ================= */
  function initIndex() {
    var logBtn = $("#log-time-btn");
    if (logBtn) logBtn.addEventListener("click", function () {
      bumpRead(15); done(logBtn, "Logged 15 min to your ledger (" + readMin + "m today)");
    });

    var upd = $("#update-page-btn");
    if (upd) {
      var page_ = store.get("page", 312), total = 487;
      var bar = $$("[style]").filter(function (e) { return /^width:\s*64%/.test((e.getAttribute("style") || "").trim()); })[0];
      function paintPage() {
        var pct = Math.round(page_ / total * 100);
        var tn, w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        while ((tn = w.nextNode())) { if (/^Page \d+\s*$/.test(tn.nodeValue)) { tn.nodeValue = "Page " + page_ + " "; break; } }
        $$("span").forEach(function (el) { if (!el.children.length && /^\d+% bound$/.test(clean(el.textContent))) el.textContent = pct + "% bound"; });
        if (bar) bar.style.width = pct + "%";
      }
      upd.addEventListener("click", function () {
        upd.dataset.fhDone = "1";
        openMenu(upd, ["+10 pages", "+25 pages", "Finish book"], function (pick) {
          page_ = pick === "Finish book" ? total : Math.min(total, page_ + (parseInt(pick, 10) || 0));
          store.set("page", page_); paintPage(); done(upd, "Now on page " + page_ + " of " + total);
        });
      });
      paintPage();
    }

    var rsvp = $("#rsvp-toggle-btn");
    if (rsvp) { rsvp.dataset.key = "rsvp"; wireToggle(rsvp, "Seat Reserved · Clara", "Reserve a Chair", { on: "Your chair is reserved", off: "Chair released" }); }

    var teacup = $("#teacup-btn");
    if (teacup) wireCounter(teacup, "teacup", "teacup");

    var noteInput = $("#margin-input");
    var share = $("#post-note-btn");
    if (share && noteInput) share.addEventListener("click", function () {
      var v = clean(noteInput.value);
      if (!v) { toast("Write a line first, then share it"); noteInput.focus(); return; }
      var notes = store.get("notes", []); notes.unshift({ text: v, when: "just now" }); store.set("notes", notes);
      noteInput.value = "";
      addNoteToDom(notes[0]);
      done(share, "Your sentence was added to the hearth");
    });
    store.get("notes", []).slice(0, 6).reverse().forEach(addNoteToDom);
    function addNoteToDom(n) {
      var host = $("[id='margin-note-list']");
      if (!host) {
        var anchor = $$("section,div").filter(function (e) { return /Left by|Quiet Margin Note/.test(cardText(e)) && e.querySelector("blockquote, i, em"); })[0];
        if (!anchor) return;
        host = document.createElement("div"); host.id = "margin-note-list";
        anchor.insertBefore(host, anchor.firstChild);
      }
      if (host.querySelector("[data-note='" + n.text + "']")) return;
      var el = document.createElement("div");
      el.setAttribute("data-note", n.text);
      el.style.cssText = "border-left:3px solid #C26D53;padding:8px 12px;margin:8px 0;background:#F6F3EE;border-radius:8px;font-style:italic;color:#4e4542";
      el.textContent = "“" + n.text + "”";
      host.appendChild(el);
    }

    var addNote = $$("button").filter(function (b) { return /Add Margin Note/.test(cardText(b)); })[0];
    if (addNote) addNote.addEventListener("click", function () { if (noteInput) { noteInput.focus(); noteInput.scrollIntoView({ behavior: "smooth", block: "center" }); } done(addNote, "Add your line below, then share"); });

    var ics = $$("button").filter(function (b) { return /Add to Almanac/.test(cardText(b)); })[0];
    if (ics) ics.addEventListener("click", function () { done(ics); downloadICS(); });

    $$("button").filter(function (b) { return /^Queue/.test(cardText(b)); }).forEach(function (b) {
      b.addEventListener("click", function () { var q = store.get("queue", 0) + 1; store.set("queue", q); done(b, "Queued to your Sanctuary (" + q + " waiting)"); });
    });
  }

  /* ================= BOOKSHELF — The Sanctuary ================= */
  function shelfFromPill(label) {
    if (/All Volumes/i.test(label)) return "all";
    if (/Currently Reading/i.test(label)) return "reading";
    if (/Finished/i.test(label)) return "finished";
    if (/Held Close/i.test(label)) return "held";
    if (/Nightstand/i.test(label)) return "nightstand";
    if (/Wishlist/i.test(label)) return "wishlist";
    return "all";
  }
  function initBookshelf() {
    applyFn = function () { var c = $$("section.grid article"); tagBookCards(c); applyCardFilters(c); };
    var cards = $$("section.grid article");
    tagBookCards(cards);

    $$(".category-pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        pill.dataset.fhDone = "1";
        $$(".category-pill").forEach(function (p) { p.classList.remove("bg-primary-container", "text-surface", "shadow-sm"); p.classList.add("bg-surface-container-low", "text-on-surface-variant"); });
        pill.classList.remove("bg-surface-container-low", "text-on-surface-variant"); pill.classList.add("bg-primary-container", "text-surface", "shadow-sm");
        filter.shelf = shelfFromPill(cardText(pill)); refresh();
        var vis = cards.filter(function (c) { return !c.classList.contains("fh-hidden"); }).length;
        toast(clean(pill.textContent).replace(/\d+$/, "").trim() + " — " + vis + " volume" + (vis === 1 ? "" : "s"));
      });
    });

    function bindSelect(id, key) { var el = $("#" + id); if (el) el.addEventListener("change", function () { filter[key] = el.value; refresh(); }); }
    bindSelect("moodFilter", "mood"); bindSelect("formatFilter", "format"); bindSelect("ratingFilter", "rating");

    var sortBtn = $$("button").filter(function (b) { return /Date Logged|Sort/i.test(cardText(b)); })[0];
    if (sortBtn) sortBtn.addEventListener("click", function () {
      var grid = $("section.grid"); var list = $$("section.grid article");
      filter.sort = filter.sort === "logged" ? "title" : filter.sort === "title" ? "rating" : "logged";
      list.sort(function (a, b) {
        if (filter.sort === "title") return cardText(a).localeCompare(cardText(b));
        if (filter.sort === "rating") return (parseFloat(b.dataset.rating) || 0) - (parseFloat(a.dataset.rating) || 0);
        return (a.dataset.index | 0) - (b.dataset.index | 0);
      });
      list.forEach(function (c) { grid.appendChild(c); });
      done(sortBtn, "Sorted by " + filter.sort);
    });

    var view = $$("button").filter(function (b) { return /view_cozy|grid_view|view_module|dashboard/.test(b.innerHTML); })[0];
    if (view) { var listMode = false; view.addEventListener("click", function () {
      var grid = $("section.grid"); listMode = !listMode;
      grid.className = grid.className.replace(/grid-cols-\d+|md:grid-cols-\d+|lg:grid-cols-\d+/g, "").trim();
      grid.classList.add(listMode ? "grid-cols-1" : "lg:grid-cols-3");
      if (!grid.classList.contains("grid")) grid.classList.add("grid");
      done(view, listMode ? "List view" : "Grid view");
    }); }

    // per-card bookmark + move-to
    cards.forEach(function (card, i) {
      var bm = $(".bookmark-btn", card) || $$("button", card).filter(function (b) { return /bookmark/.test(b.innerHTML); })[0];
      if (bm) { bm.dataset.key = "bm:" + i; wireToggle(bm, null, null, { on: "Saved", off: "Unsaved" }); }
      var mv = $$("button", card).filter(function (b) { return /Move to/i.test(cardText(b)); })[0];
      if (mv) mv.addEventListener("click", function () {
        mv.dataset.fhDone = "1";
        openMenu(mv, ["Currently Reading", "Finished & Cherished", "Held Close", "On The Nightstand", "Wishlist & Whispers"], function (pick) {
          card.dataset.shelf = shelfFromPill(pick);
          var badge = $$("span", card).filter(function (s) { return /Held Close|Finished|Nightstand|Wishlist|Currently Reading/.test(s.textContent); })[0];
          if (badge) badge.textContent = pick.replace(" & Cherished", "").replace("On The ", "");
          refresh(); done(mv, "Moved to " + pick);
        });
      });
      $$("button", card).filter(function (b) { return /Start Reading|Acquire Volume/.test(cardText(b)); }).forEach(function (b) {
        b.addEventListener("click", function () { card.dataset.shelf = "reading"; var badge = $$("span", card).filter(function (s) { return /Nightstand|Wishlist/.test(s.textContent); })[0]; if (badge) badge.textContent = "Currently Reading"; refresh(); done(b, cardText(b) + " — noted"); });
      });
    });

    // Add Volume modal
    var modal = $("#addModal");
    var open = $("#addBookBtn");
    function closeModal() { if (modal) modal.classList.add("hidden"); }
    function showModal() { if (modal) modal.classList.remove("hidden"); }
    if (open) open.addEventListener("click", showModal);
    ["closeModalBtn", "cancelModalBtn"].forEach(function (id) { var b = $("#" + id); if (b) b.addEventListener("click", closeModal); });
    if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

    function fieldVal(sel) { var el = $(sel, modal); return el ? clean(el.value) : ""; }
    function addBook(later) {
      if (!modal) return;
      var title = fieldVal("input[type=text]") || "Untitled Volume";
      var inputs = $$("input[type=text]", modal);
      var author = inputs[1] ? clean(inputs[1].value) : "Unknown";
      var fmtSel = $("select", modal); var fmt = fmtSel ? clean(fmtSel.options[fmtSel.selectedIndex].text) : "Paperback";
      var shelfRadio = $$("input[name=shelf]", modal).filter(function (r) { return r.checked; })[0];
      var shelfVal = shelfRadio ? shelfRadio.value : "cherished";
      var shelfLabel = shelfVal === "reading" ? "Currently Reading" : shelfVal === "nightstand" ? "Nightstand (TBR)" : "Finished";
      var shelfKey = shelfVal === "reading" ? "reading" : shelfVal === "nightstand" ? "nightstand" : "finished";
      var ta = $("textarea", modal); var note = ta ? clean(ta.value) : "";
      var art = document.createElement("article");
      art.className = "group relative flex flex-col bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all";
      art.innerHTML =
        '<div class="flex gap-space-md"><div class="relative w-28 h-40 shrink-0 rounded-lg overflow-hidden shadow-sm" style="background:linear-gradient(160deg,#6a5b58,#3a2e2b)"><div class="absolute inset-y-0 left-0 w-2 bg-black/25"></div></div>' +
        '<div class="flex-1"><span class="text-[11px] uppercase tracking-wide text-on-surface-variant">' + esc(fmt) + '</span> ' +
        '<span class="shelf-badge text-[11px] px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">' + esc(shelfLabel) + '</span>' +
        '<h3 class="font-headline-sm text-headline-sm mt-1">' + esc(title) + '</h3>' +
        '<p class="text-body-sm text-on-surface-variant">' + esc(author) + '</p></div></div>' +
        (note ? '<blockquote class="mt-3 text-body-sm italic text-on-surface-variant border-l-2 pl-3" style="border-color:#C26D53">' + esc(note) + '</blockquote>' : '') +
        '<div class="mt-3 flex items-center justify-between"><span class="text-[11px] uppercase tracking-wide text-on-surface-variant">Hearth Log · new</span>' +
        '<button class="bookmark-btn text-secondary" aria-label="Save"><span aria-hidden="true" class="material-symbols-outlined text-[20px]">bookmark</span></button></div>';
      var grid = $("section.grid");
      grid.insertBefore(art, grid.firstChild);
      var added = store.get("added", []); added.unshift({ title: title, author: author, fmt: fmt, shelf: shelfKey, label: shelfLabel, note: note }); store.set("added", added);
      tagBookCards($$("section.grid article"));
      refresh();
      closeModal();
      toast(later ? "Saved for later in your Sanctuary" : "“" + title + "” inscribed into your Sanctuary");
    }
    var submit = $("#submitModalBtn"); if (submit) submit.addEventListener("click", function () { addBook(false); });
    var shelve = $$("button").filter(function (b) { return /Shelve for Later/.test(cardText(b)); })[0];
    if (shelve) shelve.addEventListener("click", function () { addBook(true); });

    var print = $$("button").filter(function (b) { return /Ex Libris Print/.test(cardText(b)); })[0];
    if (print) print.addEventListener("click", function () { done(print, "Opening print view"); setTimeout(function () { window.print(); }, 300); });

    // restore previously added books
    store.get("added", []).slice().reverse().forEach(function (b) {
      var art = document.createElement("article");
      art.className = "group relative flex flex-col bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all";
      art.innerHTML =
        '<div class="flex gap-space-md"><div class="relative w-28 h-40 shrink-0 rounded-lg overflow-hidden shadow-sm" style="background:linear-gradient(160deg,#6a5b58,#3a2e2b)"><div class="absolute inset-y-0 left-0 w-2 bg-black/25"></div></div>' +
        '<div class="flex-1"><span class="text-[11px] uppercase tracking-wide text-on-surface-variant">' + esc(b.fmt) + '</span> ' +
        '<span class="shelf-badge text-[11px] px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">' + esc(b.label) + '</span>' +
        '<h3 class="font-headline-sm text-headline-sm mt-1">' + esc(b.title) + '</h3><p class="text-body-sm text-on-surface-variant">' + esc(b.author) + '</p></div></div>' +
        (b.note ? '<blockquote class="mt-3 text-body-sm italic text-on-surface-variant border-l-2 pl-3" style="border-color:#C26D53">' + esc(b.note) + '</blockquote>' : '');
      $("section.grid").insertBefore(art, $("section.grid").firstChild);
    });
    tagBookCards($$("section.grid article")); refresh();
  }
  function esc(s) { return (s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ================= COMMUNITY — The Tea Table ================= */
  function catFromTab(label) {
    if (/All Whispers/i.test(label)) return "all";
    if (/Book Suggestions/i.test(label)) return "suggestion";
    if (/Deep Reviews/i.test(label)) return "review";
    if (/Spoiler-Free Questions/i.test(label)) return "question";
    return "all";
  }
  function tagCommunity() {
    $$("article").forEach(function (a, i) {
      if (a.dataset.tagged) return; a.dataset.tagged = "1"; a.dataset.index = i;
      var t = cardText(a);
      a.dataset.category = /Curated Suggestion|Suggestion/i.test(t) ? "suggestion" :
        /Deep Review/i.test(t) ? "review" : /Reading Inquiry|Looking for|Question/i.test(t) ? "question" : "circle";
    });
  }
  function initCommunity() {
    tagCommunity();
    applyFn = function () {
      $$("article").forEach(function (a) {
        if (a.dataset.category === "circle") { a.classList.remove("fh-hidden"); return; }
        var ok = filter.category === "all" || a.dataset.category === filter.category;
        if (ok && filter.search) ok = cardText(a).toLowerCase().indexOf(filter.search) > -1;
        a.classList.toggle("fh-hidden", !ok);
      });
    };
    $$("button").filter(function (b) { return /All Whispers|Book Suggestions|Deep Reviews|Spoiler-Free Questions/.test(cardText(b)); }).forEach(function (tab) {
      tab.addEventListener("click", function () {
        tab.dataset.fhDone = "1";
        $$("button").filter(function (b) { return /rounded-full/.test(b.className) && /All Whispers|Book Suggestions|Deep Reviews|Spoiler-Free Questions/.test(cardText(b)); }).forEach(function (p) { p.classList.remove("bg-primary-container", "text-surface", "shadow-sm"); p.classList.add("bg-surface-container-low", "text-on-surface-variant"); });
        tab.classList.remove("bg-surface-container-low", "text-on-surface-variant"); tab.classList.add("bg-primary-container", "text-surface", "shadow-sm");
        filter.category = catFromTab(cardText(tab));
        applyFn();
        toast(clean(tab.textContent).replace(/\d+$/, "").trim());
      });
    });

    $$("button").filter(function (b) { return /Join table/i.test(cardText(b)); }).forEach(function (b, i) {
      b.dataset.key = "join:" + i;
      wireToggle(b, "Joined ✓", "Join table →", { on: "You joined this circle", off: "Left the circle" });
    });

    $$("button").filter(function (b) { return /Teacups/i.test(cardText(b)); }).forEach(function (b, i) {
      wireCounter(b, "ctea:" + i, "teacup");
    });

    $$("button").filter(function (b) { return /Slip into Reading List|bookmark_add/.test(cardText(b)) && !/Teacup/.test(cardText(b)); }).forEach(function (b, i) {
      b.addEventListener("click", function () { var s = store.get("saved", {}); var k = "slip" + i; s[k] = !s[k]; store.set("saved", s); done(b, s[k] ? "Slipped into your reading list" : "Removed from reading list"); });
    });

    // "Add whisper": opens a real composer in the Topic-of-the-Hearth card,
    // posting inserts the whisper and bumps the "19 responses" count.
    $$("button").filter(function (b) { return /Add whisper/i.test(cardText(b)); }).forEach(function (b, i) {
      b.dataset.key = "whost:" + i;
      var host = b.closest("section") || b.closest("div");
      var countEl = host ? $$("span", host).filter(function (s) { return /^\d+ responses?$/i.test(clean(s.textContent)); })[0] : null;
      var box = null;
      var open = store.get("whopen:" + i, false);
      function show() {
        if (box) return;
        box = makeComposer(host, "Whisper your thought at the table…", function (v) {
          var posts = store.get("whispers", []); posts.unshift(v); store.set("whispers", posts);
          if (countEl) setLeadingNum(countEl, leadingNum(countEl.textContent) + 1);
          var el = document.createElement("p");
          el.className = "text-body-sm italic text-on-surface-variant border-l-2 border-secondary pl-3";
          el.innerHTML = '<strong class="not-italic">You:</strong> ' + esc(v);
          host.insertBefore(el, b.parentNode === host ? b : null);
          toast("Your whisper was shared at the table");
        });
      }
      function hide() { if (box) { box.remove(); box = null; } }
      if (open) show();
      b.addEventListener("click", function () {
        open = !open; store.set("whopen:" + i, open);
        if (open) { show(); b.textContent = "Close whisper"; box.querySelector("textarea").focus(); }
        else { hide(); b.textContent = "Add whisper"; }
        b.dataset.fhDone = "1";
      });
    });

    // Reply / Reflections / Responses buttons: open a composer under the card,
    // posting appends a reply line and bumps the leading number.
    $$("button").filter(function (b) { return /^\d+ (Thoughtful Replies|Reflections|Responses)$/i.test(cardText(b)); }).forEach(function (b, i) {
      var art = b.closest("article") || $("main");
      var labelEl = b.querySelector("span:not([aria-hidden])");
      var key = "rep:" + (art.dataset.index || i);
      var n = leadingNum(cardText(b)) + (store.get(key, 0) || 0);
      var box = null;
      function paint() { if (labelEl) setLeadingNum(labelEl, n); }
      function hide() { if (box) { box.remove(); box = null; } }
      function show() {
        if (box) return;
        box = makeComposer(art, "Add your reply…", function (v) {
          var line = document.createElement("p");
          line.className = "text-body-sm text-on-surface-variant border-l-2 border-primary-container pl-3 mt-2";
          line.innerHTML = "<strong>You:</strong> " + esc(v);
          art.appendChild(line);
          n += 1; store.set(key, (store.get(key, 0) || 0) + 1); paint(); hide();
          toast("Reply added");
        });
      }
      paint();
      b.dataset.fhDone = "1";
      b.addEventListener("click", function () {
        if (box) { hide(); return; }
        show();
        box.querySelector("textarea").focus();
      });
    });

    // "N Saved" buttons: bookmark toggle with live count, persisted.
    $$("button").filter(function (b) { return /^\d+ Saved$/i.test(cardText(b)); }).forEach(function (b, i) {
      var key = "sv:" + i;
      var labelEl = b.querySelector("span:not([aria-hidden])");
      var iconEl = b.querySelector(".material-symbols-outlined");
      var base = leadingNum(cardText(b));
      var on = store.get(key, false);
      function paint() {
        if (labelEl) setLeadingNum(labelEl, base + (on ? 1 : 0));
        if (iconEl) iconEl.textContent = on ? "bookmarks" : "bookmark";
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.classList.toggle("text-secondary", on);
      }
      b.dataset.fhDone = "1";
      b.addEventListener("click", function () { on = !on; store.set(key, on); paint(); toast(on ? "Saved to your shelf" : "Removed from saved"); });
      paint();
    });

    // Bare bookmark icon buttons (no label): simple saved toggle.
    $$("button").filter(function (b) { var ic = b.querySelector(".material-symbols-outlined"); return ic && /^(bookmark|bookmarks|bookmark_add|bookmark_added)$/.test(clean(ic.textContent)) && !cardText(b); }).forEach(function (b, i) {
      var key = "bm:" + i;
      var iconEl = b.querySelector(".material-symbols-outlined");
      var offIcon = clean(iconEl.textContent);
      var on = store.get(key, false);
      function paint() {
        iconEl.textContent = on ? (offIcon === "bookmark_add" ? "bookmark_added" : "bookmarks") : offIcon;
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.classList.toggle("text-secondary", on);
      }
      b.dataset.fhDone = "1";
      b.addEventListener("click", function () { on = !on; store.set(key, on); paint(); toast(on ? "Added to your shelf" : "Removed from your shelf"); });
      paint();
    });

    // Send-icon buttons (e.g. "Request quiet companion")
    $$("button").filter(function (b) { var ic = b.querySelector(".material-symbols-outlined"); return ic && clean(ic.textContent) === "send"; }).forEach(function (b) {
      b.addEventListener("click", function () { b.dataset.fhDone = "1"; toast("Sent — a quiet companion is on the way"); });
    });

    $$("button").filter(function (b) { return /Start a Cozy Reading Circle/.test(cardText(b)); }).forEach(function (b) { b.addEventListener("click", function () { done(b, "New circle started — invite friends from your hearth"); }); });
    $$("button").filter(function (b) { return /Recalculate My Companion Match/.test(cardText(b)); }).forEach(function (b) { b.addEventListener("click", function () { done(b, "Finding a quiet companion for your chapter…"); }); });
    $$("button").filter(function (b) { var ic = b.querySelector(".material-symbols-outlined"); return /^share$/i.test(cardText(b)) || (ic && clean(ic.textContent) === "share" && !cardText(b)); }).forEach(function (b) {
      b.addEventListener("click", function () { try { navigator.clipboard.writeText(location.href); } catch (e) {} done(b, "Link copied to share"); });
    });
  }

  /* ================= WORKSHOP — Ink & Quill ================= */
  function initWorkshop() {
    $$("article").forEach(function (a, i) { a.dataset.tagged = "1"; a.dataset.index = i; });
    var drafts = $$("article");
    var FORMAT_RE = {
      "unfinished novella (wip)": /wip|unfinished|chapter \d+ of/i,
      "complete draft": /complete/i,
      "single chapter / prologue": /single chapter|prologue|chapter \d+ of/i,
      "poetry collection": /poetry/i,
      "character study": /character/i
    };
    function visibleDrafts() { return drafts.filter(function (d) { return !d.classList.contains("fh-hidden"); }); }
    applyFn = function () {
      var re = filter.format === "all" ? null : FORMAT_RE[filter.format];
      drafts.forEach(function (d) {
        var ok = !re || re.test(cardText(d));
        if (ok && filter.search) ok = cardText(d).toLowerCase().indexOf(filter.search) > -1;
        d.classList.toggle("fh-hidden", !ok);
      });
    };

    $$(".filter-format").forEach(function (pill) {
      pill.addEventListener("click", function () {
        var label = cardText(pill);
        $$(".filter-format").forEach(function (p) { p.classList.remove("bg-primary-container", "text-surface", "shadow-sm"); });
        pill.classList.add("bg-primary-container", "text-surface", "shadow-sm");
        filter.format = /All Shelves/i.test(label) ? "all" : label.toLowerCase();
        applyFn();
        if (filter.format !== "all" && visibleDrafts().length === 0) {
          filter.format = "all"; applyFn();
          $$(".filter-format").forEach(function (p) { p.classList.remove("bg-primary-container", "text-surface", "shadow-sm"); });
          var allPill = $$(".filter-format").filter(function (p) { return /All Shelves/.test(cardText(p)); })[0];
          if (allPill) allPill.classList.add("bg-primary-container", "text-surface", "shadow-sm");
          done(pill, "No “" + label + "” drafts yet — showing all shelves");
        } else {
          done(pill, label);
        }
      });
    });

    $$(".filter-feedback").forEach(function (pill) {
      pill.addEventListener("click", function () { pill.classList.toggle("bg-secondary-fixed"); var on = pill.classList.contains("bg-secondary-fixed"); done(pill, (on ? "Filtering for " : "Cleared ") + cardText(pill)); });
    });

    drafts.forEach(function (d, i) {
      $$("button", d).filter(function (b) { return /Pledge Encouragement/.test(cardText(b)); }).forEach(function (b) { wirePledge(b, "pledge:" + i); });
      $$("button", d).filter(function (b) { return /Read Chapter|Read Complete Manuscript/.test(cardText(b)); }).forEach(function (b) { b.addEventListener("click", function () { done(b, "Opening the reading room…"); }); });
      $$("button", d).filter(function (b) { return /Leave Margin Feedback|Add Line Suggestion/.test(cardText(b)); }).forEach(function (b) { b.addEventListener("click", function () { done(b, "Select any line in the draft to leave a margin note"); }); });
    });

    var modal = $("#new-draft-modal");
    function closeModal() { if (modal) { modal.classList.add("hidden"); modal.classList.remove("flex"); } }
    var open = $("#open-new-draft-btn"); if (open) open.addEventListener("click", function () { if (modal) { modal.classList.remove("hidden"); modal.classList.add("flex"); } });
    ["close-modal-btn", "cancel-modal-btn"].forEach(function (id) { var b = $("#" + id); if (b) b.addEventListener("click", closeModal); });
    if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

    function submitDraft() {
      if (!modal) return;
      var title = clean($("input[type=text]", modal).value) || "Untitled Draft";
      var selects = $$("select", modal);
      var fmt = selects[0] ? clean(selects[0].options[selects[0].selectedIndex].text) : "Draft";
      var inputs = $$("input[type=text]", modal);
      var author = inputs[1] ? clean(inputs[1].value) : "@you";
      var art = document.createElement("article");
      art.className = "bg-surface-container-lowest rounded-xl p-space-lg sm:p-space-xl shadow-md transition-all hover:shadow-lg";
      art.innerHTML = '<div class="flex items-center gap-2 text-body-sm text-on-surface-variant"><span class="px-2 py-0.5 rounded-full" style="background:#6E7F6B22;color:#6E7F6B">' + esc(fmt) + "</span><span>· new draft</span></div>" +
        '<h3 class="font-headline-md text-headline-md mt-2">' + esc(title) + "</h3><p class='text-body-sm text-on-surface-variant'>by " + esc(author) + "</p>";
      var host = drafts[0] || $("main"); host.parentNode.insertBefore(art, host);
      drafts.push(art);
      var added = store.get("drafts", []); added.unshift({ title: title, fmt: fmt, author: author }); store.set("drafts", added);
      closeModal(); toast("“" + title + "” placed on the Hearth shelves");
    }
    var place = $$("button").filter(function (b) { return /Place on Hearth Shelves/.test(cardText(b)); })[0];
    if (place) place.addEventListener("click", submitDraft);

    store.get("drafts", []).slice().reverse().forEach(function (d) {
      var art = document.createElement("article");
      art.className = "bg-surface-container-lowest rounded-xl p-space-lg sm:p-space-xl shadow-md transition-all hover:shadow-lg";
      art.innerHTML = '<div class="flex items-center gap-2 text-body-sm text-on-surface-variant"><span class="px-2 py-0.5 rounded-full" style="background:#6E7F6B22;color:#6E7F6B">' + esc(d.fmt) + "</span><span>· your draft</span></div><h3 class='font-headline-md text-headline-md mt-2'>" + esc(d.title) + "</h3><p class='text-body-sm text-on-surface-variant'>by " + esc(d.author) + "</p>";
      var host = $$("article")[0] || $("main"); host.parentNode.insertBefore(art, host);
    });

    $$("button").filter(function (b) { return /Publish Chapter/.test(cardText(b)); }).forEach(function (b) { b.addEventListener("click", function () { done(b, "Chapter published for gentle review"); }); });
    $$("button").filter(function (b) { return /Read \d+ New Critiques/.test(cardText(b)); }).forEach(function (b) { b.addEventListener("click", function () { done(b, "Opening your new critiques"); }); });
    $$("button").filter(function (b) { return /Join \d+ Writers/.test(cardText(b)); }).forEach(function (b) { b.dataset.key = "joinwriters"; wireToggle(b, "Joined ✓", "Join " + (cardText(b).match(/\d+/) || ["34"])[0] + " Writers", { on: "You joined the prompt", off: "Left the prompt" }); });
    $$("button").filter(function (b) { return /Etiquette Creed/.test(cardText(b)); }).forEach(function (b) { b.addEventListener("click", function () { done(b, "Kindness first: critique the work, never the writer"); }); });
  }

  /* ================= DISCOVERY extras (quiz handled inline) ================= */
  function initDiscovery() {
    $$("button").filter(function (b) { return /Reserve/.test(cardText(b)); }).forEach(function (b) {
      b.dataset.key = null;
      b.addEventListener("click", function () { var q = store.get("queue", 0) + 1; store.set("queue", q); done(b, "Reserved — added to your Sanctuary (" + q + ")"); });
    });
    $$("button").filter(function (b) { return /Inspect Edition/.test(cardText(b)); }).forEach(function (b) { b.addEventListener("click", function () { done(b, "Opening edition details"); }); });
    $$("button").filter(function (b) { return /Nominate a Gem/.test(cardText(b)); }).forEach(function (b) { b.addEventListener("click", function () { done(b, "Nominated — the Hearth Guild will review it"); }); });
    $$("button").filter(function (b) { return /Begin Quiz/.test(cardText(b)); }).forEach(function (b) { b.addEventListener("click", function () { var q = $("#quiz-q1"); if (q) q.scrollIntoView({ behavior: "smooth", block: "center" }); done(b, "Answer two questions to find your match"); }); });

    // Page-tier + aesthetic chips really filter the recommendation shelf
    var recs = $$(".grid.md\\:grid-cols-3 > div.group");
    var TIER = { "200": function (n) { return n < 200; }, "400": function (n) { return n >= 200 && n <= 400; }, "hi": function (n) { return n > 400; } };
    var tier = "400"; // the pill pre-selected in the markup ("200 – 400p")
    var CHIP_RE = {
      cozy: /cozy|solitar|solitude|quiet/i,
      cottage: /cottage|botanic|garden|plant|greenhouse/i,
      magic: /magic|fantasy|spell|dream/i,
      phil: /philosoph|meditation|memory|grief/i,
      press: /indie|small press|unreleased/i
    };
    var emptyMsg = document.createElement("p");
    emptyMsg.className = "text-body-sm text-on-surface-variant italic py-6 text-center";
    emptyMsg.textContent = "No books here right now — try widening the volume or turning off an aesthetic.";
    function pagesOf(card) { var m = /(\d+)\s*pages?/i.exec(cardText(card)); return m ? parseInt(m[1], 10) : 0; }
    var NOOK_AESTHETICS = { cozy: "Cozy Solitude", cottage: "Cottagecore & Botanicals", magic: "Warm Magical Realism", phil: "Quiet Philosophical", press: "Indie & Unreleased Small Presses" };
    function chipKey(label) {
      var l = label.toLowerCase();
      if (/cozy solitude/.test(l)) return "cozy";
      if (/cottagecore/.test(l)) return "cottage";
      if (/magical realism/.test(l)) return "magic";
      if (/philosophical/.test(l)) return "phil";
      if (/small presses/.test(l)) return "press";
      return null;
    }
    function activeChips() {
      return $$(".deep-chip.active").map(function (c) { return chipKey(cardText(c)); }).filter(Boolean);
    }
    function applyNook() {
      var show = recs.filter(function (c) { return TIER[tier](pagesOf(c)); });
      var chips = activeChips();
      if (chips.length) {
        var narrower = show.filter(function (c) {
          var t = cardText(c);
          return chips.some(function (ch) { return CHIP_RE[ch].test(t); });
        });
        if (narrower.length) show = narrower;
        else toast("Nothing matches “" + cardText($$(".deep-chip.active")[0]) + "” in this range — showing the shelf as is");
      }
      recs.forEach(function (c) { c.classList.toggle("fh-hidden", show.indexOf(c) === -1); });
      var grid = recs[0] && recs[0].parentNode;
      if (grid) { if (show.length === 0) grid.appendChild(emptyMsg); else if (emptyMsg.parentNode === grid) emptyMsg.remove(); }
    }
    function paintChip(chip, on) {
      chip.classList.toggle("active", on);
      chip.classList.toggle("bg-primary-container", on);
      chip.classList.toggle("text-surface", on);
      chip.classList.toggle("bg-surface-container-low", !on);
      chip.classList.toggle("text-on-surface", !on);
    }
    function paintPill(pill) {
      $$(".filter-pill").forEach(function (p) {
        var sel = p === pill;
        p.classList.toggle("active", sel);
        p.classList.toggle("bg-primary", sel);
        p.classList.toggle("text-on-primary", sel);
        p.classList.toggle("bg-surface-container-low", !sel);
        p.classList.toggle("text-on-surface", !sel);
      });
    }
    function paintTier(btn) {
      $$(".page-tier-btn").forEach(function (b) {
        var sel = b === btn;
        b.classList.toggle("active", sel);
        b.classList.toggle("bg-primary", sel);
        b.classList.toggle("text-on-primary", sel);
        b.classList.toggle("bg-surface", !sel);
        b.classList.toggle("text-on-surface", !sel);
      });
    }
    if (recs.length) {
      $$(".deep-chip").forEach(function (c) { paintChip(c, false); }); // start unfiltered so the whole shelf is visible
      $$(".page-tier-btn").forEach(function (btn) {
        var t = cardText(btn);
        btn.addEventListener("click", function () {
          tier = /400p\s*\+/.test(t) ? "hi" : /200/.test(t) && /400/.test(t) ? "400" : "200";
          paintTier(btn);
          applyNook();
          done(btn, tier === "hi" ? "Showing 400+ page doorstops" : tier === "400" ? "Showing 200–400 page books" : "Showing books under 200 pages");
        });
      });
      $$(".deep-chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          paintChip(chip, !chip.classList.contains("active"));
          applyNook();
          var on = chip.classList.contains("active");
          chip.dataset.fhDone = "1";
          var k = chipKey(cardText(chip));
          toast(on ? "Filtering by " + (NOOK_AESTHETICS[k] || "aesthetic") : "Aesthetic filter cleared");
        });
      });
      applyNook();
    }

    // Generator pills: Roll cycles a pool narrowed by the chosen pill
    var GEN = [
      { title: "The Travelling Cat Chronicles", author: "Hiro Arikawa • 288 pages", rating: "4.7", reason: "Bittersweet, profoundly warm road trip across coastal Japan narrated through feline pragmatism and unconditional companionship." },
      { title: "The Kamogawa Food Detectives", author: "Hisashi Kashiwai • 208 pages", rating: "4.6", reason: "A hidden Kyoto diner recreates unforgettable meals from visitors' pasts. Pure emotional nourishment." },
      { title: "What You Are Looking For Is in the Library", author: "Michiko Aoyama • 272 pages", rating: "4.8", reason: "An eccentric Tokyo librarian offers unexpected reading recommendations alongside handmade felt tokens that gently alter life trajectories." },
      { title: "The Elegance of the Hedgehog", author: "Muriel Barbery • 325 pages", rating: "4.5", reason: "An ultra-erudite Paris concierge hiding behind unassuming facade. Deeply humorous philosophical reflections." },
      { title: "A Man Called Ove", author: "Fredrik Backman • 337 pages", rating: "4.6", reason: "A grumpy Swedish widower's rigid world is picketed by nosy neighbors — a funny, tender book about grief and belonging." },
      { title: "Gentlemen and Players", author: "Joel Harley • 400 pages", rating: "4.3", reason: "A twinkling murder plot at an elite English prep school, told with affection for golden-age detective fiction." }
    ];
    var genLabel = "Any length";
    $$(".filter-pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        paintPill(pill);
        genLabel = cardText(pill);
        done(pill, "The dice will now favor: " + genLabel);
      });
    });
    var rollBtn = $("#roll-dice-btn");
    if (rollBtn && recs.length) {
      var genIdx = -1;
      rollBtn.addEventListener("click", function () {
        rollBtn.dataset.fhDone = "1";
        var pool = GEN.filter(function (g) {
          var n = parseInt((g.author.match(/(\d+)\s*pages/i) || [0, 0])[1], 10);
          if (/under 300/i.test(genLabel)) return n < 300;
          if (/translated/i.test(genLabel)) return /Arikawa|Kashiwai|Aoyama|Barbery/.test(g.author);
          return true;
        });
        genIdx = (genIdx + 1) % pool.length;
        var pick = pool[genIdx];
        setTimeout(function () {
          var t = $("#gen-book-title"), a = $("#gen-book-author"), r = $("#gen-book-rating"), rs = $("#gen-book-reason");
          if (t) t.textContent = pick.title;
          if (a) a.textContent = pick.author;
          if (r) r.textContent = pick.rating;
          if (rs) rs.textContent = pick.reason;
          var nt = $("#nightstand-text"); if (nt) nt.textContent = "Add to Nightstand";
        }, 210);
        setTimeout(function () {
          if (store.get("nightstand", false)) {
            var s = $("#nightstand-text"); if (s) s.textContent = "Added to Nightstand";
            var nb = $("#add-nightstand-btn");
            if (nb) { nb.classList.remove("bg-secondary", "text-on-secondary"); nb.classList.add("bg-primary-container", "text-surface"); }
          }
          toast("The dice chose: " + pick.title);
        }, 260);
      });
    }

    // Quiz answers confirm your pick and are remembered between visits
    var q1 = $$(".quiz-btn-q1"), q2 = $$(".quiz-btn-q2");
    if (q1.length) {
      q1.forEach(function (b) { b.addEventListener("click", function () { store.set("q1", b.getAttribute("data-val")); done(b, "Scent saved: " + cardText(b).split(" ")[0]); }); });
      var sq1 = store.get("q1", null);
      if (sq1) { var m1 = q1.filter(function (b) { return b.getAttribute("data-val") === sq1; })[0]; if (m1) { q1.forEach(function (b) { b.classList.remove("bg-primary", "text-on-primary", "active"); b.classList.add("bg-surface-container-low", "text-on-surface"); }); m1.classList.remove("bg-surface-container-low", "text-on-surface"); m1.classList.add("bg-primary", "text-on-primary", "active"); } }
    }
    if (q2.length) {
      q2.forEach(function (b) { b.addEventListener("click", function () { store.set("q2", b.getAttribute("data-val")); done(b, "Style saved: " + cardText(b)); }); });
      var sq2 = store.get("q2", null);
      if (sq2) { var m2 = q2.filter(function (b) { return b.getAttribute("data-val") === sq2; })[0]; if (m2) { q2.forEach(function (b) { b.classList.remove("bg-primary", "text-on-primary", "active"); b.classList.add("bg-surface-container-low", "text-on-surface"); }); m2.classList.remove("bg-surface-container-low", "text-on-surface"); m2.classList.add("bg-primary", "text-on-primary", "active"); } }
    }
    // Nightstand button keeps its state saved
    var nsBtn = $("#add-nightstand-btn");
    if (nsBtn) {
      var ns = store.get("nightstand", false);
      function paintNs() {
        var txt = $("#nightstand-text");
        if (txt) txt.textContent = ns ? "Added to Nightstand" : "Add to Nightstand";
        nsBtn.classList.toggle("bg-primary-container", ns);
        nsBtn.classList.toggle("text-surface", ns);
        nsBtn.classList.toggle("bg-secondary", !ns);
        nsBtn.classList.toggle("text-on-secondary", !ns);
      }
      nsBtn.addEventListener("click", function () { ns = !ns; store.set("nightstand", ns); paintNs(); nsBtn.dataset.fhDone = "1"; toast(ns ? "Saved to your nightstand" : "Removed from your nightstand"); });
      paintNs();
    }
  }

  /* ---------- Global fallback: no action button should feel dead ---------- */
  var INLINE_OWNED = "#roll-dice-btn,#add-nightstand-btn,.quiz-btn-q1,.quiz-btn-q2,.deep-chip,.page-tier-btn,.filter-pill";
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn || btn.dataset.fhDone) return;
    if (btn.closest(INLINE_OWNED)) return;
    var t = cardText(btn);
    if (/^(search|menu|close|×)$/i.test(t)) return;
    // Only give feedback for buttons that look like actions, so decorative toggles (quiz options, chips) stay quiet.
    if (/\b(Log|Update|Add|Share|Queue|Reserve|Join|Read|Publish|Leave|Pledge|Start|Begin|Recalculate|Offer|Slip|Save|View|Sort|Print|Inspect|Nominate|Roll|Acquire|Move|Send|Explore|Submit|Inscribe|Place|Calculate|Copy|Follow|Request|Notify|Reveal|Try|Use|Open|Save)\b/i.test(t)) {
      setTimeout(function () { if (!btn._handledByInline) toast("✓ " + t.split(" ").slice(0, 4).join(" ")); }, 0);
    }
  });

  /* ---------- boot ---------- */
  function boot() {
    try {
      if (page === "index" || page === "") initIndex();
      else if (page === "bookshelf") initBookshelf();
      else if (page === "community") initCommunity();
      else if (page === "workshop") initWorkshop();
      else if (page === "discovery") initDiscovery();
      else refresh();
    } catch (err) { /* keep the site usable even if one feature fails */ if (window.console) console.log("fh:", err); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
