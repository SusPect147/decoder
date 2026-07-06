
const LEVEL_TYPE = {
  STANDARD:     'standard',
  BONUS:        'bonus',
  HARDCORE:     'hardcore',
  SAFE:         'safe',
  GLITCH:       'glitch',
  DICE_SINGLE:  'dice_single',
  DICE_MULTI:   'dice_multi',
  SHIFT_CIPHER: 'shift_cipher',
  CELL_HUNT:    'cell_hunt',
  FRACTAL:      'fractal',
  VOID_SIGNAL:  'void_signal',
};

// Мягкий онбординг: раньше уровни 1–10 были «экскурсией» по всем механикам
// (dice на 2-м, shift_cipher на 4-м, fractal на 9-м) — новичок тонул.
// Теперь первые 5 уровней — только базовые STANDARD/BONUS, дальше новые типы
// вводятся ПО ОДНОМУ с передышкой из знакомых уровней между ними.
const INTRO_SEQUENCE = [
  LEVEL_TYPE.STANDARD,     // 1 — учимся читать быков и коров
  LEVEL_TYPE.STANDARD,     // 2
  LEVEL_TYPE.BONUS,        // 3 — лёгкая победа, дофамин
  LEVEL_TYPE.STANDARD,     // 4
  LEVEL_TYPE.BONUS,        // 5
  LEVEL_TYPE.DICE_SINGLE,  // 6 — первая экзотика (самая простая)
  LEVEL_TYPE.STANDARD,     // 7
  LEVEL_TYPE.SAFE,         // 8
  LEVEL_TYPE.STANDARD,     // 9
  LEVEL_TYPE.SHIFT_CIPHER, // 10
  LEVEL_TYPE.BONUS,        // 11
  LEVEL_TYPE.DICE_MULTI,   // 12
  LEVEL_TYPE.STANDARD,     // 13
  LEVEL_TYPE.CELL_HUNT,    // 14
  LEVEL_TYPE.SAFE,         // 15
  LEVEL_TYPE.GLITCH,       // 16
  LEVEL_TYPE.STANDARD,     // 17
  LEVEL_TYPE.HARDCORE,     // 18
  LEVEL_TYPE.BONUS,        // 19
  LEVEL_TYPE.FRACTAL,      // 20
  LEVEL_TYPE.STANDARD,     // 21
  LEVEL_TYPE.VOID_SIGNAL,  // 22 — последняя новая механика
];

function generateLevel(levelNum) {
  let type;

  if (levelNum <= INTRO_SEQUENCE.length) {
    type = INTRO_SEQUENCE[levelNum - 1];
  } else {

    const rotation = [
      LEVEL_TYPE.STANDARD,
      LEVEL_TYPE.GLITCH,
      LEVEL_TYPE.HARDCORE,
      LEVEL_TYPE.CELL_HUNT,
      LEVEL_TYPE.BONUS,
      LEVEL_TYPE.SAFE,
      LEVEL_TYPE.DICE_SINGLE,
      LEVEL_TYPE.DICE_MULTI,
      LEVEL_TYPE.SHIFT_CIPHER,
      LEVEL_TYPE.FRACTAL,
      LEVEL_TYPE.VOID_SIGNAL,
    ];
    type = rotation[(levelNum - INTRO_SEQUENCE.length - 1) % rotation.length];
  }

  // Сложность «Охоты за ячейкой» растёт с этажами: больше ячеек, меньше попыток
  const cellHuntTier = Math.max(0, Math.floor((levelNum - 8) / 6));

  let cellCount;
  if (type === LEVEL_TYPE.FRACTAL) {
    cellCount = 4; // Начинается с 4, затем растет по этапам
  } else if (type === LEVEL_TYPE.VOID_SIGNAL) {
    cellCount = 7;
  } else if (type === LEVEL_TYPE.CELL_HUNT) {
    cellCount = Math.min(10, 4 + cellHuntTier);
  } else if (type === LEVEL_TYPE.DICE_SINGLE) {
    cellCount = 1;
  } else if (type === LEVEL_TYPE.DICE_MULTI) {
    cellCount = 4;
  } else if (levelNum <= 3) {
    cellCount = 4;
  } else if (levelNum <= 7) {
    cellCount = 5;
  } else if (levelNum <= 12) {
    cellCount = 6;
  } else if (levelNum <= 18) {
    cellCount = 7;
  } else {
    cellCount = Math.min(10, 7 + Math.floor((levelNum - 18) / 4));
  }

  let maxAttempts;
  if (type === LEVEL_TYPE.FRACTAL) {
    maxAttempts = 15; // Начинается с 15, уменьшается по этапам
  } else if (type === LEVEL_TYPE.VOID_SIGNAL) {
    maxAttempts = 8;
  } else if (type === LEVEL_TYPE.CELL_HUNT) {
    maxAttempts = Math.max(2, Math.ceil(cellCount * 0.75) - cellHuntTier);
  } else if (type === LEVEL_TYPE.DICE_SINGLE) {
    maxAttempts = 15;
  } else if (type === LEVEL_TYPE.DICE_MULTI) {
    maxAttempts = 15;
  } else if (type === LEVEL_TYPE.SHIFT_CIPHER) {
    maxAttempts = 20;
  } else if (type === LEVEL_TYPE.BONUS) {
    maxAttempts = cellCount + 4;
  } else if (type === LEVEL_TYPE.HARDCORE) {
    maxAttempts = Math.max(4, cellCount);
  } else if (type === LEVEL_TYPE.GLITCH) {
    maxAttempts = Math.max(3, Math.ceil(cellCount / 2));
  } else {
    maxAttempts = Math.max(5, cellCount + 6 - Math.floor(levelNum / 4));
  }

  let timeLimit;
  if (type === LEVEL_TYPE.FRACTAL) {
    timeLimit = 45; // Этап 1: 45 сек, затем уменьшается
  } else if (type === LEVEL_TYPE.VOID_SIGNAL) {
    timeLimit = 120; // 2 минуты для полного логического анализа
  } else if (type === LEVEL_TYPE.CELL_HUNT) {
    timeLimit = Math.max(12, 26 - cellHuntTier * 2);
  } else if (type === LEVEL_TYPE.DICE_SINGLE) {
    timeLimit = 30;
  } else if (type === LEVEL_TYPE.DICE_MULTI) {
    timeLimit = 50;
  } else if (type === LEVEL_TYPE.SHIFT_CIPHER) {
    timeLimit = 60;
  } else if (type === LEVEL_TYPE.BONUS) {
    timeLimit = 40;
  } else if (type === LEVEL_TYPE.GLITCH) {
    timeLimit = 50;
  } else {
    timeLimit = Math.max(30, 90 - levelNum * 2);
  }

  let password;
  let shift = 0;
  let encryptedCode = [];
  let fractalStage = 0; // Для фрактального уровня

  if (type === LEVEL_TYPE.FRACTAL) {
    // Фрактальный уровень начинается с 4 ячеек
    password = generatePassword(4);
  } else if (type === LEVEL_TYPE.VOID_SIGNAL) {
    // Пустота и сигнал — 7 ячеек
    password = generatePassword(7);
  } else if (type === LEVEL_TYPE.CELL_HUNT) {
    // password[0] — индекс «живой» ячейки
    password = [randomInt(0, cellCount - 1)];
  } else if (type === LEVEL_TYPE.DICE_SINGLE) {
    password = [randomInt(1, 6)];
  } else if (type === LEVEL_TYPE.DICE_MULTI) {
    password = Array.from({ length: 4 }, () => randomInt(1, 6));
  } else if (type === LEVEL_TYPE.SHIFT_CIPHER) {
    shift = randomInt(1, 4) * (Math.random() < 0.5 ? 1 : -1);
    encryptedCode = Array.from({ length: cellCount }, () => randomInt(0, 9));
    password = encryptedCode.map(val => (val + shift + 10) % 10);
  } else {
    password = generatePassword(cellCount);
  }

  let safeLinks = [];
  if (type === LEVEL_TYPE.SAFE) {
    safeLinks = generateSafeLinks(cellCount);
    for (const link of safeLinks) {
      password[link.to] = (link.sum - password[link.from] + 100) % 10;
    }
    if (isAllSame(password)) {
      password[0] = (password[0] + 1) % 10;
      for (const link of safeLinks) {
        if (link.from === 0) password[link.to] = (link.sum - password[0] + 100) % 10;
      }
    }
  }

  return {
    levelNum,
    type,
    cellCount,
    maxAttempts,
    timeLimit,
    password,
    safeLinks,
    shift,
    encryptedCode,
    fractalStage,
    isFractal: type === LEVEL_TYPE.FRACTAL,
    isVoidSignal: type === LEVEL_TYPE.VOID_SIGNAL,
  };
}

function generatePassword(length) {
  let password;
  do {
    password = Array.from({ length }, () => randomInt(0, 9));
  } while (isAllSame(password));
  return password;
}

function generateSafeLinks(cellCount) {
  const links = [];
  const indices = shuffleArray([...Array(cellCount).keys()]);

  const numLinks = Math.min(2, Math.floor(cellCount / 2));
  for (let i = 0; i < numLinks * 2; i += 2) {
    const sum = randomInt(1, 9);
    links.push({
      from: indices[i],
      to: indices[i + 1],
      delta: -1,
      sum,
    });
  }
  return links;
}

function generateStreamSegment(segmentNum) {
  const type = (segmentNum > 20 && segmentNum % 5 === 0)
    ? LEVEL_TYPE.SHIFT_CIPHER
    : LEVEL_TYPE.STANDARD;

  const cellCount = segmentNum <= 14 ? 4 : segmentNum <= 29 ? 5 : 6;
  const maxAttempts = Math.max(4, 8 - Math.floor(segmentNum / 8));
  const timeLimit = Math.max(18, 40 - segmentNum);

  let password = [], shift = 0, encryptedCode = [];

  if (type === LEVEL_TYPE.SHIFT_CIPHER) {
    shift = randomInt(1, 3) * (Math.random() < 0.5 ? 1 : -1);
    encryptedCode = Array.from({ length: cellCount }, () => randomInt(0, 9));
    password = encryptedCode.map(val => (val + shift + 10) % 10);
  } else {
    password = generatePassword(cellCount);
  }

  return {
    levelNum: segmentNum,
    type,
    cellCount,
    maxAttempts,
    timeLimit,
    password,
    safeLinks: [],
    shift,
    encryptedCode,
  };
}

function generateDiceSegment(segmentNum) {
  // Every 3rd segment (after 2): DICE_MULTI; otherwise DICE_SINGLE
  const type = (segmentNum > 2 && segmentNum % 3 === 0)
    ? LEVEL_TYPE.DICE_MULTI
    : LEVEL_TYPE.DICE_SINGLE;

  const cellCount = type === LEVEL_TYPE.DICE_MULTI ? 4 : 1;
  const maxAttempts = 15;
  const timeLimit = type === LEVEL_TYPE.DICE_MULTI ? 50 : 30;

  const password = type === LEVEL_TYPE.DICE_MULTI
    ? Array.from({ length: 4 }, () => randomInt(1, 6))
    : [randomInt(1, 6)];

  return {
    levelNum: segmentNum,
    type,
    cellCount,
    maxAttempts,
    timeLimit,
    password,
    safeLinks: [],
    shift: 0,
    encryptedCode: [],
  };
}

function getLevelTypeName(type) {
  const names = {
    [LEVEL_TYPE.STANDARD]:     '// СТАНДАРТНОЕ ДЕКОДИРОВАНИЕ',
    [LEVEL_TYPE.BONUS]:        'БОНУСНЫЙ УРОВЕНЬ',
    [LEVEL_TYPE.HARDCORE]:     'ХАРДКОР: СЛЕПОЙ ПОДБОР',
    [LEVEL_TYPE.SAFE]:         'МЕХАНИКА СЕЙФА',
    [LEVEL_TYPE.GLITCH]:       'ГЛИТЧ-СИСТЕМА',
    [LEVEL_TYPE.DICE_SINGLE]:  'КУБИК УДАЧИ',
    [LEVEL_TYPE.DICE_MULTI]:   'КВАРТЕТ КУБИКОВ',
    [LEVEL_TYPE.SHIFT_CIPHER]: 'КРИПТО-СДВИГ',
    [LEVEL_TYPE.CELL_HUNT]:    'ОХОТА ЗА ЯЧЕЙКОЙ',
    [LEVEL_TYPE.FRACTAL]:      '⚡ ФРАКТАЛЬНЫЙ СПУСК',
    [LEVEL_TYPE.VOID_SIGNAL]:  '🕳️ ПУСТОТА И СИГНАЛ',
  };
  return names[type] || '// НЕИЗВЕСТНЫЙ УРОВЕНЬ';
}

function getLevelTypeClass(type) {
  const classes = {
    [LEVEL_TYPE.STANDARD]:     '',
    [LEVEL_TYPE.BONUS]:        'type-bonus',
    [LEVEL_TYPE.HARDCORE]:     'type-hardcore',
    [LEVEL_TYPE.SAFE]:         'type-safe',
    [LEVEL_TYPE.GLITCH]:       'type-glitch',
    [LEVEL_TYPE.DICE_SINGLE]:  'type-bonus',
    [LEVEL_TYPE.DICE_MULTI]:   'type-safe',
    [LEVEL_TYPE.SHIFT_CIPHER]: 'type-glitch',
    [LEVEL_TYPE.CELL_HUNT]:    'type-safe',
    [LEVEL_TYPE.FRACTAL]:      'type-fractal',
    [LEVEL_TYPE.VOID_SIGNAL]:  'type-void',
  };
  return classes[type] || '';
}
