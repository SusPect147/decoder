import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 90-дневный календарь наград — ДОЛЖЕН совпадать с DAILY_REWARDS в js/gameManager.js
const DAILY_REWARDS = [
  10, 20, 30, 50, 80, 120, 200,
  15, 25, 40, 60, 100, 150, 250,
  20, 35, 55, 80, 130, 200, 320,
  30, 50, 75, 110, 170, 250, 400,
  40, 65, 100, 145, 220, 330, 500,
  55, 85, 130, 190, 280, 420, 650,
  70, 110, 165, 240, 360, 540, 800,
  90, 140, 210, 300, 450, 680, 1000,
  110, 170, 260, 370, 560, 840, 1200,
  130, 200, 310, 450, 680, 1000, 1500,
  160, 250, 380, 550, 820, 1200, 1800,
  200, 300, 450, 660, 1000, 1500, 2200,
  250, 380, 560, 820, 1200, 2000
];
const DAILY_CYCLE = DAILY_REWARDS.length; // 90
// Жирная награда за взлом «Пароля дня» (раз в сутки). Должна совпадать с клиентом.
const DAILY_PW_REWARD = 1000;

// Детерминированный пароль дня по UTC-дате — копия логики из functions/daily-password.
function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function getDailyPassword(dateStr: string): number[] {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  const digits: number[] = [];
  let seed = hash;
  while (digits.length < 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const d = seed % 10;
    if (!digits.includes(d)) digits.push(d);
  }
  return digits;
}
// Возвращает размер премии за «Пароль дня», который разрешено добавить к балансу
// в ЭТОМ сохранении. Защита: реальная победа (совпадение с паролем) + раз в сутки.
function computeDailyPwAllowance(gameData: any, existingGameData: any): number {
  const today = getTodayStr();
  const claimsToday = gameData?.decoder_daily_pw_reward_date === today;
  if (!claimsToday) return 0;
  const alreadyRewarded = existingGameData?.decoder_daily_pw_reward_date === today;
  if (alreadyRewarded) return 0; // премия уже учтена в прошлом сохранении
  const pw = gameData?.decoder_daily_pw;
  if (!pw || pw.date !== today || pw.won !== true || !Array.isArray(pw.rows)) {
    // Клиент заявил награду без валидной победы — снимаем флаг, премию не даём.
    if (gameData) gameData.decoder_daily_pw_reward_date = existingGameData?.decoder_daily_pw_reward_date || 0;
    return 0;
  }
  const password = getDailyPassword(today);
  const realWin = pw.rows.some((r: any) =>
    Array.isArray(r?.guess) && r.guess.length === 4 &&
    r.guess.every((d: number, i: number) => d === password[i]));
  if (!realWin) {
    if (gameData) gameData.decoder_daily_pw_reward_date = existingGameData?.decoder_daily_pw_reward_date || 0;
    return 0;
  }
  return DAILY_PW_REWARD;
}
const VALID_PROMO_CODES: Record<string, number> = {
  "MAX_BIZ": 150,
  "DECODER_PRO": 250,
  "SECRET_HACK": 500,
  "НАЧАЛО": 250
};
const REFERRALS_REWARDS: Record<number, number> = {
  1: 500,
  3: 1500,
  5: 3000,
  7: 5000,
  10: 8000,
  15: 14000,
  20: 22000
};
const STORE_ITEMS_TITLES: Record<string, number> = {
  "title_1": 0,
  "title_2": 200,
  "title_3": 500,
  "title_4": 1000,
  "title_5": 0
};

function validateTaskAndGetReward(task: string, gameData: any, actualFriendsCount: number): number {
  if (task.startsWith("code_")) {
    const code = task.replace("code_", "").toUpperCase();
    if (!(code in VALID_PROMO_CODES)) {
      throw new Error(`Cheating detected: Invalid promo code "${code}"`);
    }
    return VALID_PROMO_CODES[code];
  }

  if (task === "sub") {
    return 150;
  }

  if (task.startsWith("ref_milestone_")) {
    const target = Number(task.replace("ref_milestone_", ""));
    if (isNaN(target) || !(target in REFERRALS_REWARDS)) {
      throw new Error(`Cheating detected: Invalid referral milestone "${task}"`);
    }
    if (actualFriendsCount < target) {
      throw new Error(`Cheating detected: Milestone requires ${target} friends, but you only have ${actualFriendsCount} in the database.`);
    }
    return REFERRALS_REWARDS[target];
  }

  if (task.startsWith("prog_")) {
    const parts = task.split("_");
    if (parts.length !== 4 || parts[0] !== "prog" || parts[2] !== "stage") {
      throw new Error(`Cheating detected: Invalid progression task format "${task}"`);
    }
    const cat = parts[1];
    const stageIndex = Number(parts[3]);
    const validCats = ["safe", "bonus", "glitch", "cipher", "dice", "hardcore", "stream", "dicehell", "campaign"];
    if (!validCats.includes(cat) || isNaN(stageIndex) || stageIndex < 0 || stageIndex > 29) {
      throw new Error(`Cheating detected: Invalid progression task category or stage "${task}"`);
    }
    const requiredClears = [
      1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 65, 80, 100,
      125, 155, 190, 230, 280, 340, 410, 490, 590, 710, 860, 1060, 1310, 1610, 2010
    ];
    const rewardCoins = [
      20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
      1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
    ];
    const clearsStatKey = cat === "cipher" ? "cipher_clears" : (cat === "dice" ? "dice_clears" : `${cat}_clears`);
    let actualClears = gameData.decoder_stats?.[clearsStatKey] || 0;
    // Кампания «Протокол» имеет жёсткий потолок 100 уровней — отсекаем накрутку.
    if (cat === "campaign" && actualClears > 100) actualClears = 100;
    if (actualClears < requiredClears[stageIndex]) {
      throw new Error(`Cheating detected: Progression task "${task}" requires ${requiredClears[stageIndex]} clears, but you only have ${actualClears}.`);
    }
    return rewardCoins[stageIndex];
  }

  throw new Error(`Cheating detected: Unknown task ID "${task}"`);
}

function getMinSolveTimeForLevel(levelNum: number): number {
  const type = getLevelType(levelNum);
  const cellCount = getCellCount(levelNum, type);
  // Extremely safe minimum time (seconds) allowing for booster hints, quick clicks, and dice rolls.
  // A human needs at least 0.15 seconds per cell, with a floor of 0.3 seconds.
  return Math.max(0.3, cellCount * 0.15);
}

function getLevelType(levelNum: number): string {
  if (levelNum === 1) return "standard";
  if (levelNum === 2) return "dice_single";
  if (levelNum === 3) return "standard";
  if (levelNum === 4) return "shift_cipher";
  if (levelNum === 5) return "bonus";
  if (levelNum === 6) return "dice_multi";
  if (levelNum === 7) return "safe";
  if (levelNum === 8) return "cell_hunt";
  if (levelNum === 9) return "fractal";
  if (levelNum === 10) return "void_signal";
  const rotation = ["standard", "glitch", "hardcore", "cell_hunt", "bonus", "safe", "dice_single", "dice_multi", "shift_cipher", "fractal", "void_signal"];
  return rotation[(levelNum - 11) % rotation.length];
}

function getCellCount(levelNum: number, type: string): number {
  if (type === "dice_single") return 1;
  if (type === "dice_multi") return 4;
  if (type === "fractal") return 4;
  if (type === "void_signal") return 7;
  if (type === "cell_hunt") return Math.min(10, 4 + Math.max(0, Math.floor((levelNum - 8) / 6)));
  if (levelNum <= 3) return 4;
  if (levelNum <= 7) return 5;
  if (levelNum <= 12) return 6;
  if (levelNum <= 18) return 7;
  return Math.min(10, 7 + Math.floor((levelNum - 18) / 4));
}

function getMaxAttemptsForLevel(levelNum: number, type: string, cellCount: number): number {
  if (type === "dice_single") return 15;
  if (type === "dice_multi") return 20;
  if (type === "shift_cipher") return 20;
  if (type === "bonus") return cellCount + 4;
  if (type === "hardcore") return Math.max(4, cellCount);
  if (type === "glitch") return Math.max(3, Math.ceil(cellCount / 2));
  if (type === "fractal") return 15;
  if (type === "void_signal") return 8;
  if (type === "cell_hunt") return Math.max(2, Math.ceil(cellCount * 0.75) - Math.max(0, Math.floor((levelNum - 8) / 6)));
  return Math.max(5, cellCount + 6 - Math.floor(levelNum / 4));
}

function getTimeLimitForLevel(levelNum: number, type: string): number {
  if (type === "dice_single") return 30;
  if (type === "dice_multi") return 50;
  if (type === "shift_cipher") return 60;
  if (type === "bonus") return 40;
  if (type === "glitch") return 50;
  if (type === "fractal") return 45;
  if (type === "void_signal") return 120;
  if (type === "cell_hunt") return Math.max(12, 26 - Math.max(0, Math.floor((levelNum - 8) / 6)) * 2);
  return Math.max(30, 90 - levelNum * 2);
}

function getMaxPossibleScoreForLevel(L: number): number {
  const type = getLevelType(L);
  const cellCount = getCellCount(L, type);
  const maxAttempts = getMaxAttemptsForLevel(L, type, cellCount);
  const timeLimit = getTimeLimitForLevel(L, type);

  const maxAttemptsWithTheme = maxAttempts + 1;
  const maxTimeWithTheme = timeLimit + 15;

  const timeBonus = maxTimeWithTheme * 10;
  const attemptBonus = (maxAttemptsWithTheme + 1) * 50;
  const levelBonus = L * 100;

  return timeBonus + attemptBonus + levelBonus;
}

function getMaxPossibleCoinsForLevel(L: number): number {
  if (L < 2) return 0;
  const type = getLevelType(L);
  const baseReward = 10;
  const levelFactor = L * 5;
  const difficultyMultipliers: Record<string, number> = {
    standard: 1.0,
    bonus: 1.2,
    glitch: 1.4,
    safe: 1.6,
    hardcore: 2.0,
    dice_single: 1.3,
    dice_multi: 1.5,
    shift_cipher: 1.4,
    cell_hunt: 1.5,
    fractal: 2.5,
    void_signal: 3.0
  };
  const multiplier = difficultyMultipliers[type] || 1.0;

  const themeMultiplier = 1.40;

  return Math.floor(Math.floor((baseReward + levelFactor) * multiplier) * themeMultiplier);
}

function calculateCumulativeMaxScore(levels: number): number {
  let sum = 0;
  for (let i = 1; i <= levels; i++) {
    sum += getMaxPossibleScoreForLevel(i);
  }
  return sum;
}

function calculateCumulativeMaxCoins(levels: number): number {
  let sum = 0;
  for (let i = 1; i <= levels; i++) {
    sum += getMaxPossibleCoinsForLevel(i);
  }
  return sum;
}

async function hmacSha256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? encoder.encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function validateInitData(initData: string, botToken: string): Promise<any> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Missing hash parameter");

  const authDate = Number(params.get("auth_date") || 0);
  const now = Math.floor(Date.now() / 1000);
  
  if (authDate <= 0 || now - authDate > 86400 || authDate > now + 300) {
    throw new Error("InitData session has expired or is invalid");
  }

  const keys = Array.from(params.keys()).filter((k) => k !== "hash").sort();
  const dataCheckString = keys.map((k) => `${k}=${params.get(k)}`).join("\n");

  const secretKey = await hmacSha256("WebAppData", botToken);
  
  const computedHashBytes = await hmacSha256(secretKey, dataCheckString);
  const computedHash = hex(computedHashBytes);

  if (computedHash.toLowerCase() !== hash.toLowerCase()) {
    throw new Error("Invalid signature: hash mismatch.");
  }

  const userParam = params.get("user");
  if (!userParam) throw new Error("Missing user parameter");
  return JSON.parse(userParam);
}

function validateTypes(score: any, gameData: any): void {
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0) {
    throw new Error("Invalid type: 'score' must be a non-negative integer");
  }

  if (typeof gameData !== "object" || gameData === null) {
    throw new Error("Invalid type: 'gameData' must be a non-null object");
  }

  if (typeof gameData.decoder_coins !== "number" || !Number.isInteger(gameData.decoder_coins) || gameData.decoder_coins < 0) {
    throw new Error("Invalid type: 'decoder_coins' must be a non-negative integer");
  }

  if (typeof gameData.decoder_best !== "number" || !Number.isInteger(gameData.decoder_best) || gameData.decoder_best < 0) {
    throw new Error("Invalid type: 'decoder_best' must be a non-negative integer");
  }

  if (typeof gameData.decoder_levels !== "number" || !Number.isInteger(gameData.decoder_levels) || gameData.decoder_levels < 0) {
    throw new Error("Invalid type: 'decoder_levels' must be a non-negative integer");
  }

  if (typeof gameData.decoder_daily_streak !== "number" || !Number.isInteger(gameData.decoder_daily_streak) || gameData.decoder_daily_streak < 0) {
    throw new Error("Invalid type: 'decoder_daily_streak' must be a non-negative integer");
  }

  if (typeof gameData.decoder_daily_last_claim !== "number" || !Number.isInteger(gameData.decoder_daily_last_claim) || gameData.decoder_daily_last_claim < 0) {
    throw new Error("Invalid type: 'decoder_daily_last_claim' must be a non-negative integer");
  }

  if (!Array.isArray(gameData.decoder_completed_tasks)) {
    throw new Error("Invalid type: 'decoder_completed_tasks' must be an array");
  }
  for (const t of gameData.decoder_completed_tasks) {
    if (typeof t !== "string") {
      throw new Error("Invalid type: every task ID in 'decoder_completed_tasks' must be a string");
    }
  }

  const boosters = gameData.decoder_boosters;
  if (typeof boosters !== "object" || boosters === null) {
    throw new Error("Invalid type: 'decoder_boosters' must be a non-null object");
  }
  const boosterKeys = ["time", "attempts", "hint"];
  for (const k of boosterKeys) {
    const val = boosters[k];
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0) {
      throw new Error(`Invalid type: booster '${k}' must be a non-negative integer`);
    }
  }

  const stats = gameData.decoder_stats;
  if (typeof stats !== "object" || stats === null) {
    throw new Error("Invalid type: 'decoder_stats' must be a non-null object");
  }
  const statKeys = ["safe_clears", "bonus_clears", "glitch_clears", "cipher_clears", "dice_clears", "hardcore_clears", "fractal_clears", "void_signal_clears"];
  for (const k of statKeys) {
    const val = stats[k];
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0) {
      throw new Error(`Invalid type: stat '${k}' must be a non-negative integer`);
    }
  }

  if (gameData.decoder_last_level_clear_time !== undefined && gameData.decoder_last_level_clear_time !== null) {
    if (typeof gameData.decoder_last_level_clear_time !== "number" || gameData.decoder_last_level_clear_time < 0) {
      throw new Error("Invalid type: 'decoder_last_level_clear_time' must be a non-negative number");
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 405,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const botToken = Deno.env.get("BOT_TOKEN");

    if (!supabaseUrl || !serviceRoleKey || !botToken) {
      throw new Error("Server configuration missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or BOT_TOKEN is not set)");
    }

    const requestBody = await req.json();
    const { initData, score, gameData, levelCleared } = requestBody;

    const tgUser = await validateInitData(initData, botToken);
    const userId = tgUser.id.toString();

    validateTypes(score, gameData);

    if (levelCleared !== undefined && levelCleared !== null) {
      if (typeof levelCleared !== "number" || !Number.isInteger(levelCleared) || levelCleared < 1) {
        throw new Error("Invalid levelCleared parameter");
      }
    }

    if (JSON.stringify(gameData).length > 50000) {
      throw new Error("gameData too large (exceeds 50KB)");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Параллельно: загружаем существующий профиль и считаем рефералов.
    // Раньше это были два последовательных await; запараллеливание экономит один round-trip.
    const [existingResult, friendsResult] = await Promise.all([
      supabaseAdmin
        .from("leaderboard")
        .select("score, game_data, updated_at")
        .eq("user_id", userId)
        .single(),
      supabaseAdmin
        .from("leaderboard")
        .select("user_id", { count: "exact", head: true })
        .eq("game_data->>referred_by", userId)
    ]);

    const { data: existing, error: fetchError } = existingResult;
    const { count: friendsCount, error: countError } = friendsResult;

    if (fetchError && fetchError.code !== "PGRST116" && !fetchError.message?.includes("0 rows")) {
      throw new Error(`Failed to fetch profile: ${fetchError.message}`);
    }

    if (countError) {
      throw new Error(`Failed to fetch friends count: ${countError.message}`);
    }

    const actualFriendsCount = friendsCount || 0;

    if (existing) {
      const createdAt = existing.game_data?.created_at
        ? Number(existing.game_data.created_at)
        : (existing.updated_at ? new Date(existing.updated_at).getTime() : Date.now());

      const oldScore = existing.score || 0;
      const oldCoins = existing.game_data?.decoder_coins || 0;
      const oldLevels = existing.game_data?.decoder_levels || 0;

      const newCoins = gameData.decoder_coins || 0;
      const newLevels = gameData.decoder_levels || 0;

      if (score < oldScore) {
        throw new Error("Score cannot decrease");
      }

      if (newLevels < oldLevels) {
        throw new Error("Levels cleared cannot decrease");
      }

      const levelIncrease = newLevels - oldLevels;

      if (levelCleared !== undefined && levelCleared !== null) {
        const oldClearTime = existing.game_data?.decoder_last_level_clear_time || 0;
        const newClearTime = gameData.decoder_last_level_clear_time || 0;
        if (newClearTime > Date.now() + 5000) {
          throw new Error("Cheating detected: last level clear time is in the future");
        }
        const elapsedSeconds = (newClearTime - oldClearTime) / 1000 + 0.5;
        const minTimeRequired = getMinSolveTimeForLevel(levelCleared);
        if (elapsedSeconds < minTimeRequired) {
          throw new Error(`Cheating detected: level completed too fast. Required: ${minTimeRequired.toFixed(1)}s, elapsed: ${elapsedSeconds.toFixed(1)}s`);
        }
      } else if (levelIncrease > 0) {
        let minTimeRequired = 0;
        for (let i = oldLevels + 1; i <= newLevels; i++) {
          minTimeRequired += getMinSolveTimeForLevel(i);
        }
        const lastUpdate = existing.updated_at ? new Date(existing.updated_at).getTime() : Date.now();
        const elapsedSeconds = (Date.now() - lastUpdate) / 1000 + 0.5;
        if (elapsedSeconds < minTimeRequired) {
          throw new Error(`Cheating detected: levels completed too fast. Required: ${minTimeRequired.toFixed(1)}s, elapsed: ${elapsedSeconds.toFixed(1)}s`);
        }
      }

      let maxScoreIncrease = 0;
      if (levelCleared !== undefined && levelCleared !== null) {
        maxScoreIncrease = getMaxPossibleScoreForLevel(levelCleared);
      } else if (levelIncrease > 0) {
        for (let i = oldLevels + 1; i <= newLevels; i++) {
          maxScoreIncrease += getMaxPossibleScoreForLevel(i);
        }
      }

      if (score - oldScore > maxScoreIncrease) {
        throw new Error(`Cheating detected: score increment too high (Max allowed: ${maxScoreIncrease})`);
      }

      if (levelCleared === undefined || levelCleared === null) {
        if (levelIncrease === 0 && score > oldScore) {
          throw new Error("Cheating detected: score cannot increase without clearing a level");
        }
      }

      const absoluteMaxScore = calculateCumulativeMaxScore(newLevels);
      if (score > absoluteMaxScore) {
        throw new Error(`Cheating detected: score exceeds absolute mathematical limit of ${absoluteMaxScore}`);
      }

      const oldStats = existing.game_data?.decoder_stats || {};
      const newStats = gameData.decoder_stats || {};
      let statsIncrementSum = 0;
      const statKeys = ["safe_clears", "bonus_clears", "glitch_clears", "cipher_clears", "dice_clears", "hardcore_clears", "fractal_clears", "void_signal_clears"];
      for (const k of statKeys) {
        const oldVal = oldStats[k] || 0;
        const newVal = newStats[k] || 0;
        if (newVal < oldVal) {
          throw new Error(`Stat '${k}' cannot decrease`);
        }
        statsIncrementSum += newVal - oldVal;
      }

      if (levelCleared !== undefined && levelCleared !== null) {
        if (statsIncrementSum > 1) {
          throw new Error(`Cheating detected: stats increment too high (${statsIncrementSum})`);
        }
      } else if (levelIncrease > 0) {
        if (statsIncrementSum > levelIncrease) {
          throw new Error(`Cheating detected: stats increment (${statsIncrementSum}) is greater than level increment (${levelIncrease})`);
        }
      } else {
        if (statsIncrementSum > 0) {
          throw new Error(`Cheating detected: stats cannot increase without completing a level`);
        }
      }

      const oldThemes = existing.game_data?.decoder_unlocked_themes || ['default'];
      const newThemes = gameData.decoder_unlocked_themes || ['default'];
      const addedThemes = newThemes.filter((t: string) => !oldThemes.includes(t));
      if (addedThemes.length > 0) {
        throw new Error("Cheating detected: premium themes cannot be unlocked by client");
      }
      // Сервер — источник истины по купленным способностям: если клиент прислал
      // устаревший список (например, покупка через Robokassa прошла, пока клиент
      // был открыт), купленные темы не должны потеряться при этом сохранении.
      gameData.decoder_unlocked_themes = oldThemes;

      const oldTasks = existing.game_data?.decoder_completed_tasks || [];
      const newTasks = gameData.decoder_completed_tasks || [];
      const addedTasks = newTasks.filter((t: string) => !oldTasks.includes(t));

      let taskCoinsEarned = 0;
      for (const task of addedTasks) {
        taskCoinsEarned += validateTaskAndGetReward(task, gameData, actualFriendsCount);
      }

      let dailyCoinsEarned = 0;
      if (gameData.decoder_daily_last_claim !== (existing.game_data?.decoder_daily_last_claim || 0)) {
        const lastClaim = gameData.decoder_daily_last_claim;
        const oldClaim = existing.game_data?.decoder_daily_last_claim || 0;
        if (oldClaim > 0 && lastClaim - oldClaim < 86100) {
          throw new Error("Cheating detected: Daily reward claimed too early");
        }

        const oldStreak = existing.game_data?.decoder_daily_streak || 0;
        const newStreak = gameData.decoder_daily_streak || 1;
        if (newStreak !== (oldStreak % DAILY_CYCLE) + 1 && newStreak !== 1) {
          throw new Error("Cheating detected: Invalid daily streak progression");
        }

        const streak = gameData.decoder_daily_streak || 1;
        const rewardCoins = DAILY_REWARDS[Math.min(DAILY_REWARDS.length - 1, streak - 1)];
        dailyCoinsEarned = rewardCoins;
      }

      const oldBoosters = existing.game_data?.decoder_boosters || { time: 0, attempts: 0, hint: 0 };
      const newBoosters = gameData.decoder_boosters || { time: 0, attempts: 0, hint: 0 };
      const diffTime = newBoosters.time - (oldBoosters.time || 0);
      const diffAttempts = newBoosters.attempts - (oldBoosters.attempts || 0);
      const diffHint = newBoosters.hint - (oldBoosters.hint || 0);

      const boosterCost = Math.max(0, diffTime) * 50 + Math.max(0, diffAttempts) * 75 + Math.max(0, diffHint) * 150;

      let titleCosts = 0;
      const oldTitles = existing.game_data?.decoder_unlocked_titles || ['title_1'];
      const newTitles = gameData.decoder_unlocked_titles || ['title_1'];
      const addedTitles = newTitles.filter((t: string) => !oldTitles.includes(t));
      for (const title of addedTitles) {
        if (!(title in STORE_ITEMS_TITLES)) {
          throw new Error("Cheating detected: Invalid title");
        }
        if (title === "title_5") {
          const hasPromoCode = newTasks.includes("code_начало") || oldTasks.includes("code_начало");
          if (!hasPromoCode) {
            throw new Error("Cheating detected: Title [Старый] requires promo code 'НАЧАЛО'");
          }
        }
        titleCosts += STORE_ITEMS_TITLES[title];
      }

      let maxLevelCoinsEarned = 0;
      if (levelIncrease > 0) {
        maxLevelCoinsEarned = calculateCumulativeMaxCoins(newLevels) - calculateCumulativeMaxCoins(oldLevels);
      } else if (levelCleared !== undefined && levelCleared !== null) {
        const lastUpdate = existing.updated_at ? new Date(existing.updated_at).getTime() : Date.now();
        const elapsedSeconds = Math.max(0, (Date.now() - lastUpdate) / 1000 + 1.0);
        const minTimeRequired = getMinSolveTimeForLevel(levelCleared);
        const maxReplays = Math.min(50, Math.ceil(elapsedSeconds / minTimeRequired));
        maxLevelCoinsEarned = maxReplays * getMaxPossibleCoinsForLevel(levelCleared);
      }

      const dailyPwReward = computeDailyPwAllowance(gameData, existing.game_data);
      const maxAllowedCoins = oldCoins + maxLevelCoinsEarned + taskCoinsEarned + dailyCoinsEarned + dailyPwReward - boosterCost - titleCosts;
      if (newCoins > maxAllowedCoins) {
        throw new Error(`Cheating detected: coin balance too high (Got: ${newCoins}, max allowed: ${maxAllowedCoins})`);
      }

      // Бонусные монеты за покупки через Robokassa: robokassa-result кладёт их
      // в decoder_donate_pending (серверное поле), а здесь мы одноразово
      // переводим их в баланс. Так бонус не теряется, даже если клиент
      // сохраняет устаревший баланс, и клиент не может начислить его сам
      // (pending читается из БД, а не из данных клиента).
      const donatePending = Math.max(0, Number(existing.game_data?.decoder_donate_pending) || 0);
      if (donatePending > 0) {
        gameData.decoder_coins = (gameData.decoder_coins || 0) + donatePending;
      }
      gameData.decoder_donate_pending = 0;

      if (existing.game_data?.created_at) {
        gameData.created_at = existing.game_data.created_at;
      } else {
        gameData.created_at = createdAt;
      }

      // SECURITY: referred_by нельзя менять после первоначального сохранения.
      // Клиент не должен иметь возможности указывать произвольного реферера,
      // чтобы "накрутить" реферальные награды другому игроку.
      if (existing.game_data?.referred_by) {
        // Сохраняем серверное значение — игнорируем то, что прислал клиент.
        gameData.referred_by = existing.game_data.referred_by;
      } else {
        // Для пользователей без реферала — разрешаем установить один раз,
        // но только если это не самореферал.
        if (gameData.referred_by === userId) {
          gameData.referred_by = null;
        }
      }

      // Бонус пригласившему: когда приглашённый впервые достигает 5-го уровня,
      // рефереру начисляется +300 DCDR. Флаг ref_referrer_bonus_given не даёт дважды.
      const referrerId = gameData.referred_by;
      const alreadyRewarded = existing.game_data?.ref_referrer_bonus_given;
      if (referrerId && referrerId !== userId && newLevels >= 5 && oldLevels < 5 && !alreadyRewarded) {
        // Атомарный инкремент через RPC — без read-modify-write, чтобы собственное
        // сохранение реферера не могло перезаписать/«съесть» начисленный бонус.
        const { error: bonusErr } = await supabaseAdmin.rpc("increment_referrer_bonus", {
          p_user_id: referrerId,
          p_amount: 300,
        });
        // Флаг ставим только если начисление прошло успешно, иначе повторим в след. раз.
        if (!bonusErr) {
          gameData.ref_referrer_bonus_given = true;
        }
      }

    } else {
      const newCoins = gameData.decoder_coins || 0;
      const newLevels = gameData.decoder_levels || 0;

      if (score > calculateCumulativeMaxScore(newLevels)) {
        throw new Error(`Cheating detected: score exceeds limit for level ${newLevels}`);
      }

      const newTasks = gameData.decoder_completed_tasks || [];
      let taskCoinsEarned = 0;
      for (const task of newTasks) {
        taskCoinsEarned += validateTaskAndGetReward(task, gameData, actualFriendsCount);
      }

      const newBoosters = gameData.decoder_boosters || { time: 0, attempts: 0, hint: 0 };
      const boosterCost = Math.max(0, newBoosters.time) * 50 + Math.max(0, newBoosters.attempts) * 75 + Math.max(0, newBoosters.hint) * 150;

      let titleCosts = 0;
      const oldTitles = ['title_1'];
      const newTitles = gameData.decoder_unlocked_titles || ['title_1'];
      const addedTitles = newTitles.filter((t: string) => !oldTitles.includes(t));
      for (const title of addedTitles) {
        if (!(title in STORE_ITEMS_TITLES)) {
          throw new Error("Cheating detected: Invalid title");
        }
        if (title === "title_5") {
          const hasPromoCode = newTasks.includes("code_начало");
          if (!hasPromoCode) {
            throw new Error("Cheating detected: Title [Старый] requires promo code 'НАЧАЛО'");
          }
        }
        titleCosts += STORE_ITEMS_TITLES[title];
      }

      const newStats = gameData.decoder_stats || {};
      let statsIncrementSum = 0;
      const statKeys = ["safe_clears", "bonus_clears", "glitch_clears", "cipher_clears", "dice_clears", "hardcore_clears", "fractal_clears", "void_signal_clears"];
      for (const k of statKeys) {
        statsIncrementSum += newStats[k] || 0;
      }
      if (statsIncrementSum > newLevels) {
        throw new Error(`Cheating detected: stats count (${statsIncrementSum}) is greater than levels count (${newLevels})`);
      }

      const newThemes = gameData.decoder_unlocked_themes || ['default'];
      const addedThemes = newThemes.filter((t: string) => t !== 'default');
      if (addedThemes.length > 0) {
        throw new Error("Cheating detected: premium themes cannot be unlocked on profile creation");
      }

      const maxLevelCoinsEarned = calculateCumulativeMaxCoins(newLevels);
      const totalClaimedPromo = newTasks.filter(t => t.startsWith("code_"))
        .reduce((sum, t) => sum + (VALID_PROMO_CODES[t.replace("code_", "").toUpperCase()] || 0), 0);
      const totalClaimedTasks = newTasks.includes("sub") ? 150 : 0;
      const totalClaimedRef = newTasks.filter(t => t.startsWith("ref_milestone_"))
        .reduce((sum, t) => sum + (REFERRALS_REWARDS[Number(t.replace("ref_milestone_", ""))] || 0), 0);

      let totalClaimedProg = 0;
      const rewardCoins = [
        20, 30, 45, 60, 80, 110, 150, 200, 260, 330, 410, 500, 650, 800, 1000,
        1200, 1500, 1850, 2300, 2800, 3500, 4300, 5200, 6300, 7500, 9000, 11000, 13500, 16500, 20000
      ];
      for (const t of newTasks) {
        if (t.startsWith("prog_")) {
          const parts = t.split("_");
          const stageIndex = Number(parts[3]);
          if (!isNaN(stageIndex) && stageIndex >= 0 && stageIndex <= 29) {
            totalClaimedProg += rewardCoins[stageIndex];
          }
        }
      }



      const dailyPwReward = computeDailyPwAllowance(gameData, null);
      const maxAllowedCoins = 50 + maxLevelCoinsEarned + taskCoinsEarned + dailyPwReward - boosterCost - titleCosts;
      if (newCoins > maxAllowedCoins) {
        throw new Error(`Cheating detected: coin balance too high (Got: ${newCoins}, max allowed: ${maxAllowedCoins})`);
      }

      gameData.created_at = Date.now();

      // SECURITY: при создании профиля тоже запрещаем самореферал.
      if (gameData.referred_by === userId) {
        gameData.referred_by = null;
      }

      // Бонус приглашённому: +150 DCDR за вход по реф-ссылке (начисляется один раз).
      if (gameData.referred_by && gameData.referred_by !== userId && !gameData.ref_welcome_bonus_given) {
        const welcomeBonus = 150;
        gameData.decoder_coins = (gameData.decoder_coins || 0) + welcomeBonus;
        gameData.ref_welcome_bonus_given = true; // флаг, чтобы не дать дважды
      }
    }

    const name = `${tgUser.first_name || ""} ${tgUser.last_name || ""}`.trim() || tgUser.name || tgUser.username || "Игрок";
    
    const { error: saveError } = await supabaseAdmin
      .from("leaderboard")
      .upsert({
        user_id: userId,
        name: name,
        score: score,
        game_data: gameData,
        updated_at: new Date().toISOString()
      });

    if (saveError) {
      throw new Error(`Failed to save record: ${saveError.message}`);
    }

    // Аналитика: логируем событие сохранения (fire-and-forget, не блокируем ответ).
    try {
      const _ap = new URLSearchParams(initData);
      const _earned = Math.max(0, (gameData.decoder_coins || 0) - (existing?.game_data?.decoder_coins || 0));
      await supabaseAdmin.from("player_events").insert({
        user_id:    userId,
        event_type: existing ? "game_save" : "new_user",
        event_data: {
          score:       score,
          level:       gameData.decoder_levels || 0,
          coins:       gameData.decoder_coins  || 0,
          earned:      _earned,                       // прирост DCDR за это сохранение
          referred_by: gameData.referred_by    || null,
          mode:        gameData.last_mode       || "classic",
        },
        platform:    _ap.get("platform") || null,
        app_version: _ap.get("version")  || null,
      });
    } catch (_e) { /* fire-and-forget */ }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 400,
    });
  }
});
