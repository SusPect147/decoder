/* ============================================================
   РЕЖИМ «ОПЕРАЦИЯ ДЕШИФРОВЩИКА» — карточная кампания с прогрессией
   ✓ Карта агента: 4 локации (Лагерь → Квартал → Лаборатория → Бездна)
   ✓ Локации разблокируются по цепочке; каждая имеет мини-босса в конце
   ✓ Карточная система: hint/time/attempt + редкие freeze/shield/scanner
   ✓ Комбинирование: 6 рецептов синтеза для усиленных комбо-пакетов
   ✓ Таймер + попытки + история гадок (быки/коровы)

   ИСПРАВЛЕНО:
   — Утечка таймера (множественные интервалы) → гарантированное очищение
   — Баг с пропущенными цифрами (dataset.value не синхронизировался с input)
   — Ошибка логики hint+hint: теперь правильно проверяет >= 2, не > 1
   — Отсутствие проверки на успешность revealHint() → может вернуть false
   — Незащищённое комбинирование: может крашнуться при пустой базе карт
   — Нет guard-а от двойного submitGuess на мобильных → добавлен _submitGuard

   ИСПРАВЛЕНО (v2):
   — Прогресс и карточки синхронизируются с сервером (game_data.decoder_campaign):
     кросс-девайс, переживает чистку localStorage
   — «Заморозка» больше не стакает setTimeout и не перезапускает таймер
     на другом уровне/на карте
   — «Подсказка» не списывается, если все ячейки уже открыты
   — Открытые подсказкой ячейки нельзя стереть/перезаписать
   — Крафт во время уровня обновляет панель карточек
   — Редкость карточек теперь влияет на силу эффекта
   — Ребаланс сложности: попытки/время растут с длиной кода (Бездна играбельна)
   — С боссов гарантированно падает редкая+ карточка
   — История попыток ограничена 15 строками в DOM
   ============================================================ */
window.TestMode = (function () {
  'use strict';

  // ─── SVG-иконки ───
  const ICON = {
    hint:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>',
    time:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    attempt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
    combo:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/></svg>',
    camp:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L3 20h18L12 3z"/><path d="M12 9l-4 11M12 9l4 11"/></svg>',
    quarter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="7" height="12"/><rect x="14" y="4" width="7" height="17"/><path d="M6 13h1M6 17h1M17 8h1M17 12h1M17 16h1"/></svg>',
    lab:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-10V3"/><path d="M8 15h8"/></svg>',
    abyss:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',
    lock:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    freeze:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 7l-5-5-5 5M17 17l-5 5-5-5"/><path d="M2 12l5-3 5 3 5-3 5 3M2 12l5 3 5-3 5 3 5-3"/></svg>',
    shield:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    scanner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>'
  };

  // ─── Локации ───
  const ZONES = [
    { id: 'camp',    name: 'Тренировочный лагерь', from: 1,  to: 10,  color: '#58e89a', cells: 4, icon: ICON.camp,    desc: 'Основы взлома. Учись читать быков и коров.' },
    { id: 'quarter', name: 'Хакерский квартал',    from: 11, to: 30,  color: '#b36dff', cells: 5, icon: ICON.quarter, desc: 'Тёмные переулки кода. Шифры становятся длиннее.' },
    { id: 'lab',     name: 'Секретная лаборатория', from: 31, to: 60,  color: '#4dabff', cells: 6, icon: ICON.lab,     desc: 'Экспериментальные протоколы. Меньше времени, больше цифр.' },
    { id: 'abyss',   name: 'Цифровая бездна',       from: 61, to: 100, color: '#ff6b4a', cells: 7, icon: ICON.abyss,   desc: 'Глубинный слой сети. Сюда доходят только лучшие.' }
  ];
  const MAX_LEVEL = ZONES[ZONES.length - 1].to;

  // ─── Карточки ───
  const CARD_DEFS = {
    hint:    { name: 'Подсказка',  cls: 'hint',    icon: ICON.hint,    desc: 'Открывает верную цифру (легендарная — сразу две)' },
    time:    { name: 'Время',      cls: 'time',    icon: ICON.time,    desc: '+15/20/30 секунд к таймеру (по редкости)' },
    attempt: { name: 'Попытка',    cls: 'attempt', icon: ICON.attempt, desc: '+1 попытка (легендарная — +2)' },
    freeze:   { name: 'Заморозка',  cls: 'freeze',   icon: ICON.freeze,   desc: 'Стоп-кадр: таймер замирает на 12/16/24 сек (по редкости)' },
    shield:   { name: 'Щит',        cls: 'shield',    icon: ICON.shield,   desc: 'Следующая ошибка не сжигает попытку (не чаще 1 раза за уровень)' },
    scanner:  { name: 'Сканер',     cls: 'scanner',   icon: ICON.scanner,  desc: 'Исключает 2/3/все цифры, которых нет в пароле (по редкости); метки остаются на клавиатуре' }
  };
  const COMBO_DEFS = {
    hackpack: { name: 'Хакерский пакет',    icon: ICON.combo, desc: 'Открывает цифру И +15 секунд',      effects: ['hint', 'time'] },
    survival: { name: 'Протокол выживания', icon: ICON.combo, desc: '+1 попытка И +15 секунд',           effects: ['attempt', 'time'] },
    analysis: { name: 'Аналитический пакет', icon: ICON.combo, desc: 'Открывает цифру И +1 попытка',      effects: ['hint', 'attempt'] },
    icecrack:  { name: 'Ледяной взлом',     icon: ICON.combo, desc: 'Открывает цифру И замораживает таймер на 12с',   effects: ['hint', 'freeze'] },
    overdrive: { name: 'Овердрайв',          icon: ICON.combo, desc: 'Открывает сразу 2 цифры',                        effects: ['hint', 'hint'] },
    overload:  { name: 'Перегрузка',         icon: ICON.combo, desc: 'Щит И Сканер: следующая ошибка бесплатна и видны исключённые цифры', effects: ['shield', 'scanner'] }
  };
  const RECIPES = [
    { combo: 'hackpack', a: 'hint',    b: 'time' },
    { combo: 'survival', a: 'attempt', b: 'time' },
    { combo: 'analysis', a: 'hint',    b: 'attempt' },
    { combo: 'icecrack',   a: 'hint',    b: 'freeze'   },
    { combo: 'overdrive',  a: 'hint',    b: 'hint'     },
    { combo: 'overload',   a: 'shield',  b: 'scanner'  }
  ];
  const RARITIES = ['common', 'rare', 'legendary'];
  const RARITY_LABEL = { common: 'ОБЫЧНАЯ', rare: 'РЕДКАЯ', legendary: 'ЛЕГЕНДАРНАЯ' };

  // ─── Состояние уровня ───
  let level = null;       // { n, zone, isBoss, cells, attemptsLeft, time, secret, used, practice }
  let timerId = null;
  let _wiredKeypad = false;
  let _wiredOnce = false;

  // ============================================================
  //  ПЕРСИСТЕНТНОСТЬ
  // ============================================================
  function getProgress() {
    let v = parseInt(localStorage.getItem('decoder_test_progress') || '0', 10);
    if (isNaN(v) || v < 0) v = 0;
    return Math.min(v, MAX_LEVEL);
  }
  function setProgress(n) {
    localStorage.setItem('decoder_test_progress', String(Math.min(n, MAX_LEVEL)));
    _touch();
  }
  // Метка последнего локального изменения — для выбора более свежего снапшота
  // при слиянии с облачным сохранением.
  function _touch() {
    try { localStorage.setItem('decoder_test_updated', String(Date.now())); } catch (e) {}
    _snapshotToGameData();
  }

  function emptyCards() {
    return {
      hint:     { common: 0, rare: 0, legendary: 0 },
      time:     { common: 0, rare: 0, legendary: 0 },
      attempt:  { common: 0, rare: 0, legendary: 0 },
      freeze:   { common: 0, rare: 0, legendary: 0 },
      shield:   { common: 0, rare: 0, legendary: 0 },
      scanner:  { common: 0, rare: 0, legendary: 0 },
      hackpack: 0, survival: 0, analysis: 0,
      icecrack: 0, overdrive: 0, overload: 0
    };
  }
  // Приводит произвольный объект к валидной структуре карточек.
  function _cardsFrom(p) {
    const base = emptyCards();
    if (!p || typeof p !== 'object') return base;
    ['hint', 'time', 'attempt', 'freeze', 'shield', 'scanner'].forEach(t => {
      if (p[t]) RARITIES.forEach(r => { base[t][r] = Math.max(0, parseInt(p[t][r], 10) || 0); });
    });
    ['hackpack', 'survival', 'analysis', 'icecrack', 'overdrive', 'overload']
      .forEach(c => { base[c] = Math.max(0, parseInt(p[c], 10) || 0); });
    return base;
  }
  function getCards() {
    try {
      const raw = localStorage.getItem('decoder_test_cards');
      if (!raw) return emptyCards();
      return _cardsFrom(JSON.parse(raw));
    } catch (e) { return emptyCards(); }
  }
  function saveCards(c) {
    try { localStorage.setItem('decoder_test_cards', JSON.stringify(c)); } catch (e) {}
    _cloudDirty = true;
    _touch();
  }

  // ── Облачная синхронизация (Supabase) ──
  // Раньше прогресс и карточки жили ТОЛЬКО в localStorage: смена устройства
  // или чистка хранилища мини-аппа обнуляли кампанию. Теперь снапшот
  // { progress, cards, updated } хранится в game_data профиля.
  let _cloudDirty = false;
  let _lastPush = 0;

  // Обновляет in-memory game_data (без сети) — уедет на сервер со следующим save.
  function _snapshotToGameData() {
    try {
      if (!window.SupabaseAPI || !window.SupabaseAPI.gameData) return;
      const gd = window.SupabaseAPI.gameData;
      const prog = getProgress();
      gd.decoder_campaign = { progress: prog, cards: getCards(), updated: Date.now() };
      if (!gd.decoder_stats) gd.decoder_stats = {};
      gd.decoder_stats.campaign_clears = Math.max(gd.decoder_stats.campaign_clears || 0, prog);
      window.SupabaseAPI.gameData = gd;
    } catch (e) {}
  }

  // Немедленное сохранение профиля на сервер (через GameManager, чтобы
  // заодно синхронизировался трек «Агент операции»). Троттлинг 5с.
  function _pushCloud(force) {
    _snapshotToGameData();
    const now = Date.now();
    if (!force && now - _lastPush < 5000) { _cloudDirty = true; return; }
    _lastPush = now;
    _cloudDirty = false;
    try {
      if (typeof window.__decoderCampaignSave === 'function') window.__decoderCampaignSave();
      else if (window.SupabaseAPI && window.SupabaseAPI.saveScoreSecurely) {
        const gd = window.SupabaseAPI.gameData || {};
        window.SupabaseAPI.saveScoreSecurely(gd.decoder_best || 0, null, true);
      }
    } catch (e) {}
  }

  // Подтягивает облачный снапшот: прогресс — максимум из двух источников,
  // карточки — из более свежего (по метке updated).
  function hydrateFromCloud() {
    try {
      if (!window.SupabaseAPI || !window.SupabaseAPI.gameData) return;
      const c = window.SupabaseAPI.gameData.decoder_campaign;
      if (!c || typeof c !== 'object') return;
      const cloudProg = Math.max(0, Math.min(parseInt(c.progress, 10) || 0, MAX_LEVEL));
      const cloudUpd = Number(c.updated) || 0;
      const localUpd = parseInt(localStorage.getItem('decoder_test_updated') || '0', 10) || 0;
      if (c.cards && cloudUpd > localUpd) {
        try { localStorage.setItem('decoder_test_cards', JSON.stringify(_cardsFrom(c.cards))); } catch (e) {}
      }
      if (cloudProg > getProgress()) setProgress(cloudProg);
    } catch (e) {}
  }

  function totalOf(cards, type) {
    if (COMBO_DEFS[type]) return cards[type] || 0;
    return RARITIES.reduce((s, r) => s + (cards[type][r] || 0), 0);
  }
  function totalCardCount(cards) {
    let n = 0;
    ['hint', 'time', 'attempt', 'freeze', 'shield', 'scanner'].forEach(t => { n += totalOf(cards, t); });
    ['hackpack', 'survival', 'analysis', 'icecrack', 'overdrive', 'overload'].forEach(c => { n += cards[c]; });
    return n;
  }
  // Списывает одну карточку базового типа, начиная с самой обычной редкости.
  // Возвращает редкость списанной карточки (или null) — редкость усиливает эффект.
  function consumeBase(cards, type) {
    for (const r of RARITIES) {
      if (cards[type][r] > 0) { cards[type][r]--; return r; }
    }
    return null;
  }

  // ============================================================
  //  УТИЛИТЫ
  // ============================================================
  function _isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }
  function _haptic(kind, val) {
    if (window.WebApp && window.WebApp.HapticFeedback) {
      try {
        if (kind === 'impact') window.WebApp.HapticFeedback.impactOccurred(val);
        else window.WebApp.HapticFeedback.notificationOccurred(val);
      } catch (e) {}
    }
  }
  function _toast(msg, type) {
    if (window.UIController && window.UIController.showToast) window.UIController.showToast(msg, type || 'info');
  }
  function zoneOf(n) {
    for (const z of ZONES) if (n >= z.from && n <= z.to) return z;
    return ZONES[ZONES.length - 1];
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function $(id) { return document.getElementById(id); }

  // ============================================================
  //  КОНФИГ УРОВНЯ
  // ============================================================
  // РЕБАЛАНС: старая формула снижала попытки и время с ростом номера уровня,
  // из-за чего Бездна (7 ячеек, 5 попыток, ~35с) была почти неиграбельна.
  // Теперь попытки и время растут вместе с длиной кода (больше ячеек — больше
  // информации нужно собрать), а сложность внутри зоны нарастает плавно.
  function levelConfig(n) {
    const zone = zoneOf(n);
    const isBoss = (n === zone.to);
    const cells = Math.min(8, Math.max(4, zone.cells + (isBoss ? 1 : 0)));
    const zoneLen = Math.max(1, zone.to - zone.from);
    const t = (n - zone.from) / zoneLen; // 0 → начало зоны, 1 → босс
    // Попытки: cells+4 в начале зоны → cells+2 к концу; босс: ещё −1 (мин. 4)
    let attempts = cells + 4 - Math.round(t * 2);
    if (isBoss) attempts = Math.max(4, attempts - 1);
    // Время: 50 + 10с за ячейку, к концу зоны −15с; босс: ещё −10 (мин. 40)
    let time = 50 + cells * 10 - Math.round(t * 15);
    if (isBoss) time = Math.max(40, time - 10);
    return { n, zone, isBoss, cells, attempts, time };
  }
  function makeSecret(cells) {
    return shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, cells);
  }

  // ─── РЕЙД ДНЯ: общий seeded-шифр для всех игроков, награда rare+ раз в сутки ───
  function _todayKey() {
    const d = new Date();
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  function _mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Один и тот же секрет у всех игроков в один день (FNV-1a → mulberry32).
  function _seededSecret(cells, seedStr) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    const rng = _mulberry32(h);
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    return digits.slice(0, cells);
  }
  function _raidUnlocked() { return getProgress() >= ZONES[0].to; } // после Лагеря
  function _raidClaimedToday() {
    try { return localStorage.getItem('decoder_raid_claimed') === _todayKey(); } catch (e) { return false; }
  }
  function startRaid() {
    if (!_raidUnlocked()) { _toast('Рейд откроется после зачистки Тренировочного лагеря', 'error'); return; }
    const cells = getProgress() >= 60 ? 7 : 6; // ветеранам — длиннее шифр
    startLevel(0, false, {
      cfg: {
        zone: { name: '⚡ РЕЙД ДНЯ', color: '#ffc94d' },
        isBoss: false, cells: cells, attempts: cells + 3, time: 90
      },
      secret: _seededSecret(cells, 'decoder-raid-' + _todayKey())
    });
  }
  function evaluate(guess, secret) {
    let bulls = 0, cows = 0; const cr = [];
    for (let i = 0; i < secret.length; i++) {
      if (guess[i] === secret[i]) { bulls++; cr.push('bull'); }
      else if (secret.indexOf(guess[i]) >= 0) { cows++; cr.push('cow'); }
      else cr.push('miss');
    }
    return { bulls, cows, cell_results: cr, won: bulls === secret.length };
  }

  // ============================================================
  //  КАРТА АГЕНТА
  // ============================================================
  function renderMap() {
    const cleared = getProgress();
    const next = Math.min(cleared + 1, MAX_LEVEL);
    const allDone = cleared >= MAX_LEVEL;
    const curZone = zoneOf(next);

    if ($('test-cleared-count')) $('test-cleared-count').textContent = cleared;
    if ($('test-next-level'))    $('test-next-level').textContent = allDone ? '—' : next;
    if ($('test-continue-level')) $('test-continue-level').textContent = allDone ? '✓' : next;
    if ($('test-current-zone-name')) $('test-current-zone-name').textContent = allDone ? 'Все локации зачищены' : curZone.name;

    const contBtn = $('btn-test-continue');
    if (contBtn) {
      if (allDone) { contBtn.querySelector('span').textContent = 'ПОВТОРИТЬ'; }
      else { contBtn.querySelector('span').textContent = 'ПРОДОЛЖИТЬ'; }
    }

    const cards = getCards();
    if ($('test-cards-count')) $('test-cards-count').textContent = totalCardCount(cards);

    const list = $('test-map-list');
    if (!list) return;
    list.innerHTML = '';

    ZONES.forEach(z => {
      const unlocked = cleared >= (z.from - 1);
      const done = cleared >= z.to;
      const active = unlocked && !done;
      const clearedInZone = Math.max(0, Math.min(z.to, cleared) - (z.from - 1));
      const total = z.to - z.from + 1;
      const pct = Math.round((clearedInZone / total) * 100);

      const el = document.createElement('button');
      el.className = 'test-zone' + (active ? ' test-zone--active' : '') + (done ? ' test-zone--done' : '') + (!unlocked ? ' test-zone--locked' : '');
      el.style.setProperty('--zone-color', z.color);
      el.style.setProperty('--zone-glow', 'radial-gradient(circle at 30% 30%, ' + z.color + '55, transparent 70%)');

      let badge;
      if (!unlocked) badge = '<span class="test-zone-badge test-zone-badge--locked">ЗАКРЫТО</span>';
      else if (done) badge = '<span class="test-zone-badge test-zone-badge--done">ПРОЙДЕНО</span>';
      else badge = '<span class="test-zone-badge test-zone-badge--active">В ХОДУ</span>';

      el.innerHTML =
        '<div class="test-zone-art">' + (unlocked ? z.icon : ICON.lock) + '</div>' +
        '<div class="test-zone-body">' +
          '<div class="test-zone-top"><span class="test-zone-name">' + z.name + '</span>' + badge + '</div>' +
          '<div class="test-zone-desc">' + z.desc + '</div>' +
          '<div class="test-zone-meta">' +
            '<span>Уровни ' + z.from + '–' + z.to + '</span>' +
            '<span>·</span>' +
            '<span>' + clearedInZone + '/' + total + ' взломано</span>' +
            '<span class="test-zone-boss-flag">⚑ босс ур.' + z.to + '</span>' +
          '</div>' +
          '<div class="test-zone-bar"><div class="test-zone-bar-fill" style="width:' + pct + '%"></div></div>' +
        '</div>';

      el.addEventListener('click', () => {
        if (!unlocked) { _toast('Локация заблокирована — пройди предыдущую', 'error'); return; }
        if (done) {
          // Реиграбельность: тренировка на случайном уровне локации (без наград/прогресса).
          const rnd = z.from + Math.floor(Math.random() * total);
          startLevel(rnd, true);
        } else {
          startLevel(next, false);
        }
      });
      list.appendChild(el);
    });

    _renderRaidBanner();
    refreshMenuCard();
  }

  // Баннер «Рейд дня» на карте: контент после кампании и ежедневный повод вернуться.
  function _renderRaidBanner() {
    const btn = $('btn-test-raid');
    if (!btn) return;
    if (!_raidUnlocked()) { btn.classList.add('hidden'); return; }
    btn.classList.remove('hidden');
    const claimed = _raidClaimedToday();
    const st = $('test-raid-status');
    const cta = $('test-raid-cta');
    if (st) st.textContent = claimed
      ? 'Пройден сегодня ✓ · новый шифр и награда — завтра'
      : 'Общий шифр для всех агентов · награда: редкая+ карта';
    if (cta) cta.textContent = claimed ? 'ПОВТОРИТЬ' : 'ВЗЛОМАТЬ';
    btn.classList.toggle('test-raid-banner--done', claimed);
  }

  function refreshMenuCard() {
    hydrateFromCloud(); // профиль мог загрузиться позже init — держим прогресс актуальным
    if ($('test-mode-cleared')) $('test-mode-cleared').textContent = getProgress();
    if ($('test-mode-cards'))   $('test-mode-cards').textContent = totalCardCount(getCards());
  }

  function showMapView() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    // Уровень, покинутый на середине, считается завершённым — иначе отложенный
    // таймаут «Заморозки» мог перезапустить таймер уже на экране карты.
    if (level && !level.over) {
      level.over = true;
      if (level._freezeTimeout) { clearTimeout(level._freezeTimeout); level._freezeTimeout = null; }
    }
    // Досылаем на сервер накопленные изменения карточек/прогресса.
    if (_cloudDirty) _pushCloud(true);
    const lv = $('test-level-view'), mv = $('test-map-view');
    if (lv) lv.classList.add('hidden');
    if (mv) mv.classList.remove('hidden');
    renderMap();
  }

  // ============================================================
  //  УРОВЕНЬ (ввод как в стандартном)
  // ============================================================
  function startLevel(n, practice, raid) {
    const cfg = raid ? raid.cfg : levelConfig(n);
    level = {
      n: n, zone: cfg.zone, isBoss: cfg.isBoss, cells: cfg.cells,
      attemptsLeft: cfg.attempts, time: cfg.time, timeMax: cfg.time,
      secret: raid ? raid.secret : makeSecret(cfg.cells),
      used: 0, practice: !!practice, raid: !!raid, over: false
    };

    // Шапка уровня
    if ($('test-level-zone')) {
      $('test-level-zone').textContent = cfg.zone.name;
      $('test-level-zone').style.color = cfg.zone.color;
    }
    if ($('test-level-num')) $('test-level-num').textContent = raid
      ? ('Общий шифр · ' + _todayKey())
      : ('Уровень ' + n + (practice ? ' · тренировка' : ''));
    if ($('test-attempts-left')) $('test-attempts-left').textContent = level.attemptsLeft;
    if ($('test-timer')) $('test-timer').textContent = level.time;

    const boss = $('test-boss-banner');
    if (boss) boss.style.display = cfg.isBoss ? 'block' : 'none';
    const sb = $('test-status-banner');
    if (sb) sb.style.display = 'none';

    // История
    const hl = $('test-history-list'); if (hl) hl.innerHTML = '';
    const he = $('test-history-empty'); if (he) he.style.display = 'block';

    buildCells(cfg.cells);
    _applyExcluded(); // сброс отметок Сканера с прошлого уровня
    renderCardBar();

    const submitBtn = $('btn-test-submit');
    if (submitBtn) { submitBtn.style.display = 'block'; submitBtn.disabled = false; }

    // Переключаем на вид уровня
    if ($('test-map-view')) $('test-map-view').classList.add('hidden');
    if ($('test-level-view')) $('test-level-view').classList.remove('hidden');

    startTimer();
  }

  function buildCells(count) {
    const container = $('test-cells');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const w = document.createElement('div');
      w.className = 'input-cell';
      w.dataset.index = String(i);
      w.dataset.value = '';
      const disp = document.createElement('span');
      disp.className = 'test-cell-display';
      const inp = document.createElement('input');
      inp.className = 'test-cell';
      inp.type = 'text';
      inp.inputMode = 'numeric';
      inp.setAttribute('pattern', '[0-9]');
      inp.maxLength = 1;
      inp.tabIndex = 0;
      w.appendChild(disp);
      w.appendChild(inp);
      container.appendChild(w);
    }
    initCells();
  }

  function setCell(w, val) {
    w.dataset.value = val;
    const d = w.querySelector('.test-cell-display');
    if (d) d.textContent = val || '';
    w.classList.toggle('has-value', !!val);
  }
  function cellWrappers() { return Array.from(document.querySelectorAll('#test-cells .input-cell')); }
  function cellInputs() { return Array.from(document.querySelectorAll('#test-cells .test-cell')); }

  function initCells() {
    const wrappers = cellWrappers();
    const inputs = cellInputs();
    wrappers.forEach((wrapper, i) => {
      const inp = inputs[i];
      if (!inp) return;
      inp.value = '';
      // На телефоне — наша виртуальная клавиатура (системную подавляем).
      if (_isMobile()) inp.inputMode = 'none';
      inp.oninput = () => {
        const raw = inp.value.replace(/[^0-9]/g, '');
        const v = raw.length > 1 ? raw[raw.length - 1] : raw;
        inp.value = v;
        setCell(wrapper, v);
        if (v && i < wrappers.length - 1) inputs[i + 1].focus();
      };
      inp.onkeydown = (e) => {
        if (e.key === 'Backspace') {
          if (!wrapper.dataset.value && i > 0) { inputs[i - 1].focus(); return; }
          inp.value = '';
          setCell(wrapper, '');
        }
        if (e.key === 'Enter') { e.preventDefault(); submitGuess(); }
      };
      wrapper.addEventListener('click', () => { if (!inp.disabled) inp.focus(); });
    });
    const first = inputs.find(inp => !inp.disabled);
    if (first) first.focus();
    initKeypad();
  }

  function initKeypad() {
    const keypad = $('test-keypad');
    if (!keypad) return;
    if (!_isMobile()) { keypad.classList.add('hidden'); return; }
    keypad.classList.remove('hidden');
    if (_wiredKeypad) return;
    _wiredKeypad = true;
    keypad.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.keypad-btn');
      if (!btn) return;
      e.preventDefault();
      if (!document.querySelector('#test-cells .test-cell:not([disabled])')) return;
      _haptic('impact', 'light');
      const key = btn.dataset.key;
      if (key === 'clear') keypadClear();
      else if (key === 'backspace') keypadBackspace();
      else keypadDigit(parseInt(key, 10));
    });
  }
  function keypadDigit(digit) {
    const wrappers = cellWrappers(), inputs = cellInputs();
    let idx = inputs.indexOf(document.activeElement);
    if (idx < 0 || inputs[idx].disabled) {
      idx = wrappers.findIndex((w, i) => !w.dataset.value && !inputs[i].disabled);
      if (idx < 0) idx = wrappers.findIndex((w, i) => !inputs[i].disabled);
    }
    if (idx < 0) return;
    setCell(wrappers[idx], String(digit));
    if (inputs[idx]) inputs[idx].value = String(digit);
    let next = idx + 1;
    while (next < wrappers.length && (inputs[next].disabled || wrappers[next].dataset.value)) next++;
    if (next < wrappers.length && inputs[next] && !inputs[next].disabled) inputs[next].focus();
  }
  function keypadBackspace() {
    const wrappers = cellWrappers(), inputs = cellInputs();
    const locked = (i) => wrappers[i].classList.contains('hint-revealed'); // подсказанные не стираем
    let idx = inputs.indexOf(document.activeElement);
    if (idx < 0) {
      for (let i = wrappers.length - 1; i >= 0; i--) { if (wrappers[i].dataset.value && !locked(i)) { idx = i; break; } }
      if (idx < 0) return;
    }
    if (wrappers[idx].dataset.value && !locked(idx)) {
      setCell(wrappers[idx], '');
      if (inputs[idx]) inputs[idx].value = '';
    } else if (idx > 0) {
      // Ищем ближайшую слева стираемую ячейку
      let p = idx - 1;
      while (p >= 0 && (locked(p) || !wrappers[p].dataset.value)) p--;
      if (p < 0) return;
      setCell(wrappers[p], '');
      if (inputs[p]) { inputs[p].value = ''; inputs[p].focus(); }
    }
  }
  function keypadClear() {
    cellWrappers().forEach(w => { if (!w.classList.contains('hint-revealed')) setCell(w, ''); });
    cellInputs().forEach(i => { if (!i.disabled) i.value = ''; });
    const first = cellInputs().find(i => !i.disabled);
    if (first) first.focus();
  }

  // ─── Таймер ───
  function startTimer() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (!level || level.over) { clearInterval(timerId); timerId = null; return; }
      level.time--;
      const t = $('test-timer');
      if (t) {
        t.textContent = Math.max(0, level.time);
        t.style.color = level.time <= 10 ? '#ff6b4a' : '';
      }
      if (level.time <= 0) { clearInterval(timerId); timerId = null; endLevel(false, 'ВРЕМЯ ВЫШЛО'); }
    }, 1000);
  }

  // ─── Отправка догадки ───
  function submitGuess() {
    if (!level || level.over) return;
    const wrappers = cellWrappers();
    const inputs = cellInputs();
    const guess = []; let valid = true;
    wrappers.forEach((w, i) => {
      // Надёжное чтение: сначала dataset, при пустом — значение скрытого input
      // (фиксит случай, когда последняя цифра не «зафиксировалась» в dataset и
      // кнопка «ВЗЛОМАТЬ» как будто не срабатывала).
      let raw = (w.dataset.value || '').trim();
      if (!raw && inputs[i]) {
        const fromInput = (inputs[i].value || '').replace(/[^0-9]/g, '');
        if (fromInput) { raw = fromInput[fromInput.length - 1]; setCell(w, raw); }
      }
      const v = parseInt(raw, 10);
      if (isNaN(v)) valid = false; else guess.push(v);
    });
    if (!valid || guess.length !== level.cells) { _toast('Заполни все ячейки', 'error'); return; }
    if (new Set(guess).size !== guess.length) { _toast('Цифры должны быть разными', 'error'); return; }

    const res = evaluate(guess, level.secret);
    level.used++;
    addHistoryRow(level.used, guess, res.cell_results, res.bulls, res.cows);

    // Очистка незакреплённых ячеек
    wrappers.forEach(w => { if (!w.classList.contains('hint-revealed')) { setCell(w, ''); } });
    cellInputs().forEach((inp, i) => { if (!wrappers[i].classList.contains('hint-revealed')) inp.value = ''; });
    const firstFree = cellWrappers().findIndex((w, i) => !w.classList.contains('hint-revealed') && !cellInputs()[i].disabled);
    if (firstFree >= 0) cellInputs()[firstFree].focus();

    _haptic('notif', res.won ? 'success' : 'error');

    if (res.won) { endLevel(true); return; }

    if (level._shielded) {
      level._shielded = false;
      _toast('🛡 Щит поглотил удар!', 'success');
    } else {
      level.attemptsLeft--;
    }
    if ($('test-attempts-left')) $('test-attempts-left').textContent = Math.max(0, level.attemptsLeft);
    if (level.attemptsLeft <= 0) { endLevel(false, 'ПОПЫТКИ ИСЧЕРПАНЫ'); }
  }

  function addHistoryRow(num, digits, cellResults, bulls, cows) {
    const list = $('test-history-list'), empty = $('test-history-empty');
    if (!list) return;
    if (empty) empty.style.display = 'none';
    const row = document.createElement('div');
    row.className = 'history-row';
    const numEl = document.createElement('span');
    numEl.className = 'history-attempt-num';
    numEl.textContent = String(num).padStart(2, '0');
    const cellsEl = document.createElement('div');
    cellsEl.className = 'history-cells';
    (digits || []).forEach((digit, i) => {
      const cell = document.createElement('div');
      cell.className = 'history-cell ' + ((cellResults && cellResults[i]) ? cellResults[i] : 'miss');
      cell.textContent = digit;
      cellsEl.appendChild(cell);
    });
    const infoEl = document.createElement('div');
    infoEl.className = 'history-info';
    const bEl = document.createElement('span');
    bEl.className = 'history-bulls';
    bEl.innerHTML = (bulls || 0) + '<span class="indicator-dot bull-dot"></span>';
    const cEl = document.createElement('span');
    cEl.className = 'history-cows';
    cEl.innerHTML = (cows || 0) + '<span class="indicator-dot cow-dot"></span>';
    infoEl.appendChild(bEl); infoEl.appendChild(cEl);
    row.appendChild(numEl); row.appendChild(cellsEl); row.appendChild(infoEl);
    list.prepend(row);
    // Держим историю компактной: не больше 15 последних попыток в DOM
    while (list.children.length > 15) list.removeChild(list.lastElementChild);
  }

  function lockInput() {
    cellInputs().forEach(c => { c.disabled = true; });
    cellWrappers().forEach(w => w.classList.add('locked'));
    const submitBtn = $('btn-test-submit');
    if (submitBtn) submitBtn.style.display = 'none';
  }

  function endLevel(won, reason) {
    if (!level || level.over) return;
    level.over = true;
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (level._freezeTimeout) { clearTimeout(level._freezeTimeout); level._freezeTimeout = null; }
    lockInput();

    const banner = $('test-status-banner'), box = $('test-status-box'), text = $('test-status-text');
    if (banner) banner.style.display = 'block';
    if (won) {
      if (box) { box.style.borderColor = 'rgba(88,232,154,0.5)'; box.style.background = 'rgba(88,232,154,0.08)'; }
      if (text) { text.style.color = '#58e89a'; text.textContent = 'ВЗЛОМ УСПЕШЕН! 🔓'; }
      _haptic('notif', 'success');

      // ─── Рейд дня: награда rare+ один раз в сутки, повторы — без награды ───
      if (level.raid) {
        if (!_raidClaimedToday()) {
          try { localStorage.setItem('decoder_raid_claimed', _todayKey()); } catch (e) {}
          _touch();
          const drop = rollDrop('rare');
          _pushCloud(true);
          showDropOverlay(drop, showMapView);
          refreshMenuCard();
        } else {
          _toast('Рейд уже пройден сегодня — новая награда завтра', 'info');
          showWinControls('Рейд пройден');
        }
        return;
      }

      let newlyUnlocked = null;
      if (!level.practice && level.n > getProgress()) {
        setProgress(level.n);
        // Открыта ли новая локация? (этот уровень — последний в своей зоне)
        const z = zoneOf(level.n);
        if (level.n === z.to) {
          const idx = ZONES.indexOf(z);
          if (idx >= 0 && idx < ZONES.length - 1) newlyUnlocked = ZONES[idx + 1];
        }
        // БАЛАНС: раньше карточка падала с КАЖДОГО уровня — 100 карт за кампанию
        // при потребности в 15–20 (инфляция, дроп терял ценность). Теперь на
        // обычных уровнях шанс 60%, с боссов — гарантированно rare+.
        const drop = level.isBoss ? rollDrop('rare') : (Math.random() < 0.6 ? rollDrop(null) : null);
        // Сохраняем прохождение на сервер (прогресс + карточки + трек «Агент операции»)
        _pushCloud(true);
        const finish = () => {
          if (newlyUnlocked) showUnlockOverlay(newlyUnlocked, showMapView);
          else showMapView();
        };
        if (drop) {
          showDropOverlay(drop, finish);
        } else {
          // Без дропа: баннер победы уже виден, даём кнопку «ДАЛЬШЕ»
          const banner = $('test-status-banner');
          if (banner) appendActionRow(banner, [{ label: 'ДАЛЬШЕ', primary: true, cb: finish }]);
          else finish();
        }
        refreshMenuCard();
        return;
      }
      // Тренировка/повтор — без награды, просто кнопка к карте
      showWinControls(reason || 'Тренировка пройдена');
    } else {
      if (box) { box.style.borderColor = 'rgba(255,107,74,0.5)'; box.style.background = 'rgba(255,107,74,0.08)'; }
      if (text) { text.style.color = '#ff6b4a'; text.textContent = '🔒 ' + (reason || 'ПРОВАЛ') + ' — секрет: ' + level.secret.join(' '); }
      _haptic('notif', 'error');
      showLoseControls();
    }
  }

  // Кнопки после победы (тренировка) / поражения внутри статус-баннера
  function showWinControls(msg) {
    const banner = $('test-status-banner');
    if (!banner) return;
    appendActionRow(banner, [
      { label: 'К КАРТЕ', primary: true, cb: showMapView }
    ]);
  }
  function showLoseControls() {
    const banner = $('test-status-banner');
    if (!banner) return;
    appendActionRow(banner, [
      { label: 'ЕЩЁ РАЗ', primary: true, cb: () => level.raid ? startRaid() : startLevel(level.n, level.practice) },
      { label: 'К КАРТЕ', primary: false, cb: showMapView }
    ]);
  }
  function appendActionRow(banner, actions) {
    let row = banner.querySelector('.test-status-actions');
    if (row) row.remove();
    row = document.createElement('div');
    row.className = 'test-status-actions';
    row.style.cssText = 'display:flex; gap:10px; margin-top:10px;';
    actions.forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.primary ? 'btn--primary' : 'btn--secondary');
      b.style.cssText = 'flex:1; padding:11px;';
      b.textContent = a.label;
      b.addEventListener('click', a.cb);
      row.appendChild(b);
    });
    banner.appendChild(row);
  }

  // ============================================================
  //  КАРТОЧКИ: выпадение, использование, комбинирование
  // ============================================================
  function rollDrop(minRarity) {
    const rr = Math.random();
    let rarity = rr < 0.05 ? 'legendary' : (rr < 0.30 ? 'rare' : 'common');
    if (minRarity === 'rare' && rarity === 'common') rarity = 'rare';
    // Базовые (common+): hint, time, attempt. Редкие (rare+): freeze, shield, scanner
    const commonTypes  = ['hint', 'time', 'attempt'];
    const rareTypes    = ['freeze', 'shield', 'scanner'];
    const type = (rarity === 'common')
      ? commonTypes[Math.floor(Math.random() * commonTypes.length)]
      : [...commonTypes, ...rareTypes][Math.floor(Math.random() * (commonTypes.length + rareTypes.length))];
    const cards = getCards();
    cards[type][rarity]++;
    saveCards(cards);
    return { type, rarity };
  }

  function showDropOverlay(drop, done) {
    const ov = $('test-drop-overlay');
    const def = CARD_DEFS[drop.type];
    if (!ov || !def) { if (done) done(); return; }
    const cardEl = $('test-drop-card');
    if (cardEl) { cardEl.className = 'test-drop-card is-' + drop.rarity; cardEl.innerHTML = def.icon; cardEl.style.color = ({hint:'#58e89a',time:'#4dabff',attempt:'#ffc94d',freeze:'#4dabff',shield:'#58e89a',scanner:'#4dabff'})[drop.type]; }
    if ($('test-drop-name')) $('test-drop-name').textContent = def.name;
    if ($('test-drop-rarity')) { $('test-drop-rarity').textContent = RARITY_LABEL[drop.rarity]; $('test-drop-rarity').className = 'test-drop-rarity is-' + drop.rarity; }
    ov.classList.remove('hidden');
    _haptic('notif', 'success');
    const ok = $('btn-test-drop-ok');
    if (ok) ok.onclick = () => { ov.classList.add('hidden'); if (done) done(); };
  }

  function showUnlockOverlay(zone, done) {
    const ov = $('test-unlock-overlay');
    if (!ov) { if (done) done(); return; }
    const art = $('test-unlock-art');
    if (art) { art.innerHTML = zone.icon; art.style.color = zone.color; art.style.background = 'radial-gradient(circle at 30% 30%, ' + zone.color + '40, rgba(255,255,255,0.04))'; }
    if ($('test-unlock-name')) { $('test-unlock-name').textContent = zone.name; }
    if ($('test-unlock-range')) $('test-unlock-range').textContent = 'Уровни ' + zone.from + '–' + zone.to;
    ov.querySelectorAll('.test-unlock-rings span').forEach(s => { s.style.borderColor = zone.color + '66'; });
    ov.classList.remove('hidden');
    _haptic('notif', 'success');
    const ok = $('btn-test-unlock-ok');
    if (ok) ok.onclick = () => { ov.classList.add('hidden'); if (done) done(); };
  }

  // Панель карточек в уровне
  function renderCardBar() {
    const bar = $('test-card-bar');
    if (!bar) return;
    bar.innerHTML = '';
    const cards = getCards();
    const entries = [
      { key: 'hint',      cls: 'hint',     label: 'Подсказка',  count: totalOf(cards, 'hint') },
      { key: 'time',      cls: 'time',     label: 'Время',      count: totalOf(cards, 'time') },
      { key: 'attempt',   cls: 'attempt',  label: '+1 попытка', count: totalOf(cards, 'attempt') },
      { key: 'freeze',    cls: 'freeze',   label: 'Заморозка',  count: totalOf(cards, 'freeze') },
      { key: 'shield',    cls: 'shield',   label: 'Щит',        count: totalOf(cards, 'shield') },
      { key: 'scanner',   cls: 'scanner',  label: 'Сканер',     count: totalOf(cards, 'scanner') },
      { key: 'hackpack',  cls: 'combo',    label: 'Хак-пакет',  count: cards.hackpack },
      { key: 'survival',  cls: 'combo',    label: 'Выживание',  count: cards.survival },
      { key: 'analysis',  cls: 'combo',    label: 'Анализ',     count: cards.analysis },
      { key: 'icecrack',  cls: 'combo',    label: 'Лёд. взлом', count: cards.icecrack },
      { key: 'overdrive', cls: 'combo',    label: 'Овердрайв',  count: cards.overdrive },
      { key: 'overload',  cls: 'combo',    label: 'Перегрузка', count: cards.overload },
    ];
    entries.forEach(e => {
      if (e.count <= 0) return;
      const def = CARD_DEFS[e.key] || COMBO_DEFS[e.key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'test-use-card test-use-card--' + e.cls;
      btn.innerHTML = (def ? def.icon : '') + '<span>' + e.label + '</span><span class="test-use-count">×' + e.count + '</span>';
      btn.addEventListener('click', () => useCard(e.key));
      bar.appendChild(btn);
    });
  }

  // Есть ли ещё неоткрытые подсказкой ячейки
  function _hasHintTargets() {
    if (!level) return false;
    return cellWrappers().some(w => !w.classList.contains('hint-revealed'));
  }

  function useCard(key) {
    if (!level || level.over) return;
    const cards = getCards();
    const wantedEffects = COMBO_DEFS[key] ? COMBO_DEFS[key].effects : [key];
    // НЕРФ Щита: не чаще одного раза за уровень (иначе стопка щитов = бессмертие,
    // а гарантированный rare+ дроп с боссов делал overload почти читом).
    if (wantedEffects.indexOf('shield') >= 0 && (level._shielded || level._shieldUsed)) {
      _toast(level._shielded ? 'Щит уже активен' : 'Щит уже использован на этом уровне — карточка не потрачена', 'info');
      return;
    }
    // Сканеру нечего исключать — не тратим карточку.
    if (wantedEffects.indexOf('scanner') >= 0 && (level._excluded || []).length >= (10 - level.secret.length)) {
      _toast('Все отсутствующие цифры уже исключены — карточка не потрачена', 'info');
      return;
    }
    let effects;
    let rarity = 'common';
    if (COMBO_DEFS[key]) {
      if (cards[key] <= 0) return;
      // БАГФИКС: раньше «Подсказка» списывалась, даже если все ячейки уже
      // открыты («всё уже открыто») — карточка пропадала впустую.
      if (COMBO_DEFS[key].effects.indexOf('hint') >= 0 && !_hasHintTargets()) {
        _toast('Все цифры уже открыты — карточка не потрачена', 'info');
        return;
      }
      effects = COMBO_DEFS[key].effects;
      cards[key]--;
    } else {
      if (totalOf(cards, key) <= 0) return;
      if (key === 'hint' && !_hasHintTargets()) {
        _toast('Все цифры уже открыты — карточка не потрачена', 'info');
        return;
      }
      effects = [key];
      rarity = consumeBase(cards, key) || 'common';
    }
    saveCards(cards);
    const isCombo = !!COMBO_DEFS[key];

    // Редкость усиливает эффект базовых карточек
    const timeBonus = rarity === 'legendary' ? 30 : (rarity === 'rare' ? 20 : 15);
    const attBonus  = rarity === 'legendary' ? 2 : 1;
    const freezeSec = rarity === 'legendary' ? 24 : (rarity === 'rare' ? 16 : 12);
    const hintCount = rarity === 'legendary' ? 2 : 1;

    let applied = [];
    effects.forEach(ef => {
      if (ef === 'time') { level.time += timeBonus; if ($('test-timer')) $('test-timer').textContent = level.time; applied.push('+' + timeBonus + 'с'); }
      else if (ef === 'attempt') { level.attemptsLeft += attBonus; if ($('test-attempts-left')) $('test-attempts-left').textContent = level.attemptsLeft; applied.push('+' + attBonus + ' попытка'); }
      else if (ef === 'hint') {
        let opened = 0;
        for (let k = 0; k < hintCount; k++) { if (revealHint()) opened++; }
        applied.push(opened > 0 ? ('открыто цифр: ' + opened) : 'всё уже открыто');
      }
      else if (ef === 'freeze') {
        // БАГФИКС: повторная заморозка стакала setTimeout-ы, а отложенный
        // перезапуск таймера мог сработать уже на другом уровне.
        if (level._freezeTimeout) { clearTimeout(level._freezeTimeout); level._freezeTimeout = null; }
        if (timerId) { clearInterval(timerId); timerId = null; }
        const t = $('test-timer'); if (t) t.style.color = '#4dabff';
        applied.push('⏸ таймер заморожен на ' + freezeSec + 'с');
        const lv = level;
        lv._freezeTimeout = setTimeout(() => {
          lv._freezeTimeout = null;
          if (level === lv && !lv.over) startTimer();
        }, freezeSec * 1000);
      }
      else if (ef === 'shield') {
        level._shielded = true;
        level._shieldUsed = true; // лимит: 1 активация щита за уровень
        applied.push('🛡 следующая ошибка бесплатна');
      }
      else if (ef === 'scanner') {
        // РЕВОРК: раньше сканер открывал ВСЕ отсутствующие цифры (на 7 ячейках —
        // ~40% информации одним кликом) и результат жил только в исчезающем toast.
        // Теперь исключает 2/3/все по редкости (в комбо — 3), а исключённые цифры
        // перманентно затемняются на клавиатуре и висят строкой под ячейками.
        const absent = [0,1,2,3,4,5,6,7,8,9].filter(d => !level.secret.includes(d));
        const scanCount = (rarity === 'legendary') ? absent.length : ((rarity === 'rare' || isCombo) ? 3 : 2);
        if (!level._excluded) level._excluded = [];
        const fresh = shuffle(absent.filter(d => level._excluded.indexOf(d) < 0)).slice(0, scanCount);
        fresh.forEach(d => level._excluded.push(d));
        level._excluded.sort((a, b) => a - b);
        _applyExcluded();
        applied.push('🔍 исключено: ' + (fresh.length ? fresh.join(',') : 'нечего'));
      }
    });
    _haptic('impact', 'medium');
    _toast('Применено: ' + applied.join(' · '), 'success');
    renderCardBar();
    refreshMenuCard();
  }

  // Перманентная отметка исключённых Сканером цифр: затемнение на клавиатуре
  // + строка под ячейками (для десктопа, где клавиатуры нет).
  function _applyExcluded() {
    const ex = (level && level._excluded) || [];
    document.querySelectorAll('#test-keypad .keypad-btn').forEach(b => {
      const k = parseInt(b.dataset.key, 10);
      if (!isNaN(k)) b.classList.toggle('key-excluded', ex.indexOf(k) >= 0);
    });
    let line = $('test-excluded-line');
    if (!ex.length) { if (line) line.remove(); return; }
    if (!line) {
      const cellsEl = $('test-cells');
      if (!cellsEl || !cellsEl.parentNode) return;
      line = document.createElement('div');
      line.id = 'test-excluded-line';
      line.className = 'test-excluded-line';
      cellsEl.parentNode.insertBefore(line, cellsEl.nextSibling);
    }
    line.innerHTML = '🔍 Нет в пароле: <b>' + ex.join(' · ') + '</b>';
  }

  // Открывает одну ещё не подсказанную верную цифру в её ячейке
  function revealHint() {
    const wrappers = cellWrappers(), inputs = cellInputs();
    const candidates = [];
    for (let i = 0; i < level.secret.length; i++) {
      if (!wrappers[i].classList.contains('hint-revealed')) candidates.push(i);
    }
    if (!candidates.length) return false;
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    const val = String(level.secret[idx]);
    setCell(wrappers[idx], val);
    // Блокируем ввод в открытую ячейку — иначе верную цифру можно было
    // случайно перезаписать или стереть Backspace-ом.
    if (inputs[idx]) { inputs[idx].value = val; inputs[idx].disabled = true; }
    wrappers[idx].classList.add('hint-revealed', 'has-value');
    return true;
  }

  // ============================================================
  //  МОДАЛ КАРТОЧЕК (коллекция + комбинирование)
  // ============================================================
  function openCardsModal() {
    renderCollection();
    renderRecipes();
    const m = $('test-cards-modal');
    if (m) m.classList.remove('hidden');
  }
  function closeCardsModal() {
    const m = $('test-cards-modal');
    if (m) m.classList.add('hidden');
  }

  function renderCollection() {
    const wrap = $('test-collection-list');
    if (!wrap) return;
    const cards = getCards();
    wrap.innerHTML = '';
    let any = false;
    ['hint', 'time', 'attempt', 'freeze', 'shield', 'scanner'].forEach(type => {
      RARITIES.forEach(r => {
        const cnt = cards[type][r];
        if (cnt <= 0) return;
        any = true;
        wrap.appendChild(cardTile(CARD_DEFS[type].name, CARD_DEFS[type].icon, r, cnt, type));
      });
    });
    ['hackpack', 'survival', 'analysis', 'icecrack', 'overdrive', 'overload'].forEach(c => {
      if (cards[c] <= 0) return;
      any = true;
      wrap.appendChild(cardTile(COMBO_DEFS[c].name, COMBO_DEFS[c].icon, 'combo', cards[c], 'combo'));
    });
    if (!any) {
      const e = document.createElement('div');
      e.className = 'test-collection-empty';
      e.textContent = 'Пока пусто. Взламывай уровни — карточки выпадают как трофеи.';
      wrap.appendChild(e);
    }
  }
  function cardTile(name, icon, rarity, count, type) {
    const el = document.createElement('div');
    const rcls = rarity === 'combo' ? 'legendary' : rarity;
    el.className = 'test-card test-card--' + rcls;
    let color = '#fff';
    if (type === 'hint') color = '#58e89a';
    else if (type === 'time') color = '#4dabff';
    else if (type === 'attempt') color = '#ffc94d';
    else if (type === 'freeze')   color = '#4dabff';
    else if (type === 'shield')   color = '#58e89a';
    else if (type === 'scanner')  color = '#4dabff';
    else if (type === 'combo') color = '#b36dff';
    el.innerHTML =
      '<span class="test-card-count">×' + count + '</span>' +
      '<span class="test-card-icon" style="color:' + color + '">' + icon + '</span>' +
      '<span class="test-card-title">' + name + '</span>' +
      '<span class="test-card-rarity-tag">' + (rarity === 'combo' ? 'ПАКЕТ' : RARITY_LABEL[rarity]) + '</span>';
    return el;
  }

  // Прогноз: какие редкости спишутся при крафте (consumeBase идёт от обычной
  // к легендарной). Игрок должен видеть, что уйдут именно обычные, а не легендарки.
  function _previewConsume(cards, type, times) {
    const pool = { common: cards[type].common, rare: cards[type].rare, legendary: cards[type].legendary };
    const out = [];
    for (let k = 0; k < times; k++) {
      for (const r of RARITIES) { if (pool[r] > 0) { pool[r]--; out.push(r); break; } }
    }
    return out;
  }

  function renderRecipes() {
    const wrap = $('test-recipes-list');
    if (!wrap) return;
    const cards = getCards();
    wrap.innerHTML = '';
    RECIPES.forEach(rc => {
      const combo = COMBO_DEFS[rc.combo];
      const haveA = totalOf(cards, rc.a), haveB = totalOf(cards, rc.b);
      // Если рецепт из двух одинаковых карт (напр. overdrive: hint+hint) — нужно минимум 2.
      const canCraft = (rc.a === rc.b) ? haveA >= 2 : (haveA > 0 && haveB > 0);
      // БАГФИКС: renderRecipes не показывал, какие редкости спишутся —
      // игрок мог неожиданно потерять редкую карту.
      let spendNote = '';
      if (canCraft) {
        const spends = (rc.a === rc.b)
          ? _previewConsume(cards, rc.a, 2)
          : _previewConsume(cards, rc.a, 1).concat(_previewConsume(cards, rc.b, 1));
        spendNote = '<span class="test-recipe-spend">Спишутся: ' + spends.map(r => RARITY_LABEL[r].toLowerCase()).join(' + ') + '</span>';
      }
      const row = document.createElement('div');
      row.className = 'test-recipe';
      row.innerHTML =
        '<div class="test-recipe-formula">' +
          '<span class="test-recipe-name">' + combo.name + '</span>' +
          '<span class="test-recipe-ingredients">' + CARD_DEFS[rc.a].name + ' (' + haveA + ') + ' + CARD_DEFS[rc.b].name + ' (' + haveB + ')</span>' +
          '<span class="test-recipe-effect">' + combo.desc + '</span>' +
          spendNote +
        '</div>';
      const btn = document.createElement('button');
      btn.className = 'btn-test-craft';
      btn.textContent = 'СОБРАТЬ';
      btn.disabled = !canCraft;
      btn.addEventListener('click', () => craft(rc));
      row.appendChild(btn);
      wrap.appendChild(row);
    });
  }

  function craft(rc) {
    const cards = getCards();
    const need = (rc.a === rc.b) ? totalOf(cards, rc.a) >= 2 : (totalOf(cards, rc.a) > 0 && totalOf(cards, rc.b) > 0);
    if (!need) { _toast('Не хватает ингредиентов', 'error'); return; }
    consumeBase(cards, rc.a);
    consumeBase(cards, rc.b);
    cards[rc.combo] = (cards[rc.combo] || 0) + 1;
    saveCards(cards);
    _haptic('notif', 'success');
    _toast('Собран: ' + COMBO_DEFS[rc.combo].name, 'success');
    renderCollection();
    renderRecipes();
    refreshMenuCard();
    // БАГФИКС: при крафте из модалки прямо во время уровня панель карточек
    // внизу уровня не обновлялась и показывала старые количества.
    if (level && !level.over) renderCardBar();
    if ($('test-cards-count')) $('test-cards-count').textContent = totalCardCount(getCards());
  }

  // ============================================================
  //  НАВИГАЦИЯ / ВХОД
  // ============================================================
  function open() {
    wireOnce();
    hydrateFromCloud(); // подтягиваем облачное сохранение (кросс-девайс)
    showMapView();
  }

  // Возвращает true, если обработали внутри режима; false — нужно выйти на «Игры».
  function handleBack() {
    const drop = $('test-drop-overlay');
    if (drop && !drop.classList.contains('hidden')) { return true; } // требует подтверждения
    const unlock = $('test-unlock-overlay');
    if (unlock && !unlock.classList.contains('hidden')) { return true; }
    const modal = $('test-cards-modal');
    if (modal && !modal.classList.contains('hidden')) { closeCardsModal(); return true; }
    const lv = $('test-level-view');
    if (lv && !lv.classList.contains('hidden')) { showMapView(); return true; }
    return false;
  }

  // Надёжный обработчик нажатия «ВЗЛОМАТЬ»: на мобильных одиночный click иногда
  // «теряется» (фокус ячейки/ghost-click), из-за чего кнопка будто не работает.
  // Реагируем на pointerup (срабатывает и для мыши, и для тача), а click гасим
  // защёлкой, чтобы не было двойной отправки.
  let _submitGuard = false;
  function _onSubmitTap(e) {
    if (e && e.cancelable && e.type === 'pointerup') e.preventDefault();
    if (_submitGuard) return;
    _submitGuard = true;
    setTimeout(() => { _submitGuard = false; }, 350);
    submitGuess();
  }

  function wireOnce() {
    if (_wiredOnce) return;
    _wiredOnce = true;
    const submitBtn = $('btn-test-submit');
    if (submitBtn) {
      submitBtn.addEventListener('pointerup', _onSubmitTap);
      submitBtn.addEventListener('click', _onSubmitTap);
    }
    $('btn-test-continue') && $('btn-test-continue').addEventListener('click', () => {
      const next = Math.min(getProgress() + 1, MAX_LEVEL);
      startLevel(next, getProgress() >= MAX_LEVEL);
    });
    $('btn-test-raid') && $('btn-test-raid').addEventListener('click', startRaid);
    $('btn-test-level-back') && $('btn-test-level-back').addEventListener('click', showMapView);
    $('btn-test-back') && $('btn-test-back').addEventListener('click', () => {
      if (typeof window.__decoderExitTestToGames === 'function') window.__decoderExitTestToGames();
    });
    $('btn-test-cards') && $('btn-test-cards').addEventListener('click', openCardsModal);
    $('btn-test-cards-close') && $('btn-test-cards-close').addEventListener('click', closeCardsModal);
    $('test-cards-modal') && $('test-cards-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCardsModal(); });
  }

  function init() {
    wireOnce();
    refreshMenuCard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { open: open, handleBack: handleBack, refreshMenuCard: refreshMenuCard, init: init, getProgress: getProgress };
})();
