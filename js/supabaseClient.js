(function() {
  const SUPABASE_URL = 'https://ewctmwbzhojjevfvskkh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3Y3Rtd2J6aG9qamV2ZnZza2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMjU5NDAsImV4cCI6MjA5NjkwMTk0MH0.ibvld0EH0YIJGa4q8xymT5VHyl7oE46nv2Xh6J2HEzs';

  // ---------------------------------------------------------------------
  // ОБХОД БЛОКИРОВКИ В РФ.
  // Домен *.supabase.co обслуживается через Cloudflare и у многих российских
  // провайдеров не открывается (ТСПУ / блокировка ECH) — из-за этого у игроков
  // из РФ не работали сохранение прогресса и рейтинг (VPN-трафик проходит).
  // Решение: реверс-прокси на своём домене, который пересылает запросы в
  // Supabase (инструкция — ПРОКСИ_РФ_настройка.md в корне проекта).
  // Впишите сюда адрес прокси, например 'https://api.mygame.ru'.
  // Пустая строка = прокси отключён, работаем только напрямую.
  const SUPABASE_PROXY_URL = 'https://d5duslqlk3td3o7kb850.nkhmighe.apigw.yandexcloud.net'; // Yandex API Gateway

  let dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Быстрая проверка доступности: любой HTTP-ответ (даже 4xx) значит, что
  // сеть до сервера есть; блокировка проявляется как таймаут/сброс соединения.
  async function _probe(baseUrl, timeoutMs) {
    const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      await fetch(baseUrl + '/auth/v1/health', {
        method: 'GET',
        headers: { apikey: SUPABASE_ANON_KEY },
        signal: ctrl ? ctrl.signal : undefined,
        cache: 'no-store'
      });
      return true;
    } catch (e) {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function _useBase(baseUrl) {
    if (baseUrl !== SUPABASE_URL) {
      dbClient = window.supabase.createClient(baseUrl, SUPABASE_ANON_KEY);
      console.warn('Supabase: прямой доступ недоступен, работаем через прокси ' + baseUrl);
    }
    // Запоминаем выбор, чтобы при следующем запуске не ждать таймаут 5с.
    try { localStorage.setItem('decoder_sb_proxy', baseUrl === SUPABASE_URL ? '0' : '1'); } catch (e) {}
  }

  // Выбор рабочего эндпоинта. Стартует сразу при загрузке страницы;
  // все сетевые функции ниже ждут результат (await _endpointReady).
  async function _pickEndpoint() {
    if (!SUPABASE_PROXY_URL) return;
    let preferProxy = false;
    try { preferProxy = localStorage.getItem('decoder_sb_proxy') === '1'; } catch (e) {}
    const order = preferProxy
      ? [SUPABASE_PROXY_URL, SUPABASE_URL]
      : [SUPABASE_URL, SUPABASE_PROXY_URL];
    for (let i = 0; i < order.length; i++) {
      if (await _probe(order[i], 5000)) { _useBase(order[i]); return; }
    }
    // Не ответил никто (нет сети вообще) — остаёмся на прямом URL.
  }
  const _endpointReady = _pickEndpoint().catch(() => {});

  
  // Состояние мини-игры «Пароль дня» за сегодня (попытки/история).
  function sanitizeDailyPw(v) {
    if (!v || typeof v !== 'object' || typeof v.date !== 'string') return undefined;
    const rows = Array.isArray(v.rows) ? v.rows.slice(0, 2).map(r => ({
      guess: Array.isArray(r.guess) ? r.guess.slice(0, 4).map(n => Number(n) || 0) : [],
      cell_results: Array.isArray(r.cell_results) ? r.cell_results.slice(0, 4).map(String) : [],
      bulls: Math.max(0, Math.min(Number(r.bulls) || 0, 4)),
      cows: Math.max(0, Math.min(Number(r.cows) || 0, 4)),
    })) : [];
    return {
      date: v.date.slice(0, 10),
      won: !!v.won,
      done: !!v.done,
      attempts: Math.max(0, Math.min(Number(v.attempts) || rows.length, 2)),
      rows: rows,
    };
  }

  // Санация облачного снапшота кампании «ОПЕРАЦИЯ ДЕШИФРОВЩИКА».
  // { progress: 0..100, cards: {hint:{common,rare,legendary},...,hackpack:N,...}, updated: ts }
  function sanitizeCampaign(v) {
    if (!v || typeof v !== 'object') return undefined;
    const BASE = ['hint', 'time', 'attempt', 'freeze', 'shield', 'scanner'];
    const COMBO = ['hackpack', 'survival', 'analysis', 'icecrack', 'overdrive', 'overload'];
    const RAR = ['common', 'rare', 'legendary'];
    const cards = {};
    const src = (v.cards && typeof v.cards === 'object') ? v.cards : {};
    BASE.forEach(t => {
      cards[t] = {};
      RAR.forEach(r => { cards[t][r] = Math.max(0, Math.min(Number(src[t]?.[r]) || 0, 999)); });
    });
    COMBO.forEach(c => { cards[c] = Math.max(0, Math.min(Number(src[c]) || 0, 999)); });
    return {
      progress: Math.max(0, Math.min(Number(v.progress) || 0, 100)),
      cards: cards,
      updated: Math.max(0, Number(v.updated) || 0)
    };
  }

  function sanitizeGameData(gd) {
    return {
      ...gd,
      decoder_best:         Math.max(0, Math.min(Number(gd.decoder_best)      || 0, 9999999)),
      decoder_levels:       Math.max(0, Math.min(Number(gd.decoder_levels)    || 0, 9999)),
      decoder_coins:        Math.max(0, Math.min(Number(gd.decoder_coins)     || 0, 999999)),
      decoder_daily_streak: Math.max(0, Math.min(Number(gd.decoder_daily_streak) || 0, 90)),
      decoder_season_points: Math.max(0, Math.min(Number(gd.decoder_season_points) || 0, 99999999)),
      decoder_season_start:  Math.max(0, Number(gd.decoder_season_start) || 0),
      decoder_daily_pw: sanitizeDailyPw(gd.decoder_daily_pw),
      decoder_completed_tasks: Array.isArray(gd.decoder_completed_tasks) ? gd.decoder_completed_tasks : [],
      decoder_boosters: {
        time:     Math.max(0, Math.min(Number(gd.decoder_boosters?.time)     || 0, 99)),
        attempts: Math.max(0, Math.min(Number(gd.decoder_boosters?.attempts) || 0, 99)),
        hint:     Math.max(0, Math.min(Number(gd.decoder_boosters?.hint)     || 0, 99)),
      },
      decoder_stats: {
        safe_clears:     Math.max(0, Math.min(Number(gd.decoder_stats?.safe_clears)     || 0, 9999)),
        bonus_clears:    Math.max(0, Math.min(Number(gd.decoder_stats?.bonus_clears)    || 0, 9999)),
        glitch_clears:   Math.max(0, Math.min(Number(gd.decoder_stats?.glitch_clears)   || 0, 9999)),
        cipher_clears:   Math.max(0, Math.min(Number(gd.decoder_stats?.cipher_clears)   || 0, 9999)),
        dice_clears:     Math.max(0, Math.min(Number(gd.decoder_stats?.dice_clears)     || 0, 9999)),
        hardcore_clears: Math.max(0, Math.min(Number(gd.decoder_stats?.hardcore_clears) || 0, 9999)),
        // ВАЖНО: сервер (save-score validateTypes) требует и эти два ключа.
        // Без них КАЖДОЕ сохранение отклонялось -> не сохранялись очки, монеты,
        // сезон, награда дня и рекорды во всех режимах.
        fractal_clears:     Math.max(0, Math.min(Number(gd.decoder_stats?.fractal_clears)     || 0, 9999)),
        void_signal_clears: Math.max(0, Math.min(Number(gd.decoder_stats?.void_signal_clears) || 0, 9999)),
        // БАГФИКС: раньше эти три счётчика ВЫРЕЗАЛИСЬ при каждой санации.
        // Из-за этого campaign_clears никогда не доходил до сервера, и claim
        // наград трека «Агент операции» (prog_campaign_stage_N) отклонялся
        // античитом («requires N clears, but you only have 0») — весь save
        // падал, монеты и отметка о взятой награде не сохранялись.
        stream_clears:   Math.max(0, Math.min(Number(gd.decoder_stats?.stream_clears)   || 0, 999999)),
        dicehell_clears: Math.max(0, Math.min(Number(gd.decoder_stats?.dicehell_clears) || 0, 999999)),
        campaign_clears: Math.max(0, Math.min(Number(gd.decoder_stats?.campaign_clears) || 0, 100)),
      },
      // Прогресс кампании «ОПЕРАЦИЯ ДЕШИФРОВЩИКА» (уровень + карточки) —
      // теперь синхронизируется с сервером, а не живёт только в localStorage.
      decoder_campaign: sanitizeCampaign(gd.decoder_campaign),
      decoder_daily_last_claim: Math.max(0, Number(gd.decoder_daily_last_claim) || 0),
      decoder_last_level_clear_time: Number(gd.decoder_last_level_clear_time) || 0,
      stream_best: Math.max(0, Math.min(Number(gd.stream_best) || 0, 9999999)),
      dice_best: Math.max(0, Math.min(Number(gd.dice_best) || 0, 9999999))
    };
  }

  const defaultGameData = {

    decoder_best: 0,
    decoder_levels: 0,
    decoder_coins: 0,
    decoder_daily_last_claim: 0,
    decoder_daily_streak: 0,
    decoder_season_points: 0,
    decoder_season_start: 0,
    decoder_boosters: { time: 0, attempts: 0, hint: 0 },
    decoder_unlocked_themes: ['default'],
    decoder_active_theme: 'default',
    decoder_unlocked_titles: ['title_1'],
    decoder_active_title: 'title_1',
    decoder_completed_tasks: [],
    decoder_stats: {
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
    },
    referred_by: null,
    decoder_last_level_clear_time: 0,
    stream_best: 0,
    dice_best: 0
  };

  let inMemoryGameData = JSON.parse(JSON.stringify(defaultGameData));
  let isProfileLoaded = false;

  
  function getMaxUser() {
    try {
      if (window.WebApp && window.WebApp.initData) {
        const urlParams = new URLSearchParams(window.WebApp.initData);
        const userParam = urlParams.get('user');
        if (userParam) return JSON.parse(userParam);
      }
    } catch (e) {}
    return null;
  }

  function buildAvatarHtml(name, photoUrl, size) {
    size = size || 28;
    if (photoUrl) {
      const safeUrl = photoUrl.replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const letter = (name || '?')[0].toUpperCase();
      const hue = ((letter.charCodeAt(0) - 65) * 15) % 360;
      const fallback = '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:hsl(' + hue + ',60%,40%);display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;font-size:' + Math.round(size * 0.45) + 'px;font-weight:700;color:#fff;flex-shrink:0;">' + letter.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
      return '<img src="' + safeUrl + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.outerHTML=\'' + fallback.replace(/'/g, "\\'") + '\'">';
    }
    const letter = (name || '?')[0].toUpperCase();
    const hue = ((letter.charCodeAt(0) - 65) * 15) % 360;
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:hsl(' + hue + ',60%,40%);display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;font-size:' + Math.round(size * 0.45) + 'px;font-weight:700;color:#fff;flex-shrink:0;">' + letter.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
  }

  function getLocalGameData() {
    const data = Object.assign({}, inMemoryGameData);
    const maxUser = getMaxUser();
    if (maxUser && maxUser.photo_url) {
      data.photo_url = maxUser.photo_url;
    }
    return data;
  }

  async function saveScoreSecurely(score, levelCleared = null, silent = false) {
    if (!isProfileLoaded) {
      console.warn("Cannot save score: User profile has not been successfully loaded yet.");
      return false;
    }
    const initData = window.WebApp ? window.WebApp.initData : null;
    if (!initData) {
      console.warn("MAX WebApp initData is missing.");
      return false;
    }
    const gameData = getLocalGameData();
    await _endpointReady; // дождаться выбора рабочего эндпоинта (РФ-прокси)
    // До 3 попыток с нарастающей паузой: при холодном старте Edge Function первый
    // запрос почти гарантированно фейлится, второй через 1.2с может попасть на
    // инициализацию, поэтому даём третью попытку через 2.5с.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error } = await dbClient.functions.invoke('save-score', {
          body: { initData, score, gameData, levelCleared }
        });
        if (error) {
          // Ошибка валидации/античита — повтор не поможет, выходим.
          console.error("Error saving score:", error.message);
          if (!silent && window.UIController) window.UIController.showToast("Ошибка сохранения: " + error.message, "error");
          return false;
        }
        console.log("Saved successfully!", data);
        return true;
      } catch (err) {
        // Сетевой сбой / холодный старт — пробуем ещё раз через нарастающую паузу.
        console.error("Failed to invoke save-score (attempt " + (attempt + 1) + ")", err);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, [1200, 2500][attempt]));
          continue;
        }
        return false;
      }
    }
    return false;
  }

  // Robustly extract the referral/start parameter from all possible WebApp / URL locations
  function _getReferralParamRaw() {
    // 1. Try initDataUnsafe
    if (window.WebApp && window.WebApp.initDataUnsafe) {
      const w = window.WebApp.initDataUnsafe;
      if (w.start_param) return w.start_param.toString();
      if (w.startapp) return w.startapp.toString();
      if (w.tgWebAppStartParam) return w.tgWebAppStartParam.toString();
      if (w.start) return w.start.toString();
    }
    
    // 2. Try initData parameters
    if (window.WebApp && window.WebApp.initData) {
      const urlParams = new URLSearchParams(window.WebApp.initData);
      const p = urlParams.get('start_param') || urlParams.get('startapp') || urlParams.get('tgWebAppStartParam') || urlParams.get('start') || urlParams.get('ref') || urlParams.get('payload');
      if (p) return p;
    }

    // 3. Try window.location.search
    if (window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      const p = searchParams.get('start_param') || searchParams.get('startapp') || searchParams.get('tgWebAppStartParam') || searchParams.get('start') || searchParams.get('ref') || searchParams.get('payload');
      if (p) return p;
    }

    // 4. Try window.location.hash
    if (window.location.hash) {
      let cleanHash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(cleanHash);
      if (cleanHash.startsWith('tgWebAppData=')) {
        const tgData = new URLSearchParams(hashParams.get('tgWebAppData'));
        const p = tgData.get('start_param') || tgData.get('startapp') || tgData.get('tgWebAppStartParam') || tgData.get('start');
        if (p) return p;
      } else {
        const p = hashParams.get('start_param') || hashParams.get('startapp') || hashParams.get('tgWebAppStartParam') || hashParams.get('start') || hashParams.get('ref') || hashParams.get('payload');
        if (p) return p;
      }
    }
    return null;
  }

  // Нормализует реферальный параметр: новые ссылки приходят как 'ref_<id>',
  // старые — как чистый <id>. Сервер ожидает чистый числовой id реферера.
  function getReferralParam() {
    let p = _getReferralParamRaw();
    if (!p) return null;
    p = p.toString();
    if (p.indexOf('ref_') === 0) p = p.slice(4);
    return p || null;
  }

  async function _fetchMyDataSecurely() {
    const initData = window.WebApp ? window.WebApp.initData : null;
    if (!initData) return false;

    await _endpointReady; // дождаться выбора рабочего эндпоинта (РФ-прокси)
    try {
      const urlParams = new URLSearchParams(initData);
      const userParam = urlParams.get('user');
      
      const startParam = getReferralParam();
      
      if (!userParam) return false;
      
      const user = JSON.parse(userParam);
      const userId = user.id.toString();

      const { data, error } = await dbClient
        .from('leaderboard')
        .select('score, game_data')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('0 rows') || error.message?.includes('JSON object requested')) {
          console.log("No existing profile. Creating one...");
          
          if (startParam && startParam !== userId) {
            inMemoryGameData.referred_by = startParam;
          }
          isProfileLoaded = true; // Allow initial profile creation save
          await saveScoreSecurely(0, null, true); // silent=true: не показываем тост при холодном старте Edge Function
          return true;
        }
        console.log("No existing profile:", error.message);
        return false;
      }

      if (data && data.game_data) {
        inMemoryGameData = sanitizeGameData(Object.assign({}, inMemoryGameData, data.game_data));

        let needsSave = false;

        // Accept referral for existing user if not already referred
        if (startParam && startParam !== userId && !inMemoryGameData.referred_by) {
          inMemoryGameData.referred_by = startParam;
          needsSave = true;
        }

        isProfileLoaded = true; // Mark as successfully loaded

        if (needsSave) {
          await saveScoreSecurely(inMemoryGameData.decoder_best || 0);
        }
      } else {
        isProfileLoaded = true; // Mark as loaded even if empty
      }
      return true;
    } catch (err) {
      console.error("Failed to fetch user data", err);
      return false;
    }
  }

  async function fetchMyDataSecurely() {
    return Promise.race([
      _fetchMyDataSecurely(),
      new Promise(resolve => setTimeout(() => {
        console.error("fetchMyDataSecurely timed out after 15 seconds");
        resolve(false);
      }, 15000))
    ]);
  }

  // Отфильтровывает чувствительные поля из game_data перед отображением в лидерборде.
  // Публично показываем только то, что нужно для UI: уровни, монеты, титул, тему.
  function stripSensitiveFields(gd) {
    if (!gd || typeof gd !== 'object') return {};
    return {
      decoder_levels:       gd.decoder_levels       || 0,
      decoder_coins:        gd.decoder_coins         || 0,
      decoder_active_title: gd.decoder_active_title  || 'title_1',
      decoder_active_theme: gd.decoder_active_theme  || 'default',
      photo_url:            gd.photo_url             || null,
      stream_best:          gd.stream_best           || 0,
      dice_best:            gd.dice_best             || 0,
      // НЕ включаем: referred_by, decoder_completed_tasks, decoder_daily_last_claim,
      // decoder_boosters, decoder_stats, decoder_best (есть отдельное поле score)
    };
  }

  // Leaderboard: все типы используют server-side сортировку по top-100.
  // Для stream_best / dice_best / decoder_levels / season_points — через
  // server-side ORDER BY с NULLS LAST; client-side сортировка больше не нужна.
  // Кэш рейтинга: повторные открытия мгновенные (TTL 45 сек).
  const _lbCache = {};
  const _LB_TTL = 45000;

  async function fetchLeaderboard(type) {
    type = type || 'score';

    const cached = _lbCache[type];
    if (cached && (Date.now() - cached.ts) < _LB_TTL) {
      return cached.data;
    }

    await _endpointReady; // дождаться выбора рабочего эндпоинта (РФ-прокси)
    try {
      var result;

      if (type === 'score') {
        result = await dbClient
          .from('leaderboard')
          .select('user_id, name, score, game_data')
          .order('score', { ascending: false })
          .limit(100);

      } else if (type === 'stream') {
        // Сортировка по JSONB-полю stream_best через приведение к числу
        result = await dbClient
          .from('leaderboard')
          .select('user_id, name, score, game_data')
          .order('game_data->stream_best', { ascending: false, nullsFirst: false })
          .limit(100);

        // Если сервер не поддержал JSONB-сортировку — fallback на client-side по 100 строкам
        if (result.error || !result.data) {
          const fb = await dbClient.from('leaderboard').select('user_id, name, score, game_data').limit(100);
          if (!fb.error && fb.data) {
            fb.data.sort(function(a,b) {
              var ga = _parseGD(a.game_data), gb = _parseGD(b.game_data);
              return (Number(gb.stream_best)||0) - (Number(ga.stream_best)||0);
            });
            result = fb;
          }
        }

      } else if (type === 'dice') {
        result = await dbClient
          .from('leaderboard')
          .select('user_id, name, score, game_data')
          .order('game_data->dice_best', { ascending: false, nullsFirst: false })
          .limit(100);

        if (result.error || !result.data) {
          const fb = await dbClient.from('leaderboard').select('user_id, name, score, game_data').limit(100);
          if (!fb.error && fb.data) {
            fb.data.sort(function(a,b) {
              var ga = _parseGD(a.game_data), gb = _parseGD(b.game_data);
              return (Number(gb.dice_best)||0) - (Number(ga.dice_best)||0);
            });
            result = fb;
          }
        }

      } else if (type === 'levels') {
        result = await dbClient
          .from('leaderboard')
          .select('user_id, name, score, game_data')
          .order('game_data->decoder_levels', { ascending: false, nullsFirst: false })
          .limit(100);

        if (result.error || !result.data) {
          const fb = await dbClient.from('leaderboard').select('user_id, name, score, game_data').limit(100);
          if (!fb.error && fb.data) {
            fb.data.sort(function(a,b) {
              var ga = _parseGD(a.game_data), gb = _parseGD(b.game_data);
              return (Number(gb.decoder_levels)||0) - (Number(ga.decoder_levels)||0);
            });
            result = fb;
          }
        }

      } else if (type === 'season') {
        result = await dbClient
          .from('leaderboard')
          .select('user_id, name, score, game_data')
          .order('game_data->decoder_season_points', { ascending: false, nullsFirst: false })
          .limit(100);

        if (result.error || !result.data) {
          const fb = await dbClient.from('leaderboard').select('user_id, name, score, game_data').limit(100);
          if (!fb.error && fb.data) {
            fb.data.sort(function(a,b) {
              var ga = _parseGD(a.game_data), gb = _parseGD(b.game_data);
              return (Number(gb.decoder_season_points)||0) - (Number(ga.decoder_season_points)||0);
            });
            result = fb;
          }
        }

      } else {
        // Fallback (на случай неизвестного типа)
        result = await dbClient
          .from('leaderboard')
          .select('user_id, name, score, game_data')
          .order('score', { ascending: false })
          .limit(100);
      }

      if (result.error) {
        console.error("Leaderboard error:", result.error.message);
        return [];
      }

      // БЫЛ БАГ: возвращали несуществующую переменную `data` -> ReferenceError -> []
      const rows = result.data || [];
      _lbCache[type] = { ts: Date.now(), data: rows };
      return rows;
    } catch (err) {
      return [];
    }
  }

  async function fetchFriends() {
    const maxUser = getMaxUser();
    if (!maxUser) return [];
    const myId = maxUser.id.toString();
    await _endpointReady; // дождаться выбора рабочего эндпоинта (РФ-прокси)
    try {
      const { data, error } = await dbClient
        .from('leaderboard')
        .select('user_id, name, score, game_data')
        .eq('game_data->>referred_by', myId)
        .limit(50);
      if (error) {
        console.error("Error fetching friends:", error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      return [];
    }
  }

  async function saveStreamScore(score) {
    const current = inMemoryGameData.stream_best || 0;
    if (score > current) {
      inMemoryGameData.stream_best = score;
      return await saveScoreSecurely(inMemoryGameData.decoder_best || 0, null, true);
    }
    return true;
  }

  async function saveDiceScore(score) {
    const current = inMemoryGameData.dice_best || 0;
    if (score > current) {
      inMemoryGameData.dice_best = score;
      return await saveScoreSecurely(inMemoryGameData.decoder_best || 0, null, true);
    }
    return true;
  }

  // Создаёт счёт Robokassa на покупку способности. Возвращает URL оплаты или null.
  // Вся криптография (подпись Паролем #1) — на сервере, в клиенте секретов нет.
  async function createPayment(itemId) {
    const initData = window.WebApp ? window.WebApp.initData : null;
    if (!initData) return null;
    await _endpointReady; // дождаться выбора рабочего эндпоинта (РФ-прокси)
    try {
      const { data, error } = await dbClient.functions.invoke('create-payment', {
        body: { initData, itemId }
      });
      if (error || !data || !data.url) {
        console.error("createPayment failed:", error ? error.message : (data && data.error));
        return null;
      }
      return data.url;
    } catch (err) {
      console.error("createPayment error:", err);
      return null;
    }
  }

  // Проверяет по БД, разблокирована ли способность (используется для
  // опроса статуса после отправки игрока на страницу оплаты).
  async function checkThemeUnlocked(itemId) {
    const maxUser = getMaxUser();
    if (!maxUser) return false;
    await _endpointReady; // дождаться выбора рабочего эндпоинта (РФ-прокси)
    try {
      const { data, error } = await dbClient
        .from('leaderboard')
        .select('game_data')
        .eq('user_id', maxUser.id.toString())
        .single();
      if (error || !data) return false;
      const themes = data.game_data && data.game_data.decoder_unlocked_themes;
      return Array.isArray(themes) && themes.includes(itemId);
    } catch (err) {
      return false;
    }
  }

  window.SupabaseAPI = {
    // getter: dbClient может быть пересоздан при переключении на прокси
    get supabase() { return dbClient; },
    get gameData() { return JSON.parse(JSON.stringify(inMemoryGameData)); },
    set gameData(val) { inMemoryGameData = sanitizeGameData(JSON.parse(JSON.stringify(val))); },
    get isProfileLoaded() { return isProfileLoaded; },
    saveScoreSecurely,
    saveStreamScore,
    saveDiceScore,
    fetchMyDataSecurely,
    fetchLeaderboard,
    fetchFriends,
    buildAvatarHtml,
    getMaxUser,
    createPayment,
    checkThemeUnlocked,
  };
})();
