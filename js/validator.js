
function checkGuess(guess, password) {
  const len = password.length;
  const results = new Array(len).fill('miss');

  const pwCount    = {};
  const guessCount = {};

  for (let i = 0; i < len; i++) {
    if (guess[i] === password[i]) {
      results[i] = 'bull';
    } else {

      pwCount[password[i]]    = (pwCount[password[i]]    || 0) + 1;
      guessCount[guess[i]]    = (guessCount[guess[i]]    || 0) + 1;
    }
  }

  for (let i = 0; i < len; i++) {
    if (results[i] !== 'bull') {
      const digit = guess[i];
      if (pwCount[digit] && pwCount[digit] > 0) {
        results[i] = 'cow';
        pwCount[digit]--;
      }
    }
  }

  const bulls = results.filter(r => r === 'bull').length;
  const cows  = results.filter(r => r === 'cow').length;

  return { bulls, cows, results };
}

function applyLocks(lockedCells, results) {
  return lockedCells.map((locked, i) => locked || results[i] === 'bull');
}

function validateInput(digits) {

  if (digits.some(d => d === null || d === undefined || d === '')) {
    return { valid: false, reason: 'Заполни все ячейки перед проверкой' };
  }

  if (isAllSame(digits.map(Number))) {
    return { valid: false, reason: 'Нельзя вводить одинаковые цифры в попытке' };
  }

  return { valid: true, reason: '' };
}

function applySafeLinks(digits, prevDigits, changedIdx, safeLinks, locked) {
  const result = [...digits];

  for (const link of safeLinks) {
    if (link.from === changedIdx && !locked[link.to]) {
      const newVal = digits[changedIdx];
      if (newVal === null) {
        result[link.to] = null;
      } else {
        // Абсолютная формула: to = (sum - from + 10) % 10
        // Это гарантирует детерминированное значение "to" при любом "from",
        // без зависимости от предыдущих значений. Убирает баг замены цифры.
        result[link.to] = (link.sum - newVal + 100) % 10;
      }
    }
  }

  return result;
}
