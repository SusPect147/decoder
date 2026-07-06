
const GameManager = (() => {

  let state = {
    currentLevel: 1,
    levelConfig: null,
    attemptsLeft: 0,
    attemptsUsed: 0,
    timeLeft: 0,
    timerInterval: null,
    lockedCells: [],
    historyCount: 0,
    score: 0,
    isGameActive: false,
    isInputBlocked: false,
    currentScreen: 'screen-menu',
    sessionLevelsCleared: 0,
    hackedSafe: false,
    shopPaused: false,
    // Stream mode state
    streamMode: false,
    streamLives: 3,
    streamSegment: 0,
    streamCombo: 0,
    streamScore: 0,
    // Dice Hell mode state
    diceHellMode: false,
    diceHellLives: 3,
    diceHellSegment: 0,
    diceHellCombo: 0,
    diceHellScore: 0,
    // Fractal & Void modes
    fractalStage: 0,
    isFractal: false,
    voidMode: false,
    lastMode: 'classic',
    // Practice mode
    practiceMode: false,
  };

  let bestScore = 0;
  let totalLevels = 0;
  let coins = 0;
  let streamBestScore = 0;
  let diceBestScore = 0;
  let seasonPoints = 0;
  let seasonStart = 0; // timestamp начала текущего сезона (UTC)
  let dailyLastClaim = 0;
  let dailyStreak = 0;
  let userId = null;

  let boosters = { time: 0, attempts: 0, hint: 0 };
  let unlockedThemes = ['default'];
  let activeTheme = 'default';
  let unlockedTitles = ['title_1'];
  let activeTitle = 'title_1';
  let completedTasks = [];

  let stats = {
    safe_clears: 0,
    bonus_clears: 0,
    glitch_clears: 0,
    cipher_clears: 0,
    dice_clears: 0,
    hardcore_clears: 0,
    fractal_clears: 0,
    void_signal_clears: 0,
    stream_clears: 0,
    dicehell_clears: 0,
    campaign_clears: 0
  };

  // Единственный валидный адрес бота. Ссылка открывает мини-апп,
  // реферальный payload передаётся через ?startapp=ref_<id>.
  const BOT_URL = 'https://max.ru/id540552561205_bot';
  function buildRefLink(id) { return id ? (BOT_URL + '?startapp=ref_' + id) : null; }

  const REFERRALS_CONFIG = [
    { target: 1, reward: 500 },
    { target: 3, reward: 1500 },
    { target: 5, reward: 3000 },
    { target: 7, reward: 5000 },
    { target: 10, reward: 8000 },
    { target: 15, reward: 14000 },
    { target: 20, reward: 22000 }
  ];

  const PROGRESSION_CONFIG = {
    safe: {
      name: 'Мастер сейфов',
      desc: 'Разблокируй сейфы',
      stages: [
        1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 65, 80, 100,
        125, 155, 190, 230, 280, 340, 410, 490, 590, 710, 860, 1060, 1310, 1610, 2010
      ],
      rewards: [
        20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
        1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
      ],
      icon: `<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/><circle cx="12" cy="16" r="1"/></svg>`
    },
    bonus: {
      name: 'Охотник за бонусами',
      desc: 'Пройди бонусные уровни',
      stages: [
        1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 65, 80, 100,
        125, 155, 190, 230, 280, 340, 410, 490, 590, 710, 860, 1060, 1310, 1610, 2010
      ],
      rewards: [
        20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
        1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
      ],
      icon: `<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    },
    glitch: {
      name: 'Глитч-эксперт',
      desc: 'Преодолей глитч-системы',
      stages: [
        1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 65, 80, 100,
        125, 155, 190, 230, 280, 340, 410, 490, 590, 710, 860, 1060, 1310, 1610, 2010
      ],
      rewards: [
        20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
        1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
      ],
      icon: `<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
    },
    cipher: {
      name: 'Мастер шифров',
      desc: 'Дешифруй крипто-сдвиги',
      stages: [
        1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 65, 80, 100,
        125, 155, 190, 230, 280, 340, 410, 490, 590, 710, 860, 1060, 1310, 1610, 2010
      ],
      rewards: [
        20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
        1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
      ],
      icon: `<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><circle cx="12" cy="16" r="2"/><path d="M8 21h8"/></svg>`
    },
    dice: {
      name: 'Кубический аналитик',
      desc: 'Совмести числовые кубики',
      stages: [
        1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 65, 80, 100,
        125, 155, 190, 230, 280, 340, 410, 490, 590, 710, 860, 1060, 1310, 1610, 2010
      ],
      rewards: [
        20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
        1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
      ],
      icon: `<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/><circle cx="8.5" cy="15.5" r="1"/></svg>`
    },
    hardcore: {
      name: 'Слепой нетраннер',
      desc: 'Пройди хардкорные уровни',
      stages: [
        1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 65, 80, 100,
        125, 155, 190, 230, 280, 340, 410, 490, 590, 710, 860, 1060, 1310, 1610, 2010
      ],
      rewards: [
        20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
        1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
      ],
      icon: `<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`
    },
    // ── Прогресс под новые режимы ──
    stream: {
      name: 'Мастер потока',
      desc: 'Реши сегменты в режиме ПОТОК',
      noExtend: true,
      stages: [
        1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 65, 80, 100,
        125, 155, 190, 230, 280, 340, 410, 490, 590, 710, 860, 1060, 1310, 1610, 2010
      ],
      rewards: [
        20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
        1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
      ],
      icon: `<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
    },
    dicehell: {
      name: 'Повелитель кубиков',
      desc: 'Выживи в АДУ КУБИКОВ',
      noExtend: true,
      stages: [
        1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 65, 80, 100,
        125, 155, 190, 230, 280, 340, 410, 490, 590, 710, 860, 1060, 1310, 1610, 2010
      ],
      rewards: [
        20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
        1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
      ],
      icon: `<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="15.5" cy="8.5" r="1.2"/><circle cx="8.5" cy="15.5" r="1.2"/></svg>`
    },
    campaign: {
      name: 'Агент операции',
      desc: 'Взломай локации в ОПЕРАЦИИ «ДЕШИФРОВЩИКА»',
      noExtend: true,
      stages: [
        1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 65, 80, 100,
        125, 155, 190, 230, 280, 340, 410, 490, 590, 710, 860, 1060, 1310, 1610, 2010
      ],
      rewards: [
        20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
        1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
      ],
      icon: `<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2-6-2z"/><path d="M9 3v16M15 5v16"/></svg>`
    }
  };

  const TASKS_CONFIG = [
    {
      id: 'sub',
      name: 'Подписка на канал',
      desc: 'Подпишись на официальный канал',
      reward: 150,
      icon: `<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>`
    }
  ];

  // Расширяем этапы прогресса до бесконечности (добавляем ещё 70 этапов по формуле)
  (function extendProgression() {
    const TOTAL_STAGES = 100;
    Object.values(PROGRESSION_CONFIG).forEach(cfg => {
      if (cfg.noExtend) return; // новые треки ограничены 30 этапами (предел серверной валидации)
      while (cfg.stages.length < TOTAL_STAGES) {
        const lastS = cfg.stages[cfg.stages.length - 1];
        cfg.stages.push(Math.round(lastS * 1.27));
        const lastR = cfg.rewards[cfg.rewards.length - 1];
        cfg.rewards.push(Math.round(lastR * 1.30));
      }
    });
  })();

  let levelBoostersUsed = { time: false, attempts: false, hint: false };

  const STORE_ITEMS = {
    boosters: [
      { id: 'time', name: 'Инжектор времени', desc: 'Внедряет +15 сек к таймеру дешифрования.', price: 50, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
      { id: 'attempts', name: 'Обход защиты', desc: 'Добавляет +3 попытки в текущем раунде.', price: 75, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
      { id: 'hint', name: 'Дешифратор ячейки', desc: 'Мгновенно открывает одну правильную цифру.', price: 150, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' }
    ],
    themes: [
      { id: 'default', name: 'Базовый инжектор', desc: 'Стандартный модуль анализа. Не дает дополнительных бонусов.', priceRub: 0, coinBonus: 0, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>' },
      { id: 'stealth', name: 'Стелс-пакет', desc: 'Базовый набор для начинающего агента. Даёт звание «Донатер».<br><span style="color: var(--c-standard); font-weight: 600;">★ БОНУС: +1000 DCDR при активации</span>', priceRub: 49, coinBonus: 1000, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' },
      { id: 'overclock', name: 'Разгон ядра', desc: 'Ускоряет базовые операции анализа.<br><span style="color: var(--c-standard); font-weight: 600;">★ БОНУС: +5 сек к таймеру и +100 DCDR</span>', priceRub: 99, coinBonus: 100, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
      { id: 'matrix', name: 'Матричный майнер', desc: 'Оптимизирует потоки данных.<br><span style="color: var(--c-standard); font-weight: 600;">★ БОНУС: +10 сек времени, +15% к DCDR и +300 DCDR</span>', priceRub: 199, coinBonus: 300, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
      { id: 'synthwave', name: 'Синтвейв-драйвер', desc: 'Обходит брандмауэры на высокой скорости.<br><span style="color: var(--c-bonus); font-weight: 600;">★ БОНУС: +1 попытка, +25% к DCDR и +600 DCDR</span>', priceRub: 299, coinBonus: 600, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="15" x2="22" y2="15"/><line x1="2" y1="18" x2="22" y2="18"/></svg>' },
      { id: 'crt', name: 'Ретро-анализатор', desc: 'Задействует алгоритмы глубокого сканирования.<br><span style="color: var(--c-hardcore); font-weight: 600;">★ БОНУС: +15 сек, +1 попытка, +40% к DCDR и +800 DCDR</span>', priceRub: 399, coinBonus: 800, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="6" cy="14" r="0.5"/><circle cx="10" cy="14" r="0.5"/><line x1="14" y1="14" x2="18" y2="14"/></svg>' }
    ],
    titles: [
      { id: 'title_1', name: '[Скрипт-кидди]', desc: 'Начальный ранг анализа систем.', price: 0, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>' },
      { id: 'title_2', name: '[Нетраннер]', desc: 'Ранг опытного специалиста по анализу сетей.', price: 200, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 12V4H6v8a6 6 0 0 0 12 0z"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="12" y1="18" x2="12" y2="22"/></svg>' },
      { id: 'title_3', name: '[Призрак Сети]', desc: 'Элитный хакер, не оставляющий следов.', price: 500, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.82 2H14.2a3 3 0 0 1 2.82 2.02l1.32 4.14A3 3 0 0 1 18.2 11h-12.4a3 3 0 0 1-.14-2.84l1.33-4.14A3 3 0 0 1 9.82 2z"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M12 22v-4"/></svg>' },
      { id: 'title_4', name: '[Консольный Бог]', desc: 'Легенда, подчинившая себе любое ядро.', price: 1000, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="12" y1="4" x2="12" y2="2"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4" y1="12" x2="2" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>' },
      { id: 'title_5', name: '[Старый]', desc: 'Секретное звание для первопроходцев системы.', price: 0, icon: '<svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>' }
    ]
  };

  function reloadData() {
    if (window.SupabaseAPI && window.SupabaseAPI.gameData) {
      const gd = window.SupabaseAPI.gameData;
      bestScore = gd.decoder_best || 0;
      totalLevels = gd.decoder_levels || 0;
      coins = gd.decoder_coins || 0;
      streamBestScore = gd.stream_best || 0;
      diceBestScore = gd.dice_best || 0;
      // Сезон — автосброс каждые 30 дней
      seasonStart = gd.decoder_season_start || 0;
      const nowTs = Date.now();
      if (!seasonStart || nowTs - seasonStart > 30 * 24 * 60 * 60 * 1000) {
        seasonPoints = 0;
        seasonStart = nowTs;
        gd.decoder_season_points = 0;
        gd.decoder_season_start = seasonStart;
      } else {
        seasonPoints = gd.decoder_season_points || 0;
      }
      dailyLastClaim = gd.decoder_daily_last_claim || 0;
      dailyStreak = gd.decoder_daily_streak || 0;

      const maxUser = window.SupabaseAPI.getMaxUser();
      userId = maxUser ? maxUser.id.toString() : null;

      boosters = gd.decoder_boosters || { time: 0, attempts: 0, hint: 0 };
      unlockedThemes = gd.decoder_unlocked_themes || ['default'];
      activeTheme = gd.decoder_active_theme || 'default';
      unlockedTitles = gd.decoder_unlocked_titles || ['title_1'];
      activeTitle = gd.decoder_active_title || 'title_1';
      completedTasks = gd.decoder_completed_tasks || [];
      stats = gd.decoder_stats || {
        safe_clears: 0,
        bonus_clears: 0,
        glitch_clears: 0,
        cipher_clears: 0,
        dice_clears: 0,
        hardcore_clears: 0,
        fractal_clears: 0,
        void_signal_clears: 0,
        stream_clears: 0,
        dicehell_clears: 0,
        campaign_clears: 0
      };
      // Гарантируем наличие счётчиков новых режимов в старых профилях
      if (stats.stream_clears == null) stats.stream_clears = 0;
      if (stats.dicehell_clears == null) stats.dicehell_clears = 0;
      if (stats.campaign_clears == null) stats.campaign_clears = 0;
    }
  }

  // Подтягивает прогресс кампании «Протокол» (хранится в localStorage внутри
  // TestMode) в decoder_stats.campaign_clears — для трека прогресса «Агент операции».
  function _syncCampaignClears() {
    if (window.TestMode && typeof window.TestMode.getProgress === 'function') {
      stats.campaign_clears = Math.max(stats.campaign_clears || 0, window.TestMode.getProgress());
    }
  }

  function saveGameState(levelCleared = null) {
    _syncCampaignClears();
    if (window.SupabaseAPI && window.SupabaseAPI.gameData) {
      const gd = window.SupabaseAPI.gameData;
      gd.decoder_best = bestScore;
      gd.decoder_levels = totalLevels;
      gd.decoder_coins = coins;
      gd.decoder_daily_last_claim = dailyLastClaim;
      gd.decoder_daily_streak = dailyStreak;
      gd.decoder_boosters = boosters;
      gd.decoder_unlocked_themes = unlockedThemes;
      gd.decoder_active_theme = activeTheme;
      gd.decoder_unlocked_titles = unlockedTitles;
      gd.decoder_active_title = activeTitle;
      gd.decoder_completed_tasks = completedTasks;
      gd.decoder_stats = stats;
      gd.decoder_season_points = seasonPoints;
      gd.decoder_season_start = seasonStart;

      if (levelCleared !== null) {
        gd.decoder_last_level_clear_time = Date.now();
      }

      window.SupabaseAPI.gameData = gd;
      window.SupabaseAPI.saveScoreSecurely(bestScore, levelCleared);
    }
  }

  function init() {
    reloadData();
    UIController.preLoadDiceAnimations();
    _initPurchaseWatch();

    // Вкладки режимов в меню (КЛАССИЧЕСКИЙ / ПОТОК / АД КУБИКОВ)
    function switchMenuModeTab(tab) {
      document.querySelectorAll('.menu-mode-tab').forEach(t => t.classList.remove('active'));
      const tabBtn = document.getElementById('menu-mode-tab-' + tab);
      if (tabBtn) tabBtn.classList.add('active');
      document.querySelectorAll('.menu-stats-panel').forEach(p => p.classList.add('hidden'));
      const panel = document.getElementById('menu-stats-' + tab);
      if (panel) panel.classList.remove('hidden');
    }
    document.getElementById('menu-mode-tab-classic') && document.getElementById('menu-mode-tab-classic').addEventListener('click', () => switchMenuModeTab('classic'));
    document.getElementById('menu-mode-tab-stream') && document.getElementById('menu-mode-tab-stream').addEventListener('click', () => switchMenuModeTab('stream'));
    document.getElementById('menu-mode-tab-dice') && document.getElementById('menu-mode-tab-dice').addEventListener('click', () => switchMenuModeTab('dice'));

    document.getElementById('btn-start').addEventListener('click', showGamesScreen);
    document.getElementById('btn-mode-classic') && document.getElementById('btn-mode-classic').addEventListener('click', startGame);
    document.getElementById('btn-mode-stream') && document.getElementById('btn-mode-stream').addEventListener('click', startStreamGame);
    document.getElementById('btn-mode-dice') && document.getElementById('btn-mode-dice').addEventListener('click', startDiceHellGame);
    document.getElementById('btn-mode-practice') && document.getElementById('btn-mode-practice').addEventListener('click', startPracticeGame);
    document.getElementById('btn-mode-daily') && document.getElementById('btn-mode-daily').addEventListener('click', openDailyPasswordMode);
    document.getElementById('btn-mode-test') && document.getElementById('btn-mode-test').addEventListener('click', openTestMode);
    document.getElementById('btn-daily-submit') && document.getElementById('btn-daily-submit').addEventListener('click', submitDailyGuess);
    document.getElementById('btn-daily-share') && document.getElementById('btn-daily-share').addEventListener('click', _shareDailyResult);
    document.getElementById('btn-daily-back') && document.getElementById('btn-daily-back').addEventListener('click', () => { UIController.liftTransition('screen-daily', 'screen-games'); state.currentScreen = 'screen-games'; updateBackButton('screen-games'); });
    // Ячейки "РЕКОРД" открывают рейтинг режима
    document.getElementById('btn-lb-classic') && document.getElementById('btn-lb-classic').addEventListener('click', (e) => { e.stopPropagation(); showModeLeaderboard('classic'); });
    document.getElementById('btn-lb-stream') && document.getElementById('btn-lb-stream').addEventListener('click', (e) => { e.stopPropagation(); showModeLeaderboard('stream'); });
    document.getElementById('btn-lb-dice') && document.getElementById('btn-lb-dice').addEventListener('click', (e) => { e.stopPropagation(); showModeLeaderboard('dice'); });
    // Закрыть модал рейтинга
    document.getElementById('lb-modal-close') && document.getElementById('lb-modal-close').addEventListener('click', () => { const o = document.getElementById('lb-modal-overlay'); if (o) o.classList.add('hidden'); });
    document.getElementById('lb-modal-overlay') && document.getElementById('lb-modal-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden'); });
    // Переключение категорий в модалке режима (классика: очки/уровень)
    document.querySelectorAll('#lb-modal-tabs .lb-mtab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const sub = e.currentTarget.getAttribute('data-sub');
        if (_modeLbState.sub === sub) return;
        _modeLbState.sub = sub;
        document.querySelectorAll('#lb-modal-tabs .lb-mtab').forEach(t => t.classList.toggle('active', t === e.currentTarget));
        renderModeLeaderboard();
      });
    });
    // Онбординг: кнопка «?» на уровне + закрытие туториала
    document.getElementById('btn-help-level') && document.getElementById('btn-help-level').addEventListener('click', () => {
      if (state.levelConfig && state.levelConfig.type) _openTutorial(state.levelConfig.type);
    });
    document.getElementById('tut-ok') && document.getElementById('tut-ok').addEventListener('click', _closeTutorial);
    document.getElementById('tutorial-overlay') && document.getElementById('tutorial-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) _closeTutorial(); });
    document.getElementById('btn-rules').addEventListener('click', showRules);
    document.getElementById('btn-rules-back').addEventListener('click', backToMenu);
    document.getElementById('btn-leaderboard').addEventListener('click', showLeaderboard);
    document.getElementById('btn-leaderboard-back').addEventListener('click', backToMenuFromLeaderboard);
    document.querySelectorAll('.lb-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        const type = e.target.dataset.tab;
        renderLeaderboardData(type);
      });
    });
    document.getElementById('btn-submit').addEventListener('click', () => handleSubmit());
    document.getElementById('btn-next-level').addEventListener('click', nextLevel);
    document.getElementById('btn-share-win') && document.getElementById('btn-share-win').addEventListener('click', shareWinResult);
    document.getElementById('btn-share-lose') && document.getElementById('btn-share-lose').addEventListener('click', shareLoseResult);
    document.getElementById('btn-restart').addEventListener('click', restartGame);
    document.getElementById('btn-to-menu').addEventListener('click', goToMenu);
    document.getElementById('btn-exit-game').addEventListener('click', () => {
      _stopTimer();
      state.isGameActive = false;
      goToMenu();
    });

    document.getElementById('nav-menu-btn').addEventListener('click', () => switchTabFromNav('screen-menu'));
    document.getElementById('nav-friends').addEventListener('click', () => switchTabFromNav('screen-friends'));
    document.getElementById('nav-tasks').addEventListener('click', () => switchTabFromNav('screen-tasks'));
    document.getElementById('nav-shop').addEventListener('click', () => switchTabFromNav('screen-shop'));
    document.getElementById('nav-games').addEventListener('click', () => switchTabFromNav('screen-games'));

    document.getElementById('tab-btn-boosters').addEventListener('click', () => switchShopTab('boosters'));
    document.getElementById('tab-btn-themes').addEventListener('click', () => switchShopTab('themes'));
    document.getElementById('tab-btn-titles').addEventListener('click', () => switchShopTab('titles'));
    document.getElementById('tab-btn-inventory').addEventListener('click', () => switchShopTab('inventory'));

    document.getElementById('tasks-tab-btn-social').addEventListener('click', () => switchTasksTab('social'));
    document.getElementById('tasks-tab-btn-ref').addEventListener('click', () => switchTasksTab('ref'));
    document.getElementById('tasks-tab-btn-prog').addEventListener('click', () => switchTasksTab('prog'));
    document.getElementById('tasks-tab-btn-codes').addEventListener('click', () => switchTasksTab('codes'));
    document.getElementById('tasks-tab-btn-mystery').addEventListener('click', () => switchTasksTab('mystery'));

    document.getElementById('tasks-btn-submit-code').addEventListener('click', handlePromoCodeSubmit);

    document.getElementById('btn-invite-friends').addEventListener('click', inviteFriends);
    document.getElementById('btn-copy-ref-link').addEventListener('click', copyRefLink);

    document.getElementById('btn-open-oferta').addEventListener('click', () => UIController.showOverlay('screen-oferta'));
    document.getElementById('btn-close-oferta').addEventListener('click', () => UIController.hideOverlay('screen-oferta'));
    document.getElementById('btn-open-politika').addEventListener('click', () => UIController.showOverlay('screen-politika'));
    document.getElementById('btn-close-politika').addEventListener('click', () => UIController.hideOverlay('screen-politika'));

    document.getElementById('btn-claim-daily').addEventListener('click', claimDailyReward);

    InputController.onSubmit(handleSubmit);

    _updateRankDisplays();

    updateBottomNavActive('screen-menu');
    UIController.updateMenuStats(bestScore, totalLevels, coins, streamBestScore, diceBestScore, seasonPoints);
  }

  // Helper: показать индикатор паузы — баннер в магазине + пульс на nav-games
  function _showNavShopBadge() {
    const gamesBtn = document.getElementById('nav-games');
    const gamesBadge = document.getElementById('nav-games-badge');
    if (gamesBtn) gamesBtn.classList.add('game-paused');
    if (gamesBadge) {
      gamesBadge.textContent = state.timeLeft + 's';
      gamesBadge.classList.remove('hidden');
    }
    UIController.showToast('Нажми «Игры», чтобы вернуться к игре', 'info');
  }

  // Helper: скрыть все индикаторы паузы
  function _hideNavShopBadge() {
    const gamesBtn = document.getElementById('nav-games');
    const gamesBadge = document.getElementById('nav-games-badge');
    const shopBadge = document.getElementById('nav-shop-badge');
    if (gamesBtn) gamesBtn.classList.remove('game-paused');
    if (gamesBadge) gamesBadge.classList.add('hidden');
    if (shopBadge) shopBadge.classList.add('hidden');
  }

  // Вызывается из навигационных кнопок (учитывает активную игру)
  function switchTabFromNav(targetScreen) {
    // Нажатие «Игры» пока игра на паузе → вернуться в игру
    if (targetScreen === 'screen-games' && state.shopPaused) {
      returnToGame();
      return;
    }

    const wasInGame = state.currentScreen === 'screen-game' && (state.isGameActive || state.streamMode || state.diceHellMode);

    if (wasInGame) {
      if (targetScreen === 'screen-shop') {
        // Пауза — нажми «Игры», чтобы вернуться
        _stopTimer();
        state.shopPaused = true;
        _showNavShopBadge();
        switchTab(targetScreen);
      } else {
        // Любая другая вкладка = конец игры
        _stopTimer();
        state.isGameActive = false;
        state.shopPaused = false;
        _hideNavShopBadge();
        switchTab(targetScreen);
      }
    } else {
      switchTab(targetScreen);
    }
  }

  function returnToGame() {
    if (!state.shopPaused) return;
    state.shopPaused = false;
    _hideNavShopBadge();

    UIController.liftTransition(state.currentScreen, 'screen-game');
    state.currentScreen = 'screen-game';
    updateBackButton('screen-game');
    updateBottomNavActive('screen-game');

    // Возобновляем игру
    if (state.streamMode) {
      if (!state.isGameActive) {
        _loadStreamSegment(); // Между сегментами — загружаем следующий
      } else {
        state.isGameActive = true;
        _startTimer();
      }
      return;
    }
    if (state.diceHellMode) {
      if (!state.isGameActive) {
        _loadDiceHellSegment(); // Между сегментами — загружаем следующий
      } else {
        state.isGameActive = true;
        _startTimer();
      }
      return;
    }
    state.isGameActive = true;
    _startTimer();
  }

  function switchTab(targetScreen) {
    if (state.currentScreen === targetScreen) return;

    if (state.isGameActive && !state.shopPaused) {
      _stopTimer();
      state.isGameActive = false;
    }

    UIController.hideOverlay('screen-level-win');
    UIController.hideOverlay('screen-game-over');
    UIController.stopGlitch();

    const fromScreen = state.currentScreen;
    UIController.liftTransition(fromScreen, targetScreen);
    state.currentScreen = targetScreen;

    updateBottomNavActive(targetScreen);
    updateBackButton(targetScreen);

    if (targetScreen === 'screen-friends') {
      refreshDailyReward();
      renderFriendsList();
    }

    if (targetScreen === 'screen-tasks') {
      switchTasksTab('social');
    }

    if (targetScreen === 'screen-shop') {
      refreshShopUI();
      setTimeout(() => {
        UIController.updateShopTabIndicator();
      }, 50);
    }

    if (targetScreen === 'screen-menu') {
      UIController.updateMenuStats(bestScore, totalLevels, coins, streamBestScore, diceBestScore, seasonPoints);
    }

    if (targetScreen === 'screen-games') {
      _updateGamesScreenStats();
    }
  }

  function updateBackButton(targetScreen) {
    if (window.WebApp && window.WebApp.BackButton) {
      if (targetScreen === 'screen-menu') {
        window.WebApp.BackButton.hide();
        window.WebApp.BackButton.offClick(handleBackButtonClick);
      } else {
        window.WebApp.BackButton.show();
        window.WebApp.BackButton.onClick(handleBackButtonClick);
      }
    }
  }

  function handleBackButtonClick() {
    const s = state.currentScreen;
    if (s === 'screen-game') {
      // Из любого игрового режима кнопка «назад» в шапке -> экран «Игры»
      _exitGameToGames();
    } else if (s === 'screen-daily') {
      UIController.liftTransition('screen-daily', 'screen-games');
      state.currentScreen = 'screen-games';
      _updateGamesScreenStats();
      updateBottomNavActive('screen-games');
      updateBackButton('screen-games');
    } else if (s === 'screen-test') {
      // Внутри тестового режима: сначала даём модулю обработать (уровень -> карта,
      // закрытие модалов). Если он не обработал — выходим на экран «Игры».
      if (!(window.TestMode && window.TestMode.handleBack())) {
        _exitTestToGames();
      }
    } else if (s === 'screen-rules') {
      backToMenu();
    } else if (s === 'screen-leaderboard') {
      backToMenuFromLeaderboard();
    } else if (s === 'screen-games') {
      switchTab('screen-menu');
    } else if (s === 'screen-friends' || s === 'screen-shop' || s === 'screen-tasks') {
      switchTab('screen-menu');
    }
  }

  // Выход из активной игры на экран «Игры» (а не в главное меню)
  function _exitGameToGames() {
    if (window.WebApp && window.WebApp.disableClosingConfirmation) window.WebApp.disableClosingConfirmation();
    UIController.hideOverlay('screen-game-over');
    UIController.hideOverlay('screen-level-win');
    _stopTimer();
    state.isGameActive = false;
    state.streamMode = false;
    state.diceHellMode = false;
    const hudEl = document.getElementById('stream-hud');
    if (hudEl) hudEl.classList.add('hidden');
    const floorWord = document.querySelector('.floor-word');
    if (floorWord) floorWord.textContent = 'ЭТАЖ';
    UIController.liftTransition('screen-game', 'screen-games');
    state.currentScreen = 'screen-games';
    _updateGamesScreenStats();
    updateBottomNavActive('screen-games');
    updateBackButton('screen-games');
  }

  // Вход в тестовый режим («ТЕСТ» — карта агента)
  function openTestMode() {
    if (!window.TestMode) return;
    UIController.liftTransition(state.currentScreen, 'screen-test');
    state.currentScreen = 'screen-test';
    updateBottomNavActive('screen-games');
    updateBackButton('screen-test');
    window.TestMode.open();
  }

  // Выход из тестового режима на экран «Игры» (вызывается из TestMode)
  function _exitTestToGames() {
    UIController.liftTransition('screen-test', 'screen-games');
    state.currentScreen = 'screen-games';
    _updateGamesScreenStats();
    updateBottomNavActive('screen-games');
    updateBackButton('screen-games');
  }
  // Хук для модуля TestMode (кнопка «назад» на карте)
  window.__decoderExitTestToGames = _exitTestToGames;

  // Хук для TestMode: пройден уровень кампании → подтягиваем campaign_clears
  // и сохраняем профиль на сервер (иначе прогресс жил только в localStorage
  // и терялся при смене устройства/чистке хранилища).
  window.__decoderCampaignSave = function () {
    _syncCampaignClears();
    saveGameState();
  };

  // Обновить статистику на экране "Игры"
  function _updateGamesScreenStats() {
    const el1 = document.getElementById('games-best-score');
    const el2 = document.getElementById('games-levels-cleared');
    if (el1) el1.textContent = bestScore;
    if (el2) el2.textContent = totalLevels;
    const el3 = document.getElementById('stream-best-score');
    if (el3) el3.textContent = streamBestScore;
    const el4 = document.getElementById('dice-best-score');
    if (el4) el4.textContent = diceBestScore;
    if (window.TestMode && window.TestMode.refreshMenuCard) window.TestMode.refreshMenuCard();
  }


  // Показать экран выбора режима
  function showGamesScreen() {
    _updateGamesScreenStats();
    switchTab('screen-games');
  }

  function updateBottomNavActive(activeScreenId) {
    const navMap = {
      'screen-menu': 'nav-menu-btn',
      'screen-friends': 'nav-friends',
      'screen-tasks': 'nav-tasks',
      'screen-shop': 'nav-shop',
      'screen-games': 'nav-games',
      'screen-game':  'nav-games'
    };

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    const activeNavId = navMap[activeScreenId];
    if (activeNavId) {
      const activeNav = document.getElementById(activeNavId);
      if (activeNav) activeNav.classList.add('active');
    }

    setTimeout(() => {
      UIController.updateNavIndicator();
    }, 0);
  }

  function switchShopTab(tabId) {
    document.querySelectorAll('.shop-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.shop-section').forEach(sec => sec.classList.remove('active'));

    const tabMap = {
      boosters: 'tab-btn-boosters',
      themes: 'tab-btn-themes',
      titles: 'tab-btn-titles',
      inventory: 'tab-btn-inventory'
    };
    const secMap = {
      boosters: 'shop-section-boosters',
      themes: 'shop-section-themes',
      titles: 'shop-section-titles',
      inventory: 'shop-section-inventory'
    };

    const activeBtn = document.getElementById(tabMap[tabId]);
    if (activeBtn) activeBtn.classList.add('active');

    const activeSec = document.getElementById(secMap[tabId]);
    if (activeSec) activeSec.classList.add('active');

    setTimeout(() => {
      UIController.updateShopTabIndicator();
    }, 0);
  }

  let activeTasksTab = 'social';

  function switchTasksTab(tabId) {
    activeTasksTab = tabId;
    document.querySelectorAll('.tasks-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#screen-tasks .shop-section').forEach(sec => sec.classList.remove('active'));

    const tabMap = {
      social: 'tasks-tab-btn-social',
      ref: 'tasks-tab-btn-ref',
      prog: 'tasks-tab-btn-prog',
      codes: 'tasks-tab-btn-codes',
      mystery: 'tasks-tab-btn-mystery'
    };
    const secMap = {
      social: 'tasks-section-social',
      ref: 'tasks-section-ref',
      prog: 'tasks-section-prog',
      codes: 'tasks-section-codes',
      mystery: 'tasks-section-mystery'
    };

    const activeBtn = document.getElementById(tabMap[tabId]);
    if (activeBtn) activeBtn.classList.add('active');

    const activeSec = document.getElementById(secMap[tabId]);
    if (activeSec) activeSec.classList.add('active');

    setTimeout(() => {
      const activeTab = document.querySelector('.tasks-tab.active');
      const indicator = document.querySelector('.tasks-tab-indicator');
      if (activeTab && indicator) {
        indicator.style.width = `${activeTab.offsetWidth}px`;
        indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      }
    }, 0);

    renderTasksList();
  }

  function addCoins(amount) {
    coins += amount;
    saveGameState();
    UIController.updateCoins(coins);
  }

  function buyBooster(id) {
    const item = STORE_ITEMS.boosters.find(x => x.id === id);
    if (!item) return;

    if (coins < item.price) {
      UIController.showToast('Недостаточно DCDR!', 'error');
      return;
    }

    coins -= item.price;
    UIController.updateCoins(coins);

    boosters[id] = (boosters[id] || 0) + 1;
    saveGameState();

    UIController.showToast(`Куплено: ${item.name}`, 'success');
    refreshShopUI();
  }

  function unlockOrSelectTheme(id) {
    const item = STORE_ITEMS.themes.find(x => x.id === id);
    if (!item) return;

    if (!unlockedThemes.includes(id)) {
      if (item.priceRub > 0) {
        // Платная способность — оплата через Robokassa (сервер создаёт счёт).
        startThemePurchase(item);
        return;
      }
      unlockedThemes.push(id);
      // Бонус DCDR при активации (если есть)
      if (item.coinBonus && item.coinBonus > 0) {
        coins += item.coinBonus;
        UIController.updateCoins(coins);
        UIController.showToast(`Модуль "${item.name}" разблокирован! +${item.coinBonus} DCDR`, 'success');
      } else {
        UIController.showToast(`Модуль "${item.name}" разблокирован!`, 'success');
      }
    }

    activeTheme = id;
    saveGameState();

    UIController.showToast(`Запущен модуль анализа: ${item.name}`, 'success');
    refreshShopUI();
  }

  // ==== Покупка способностей за рубли (Robokassa) ====
  // Клиент только запрашивает ссылку на оплату и ждёт подтверждения из БД.
  // Начисление делает сервер (robokassa-result) — клиенту это недоступно.
  // Ожидание устойчиво к сворачиванию/перезагрузке мини-аппа:
  //  - опрос каждые 5 сек, пока страница видима;
  //  - мгновенная проверка при возврате в игру (focus/visibilitychange);
  //  - ожидающая покупка хранится в localStorage и возобновляется после
  //    перезагрузки страницы.
  const PENDING_PURCHASE_KEY = 'dcdr_pending_purchase';
  const PURCHASE_MAX_WAIT_MS = 30 * 60 * 1000; // 30 минут
  let purchasePollTimer = null;
  let pendingPurchaseItem = null;
  let purchaseCheckBusy = false;

  async function startThemePurchase(item) {
    if (!window.SupabaseAPI || !window.SupabaseAPI.isProfileLoaded) {
      UIController.showToast('Нет связи с сервером. Попробуйте позже.', 'error');
      return;
    }
    UIController.showToast('Создаём счёт на оплату...', 'success');
    const url = await window.SupabaseAPI.createPayment(item.id);
    if (!url) {
      UIController.showToast('Не удалось создать счёт. Попробуйте позже.', 'error');
      return;
    }

    // Запоминаем ожидающую покупку — переживёт перезагрузку мини-аппа.
    try {
      localStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify({ id: item.id, ts: Date.now() }));
    } catch (e) {}

    // Открываем страницу оплаты (внутри MAX — через WebApp API, иначе новая вкладка).
    if (window.WebApp && typeof window.WebApp.openLink === 'function') {
      window.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }

    UIController.showToast('После оплаты способность активируется автоматически.', 'success');
    _startPurchaseWatch(item);
  }

  function _startPurchaseWatch(item) {
    pendingPurchaseItem = item;
    if (purchasePollTimer) clearInterval(purchasePollTimer);
    purchasePollTimer = setInterval(_checkPendingPurchase, 5000);
    _checkPendingPurchase();
  }

  function _stopPurchaseWatch() {
    pendingPurchaseItem = null;
    if (purchasePollTimer) {
      clearInterval(purchasePollTimer);
      purchasePollTimer = null;
    }
    try { localStorage.removeItem(PENDING_PURCHASE_KEY); } catch (e) {}
  }

  // Одна проверка: куплено ли. Вызывается и таймером, и при возврате в игру.
  async function _checkPendingPurchase() {
    if (!pendingPurchaseItem || purchaseCheckBusy) return;
    const item = pendingPurchaseItem;

    // Слишком старое ожидание — прекращаем (счёт мог протухнуть).
    let ts = Date.now();
    try {
      const saved = JSON.parse(localStorage.getItem(PENDING_PURCHASE_KEY) || 'null');
      if (saved && saved.ts) ts = saved.ts;
    } catch (e) {}
    if (Date.now() - ts > PURCHASE_MAX_WAIT_MS) {
      _stopPurchaseWatch();
      return;
    }

    purchaseCheckBusy = true;
    try {
      const unlocked = await window.SupabaseAPI.checkThemeUnlocked(item.id);
      if (!unlocked) return;

      _stopPurchaseWatch();

      // 1. Подтягиваем серверный профиль (тема уже добавлена сервером).
      await window.SupabaseAPI.fetchMyDataSecurely();
      reloadData();

      // 2. Активируем купленную способность и сохраняем — при этом сохранении
      //    сервер переведёт бонусные DCDR (decoder_donate_pending) в баланс.
      activeTheme = item.id;
      saveGameState();

      // 3. Через пару секунд подтягиваем начисленные монеты.
      setTimeout(async () => {
        await window.SupabaseAPI.fetchMyDataSecurely();
        reloadData();
        UIController.updateCoins(coins);
        refreshShopUI();
      }, 2500);

      const bonusText = item.coinBonus > 0 ? ` +${item.coinBonus} DCDR!` : '';
      UIController.showToast(`Оплата прошла! Модуль "${item.name}" активирован.${bonusText}`, 'success');
      UIController.updateCoins(coins);
      refreshShopUI();
      _updateRankDisplays();
    } finally {
      purchaseCheckBusy = false;
    }
  }

  // Возобновление ожидания после перезагрузки мини-аппа + мгновенная
  // проверка при возврате в игру. Вызывается один раз из init().
  function _initPurchaseWatch() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) _checkPendingPurchase();
    });
    window.addEventListener('focus', () => _checkPendingPurchase());

    try {
      const saved = JSON.parse(localStorage.getItem(PENDING_PURCHASE_KEY) || 'null');
      if (saved && saved.id && Date.now() - (saved.ts || 0) < PURCHASE_MAX_WAIT_MS) {
        const item = STORE_ITEMS.themes.find(x => x.id === saved.id);
        // Если тема уже в профиле (начислилась, пока мини-апп был закрыт) —
        // _checkPendingPurchase сразу это увидит и покажет тост.
        if (item && !unlockedThemes.includes(item.id)) {
          _startPurchaseWatch(item);
        } else {
          localStorage.removeItem(PENDING_PURCHASE_KEY);
        }
      }
    } catch (e) {}
  }

  function buyOrSelectTitle(id) {
    const item = STORE_ITEMS.titles.find(x => x.id === id);
    if (!item) return;

    if (!unlockedTitles.includes(id)) {
      if (coins < item.price) {
        UIController.showToast('Недостаточно DCDR!', 'error');
        return;
      }

      coins -= item.price;
      UIController.updateCoins(coins);

      unlockedTitles.push(id);
      UIController.showToast(`Получено звание: ${item.name}`, 'success');
    }

    activeTitle = id;
    saveGameState();
    _updateRankDisplays();

    UIController.showToast(`Экипировано звание: ${item.name}`, 'success');
    refreshShopUI();
  }

  function _updateRankDisplays() {
    const titleObj = STORE_ITEMS.titles.find(x => x.id === activeTitle);
    const titleText = titleObj ? titleObj.name : '[Скрипт-кидди]';
    const menuBadge = document.getElementById('menu-rank-badge');
    if (menuBadge) menuBadge.textContent = titleText;
    const friendsBadge = document.getElementById('friends-rank-badge');
    if (friendsBadge) friendsBadge.textContent = titleText;
  }

  function refreshShopUI() {
    UIController.renderShop(STORE_ITEMS, boosters, unlockedThemes, activeTheme, unlockedTitles, activeTitle, coins);
    if (window.SupabaseAPI) {
      window.SupabaseAPI.saveScoreSecurely(bestScore);
    }
  }

  const DAILY_REWARDS = [
    // Неделя 1
    10, 20, 30, 50, 80, 120, 200,
    // Неделя 2
    15, 25, 40, 60, 100, 150, 250,
    // Неделя 3
    20, 35, 55, 80, 130, 200, 320,
    // Неделя 4
    30, 50, 75, 110, 170, 250, 400,
    // Неделя 5
    40, 65, 100, 145, 220, 330, 500,
    // Неделя 6
    55, 85, 130, 190, 280, 420, 650,
    // Неделя 7
    70, 110, 165, 240, 360, 540, 800,
    // Неделя 8
    90, 140, 210, 300, 450, 680, 1000,
    // Неделя 9
    110, 170, 260, 370, 560, 840, 1200,
    // Неделя 10
    130, 200, 310, 450, 680, 1000, 1500,
    // Неделя 11
    160, 250, 380, 550, 820, 1200, 1800,
    // Неделя 12
    200, 300, 450, 660, 1000, 1500, 2200,
    // День 85-90
    250, 380, 560, 820, 1200, 2000
  ];

  function checkDailyRewardStatus() {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const twoDaysMs = 48 * 60 * 60 * 1000;

    if (dailyLastClaim === 0) {
      return { claimable: true, streak: 1, nextClaimIn: 0 };
    }

    const diff = now - dailyLastClaim;

    if (diff >= oneDayMs && diff < twoDaysMs) {
      const nextStreak = (dailyStreak % 90) + 1;
      return { claimable: true, streak: nextStreak, nextClaimIn: 0 };
    } else if (diff >= twoDaysMs) {
      return { claimable: true, streak: 1, nextClaimIn: 0 };
    } else {
      return { claimable: false, streak: dailyStreak, nextClaimIn: oneDayMs - diff };
    }
  }

  function claimDailyReward() {
    const status = checkDailyRewardStatus();
    if (!status.claimable) {
      UIController.showToast('Награда еще недоступна!', 'error');
      return;
    }

    const rewardCoins = DAILY_REWARDS[status.streak - 1];
    dailyStreak = status.streak;
    dailyLastClaim = Date.now();

    coins += rewardCoins;
    UIController.updateCoins(coins);
    refreshDailyReward();
    saveGameState();
  }

  function refreshDailyReward() {
    const status = checkDailyRewardStatus();
    UIController.renderDailyRewards(DAILY_REWARDS, dailyStreak, status.streak, status.claimable, dailyLastClaim);
  }

  // Promise с таймаутом — для MAX API, которые могут зависнуть на ПК
  function _withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]);
  }

  // Красивый share-модал для ПК (когда нативный шеринг недоступен)
  function _showShareModal(inviteLink) {
    const existing = document.getElementById('share-modal-overlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'share-modal-overlay';
    modal.style.cssText = [
      'position:fixed;inset:0;z-index:9999;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,0.72);',
      'backdrop-filter:blur(10px);',
      '-webkit-backdrop-filter:blur(10px);',
    ].join('');
    modal.innerHTML = `
      <div style="
        background:rgba(14,14,14,0.94);
        border:1px solid rgba(255,255,255,0.30);
        border-top:1px solid rgba(255,255,255,0.50);
        border-radius:20px;
        padding:28px 24px 22px;
        max-width:340px;
        width:calc(100% - 48px);
        box-shadow:0 40px 80px rgba(0,0,0,0.85);
        backdrop-filter:blur(24px) saturate(200%);
        -webkit-backdrop-filter:blur(24px) saturate(200%);
        text-align:center;
        box-sizing:border-box;
      ">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.22em;color:rgba(255,255,255,0.35);text-transform:uppercase;margin-bottom:10px;">// ПРИГЛАСИТЬ ДРУГА</div>
        <div style="font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;color:rgba(255,255,255,0.85);line-height:1.5;margin-bottom:16px;">Отправь ссылку другу в чат MAX 🕹</div>
        <div style="
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.18);
          border-radius:10px;
          padding:10px 14px;
          font-family:'JetBrains Mono',monospace;
          font-size:9px;
          color:rgba(255,255,255,0.75);
          word-break:break-all;
          text-align:left;
          margin-bottom:16px;
          user-select:all;
          -webkit-user-select:all;
        ">${inviteLink}</div>
        <button id="share-modal-copy" style="
          width:100%;padding:14px;
          background:var(--c-standard,#58e89a);
          color:#000;border:none;border-radius:12px;
          font-family:'JetBrains Mono',monospace;
          font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;
          cursor:pointer;margin-bottom:10px;
          transition:opacity 0.2s;
        ">📋 СКОПИРОВАТЬ ССЫЛКУ</button>
        <button id="share-modal-close" style="
          width:100%;padding:10px;
          background:transparent;
          color:rgba(255,255,255,0.38);
          border:1px solid rgba(255,255,255,0.15);border-radius:12px;
          font-family:'JetBrains Mono',monospace;font-size:11px;
          cursor:pointer;transition:opacity 0.2s;
        ">ЗАКРЫТЬ</button>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('share-modal-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(inviteLink);
        const btn = document.getElementById('share-modal-copy');
        if (btn) { btn.textContent = '✓ СКОПИРОВАНО!'; btn.style.opacity = '0.7'; }
        setTimeout(() => modal.remove(), 1500);
      } catch (e) {
        UIController.showToast('Выдели ссылку выше и скопируй вручную', 'info');
      }
    });

    const closeModal = () => modal.remove();
    document.getElementById('share-modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }

  // Универсальный надёжный шеринг текста результата (победа/поражение/пароль дня).
  // Раньше эти кнопки звали shareMaxContent({text}) без link и без фолбэков —
  // контакт-пикер MAX не открывался ни на ПК, ни на телефоне.
  async function _shareResultText(text) {
    const link = _getRefLink(); // null или валидный URL
    const shareParams = link ? { text: text, link: link } : { text: text };

    // 1. Чат-пикер внутри MAX (должен вызываться синхронно из click-handler)
    if (window.WebApp && window.WebApp.shareMaxContent) {
      try {
        const r = await window.WebApp.shareMaxContent(shareParams);
        if (r && r.status === 'shared') {
          UIController.showToast('Отправлено!', 'success');
          return;
        }
        // status === 'cancelled' — пользователь сам закрыл, не показываем ошибку
        return;
      } catch (e) {
        // Не выходим — пробуем следующий способ
        console.warn('shareMaxContent error:', (e && e.error && e.error.code) || (e && e.message));
      }
    }

    // 2. Нативное системное меню (iOS/Android без поддержки shareMaxContent)
    if (window.WebApp && window.WebApp.shareContent) {
      try {
        const r = await window.WebApp.shareContent(shareParams);
        if (r && r.status === 'shared') {
          UIController.showToast('Отправлено!', 'success');
          return;
        }
        return;
      } catch (e) {
        console.warn('shareContent error:', (e && e.error && e.error.code) || (e && e.message));
      }
    }

    // 3. Фолбэк: копируем в буфер и показываем модал
    const fullText = link ? text + '\n\n👉 ' + link : text;
    try { if (navigator.clipboard) await navigator.clipboard.writeText(fullText); } catch (e) {}
    _showShareModal(link || '');
  }

  async function inviteFriends() {
    const actualUserId = window.SupabaseAPI && window.SupabaseAPI.getMaxUser() ? window.SupabaseAPI.getMaxUser().id : userId;
    // Если userId ещё не загрузился — не передаём невалидный link.
    const inviteLink = buildRefLink(actualUserId);
    const shareText = `🕹 Зацени ДЕКОДЕР — игра на логику прямо в MAX!\n\nВзламывай шифры, зарабатывай DCDR и бросай мне вызов в таблице лидеров 🏆`;
    const shareParams = inviteLink ? { text: shareText, link: inviteLink } : { text: shareText };

    // 1. Чат-пикер внутри MAX (мобильный + ПК Desktop).
    if (window.WebApp && window.WebApp.shareMaxContent) {
      try {
        const result = await window.WebApp.shareMaxContent(shareParams);
        if (result && result.status === 'shared') {
          UIController.showToast('Ссылка успешно отправлена!', 'success');
          return;
        }
        return;
      } catch (e) {
        console.warn('shareMaxContent error:', (e && e.error && e.error.code) || (e && e.message));
      }
    }

    // 2. Нативное системное меню (iOS/Android без поддержки shareMaxContent)
    if (window.WebApp && window.WebApp.shareContent) {
      try {
        const result = await window.WebApp.shareContent(shareParams);
        if (result && result.status === 'shared') {
          UIController.showToast('Ссылка успешно отправлена!', 'success');
          return;
        }
        return;
      } catch (e) {
        console.warn('shareContent error:', (e && e.error && e.error.code) || (e && e.message));
      }
    }

    // 3. Фолбэк: модал с копированием ссылки
    _showShareModal(inviteLink || '');
  }

  function copyRefLink() {
    const actualUserId = window.SupabaseAPI && window.SupabaseAPI.getMaxUser() ? window.SupabaseAPI.getMaxUser().id : userId;
    const inviteLink = buildRefLink(actualUserId) || BOT_URL;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteLink).then(() => {
        UIController.showToast('Ссылка скопирована в буфер обмена!', 'success');
      }).catch(() => {
        UIController.showToast('Не удалось скопировать ссылку', 'error');
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = inviteLink;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        UIController.showToast('Ссылка скопирована в буфер обмена!', 'success');
      } catch (err) {
        UIController.showToast('Не удалось скопировать ссылку', 'error');
      }
      document.body.removeChild(textArea);
    }
  }

  function buildTitleBadgeHtml(activeTitleId) {
    if (!activeTitleId || activeTitleId === 'title_1') return '';
    const titleConfig = STORE_ITEMS.titles.find(t => t.id === activeTitleId);
    if (!titleConfig) return '';
    if (activeTitleId === 'title_5') {
      const diamondIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>`;
      return `<span class="title-badge title-badge--glow" title="Экипировано звание ${titleConfig.name}">${diamondIcon}</span>`;
    }
    return `<span class="title-badge" title="Экипировано звание ${titleConfig.name}">${titleConfig.icon}</span>`;
  }

  // Видимая цель рефералки: «X/Y друзей до +N DCDR» — прогресс до ближайшего
  // майлстоуна из REFERRALS_CONFIG прямо на экране «Друзья».
  function _updateRefMilestoneWidget(count) {
    const label = document.getElementById('ref-milestone-label');
    const rewardEl = document.getElementById('ref-milestone-reward');
    const fill = document.getElementById('ref-milestone-fill');
    if (!label || !fill) return;
    const next = REFERRALS_CONFIG.find(m => count < m.target);
    if (!next) {
      label.textContent = 'Все награды открыты · друзей: ' + count;
      if (rewardEl) rewardEl.textContent = '🏆';
      fill.style.width = '100%';
      return;
    }
    label.textContent = 'До награды: ' + count + '/' + next.target + ' друзей';
    if (rewardEl) rewardEl.textContent = '+' + next.reward + ' DCDR';
    fill.style.width = Math.min(100, Math.round((count / next.target) * 100)) + '%';
  }

  async function renderFriendsList() {
    let listEl = document.getElementById('friends-list-section');
    if (!listEl) {

      const container = document.querySelector('.friends-container');
      if (!container) return;
      const section = document.createElement('div');
      section.id = 'friends-list-section';
      section.className = 'daily-reward-section';
      section.innerHTML = `
        <h3 class="section-title">// СПИСОК ДРУЗЕЙ</h3>
        <div id="friends-list-inner" class="friends-list-inner">
          <div class="friends-list-loading">Поиск в сети...</div>
        </div>
      `;
      const dailySection = container.querySelector('.daily-reward-section');
      if (dailySection) {
        container.insertBefore(section, dailySection);
      } else {
        container.appendChild(section);
      }
      listEl = section;
    }

    const innerEl = document.getElementById('friends-list-inner');
    if (!innerEl) return;
    innerEl.innerHTML = '<div class="friends-list-loading">Поиск в сети...</div>';

    if (!window.SupabaseAPI) {
      innerEl.innerHTML = '<div class="friends-list-empty">Сервер недоступен</div>';
      return;
    }

    const friends = await window.SupabaseAPI.fetchFriends();
    _updateRefMilestoneWidget(friends ? friends.length : 0);

    if (!friends || friends.length === 0) {
      innerEl.innerHTML = '<div class="friends-list-empty">Друзей пока нет. Пригласи их!</div>';
      return;
    }

    innerEl.innerHTML = '';
    friends.forEach(friend => {
      const avatarHtml = window.SupabaseAPI.buildAvatarHtml(friend.name, friend.game_data && friend.game_data.photo_url, 36);
      const item = document.createElement('div');
      item.className = 'friend-item';
      const badgeHtml = buildTitleBadgeHtml(friend.game_data?.decoder_active_title || 'title_1');
      item.innerHTML = `
        ${avatarHtml}
        <div class="friend-info">
          <span class="friend-name">${escapeHtml(friend.name)}${badgeHtml}</span>
          <span class="friend-score">${friend.score} pts</span>
        </div>
        <div class="friend-coins">${friend.game_data?.decoder_coins || 0} Dcdr</div>
      `;
      innerEl.appendChild(item);
    });
  }

  // Безопасный доступ к localStorage (в некоторых вебвью MAX он бросает исключение,
  // что раньше ломало рендер списка заданий — пропадали рефералы и прогресс).
  function _safeLsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function _safeLsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  async function renderTasksList() {

    const coinsBalanceEl = document.getElementById('tasks-coins-balance');
    if (coinsBalanceEl) {
      coinsBalanceEl.textContent = coins;
    }


    // Список друзей нужен ТОЛЬКО вкладке «Рефералы». Раньше его ждали на любой
    // вкладке — из-за этого «Прогресс»/«Соцсети» долго грузились (казалось «пусто»).
    let friendsCount = 0;
    if (activeTasksTab === 'ref' && window.SupabaseAPI) {
      try {
        const friends = await window.SupabaseAPI.fetchFriends();
        friendsCount = friends ? friends.length : 0;
      } catch (e) {
        console.error('Error fetching friends for tasks:', e);
      }
    }


    const socialContainer = document.getElementById('tasks-social-container');
    if (socialContainer && activeTasksTab === 'social') {
      socialContainer.innerHTML = '';

      TASKS_CONFIG.forEach(task => {
        const isCompleted = completedTasks.includes(task.id);

        let progressText = '';
        let canClaim = false;
        let buttonText = 'ВЫПОЛНИТЬ';
        let buttonClass = 'btn--secondary';

        if (isCompleted) {
          progressText = 'Выполнено';
          buttonText = 'ВЫПОЛНЕНО';
          buttonClass = 'btn--disabled';
        } else {
          if (task.id === 'sub') {
            const isClicked = _safeLsGet('task_sub_clicked') === 'true';
            progressText = isClicked ? 'Подписка оформлена?' : 'Ожидает выполнения';
            canClaim = isClicked;
            buttonText = isClicked ? 'ЗАБРАТЬ' : 'ВЫПОЛНИТЬ';
            buttonClass = isClicked ? 'btn--primary' : 'btn--secondary';
          }
        }

        const item = document.createElement('div');
        item.className = 'shop-item-card';
        if (isCompleted) {
          item.style.opacity = '0.6';
        }

        item.innerHTML = `
          <div class="shop-item-icon">
            ${task.icon}
          </div>
          <div class="shop-item-details">
            <span class="shop-item-name">${task.name}</span>
            <span class="shop-item-desc">${task.desc}</span>
            <span class="shop-item-inventory" style="color: ${isCompleted ? 'var(--c-standard)' : 'var(--c-bonus)'};">${progressText}</span>
          </div>
          <div class="shop-item-price">
            <div class="price-value" style="color: var(--c-standard)">
              <svg class="coin-icon" style="color: var(--c-standard); width: 14px; height: 14px; filter: drop-shadow(0 0 3px rgba(88,232,154,0.45));" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
                <path d="M5 9l7-6 7 6-7 12L5 9z"/>
                <path d="M5 9h14M10 3l-2 6 4 12 4-12-2-6"/>
              </svg>
              +${task.reward}
            </div>
            <button class="btn ${buttonClass} btn-task-action" data-task-id="${task.id}" ${isCompleted ? 'disabled' : ''} style="padding: 6px 12px; font-size: 11px; min-height: unset; border-radius: var(--r-sm); width: 100px; white-space: nowrap;">
              ${buttonText}
            </button>
          </div>
        `;
        socialContainer.appendChild(item);
      });


      socialContainer.querySelectorAll('.btn-task-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const taskId = e.target.dataset.taskId;
          handleSocialTaskAction(taskId);
        });
      });
    }


    const refContainer = document.getElementById('tasks-ref-container');
    if (refContainer && activeTasksTab === 'ref') {
      refContainer.innerHTML = '';

      REFERRALS_CONFIG.forEach(milestone => {
        const target = milestone.target;
        const reward = milestone.reward;
        const milestoneKey = `ref_milestone_${target}`;
        const isCompleted = completedTasks.includes(milestoneKey);
        const isClaimable = friendsCount >= target;

        let btnText = 'ПРИГЛАСИТЬ';
        let btnClass = 'btn--secondary';

        if (isCompleted) {
          btnText = 'ВЫПОЛНЕНО';
          btnClass = 'btn--disabled';
        } else if (isClaimable) {
          btnText = 'ЗАБРАТЬ';
          btnClass = 'btn--primary';
        }

        const card = document.createElement('div');
        card.className = 'shop-item-card';
        if (isCompleted) {
          card.style.opacity = '0.6';
        }

        card.innerHTML = `
          <div class="shop-item-icon">
            <svg class="shop-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="shop-item-details">
            <span class="shop-item-name">Сетевой хакер — ${target} фр.</span>
            <span class="shop-item-desc">Пригласи ${target} друзей в игру</span>
            <span class="shop-item-inventory" style="color: ${isCompleted ? 'var(--c-standard)' : 'var(--c-bonus)'}">Прогресс: ${friendsCount} / ${target}</span>
          </div>
          <div class="shop-item-price">
            <div class="price-value" style="color: var(--c-standard)">
              <svg class="coin-icon" style="color: var(--c-standard); width: 14px; height: 14px; filter: drop-shadow(0 0 3px rgba(88,232,154,0.45));" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
                <path d="M5 9l7-6 7 6-7 12L5 9z"/>
                <path d="M5 9h14M10 3l-2 6 4 12 4-12-2-6"/>
              </svg>
              +${reward}
            </div>
            <button class="btn ${btnClass} btn-ref-milestone" data-target="${target}" ${isCompleted ? 'disabled' : ''} style="padding: 6px 12px; font-size: 11px; min-height: unset; border-radius: var(--r-sm); width: 100px; white-space: nowrap;">
              ${btnText}
            </button>
          </div>
        `;
        refContainer.appendChild(card);
      });


      refContainer.querySelectorAll('.btn-ref-milestone').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = parseInt(e.target.dataset.target);
          handleRefMilestoneClaim(target);
        });
      });
    }


    const progContainer = document.getElementById('tasks-prog-container');
    if (progContainer && activeTasksTab === 'prog') {
      progContainer.innerHTML = '';

      _syncCampaignClears(); // актуализируем прогресс кампании перед отрисовкой

      Object.keys(PROGRESSION_CONFIG).forEach(key => {
        const config = PROGRESSION_CONFIG[key];
        const clears = stats[key + '_clears'] || 0;


        let activeStageIdx = -1;
        for (let i = 0; i < config.stages.length; i++) {
          const stageKey = `prog_${key}_stage_${i}`;
          if (!completedTasks.includes(stageKey)) {
            activeStageIdx = i;
            break;
          }
        }

        const card = document.createElement('div');
        card.className = 'shop-item-card';

        if (activeStageIdx === -1) {

          card.style.opacity = '0.6';
          card.innerHTML = `
            <div class="shop-item-icon">${config.icon}</div>
            <div class="shop-item-details">
              <span class="shop-item-name">${config.name} (Макс.)</span>
              <span class="shop-item-desc">${config.desc} // Все уровни пройдены!</span>
              <span class="shop-item-inventory" style="color: var(--c-standard)">Выполнено</span>
            </div>
            <div class="shop-item-price">
              <button class="btn btn--disabled" disabled style="padding: 6px 12px; font-size: 11px; min-height: unset; border-radius: var(--r-sm); width: 100px; white-space: nowrap;">ВЫПОЛНЕНО</button>
            </div>
          `;
        } else {
          const targetClears = config.stages[activeStageIdx];
          const prevTarget = activeStageIdx > 0 ? config.stages[activeStageIdx - 1] : 0;
          const relativeTarget = targetClears - prevTarget;
          const relativeClears = Math.max(0, clears - prevTarget);
          const currentProgress = Math.min(relativeTarget, relativeClears);

          const reward = config.rewards[activeStageIdx];
          const isClaimable = clears >= targetClears;

          let btnText = isClaimable ? 'ЗАБРАТЬ' : 'ВЫПОЛНИТЬ';
          let btnClass = isClaimable ? 'btn--primary' : 'btn--secondary';

          card.innerHTML = `
            <div class="shop-item-icon">${config.icon}</div>
            <div class="shop-item-details">
              <span class="shop-item-name">${config.name} — Этап ${activeStageIdx + 1}/${config.stages.length}</span>
              <span class="shop-item-desc">${config.desc}: ${relativeTarget} раз(а)</span>
              <span class="shop-item-inventory" style="color: ${isClaimable ? 'var(--c-standard)' : 'var(--c-bonus)'}">Прогресс: ${currentProgress} / ${relativeTarget}</span>
            </div>
            <div class="shop-item-price">
              <div class="price-value" style="color: var(--c-standard)">
                <svg class="coin-icon" style="color: var(--c-standard); width: 14px; height: 14px; filter: drop-shadow(0 0 3px rgba(88,232,154,0.45));" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
                  <path d="M5 9l7-6 7 6-7 12L5 9z"/>
                  <path d="M5 9h14M10 3l-2 6 4 12 4-12-2-6"/>
                </svg>
                +${reward}
              </div>
              <button class="btn ${btnClass} btn-prog-action" data-key="${key}" data-stage="${activeStageIdx}" style="padding: 6px 12px; font-size: 11px; min-height: unset; border-radius: var(--r-sm); width: 100px; white-space: nowrap;">
                ${btnText}
              </button>
            </div>
          `;
        }
        progContainer.appendChild(card);
      });


      progContainer.querySelectorAll('.btn-prog-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const key = e.target.dataset.key;
          const stage = parseInt(e.target.dataset.stage);
          handleProgTaskClaim(key, stage);
        });
      });
    }
  }

  async function handleSocialTaskAction(taskId) {
    const task = TASKS_CONFIG.find(t => t.id === taskId);
    if (!task) return;

    if (completedTasks.includes(taskId)) {
      UIController.showToast('Задание уже выполнено!', 'info');
      return;
    }

    if (taskId === 'sub') {
      const isClicked = _safeLsGet('task_sub_clicked') === 'true';
      if (!isClicked) {
        _safeLsSet('task_sub_clicked', 'true');
        UIController.showToast('Переход к каналу...', 'info');

        const channelUrl = 'https://max.ru/se13287255_biz';
        if (window.WebApp && window.WebApp.openLink) {
          try { window.WebApp.openLink(channelUrl); } catch (e) { window.open(channelUrl, '_blank'); }
        } else {
          window.open(channelUrl, '_blank');
        }
        renderTasksList();
      } else {
        completedTasks.push(taskId);
        coins += task.reward;
        UIController.updateCoins(coins);
        saveGameState();
        UIController.showToast(`Награда получена! +${task.reward} Dcdr`, 'success');
        renderTasksList();
      }
    }
  }

  async function handleRefMilestoneClaim(target) {
    const milestoneKey = `ref_milestone_${target}`;
    if (completedTasks.includes(milestoneKey)) {
      UIController.showToast('Этот этап уже выполнен!', 'info');
      return;
    }

    let friendsCount = 0;
    if (window.SupabaseAPI) {
      try {
        const friends = await window.SupabaseAPI.fetchFriends();
        friendsCount = friends ? friends.length : 0;
      } catch (e) { }
    }

    if (friendsCount >= target) {
      const milestone = REFERRALS_CONFIG.find(m => m.target === target);
      if (!milestone) return;

      completedTasks.push(milestoneKey);
      coins += milestone.reward;
      UIController.updateCoins(coins);
      saveGameState();
      UIController.showToast(`Награда получена! +${milestone.reward} Dcdr`, 'success');
      renderTasksList();
    } else {
      inviteFriends();
    }
  }

  async function handleProgTaskClaim(key, stageIndex) {
    const config = PROGRESSION_CONFIG[key];
    if (!config) return;

    if (key === 'campaign') _syncCampaignClears();
    const clears = stats[key + '_clears'] || 0;
    const targetClears = config.stages[stageIndex];

    if (clears >= targetClears) {
      const stageKey = `prog_${key}_stage_${stageIndex}`;
      if (completedTasks.includes(stageKey)) {
        UIController.showToast('Этот этап уже выполнен!', 'info');
        return;
      }

      completedTasks.push(stageKey);
      coins += config.rewards[stageIndex];
      UIController.updateCoins(coins);
      saveGameState();
      UIController.showToast(`Достижение получено! +${config.rewards[stageIndex]} Dcdr`, 'success');
      renderTasksList();
    } else {
      const prevTarget = stageIndex > 0 ? config.stages[stageIndex - 1] : 0;
      const relativeTarget = targetClears - prevTarget;
      const relativeClears = Math.max(0, clears - prevTarget);
      UIController.showToast(`Пройдите ещё уровни типа "${config.name}"! Прогресс: ${relativeClears}/${relativeTarget}`, 'error');
    }
  }

  function getCodeHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  async function handlePromoCodeSubmit() {
    const inputEl = document.getElementById('tasks-code-input');
    if (!inputEl) return;
    const code = inputEl.value.trim().toUpperCase();
    if (!code) {
      UIController.showToast('Введите промокод!', 'error');
      return;
    }

    // Специальные коды с несколькими наградами (не хэш-таблица)
    const SPECIAL_CODES = {
      'режимы!': { coins: 300, hint: 3, msg: '+300 Dcdr и +3 Дешифратора' }
    };
    const codeLC = code.toLowerCase();
    if (codeLC in SPECIAL_CODES) {
      const claimKeyS = `code_${codeLC}`;
      if (completedTasks.includes(claimKeyS)) {
        UIController.showToast('Этот код уже активирован!', 'error');
        return;
      }
      const r = SPECIAL_CODES[codeLC];
      completedTasks.push(claimKeyS);
      coins += r.coins;
      boosters.hint = (boosters.hint || 0) + r.hint;
      UIController.updateCoins(coins);
      saveGameState();
      UIController.showToast(`Код активирован! ${r.msg}`, 'success');
      inputEl.value = '';
      const balEl = document.getElementById('tasks-coins-balance');
      if (balEl) balEl.textContent = coins;
      refreshShopUI();
      return;
    }

    const HASH_REWARDS = {
      1563367288: 150,  // MAX_BIZ
      3364285426: 250,  // DECODER_PRO
      146561872: 500,  // SECRET_HACK
      1074887679: 250   // НАЧАЛО
    };

    const hash = getCodeHash(code);
    if (!(hash in HASH_REWARDS)) {
      UIController.showToast('Неверный код!', 'error');
      return;
    }

    const claimKey = `code_${code.toLowerCase()}`;
    if (completedTasks.includes(claimKey)) {
      UIController.showToast('Этот код уже активирован!', 'error');
      return;
    }

    const reward = HASH_REWARDS[hash];
    completedTasks.push(claimKey);
    coins += reward;
    if (hash === 1074887679) { // "НАЧАЛО"
      if (!unlockedTitles.includes('title_5')) {
        unlockedTitles.push('title_5');
        UIController.showToast('Получено секретное звание [Старый]!', 'success');
      }
    }
    UIController.updateCoins(coins);
    saveGameState();
    UIController.showToast(`Код активирован! +${reward} Dcdr`, 'success');
    inputEl.value = '';

    const coinsBalanceEl = document.getElementById('tasks-coins-balance');
    if (coinsBalanceEl) {
      coinsBalanceEl.textContent = coins;
    }
  }

  function showRules() {
    UIController.liftTransition(state.currentScreen, 'screen-rules');
    state.currentScreen = 'screen-rules';
    updateBackButton('screen-rules');
  }

  function backToMenu() {
    const rulesEl = document.getElementById('screen-rules');
    const menuEl = document.getElementById('screen-menu');

    rulesEl.classList.remove('screen--active');
    rulesEl.classList.add('screen--exit-down');
    menuEl.classList.add('screen--active');

    setTimeout(() => rulesEl.classList.remove('screen--exit-down'), 600);
    state.currentScreen = 'screen-menu';
    updateBackButton('screen-menu');
    updateBottomNavActive('screen-menu');
  }

  async function showLeaderboard() {
    UIController.liftTransition(state.currentScreen, 'screen-leaderboard');
    state.currentScreen = 'screen-leaderboard';
    updateBackButton('screen-leaderboard');

    // В меню рейтинг по очкам текущего сезона
    await renderLeaderboardData('season');
  }

  // Кастомные SVG медали для топ-3 позиций в рейтинге
  function _getMedalSvg(index) {
    const medals = [
      { stroke: '#FFD700', fill: 'rgba(255,201,77,0.18)', inner: 'rgba(255,213,0,0.35)', text: '#FFD700', glow: 'drop-shadow(0 0 5px rgba(255,213,0,0.75))' },
      { stroke: '#C0C8D0', fill: 'rgba(192,200,208,0.14)', inner: 'rgba(192,200,208,0.30)', text: '#C8D0D8', glow: 'drop-shadow(0 0 4px rgba(192,200,208,0.55))' },
      { stroke: '#CD9440', fill: 'rgba(205,148,64,0.14)', inner: 'rgba(205,148,64,0.30)', text: '#CD9440', glow: 'drop-shadow(0 0 4px rgba(205,148,64,0.55))' },
    ];
    const m = medals[index];
    // Гексагон: points="20,2 37,11 37,33 20,42 3,33 3,11"
    // Центр X = 20, центр Y = (2+42)/2 = 22
    // dominant-baseline:central + alignment-baseline:central — максимальная совместимость
    return `<svg viewBox="0 0 40 44" width="36" height="40" style="display:block;flex-shrink:0;filter:${m.glow};">
      <polygon points="20,2 37,11 37,33 20,42 3,33 3,11" fill="${m.fill}" stroke="${m.stroke}" stroke-width="1.5"/>
      <polygon points="20,7 32,14 32,30 20,37 8,30 8,14" fill="none" stroke="${m.inner}" stroke-width="0.7"/>
      <text x="20" y="22" text-anchor="middle"
        style="dominant-baseline:central;alignment-baseline:central;font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;fill:${m.text};">${index + 1}</text>
    </svg>`;
  }

  // Форматирование числа с пробелами-разрядами: 9811 -> "9 811"
  function _fmtLbNum(n) {
    n = Math.floor(Number(n) || 0);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // Строка рейтинга в стиле картинки: аватар-квадрат + ранг в углу, имя, число справа
  function _buildLbRow(rank, name, avatarHtml, badgeHtml, valueNum, unit, opts) {
    opts = opts || {};
    const cls = (rank >= 1 && rank <= 3) ? ' lb-row--' + rank : '';
    const rankLabel = (typeof rank === 'number') ? rank : rank; // строка ('100+') допустима
    const sub = opts.sub
      ? '<span class="lb-row-sub">' + opts.sub + '</span>'
      : '';
    return '' +
      '<div class="lb-av">' +
        avatarHtml +
        '<span class="lb-av-rank">' + rankLabel + '</span>' +
      '</div>' +
      '<div class="lb-row-main">' +
        '<span class="lb-row-name">' + escapeHtml(name) + badgeHtml + '</span>' +
        sub +
      '</div>' +
      '<div class="lb-row-val">' +
        '<span class="lb-row-num">' + _fmtLbNum(valueNum) + '</span>' +
        '<span class="lb-row-unit">' + unit + '</span>' +
      '</div>';
  }

  async function renderLeaderboardData(type) {
    const loadingEl = document.getElementById('leaderboard-loading');
    const listEl = document.getElementById('leaderboard-list');
    const myCardEl = document.getElementById('lb-my-card');

    loadingEl.style.display = 'block';
    listEl.innerHTML = '';
    myCardEl.style.display = 'none';

    // Заголовок рейтинга
    const titleEl = document.querySelector('.leaderboard-title');
    if (titleEl) {
      if (type === 'season') {
        const daysLeft = seasonStart ? Math.max(0, 30 - Math.floor((Date.now() - seasonStart) / 86400000)) : 30;
        titleEl.textContent = '// СЕЗОН — ТОП АГЕНТОВ';
        titleEl.title = 'До конца сезона: ' + daysLeft + ' дн.';
      } else {
        titleEl.textContent = 'Топ хакеров:';
        titleEl.title = '';
      }
    }

    if (window.SupabaseAPI) {
      const data = await window.SupabaseAPI.fetchLeaderboard(type);
      loadingEl.style.display = 'none';

      let maxUser = null;
      if (window.WebApp && window.WebApp.initData) {
        try {
          const urlParams = new URLSearchParams(window.WebApp.initData);
          const userParam = urlParams.get('user');
          if (userParam) maxUser = JSON.parse(userParam);
        } catch (e) { }
      }
      const currentUserId = maxUser ? maxUser.id.toString() : null;

      let myRank = -1;
      let myData = null;

      if (data && data.length > 0) {
        data.forEach((user, index) => {
          if (currentUserId && user.user_id === currentUserId) {
            myRank = index + 1;
            myData = user;
          }

          let gd = user.game_data;
          try { if (typeof gd === 'string') gd = JSON.parse(gd); } catch (e) { }

          const valNum = type === 'score' ? user.score :
            type === 'levels' ? (gd?.decoder_levels || 0) :
            type === 'season' ? (gd?.decoder_season_points || 0) :
              (gd?.decoder_coins || 0);
          const unit = type === 'score' ? 'очк.' : type === 'levels' ? 'ур.' : type === 'season' ? 'сп.' : 'кр.';
          const avatarHtml = window.SupabaseAPI.buildAvatarHtml(user.name, gd && gd.photo_url, 46);
          const badgeHtml = buildTitleBadgeHtml(gd?.decoder_active_title || 'title_1');

          const item = document.createElement('div');
          item.className = 'lb-row' + (index < 3 ? ' lb-row--' + (index + 1) : '');
          item.innerHTML = _buildLbRow(index + 1, user.name, avatarHtml, badgeHtml, valNum, unit);
          listEl.appendChild(item);
        });


        if (currentUserId && myRank === -1) {
          myRank = '100+';
          myData = {
            name: maxUser.first_name || 'Хакер',
            score: bestScore,
            game_data: {
              decoder_coins: coins,
              decoder_levels: totalLevels,
              photo_url: maxUser.photo_url,
              decoder_active_title: activeTitle
            }
          };
        }

        if (myData) {
          let gdMy = myData.game_data;
          try { if (typeof gdMy === 'string') gdMy = JSON.parse(gdMy); } catch (e) { }

          const myValNum = type === 'score' ? myData.score :
            type === 'levels' ? (gdMy?.decoder_levels || 0) :
            type === 'season' ? (gdMy?.decoder_season_points || seasonPoints || 0) :
              (gdMy?.decoder_coins || 0);
          const myUnit = type === 'score' ? 'очк.' : type === 'levels' ? 'ур.' : type === 'season' ? 'сп.' : 'кр.';
          const myAvatarHtml = window.SupabaseAPI.buildAvatarHtml(myData.name, gdMy && gdMy.photo_url, 46);
          const myBadgeHtml = buildTitleBadgeHtml(gdMy?.decoder_active_title || 'title_1');

          const myTop3 = (typeof myRank === 'number' && myRank <= 3);
          myCardEl.className = 'leaderboard-my-card' + (myTop3 ? ' lb-row--' + myRank : '');
          myCardEl.style.display = 'flex';
          myCardEl.innerHTML = _buildLbRow(myRank, myData.name, myAvatarHtml, myBadgeHtml, myValNum, myUnit, { sub: 'Ваше место' });
        }
      } else {
        listEl.innerHTML = '<div style="text-align:center;color:var(--c-text-muted);padding:20px;">Нет данных</div>';
      }
    } else {
      loadingEl.style.display = 'none';
      listEl.innerHTML = '<div style="text-align:center;color:var(--c-error);padding:20px;">Ошибка подключения</div>';
    }
  }

  function backToMenuFromLeaderboard() {
    const lbEl = document.getElementById('screen-leaderboard');
    const menuEl = document.getElementById('screen-menu');

    lbEl.classList.remove('screen--active');
    lbEl.classList.add('screen--exit-down');
    menuEl.classList.add('screen--active');

    setTimeout(() => lbEl.classList.remove('screen--exit-down'), 600);
    state.currentScreen = 'screen-menu';
    updateBackButton('screen-menu');
    updateBottomNavActive('screen-menu');
  }

  function goToMenu() {
    if (window.WebApp && window.WebApp.disableClosingConfirmation) window.WebApp.disableClosingConfirmation();
    UIController.hideOverlay('screen-game-over');
    UIController.hideOverlay('screen-level-win');
    _stopTimer();
    // Clean up stream/dice mode artifacts
    state.streamMode = false;
    state.diceHellMode = false;
    const hudEl = document.getElementById('stream-hud');
    if (hudEl) hudEl.classList.add('hidden');
    const floorWord = document.querySelector('.floor-word');
    if (floorWord) floorWord.textContent = 'ЭТАЖ';

    const gameEl = document.getElementById('screen-game');
    const menuEl = document.getElementById('screen-menu');

    gameEl.classList.remove('screen--active');
    gameEl.classList.add('screen--exit-down');
    menuEl.classList.add('screen--active');

    setTimeout(() => gameEl.classList.remove('screen--exit-down'), 600);
    state.currentScreen = 'screen-menu';
    updateBackButton('screen-menu');
    updateBottomNavActive('screen-menu');
    UIController.updateMenuStats(bestScore, totalLevels, coins, streamBestScore, diceBestScore, seasonPoints);
  }

  function startGame() {
    if (window.WebApp && window.WebApp.enableClosingConfirmation) window.WebApp.enableClosingConfirmation();
    state.currentLevel = 1;
    state.score = 0;
    state.sessionLevelsCleared = 0;
    state.hackedSafe = false;
    state.shopPaused = false;
    state.streamMode = false;
    state.diceHellMode = false;
    state.practiceMode = false;
    state.lastMode = 'classic';
    _hideNavShopBadge();
    // Hide stream HUD if visible
    const hudEl = document.getElementById('stream-hud');
    if (hudEl) hudEl.classList.add('hidden');
    const floorWord = document.querySelector('.floor-word');
    if (floorWord) floorWord.textContent = 'ЭТАЖ';
    const fromScreen = state.currentScreen;
    UIController.liftTransition(fromScreen, 'screen-game');
    state.currentScreen = 'screen-game';
    updateBackButton('screen-game');
    updateBottomNavActive('screen-game');
    _loadLevel(state.currentLevel);
  }

  // ══════════════════ PRACTICE MODE ══════════════════
  function startPracticeGame() {
    state.currentLevel = 1;
    state.score = 0;
    state.sessionLevelsCleared = 0;
    state.hackedSafe = false;
    state.shopPaused = false;
    state.streamMode = false;
    state.diceHellMode = false;
    state.practiceMode = true;
    state.lastMode = 'practice';
    _hideNavShopBadge();
    const hudEl = document.getElementById('stream-hud');
    if (hudEl) hudEl.classList.add('hidden');
    const floorWord = document.querySelector('.floor-word');
    if (floorWord) floorWord.textContent = 'ЭТАЖ';
    const fromScreen = state.currentScreen;
    UIController.liftTransition(fromScreen, 'screen-game');
    state.currentScreen = 'screen-game';
    updateBackButton('screen-game');
    updateBottomNavActive('screen-game');
    UIController.showToast('ТРЕНИРОВКА — таймер и очки отключены', 'info');
    _loadLevel(state.currentLevel);
  }

  function restartGame() {
    UIController.hideOverlay('screen-game-over');
    _stopTimer();
    if (state.lastMode === 'stream') {
      startStreamGame();
      return;
    }
    if (state.lastMode === 'dice') {
      startDiceHellGame();
      return;
    }
    if (state.lastMode === 'practice') {
      startPracticeGame();
      return;
    }
    state.currentLevel = 1;
    state.score = 0;
    state.sessionLevelsCleared = 0;
    state.hackedSafe = false;
    state.shopPaused = false;
    _hideNavShopBadge();
    _loadLevel(state.currentLevel);
  }

  function _loadLevel(levelNum) {
    _stopTimer();
    state.isGameActive = false;
    state.isInputBlocked = false;
    state.attemptsUsed = 0;
    state.isFractal = false;
    state.voidMode = false;

    levelBoostersUsed = { time: false, attempts: false, hint: false };

    const config = generateLevel(levelNum);
    state.levelConfig = config;

    UIController.resetSpecialModes();

    let extraAttempts = 0;
    let extraTime = 0;
    if (activeTheme === 'matrix') {
      extraTime = 10;
    } else if (activeTheme === 'synthwave') {
      extraAttempts = 1;
    } else if (activeTheme === 'crt') {
      extraTime = 15;
      extraAttempts = 1;
    }

    state.attemptsLeft = state.practiceMode ? 999 : (config.type === LEVEL_TYPE.GLITCH ? 1 : config.maxAttempts + extraAttempts);
    state.timeLeft = config.timeLimit + extraTime;
    state.lockedCells = new Array(config.cellCount).fill(false);
    state.historyCount = 0;

    UIController.clearDiceInstances();
    UIController.clearCipherInstances();
    UIController.clearCellHunt();

    // Force-reset input visibility and blocked state at every level load
    const inputCellsEl = document.getElementById('input-cells');
    if (inputCellsEl) inputCellsEl.classList.remove('hidden');
    const btnSubmitEl = document.getElementById('btn-submit');
    if (btnSubmitEl) { btnSubmitEl.classList.remove('hidden'); btnSubmitEl.disabled = false; }
    state.isInputBlocked = false;

    UIController.setLevel(levelNum);
    UIController.setAttempts(state.attemptsLeft);
    UIController.setTimer(state.timeLeft, config.timeLimit + extraTime);
    UIController.setLevelTypeBanner(config.type);
    UIController.clearHistory();
    UIController.hideBonusArrows();

    // Скрываем историю попыток для кубиков (она там не нужна)
    const historyAreaEl = document.getElementById('history-area');
    if (historyAreaEl) {
      if (config.type === LEVEL_TYPE.DICE_SINGLE || config.type === LEVEL_TYPE.DICE_MULTI || config.type === LEVEL_TYPE.CELL_HUNT || config.type === LEVEL_TYPE.VOID_SIGNAL) {
        historyAreaEl.classList.add('hidden');
      } else {
        historyAreaEl.classList.remove('hidden');
      }
    }
    UIController.hideSafeInfo();
    UIController.stopGlitch();

    const inputArea = document.getElementById('input-area');
    const toolbar = document.getElementById('booster-toolbar');
    const levelCard = document.querySelector('.level-card');

    if (config.type === LEVEL_TYPE.VOID_SIGNAL) {
      // Специальный уровень "Пустота и сигнал" — минимальная визуальная обратная связь
      inputArea.classList.remove('hidden');
      if (toolbar) toolbar.classList.add('hidden');
      if (levelCard) {
        levelCard.classList.add('void-mode');
        levelCard.classList.remove('fractal-mode');
      }

      InputController.init(config);
      InputController.onSubmit(handleSubmit);
      InputController.enableSubmit();

      // Скрываем визуальные подсказки
      const typeBanner = document.getElementById('level-type-banner');
      if (typeBanner) typeBanner.classList.add('hidden');

      state.voidMode = true;
      state.isGameActive = true;
      _startTimer();
    } else if (config.type === LEVEL_TYPE.FRACTAL) {
      // Фрактальный спуск — многоэтажная система с масштабированием
      inputArea.classList.remove('hidden');
      if (toolbar) toolbar.classList.add('hidden');
      if (levelCard) {
        levelCard.classList.add('fractal-mode');
        levelCard.classList.remove('void-mode');
      }

      state.fractalStage = 0;
      state.isFractal = true;
      InputController.init(config);
      InputController.onSubmit(handleSubmit);
      InputController.enableSubmit();

      state.isGameActive = true;
      _startTimer();
    } else if (config.type === LEVEL_TYPE.DICE_SINGLE || config.type === LEVEL_TYPE.DICE_MULTI) {
      inputArea.classList.remove('hidden');
      if (toolbar) {
        toolbar.classList.remove('hidden');
        try {
          UIController.renderBoosterToolbar(boosters, levelBoostersUsed);
        } catch (e) {
          console.warn('[GameManager] renderBoosterToolbar error:', e);
        }
      }
      state.diceValues = new Array(config.cellCount).fill(null);

      const rollAllCb = config.type === LEVEL_TYPE.DICE_MULTI ? _onRollAllDice : null;
      UIController.renderDiceLevel(config.password, config.cellCount, (index) => {
        _onDiceRollClick(index);
      }, rollAllCb);

      state.isGameActive = true;
      _startTimer();
    } else if (config.type === LEVEL_TYPE.CELL_HUNT) {
      inputArea.classList.remove('hidden');
      if (toolbar) {
        toolbar.classList.remove('hidden');
        try {
          UIController.renderBoosterToolbar(boosters, levelBoostersUsed);
        } catch (e) {
          console.warn('[GameManager] renderBoosterToolbar error:', e);
        }
      }
      state.deadCells = new Array(config.cellCount).fill(false);

      UIController.renderCellHunt(config.cellCount, (index) => {
        _onCellHuntClick(index);
      });

      state.isGameActive = true;
      _startTimer();
    } else if (config.type === LEVEL_TYPE.SHIFT_CIPHER) {
      inputArea.classList.remove('hidden');
      if (toolbar) {
        toolbar.classList.remove('hidden');
        try {
          UIController.renderBoosterToolbar(boosters, levelBoostersUsed);
        } catch (e) {
          console.warn('[GameManager] renderBoosterToolbar error:', e);
        }
      }

      state.cipherValues = [...config.password];
      const scrambles = randomInt(4, 5);
      for (let s = 0; s < scrambles; s++) {
        const idx = randomInt(0, config.cellCount - 1);
        state.cipherValues[idx] = (state.cipherValues[idx] + 9) % 10;
        const nextIdx = (idx + 1) % config.cellCount;
        state.cipherValues[nextIdx] = (state.cipherValues[nextIdx] + 1) % 10;
      }
      if (state.cipherValues.every((val, i) => val === config.password[i])) {
        const idx = 0;
        state.cipherValues[idx] = (state.cipherValues[idx] + 9) % 10;
        const nextIdx = (idx + 1) % config.cellCount;
        state.cipherValues[nextIdx] = (state.cipherValues[nextIdx] + 1) % 10;
      }

      UIController.renderInteractiveCipher(config.password, state.cipherValues, config.cellCount, (index) => {
        _onCipherCellClick(index);
      });

      state.isGameActive = true;
      _startTimer();
    } else {
      if (config.type === LEVEL_TYPE.GLITCH) {
        inputArea.classList.add('hidden');
        if (toolbar) toolbar.classList.add('hidden');

        UIController.startGlitch(config.password, () => {
          inputArea.classList.remove('hidden');
          if (toolbar) {
            toolbar.classList.remove('hidden');
            try {
              UIController.renderBoosterToolbar(boosters, levelBoostersUsed);
            } catch (e) {
              console.warn('[GameManager] renderBoosterToolbar error:', e);
            }
          }
          InputController.init(config);
          InputController.onSubmit(handleSubmit);
          InputController.enableSubmit();
          state.isGameActive = true;
          _startTimer();
        });
      } else {
        inputArea.classList.remove('hidden');
        if (toolbar) {
          toolbar.classList.remove('hidden');
          try {
            UIController.renderBoosterToolbar(boosters, levelBoostersUsed);
          } catch (e) {
            console.warn('[GameManager] renderBoosterToolbar error:', e);
          }
        }
        InputController.init(config);
        InputController.onSubmit(handleSubmit);
        InputController.enableSubmit();
        state.isGameActive = true;
        _startTimer();
      }
    }

    if (config.type === LEVEL_TYPE.SAFE) {
      UIController.showSafeInfo(config.safeLinks, config.cellCount);
    }

    _maybeShowTutorial(config.type);
  }

  function applyBooster(type) {
    if (!state.isGameActive || state.isInputBlocked) return;
    if (levelBoostersUsed[type]) {
      UIController.showToast('Уже использовано на этом этаже!', 'error');
      return;
    }
    if (!boosters[type] || boosters[type] <= 0) {
      UIController.showToast('Нет бустеров на складе!', 'error');
      return;
    }

    if (type === 'time') {
      state.timeLeft += 15;
      UIController.setTimer(state.timeLeft, state.levelConfig.timeLimit);
      UIController.showToast('Внедрено +15 сек!', 'success');
    } else if (type === 'attempts') {
      state.attemptsLeft += 3;
      UIController.setAttempts(state.attemptsLeft);
      UIController.showToast('Разблокировано +3 попытки!', 'success');
    } else if (type === 'hint') {

      if (state.levelConfig.type === LEVEL_TYPE.CELL_HUNT) {
        const winning = state.levelConfig.password[0];
        const candidates = [];
        for (let i = 0; i < state.levelConfig.cellCount; i++) {
          if (i !== winning && !(state.deadCells && state.deadCells[i])) candidates.push(i);
        }
        if (candidates.length === 0) {
          UIController.showToast('Подсказка недоступна', 'info');
          return;
        }
        const elim = candidates[Math.floor(Math.random() * candidates.length)];
        if (!state.deadCells) state.deadCells = new Array(state.levelConfig.cellCount).fill(false);
        state.deadCells[elim] = true;
        UIController.setCellDead(elim);
        UIController.showToast('Ячейка ' + (elim + 1) + ' помечена пустой', 'success');
        levelBoostersUsed[type] = true;
        boosters[type]--;
        saveGameState();
        UIController.renderBoosterToolbar(boosters, levelBoostersUsed);
        return;
      }

      const unsolved = [];
      state.lockedCells.forEach((locked, i) => {
        if (!locked) unsolved.push(i);
      });

      if (unsolved.length === 0) {
        UIController.showToast('Все ячейки уже разгаданы!', 'info');
        return;
      }

      const randIdx = unsolved[Math.floor(Math.random() * unsolved.length)];
      const val = state.levelConfig.password[randIdx];

      state.lockedCells[randIdx] = true;
      const isDice = state.levelConfig.type === LEVEL_TYPE.DICE_SINGLE || state.levelConfig.type === LEVEL_TYPE.DICE_MULTI;
      const isCipher = state.levelConfig.type === LEVEL_TYPE.SHIFT_CIPHER;

      if (isDice) {
        state.diceValues[randIdx] = val;
        UIController.rollDie(randIdx, val, () => {
          UIController.setDiceMatched(randIdx, true);
        });
      } else if (isCipher) {
        state.cipherValues[randIdx] = val;
        UIController.updateInteractiveCipherUI(state.cipherValues, state.levelConfig.password, state.levelConfig.cellCount);
      } else {
        InputController.updateLocks(state.lockedCells);
        InputController.setDigit(randIdx, val);
      }

      UIController.showToast(`Ячейка ${randIdx + 1} расшифрована: ${val}`, 'success');

      if (isDice || isCipher) {
        const allMatched = state.lockedCells.every(locked => locked);
        if (allMatched) {
          _stopTimer();
          state.isGameActive = false;
          setTimeout(() => _onLevelWin(), 800);
        }
      }
    }

    levelBoostersUsed[type] = true;
    boosters[type]--;
    saveGameState();
    UIController.renderBoosterToolbar(boosters, levelBoostersUsed);
  }

  function _onDiceRollClick(index) {
    if (!state.isGameActive) return;

    const container = document.getElementById('dice-container');
    if (!container) return;
    const die = container.querySelector(`.dice-item[data-index="${index}"]`);
    if (!die || die.classList.contains('rolling') || state.lockedCells[index]) return;

    if (!_rollAllMode) {
      if (state.attemptsLeft <= 0) {
        if (state.diceHellMode) {
          _onDiceHellLifeLost('Попытки исчерпаны');
        } else {
          _showGameOver('Лимит попыток превышен. Доступ заблокирован!');
        }
        return;
      }
      state.attemptsLeft--;
      UIController.setAttempts(state.attemptsLeft);
      state.attemptsUsed++;
    }

    const rolledVal = randomInt(1, 6);
    state.diceValues[index] = rolledVal;

    UIController.rollDie(index, rolledVal, () => {
      const targetVal = state.levelConfig.password[index];
      if (rolledVal === targetVal) {
        state.lockedCells[index] = true;
        UIController.setDiceMatched(index, true);
        UIController.showToast(`Кубик ${index + 1} совпал: ${rolledVal}!`, 'success');
      } else {
        UIController.setDiceMatched(index, false);
      }

      const anyRolling = !!container.querySelector('.dice-item.rolling');
      if (!anyRolling) {
        _setRollAllDisabled(false); // анимация завершена — снова можно бросать
        const allMatched = state.lockedCells.every(locked => locked);
        if (allMatched) {
          _stopTimer();
          state.isGameActive = false;
          if (state.diceHellMode) {
            setTimeout(() => _onDiceHellSegmentWin(), 400);
          } else {
            setTimeout(() => _onLevelWin(), 400);
          }
          return;
        }

        if (state.attemptsLeft <= 0) {
          _stopTimer();
          state.isGameActive = false;
          if (state.diceHellMode) {
            setTimeout(() => _onDiceHellLifeLost('Попытки исчерпаны'), 400);
          } else {
            setTimeout(() => _showGameOver('Лимит попыток превышен. Доступ заблокирован!'), 400);
          }
        }
      }
    });
  }

  function _setRollAllDisabled(disabled) {
    const b = document.querySelector('.dice-roll-all-btn');
    if (b) {
      b.disabled = disabled;
      b.style.opacity = disabled ? '0.5' : '1';
      b.style.pointerEvents = disabled ? 'none' : 'auto';
    }
  }

  function _onRollAllDice() {
    if (!state.isGameActive || state.isInputBlocked) return;
    const config = state.levelConfig;
    if (!config) return;

    // Не бросаем, пока кубики ещё крутятся — иначе впустую тратятся попытки.
    const diceContainer = document.getElementById('dice-container');
    if (diceContainer && diceContainer.querySelector('.dice-item.rolling')) return;

    // Collect unlocked (not-yet-matched) dice
    const unlocked = [];
    for (let i = 0; i < config.cellCount; i++) {
      if (!state.lockedCells[i]) unlocked.push(i);
    }
    if (unlocked.length === 0) return;

    // Consume exactly 1 attempt for the whole roll
    if (state.attemptsLeft <= 0) {
      if (state.diceHellMode) {
        _onDiceHellLifeLost('Попытки исчерпаны');
      } else {
        _showGameOver('Лимит попыток превышен. Доступ заблокирован!');
      }
      return;
    }
    state.attemptsLeft--;
    UIController.setAttempts(state.attemptsLeft);
    state.attemptsUsed++;

    // Roll each unlocked die without charging additional attempts
    _rollAllMode = true;
    _setRollAllDisabled(true); // блокируем кнопку до конца анимации
    for (const i of unlocked) {
      _onDiceRollClick(i);
    }
    _rollAllMode = false;
  }

  function _onCellHuntClick(index) {
    if (!state.isGameActive || state.isInputBlocked) return;
    if (!state.deadCells) state.deadCells = new Array(state.levelConfig.cellCount).fill(false);
    if (state.deadCells[index]) return;

    if (state.attemptsLeft <= 0) {
      _showGameOver('Все попытки исчерпаны. Доступ заблокирован!');
      return;
    }

    const winning = state.levelConfig.password[0];

    if (index === winning) {
      UIController.setCellWin(index);
      _stopTimer();
      state.isGameActive = false;
      UIController.showToast('Живая ячейка найдена!', 'success');
      if (window.WebApp && window.WebApp.HapticFeedback) {
        try { window.WebApp.HapticFeedback.notificationOccurred('success'); } catch (e) { }
      }
      setTimeout(() => _onLevelWin(), 550);
      return;
    }

    // Неверно: ячейка гаснет, минус попытка
    state.attemptsLeft--;
    UIController.setAttempts(state.attemptsLeft);
    state.attemptsUsed++;
    state.deadCells[index] = true;
    UIController.setCellDead(index);
    if (window.WebApp && window.WebApp.HapticFeedback) {
      try { window.WebApp.HapticFeedback.impactOccurred('medium'); } catch (e) { }
    }

    if (state.attemptsLeft <= 0) {
      _stopTimer();
      state.isGameActive = false;
      setTimeout(() => _showGameOver('Все попытки исчерпаны. Доступ заблокирован!'), 400);
    }
  }

  function _onCipherCellClick(index) {
    if (!state.isGameActive || state.isInputBlocked) return;

    if (state.attemptsLeft <= 0) {
      _showGameOver('Лимит попыток превышен. Доступ заблокирован!');
      return;
    }

    state.attemptsLeft--;
    UIController.setAttempts(state.attemptsLeft);
    state.attemptsUsed++;

    state.cipherValues[index] = (state.cipherValues[index] + 1) % 10;
    const nextIdx = (index + 1) % state.levelConfig.cellCount;
    state.cipherValues[nextIdx] = (state.cipherValues[nextIdx] + 9) % 10;

    UIController.updateInteractiveCipherUI(state.cipherValues, state.levelConfig.password, state.levelConfig.cellCount);

    for (let i = 0; i < state.levelConfig.cellCount; i++) {
      state.lockedCells[i] = (state.cipherValues[i] === state.levelConfig.password[i]);
    }

    const allMatched = state.lockedCells.every(locked => locked);
    if (allMatched) {
      _stopTimer();
      state.isGameActive = false;
      if (state.streamMode) {
        setTimeout(() => _onStreamSegmentWin(), 400);
      } else {
        setTimeout(() => _onLevelWin(), 400);
      }
      return;
    }

    if (state.attemptsLeft <= 0) {
      _stopTimer();
      state.isGameActive = false;
      if (state.streamMode) {
        setTimeout(() => _onStreamLifeLost('Попытки исчерпаны'), 400);
      } else {
        setTimeout(() => _showGameOver('Лимит попыток превышен. Доступ заблокирован!'), 400);
      }
    }
  }

  function _startTimer() {
    _stopTimer();
    // В режиме тренировки таймер не идёт
    if (state.practiceMode) {
      UIController.setTimer(999, 999);
      return;
    }
    state.timerInterval = setInterval(() => {
      if (!state.isGameActive) return;
      state.timeLeft--;
      UIController.setTimer(state.timeLeft, state.levelConfig.timeLimit);

      if (state.timeLeft <= 0) {
        _onTimeOut();
      }
    }, 1000);
  }

  function _stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function _onTimeOut() {
    _stopTimer();
    state.isGameActive = false;
    state.isInputBlocked = true;
    InputController.disableSubmit();
    if (state.streamMode) {
      _onStreamLifeLost('Время вышло');
      return;
    }
    if (state.diceHellMode) {
      _onDiceHellLifeLost('Время вышло');
      return;
    }
    _showGameOver('Сессия закрыта. Время вышло!');
  }

  function handleSubmit(digits) {
    if (!state.isGameActive || state.isInputBlocked) return;

    const guess = Array.isArray(digits) ? digits : InputController.getDigits();

    const validation = validateInput(guess);
    if (!validation.valid) {
      InputController.showError(validation.reason);
      return;
    }

    state.isInputBlocked = true;
    InputController.disableSubmit();

    const { bulls, cows, results } = checkGuess(guess, state.levelConfig.password);

    state.lockedCells = applyLocks(state.lockedCells, results);
    InputController.updateLocks(state.lockedCells);

    const isHardcore = state.levelConfig.type === LEVEL_TYPE.HARDCORE;
    const isVoidSignal = state.levelConfig.type === LEVEL_TYPE.VOID_SIGNAL;

    if (isVoidSignal) {
      // Пустота и сигнал: показываем только текстовую информацию
      InputController.showResults(new Array(guess.length).fill('miss'));
      const noise = guess.filter((digit, i) => !results[i] || results[i] === 'miss').length;
      UIController.showVoidSignal(bulls, cows, noise);
    } else {
      InputController.showResults(isHardcore ? new Array(guess.length).fill('miss') : results);
    }

    if (isHardcore) {
      UIController.showHardcoreFlash(bulls, cows);
    }

    if (state.levelConfig.type === LEVEL_TYPE.BONUS) {
      UIController.showBonusArrows(guess, state.levelConfig.password, results);
    }

    state.historyCount++;
    state.attemptsUsed++;
    state.attemptsLeft--;
    UIController.setAttempts(state.attemptsLeft);
    UIController.addHistoryRow(
      state.historyCount,
      guess,
      results,
      bulls,
      cows,
      isHardcore
    );

    if (bulls === state.levelConfig.cellCount) {
      _stopTimer();
      state.isGameActive = false;
      if (state.streamMode) {
        setTimeout(() => _onStreamSegmentWin(), 400);
      } else if (state.isFractal) {
        setTimeout(() => _onFractalStageClear(), 400);
      } else {
        setTimeout(() => _onLevelWin(), 400);
      }
      return;
    }

    if (state.attemptsLeft <= 0) {
      _stopTimer();
      state.isGameActive = false;
      try { navigator.vibrate && navigator.vibrate([80, 40, 80]); } catch(e) {}
      if (state.streamMode) {
        setTimeout(() => _onStreamLifeLost('Попытки исчерпаны'), 400);
      } else {
        setTimeout(() => _showGameOver('Лимит попыток превышен. Доступ заблокирован!'), 400);
      }
      return;
    }

    // Вибрация: короткая — неверная попытка
    if (bulls < state.levelConfig.cellCount) {
      try { navigator.vibrate && navigator.vibrate(60); } catch(e) {}
    }

    setTimeout(() => {
      InputController.clearUnlocked();
      state.isInputBlocked = false;
      InputController.enableSubmit();
    }, 500);
  }

  function _onFractalStageClear() {
    const FRACTAL_STAGES = [
      { cells: 4, attempts: 15, time: 45 },
      { cells: 5, attempts: 10, time: 32 },
      { cells: 6, attempts: 8,  time: 22 },
    ];
    const completedStage = state.fractalStage;
    state.fractalStage++;

    if (state.fractalStage >= FRACTAL_STAGES.length) {
      // All stages done — real win
      _onLevelWin();
      return;
    }

    const nextStageParams = FRACTAL_STAGES[state.fractalStage];
    const stageLabel = `${state.fractalStage + 1}/${FRACTAL_STAGES.length}`;

    UIController.showToast(`⚡ Слой ${completedStage + 1} взломан! Погружаюсь глубже...`, 'success');

    const levelCard = document.querySelector('.level-card');
    if (levelCard) {
      levelCard.classList.add('stage-transition');
      setTimeout(() => levelCard.classList.remove('stage-transition'), 700);
    }

    setTimeout(() => {
      const newPassword = generatePassword(nextStageParams.cells);
      state.levelConfig = Object.assign({}, state.levelConfig, {
        cellCount:   nextStageParams.cells,
        password:    newPassword,
        maxAttempts: nextStageParams.attempts,
        timeLimit:   nextStageParams.time,
        fractalStage: state.fractalStage,
      });

      state.attemptsLeft  = nextStageParams.attempts;
      state.timeLeft      = nextStageParams.time;
      state.lockedCells   = new Array(nextStageParams.cells).fill(false);
      state.historyCount  = 0;
      state.attemptsUsed  = 0;
      state.isInputBlocked = false;

      UIController.clearHistory();
      UIController.setAttempts(state.attemptsLeft);
      UIController.setTimer(state.timeLeft, nextStageParams.time);

      // Update banner text to show current stage
      const bannerTypeText = document.getElementById('level-type-text');
      if (bannerTypeText) bannerTypeText.textContent = `⚡ ФРАКТАЛЬНЫЙ СПУСК [${stageLabel}]`;

      InputController.init(state.levelConfig);
      InputController.onSubmit(handleSubmit);
      InputController.enableSubmit();

      state.isGameActive = true;
      _startTimer();

      UIController.showToast(`Слой ${stageLabel} — угадай ${nextStageParams.cells}-значный код!`, 'info');
    }, 1600);
  }

  function _onLevelWin() {
    // ── PRACTICE MODE: без очков и DCDR ──
    if (state.practiceMode) {
      if (window.WebApp && window.WebApp.HapticFeedback) {
        try { window.WebApp.HapticFeedback.notificationOccurred('success'); } catch (e) { }
      }
      // Показываем "ТРЕНИРОВКА" вместо бонуса времени
      const timeBonusEl = document.getElementById('win-time-bonus');
      if (timeBonusEl) timeBonusEl.textContent = '—';
      const attemptsEl = document.getElementById('win-attempts-used');
      if (attemptsEl) attemptsEl.textContent = state.attemptsUsed;
      const coinsEl = document.getElementById('win-coins-earned');
      if (coinsEl) coinsEl.textContent = '—';
      UIController.showOverlay('screen-level-win');
      return;
    }

    const timeBonus = Math.floor(state.timeLeft * 10);
    const attemptBonus = (state.attemptsLeft + 1) * 50;
    const levelBonus = state.currentLevel * 100;
    const earned = timeBonus + attemptBonus + levelBonus;
    state.score += earned;

    const baseReward = 10;
    const levelFactor = state.currentLevel * 5;
    const difficultyMultipliers = { standard: 1.0, bonus: 1.2, glitch: 1.4, safe: 1.6, hardcore: 2.0 };
    const multiplier = difficultyMultipliers[state.levelConfig.type] || 1.0;
    let coinsEarned = state.currentLevel >= 2 ? Math.floor((baseReward + levelFactor) * multiplier) : 0;

    let themeMultiplier = 1.0;
    if (activeTheme === 'matrix') {
      themeMultiplier = 1.15;
    } else if (activeTheme === 'synthwave') {
      themeMultiplier = 1.25;
    } else if (activeTheme === 'crt') {
      themeMultiplier = 1.40;
    }
    coinsEarned = Math.floor(coinsEarned * themeMultiplier);

    if (coinsEarned > 0) {
      coins += coinsEarned;
      UIController.updateCoins(coins);
    }

    totalLevels = Math.max(totalLevels, state.currentLevel);
    bestScore = Math.max(bestScore, state.score);
    state.sessionLevelsCleared = (state.sessionLevelsCleared || 0) + 1;
    if (state.levelConfig && state.levelConfig.type === LEVEL_TYPE.SAFE) {
      state.hackedSafe = true;
    }
    if (state.levelConfig) {
      const type = state.levelConfig.type;
      if (type === LEVEL_TYPE.SAFE) stats.safe_clears = (stats.safe_clears || 0) + 1;
      else if (type === LEVEL_TYPE.GLITCH) stats.glitch_clears = (stats.glitch_clears || 0) + 1;
      else if (type === LEVEL_TYPE.SHIFT_CIPHER) stats.cipher_clears = (stats.cipher_clears || 0) + 1;
      else if (type === LEVEL_TYPE.BONUS) stats.bonus_clears = (stats.bonus_clears || 0) + 1;
      else if (type === LEVEL_TYPE.DICE_SINGLE || type === LEVEL_TYPE.DICE_MULTI) stats.dice_clears = (stats.dice_clears || 0) + 1;
      else if (type === LEVEL_TYPE.HARDCORE) stats.hardcore_clears = (stats.hardcore_clears || 0) + 1;
      else if (type === LEVEL_TYPE.FRACTAL) stats.fractal_clears = (stats.fractal_clears || 0) + 1;
      else if (type === LEVEL_TYPE.VOID_SIGNAL) stats.void_signal_clears = (stats.void_signal_clears || 0) + 1;
    }
    // Начисляем очки сезона: 10 + level*5 + type-множитель
    const seasonMult = { standard: 1, bonus: 1.3, glitch: 1.6, safe: 1.8, hardcore: 2.5, shift_cipher: 1.4, void_signal: 2.0, dice_single: 1.2, dice_multi: 1.5 };
    const sType = state.levelConfig && state.levelConfig.type;
    const spEarned = Math.round((10 + state.currentLevel * 5) * (seasonMult[sType] || 1));
    seasonPoints += spEarned;

    saveGameState(state.currentLevel);
    if (window.WebApp && window.WebApp.HapticFeedback) {
      try { window.WebApp.HapticFeedback.notificationOccurred('success'); } catch (e) { }
    } else if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    if (window.WebApp && window.WebApp.disableClosingConfirmation) window.WebApp.disableClosingConfirmation();
    if (window.WebApp && window.WebApp.ScreenCapture && window.WebApp.ScreenCapture.enableScreenCapture) window.WebApp.ScreenCapture.enableScreenCapture();

    UIController.showWinData(state.timeLeft, state.attemptsUsed, coinsEarned);
    UIController.showOverlay('screen-level-win');
  }

  function nextLevel() {
    UIController.hideOverlay('screen-level-win');
    state.currentLevel++;

    UIController.playElevatorTransition(() => {
      _loadLevel(state.currentLevel);
    });
  }

  // ══════════════════ DAILY PASSWORD MODE ══════════════════
  const DAILY_FN_URL = 'https://ewctmwbzhojjevfvskkh.supabase.co/functions/v1/daily-password';
  let _dailyAttemptsUsed = 0;
  const DAILY_MAX_ATTEMPTS = 2;
  // Жирная награда за взлом «Пароля дня» — начисляется один раз в сутки.
  // ВАЖНО: значение должно совпадать с DAILY_PW_REWARD в supabase/functions/save-score/index.ts
  const DAILY_PW_REWARD = 1000;

  function _dailyAuthHeader() {
    if (window.WebApp && window.WebApp.initData) {
      return { 'Authorization': 'tma ' + window.WebApp.initData };
    }
    return {};
  }

  async function openDailyPasswordMode() {
    UIController.liftTransition(state.currentScreen, 'screen-daily');
    state.currentScreen = 'screen-daily';
    updateBackButton('screen-daily');

    // Reset UI
    _dailyAttemptsUsed = 0;
    _dailyResetUI();

    // Восстанавливаем попытки из game_data (надёжно и мгновенно, без ожидания сервера)
    _restoreDailyFromGameData();

    _loadDailyLeaderboard();
  }

  // Восстановление состояния «Пароля дня» сегодняшнего дня из game_data
  function _restoreDailyFromGameData() {
    const today = new Date().toISOString().slice(0, 10);

    // Читаем оба источника синхронно
    let serverSt = null;
    if (window.SupabaseAPI && window.SupabaseAPI.gameData) {
      const gd = window.SupabaseAPI.gameData;
      if (gd.decoder_daily_pw && gd.decoder_daily_pw.date === today) {
        serverSt = gd.decoder_daily_pw;
      }
    }

    let localSt = null;
    try {
      const raw = localStorage.getItem('decoder_daily_pw_' + today);
      if (raw) { const p = JSON.parse(raw); if (p && p.date === today) localSt = p; }
    } catch (e) {}

    // Берём тот источник, где больше попыток (он актуальнее)
    const serverLen = serverSt && serverSt.rows ? serverSt.rows.length : 0;
    const localLen  = localSt  && localSt.rows  ? localSt.rows.length  : 0;
    const st = localLen >= serverLen ? localSt : serverSt;

    if (!st || !Array.isArray(st.rows) || st.rows.length === 0) return;

    _dailyAttemptsUsed = st.rows.length;
    st.rows.forEach((r, i) => {
      _addDailyHistoryRow(i + 1, r.guess, r.cell_results, r.bulls, r.cows);
    });
    _updateDailyAttemptsCounter();

    // Если игра уже завершена (победа или попытки исчерпаны)
    const isDone = st.done || st.won || st.rows.length >= DAILY_MAX_ATTEMPTS;
    if (isDone) {
      _dailyLockInput(!!st.won, null);
      _updateDailyStatusCard(true);
    }
  }

  function _dailyResetUI() {
    const historyList = document.getElementById('daily-history-list');
    const historyEmpty = document.getElementById('daily-history-empty');
    const banner = document.getElementById('daily-status-banner');
    const submitBtn = document.getElementById('btn-daily-submit');
    const revealEl = document.getElementById('daily-answer-reveal');

    if (historyList) historyList.innerHTML = '';
    if (historyEmpty) historyEmpty.style.display = 'block';
    if (banner) banner.style.display = 'none';
    const oldShare = document.getElementById('btn-daily-share');
    if (oldShare) oldShare.remove();
    if (revealEl) revealEl.style.display = 'none';
    if (submitBtn) { submitBtn.style.display = 'block'; submitBtn.disabled = false; }

    document.querySelectorAll('.daily-cell').forEach(c => { c.value = ''; c.disabled = false; });
    document.querySelectorAll('#daily-cells .input-cell').forEach(w => { w.classList.remove('has-value','bull','cow','miss','locked'); w.dataset.value=''; const d=w.querySelector('.daily-cell-display'); if(d) d.textContent=''; });
    _updateDailyAttemptsCounter();
    _initDailyCells();
  }

  function _updateDailyAttemptsCounter() {
    const el = document.getElementById('daily-attempts-left');
    if (el) el.textContent = Math.max(0, DAILY_MAX_ATTEMPTS - _dailyAttemptsUsed);
  }

  // Читает цифры из data-value атрибутов оберток
  function _getDailyCellValues() {
    const wrappers = document.querySelectorAll('#daily-cells .input-cell');
    return Array.from(wrappers).map(w => w.dataset.value || '');
  }

  function _setDailyCellValue(wrapper, val) {
    wrapper.dataset.value = val;
    // Показываем цифру как textContent wrapper (как в классике)
    // Скрытый input используем только для фокуса/ввода
    const displayEl = wrapper.querySelector('.daily-cell-display');
    if (displayEl) displayEl.textContent = val || '';
    wrapper.classList.toggle('has-value', !!val);
  }

  function _initDailyCells() {
    const wrappers = Array.from(document.querySelectorAll('#daily-cells .input-cell'));
    const hiddenInputs = Array.from(document.querySelectorAll('.daily-cell'));

    wrappers.forEach((wrapper, i) => {
      // Сброс
      wrapper.dataset.value = '';
      const disp = wrapper.querySelector('.daily-cell-display');
      if (disp) disp.textContent = '';

      const inp = hiddenInputs[i];
      if (!inp) return;

      inp.value = '';
      // На телефоне используем нашу виртуальную клавиатуру (как в обычном уровне),
      // поэтому подавляем системную клавиатуру.
      if (_isMobileDevice()) inp.inputMode = 'none';
      inp.oninput = () => {
        const raw = inp.value.replace(/[^0-9]/g, '');
        const v = raw.length > 1 ? raw[raw.length - 1] : raw;
        inp.value = v;
        _setDailyCellValue(wrapper, v);
        if (v && i < wrappers.length - 1) hiddenInputs[i + 1].focus();
      };
      inp.onkeydown = (e) => {
        if (e.key === 'Backspace') {
          if (!wrapper.dataset.value && i > 0) { hiddenInputs[i - 1].focus(); return; }
          inp.value = '';
          _setDailyCellValue(wrapper, '');
        }
        if (e.key === 'Enter') { e.preventDefault(); submitDailyGuess(); }
      };
      wrapper.addEventListener('click', () => { if (!inp.disabled) inp.focus(); });
    });

    const firstInp = hiddenInputs.find(inp => !inp.disabled);
    if (firstInp) firstInp.focus();

    _initDailyKeypad();
  }

  function _isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
  }

  // Виртуальная клавиатура для «Пароля дня» — такая же, как в обычном уровне
  function _initDailyKeypad() {
    const keypad = document.getElementById('daily-keypad');
    if (!keypad) return;

    if (!_isMobileDevice()) { keypad.classList.add('hidden'); return; }
    keypad.classList.remove('hidden');

    if (keypad._wired) return;
    keypad._wired = true;

    keypad.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.keypad-btn');
      if (!btn) return;
      e.preventDefault(); // сохраняем фокус на ячейке

      // Если попытки исчерпаны (ячейки заблокированы) — ничего не делаем
      if (!document.querySelector('#daily-cells .daily-cell:not([disabled])')) return;

      if (window.WebApp && window.WebApp.HapticFeedback) {
        try { window.WebApp.HapticFeedback.impactOccurred('light'); } catch (e) {}
      }

      const key = btn.dataset.key;
      if (key === 'clear') _dailyKeypadClear();
      else if (key === 'backspace') _dailyKeypadBackspace();
      else _dailyKeypadDigit(parseInt(key, 10));
    });
  }

  function _dailyKeypadDigit(digit) {
    const wrappers = Array.from(document.querySelectorAll('#daily-cells .input-cell'));
    const inputs = Array.from(document.querySelectorAll('.daily-cell'));
    let idx = inputs.indexOf(document.activeElement);
    if (idx < 0 || inputs[idx].disabled) {
      idx = wrappers.findIndex((w, i) => !w.dataset.value && !inputs[i].disabled);
      if (idx < 0) idx = wrappers.findIndex((w, i) => !inputs[i].disabled);
    }
    if (idx < 0) return;

    _setDailyCellValue(wrappers[idx], String(digit));
    if (inputs[idx]) inputs[idx].value = String(digit);

    let next = idx + 1;
    while (next < wrappers.length && (inputs[next].disabled || wrappers[next].dataset.value)) next++;
    if (next < wrappers.length && inputs[next] && !inputs[next].disabled) inputs[next].focus();
  }

  function _dailyKeypadBackspace() {
    const wrappers = Array.from(document.querySelectorAll('#daily-cells .input-cell'));
    const inputs = Array.from(document.querySelectorAll('.daily-cell'));
    let idx = inputs.indexOf(document.activeElement);
    if (idx < 0) {
      for (let i = wrappers.length - 1; i >= 0; i--) {
        if (wrappers[i].dataset.value) { idx = i; break; }
      }
      if (idx < 0) return;
    }

    if (wrappers[idx].dataset.value) {
      _setDailyCellValue(wrappers[idx], '');
      if (inputs[idx]) inputs[idx].value = '';
    } else if (idx > 0) {
      const prev = inputs[idx - 1];
      _setDailyCellValue(wrappers[idx - 1], '');
      if (prev) { prev.value = ''; prev.focus(); }
    }
  }

  function _dailyKeypadClear() {
    const wrappers = document.querySelectorAll('#daily-cells .input-cell');
    const inputs = document.querySelectorAll('.daily-cell');
    wrappers.forEach(w => _setDailyCellValue(w, ''));
    inputs.forEach(i => { i.value = ''; });
    const first = Array.from(inputs).find(i => !i.disabled);
    if (first) first.focus();
  }

  function _addDailyHistoryRow(attemptNum, digits, cellResults, bulls, cows) {
    const historyList = document.getElementById('daily-history-list');
    const historyEmpty = document.getElementById('daily-history-empty');
    if (!historyList) return;
    if (historyEmpty) historyEmpty.style.display = 'none';

    const b = (bulls !== undefined && bulls !== null) ? bulls : 0;
    const c = (cows  !== undefined && cows  !== null) ? cows  : 0;

    const row = document.createElement('div');
    row.className = 'history-row';

    const numEl = document.createElement('span');
    numEl.className = 'history-attempt-num';
    numEl.textContent = String(attemptNum).padStart(2, '0');

    const cellsEl = document.createElement('div');
    cellsEl.className = 'history-cells';

    (digits || []).forEach((digit, i) => {
      const cell = document.createElement('div');
      const res = (cellResults && cellResults[i]) ? cellResults[i] : 'miss';
      cell.className = 'history-cell ' + res;
      cell.textContent = digit;
      cellsEl.appendChild(cell);
    });

    const infoEl = document.createElement('div');
    infoEl.className = 'history-info';

    const bEl = document.createElement('span');
    bEl.className = 'history-bulls';
    bEl.innerHTML = b + '<span class="indicator-dot bull-dot"></span>';

    const cEl = document.createElement('span');
    cEl.className = 'history-cows';
    cEl.innerHTML = c + '<span class="indicator-dot cow-dot"></span>';

    infoEl.appendChild(bEl);
    infoEl.appendChild(cEl);

    row.appendChild(numEl);
    row.appendChild(cellsEl);
    row.appendChild(infoEl);
    historyList.prepend(row);
  }

  function _dailyLockInput(won, password) {
    document.querySelectorAll('.daily-cell').forEach(c => { c.disabled = true; });
    document.querySelectorAll('#daily-cells .input-cell').forEach(w => w.classList.add('locked'));
    const submitBtn = document.getElementById('btn-daily-submit');
    if (submitBtn) submitBtn.style.display = 'none';

    const banner = document.getElementById('daily-status-banner');
    const statusText = document.getElementById('daily-status-text');
    const revealEl = document.getElementById('daily-answer-reveal');
    if (banner) banner.style.display = 'block';

    if (won) {
      if (statusText) { statusText.textContent = 'ПАРОЛЬ ВЗЛОМАН! 🔓'; }
    } else {
      if (statusText) { statusText.textContent = 'ДОСТУП ЗАКРЫТ 🔒 — Попытки исчерпаны'; }
    }
    // Пароль НЕ раскрываем — даём шанс угадать завтра/в следующий раз.
    if (revealEl) revealEl.style.display = 'none';

    // Заметная кнопка «Похвастаться» — главный вирусный канал в мессенджере.
    if (banner && !document.getElementById('btn-daily-share')) {
      const shareBtn = document.createElement('button');
      shareBtn.id = 'btn-daily-share';
      shareBtn.className = 'btn btn--primary';
      shareBtn.style.cssText = 'width:100%; margin-top:12px; display:flex; align-items:center; justify-content:center; gap:8px;';
      shareBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;display:block;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' + (won ? 'ПОХВАСТАТЬСЯ ПОБЕДОЙ' : 'ПОДЕЛИТЬСЯ РЕЗУЛЬТАТОМ');
      shareBtn.addEventListener('click', _shareDailyResult);
      banner.appendChild(shareBtn);
    }
  }

  function _updateDailyStatusCard(played) {
    const el = document.getElementById('daily-status-label');
    if (el) el.textContent = played ? 'ПРОЙДЕНО' : 'ГОТОВ';
  }

  async function submitDailyGuess() {
    const wrappers = document.querySelectorAll('#daily-cells .input-cell');
    const guess = [];
    let valid = true;
    wrappers.forEach(w => {
      const v = parseInt(w.dataset.value, 10);
      if (isNaN(v)) valid = false;
      else guess.push(v);
    });

    if (!valid || guess.length !== 4) {
      UIController.showToast('Введи все 4 цифры', 'error');
      return;
    }
    if (new Set(guess).size !== 4) {
      UIController.showToast('Цифры должны быть разными', 'error');
      return;
    }
    if (!userId) {
      UIController.showToast('Войди в MAX чтобы сыграть', 'error');
      return;
    }
    if (_dailyAttemptsUsed >= DAILY_MAX_ATTEMPTS) {
      UIController.showToast('Попытки исчерпаны. Возвращайся завтра!', 'error');
      return;
    }

    const btn = document.getElementById('btn-daily-submit');

    // МГНОВЕННАЯ проверка локально (детерминированный пароль по UTC-дате).
    // Раньше ждали ответа edge-функции (медленно/могло висеть) — теперь сразу.
    const data = _localEvaluateDaily(guess);
    _processDailyResult(data, guess, btn);

    // Фоновая синхронизация с сервером — только для ОБЩЕГО рейтинга «Пароль дня».
    // Не блокирует интерфейс и не влияет на результат игрока.
    if (userId) _submitDailyToServer(guess);
  }

  function _submitDailyToServer(guess) {
    try {
      fetch(DAILY_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ..._dailyAuthHeader() },
        body: JSON.stringify({ action: 'submit', user_id: userId, guess })
      }).then(() => { setTimeout(() => _loadDailyLeaderboard(), 400); }).catch(() => {});
    } catch (e) {}
  }

  function _processDailyResult(data, guess, btn) {
    _dailyAttemptsUsed++;
    _updateDailyAttemptsCounter();
    _addDailyHistoryRow(_dailyAttemptsUsed, guess, data.cell_results, data.bulls, data.cows);

    document.querySelectorAll('.daily-cell').forEach(c => { c.value = ''; });
    document.querySelectorAll('#daily-cells .input-cell').forEach(w => { w.classList.remove('has-value'); w.dataset.value=''; const d=w.querySelector('.daily-cell-display'); if(d) d.textContent=''; });
    const firstCell = document.querySelector('.daily-cell:not([disabled])');
    if (firstCell) firstCell.focus();

    if (window.WebApp && window.WebApp.HapticFeedback) {
      try { window.WebApp.HapticFeedback.notificationOccurred(data.won ? 'success' : 'error'); } catch (e) {}
    }

    const exhausted = _dailyAttemptsUsed >= DAILY_MAX_ATTEMPTS;
    // Надёжно сохраняем попытку в game_data (этот путь сохранения работает),
    // чтобы счётчик попыток/история восстанавливались после перезахода.
    _persistDailyAttempt(guess, data, exhausted);

    if (data.won) {
      _dailyLockInput(true, null);
      _updateDailyStatusCard(true);
      seasonPoints += 75;
      // Жирная награда DCDR за взлом «Пароля дня» — один раз в сутки.
      const today = new Date().toISOString().slice(0, 10);
      const gdNow = window.SupabaseAPI ? window.SupabaseAPI.gameData : null;
      const alreadyRewarded = gdNow && gdNow.decoder_daily_pw_reward_date === today;
      if (!alreadyRewarded) {
        coins += DAILY_PW_REWARD;
        if (gdNow) { gdNow.decoder_daily_pw_reward_date = today; window.SupabaseAPI.gameData = gdNow; }
        UIController.updateCoins(coins);
        UIController.showToast('🔓 Пароль дня взломан! +' + DAILY_PW_REWARD + ' DCDR', 'success');
      }
      saveGameState();
    } else if (exhausted) {
      _dailyLockInput(false, null);
      _updateDailyStatusCard(true);
      seasonPoints += 50;
      saveGameState();
    } else {
      if (btn) { btn.disabled = false; btn.textContent = 'ВЗЛОМАТЬ'; }
      saveGameState(); // сохраняем частичную попытку
    }
  }

  // Сохраняет состояние «Пароля дня» в game_data (дата, попытки, история, статус)
  function _persistDailyAttempt(guess, data, exhausted) {
    const today = new Date().toISOString().slice(0, 10);

    // --- 1. Обновляем in-memory gameData (как раньше) ---
    if (window.SupabaseAPI && window.SupabaseAPI.gameData) {
      const gd = window.SupabaseAPI.gameData;
      let st = gd.decoder_daily_pw;
      if (!st || st.date !== today) st = { date: today, won: false, done: false, rows: [] };
      st.rows.push({ guess: guess, cell_results: data.cell_results, bulls: data.bulls, cows: data.cows });
      if (data.won) st.won = true;
      st.attempts = st.rows.length;
      st.done = data.won || exhausted;
      gd.decoder_daily_pw = st;
      window.SupabaseAPI.gameData = gd;
    }

    // --- 2. ВСЕГДА пишем в localStorage — независимо от isProfileLoaded ---
    try {
      const lsKey = 'decoder_daily_pw_' + today;
      const existing = JSON.parse(localStorage.getItem(lsKey) || 'null');
      const rows = existing && existing.date === today ? existing.rows : [];
      rows.push({ guess: guess, cell_results: data.cell_results, bulls: data.bulls, cows: data.cows });
      const st = {
        date: today,
        won: data.won || (existing && existing.won) || false,
        done: data.won || exhausted || (existing && existing.done) || false,
        attempts: rows.length,
        rows: rows
      };
      localStorage.setItem(lsKey, JSON.stringify(st));
      // Чистим старые ключи (только текущий день храним)
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('decoder_daily_pw_') && k !== lsKey) {
          localStorage.removeItem(k); i--;
        }
      }
      // --- 3. Дублируем в DeviceStorage MAX Bridge (нативные клиенты iOS/Android) ---
      // DeviceStorage не поддерживается веб-клиентом MAX, поэтому только как доп. слой.
      if (window.WebApp && window.WebApp.DeviceStorage) {
        try {
          const r = window.WebApp.DeviceStorage.setItem(lsKey, JSON.stringify(st));
          if (r && typeof r.catch === 'function') r.catch(() => {});
        } catch (e) {}
      }
    } catch (e) {}
  }

  // Детерминированная генерация пароля дня на клиенте (зеркало серверной логики).
  function _localDailyPassword() {
    const dateStr = new Date().toISOString().slice(0, 10);
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
    const digits = []; let seed = hash;
    while (digits.length < 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const d = seed % 10;
      if (digits.indexOf(d) < 0) digits.push(d);
    }
    return digits;
  }

  function _localEvaluateDaily(guess) {
    const pw = _localDailyPassword();
    let bulls = 0, cows = 0; const cr = [];
    for (let i = 0; i < 4; i++) {
      if (guess[i] === pw[i]) { bulls++; cr.push('bull'); }
      else if (pw.indexOf(guess[i]) >= 0) { cows++; cr.push('cow'); }
      else cr.push('miss');
    }
    return { bulls: bulls, cows: cows, cell_results: cr, won: bulls === 4, password: pw };
  }

  function _shareDailyResult() {
    var refLink = _getRefLink();
    var historyRows = document.querySelectorAll('#daily-history-list .history-row');
    var status = (document.getElementById('daily-status-text') || {}).textContent || '';
    var emojiGrid = '';
    historyRows.forEach(function(row) {
      var cells = row.querySelectorAll('.history-cell');
      var line = '';
      cells.forEach(function(c) {
        if (c.classList.contains('bull')) line += '🟢';
        else if (c.classList.contains('cow')) line += '🟡';
        else line += '🔴';
      });
      emojiGrid += line + '\n';
    });
    var text =
      '[ДЕКОДЕР] — Пароль Дня 🔐\n' +
      '━━━━━━━━━━━━━━━\n' +
      emojiGrid +
      '🔷 Попытки: ' + _dailyAttemptsUsed + '/' + DAILY_MAX_ATTEMPTS + '\n' +
      '━━━━━━━━━━━━━━━\n' +
      'Сможешь лучше? 👇';
    _shareResultText(text);
  }

  async function _loadDailyLeaderboard() {
    const loadEl = document.getElementById('daily-leaderboard-loading');
    const listEl = document.getElementById('daily-leaderboard-list');
    if (!listEl) return;
    if (loadEl) loadEl.style.display = 'block';
    listEl.innerHTML = '';

    try {
      const res = await fetch(DAILY_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ..._dailyAuthHeader() },
        body: JSON.stringify({ action: 'leaderboard', user_id: userId || '' })
      });
      const data = await res.json();
      if (loadEl) loadEl.style.display = 'none';

      const lb = data.leaderboard || [];
      if (!lb.length) {
        listEl.innerHTML = '<div style="font-family:\'JetBrains Mono\',monospace; font-size:11px; color:rgba(255,255,255,0.25); text-align:center; padding:12px;">Ещё никто не взломал сегодня</div>';
        return;
      }

      lb.slice(0, 20).forEach((entry, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; background:rgba(179,109,255,0.05); border:1px solid rgba(179,109,255,0.1);';
        const rankColor = i === 0 ? '#FFD700' : i === 1 ? '#C0C8D0' : i === 2 ? '#CD9440' : 'rgba(255,255,255,0.3)';
        const time = new Date(entry.played_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        row.innerHTML =
          '<span style="font-family:\'JetBrains Mono\',monospace; font-size:12px; font-weight:800; color:' + rankColor + '; min-width:20px;">' + entry.rank + '</span>' +
          '<span style="font-family:\'JetBrains Mono\',monospace; font-size:12px; color:rgba(255,255,255,0.8); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + (entry.name || 'Агент') + '</span>' +
          '<span style="font-family:\'JetBrains Mono\',monospace; font-size:10px; color:rgba(255,255,255,0.3);">' + time + '</span>';
        listEl.appendChild(row);
      });
    } catch (e) {
      if (loadEl) loadEl.style.display = 'none';
      listEl.innerHTML = '<div style="font-family:\'JetBrains Mono\',monospace; font-size:11px; color:rgba(255,255,255,0.25); text-align:center; padding:12px;">Не удалось загрузить</div>';
    }
  }

  // ══════════════════ STREAM MODE ══════════════════

  function startStreamGame() {
    if (window.WebApp && window.WebApp.enableClosingConfirmation) window.WebApp.enableClosingConfirmation();

    state.practiceMode = false;
    state.streamMode = true;
    state.lastMode = 'stream';
    state.streamLives = 3;
    state.streamSegment = 0;
    state.streamCombo = 0;
    state.streamScore = 0;
    state.score = 0;
    state.shopPaused = false;
    _hideNavShopBadge();

    const fromScreen = state.currentScreen;
    UIController.liftTransition(fromScreen, 'screen-game');
    state.currentScreen = 'screen-game';
    updateBackButton('screen-game');

    const hud = document.getElementById('stream-hud');
    if (hud) hud.classList.remove('hidden');
    _updateStreamHud();
    _loadStreamSegment();
  }

  function _loadStreamSegment() {
    _stopTimer();
    state.isGameActive = false;
    state.isInputBlocked = false;
    state.attemptsUsed = 0;

    const config = generateStreamSegment(state.streamSegment + 1);
    state.levelConfig = config;
    state.attemptsLeft = config.maxAttempts;
    state.timeLeft = config.timeLimit;
    state.lockedCells = new Array(config.cellCount).fill(false);
    state.historyCount = 0;

    UIController.clearDiceInstances();
    UIController.clearCipherInstances();
    UIController.setLevel(state.streamSegment + 1);
    UIController.setAttempts(state.attemptsLeft);
    UIController.setTimer(state.timeLeft, config.timeLimit);
    UIController.setLevelTypeBanner(config.type);
    UIController.clearHistory();
    UIController.hideBonusArrows();
    UIController.hideSafeInfo();
    UIController.stopGlitch();

    const floorWord = document.querySelector('.floor-word');
    if (floorWord) floorWord.textContent = 'ПОТОК';

    const historyAreaEl = document.getElementById('history-area');
    if (historyAreaEl) historyAreaEl.classList.remove('hidden');

    const inputArea = document.getElementById('input-area');
    const toolbar = document.getElementById('booster-toolbar');
    if (toolbar) toolbar.classList.add('hidden');

    if (config.type === LEVEL_TYPE.SHIFT_CIPHER) {
      inputArea.classList.remove('hidden');
      state.cipherValues = [...config.password];
      const scrambles = randomInt(3, 4);
      for (let s = 0; s < scrambles; s++) {
        const idx = randomInt(0, config.cellCount - 1);
        state.cipherValues[idx] = (state.cipherValues[idx] + 9) % 10;
        const nextIdx = (idx + 1) % config.cellCount;
        state.cipherValues[nextIdx] = (state.cipherValues[nextIdx] + 1) % 10;
      }
      if (state.cipherValues.every((val, i) => val === config.password[i])) {
        state.cipherValues[0] = (state.cipherValues[0] + 9) % 10;
        state.cipherValues[1] = (state.cipherValues[1] + 1) % 10;
      }
      UIController.renderInteractiveCipher(config.password, state.cipherValues, config.cellCount, (index) => {
        _onCipherCellClick(index);
      });
    } else {
      inputArea.classList.remove('hidden');
      InputController.init(config);
      InputController.onSubmit(handleSubmit);
      InputController.enableSubmit();
    }

    state.isGameActive = true;
    _startTimer();
  }

  function _onStreamSegmentWin() {
    state.streamSegment++;
    state.streamCombo++;
    stats.stream_clears = (stats.stream_clears || 0) + 1; // прогресс «Мастер потока»

    const comboMult = 1 + Math.floor(state.streamCombo / 3) * 0.5;
    const base = 10 + state.streamSegment * 2;
    const pts = Math.floor(base * Math.min(comboMult, 4));
    state.streamScore += pts;

    if (state.streamScore > streamBestScore) {
      streamBestScore = state.streamScore;
      _updateGamesScreenStats();
    }
    // Очки сезона за сегмент потока
    seasonPoints += Math.round(pts * 0.5);

    if (window.WebApp && window.WebApp.HapticFeedback) {
      try { window.WebApp.HapticFeedback.notificationOccurred('success'); } catch(e) {}
    } else if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    _updateStreamHud(true); // true = показать вспышку комбо
    if (!state.shopPaused) setTimeout(() => _loadStreamSegment(), 450);
    // Если пауза — returnToGame вызовет _loadStreamSegment
  }

  function _onStreamLifeLost(reason) {
    state.streamCombo = 0;
    state.streamLives--;
    _updateStreamHud(false);

    if (window.WebApp && window.WebApp.HapticFeedback) {
      try { window.WebApp.HapticFeedback.notificationOccurred('error'); } catch(e) {}
    } else if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }

    if (state.streamLives <= 0) {
      setTimeout(() => _endStreamGame(), 300);
    } else {
      UIController.showToast('♥ −1 жизнь: ' + reason, 'error');
      setTimeout(() => {
        if (!state.shopPaused) _loadStreamSegment();
        // Если пауза — returnToGame вызовет _loadStreamSegment
      }, 900);
    }
  }

  function _endStreamGame() {
    _stopTimer();
    state.isGameActive = false;
    state.streamMode = false;

    const hud = document.getElementById('stream-hud');
    if (hud) hud.classList.add('hidden');
    const floorWord = document.querySelector('.floor-word');
    if (floorWord) floorWord.textContent = 'ЭТАЖ';

    if (window.SupabaseAPI && window.SupabaseAPI.saveStreamScore) {
      window.SupabaseAPI.saveStreamScore(state.streamScore);
    }
    if (state.streamScore > streamBestScore) {
      streamBestScore = state.streamScore;
      _updateGamesScreenStats();
    }
    // Сохраняем очки сезона, накопленные за поток (иначе они терялись)
    saveGameState();

    if (window.WebApp && window.WebApp.disableClosingConfirmation) window.WebApp.disableClosingConfirmation();
    if (window.WebApp && window.WebApp.ScreenCapture && window.WebApp.ScreenCapture.enableScreenCapture) window.WebApp.ScreenCapture.enableScreenCapture();

    const _st = state.levelConfig && state.levelConfig.type;
    const _streamDice = _st === LEVEL_TYPE.DICE_SINGLE || _st === LEVEL_TYPE.DICE_MULTI;
    UIController.showLoseData(
      'Поток прерван! Сегментов решено: ' + state.streamSegment,
      state.levelConfig ? state.levelConfig.password : [],
      state.streamSegment,
      state.streamScore,
      _streamDice
    );
    UIController.showOverlay('screen-game-over');
  }

  function _updateStreamHud(showComboFlash) {
    const livesEl = document.getElementById('stream-lives');
    const scoreEl = document.getElementById('stream-score-display');
    const comboEl = document.getElementById('stream-combo-display');

    if (livesEl) {
      livesEl.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const heart = document.createElement('span');
        heart.className = 'stream-heart' + (i < state.streamLives ? '' : ' stream-heart--lost');
        heart.textContent = '♥';
        livesEl.appendChild(heart);
      }
    }
    if (scoreEl) scoreEl.textContent = state.streamScore;
    if (comboEl) {
      const mult = 1 + Math.floor(state.streamCombo / 3) * 0.5;
      const isMega = state.streamCombo >= 6;
      const isActive = state.streamCombo >= 3;
      comboEl.textContent = isActive ? '\xd7' + mult.toFixed(1) : '\xd71';
      comboEl.className = 'stream-combo' +
        (isMega ? ' stream-combo--mega' : isActive ? ' stream-combo--active' : '');

      // Вспышка и вибрация при достижении комбо
      if (showComboFlash && isActive) {
        _triggerComboFlash(isMega);
        if (window.WebApp && window.WebApp.HapticFeedback) {
          try { window.WebApp.HapticFeedback.impactOccurred(isMega ? 'heavy' : 'medium'); } catch(e) {}
        }
      }
    }
  }

  // Вспышка экрана при комбо + всплывающие очки
  function _triggerComboFlash(isMega) {
    let overlay = document.getElementById('combo-flash-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'combo-flash-overlay';
      document.body.appendChild(overlay);
    }
    overlay.className = '';
    void overlay.offsetWidth; // reflow для перезапуска анимации
    overlay.classList.add(isMega ? 'flash--mega' : 'flash--gold');

    // Всплывающий текст с очками над HUD
    const hud = document.getElementById('stream-hud');
    if (hud) {
      const mult = 1 + Math.floor(state.streamCombo / 3) * 0.5;
      const popup = document.createElement('div');
      popup.className = 'combo-pts-popup' + (isMega ? ' combo-pts-popup--mega' : '');
      popup.textContent = '\xd7' + mult.toFixed(1) + ' КОМБО!';
      hud.style.position = 'relative';
      hud.appendChild(popup);
      setTimeout(() => popup.remove(), 950);
    }
  }

  // ══════════════════ DICE HELL MODE ══════════════════

  function startDiceHellGame() {
    if (window.WebApp && window.WebApp.enableClosingConfirmation) window.WebApp.enableClosingConfirmation();

    state.diceHellMode = true;
    state.lastMode = 'dice';
    state.diceHellLives = 3;
    state.diceHellSegment = 0;
    state.diceHellCombo = 0;
    state.diceHellScore = 0;
    state.score = 0;
    state.shopPaused = false;
    _hideNavShopBadge();

    const fromScreen = state.currentScreen;
    UIController.liftTransition(fromScreen, 'screen-game');
    state.currentScreen = 'screen-game';
    updateBackButton('screen-game');

    const hud = document.getElementById('stream-hud');
    if (hud) hud.classList.remove('hidden');
    _updateDiceHellHud();
    _loadDiceHellSegment();
  }

  function _loadDiceHellSegment() {
    _stopTimer();
    state.isGameActive = false;
    state.isInputBlocked = false;
    state.attemptsUsed = 0;

    const config = generateDiceSegment(state.diceHellSegment + 1);
    state.levelConfig = config;
    state.attemptsLeft = config.maxAttempts;
    state.timeLeft = config.timeLimit;
    state.lockedCells = new Array(config.cellCount).fill(false);
    state.diceValues = new Array(config.cellCount).fill(null);
    state.historyCount = 0;

    UIController.clearDiceInstances();
    UIController.clearCipherInstances();
    UIController.setLevel(state.diceHellSegment + 1);
    UIController.setAttempts(state.attemptsLeft);
    UIController.setTimer(state.timeLeft, config.timeLimit);
    UIController.setLevelTypeBanner(config.type);
    UIController.clearHistory();
    UIController.hideBonusArrows();
    UIController.hideSafeInfo();
    UIController.stopGlitch();

    const floorWord = document.querySelector('.floor-word');
    if (floorWord) floorWord.textContent = 'АД';

    const historyAreaEl = document.getElementById('history-area');
    if (historyAreaEl) historyAreaEl.classList.add('hidden');

    const inputArea = document.getElementById('input-area');
    const toolbar = document.getElementById('booster-toolbar');
    if (toolbar) toolbar.classList.add('hidden');

    inputArea.classList.remove('hidden');
    const diceHellRollAll = config.type === LEVEL_TYPE.DICE_MULTI ? _onRollAllDice : null;
    UIController.renderDiceLevel(config.password, config.cellCount, (index) => {
      _onDiceRollClick(index);
    }, diceHellRollAll);

    state.isGameActive = true;
    _startTimer();
  }

  function _onDiceHellSegmentWin() {
    state.diceHellSegment++;
    state.diceHellCombo++;
    stats.dicehell_clears = (stats.dicehell_clears || 0) + 1; // прогресс «Повелитель кубиков»

    const comboMult = 1 + Math.floor(state.diceHellCombo / 3) * 0.5;
    const base = 10 + state.diceHellSegment * 3;
    const pts = Math.floor(base * Math.min(comboMult, 4));
    state.diceHellScore += pts;

    if (state.diceHellScore > diceBestScore) {
      diceBestScore = state.diceHellScore;
      _updateGamesScreenStats();
    }

    if (window.WebApp && window.WebApp.HapticFeedback) {
      try { window.WebApp.HapticFeedback.notificationOccurred('success'); } catch(e) {}
    } else if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    _updateDiceHellHud();
    if (!state.shopPaused) setTimeout(() => _loadDiceHellSegment(), 450);
    // Если пауза — returnToGame вызовет _loadDiceHellSegment
  }

  function _onDiceHellLifeLost(reason) {
    state.diceHellCombo = 0;
    state.diceHellLives--;
    _updateDiceHellHud();

    if (window.WebApp && window.WebApp.HapticFeedback) {
      try { window.WebApp.HapticFeedback.notificationOccurred('error'); } catch(e) {}
    } else if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }

    if (state.diceHellLives <= 0) {
      setTimeout(() => _endDiceHellGame(), 300);
    } else {
      UIController.showToast('♥ −1 жизнь: ' + reason, 'error');
      setTimeout(() => {
        if (!state.shopPaused) _loadDiceHellSegment();
        // Если пауза — returnToGame вызовет _loadDiceHellSegment
      }, 900);
    }
  }

  function _endDiceHellGame() {
    _stopTimer();
    state.isGameActive = false;
    state.diceHellMode = false;

    const hud = document.getElementById('stream-hud');
    if (hud) hud.classList.add('hidden');
    const floorWord = document.querySelector('.floor-word');
    if (floorWord) floorWord.textContent = 'ЭТАЖ';

    if (window.SupabaseAPI && window.SupabaseAPI.saveDiceScore) {
      window.SupabaseAPI.saveDiceScore(state.diceHellScore);
    }
    if (state.diceHellScore > diceBestScore) {
      diceBestScore = state.diceHellScore;
      _updateGamesScreenStats();
    }
    // Сохраняем накопленный прогресс «Повелитель кубиков» на сервер
    saveGameState();

    if (window.WebApp && window.WebApp.disableClosingConfirmation) window.WebApp.disableClosingConfirmation();

    UIController.showLoseData(
      'Ад поймал! Сегментов: ' + state.diceHellSegment,
      state.levelConfig ? state.levelConfig.password : [],
      state.diceHellSegment,
      state.diceHellScore,
      true
    );
    UIController.showOverlay('screen-game-over');
  }

  function _updateDiceHellHud() {
    const livesEl = document.getElementById('stream-lives');
    const scoreEl = document.getElementById('stream-score-display');
    const comboEl = document.getElementById('stream-combo-display');

    if (livesEl) {
      livesEl.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const heart = document.createElement('span');
        heart.className = 'stream-heart' + (i < state.diceHellLives ? '' : ' stream-heart--lost');
        heart.textContent = '♥';
        livesEl.appendChild(heart);
      }
    }
    if (scoreEl) scoreEl.textContent = state.diceHellScore;
    if (comboEl) {
      const mult = 1 + Math.floor(state.diceHellCombo / 3) * 0.5;
      comboEl.textContent = state.diceHellCombo >= 3 ? '\xd7' + mult.toFixed(1) : '\xd71';
      comboEl.className = 'stream-combo' + (state.diceHellCombo >= 3 ? ' stream-combo--active' : '');
    }
  }

  // ══════════════════ MODE LEADERBOARD ══════════════════

  let _modeLbState = { mode: 'classic', sub: 'score' };

  async function showModeLeaderboard(mode) {
    _modeLbState = { mode: mode, sub: 'score' };

    const overlay = document.getElementById('lb-modal-overlay');
    const titleEl = document.getElementById('lb-modal-title');
    const tabsEl = document.getElementById('lb-modal-tabs');
    if (!overlay) return;

    const modeNames = { classic: 'КЛАССИЧЕСКИЙ', stream: 'ПОТОК', dice: 'АД КУБИКОВ' };
    if (titleEl) titleEl.textContent = 'РЕЙТИНГ: ' + (modeNames[mode] || mode.toUpperCase());
    overlay.classList.remove('hidden');

    // Категории доступны только в классике: по очкам / по уровню
    if (tabsEl) {
      if (mode === 'classic') {
        tabsEl.style.display = 'flex';
        tabsEl.querySelectorAll('.lb-mtab').forEach(function(t) {
          t.classList.toggle('active', t.getAttribute('data-sub') === 'score');
        });
      } else {
        tabsEl.style.display = 'none';
      }
    }

    await renderModeLeaderboard();
  }

  async function renderModeLeaderboard() {
    const mode = _modeLbState.mode;
    const sub = _modeLbState.sub;
    const loadingEl = document.getElementById('lb-modal-loading');
    const listEl = document.getElementById('lb-modal-list');
    const myCardEl = document.getElementById('lb-modal-my-card');

    if (loadingEl) { loadingEl.style.display = 'block'; loadingEl.textContent = 'Загрузка рейтинга...'; }
    if (listEl) listEl.innerHTML = '';
    if (myCardEl) myCardEl.style.display = 'none';

    if (!window.SupabaseAPI) {
      if (loadingEl) loadingEl.style.display = 'none';
      if (listEl) listEl.innerHTML = '<div style="text-align:center;color:var(--c-error);padding:20px;">Ошибка подключения</div>';
      return;
    }

    const lbType = mode === 'classic' ? (sub === 'levels' ? 'levels' : 'score')
                 : mode === 'dice' ? 'dice' : 'stream';
    const unit = (mode === 'classic' && sub === 'levels') ? 'ур.' : 'очк.';

    function valueFor(gd, user) {
      if (mode === 'classic') return sub === 'levels' ? ((gd && gd.decoder_levels) || 0) : user.score;
      if (mode === 'dice') return (gd && gd.dice_best) || 0;
      return (gd && gd.stream_best) || 0;
    }

    const data = await window.SupabaseAPI.fetchLeaderboard(lbType);
    if (loadingEl) loadingEl.style.display = 'none';

    let maxUser = null;
    if (window.WebApp && window.WebApp.initData) {
      try {
        const urlParams = new URLSearchParams(window.WebApp.initData);
        const userParam = urlParams.get('user');
        if (userParam) maxUser = JSON.parse(userParam);
      } catch(e) {}
    }
    const currentUserId = maxUser ? maxUser.id.toString() : null;

    if (!data || data.length === 0) {
      if (listEl) listEl.innerHTML = '<div style="text-align:center;color:var(--c-text-muted);padding:20px;">Нет данных</div>';
      return;
    }

    let myRank = -1, myData = null;

    data.forEach((user, index) => {
      if (currentUserId && user.user_id === currentUserId) { myRank = index + 1; myData = user; }

      let gd = user.game_data;
      try { if (typeof gd === 'string') gd = JSON.parse(gd); } catch(e) {}

      const valNum = valueFor(gd, user);
      const avatarHtml = window.SupabaseAPI.buildAvatarHtml(user.name, gd && gd.photo_url, 46);
      const badgeHtml = buildTitleBadgeHtml(gd && gd.decoder_active_title ? gd.decoder_active_title : 'title_1');

      const item = document.createElement('div');
      item.className = 'lb-row' + (index < 3 ? ' lb-row--' + (index + 1) : '');
      item.innerHTML = _buildLbRow(index + 1, user.name, avatarHtml, badgeHtml, valNum, unit);
      listEl.appendChild(item);
    });

    if (!myData && currentUserId && maxUser) {
      myRank = '100+';
      myData = {
        name: maxUser.first_name || 'Хакер',
        score: bestScore,
        game_data: { decoder_coins: coins, decoder_levels: totalLevels, photo_url: maxUser.photo_url, decoder_active_title: activeTitle, stream_best: streamBestScore, dice_best: diceBestScore }
      };
    }

    if (myData && myCardEl) {
      let gdMy = myData.game_data;
      try { if (typeof gdMy === 'string') gdMy = JSON.parse(gdMy); } catch(e) {}
      const myValNum = valueFor(gdMy, myData);
      const myAvatarHtml = window.SupabaseAPI.buildAvatarHtml(myData.name, gdMy && gdMy.photo_url, 46);
      const myBadgeHtml = buildTitleBadgeHtml(gdMy && gdMy.decoder_active_title ? gdMy.decoder_active_title : 'title_1');
      const myTop3 = (typeof myRank === 'number' && myRank <= 3);
      myCardEl.className = 'leaderboard-my-card' + (myTop3 ? ' lb-row--' + myRank : '');
      myCardEl.style.display = 'flex';
      myCardEl.innerHTML = _buildLbRow(myRank, myData.name, myAvatarHtml, myBadgeHtml, myValNum, unit, { sub: 'Ваше место' });
    }
  }

  // ══════════════════ ОНБОРДИНГ / ТУТОРИАЛЫ ══════════════════

  const _TUT_ICONS = {
    grid:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    arrows: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7V3M8 3 5 6M8 3l3 3M16 17v4M16 21l3-3M16 21l-3-3"/></svg>',
    bolt:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
    link:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a3 3 0 0 1 3-3h3a3 3 0 0 1 0 6M15 12a3 3 0 0 1-3 3H9a3 3 0 0 1 0-6"/></svg>',
    dice:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="16" cy="16" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
    shift:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M14 6l6 6-6 6"/></svg>',
    scan:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  };

  const TUTORIALS = {
    [LEVEL_TYPE.STANDARD]: { icon: _TUT_ICONS.grid, tag: 'КАК ИГРАТЬ', title: 'Стандартное декодирование', sub: 'Подбери секретный числовой код.', steps: [
      'Введи комбинацию цифр и нажми «Проверить».',
      '«Бык» — цифра верна и стоит на своём месте.',
      '«Корова» — такая цифра есть, но в другой позиции.',
      'Взломай код, пока не кончились попытки.' ] },
    [LEVEL_TYPE.BONUS]: { icon: _TUT_ICONS.arrows, tag: 'КАК ИГРАТЬ', title: 'Бонусный уровень', sub: 'Тот же подбор, но с поблажками.', steps: [
      'Попыток больше обычного — есть простор для ошибок.',
      'Стрелки у ячеек подсказывают: ↑ загаданное число больше, ↓ меньше.',
      'Отличный шанс набить DCDR.' ] },
    [LEVEL_TYPE.HARDCORE]: { icon: _TUT_ICONS.bolt, tag: 'ОСТОРОЖНО', title: 'Хардкор: слепой подбор', sub: 'Одна попытка. Без истории.', steps: [
      'У тебя всего один ввод — права на ошибку нет.',
      'История попыток скрыта: полагайся на логику и интуицию.',
      'Угадал — ты красавчик.' ] },
    [LEVEL_TYPE.SAFE]: { icon: _TUT_ICONS.link, tag: 'КАК ИГРАТЬ', title: 'Механика сейфа', sub: 'Ячейки связаны между собой.', steps: [
      'Связанные ячейки зависят друг от друга: +1 в одной = −1 в связанной.',
      'Связи показаны над полем — учитывай их при подборе.',
      'Сначала разберись со связками, потом добивай остальное.' ] },
    [LEVEL_TYPE.GLITCH]: { icon: _TUT_ICONS.bolt, tag: 'НОВАЯ МЕХАНИКА', title: 'Глитч-система', sub: 'Код мелькает доли секунды.', steps: [
      'Числа быстро мелькают и на миг замирают — запоминай их.',
      'Когда готов, нажми «Я запомнил» и введи код по памяти.',
      'Чистая тренировка визуальной памяти.' ] },
    [LEVEL_TYPE.DICE_SINGLE]: { icon: _TUT_ICONS.dice, tag: 'НА УДАЧУ', title: 'Кубик удачи', sub: 'Выбей нужное значение.', steps: [
      'Тапай по кубику, чтобы бросить его.',
      'Выпало значение цели — кубик фиксируется.',
      'Добейся цели за лимит попыток.' ] },
    [LEVEL_TYPE.DICE_MULTI]: { icon: _TUT_ICONS.dice, tag: 'НА УДАЧУ', title: 'Квартет кубиков', sub: 'Собери все четыре значения.', steps: [
      'Бросай каждый кубик тапом по нему.',
      'Совпал с целью — фиксируется, нет — бросай снова.',
      'Закрой все четыре кубика, пока есть попытки.' ] },
    [LEVEL_TYPE.SHIFT_CIPHER]: { icon: _TUT_ICONS.shift, tag: 'НОВАЯ МЕХАНИКА', title: 'Крипто-сдвиг', sub: 'Код смещён шифром.', steps: [
      'Клик по ячейке меняет её и соседнюю по кругу.',
      'Подгоняй значения под цель, показанную сверху.',
      'Выровняй весь код, чтобы снять шифр.' ] },
    [LEVEL_TYPE.CELL_HUNT]: { icon: _TUT_ICONS.scan, tag: 'НОВАЯ МЕХАНИКА', title: 'Охота за ячейкой', sub: 'Найди единственную «живую» ячейку.', steps: [
      'Среди ячеек рабочая только одна — остальные пусты.',
      'Тапай по ячейке, чтобы проверить её.',
      'Промах — ячейка гаснет и тратится попытка.',
      'Чем глубже этаж — тем больше ячеек и меньше попыток.' ] },
  };

  let _seenTutSet = new Set();
  let _tutPrevActive = false;
  let _tutPrevBlocked = false;
  let _tutOpen = false;
  let _rollAllMode = false; // when true, _onDiceRollClick skips per-die attempt cost

  function _tutSeen(type) {
    if (!type) return true;
    try { if (localStorage.getItem('decoder_tut_' + type) === '1') return true; } catch (e) { }
    return _seenTutSet.has(type);
  }
  function _tutMarkSeen(type) {
    _seenTutSet.add(type);
    try { localStorage.setItem('decoder_tut_' + type, '1'); } catch (e) { }
  }

  function _populateTutorial(type) {
    const t = TUTORIALS[type];
    if (!t) return false;
    const iconEl = document.getElementById('tut-icon');
    const tagEl = document.getElementById('tut-tag');
    const titleEl = document.getElementById('tut-title');
    const subEl = document.getElementById('tut-sub');
    const stepsEl = document.getElementById('tut-steps');
    if (iconEl) iconEl.innerHTML = t.icon || '';
    if (tagEl) tagEl.textContent = t.tag || 'НОВАЯ МЕХАНИКА';
    if (titleEl) titleEl.textContent = t.title;
    if (subEl) subEl.textContent = t.sub || '';
    if (stepsEl) {
      stepsEl.innerHTML = '';
      (t.steps || []).forEach((s, i) => {
        const row = document.createElement('div');
        row.className = 'tut-step';
        row.innerHTML = '<span class="tut-step-num">' + (i + 1) + '</span><span class="tut-step-txt">' + s + '</span>';
        stepsEl.appendChild(row);
      });
    }
    return true;
  }

  function _openTutorial(type) {
    if (!_populateTutorial(type)) return;
    const ov = document.getElementById('tutorial-overlay');
    if (!ov) return;
    _tutPrevActive = state.isGameActive;
    _tutPrevBlocked = state.isInputBlocked;
    state.isGameActive = false;
    state.isInputBlocked = true;
    _tutOpen = true;
    ov.classList.remove('hidden');
  }

  function _closeTutorial() {
    const ov = document.getElementById('tutorial-overlay');
    if (ov) ov.classList.add('hidden');
    if (_tutOpen) {
      state.isGameActive = _tutPrevActive;
      state.isInputBlocked = _tutPrevBlocked;
    }
    _tutOpen = false;
  }

  function _maybeShowTutorial(type) {
    // Авто-гайд отключён — доступен только по кнопке «?»
    return; // eslint-disable-line no-useless-return
    if (!TUTORIALS[type]) return;
    if (_tutSeen(type)) return;
    _tutMarkSeen(type);
    _openTutorial(type);
  }

  // Share win result + Game Over + module end (restored)
  function _getRefLink() {
    try {
      var maxUser = null;
      if (window.WebApp && window.WebApp.initData) {
        var urlParams = new URLSearchParams(window.WebApp.initData);
        var userParam = urlParams.get('user');
        if (userParam) maxUser = JSON.parse(userParam);
      }
      if (maxUser && maxUser.id) {
        return buildRefLink(maxUser.id);
      }
    } catch(e) {}
    return null; // ← null, не строка-заглушка
  }

  function shareLoseResult() {
    var loseReason = (document.getElementById('lose-reason') || {}).textContent || '';
    var loseLevels = (document.getElementById('lose-levels') || {}).textContent || '0';
    var loseScore  = (document.getElementById('lose-score')  || {}).textContent || '0';
    var modeNames  = { stream: 'ПОТОК', dice: 'АД КУБИКОВ', classic: 'КЛАССИКА', practice: 'ТРЕНИРОВКА' };
    var modeName   = modeNames[state.lastMode] || 'ДЕКОДЕР';
    var refLink    = _getRefLink();
    var isSegMode  = state.lastMode === 'stream' || state.lastMode === 'dice';
    var text =
      '[ДЕКОДЕР] — Раунд окончен 💀\n' +
      '━━━━━━━━━━━━━━━\n' +
      '💥 ' + loseReason + '\n' +
      (isSegMode ? '🎯 Сегментов: ' : '🎯 Уровень: ') + loseLevels + '\n' +
      '💰 Счёт: ' + loseScore + ' очков\n' +
      '🔷 Режим: ' + modeName + '\n' +
      '━━━━━━━━━━━━━━━\n' +
      'Сможешь лучше? 👇';
    _shareResultText(text);
  }

  function shareWinResult() {
    var level    = state.currentLevel;
    var attempts = state.attemptsUsed;
    var timeLeft = state.timeLeft;
    var score    = state.score;
    var type     = state.levelConfig && state.levelConfig.type;
    var typeNames = {
      standard: 'СТАНДАРТ',
      bonus: 'БОНУС',
      hardcore: 'ХАРДКОР',
      safe: 'СЕЙФ',
      glitch: 'ГЛИЧ',
      shift_cipher: 'ШИФР',
      cell_hunt: 'ОХОТА',
      void_signal: 'ПУСТОТА',
      dice_single: 'КУБИК',
      dice_multi: 'КУБИКИ'
    };
    var typeName = typeNames[type] || 'ДЕКОДЕР';
    var n = Math.min(attempts, 8);
    var bar = '🟢'.repeat(n) + '⬛'.repeat(Math.max(0, 8 - n));
    var text =
      '[ДЕКОДЕР] — Уровень взломан! 🔓\n' +
      '━━━━━━━━━━━━━━━\n' +
      '🎯 Уровень: ' + level + '\n' +
      bar + '\n' +
      '⚡ Попытки: ' + attempts + '\n' +
      '⏱ Осталось: ' + timeLeft + 'с\n' +
      '💰 Счёт: ' + score + ' очков\n' +
      '🔷 Тип: ' + typeName + '\n' +
      '━━━━━━━━━━━━━━━\n' +
      'Сможешь лучше? 👇';
    _shareResultText(text);
  }

  function _showGameOver(reason) {
    if (window.WebApp && window.WebApp.HapticFeedback) {
      try { window.WebApp.HapticFeedback.notificationOccurred('error'); } catch (e) { }
    } else if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    if (window.WebApp && window.WebApp.disableClosingConfirmation) window.WebApp.disableClosingConfirmation();
    if (window.WebApp && window.WebApp.ScreenCapture && window.WebApp.ScreenCapture.enableScreenCapture) window.WebApp.ScreenCapture.enableScreenCapture();
    var _t = state.levelConfig && state.levelConfig.type;
    var _hideAns = _t === LEVEL_TYPE.DICE_SINGLE || _t === LEVEL_TYPE.DICE_MULTI || _t === LEVEL_TYPE.CELL_HUNT;
    UIController.showLoseData(
      reason,
      state.levelConfig.password,
      state.currentLevel - 1,
      state.score,
      _hideAns
    );
    UIController.showOverlay('screen-game-over');
  }

  return {
    init,
    refreshDailyReward,
    applyBooster,
    buyBooster,
    unlockOrSelectTheme,
    buyOrSelectTitle
,
    refreshShopUI,
  };
})();
