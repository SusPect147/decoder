
const UIController = (() => {

  const elLevel       = document.getElementById('hud-level');
  const elAttempts    = document.getElementById('hud-attempts');
  const elTimer       = document.getElementById('hud-timer');
  const timerArc      = document.getElementById('timer-ring__arc');
  const typeBanner    = document.getElementById('level-type-banner');
  const typeText      = document.getElementById('level-type-text');
  const historyList   = document.getElementById('history-list');
  const hardcoreFlash = document.getElementById('hardcore-flash');
  const hardcoreText  = document.getElementById('hardcore-flash-text');
  const glitchDisplay = document.getElementById('glitch-display');
  const glitchCells   = document.getElementById('glitch-cells');
  const glitchReady   = document.getElementById('btn-glitch-ready');
  const safeInfo      = document.getElementById('safe-info');
  const safeLinksEl   = document.getElementById('safe-links');
  const bonusArrows   = document.getElementById('bonus-arrows');

  const ARC_CIRCUMFERENCE = 125.6;
  let maxTime = 60;
  let glitchInterval = null;
  let glitchFreezeTimers = [];
  let onGlitchReadyCb = null;
  let showAllHistory = false;
  const toggleBtn = document.getElementById('btn-toggle-history');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      showAllHistory = !showAllHistory;
      updateHistoryVisibility();
    });
  }

  function updateHistoryVisibility() {
    const rows = historyList.children;
    const total = rows.length;

    if (total <= 5) {
      if (toggleBtn) toggleBtn.classList.add('hidden');
      for (let i = 0; i < total; i++) {
        rows[i].classList.remove('hidden');
      }
      return;
    }

    if (toggleBtn) {
      toggleBtn.classList.remove('hidden');
      const hiddenCount = total - 5;
      const span = toggleBtn.querySelector('span');
      if (showAllHistory) {
        toggleBtn.childNodes[0].textContent = 'СВЕРНУТЬ ИСТОРИЮ ';
        if (span) span.textContent = ``;
      } else {
        toggleBtn.childNodes[0].textContent = 'ПОКАЗАТЬ ВСЕ ';
        if (span) span.textContent = `(${hiddenCount})`;
      }
    }

    for (let i = 0; i < total; i++) {
      if (i >= 5 && !showAllHistory) {
        rows[i].classList.add('hidden');
      } else {
        rows[i].classList.remove('hidden');
      }
    }
  }

  function setLevel(n) {
    elLevel.classList.add('level-changing');
    setTimeout(() => {
      elLevel.textContent = zeroPad(n);
      elLevel.classList.remove('level-changing');
    }, 250);
  }

  function setAttempts(n) {
    if (n >= 999) {
      elAttempts.textContent = '∞';
      elAttempts.style.color = 'var(--color-neon-green)';
    } else {
      elAttempts.textContent = n;
      elAttempts.style.color = n <= 2
        ? 'var(--color-neon-red)'
        : n <= 4
          ? 'var(--color-neon-yellow)'
          : 'var(--color-neon-green)';
    }
  }

  function setTimer(seconds, total) {
    maxTime = total;
    elTimer.textContent = seconds;

    const ratio = seconds / total;
    const offset = ARC_CIRCUMFERENCE * (1 - ratio);
    timerArc.style.strokeDashoffset = offset;

    timerArc.classList.remove('warning', 'danger');
    if (ratio <= 0.25) {
      timerArc.classList.add('danger');
    } else if (ratio <= 0.5) {
      timerArc.classList.add('warning');
    }
  }

  function setLevelTypeBanner(type) {
    typeBanner.className = 'level-type-banner';
    const cls = getLevelTypeClass(type);
    if (cls) typeBanner.classList.add(cls);
    typeText.textContent = getLevelTypeName(type);
  }

  function clearHistory() {
    historyList.innerHTML = '';
    showAllHistory = false;
    if (toggleBtn) {
      toggleBtn.classList.add('hidden');
      const span = toggleBtn.querySelector('span');
      if (span) span.textContent = '0';
    }
  }

  function addHistoryRow(attemptNum, digits, results, bulls, cows, isHardcore) {
    const row = document.createElement('div');
    row.className = 'history-row';

    const numEl = document.createElement('span');
    numEl.className = 'history-attempt-num';
    numEl.textContent = zeroPad(attemptNum);

    const cellsEl = document.createElement('div');
    cellsEl.className = 'history-cells';

    digits.forEach((digit, i) => {
      const c = document.createElement('div');
      c.className = `history-cell ${isHardcore ? 'miss' : results[i]}`;
      c.textContent = digit;
      cellsEl.appendChild(c);
    });

    const infoEl = document.createElement('div');
    infoEl.className = 'history-info';

    if (!isHardcore) {
      const bEl = document.createElement('span');
      bEl.className = 'history-bulls';
      bEl.innerHTML = `${bulls}<span class="indicator-dot bull-dot"></span>`;

      const cEl = document.createElement('span');
      cEl.className = 'history-cows';
      cEl.innerHTML = `${cows}<span class="indicator-dot cow-dot"></span>`;

      infoEl.appendChild(bEl);
      infoEl.appendChild(cEl);
    } else {
      const hEl = document.createElement('span');
      hEl.className = 'history-bulls';
      hEl.textContent = '???';
      infoEl.appendChild(hEl);
    }

    row.appendChild(numEl);
    row.appendChild(cellsEl);
    row.appendChild(infoEl);
    historyList.prepend(row);
    updateHistoryVisibility();
  }

  function showHardcoreFlash(bulls, cows) {
    hardcoreText.textContent = `[ СОВПАДЕНИЙ: ${bulls + cows} | НА СВОИХ МЕСТАХ: ${bulls} ]`;
    hardcoreFlash.classList.remove('hidden');

    setTimeout(() => {
      hardcoreFlash.classList.add('hidden');
    }, 1200);
  }

  function showVoidSignal(bulls, cows, noise) {
    // Показываем только текстовую информацию для режима "Пустота и сигнал"
    let existingSignal = document.querySelector('.void-signal-display');
    if (!existingSignal) {
      existingSignal = document.createElement('div');
      existingSignal.className = 'void-signal-display';
      const bannerEl = document.getElementById('level-type-banner');
      if (bannerEl && bannerEl.parentElement) {
        bannerEl.parentElement.insertBefore(existingSignal, bannerEl.nextSibling);
      }
    }
    existingSignal.innerHTML = `
      <span class="signal-label">// СИГНАЛ:</span>
      <span class="void-signal-value">${bulls} БЫКОВ | ${cows} КОРОВ | ${noise} ШУМА</span>
    `;
  }

  function showBonusArrows(guess, password, results) {
    bonusArrows.innerHTML = '';
    bonusArrows.classList.remove('hidden');

    guess.forEach((digit, i) => {
      const item = document.createElement('div');
      item.className = 'bonus-arrow-item';

      const pw = password[i];
      let arrow, cls;

      if (results[i] === 'bull') {
        arrow = '✓'; cls = 'equal';
      } else if (digit < pw) {
        arrow = '▲'; cls = 'up';
      } else if (digit > pw) {
        arrow = '▼'; cls = 'down';
      } else {
        arrow = '—'; cls = 'equal';
      }

      item.classList.add(cls);
      item.innerHTML = `<span>${arrow}</span><span class="bonus-arrow-label">${i + 1}</span>`;
      bonusArrows.appendChild(item);
    });
  }

  function hideBonusArrows() {
    bonusArrows.classList.add('hidden');
    bonusArrows.innerHTML = '';
  }

  function showSafeInfo(safeLinks, cellCount) {
    safeInfo.classList.remove('hidden');
    safeLinksEl.innerHTML = '';

    safeLinks.forEach(link => {
      const badge = document.createElement('span');
      badge.className = 'safe-link-badge';
      badge.textContent = `Ячейка ${link.from + 1} ⇄ Ячейка ${link.to + 1}`;
      safeLinksEl.appendChild(badge);
    });
  }

  function hideSafeInfo() {
    safeInfo.classList.add('hidden');
  }

  function startGlitch(password, onReady) {
    onGlitchReadyCb = onReady;
    glitchDisplay.classList.remove('hidden');
    glitchCells.innerHTML = '';

    const cells = [];
    for (let i = 0; i < password.length; i++) {
      const cell = document.createElement('div');
      cell.className = 'glitch-cell';
      cell.textContent = randomInt(0, 9);
      glitchCells.appendChild(cell);
      cells.push(cell);
    }

    glitchInterval = setInterval(() => {
      cells.forEach(cell => {
        if (!cell.classList.contains('frozen')) {
          cell.textContent = randomInt(0, 9);
        }
      });
    }, 60);

    let revealCount = 0;
    const totalReveals = password.length;

    const revealSequence = shuffleArray([...Array(password.length).keys()]);

    function doReveal() {
      if (revealCount >= totalReveals * 2) return;

      const idx = revealSequence[revealCount % revealSequence.length];
      const cell = cells[idx];

      cell.classList.add('frozen');
      cell.textContent = password[idx];

      setTimeout(() => {
        cell.classList.remove('frozen');
      }, 700);

      revealCount++;

      const nextDelay = randomInt(1000, 2500);
      glitchFreezeTimers.push(setTimeout(doReveal, nextDelay));
    }

    glitchFreezeTimers.push(setTimeout(doReveal, 500));

    glitchReady.onclick = () => {
      stopGlitch();
      if (onGlitchReadyCb) onGlitchReadyCb();
    };
  }

  function stopGlitch() {
    clearInterval(glitchInterval);
    glitchFreezeTimers.forEach(t => clearTimeout(t));
    glitchFreezeTimers = [];
    glitchDisplay.classList.add('hidden');
    glitchCells.innerHTML = '';
  }

  function resetSpecialModes() {
    // Сбрасываем специальные режимы (Fractal, Void Signal)
    const levelCard = document.querySelector('.level-card');
    if (levelCard) {
      levelCard.classList.remove('fractal-mode', 'void-mode');
    }

    // Удаляем void signal display если существует
    const voidSignal = document.querySelector('.void-signal-display');
    if (voidSignal) voidSignal.remove();

    // Показываем level-type-banner снова
    const typeBanner = document.getElementById('level-type-banner');
    if (typeBanner) typeBanner.classList.remove('hidden');
  }

  function liftTransition(fromId, toId, durationMs = 600) {
    return new Promise(resolve => {
      const fromEl = document.getElementById(fromId);
      const toEl   = document.getElementById(toId);

      if (!fromEl || !toEl) { resolve(); return; }

      fromEl.classList.remove('screen--active');
      fromEl.classList.add('screen--exit-down');

      toEl.classList.add('screen--active');

      setTimeout(() => {
        fromEl.classList.remove('screen--exit-down');
        resolve();
      }, durationMs);
    });
  }

  function showOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('screen--active');
  }

  function hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('screen--active');
  }

  function showWinData(timeLeft, attemptsUsed, coinsEarned) {
    const bonus = Math.floor(timeLeft * 10);
    document.getElementById('win-time-bonus').textContent    = `+${bonus}`;
    document.getElementById('win-attempts-used').textContent = attemptsUsed;
    const winCoins = document.getElementById('win-coins-earned');
    if (winCoins) winCoins.textContent = `+${coinsEarned}`;
  }

  function showLoseData(reason, password, levelsCleared, score, hideAnswer) {
    document.getElementById('lose-reason').textContent  = reason;
    const answerLine = document.querySelector('.lose-answer');
    if (hideAnswer) {
      // В кубиках ответ заранее известен — не показываем «Ответ был»
      if (answerLine) answerLine.style.display = 'none';
    } else {
      if (answerLine) answerLine.style.display = '';
      document.getElementById('lose-answer').textContent = (password || []).join(' ');
    }
    document.getElementById('lose-levels').textContent  = levelsCleared;
    document.getElementById('lose-score').textContent   = score;
  }

  function updateMenuStats(bestScore, levelsCleared, coinsVal, streamBest, diceBest, spVal) {
    const elBest   = document.getElementById('menu-best-score');
    const elLevels = document.getElementById('menu-levels-cleared');
    if (elBest)   elBest.textContent   = bestScore;
    if (elLevels) elLevels.textContent = levelsCleared;
    const elStream = document.getElementById('menu-stream-best');
    const elDice   = document.getElementById('menu-dice-best');
    if (elStream) elStream.textContent = streamBest || 0;
    if (elDice)   elDice.textContent   = diceBest   || 0;
    updateCoins(coinsVal);
    const elSp = document.getElementById('menu-season-points');
    if (elSp) elSp.textContent = spVal || 0;
  }

  function updateCoins(coinsVal) {
    const el = document.getElementById('menu-coins');
    if (el) el.textContent = coinsVal;
    const elStream = document.getElementById('menu-coins-stream');
    if (elStream) elStream.textContent = coinsVal;
    const elDice = document.getElementById('menu-coins-dice');
    if (elDice) elDice.textContent = coinsVal;
    const friendsCoins = document.getElementById('friends-coins-balance');
    if (friendsCoins) friendsCoins.textContent = coinsVal;
  }

  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    let icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; color: var(--c-safe);"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M12 2v2"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/><circle cx="12" cy="7" r="3"/></svg>`;
    if (type === 'success') {
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; color: var(--c-standard);"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; color: var(--c-hardcore);"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    }

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.style.cssText = 'display: inline-flex; align-items: center; justify-content: center;';
    iconSpan.innerHTML = icon; 

    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-message';
    msgSpan.textContent = message; 

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
          container.remove();
        }
      }, 400);
    }, 2500);
  }

  let dailyTimerInterval = null;

  function renderDailyRewards(rewards, lastClaimedDay, activeDay, claimable, lastClaimTime) {
    const grid = document.getElementById('daily-rewards-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const coinSvg = `
      <svg class="coin-icon" viewBox="0 0 24 24" fill="none" style="width:14px;height:14px;color:var(--c-standard);filter:drop-shadow(0 0 3px rgba(88,232,154,0.55));vertical-align:middle;" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
        <path d="M5 9l7-6 7 6-7 12L5 9z"/>
        <path d="M5 9h14M10 3l-2 6 4 12 4-12-2-6"/>
      </svg>
    `;

    // Сначала рисуем первые 7 дней
    const first7 = document.createElement('div');
    first7.className = 'daily-rewards-week';
    grid.appendChild(first7);

    // Контейнер для дней 8-90 (свернут)
    let expandSection = null;
    if (rewards.length > 7) {
      expandSection = document.createElement('div');
      expandSection.className = 'daily-rewards-expand-section';
      expandSection.style.display = 'none';
      grid.appendChild(expandSection);

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'daily-rewards-toggle-btn';
      toggleBtn.textContent = '▼ ПОКАЗАТЬ ВСЕ ' + rewards.length + ' ДНЕЙ';
      toggleBtn.onclick = () => {
        const open = expandSection.style.display !== 'none';
        expandSection.style.display = open ? 'none' : 'block';
        toggleBtn.textContent = open
          ? '▼ ПОКАЗАТЬ ВСЕ ' + rewards.length + ' ДНЕЙ'
          : '▲ СВЕРНУТЬ';
      };
      grid.insertBefore(toggleBtn, expandSection);
    }

    let currentPathRow = null;
    let pathRowIndex = 0;

    rewards.forEach((amount, i) => {
      const dayNum = i + 1;
      const card = document.createElement('div');
      card.className = `reward-card reward-card-${dayNum}`;

      if (dayNum < activeDay || (dayNum === activeDay && !claimable && lastClaimTime > 0)) {
        card.classList.add('completed');
      } else if (dayNum === activeDay && claimable) {
        card.classList.add('active');
      } else {
        card.classList.add('locked');
      }

      card.innerHTML = `
        <span class="reward-day">ДЕНЬ ${dayNum}</span>
        <span class="reward-amount">${coinSvg}+${amount}</span>
      `;

      if (dayNum <= 7) {
        first7.appendChild(card);
      } else if (expandSection) {
        const relIdx = dayNum - 8;
        if (relIdx % 4 === 0) {
          // Добавляем коннектор-поворот между рядами (не перед первым)
          if (pathRowIndex > 0) {
            const connector = document.createElement('div');
            connector.className = 'daily-path-connector ' +
              (pathRowIndex % 2 === 1 ? 'connector-right' : 'connector-left');
            expandSection.appendChild(connector);
          }
          currentPathRow = document.createElement('div');
          currentPathRow.className = 'daily-path-row' + (pathRowIndex % 2 === 1 ? ' reverse' : '');
          expandSection.appendChild(currentPathRow);
          pathRowIndex++;
        }
        currentPathRow.appendChild(card);
      }
    });

    const claimBtn = document.getElementById('btn-claim-daily');
    if (!claimBtn) return;

    if (dailyTimerInterval) {
      clearInterval(dailyTimerInterval);
      dailyTimerInterval = null;
    }

    if (claimable) {
      claimBtn.disabled = false;
      claimBtn.textContent = 'ПОЛУЧИТЬ НАГРАДУ';
      claimBtn.style.color = '#000';
      claimBtn.style.background = 'var(--accent)';
    } else {
      claimBtn.disabled = true;
      claimBtn.style.color = 'rgba(255,255,255,0.4)';
      claimBtn.style.background = 'rgba(255,255,255,0.05)';

      const updateCountdown = () => {
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const diff = now - lastClaimTime;
        const remaining = oneDayMs - diff;

        if (remaining <= 0) {
          claimBtn.disabled = false;
          claimBtn.textContent = 'ПОЛУЧИТЬ НАГРАДУ';
          claimBtn.style.color = '#000';
          claimBtn.style.background = 'var(--accent)';
          if (typeof GameManager !== 'undefined' && GameManager.refreshDailyReward) {
            GameManager.refreshDailyReward();
          }
          clearInterval(dailyTimerInterval);
        } else {
          const hrs = Math.floor(remaining / (3600 * 1000));
          const mins = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
          const secs = Math.floor((remaining % (60 * 1000)) / 1000);
          claimBtn.textContent = `СЛЕДУЮЩАЯ НАГРАДА ЧЕРЕЗ: ${zeroPad(hrs)}:${zeroPad(mins)}:${zeroPad(secs)}`;
        }
      };

      updateCountdown();
      dailyTimerInterval = setInterval(updateCountdown, 1000);
    }
  }

  function renderShop(storeItems, userBoosters, unlockedThemes, activeTheme, unlockedTitles, activeTitle, coinsVal) {
    const coinsEl = document.getElementById('shop-coins-balance');
    if (coinsEl && coinsVal !== undefined) {
      coinsEl.textContent = coinsVal;
    }

    const boostersList = document.getElementById('shop-boosters-list');
    if (boostersList) {
      boostersList.innerHTML = '';
      storeItems.boosters.forEach(item => {
        const owned = userBoosters[item.id] || 0;
        const card = document.createElement('div');
        card.className = 'shop-item-card';

        card.innerHTML = `
          <div class="shop-item-icon">${item.icon}</div>
          <div class="shop-item-details">
            <span class="shop-item-name">${item.name}</span>
            <span class="shop-item-desc">${item.desc}</span>
            <span class="shop-item-inventory">В наличии: ${owned} шт.</span>
          </div>
          <div class="shop-item-price">
            <div class="price-value">
              <svg class="coin-icon" viewBox="0 0 24 24" fill="none" style="width:13px;height:13px;color:var(--c-standard);filter:drop-shadow(0 0 3px rgba(88,232,154,0.55));vertical-align:middle;" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
                <path d="M5 9l7-6 7 6-7 12L5 9z"/>
                <path d="M5 9h14M10 3l-2 6 4 12 4-12-2-6"/>
              </svg>
              ${item.price}
            </div>
            <button class="btn btn--primary btn-buy-item" onclick="GameManager.buyBooster('${item.id}')">КУПИТЬ</button>
          </div>
        `;
        boostersList.appendChild(card);
      });
    }

    const themesList = document.getElementById('shop-themes-list');
    if (themesList) {
      themesList.innerHTML = '';
      storeItems.themes.forEach(item => {
        const isUnlocked = unlockedThemes.includes(item.id);
        const isActive = activeTheme === item.id;
        const card = document.createElement('div');
        card.className = 'shop-item-card';

        let btnHtml = '';
        if (isActive) {
          btnHtml = `<button class="btn btn-buy-item active-theme" disabled>АКТИВНО</button>`;
        } else if (isUnlocked) {
          btnHtml = `<button class="btn btn--secondary btn-buy-item" onclick="GameManager.unlockOrSelectTheme('${item.id}')">ЗАПУСТИТЬ</button>`;
        } else {
          btnHtml = `<button class="btn btn--primary btn-buy-item" onclick="GameManager.unlockOrSelectTheme('${item.id}')">КУПИТЬ</button>`;
        }

        const priceText = item.priceRub === 0 ? 'Бесплатно' : `${item.priceRub} ₽`;
        const priceClass = item.priceRub === 0 ? 'free' : 'rubles';

        card.innerHTML = `
          <div class="shop-item-icon">${item.icon}</div>
          <div class="shop-item-details">
            <span class="shop-item-name">${item.name}</span>
            <span class="shop-item-desc">${item.desc}</span>
            <span class="shop-item-inventory" style="color: ${isActive ? 'var(--c-standard)' : 'rgba(255,255,255,0.3)'}">
              ${isActive ? 'Запущено' : (isUnlocked ? 'Разблокировано' : 'Заблокировано')}
            </span>
          </div>
          <div class="shop-item-price">
            <div class="price-value ${priceClass}">${priceText}</div>
            ${btnHtml}
          </div>
        `;
        themesList.appendChild(card);
      });
    }

    const titlesList = document.getElementById('shop-titles-list');
    if (titlesList) {
      titlesList.innerHTML = '';
      storeItems.titles.forEach(item => {
        if (item.id === 'title_5') return; // Do not show secret titles in the store tab
        const isUnlocked = unlockedTitles.includes(item.id);
        const isActive = activeTitle === item.id;
        const card = document.createElement('div');
        card.className = 'shop-item-card';

        let btnHtml = '';
        if (isActive) {
          btnHtml = `<button class="btn btn-buy-item active-theme" disabled>АКТИВНО</button>`;
        } else if (isUnlocked) {
          btnHtml = `<button class="btn btn--secondary btn-buy-item equip-title" onclick="GameManager.buyOrSelectTitle('${item.id}')">НАДЕТЬ</button>`;
        } else {
          btnHtml = `<button class="btn btn--primary btn-buy-item" onclick="GameManager.buyOrSelectTitle('${item.id}')">КУПИТЬ</button>`;
        }

        const priceHtml = item.price === 0
          ? `<div class="price-value free">Бесплатно</div>`
          : `
            <div class="price-value">
              <svg class="coin-icon" viewBox="0 0 24 24" fill="none" style="width:13px;height:13px;color:var(--c-standard);filter:drop-shadow(0 0 3px rgba(88,232,154,0.55));vertical-align:middle;" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
                <path d="M5 9l7-6 7 6-7 12L5 9z"/>
                <path d="M5 9h14M10 3l-2 6 4 12 4-12-2-6"/>
              </svg>
              ${item.price}
            </div>
          `;

        card.innerHTML = `
          <div class="shop-item-icon">${item.icon}</div>
          <div class="shop-item-details">
            <span class="shop-item-name">${item.name}</span>
            <span class="shop-item-desc">${item.desc}</span>
            <span class="shop-item-inventory" style="color: ${isActive ? 'var(--c-glitch)' : 'rgba(255,255,255,0.3)'}">
              ${isActive ? 'Экипировано' : (isUnlocked ? 'Разблокировано' : 'Заблокировано')}
            </span>
          </div>
          <div class="shop-item-price">
            ${priceHtml}
            ${btnHtml}
          </div>
        `;
        titlesList.appendChild(card);
      });
    }

    const inventoryList = document.getElementById('shop-inventory-list');
    if (inventoryList) {
      inventoryList.innerHTML = '';

      const activeTitleObj = storeItems.titles.find(x => x.id === activeTitle);
      const activeThemeObj = storeItems.themes.find(x => x.id === activeTheme);

      const activeBox = document.createElement('div');
      activeBox.className = 'inventory-active-box';
      activeBox.innerHTML = `
        <h4 class="inventory-section-title">// ТЕКУЩАЯ ЭКИПИРОВКА</h4>
        <div class="active-equip-grid">
          <div class="active-equip-item">
            <span class="equip-label">ЗВАНИЕ:</span>
            <span class="equip-value rank-text">${activeTitleObj ? activeTitleObj.name : 'Нет'}</span>
          </div>
          <div class="active-equip-item">
            <span class="equip-label">АКТИВНЫЙ МОДУЛЬ:</span>
            <span class="equip-value theme-text">${activeThemeObj ? activeThemeObj.name : 'Нет'}</span>
          </div>
        </div>
      `;
      inventoryList.appendChild(activeBox);

      const boostersBox = document.createElement('div');
      boostersBox.className = 'inventory-boosters-box';
      boostersBox.innerHTML = `
        <h4 class="inventory-section-title">// ЗАПАС УТИЛИТ</h4>
        <div class="inventory-boosters-grid">
          ${storeItems.boosters.map(b => {
            const count = userBoosters[b.id] || 0;
            return `
              <div class="inventory-booster-card">
                <span class="inv-booster-icon">${b.icon}</span>
                <span class="inv-booster-name">${b.name}</span>
                <span class="inv-booster-count">${count} шт.</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
      inventoryList.appendChild(boostersBox);

      const themesBox = document.createElement('div');
      themesBox.className = 'inventory-list-box';
      const unlockedThemesList = storeItems.themes.filter(t => unlockedThemes.includes(t.id));
      themesBox.innerHTML = `
        <h4 class="inventory-section-title">// ВАШИ СПОСОБНОСТИ (${unlockedThemesList.length}/${storeItems.themes.length})</h4>
        <div class="inventory-items-grid">
          ${unlockedThemesList.map(t => {
            const isActive = activeTheme === t.id;
            return `
              <div class="inventory-item-row ${isActive ? 'active' : ''}">
                <span class="inv-item-icon">${t.icon}</span>
                <span class="inv-item-name">${t.name}</span>
                ${isActive
                  ? `<span class="inv-item-status active">АКТИВЕН</span>`
                  : `<button class="btn btn--secondary btn-inv-action" onclick="GameManager.unlockOrSelectTheme('${t.id}')">ЗАПУСТИТЬ</button>`
                }
              </div>
            `;
          }).join('')}
        </div>
      `;
      inventoryList.appendChild(themesBox);

      const titlesBox = document.createElement('div');
      titlesBox.className = 'inventory-list-box';
      const unlockedTitlesList = storeItems.titles.filter(t => unlockedTitles.includes(t.id));
      const totalTitlesCount = storeItems.titles.filter(t => t.id !== 'title_5' || unlockedTitles.includes('title_5')).length;
      titlesBox.innerHTML = `
        <h4 class="inventory-section-title">// ВАШИ ЗВАНИЯ (${unlockedTitlesList.length}/${totalTitlesCount})</h4>
        <div class="inventory-items-grid">
          ${unlockedTitlesList.map(t => {
            const isActive = activeTitle === t.id;
            return `
              <div class="inventory-item-row ${isActive ? 'active' : ''}">
                <span class="inv-item-icon">${t.icon}</span>
                <span class="inv-item-name">${t.name}</span>
                ${isActive
                  ? `<span class="inv-item-status active">АКТИВНО</span>`
                  : `<button class="btn btn--secondary btn-inv-action" onclick="GameManager.buyOrSelectTitle('${t.id}')">НАДЕТЬ</button>`
                }
              </div>
            `;
          }).join('')}
        </div>
      `;
      inventoryList.appendChild(titlesBox);
    }
  }

  function renderBoosterToolbar(userBoosters, levelBoostersUsed) {
    const toolbar = document.getElementById('booster-toolbar');
    if (!toolbar) return;
    toolbar.innerHTML = '';

    const boosterTypes = [
      {
        id: 'time',
        icon: `<svg class="booster-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        label: '+15 сек',
        title: 'Добавить 15 секунд'
      },
      {
        id: 'attempts',
        icon: `<svg class="booster-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        label: '+3 поп.',
        title: 'Добавить 3 попытки'
      },
      {
        id: 'hint',
        icon: `<svg class="booster-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        label: 'Дешифр.',
        title: 'Расшифровать 1 ячейку'
      }
    ];

    boosterTypes.forEach(b => {
      const count = userBoosters[b.id] || 0;
      const isUsed = levelBoostersUsed[b.id];
      const btn = document.createElement('button');
      btn.className = 'booster-btn';
      btn.title = b.title;

      if (isUsed) {
        btn.classList.add('active-used');
        btn.disabled = true;
        btn.innerHTML = `${b.icon}<span>${b.label}</span><span class="booster-btn-count">✓</span>`;
      } else {
        btn.innerHTML = `${b.icon}<span>${b.label}</span><span class="booster-btn-count">${count}</span>`;
        btn.addEventListener('click', () => GameManager.applyBooster(b.id));
      }

      toolbar.appendChild(btn);
    });
  }

  const diceCache = {};
  let diceLottieInstances = [];

  async function getDiceAnimationData(name) {
    if (diceCache[name]) return diceCache[name];
    try {
      const response = await fetch(`assets/cubes/${name}.tgs`);
      const arrayBuffer = await response.arrayBuffer();
      const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
      const data = JSON.parse(decompressed);
      diceCache[name] = data;
      return data;
    } catch (e) {
      console.error(`Error loading TGS animation ${name}:`, e);
      return null;
    }
  }

  async function preLoadDiceAnimations() {
    const names = ['first-cubic', '1-cubic', '2-cubic', '3-cubic', '4-cubic', '5-cubic', '6-cubic'];
    for (const name of names) {
      getDiceAnimationData(name).catch(() => {});
    }
  }

  async function loadDieAnimation(element, index, name, loop) {
    if (diceLottieInstances[index]) {
      diceLottieInstances[index].destroy();
      diceLottieInstances[index] = null;
    }
    const data = await getDiceAnimationData(name);
    if (!data) return null;
    if (!document.body.contains(element)) return null;
    const anim = lottie.loadAnimation({
      container: element,
      renderer: 'canvas',
      loop: loop,
      autoplay: true,
      animationData: data
    });
    diceLottieInstances[index] = anim;
    return anim;
  }

  function renderDiceLevel(targetDigits, cellCount, onDiceClick, onRollAll) {
    document.getElementById('input-cells').classList.add('hidden');
    document.getElementById('btn-submit').classList.add('hidden');
    document.getElementById('input-error').classList.add('hidden');
    const keypad = document.getElementById('virtual-keypad');
    if (keypad) keypad.classList.add('hidden');

    const diceArea = document.getElementById('dice-area');
    diceArea.classList.remove('hidden');

    diceLottieInstances.forEach(inst => {
      if (inst) inst.destroy();
    });
    diceLottieInstances = [];

    const targetDisplay = document.getElementById('dice-target-display');
    targetDisplay.innerHTML = 'ЦЕЛЬ:';
    targetDigits.forEach(digit => {
      const span = document.createElement('div');
      span.className = 'dice-target-digit';
      span.innerHTML = getDiceFaceSvg(digit);
      targetDisplay.appendChild(span);
    });

    const container = document.getElementById('dice-container');
    container.innerHTML = '';

    for (let i = 0; i < cellCount; i++) {
      const die = document.createElement('div');
      die.className = 'dice-item';
      die.dataset.index = i;
      container.appendChild(die);

      loadDieAnimation(die, i, 'first-cubic', true);

      die.addEventListener('click', () => {
        if (die.classList.contains('rolling')) return;
        onDiceClick(i);
      });
    }

    // "Roll all" button — only for DICE_MULTI
    const existingRollAll = diceArea.querySelector('.dice-roll-all-btn');
    if (existingRollAll) existingRollAll.remove();
    if (onRollAll) {
      const rollAllBtn = document.createElement('button');
      rollAllBtn.className = 'btn btn--secondary dice-roll-all-btn';
      rollAllBtn.textContent = '🎲 БРОСИТЬ ВСЕ';
      rollAllBtn.style.cssText = 'margin-top: 12px; width: 100%;';
      rollAllBtn.addEventListener('click', () => onRollAll());
      diceArea.appendChild(rollAllBtn);
    }
  }

  async function rollDie(index, value, onComplete) {
    const container = document.getElementById('dice-container');
    if (!container) return;
    const die = container.querySelector(`.dice-item[data-index="${index}"]`);
    if (!die) return;

    die.classList.remove('matched');
    die.classList.add('rolling');

    const anim = await loadDieAnimation(die, index, `${value}-cubic`, false);
    if (anim) {
      anim.addEventListener('complete', () => {
        die.classList.remove('rolling');
        if (onComplete) onComplete();
      });
    } else {
      die.classList.remove('rolling');
      if (onComplete) onComplete();
    }
  }

  function setDiceMatched(index, matched) {
    const container = document.getElementById('dice-container');
    if (!container) return;
    const die = container.querySelector(`.dice-item[data-index="${index}"]`);
    if (die) {
      if (matched) {
        die.classList.add('matched');
      } else {
        die.classList.remove('matched');
      }
    }
  }

  function clearDiceInstances() {
    diceLottieInstances.forEach(inst => {
      if (inst) inst.destroy();
    });
    diceLottieInstances = [];

    const diceArea = document.getElementById('dice-area');
    if (diceArea) diceArea.classList.add('hidden');

    const inputCells = document.getElementById('input-cells');
    if (inputCells) inputCells.classList.remove('hidden');

    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) btnSubmit.classList.remove('hidden');
  }

  // ── ОХОТА ЗА ЯЧЕЙКОЙ ───────────────────────────────
  function renderCellHunt(cellCount, onCellClick) {
    document.getElementById('input-cells').classList.add('hidden');
    document.getElementById('btn-submit').classList.add('hidden');
    document.getElementById('input-error').classList.add('hidden');
    const keypad = document.getElementById('virtual-keypad');
    if (keypad) keypad.classList.add('hidden');
    const diceArea = document.getElementById('dice-area');
    if (diceArea) diceArea.classList.add('hidden');
    const cipherArea = document.getElementById('interactive-cipher-area');
    if (cipherArea) cipherArea.classList.add('hidden');

    const area = document.getElementById('cellhunt-area');
    if (area) area.classList.remove('hidden');

    const grid = document.getElementById('cellhunt-grid');
    if (!grid) return;
    grid.innerHTML = '';
    grid.dataset.count = cellCount;

    for (let i = 0; i < cellCount; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cellhunt-cell';
      cell.dataset.index = i;
      cell.innerHTML =
        '<span class="ch-glyph">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="3" y="3" width="18" height="18" rx="4"/>' +
            '<path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-2.5 3"/>' +
            '<circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/>' +
          '</svg>' +
        '</span>' +
        '<span class="ch-num">' + (i + 1) + '</span>';
      cell.addEventListener('click', () => {
        if (cell.classList.contains('dead') || cell.classList.contains('win')) return;
        onCellClick(i);
      });
      grid.appendChild(cell);
    }
  }

  function setCellDead(index) {
    const grid = document.getElementById('cellhunt-grid');
    if (!grid) return;
    const cell = grid.querySelector('.cellhunt-cell[data-index="' + index + '"]');
    if (cell) {
      cell.classList.add('dead');
      const glyph = cell.querySelector('.ch-glyph');
      if (glyph) glyph.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    }
  }

  function setCellWin(index) {
    const grid = document.getElementById('cellhunt-grid');
    if (!grid) return;
    const cell = grid.querySelector('.cellhunt-cell[data-index="' + index + '"]');
    if (cell) {
      cell.classList.add('win');
      const glyph = cell.querySelector('.ch-glyph');
      if (glyph) glyph.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    }
  }

  function clearCellHunt() {
    const area = document.getElementById('cellhunt-area');
    if (area) area.classList.add('hidden');
    const grid = document.getElementById('cellhunt-grid');
    if (grid) grid.innerHTML = '';
    const inputCells = document.getElementById('input-cells');
    if (inputCells) inputCells.classList.remove('hidden');
    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) btnSubmit.classList.remove('hidden');
  }

  function getDiceFaceSvg(value) {
    const dotPositions = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [25, 75], [75, 25], [75, 75]],
      5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
      6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]]
    };
    const dots = dotPositions[value] || [];
    const dotsHtml = dots.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="7" fill="var(--c-bonus)" />`).join('');
    return `
      <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; display: block;">
        <rect x="5" y="5" width="90" height="90" rx="16" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="4" />
        ${dotsHtml}
      </svg>
    `;
  }

  function renderInteractiveCipher(targetDigits, currentDigits, cellCount, onCellClick) {
    document.getElementById('input-cells').classList.add('hidden');
    document.getElementById('btn-submit').classList.add('hidden');
    document.getElementById('input-error').classList.add('hidden');
    const keypad = document.getElementById('virtual-keypad');
    if (keypad) keypad.classList.add('hidden');

    const cipherArea = document.getElementById('interactive-cipher-area');
    if (cipherArea) cipherArea.classList.remove('hidden');

    const targetDisplay = document.getElementById('cipher-target-display');
    if (targetDisplay) {
      targetDisplay.innerHTML = 'ЦЕЛЬ:';
      targetDigits.forEach(digit => {
        const span = document.createElement('div');
        span.className = 'dice-target-digit';
        span.textContent = digit;
        targetDisplay.appendChild(span);
      });
    }

    const container = document.getElementById('cipher-container');
    if (container) {
      container.innerHTML = '';
      for (let i = 0; i < cellCount; i++) {
        const cell = document.createElement('div');
        cell.className = 'cipher-cell';
        cell.dataset.index = i;
        container.appendChild(cell);

        cell.addEventListener('click', () => {
          onCellClick(i);
        });
      }
    }

    updateInteractiveCipherUI(currentDigits, targetDigits, cellCount);
  }

  function updateInteractiveCipherUI(currentDigits, targetDigits, cellCount) {
    const container = document.getElementById('cipher-container');
    if (!container) return;

    for (let i = 0; i < cellCount; i++) {
      const cell = container.querySelector(`.cipher-cell[data-index="${i}"]`);
      if (!cell) continue;

      const val = currentDigits[i];
      cell.textContent = val;

      const correct = val === targetDigits[i];
      cell.classList.toggle('correct', correct);
      cell.classList.toggle('incorrect', !correct);
    }
  }

  function clearCipherInstances() {
    const cipherArea = document.getElementById('interactive-cipher-area');
    if (cipherArea) cipherArea.classList.add('hidden');

    const inputCells = document.getElementById('input-cells');
    if (inputCells) inputCells.classList.remove('hidden');

    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) btnSubmit.classList.remove('hidden');
  }

  function updateNavIndicator() {
    const activeNav = document.querySelector('.nav-item.active');
    const indicator = document.querySelector('.nav-indicator');
    if (activeNav && indicator) {
      indicator.style.width = `${activeNav.offsetWidth}px`;
      indicator.style.transform = `translateX(${activeNav.offsetLeft}px)`;
    }
  }

  function updateShopTabIndicator() {
    const activeTab = document.querySelector('.shop-tab.active');
    const indicator = document.querySelector('.shop-tab-indicator');
    if (activeTab && indicator) {
      indicator.style.width = `${activeTab.offsetWidth}px`;
      indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
    }
  }

  function playElevatorTransition(loadLevelCallback) {
    const levelCard = document.querySelector('.level-card');
    if (!levelCard) {
      loadLevelCallback();
      return;
    }

    const clone = levelCard.cloneNode(true);
    clone.querySelectorAll('input, button').forEach(el => el.disabled = true);

    const rect = levelCard.getBoundingClientRect();
    const parent = levelCard.parentNode;

    clone.style.position = 'absolute';
    clone.style.top = `${levelCard.offsetTop}px`;
    clone.style.left = `${levelCard.offsetLeft}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '5';
    clone.style.pointerEvents = 'none';

    parent.appendChild(clone);

    levelCard.style.transition = 'none';
    levelCard.style.transform = 'translateY(-100vh) scale(0.95)';
    levelCard.style.opacity = '0';

    loadLevelCallback();

    levelCard.offsetHeight;

    const transitionStyle = 'transform 0.65s cubic-bezier(0.45, 0, 0.15, 1), opacity 0.65s cubic-bezier(0.45, 0, 0.15, 1)';
    clone.style.transition = transitionStyle;
    levelCard.style.transition = transitionStyle;

    clone.style.transform = 'translateY(100vh) scale(0.95)';
    clone.style.opacity = '0';

    levelCard.style.transform = 'translateY(0) scale(1)';
    levelCard.style.opacity = '1';

    setTimeout(() => {
      clone.remove();
      levelCard.style.transition = '';
      levelCard.style.transform = '';
      levelCard.style.opacity = '';
    }, 700);
  }

  window.addEventListener('resize', () => {
    updateNavIndicator();
    updateShopTabIndicator();
  });

  return {
    setLevel,
    setAttempts,
    setTimer,
    setLevelTypeBanner,
    clearHistory,
    addHistoryRow,
    showHardcoreFlash,
    showBonusArrows,
    hideBonusArrows,
    showSafeInfo,
    hideSafeInfo,
    startGlitch,
    stopGlitch,
    liftTransition,
    playElevatorTransition,
    showOverlay,
    hideOverlay,
    showWinData,
    showLoseData,
    updateMenuStats,
    updateCoins,
    showToast,
    renderDailyRewards,
    renderShop,
    renderBoosterToolbar,
    resetSpecialModes,
    preLoadDiceAnimations,
    renderDiceLevel,
    rollDie,
    setDiceMatched,
    clearDiceInstances,
    renderCellHunt,
    setCellDead,
    setCellWin,
    clearCellHunt,
    getDiceFaceSvg,
    renderInteractiveCipher,
    updateInteractiveCipherUI,
    clearCipherInstances,
    updateNavIndicator,
    updateShopTabIndicator,
  };
})();
