(function() {
  "use strict";

  window.dbg = {
    shuffle, buildQueue, stats, fmt, closeMenus, buildMenus, buildFlat,
    state: function() { return { N: N, queue: queue, idx: idx, results: results, cur: cur, errors: errors }; },
    setN: function(v) { N = v; }
  };

  var SITE = {
    "Nouns": {
      "Concrete": ["Astrolabe", "Portcullis", "Gramophone"],
      "Abstract": ["Serendipity", "Magnanimity", "Obsolescence"]
    },
    "Verbs": {
      "Action": ["Excavate", "Perambulate", "Genuflect"],
      "Stative": ["Subsist", "Pertain", "Comprise"]
    },
    "Descriptive": {
      "Adjectives": ["Ephemeral", "Labyrinthine", "Tempestuous"],
      "Adverbs": ["Surreptitiously", "Perfunctorily", "Inexorably"]
    },
    "Pronouns": {
      "Reflexive": ["Themselves", "Yourselves", "Oneself"],
      "Relative": ["Whomever", "Whichever", "Whosoever"]
    }
  };

  var PAGES = [];

  var countdownId;

  Object.keys(SITE).forEach(function(c) {
    Object.keys(SITE[c]).forEach(function(g) {
      SITE[c][g].forEach(function(p) { PAGES.push({ cat: c, grp: g, name: p }); });
    });
  });

  var ALPHA = PAGES.slice().sort(function(a, b) { return a.name.localeCompare(b.name); });

  var $ = function(id) {
    return document.getElementById(id);
  };

  function show(id) {
    ["setup", "run", "results"].forEach(function(s) { $(s).classList.toggle("hidden", s !== id); });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  var N, queue, idx, results, cur, t0, raf, errors, running, SEL = [true, true, true];
  var TESTS = [
    { title: "Nested menus" },
    { title: "Flat list" },
    { title: "Mixed" },
  ];

  function buildQueue() {
    queue = [];
    var t = 0;
    for (; t < 3; t++) {
      if (!SEL[t]) continue;
      var modes = [];
      var i = 0;
      if (t === 0) for (; i < N; i++) modes.push("menu");
      else if (t === 1) for (; i < N; i++) modes.push("flat");
      else {
        var m = Math.ceil(N / 2);
        for (; i < N; i++) modes.push(i < m ? "menu" : "flat");
        if (N % 2 === 1 && Math.random() < .5) {
          modes[m - 1] = "flat";
          modes[N - 1] = "menu";
        }
        shuffle(modes);
      }

      var pool = [];
      while (pool.length < N) pool = pool.concat(shuffle(PAGES.slice()));
      for (i = 0; i < N; i++) queue.push({ test: t, trial: i, mode: modes[i], target: pool[i] });
    }

    results = [];
  }

  function prepareTrial() {
    cur = queue[idx];
    running = false;
    errors = 0;
    $("errs").textContent = "";
    $("clock").textContent = "0.00";
    $("stest").textContent = TESTS[cur.test].title + " \u2014 trial " + (cur.trial + 1) + "/" + N;
    $("starget").textContent = "Press Start";
    $("mode").textContent = cur.mode === "menu" ? "Menu navigation" : "All pages";
    $("menus").classList.toggle("hidden", cur.mode !== "menu");
    $("flat").classList.toggle("hidden", cur.mode !== "flat");

    if (cur.mode === "menu") buildMenus(); else buildFlat();

    $("browser").classList.add("locked");
    $("start").classList.remove("hidden");
    show("run");
    $("start").focus();
  }

  function startTrial() {
    var n = 3;
    $("start").classList.add("hidden");
    $("starget").textContent = n;
    countdownId = setInterval(function() {
      n--;
      if (n > 0) { $("starget").textContent = n; return; }
      clearInterval(countdownId);
      reveal();
    }, 1000);
  }

  function reveal() {
    $("starget").textContent = cur.target.name;
    $("browser").classList.remove("locked");
    running = true;
    t0 = performance.now();
    tick();
    var first = cur.mode === "menu" ? $("menus").querySelector(".top") : $("flat").firstChild;
    if (first) first.focus();
  }

  function tick() {
    if (!running) return;
    $("clock").textContent = ((performance.now() - t0) / 1000).toFixed(2);
    raf = requestAnimationFrame(tick);
  }

  function miss() {
    if (!running) return;
    errors++;
    $("errs").textContent = errors + (errors === 1 ? " miss" : " misses");
  }

  function hit() {
    if (!running) return;
    var ms = performance.now() - t0;
    running = false;
    cancelAnimationFrame(raf);
    $("clock").textContent = (ms / 1000).toFixed(2);
    results.push({ test: cur.test, trial: cur.trial + 1, mode: cur.mode, ms: ms, errors: errors, target: cur.target.name });
    idx++;
    if (idx < queue.length) prepareTrial(); else showResults();
  }

  function closeMenus() {
    $("menus").querySelectorAll(".open").forEach(function(n) { n.classList.remove("open"); });
  }

  function buildMenus() {
    var box = $("menus");
    box.textContent = "";

    function openTop(mi) {
      closeMenus();
      mi.classList.add("open");
    }

    function anyOpen() {
      return !!box.querySelector(".mi.open");
    }

    Object.keys(SITE).forEach(function(c) {
      var mi = el("div", null, "mi");
      var top = el("div", c, "top");
      top.onclick = function() { if (mi.classList.contains("open")) closeMenus(); else openTop(mi); };

      top.onmouseenter = function() { if (anyOpen() && !mi.classList.contains("open")) openTop(mi); };

      var dd = el("div", null, "dd");

      Object.keys(SITE[c]).forEach(function(g) {
        var sub = el("div", null, "sub");
        var item = el("button", g, "item");
        item.appendChild(el("span", "\u25B8"));

        function openSub() {
          sub.parentNode.querySelectorAll(".sub.open").forEach(function(n) { n.classList.remove("open"); });
          sub.classList.add("open");
        }

        item.onclick = openSub;
        item.onmouseenter = openSub;
        var fly = el("div", null, "dd fly");
        SITE[c][g].forEach(function(p) {
          var b = el("button", p, "leaf");
          b.onclick = function() {
            var ok = p === cur.target.name && g === cur.target.grp && c === cur.target.cat;
            closeMenus();
            if (ok) hit(); else miss(box);

          };
          fly.appendChild(b);
        });
        sub.appendChild(item);
        sub.appendChild(fly);
        dd.appendChild(sub);
      });
      mi.appendChild(top);
      mi.appendChild(dd);
      box.appendChild(mi);
    });
  }

  function buildFlat() {
    var box = $("flat");
    box.textContent = "";
    ALPHA.forEach(function(p) {
      var b = el("button", p.name);
      b.onclick = function() { if (p.name === cur.target.name) hit(); else miss(b); };
      box.appendChild(b);
    });
  }

  function stats(list) {
    if (!list.length) return null;
    var t = list.map(function(r) { return r.ms; }).sort(function(a, b) { return a - b; });
    var sum = t.reduce(function(a, b) { return a + b; }, 0);
    var mid = t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2;
    return { n: t.length, mean: sum / t.length, med: mid, best: t[0], err: list.reduce(function(a, r) { return a + r.errors; }, 0) };
  }

  function fmt(ms) {
    return (ms / 1000).toFixed(2) + " s";
  }

  function showResults() {
    var tb = $("table");
    tb.textContent = "";
    var head = el("tr");
    ["Test", "Trials", "Mean", "Median", "Best", "Misses"].forEach(function(h) { head.appendChild(el("th", h)); });
    tb.appendChild(head);
    function addRow(name, list, sub) {
      var s = stats(list);
      if (!s) return;
      var tr = el("tr");
      var c = el("td", name);
      if (sub) c.className = "sub";
      tr.appendChild(c);
      [s.n, fmt(s.mean), fmt(s.med), fmt(s.best), s.err].forEach(function(v) { tr.appendChild(el("td", String(v), "mono")); });
      tb.appendChild(tr);
    }

    [0, 1, 2].forEach(function(t) {
      var list = results.filter(function(r) { return r.test === t; });
      addRow(TESTS[t].title, list, false);
      if (t === 2) {
        addRow("Nested menu trials", list.filter(function(r) { return r.mode === "menu"; }), true);
        addRow("Flat list trials", list.filter(function(r) { return r.mode === "flat"; }), true);
      }
    });
    show("results");
  }

  function csvField(v) {
    return '"' + String(v).replace(/"/g, '""') + '"';
  }

  function downloadCSV() {
    var totals = {};
    results.forEach(function(r) { totals[r.test] = (totals[r.test] || 0) + r.ms; });

    var lines = ["test,trial,mode,target,time_ms,misses,test_total_ms"];
    results.forEach(function(r) {
      lines.push([
        csvField(TESTS[r.test].title),
        r.trial,
        r.mode,
        csvField(r.target),
        r.ms.toFixed(1),
        r.errors,
        totals[r.test].toFixed(1)
      ].join(","));
    });

    var stamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], { type: "text/csv" }));
    a.download = "nav-results-" + stamp + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-test]"), function(btn) {
    btn.onclick = function() {
      var v = parseInt($("n").value, 10);
      if (!(v >= 1)) v = 1;
      if (v > 20) v = 20;
      N = v;
      $("n").value = v;
      SEL = [false, false, false];
      SEL[+btn.getAttribute("data-test")] = true;
      buildQueue();
      idx = 0;
      prepareTrial();
    };
  });

  $("start").onclick = startTrial;
  document.addEventListener("click", function(e) { if (!$("menus").contains(e.target)) closeMenus(); });
  document.addEventListener("keydown", function(e) { if (e.key === "Escape") closeMenus(); });

  $("quit").onclick = function() {
    clearInterval(countdownId);
    running = false;
    cancelAnimationFrame(raf);
    show("setup");
  };

  $("download").onclick = downloadCSV;

  $("again").onclick = function() { show("setup"); };


})();

