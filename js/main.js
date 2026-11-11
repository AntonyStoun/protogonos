/* ============================================================
   PROTOGONOS · main.js
   Контент · Живой редактор · Топографический фон · Плеер
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, p) { return (p || document).querySelector(s); };
  var $$ = function (s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ════════════════ КОНТЕНТ ════════════════ */
  var LS_DRAFT = "pg_draft_v1";
  var content = JSON.parse(JSON.stringify(window.PG_CONTENT));

  var draft = null;
  try { draft = JSON.parse(localStorage.getItem(LS_DRAFT)); } catch (e) { draft = null; }
  if (draft && draft.content) {
    content = draft.content;
    $("#draftbar").classList.add("show");
  }
  $("#draftok").addEventListener("click", function () { $("#draftbar").classList.remove("show"); });

  function renderArticle(sec) {
    var data = content[sec];
    if (!data) return;
    $('[data-edit="' + sec + '.kicker"]').textContent = data.kicker || "";
    $('[data-edit="' + sec + '.title"]').textContent = data.title || "";
    $('[data-edit="' + sec + '.sub"]').textContent = data.sub || "";

    var host = $("#" + sec + "-body");
    var frag = document.createDocumentFragment();
    var i = 0, blocks = data.blocks || [];
    while (i < blocks.length) {
      var b = blocks[i];
      if (b.k === "l") {
        var ul = document.createElement("ul"); ul.className = "blist";
        while (i < blocks.length && blocks[i].k === "l") {
          var li = document.createElement("li");
          li.className = "blk"; li.dataset.sec = sec; li.dataset.i = i;
          li.textContent = blocks[i].x;
          ul.appendChild(li); i++;
        }
        frag.appendChild(ul);
        continue;
      }
      var el;
      if (b.k === "h") { el = document.createElement("h3"); }
      else if (b.k === "f") {
        el = document.createElement("div"); el.className = "formula rv";
        var code = document.createElement("code"); code.className = "blk";
        code.dataset.sec = sec; code.dataset.i = i; code.textContent = b.x;
        var tag = document.createElement("span"); tag.className = "fx"; tag.textContent = "CALC";
        el.appendChild(code); el.appendChild(tag);
        frag.appendChild(el); i++; continue;
      }
      else if (b.k === "q") { el = document.createElement("blockquote"); el.className = "rv"; }
      else { el = document.createElement("p"); }
      el.classList.add("blk"); el.dataset.sec = sec; el.dataset.i = i;
      el.textContent = b.x;
      frag.appendChild(el);
      i++;
    }
    // порядок: сначала блоки текста, плита (figure) остаётся в конце
    var fig = $("figure.plate", host);
    host.textContent = "";
    host.appendChild(frag);
    if (sec === "chronicle" && fig) host.appendChild(fig);
  }

  renderArticle("manifest");
  renderArticle("chronicle");
  reveal();

  /* ════════════════ ЖИВОЙ РЕДАКТОР ════════════════ */
  var editing = false;

  function setEdit(on) {
    editing = on;
    document.body.classList.toggle("pg-edit", on);
    $$("[data-edit], .blk").forEach(function (el) {
      if (on) { el.setAttribute("contenteditable", "true"); }
      else { el.removeAttribute("contenteditable"); }
    });
    if (on && document.activeElement) document.activeElement.blur();
  }
  addEventListener("keydown", function (e) {
    if (e.ctrlKey && (e.key === "e" || e.key === "E" || e.key === "у" || e.key === "У")) {
      e.preventDefault(); setEdit(!editing);
    }
  });
  $("#edithint").addEventListener("click", function () { setEdit(!editing); });
  $("#edexit").addEventListener("click", function () { setEdit(false); });

  var saveTimer = null;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(LS_DRAFT, JSON.stringify({ t: Date.now(), content: content })); } catch (e) {}
    }, 600);
  }

  document.addEventListener("input", function (e) {
    if (!editing) return;
    var el = e.target.closest ? e.target.closest("[data-edit], .blk") : null;
    if (!el) return;
    var key = el.dataset.edit;
    if (key) {
      var path = key.split(".");
      content[path[0]][path[1]] = el.innerText;
    } else {
      content[el.dataset.sec].blocks[+el.dataset.i].x = el.innerText;
    }
    saveDraft();
  });

  $("#edreset").addEventListener("click", function () {
    if (!confirm("Сбросить локальный черновик и вернуться к опубликованным текстам?")) return;
    localStorage.removeItem(LS_DRAFT);
    location.reload();
  });

  /* публикация: собираем texts.js и отдаём файл */
  var modal = $("#modal");
  $("#edpublish").addEventListener("click", function () { modal.classList.add("show"); });
  $("#mclose").addEventListener("click", function () { modal.classList.remove("show"); });
  modal.addEventListener("click", function (e) { if (e.target === modal) modal.classList.remove("show"); });

  $("#mdownload").addEventListener("click", function () {
    content.published = new Date().toISOString().slice(0, 10);
    var head = "/* ============================================================\n" +
      "   PROTOGONOS — ТЕКСТЫ САЙТА\n" +
        "   Этот файл можно редактировать прямо на сайте (Ctrl+E → «Опубликовать»),\n" +
      "   либо на GitHub: Content → texts.js → карандаш.\n" +
      "   Формат понятен человеку: k — тип блока (p=абзац, h=подзаголовок,\n" +
      "   f=формула, q=большая цитата, l=пункт списка), x=текст.\n" +
      "   published: " + content.published + "\n" +
      "   ============================================================ */\n";
    var body = "window.PG_CONTENT = " + JSON.stringify(content, null, 2) + ";\n";
    var blob = new Blob([head + body], { type: "text/javascript;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "texts.js";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); modal.classList.remove("show"); }, 400);
  });

  /* ════════════════ НАВИГАЦИЯ ════════════════ */
  $$("[data-nav]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var t = document.getElementById(btn.dataset.nav);
      if (t) t.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  });
  var navBtns = $$(".navbtn");
  var spy = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (en.isIntersecting) {
        navBtns.forEach(function (b) { b.classList.toggle("active", b.dataset.nav === en.target.id); });
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["manifest", "chronicle", "transmission"].forEach(function (id) {
    var el = document.getElementById(id); if (el) spy.observe(el);
  });

  /* появление блоков */
  function reveal() {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    $$(".rv").forEach(function (el) { io.observe(el); });
  }

  /* ════════════════ ЧАСЫ ════════════════ */
  var clock = $("#clock");
  function tick() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    clock.textContent = p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }
  tick(); setInterval(tick, 1000);

  /* ════════════════ ПАРАЛЛАКС МЕХАНИЗМА ════════════════ */
  var mechWrap = $(".hero-mech");
  if (mechWrap && !reduced) {
    addEventListener("scroll", function () {
      var y = scrollY;
      if (y < innerHeight * 1.3) mechWrap.style.transform = "translate3d(0," + (y * 0.18).toFixed(1) + "px,0)";
    }, { passive: true });
  }

  /* ════════════════ ТОПОГРАФИЧЕСКИЙ ФОН ════════════════ */
  var topo = $("#topo"), tc = topo.getContext("2d");
  function sizeTopo() {
    topo.width = innerWidth * devicePixelRatio;
    topo.height = innerHeight * devicePixelRatio;
    tc.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  sizeTopo(); addEventListener("resize", sizeTopo);

  var t = 0, running = true;
  function drawTopo() {
    tc.clearRect(0, 0, innerWidth, innerHeight);
    var rows = 22, step = 7;
    for (var i = 0; i < rows; i++) {
      var y0 = (innerHeight / rows) * i + 20;
      tc.beginPath();
      for (var x = -20; x <= innerWidth + 20; x += step) {
        var y = y0
          + 18 * Math.sin(x * 0.0016 + t + i * 0.55)
          + 10 * Math.sin(x * 0.0037 - t * 1.4 + i * 1.7)
          + 5 * Math.sin(x * 0.0089 + t * 0.7 + i * 3.1);
        if (x === -20) tc.moveTo(x, y); else tc.lineTo(x, y);
      }
      tc.strokeStyle = "rgba(236,234,230," + (i % 6 === 0 ? 0.085 : 0.033) + ")";
      tc.lineWidth = 1;
      tc.stroke();
    }
    /* осевые оси чертежа */
    tc.strokeStyle = "rgba(226,55,43,0.10)";
    tc.beginPath();
    tc.moveTo(innerWidth * 0.5, 0); tc.lineTo(innerWidth * 0.5, innerHeight);
    tc.moveTo(0, innerHeight * 0.5); tc.lineTo(innerWidth, innerHeight * 0.5);
    tc.stroke();
  }
  function loop() {
    if (running) { t += 0.004; drawTopo(); }
    requestAnimationFrame(loop);
  }
  if (reduced) { drawTopo(); } else { loop(); }
  document.addEventListener("visibilitychange", function () { running = !document.hidden; });

  /* ════════════════ ПЛЕЕР TRANSMISSION ════════════════ */
  var player = $("#player"), vid = $("#vid");
  var bigplay = $("#bigplay"), pplay = $("#pplay"), mute = $("#mute");
  var tcode = $("#tcode"), track = $("#track"), fill = $("#trackfill"), thumb = $("#trackthumb");
  var vol = $("#vol"), volfill = $("#volfill");
  var viz = $("#viz"), vc = viz.getContext("2d");

  var fmt = function (s) {
    if (!isFinite(s)) return "00:00";
    var m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return (m < 10 ? "0" : "") + m + ":" + (ss < 10 ? "0" : "") + ss;
  };
  volfill.style.width = "80%"; vid.volume = 0.8;

  function togglePlay() {
    if (vid.paused) { initAudio(); vid.play(); } else { vid.pause(); }
  }
  bigplay.addEventListener("click", togglePlay);
  pplay.addEventListener("click", togglePlay);
  vid.addEventListener("click", togglePlay);

  vid.addEventListener("play", function () { player.classList.add("playing"); bigplay.classList.add("hide"); drawViz(); });
  vid.addEventListener("pause", function () { player.classList.remove("playing"); bigplay.classList.remove("hide"); });
  vid.addEventListener("ended", function () { player.classList.remove("playing"); bigplay.classList.remove("hide"); });
  vid.addEventListener("loadedmetadata", function () { tcode.textContent = "00:00 / " + fmt(vid.duration); });
  vid.addEventListener("timeupdate", function () {
    if (!seeking) {
      var r = vid.duration ? vid.currentTime / vid.duration : 0;
      fill.style.width = (r * 100) + "%"; thumb.style.left = (r * 100) + "%";
      tcode.textContent = fmt(vid.currentTime) + " / " + fmt(vid.duration);
    }
  });

  /* перемотка: клик и протяжка по линии */
  var seeking = false;
  function seekAt(e) {
    var rect = track.getBoundingClientRect();
    var r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (vid.duration) { vid.currentTime = r * vid.duration; fill.style.width = (r * 100) + "%"; thumb.style.left = (r * 100) + "%"; }
  }
  track.addEventListener("pointerdown", function (e) { seeking = true; track.setPointerCapture(e.pointerId); seekAt(e); });
  track.addEventListener("pointermove", function (e) { if (seeking) seekAt(e); });
  track.addEventListener("pointerup", function () { seeking = false; });

  /* громкость и звук вкл/выкл */
  function volAt(e) {
    var rect = vol.getBoundingClientRect();
    var r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    vid.volume = r; vid.muted = r === 0;
    volfill.style.width = (r * 100) + "%";
    player.classList.toggle("muted", vid.muted);
  }
  vol.addEventListener("pointerdown", function (e) { vol.setPointerCapture(e.pointerId); volAt(e); });
  vol.addEventListener("pointermove", function (e) { if (e.buttons === 1) volAt(e); });
  mute.addEventListener("click", function () {
    vid.muted = !vid.muted;
    player.classList.toggle("muted", vid.muted);
    volfill.style.width = vid.muted ? "0%" : (vid.volume * 100) + "%";
  });

  /* звуковой анализатор: 48 полос реального спектра */
  var an = null, freqData = null, vizOn = false;
  function initAudio() {
    if (an) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      var src = ctx.createMediaElementSource(vid);
      an = ctx.createAnalyser();
      an.fftSize = 128;
      src.connect(an); an.connect(ctx.destination);
      freqData = new Uint8Array(an.frequencyBinCount);
    } catch (e) { an = null; }
  }
  function sizeViz() {
    viz.width = viz.clientWidth * devicePixelRatio;
    viz.height = viz.clientHeight * devicePixelRatio;
    vc.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  function drawViz() {
    if (vizOn) return; vizOn = true;
    sizeViz();
    (function step() {
      if (!player.classList.contains("playing")) { vizOn = false; return; }
      var w = viz.clientWidth, h = viz.clientHeight;
      vc.clearRect(0, 0, w, h);
      var n = 48, bw = w / n;
      for (var i = 0; i < n; i++) {
        var v = 0.12;
        if (an) { an.getByteFrequencyData(freqData); v = freqData[Math.floor(i * freqData.length / n)] / 255; }
        v = Math.max(v, 0.06);
        vc.fillStyle = i % 8 === 0 ? "rgba(226,55,43,0.85)" : "rgba(236,234,230,0.28)";
        vc.fillRect(i * bw + 1, h - v * h, bw - 3, v * h);
      }
      requestAnimationFrame(step);
    })();
  }
  addEventListener("resize", function () { if (vizOn) sizeViz(); });

  /* ссылка на репозиторий: подставь адрес своего GitHub-репозитория */
  var REPO_URL = ""; // например: "https://github.com/USERNAME/protogonos"
  if (REPO_URL) { $("#ghlink").href = REPO_URL; }
})();
