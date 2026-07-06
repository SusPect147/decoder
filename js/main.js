document.addEventListener('DOMContentLoaded', () => {
  const bootScreen  = document.getElementById('boot-screen');
  const bootLogs    = document.getElementById('boot-logs'); // терминальная строка статуса
  const bootPercent = document.getElementById('boot-percent');
  const bootFill    = document.getElementById('boot-fill');
  const bootStatus  = document.getElementById('boot-status');

  window.onerror = function(message, source, lineno, colno, error) {
    addLog(`ОШИБКА: ${message}`, 'error');
    bootStatus.textContent = 'КРИТИЧЕСКАЯ ОШИБКА';
  };

  window.onunhandledrejection = function(event) {
    addLog(`СБОЙ ПРОМИСА: ${event.reason}`, 'error');
    bootStatus.textContent = 'ОШИБКА СЕТИ ИЛИ БД';
  };

  // Boot v2: вместо ленты логов — одна терминальная строка
  function addLog(text, type = '') {
    bootLogs.textContent = text;
    bootLogs.className = type;
  }

  let progress = 0;

  function setProgress(val) {
    progress = val;
    bootPercent.textContent = `${val}%`;
    bootFill.style.width = `${val}%`;
  }

  function updateProgress(target, statusText, logMessage = '', logType = '', stepDelay = 80) {
    return new Promise(resolve => {
      if (logMessage) addLog(logMessage, logType);
      bootStatus.textContent = statusText;
      const start = progress;
      const steps = target - start;
      if (steps <= 0) { resolve(); return; }
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed++;
        setProgress(start + elapsed);
        if (elapsed >= steps) { clearInterval(interval); resolve(); }
      }, stepDelay / steps);
    });
  }

  /* ------------------------------------------------------------------
     Boot v2: фон — колонны падающих цифр (вне центра, см. CSS-маску)
     ------------------------------------------------------------------ */
  (function buildBootRain() {
    const rain = document.getElementById('boot-rain');
    if (!rain || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cols = Math.min(20, Math.max(6, Math.floor(window.innerWidth / 70)));
    for (let i = 0; i < cols; i++) {
      const col = document.createElement('div');
      col.className = 'boot2-rain-col';
      let html = '';
      for (let j = 0; j < 30; j++) {
        const d = Math.floor(Math.random() * 10);
        html += (Math.random() < 0.18 ? '<b>' + d + '</b>' : d) + '\n';
      }
      col.innerHTML = html;
      col.style.left = ((i + 0.5) / cols * 100) + '%';
      col.style.animationDuration = (14 + Math.random() * 18) + 's';
      col.style.animationDelay = (-Math.random() * 30) + 's';
      col.style.fontSize = (11 + Math.random() * 5) + 'px';
      col.style.opacity = 0.6 + Math.random() * 0.4;
      rain.appendChild(col);
    }
  })();

  /* ------------------------------------------------------------------
     Boot v2: система «играет сама в себя» — подбирает пароль по
     правилам Быков и Коров, пока идёт реальная загрузка.
     Раунды повторяются, пока загрузка не завершится; finish()
     ускоряет анимацию и дожидается победного расклада (все быки).
     ------------------------------------------------------------------ */
  const BootCrack = (function () {
    const N = 4;
    const wrap = document.getElementById('boot-cells');
    const historyWrap = document.getElementById('boot-history');
    if (!wrap || !historyWrap) return { finish: () => Promise.resolve() };

    const cells = [];
    for (let i = 0; i < N; i++) {
      const c = document.createElement('div');
      c.className = 'boot2-cell';
      c.innerHTML = '<span class="boot2-cell-label">' + (i + 1) + '</span><span class="boot2-cell-value"></span>';
      wrap.appendChild(c);
      cells.push(c);
    }
    const val = c => c.querySelector('.boot2-cell-value');

    let fast = false;         // true после завершения реальной загрузки
    let roundActive = false;
    let attemptNo = 0;
    const roundEndResolvers = [];

    const rand = n => Math.floor(Math.random() * n);
    const sleep = ms => new Promise(r => setTimeout(r, fast ? Math.min(45, ms / 6) : ms));

    // Честный расчёт Быков и Коров
    const judge = (guess, target) => guess.map((d, i) => {
      if (d === target[i]) return 'bull';
      if (target.includes(d)) return 'cow';
      return 'miss';
    });

    function makeTarget() {
      const pool = [0,1,2,3,4,5,6,7,8,9];
      const t = [];
      for (let i = 0; i < N; i++) t.push(pool.splice(rand(pool.length), 1)[0]);
      return t;
    }

    // Сценарий раунда: промах -> тепло -> взлом (последняя попытка = пароль)
    function makeGuesses(target) {
      const notIn = [];
      for (let d = 0; d <= 9; d++) if (!target.includes(d)) notIn.push(d);
      const g1 = notIn.slice(0, N);
      while (g1.length < N) g1.push(rand(10));
      const g2 = g1.slice();
      g2[0] = target[0];   // бык
      g2[1] = target[2];   // корова
      return [g1, g2, target.slice()];
    }

    function resetCells() {
      cells.forEach(c => {
        c.className = 'boot2-cell';
        val(c).textContent = '';
      });
    }

    async function playAttempt(guess, target) {
      attemptNo++;
      // набор цифр по одной с подсветкой активной ячейки — как ввод в игре
      for (let i = 0; i < N; i++) {
        cells[i].classList.add('active');
        await sleep(160 + rand(120));
        for (let k = 0; k < 3; k++) {
          val(cells[i]).textContent = rand(10);
          await sleep(45);
        }
        val(cells[i]).textContent = guess[i];
        cells[i].classList.remove('active');
        cells[i].classList.add('has-value');
      }

      await sleep(320);

      // каскадная подсветка результата — как в игре
      const res = judge(guess, target);
      for (let i = 0; i < N; i++) {
        cells[i].classList.add(res[i], 'pop');
        await sleep(110);
      }

      const bulls = res.filter(r => r === 'bull').length;
      const cows  = res.filter(r => r === 'cow').length;
      await sleep(650);

      // перенос попытки в историю — как .history-row в игре
      const row = document.createElement('div');
      row.className = 'boot2-hrow';
      row.innerHTML =
        '<span class="boot2-hnum">#' + attemptNo + '</span>' +
        '<div class="boot2-hcells">' +
          guess.map((d, i) => '<div class="boot2-hcell ' + res[i] + '">' + d + '</div>').join('') +
        '</div>' +
        '<div class="boot2-hinfo">' +
          '<span class="boot2-hbulls">' + bulls + ' Б</span>' +
          '<span class="boot2-hcows">' + cows + ' К</span>' +
        '</div>';
      historyWrap.appendChild(row);
      while (historyWrap.children.length > 3) historyWrap.removeChild(historyWrap.firstChild);

      if (bulls < N) resetCells();
      return bulls === N;
    }

    async function loop() {
      // небольшая пауза, чтобы появление экрана отыграло
      await sleep(700);
      for (;;) {
        roundActive = true;
        attemptNo = 0;
        const target = makeTarget();
        const guesses = makeGuesses(target);
        for (const g of guesses) {
          await playAttempt(g, target);
          await sleep(350);
        }
        roundActive = false;
        roundEndResolvers.splice(0).forEach(r => r());
        if (fast) break;              // загрузка завершена — остаёмся на победном раскладе
        await sleep(1400);
        if (fast) break;
        resetCells();
        historyWrap.innerHTML = '';
      }
    }
    loop();

    return {
      // Ускоряет анимацию и резолвится, когда на экране победный расклад
      finish() {
        fast = true;
        if (!roundActive) return Promise.resolve();
        return Promise.race([
          new Promise(r => roundEndResolvers.push(r)),
          new Promise(r => setTimeout(r, 3000)), // страховка от зависания
        ]);
      }
    };
  })();

  async function runBootSequence() {
    try {
      await updateProgress(15, 'ВЗЛОМ БРАНДМАУЭРА...', 'УСТАНОВКА ЗАШИФРОВАННОГО ТУННЕЛЯ', 'info', 200);

      if (document.fonts) await document.fonts.ready;
      await updateProgress(30, 'ОБХОД ЗАЩИТЫ...', 'ШРИФТЫ СИСТЕМЫ ЗАГРУЖЕНЫ', 'success', 100);

      await updateProgress(50, 'ПОДБОР КОМБИНАЦИИ...', 'ИНИЦИАЛИЗАЦИЯ ДВИЖКА ДЕКОДИРОВАНИЯ', 'info', 150);

      if (window.SupabaseAPI) {
        await updateProgress(60, 'ПРОНИКНОВЕНИЕ В БАЗУ ДАННЫХ...', 'СИНХРОНИЗАЦИЯ С УДАЛЁННЫМ СЕРВЕРОМ', 'info', 300);
        const loaded = await window.SupabaseAPI.fetchMyDataSecurely();
        if (loaded && window.SupabaseAPI.isProfileLoaded) {
          addLog('ПРОФИЛЬ АГЕНТА ЗАГРУЖЕН', 'success');
        } else {
          addLog('СБОЙ СИНХРОНИЗАЦИИ — АВТОНОМНЫЙ РЕЖИМ', 'error');
          setTimeout(() => {
            if (window.UIController) {
              window.UIController.showToast("Нет связи с сервером. Прогресс не загружен.", "error");
            }
          }, 1500);
        }
      }

      GameManager.init();

      await updateProgress(90, 'ФИНАЛЬНАЯ КАЛИБРОВКА...', 'ДВИЖОК ГОТОВ К РАБОТЕ', 'success', 150);

      const title = document.querySelector('.menu-title');
      if (title) title.setAttribute('data-text', title.textContent);

      await updateProgress(100, 'ДОСТУП ПОЛУЧЕН', 'ДЕКОДЕР АКТИВИРОВАН ✓', 'success', 200);

      // Дожидаемся победного расклада (все быки) в анимации подбора
      await BootCrack.finish();

      await new Promise(r => setTimeout(r, 500));

      bootScreen.classList.add('fade-out');
      setTimeout(() => bootScreen.remove(), 800);

      // Возврат со страницы оплаты Robokassa (Success/Fail URL ведут на игру).
      // Реальное начисление делает сервер — здесь только сообщение игроку.
      const payParams = new URLSearchParams(window.location.search);
      if (payParams.has('OutSum') || payParams.get('payment') === 'success') {
        setTimeout(() => {
          if (window.UIController) {
            window.UIController.showToast('Оплата прошла! Вернитесь в игру в MAX — способность активируется автоматически.', 'success');
          }
        }, 1000);
      }

    } catch (err) {
      addLog(`КРИТИЧЕСКАЯ ОШИБКА: ${err.message}`, 'error');
      bootStatus.textContent = 'СИСТЕМА ОСТАНОВЛЕНА';
      bootLogs.style.userSelect = 'text';
      bootLogs.style.pointerEvents = 'auto';
      bootLogs.style.overflowY = 'auto';
    }
  }

  runBootSequence();
});
