
const InputController = (() => {
  let cellCount   = 4;
  let lockedCells = [];
  let currentDigits = [];
  let safeLinks   = [];
  let linkedToCells = new Set(); // индексы "to"-ячеек сейфа — только для чтения
  let onSubmitCb  = null;
  let levelType   = LEVEL_TYPE.STANDARD;
  let keypadInitialized = false;

  const cellsContainer = document.getElementById('input-cells');
  const errorEl        = document.getElementById('input-error');
  const submitBtn      = document.getElementById('btn-submit');

  function init(config) {
    cellCount    = config.cellCount;
    lockedCells  = new Array(cellCount).fill(false);
    currentDigits = new Array(cellCount).fill(null);
    safeLinks    = config.safeLinks || [];
    levelType    = config.type;
    onSubmitCb   = null;
    // Вычисляем "to"-ячейки: игрок не может вводить в них напрямую
    linkedToCells = new Set(safeLinks.map(l => l.to));

    _renderCells();
    _syncLockedUI(); // применяем safe-linked сразу после рендера
    hideError();
    _initKeypad();
  }

  function onSubmit(cb) {
    onSubmitCb = cb;
  }

  function getDigits() {
    return [...currentDigits];
  }

  function updateLocks(newLocked) {
    lockedCells = [...newLocked];
    _syncLockedUI();
  }

  function clearUnlocked() {
    for (let i = 0; i < cellCount; i++) {
      if (!lockedCells[i]) {
        currentDigits[i] = null;
        const cell = _getCell(i);
        if (cell) {
          cell.querySelector('.cell-value').textContent = '';
          cell.classList.remove('has-value', 'bull', 'cow', 'miss');
        }
      }
    }
    hideError();
    _focusFirstEmpty();
  }

  function showResults(results) {
    for (let i = 0; i < cellCount; i++) {
      const cell = _getCell(i);
      if (!cell) continue;
      cell.classList.remove('bull', 'cow', 'miss');
      cell.classList.add(results[i]);
    }
  }

  function showError(text) {
    errorEl.textContent = text;
    errorEl.classList.remove('hidden');

    cellsContainer.style.animation = 'none';
    cellsContainer.offsetHeight;
    cellsContainer.style.animation = 'shake-cells 0.35s ease';
  }

  function hideError() {
    errorEl.classList.add('hidden');
  }

  function disableSubmit() {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
  }

  function enableSubmit() {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
  }

  function _renderCells() {
    cellsContainer.innerHTML = '';

    for (let i = 0; i < cellCount; i++) {
      const cell = document.createElement('div');
      cell.className = 'input-cell';
      cell.dataset.index = i;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'cell-value';
      valueSpan.textContent = '';

      const input = document.createElement('input');
      input.type = 'text';
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       ('ontouchstart' in window) || 
                       (navigator.maxTouchPoints > 0);
      input.inputMode = isMobile ? 'none' : 'numeric';
      input.maxLength = 4;
      input.autocomplete = 'off';
      input.dataset.index = i;

      const label = document.createElement('span');
      label.className = 'cell-label';
      label.textContent = String.fromCharCode(65 + i);
      cell.appendChild(label);

      cell.appendChild(valueSpan);
      cell.appendChild(input);
      cellsContainer.appendChild(cell);

      input.addEventListener('keydown', (e) => _onKeyDown(e, i));
      input.addEventListener('input',   (e) => _onInput(e, i));
      cell.addEventListener('click', () => {
        if (!lockedCells[i]) input.focus();
      });
    }

    document.addEventListener('keydown', _onGlobalKey);

    setTimeout(() => _focusFirstEmpty(), 100);
  }

  function _onKeyDown(e, idx) {
    if (submitBtn.disabled) { e.preventDefault(); return; }
    if (lockedCells[idx]) { e.preventDefault(); return; }
    if (levelType === LEVEL_TYPE.SAFE && linkedToCells.has(idx)) { e.preventDefault(); return; }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentDigits[idx] !== null) {
        const prevDigitsCopy = [...currentDigits];
        currentDigits[idx] = null;
        _updateCellUI(idx, null);

        if (levelType === LEVEL_TYPE.SAFE && safeLinks.length > 0) {
          const newDigits = applySafeLinks(currentDigits, prevDigitsCopy, idx, safeLinks, lockedCells);
          for (let i = 0; i < cellCount; i++) {
            if (newDigits[i] !== currentDigits[i]) {
              currentDigits[i] = newDigits[i];
              _updateCellUI(i, newDigits[i]);
            }
          }
        }
      } else {
        _focusCell(idx - 1);
      }
    }

    if (e.key === 'ArrowLeft')  { e.preventDefault(); _focusCell(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); _focusCell(idx + 1); }
    if (e.key === 'Enter')      { e.preventDefault(); _submit(); }
  }

  function _onInput(e, idx) {
    if (submitBtn.disabled) { e.target.value = ''; return; }
    if (lockedCells[idx]) { e.target.value = ''; return; }
    if (levelType === LEVEL_TYPE.SAFE && linkedToCells.has(idx)) { e.target.value = ''; return; }

    const raw = e.target.value.replace(/\D/g, '');
    e.target.value = '';

    if (!raw) return;

    if (raw.length > 1) {
      _distributeDigits(raw, idx);
    } else {
      const prevDigitsCopy = [...currentDigits];
      const digit = parseInt(raw[0]);
      currentDigits[idx] = digit;
      _updateCellUI(idx, digit);

      if (levelType === LEVEL_TYPE.SAFE && safeLinks.length > 0) {
        const newDigits = applySafeLinks(currentDigits, prevDigitsCopy, idx, safeLinks, lockedCells);
        for (let i = 0; i < cellCount; i++) {
          if (newDigits[i] !== currentDigits[i]) {
            currentDigits[i] = newDigits[i];
            _updateCellUI(i, newDigits[i]);
          }
        }
      }

      _focusNextEmpty(idx);
    }

    hideError();
  }

  function _distributeDigits(str, startIdx) {
    let pos = startIdx;
    for (let i = 0; i < str.length && pos < cellCount; i++) {
      if (!lockedCells[pos]) {
        const digit = parseInt(str[i]);
        currentDigits[pos] = digit;
        _updateCellUI(pos, digit);
      }
      pos++;
    }

    _focusNextEmpty(startIdx + str.length - 1);
  }

  function _updateCellUI(idx, value) {
    const cell = _getCell(idx);
    if (!cell) return;
    const span = cell.querySelector('.cell-value');
    span.textContent = value !== null ? value : '';
    cell.classList.toggle('has-value', value !== null);
  }

  function _syncLockedUI() {
    for (let i = 0; i < cellCount; i++) {
      const cell = _getCell(i);
      if (!cell) continue;
      if (lockedCells[i]) {
        cell.classList.add('locked');
        cell.querySelector('input').disabled = true;
      }
      // Ячейки-"to" сейфа — помечаем как авто-управляемые
      if (levelType === LEVEL_TYPE.SAFE && linkedToCells.has(i)) {
        cell.classList.add('safe-linked');
        cell.querySelector('input').disabled = true;
      }
    }
  }

  function _focusFirstEmpty() {
    for (let i = 0; i < cellCount; i++) {
      if (!lockedCells[i] && currentDigits[i] === null) {
        _focusCell(i);
        return;
      }
    }
  }

  function _focusNextEmpty(fromIdx) {
    for (let i = fromIdx + 1; i < cellCount; i++) {
      if (!lockedCells[i] && currentDigits[i] === null) {
        _focusCell(i);
        return;
      }
    }
  }

  function _focusCell(idx) {
    if (idx < 0 || idx >= cellCount) return;
    if (lockedCells[idx]) return;
    const cell = _getCell(idx);
    if (cell) cell.querySelector('input').focus();
  }

  function _getCell(idx) {
    return cellsContainer.querySelector(`.input-cell[data-index="${idx}"]`);
  }

  function _onGlobalKey(e) {
    if (submitBtn.disabled) return;
    const gameScreen = document.getElementById('screen-game');
    if (!gameScreen || !gameScreen.classList.contains('screen--active')) return;

    // Не перехватываем клавиши при открытых оверлеях (победа / поражение)
    const winOv  = document.getElementById('screen-level-win');
    const loseOv = document.getElementById('screen-game-over');
    if ((winOv  && !winOv.classList.contains('hidden')) ||
        (loseOv && !loseOv.classList.contains('hidden'))) return;

    const activeEl  = document.activeElement;
    const isOnCell  = activeEl && activeEl.tagName === 'INPUT' && activeEl.closest('#input-cells');

    if (e.key === 'Enter') {
      e.preventDefault();
      _submit();
      return;
    }

    // Tab / Shift+Tab — переключение между ячейками
    if (e.key === 'Tab') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      if (isOnCell) {
        _focusCellDir(parseInt(activeEl.dataset.index), dir);
      } else {
        dir === 1 ? _focusFirstEmpty() : _focusLastUnlocked();
      }
      return;
    }

    // Цифры 0–9 — ввод без ручного фокуса ячейки
    if (/^[0-9]$/.test(e.key) && !isOnCell) {
      e.preventDefault();
      _inputDigitGlobal(parseInt(e.key));
      return;
    }

    // Backspace — стереть последнюю введённую цифру
    if (e.key === 'Backspace' && !isOnCell) {
      e.preventDefault();
      _backspaceLastFilled();
      return;
    }
  }

  // Перемещение фокуса в направлении dir (+1 / -1), пропуская заблокированные
  function _focusCellDir(fromIdx, dir) {
    let next = fromIdx + dir;
    while (next >= 0 && next < cellCount) {
      if (!lockedCells[next] && !(levelType === LEVEL_TYPE.SAFE && linkedToCells.has(next))) {
        _focusCell(next);
        return;
      }
      next += dir;
    }
  }

  // Фокус на последней незаблокированной ячейке (Shift+Tab когда ничего не в фокусе)
  function _focusLastUnlocked() {
    for (let i = cellCount - 1; i >= 0; i--) {
      if (!lockedCells[i] && !(levelType === LEVEL_TYPE.SAFE && linkedToCells.has(i))) {
        _focusCell(i);
        return;
      }
    }
  }

  // Ввод цифры без предварительного клика по ячейке
  function _inputDigitGlobal(digit) {
    _focusFirstEmpty();
    const newActive = document.activeElement;
    if (!newActive || newActive.tagName !== 'INPUT' || !newActive.closest('#input-cells')) return;
    const idx = parseInt(newActive.dataset.index);
    if (lockedCells[idx]) return;
    if (levelType === LEVEL_TYPE.SAFE && linkedToCells.has(idx)) return;

    const prevDigitsCopy = [...currentDigits];
    currentDigits[idx] = digit;
    _updateCellUI(idx, digit);

    if (levelType === LEVEL_TYPE.SAFE && safeLinks.length > 0) {
      const newDigits = applySafeLinks(currentDigits, prevDigitsCopy, idx, safeLinks, lockedCells);
      for (let i = 0; i < cellCount; i++) {
        if (newDigits[i] !== currentDigits[i]) {
          currentDigits[i] = newDigits[i];
          _updateCellUI(i, newDigits[i]);
        }
      }
    }
    _focusNextEmpty(idx);
    hideError();
  }

  // Стереть последнюю введённую цифру (Backspace глобально)
  function _backspaceLastFilled() {
    for (let i = cellCount - 1; i >= 0; i--) {
      if (!lockedCells[i] && !(levelType === LEVEL_TYPE.SAFE && linkedToCells.has(i)) && currentDigits[i] !== null) {
        _focusCell(i);
        const prevDigitsCopy = [...currentDigits];
        currentDigits[i] = null;
        _updateCellUI(i, null);
        if (levelType === LEVEL_TYPE.SAFE && safeLinks.length > 0) {
          const newDigits = applySafeLinks(currentDigits, prevDigitsCopy, i, safeLinks, lockedCells);
          for (let j = 0; j < cellCount; j++) {
            if (newDigits[j] !== currentDigits[j]) {
              currentDigits[j] = newDigits[j];
              _updateCellUI(j, newDigits[j]);
            }
          }
        }
        break;
      }
    }
    hideError();
  }

  function _submit() {
    if (onSubmitCb) onSubmitCb(getDigits());
  }

  function setDigit(idx, digit) {
    if (idx < 0 || idx >= cellCount) return;
    currentDigits[idx] = digit;
    _updateCellUI(idx, digit);
  }

  function _initKeypad() {
    const keypad = document.getElementById('virtual-keypad');
    if (!keypad) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     ('ontouchstart' in window) || 
                     (navigator.maxTouchPoints > 0);

    if (!isMobile) {
      keypad.classList.add('hidden');
      return;
    }

    keypad.classList.remove('hidden');

    if (keypadInitialized) return;
    keypadInitialized = true;

    
    keypad.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.keypad-btn');
      if (!btn) return;
      e.preventDefault(); 

      if (submitBtn.disabled) return;

      if (window.WebApp && window.WebApp.HapticFeedback) {
        try { window.WebApp.HapticFeedback.impactOccurred('light'); } catch(e) {}
      }

      const key = btn.dataset.key;
      if (key === 'clear') {
        clearUnlocked();
      } else if (key === 'backspace') {
        _handleVirtualBackspace();
      } else {
        const val = parseInt(key);
        _handleVirtualDigit(val);
      }
    });
  }

  function _handleVirtualDigit(digit) {
    const activeInput = document.activeElement;
    if (!activeInput || activeInput.tagName !== 'INPUT' || !activeInput.closest('#input-cells')) {
      _focusFirstEmpty();
      return;
    }
    const idx = parseInt(activeInput.dataset.index);
    if (lockedCells[idx]) return;
    if (levelType === LEVEL_TYPE.SAFE && linkedToCells.has(idx)) return;

    const prevDigitsCopy = [...currentDigits];
    currentDigits[idx] = digit;
    _updateCellUI(idx, digit);

    if (levelType === LEVEL_TYPE.SAFE && safeLinks.length > 0) {
      const newDigits = applySafeLinks(currentDigits, prevDigitsCopy, idx, safeLinks, lockedCells);
      for (let i = 0; i < cellCount; i++) {
        if (newDigits[i] !== currentDigits[i]) {
          currentDigits[i] = newDigits[i];
          _updateCellUI(i, newDigits[i]);
        }
      }
    }

    _focusNextEmpty(idx);
    hideError();
  }

  function _handleVirtualBackspace() {
    const activeInput = document.activeElement;
    if (!activeInput || activeInput.tagName !== 'INPUT' || !activeInput.closest('#input-cells')) {
      return;
    }
    const idx = parseInt(activeInput.dataset.index);
    if (lockedCells[idx]) return;

    if (currentDigits[idx] !== null) {
      const prevDigitsCopy = [...currentDigits];
      currentDigits[idx] = null;
      _updateCellUI(idx, null);

      if (levelType === LEVEL_TYPE.SAFE && safeLinks.length > 0) {
        const newDigits = applySafeLinks(currentDigits, prevDigitsCopy, idx, safeLinks, lockedCells);
        for (let i = 0; i < cellCount; i++) {
          if (newDigits[i] !== currentDigits[i]) {
            currentDigits[i] = newDigits[i];
            _updateCellUI(i, newDigits[i]);
          }
        }
      }
    } else {
      _focusCell(idx - 1);
    }
    hideError();
  }


  return {
    init,
    onSubmit,
    getDigits,
    updateLocks,
    clearUnlocked,
    showResults,
    showError,
    hideError,
    disableSubmit,
    enableSubmit,
    setDigit,
  };
})();
