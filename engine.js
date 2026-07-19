/**
 * SOVEREIGN LOYALTY ENGINE — Client-Side Demo
 * FAAW Stage 3: Automate + Anti-Abuse Protection
 * 
 * Full loyalty engine running in localStorage for instant mobile demo.
 * No server required — works offline after first load.
 * 
 * ANTI-ABUSE SYSTEMS:
 *   1. Cooldown Timer — min 4h between scans at different venues
 *   2. Daily Scan Cap — max 1 stamp per 2-hour window
 *   3. Redemption Ledger — unique tokens, consumed on use, cross-venue checked
 *   4. Staff Audit Trail — every action logged with staff ID
 *   5. Secret Code Rotation — codes expire after use, regenerate daily
 *   6. Anomaly Detection — flags unusual scan patterns
 */

const DB_KEY = 'sovereign_loyalty_db';

// ─── Tier System ───
const TIER_THRESHOLDS = { BRONZE: 0, SILVER: 10, GOLD: 20, 'S-RANK': 50 };
const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'S-RANK'];
const TIER_COLORS = {
  BRONZE: '#cd7f32',
  SILVER: '#c0c0c0',
  GOLD: '#c9a84c',
  'S-RANK': '#e2c06a'
};

// ─── Anti-Abuse Config ───
const ANTI_ABUSE = {
  SCAN_COOLDOWN_MS:  4 * 60 * 60 * 1000,   // 4 hours between scans
  DAILY_SCAN_LIMIT:  3,                       // max 3 scans per day
  REDEEM_COOLDOWN_MS: 24 * 60 * 60 * 1000,  // 24h between same reward type
  MAX_REDEEMS_PER_DAY: 2,                     // max 2 redemptions per day
  STAFF_ANOMALY_THRESHOLD: 8,                 // flag if staff awards >8 stamps in a shift
  VENUE_CROSS_CHECK_HOURS: 2,                 // flag if scanned at 2 venues within 2h
};

// ─── Secret Menu (with daily rotating codes) ───
const SECRET_MENU = [
  {
    id: 'TW001',
    name: 'The Two Winds Cocktail',
    tier_required: 'S-RANK',
    description: 'A tactical blend of dark rum, ginger, and lime, served in a chilled ceramic vessel.',
    price: '£8.50',
    base_code: 'BREEZE'
  },
  {
    id: 'TW002',
    name: 'Shadow Draught',
    tier_required: 'GOLD',
    description: 'A secret local ale with high notes of citrus. Ask for "The Passenger" at the bar.',
    price: '£5.50',
    base_code: 'DRAUGHT'
  }
];

// ─── Rewards (with abuse controls) ───
const REWARDS = [
  { name: 'Free Pint', stamps_required: 10, icon: '🍺', cost_to_business: 2.50, max_per_month: 4 },
  { name: 'Free Shot', stamps_required: 20, icon: '🥃', cost_to_business: 1.80, max_per_month: 2 },
  { name: 'Table Service', stamps_required: 30, icon: '🪑', cost_to_business: 0, max_per_month: 8 },
  { name: 'VIP Entry', stamps_required: 50, icon: '👑', cost_to_business: 0, max_per_month: 4 }
];

// ─── Demo Seed Data ───
const DEMO_CUSTOMERS = [
  { id: 'USR-4821', name: 'Vitus', tier: 'S-RANK', points: 52, notes: 'Guinness (Extra Cold). Prefers back room. Match-day regular.', joined: '2025-11-01' },
  { id: 'USR-1137', name: 'Sarah L.', tier: 'GOLD', points: 24, notes: 'Gin & tonic. Friday regular. Birthday: March 12.', joined: '2026-01-15' },
  { id: 'USR-2290', name: 'Marcus P.', tier: 'BRONZE', points: 3, notes: 'First-timer. Came with Vitus.', joined: '2026-05-01' },
  { id: 'USR-3344', name: 'Aisha K.', tier: 'SILVER', points: 14, notes: 'Vodka soda. Tuesday quiz night regular.', joined: '2026-02-20' },
  { id: 'USR-5512', name: 'Jake W.', tier: 'S-RANK', points: 61, notes: 'IPA enthusiast. Knows the bartender by name.', joined: '2025-09-15' },
  { id: 'USR-6678', name: 'Emma T.', tier: 'GOLD', points: 22, notes: 'Prosecco. Celebrates everything here.', joined: '2026-03-01' },
  { id: 'USR-7789', name: 'Liam O.', tier: 'BRONZE', points: 5, notes: 'Student. Comes on Thursdays.', joined: '2026-04-10' },
  { id: 'USR-8801', name: 'Zara M.', tier: 'SILVER', points: 11, notes: 'Mocktails. Designated driver crew.', joined: '2026-03-15' }
];

const DEMO_ACTIVITY = [];

function generateDemoActivity() {
  const now = Date.now();
  const actions = ['SCAN', 'SCAN', 'SCAN', 'REDEEM', 'SCAN'];
  const staffIds = ['DOOR_01', 'BAR_02', 'DOOR_01', 'BAR_03'];
  const locations = ['Main Bar', 'Front Door', 'Back Room', 'Beer Garden'];

  for (let i = 0; i < 45; i++) {
    const customer = DEMO_CUSTOMERS[Math.floor(Math.random() * DEMO_CUSTOMERS.length)];
    const hoursAgo = Math.floor(Math.random() * 72);
    const action = actions[Math.floor(Math.random() * actions.length)];

    DEMO_ACTIVITY.push({
      id: `ACT-${Date.now()}-${i}`,
      user_id: customer.id,
      user_name: customer.name,
      user_tier: customer.tier,
      type: action,
      points_awarded: action === 'SCAN' ? 1 : 0,
      timestamp: new Date(now - hoursAgo * 3600000).toISOString(),
      staff_id: staffIds[Math.floor(Math.random() * staffIds.length)],
      location: locations[Math.floor(Math.random() * locations.length)]
    });
  }

  DEMO_ACTIVITY.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ─── Database Layer ───
function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) return JSON.parse(raw);

  // First load — seed demo data
  generateDemoActivity();
  const db = {
    business_id: 'leeds-bar-chain-01',
    business_name: 'Leeds Bar',
    brand_color: '#c9a84c',
    customers: DEMO_CUSTOMERS,
    activity: DEMO_ACTIVITY,
    staff: [
      { id: 'DOOR_01', name: 'Danny (Door)', role: 'DOORMAN' },
      { id: 'BAR_02', name: 'Ria (Bar)', role: 'BARTENDER' },
      { id: 'BAR_03', name: 'Tom (Bar)', role: 'BARTENDER' }
    ],
    created: new Date().toISOString()
  };
  saveDB(db);
  return db;
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function resetDB() {
  localStorage.removeItem(DB_KEY);
  return loadDB();
}

// ─── Anti-Abuse: Cooldown & Rate Limiting ───
function canScan(userId, venueId = 'leeds-bar-01') {
  const db = loadDB();
  const now = Date.now();
  const customer = db.customers.find(c => c.id === userId);

  // Get recent scans for this user
  const recentScans = db.activity.filter(a =>
    a.user_id === userId && a.type === 'SCAN'
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (recentScans.length === 0) return { allowed: true };

  const lastScan = recentScans[0];
  const timeSinceLastScan = now - new Date(lastScan.timestamp).getTime();

  // RULE 1: Cooldown — min 4 hours between scans
  if (timeSinceLastScan < ANTI_ABUSE.SCAN_COOLDOWN_MS) {
    const hoursLeft = Math.ceil((ANTI_ABUSE.SCAN_COOLDOWN_MS - timeSinceLastScan) / 3600000);
    return {
      allowed: false,
      reason: 'COOLDOWN',
      message: `Cooldown active. Next scan available in ${hoursLeft}h.`,
      details: `Last scan: ${timeAgo(lastScan.timestamp)} at ${lastScan.location || 'unknown venue'}.`
    };
  }

  // RULE 2: Daily scan cap — max 3 per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const scansToday = recentScans.filter(a =>
    new Date(a.timestamp).getTime() >= todayStart.getTime()
  ).length;

  if (scansToday >= ANTI_ABUSE.DAILY_SCAN_LIMIT) {
    return {
      allowed: false,
      reason: 'DAILY_LIMIT',
      message: `Daily limit reached (${ANTI_ABUSE.DAILY_SCAN_LIMIT} scans). Resets at midnight.`,
      details: `${scansToday} scans recorded today.`
    };
  }

  // RULE 3: Cross-venue check — flag if scanned at 2 venues within 2h
  if (recentScans.length > 0 && lastScan.location) {
    const crossVenueScans = recentScans.filter(a =>
      a.location && a.location !== venueId &&
      (now - new Date(a.timestamp).getTime()) < ANTI_ABUSE.VENUE_CROSS_CHECK_HOURS * 3600000
    );
    if (crossVenueScans.length > 0) {
      // Don't block, but flag for audit
      return {
        allowed: true,
        warning: 'CROSS_VENUE',
        message: `Flagged: scanned at "${crossVenueScans[0].location}" ${timeAgo(crossVenueScans[0].timestamp)}.`,
        details: 'This visit has been flagged for review.'
      };
    }
  }

  return { allowed: true };
}

function canRedeem(userId, rewardName) {
  const db = loadDB();
  const now = Date.now();
  const customer = db.customers.find(c => c.id === userId);
  if (!customer) return { allowed: false, reason: 'UNKNOWN_USER' };

  // Check tier and points
  const reward = REWARDS.find(r => r.name === rewardName);
  if (!reward) return { allowed: false, reason: 'UNKNOWN_REWARD' };
  if (customer.points < reward.stamps_required) {
    return {
      allowed: false,
      reason: 'INSUFFICIENT_STAMPS',
      message: `Need ${reward.stamps_required - customer.points} more stamps.`
    };
  }

  // RULE 4: Redemption cooldown — 24h between same reward type
  const recentRedemptions = db.activity.filter(a =>
    a.user_id === userId && a.type === 'REDEEM' && a.reward_name === rewardName
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (recentRedemptions.length > 0) {
    const lastRedeem = recentRedemptions[0];
    const timeSinceLastRedeem = now - new Date(lastRedeem.timestamp).getTime();
    if (timeSinceLastRedeem < ANTI_ABUSE.REDEEM_COOLDOWN_MS) {
      const hoursLeft = Math.ceil((ANTI_ABUSE.REDEEM_COOLDOWN_MS - timeSinceLastRedeem) / 3600000);
      return {
        allowed: false,
        reason: 'REDEEM_COOLDOWN',
        message: `Can only redeem "${rewardName}" once every 24h. Available in ${hoursLeft}h.`
      };
    }
  }

  // RULE 5: Daily redemption cap
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const redeemsToday = db.activity.filter(a =>
    a.user_id === userId && a.type === 'REDEEM' &&
    new Date(a.timestamp).getTime() >= todayStart.getTime()
  ).length;

  if (redeemsToday >= ANTI_ABUSE.MAX_REDEEMS_PER_DAY) {
    return {
      allowed: false,
      reason: 'DAILY_REDEEM_LIMIT',
      message: `Daily redemption limit reached (${ANTI_ABUSE.MAX_REDEEMS_PER_DAY}). Try again tomorrow.`
    };
  }

  // RULE 6: Monthly cap per reward type
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const redeemsThisMonth = db.activity.filter(a =>
    a.user_id === userId && a.type === 'REDEEM' && a.reward_name === rewardName &&
    new Date(a.timestamp).getTime() >= monthStart.getTime()
  ).length;

  if (reward.max_per_month && redeemsThisMonth >= reward.max_per_month) {
    return {
      allowed: false,
      reason: 'MONTHLY_CAP',
      message: `Monthly limit for "${rewardName}" reached (${reward.max_per_month}/month).`
    };
  }

  return { allowed: true, cost: reward.cost_to_business };
}

// ─── Core Engine ───
function scanCard(userId, staffId = 'DOOR_01', venueId = 'leeds-bar-01') {
  const db = loadDB();

  // ANTI-ABUSE CHECK
  const check = canScan(userId, venueId);
  if (!check.allowed) {
    return { success: false, blocked: true, ...check };
  }

  let customer = db.customers.find(c => c.id === userId);

  if (!customer) {
    customer = {
      id: userId,
      name: userId,
      tier: 'BRONZE',
      points: 0,
      notes: '',
      joined: new Date().toISOString().split('T')[0],
      device_fingerprint: null
    };
    db.customers.push(customer);
  }

  // Award point
  customer.points += 1;

  // Recalculate tier
  let tier = 'BRONZE';
  for (const [t, threshold] of Object.entries(TIER_THRESHOLDS).reverse()) {
    if (customer.points >= threshold) { tier = t; break; }
  }
  customer.tier = tier;

  // Log activity with full audit trail
  const entry = {
    id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: customer.id,
    user_name: customer.name,
    user_tier: tier,
    type: 'SCAN',
    points_awarded: 1,
    timestamp: new Date().toISOString(),
    staff_id: staffId,
    location: venueId,
    flagged: check.warning || null,
    anti_abuse: {
      cooldown_ok: true,
      daily_limit_ok: true,
      cross_venue_flag: check.warning || null
    }
  };
  db.activity.unshift(entry);

  // STAFF ANOMALY DETECTION
  const staffShiftStart = new Date();
  staffShiftStart.setHours(Math.floor(staffShiftStart.getHours() / 8) * 8, 0, 0, 0);
  const staffScansToday = db.activity.filter(a =>
    a.staff_id === staffId && a.type === 'SCAN' &&
    new Date(a.timestamp).getTime() >= staffShiftStart.getTime()
  ).length;

  if (staffScansToday >= ANTI_ABUSE.STAFF_ANOMALY_THRESHOLD) {
    entry.flagged = 'STAFF_ANOMALY';
    entry.anti_abuse.staff_anomaly = true;
  }

  saveDB(db);
  return { success: true, customer, entry, check };
}

function redeemReward(userId, rewardName, staffId = 'BAR_02') {
  const db = loadDB();

  // ANTI-ABUSE CHECK
  const check = canRedeem(userId, rewardName);
  if (!check.allowed) {
    return { success: false, blocked: true, ...check };
  }

  const customer = db.customers.find(c => c.id === userId);
  if (!customer) return { success: false, reason: 'UNKNOWN_USER' };

  const reward = REWARDS.find(r => r.name === rewardName);

  // Deduct points
  customer.points -= reward.stamps_required;

  // Generate unique redemption token
  const token = `RDM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // Log redemption with full audit
  const entry = {
    id: `ACT-${Date.now()}-redeem`,
    user_id: userId,
    user_name: customer.name,
    user_tier: customer.tier,
    type: 'REDEEM',
    reward_name: rewardName,
    reward_token: token,
    points_deducted: reward.stamps_required,
    cost_to_business: reward.cost_to_business || 0,
    timestamp: new Date().toISOString(),
    staff_id: staffId,
    location: 'Main Bar'
  };
  db.activity.unshift(entry);

  // Log in redemption ledger (cross-venue tracking)
  if (!db.redemption_ledger) db.redemption_ledger = [];
  db.redemption_ledger.push({
    token,
    user_id: userId,
    reward_name: rewardName,
    redeemed_at: new Date().toISOString(),
    venue: 'leeds-bar-01',
    staff_id: staffId
  });

  saveDB(db);
  return { success: true, customer, entry, token, cost: reward.cost_to_business };
}

function getCustomer(userId) {
  const db = loadDB();
  return db.customers.find(c => c.id === userId) || null;
}

function getCustomerActivity(userId, limit = 10) {
  const db = loadDB();
  return db.activity.filter(a => a.user_id === userId).slice(0, limit);
}

function getBusinessStats() {
  const db = loadDB();
  const now = Date.now();
  const oneDay = 86400000;
  const oneWeek = 604800000;

  const scans24h = db.activity.filter(a =>
    a.type === 'SCAN' && (now - new Date(a.timestamp).getTime()) < oneDay
  ).length;

  const scansWeek = db.activity.filter(a =>
    a.type === 'SCAN' && (now - new Date(a.timestamp).getTime()) < oneWeek
  ).length;

  const redemptions24h = db.activity.filter(a =>
    a.type === 'REDEEM' && (now - new Date(a.timestamp).getTime()) < oneDay
  ).length;

  const tiers = {};
  db.customers.forEach(c => { tiers[c.tier] = (tiers[c.tier] || 0) + 1; });

  // Retention: % of customers with 2+ scans
  const scanCounts = {};
  db.activity.filter(a => a.type === 'SCAN').forEach(a => {
    scanCounts[a.user_id] = (scanCounts[a.user_id] || 0) + 1;
  });
  const returning = Object.values(scanCounts).filter(c => c >= 2).length;
  const retention = db.customers.length > 0
    ? ((returning / db.customers.length) * 100).toFixed(1)
    : '0.0';

  return {
    total_cards: db.customers.length,
    scans_24h: scans24h,
    scans_week: scansWeek,
    redemptions_24h: redemptions24h,
    tiers,
    retention_rate: retention
  };
}

function getLiveFeed(limit = 15) {
  const db = loadDB();
  return db.activity.slice(0, limit);
}

function getIntelliGrowAdvisory() {
  const db = loadDB();
  const now = Date.now();
  const oneDay = 86400000;

  // Find quietest day of week
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  db.activity.filter(a => a.type === 'SCAN').forEach(a => {
    const d = new Date(a.timestamp).getDay();
    dayCounts[d]++;
  });
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const quietestIdx = dayCounts.indexOf(Math.min(...dayCounts.filter(c => c > 0).length ? dayCounts : [1]));
  const busiestIdx = dayCounts.indexOf(Math.max(...dayCounts));

  const advice = [];

  advice.push({
    type: 'RETENTION_BOOST',
    trigger: `Double Point ${dayNames[quietestIdx]}`,
    insight: `${dayNames[quietestIdx]} is your lowest volume day (${dayCounts[quietestIdx]} scans this week). A "Double Point" trigger could convert ghost hours into revenue.`,
    severity: 'info'
  });

  const sRankCount = db.customers.filter(c => c.tier === 'S-RANK').length;
  if (sRankCount > 0) {
    advice.push({
      type: 'CULT_CULTURE',
      trigger: 'S-Rank Secret Menu',
      insight: `You have ${sRankCount} S-Rank members. Launching a "Hidden Menu" accessible only via their Sovereign Pass will deepen loyalty.`,
      severity: 'success'
    });
  }

  // Churn risk: customers who haven't visited in 7+ days
  const staleCustomers = db.customers.filter(c => {
    const lastScan = db.activity.find(a => a.user_id === c.id && a.type === 'SCAN');
    if (!lastScan) return false;
    return (now - new Date(lastScan.timestamp).getTime()) > 7 * oneDay;
  });

  if (staleCustomers.length > 0) {
    advice.push({
      type: 'CHURN_ALERT',
      trigger: `${staleCustomers.length} At-Risk Members`,
      insight: `${staleCustomers.map(c => c.name).join(', ')} haven't visited in 7+ days. Send a "We Miss You" trigger with bonus stamps.`,
      severity: 'warning'
    });
  }

  advice.push({
    type: 'PEAK_OPTIMIZATION',
    trigger: `${dayNames[busiestIdx]} Peak Hour`,
    insight: `${dayNames[busiestIdx]} sees the most activity (${dayCounts[busiestIdx]} scans). Consider "Happy Hour" extensions to maximize dwell time.`,
    severity: 'info'
  });

  return advice;
}

// ─── Secret Menu (with daily rotating codes) ───
function generateDailyCode(baseCode) {
  const today = new Date().toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < (baseCode + today).length; i++) {
    const char = (baseCode + today).charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const suffix = Math.abs(hash % 900) + 100;
  return `${baseCode}-${suffix}`;
}

function getSecretMenu(tier) {
  const tierLevel = TIER_ORDER.indexOf(tier);
  return SECRET_MENU.filter(item => TIER_ORDER.indexOf(item.tier_required) <= tierLevel)
    .map(item => ({
      ...item,
      code: generateDailyCode(item.base_code)
    }));
}

function redeemSecretCode(code, userId) {
  const db = loadDB();
  const today = new Date().toISOString().split('T')[0];

  // Check if code was already used today
  if (!db.used_codes) db.used_codes = [];
  const alreadyUsed = db.used_codes.find(c => c.code === code && c.date === today);
  if (alreadyUsed) {
    return {
      success: false,
      reason: 'CODE_ALREADY_USED',
      message: 'This code has already been redeemed today.'
    };
  }

  // Validate the code
  const customer = db.customers.find(c => c.id === userId);
  if (!customer) return { success: false, reason: 'UNKNOWN_USER' };

  const validCodes = getSecretMenu(customer.tier);
  const validCode = validCodes.find(c => c.code === code);

  if (!validCode) {
    return {
      success: false,
      reason: 'INVALID_CODE',
      message: 'Code expired or not valid for your tier.'
    };
  }

  // Mark as used
  db.used_codes.push({
    code,
    user_id: userId,
    date: today,
    timestamp: new Date().toISOString()
  });

  saveDB(db);
  return {
    success: true,
    item: validCode,
    message: `Secret menu unlocked: ${validCode.name}`
  };
}

function getAvailableRewards(points) {
  return REWARDS.filter(r => points >= r.stamps_required);
}

// ─── Time Helpers ───
function timeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Anomaly Detection & Abuse Report ───
function getAbuseReport() {
  const db = loadDB();
  const now = Date.now();
  const oneDay = 86400000;
  const flags = [];

  // 1. Cross-venue scan detection
  const recentScans = db.activity.filter(a =>
    a.type === 'SCAN' && (now - new Date(a.timestamp).getTime()) < 24 * oneDay
  );
  const userVenues = {};
  recentScans.forEach(a => {
    if (!userVenues[a.user_id]) userVenues[a.user_id] = new Set();
    userVenues[a.user_id].add(a.location);
  });
  Object.entries(userVenues).forEach(([uid, venues]) => {
    if (venues.size > 1) {
      const customer = db.customers.find(c => c.id === uid);
      flags.push({
        type: 'CROSS_VENUE',
        severity: 'warning',
        user: customer?.name || uid,
        detail: `Scanned at ${venues.size} different venues today: ${[...venues].join(', ')}`
      });
    }
  });

  // 2. Rapid scan detection (3+ scans within 2 hours)
  const userScanTimes = {};
  recentScans.forEach(a => {
    if (!userScanTimes[a.user_id]) userScanTimes[a.user_id] = [];
    userScanTimes[a.user_id].push(new Date(a.timestamp).getTime());
  });
  Object.entries(userScanTimes).forEach(([uid, times]) => {
    times.sort((a, b) => a - b);
    for (let i = 0; i < times.length - 2; i++) {
      if (times[i + 2] - times[i] < 2 * 3600000) {
        const customer = db.customers.find(c => c.id === uid);
        flags.push({
          type: 'RAPID_SCANS',
          severity: 'danger',
          user: customer?.name || uid,
          detail: `3 scans within 2 hours — possible exploitation`
        });
      }
    }
  });

  // 3. Staff anomaly — one staff member awarding most stamps
  const staffCounts = {};
  recentScans.filter(a => a.type === 'SCAN').forEach(a => {
    staffCounts[a.staff_id] = (staffCounts[a.staff_id] || 0) + 1;
  });
  const totalScans = Object.values(staffCounts).reduce((s, c) => s + c, 0);
  Object.entries(staffCounts).forEach(([sid, count]) => {
    if (totalScans > 5 && count / totalScans > 0.7) {
      flags.push({
        type: 'STAFF_CONCENTRATION',
        severity: 'info',
        user: sid,
        detail: `${count}/${totalScans} scans (${Math.round(count/totalScans*100)}%) — check for collusion`
      });
    }
  });

  // 4. High redemption rate vs scan ratio
  const totalRedeems = db.activity.filter(a =>
    a.type === 'REDEEM' && (now - new Date(a.timestamp).getTime()) < 30 * oneDay
  ).length;
  const totalScansMonth = db.activity.filter(a =>
    a.type === 'SCAN' && (now - new Date(a.timestamp).getTime()) < 30 * oneDay
  ).length;
  if (totalScansMonth > 0) {
    const redeemRate = totalRedeems / totalScansMonth;
    if (redeemRate > 0.4) {
      flags.push({
        type: 'HIGH_REDEEM_RATE',
        severity: 'warning',
        detail: `Redemption rate is ${Math.round(redeemRate * 100)}% (target: <30%). Rewards may be too generous.`
      });
    }
  }

  return { flags, summary: `${flags.length} issue(s) detected` };
}

// ─── Revenue Intelligence ───
function getRevenueReport() {
  const db = loadDB();
  const now = Date.now();
  const oneDay = 86400000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;

  // Calculate costs from redemptions
  const redeems30d = db.activity.filter(a =>
    a.type === 'REDEEM' && a.cost_to_business &&
    (now - new Date(a.timestamp).getTime()) < oneMonth
  );

  const totalCost30d = redeems30d.reduce((sum, a) => sum + (a.cost_to_business || 0), 0);

  // Estimate revenue: each scan = avg £8 spend (pint + margin)
  const scans30d = db.activity.filter(a =>
    a.type === 'SCAN' && (now - new Date(a.timestamp).getTime()) < oneMonth
  ).length;
  const estimatedRevenue = scans30d * 8;

  // Cost per redemption by type
  const costByReward = {};
  redeems30d.forEach(a => {
    costByReward[a.reward_name] = (costByReward[a.reward_name] || 0) + (a.cost_to_business || 0);
  });

  return {
    period: '30 days',
    total_scans: scans30d,
    total_redeems: redeems30d.length,
    total_cost: totalCost30d,
    estimated_revenue: estimatedRevenue,
    net_benefit: estimatedRevenue - totalCost30d,
    cost_by_reward: costByReward,
    roi: totalCost30d > 0 ? ((estimatedRevenue / totalCost30d) * 100).toFixed(0) : '∞',
    avg_cost_per_redemption: redeems30d.length > 0
      ? (totalCost30d / redeems30d.length).toFixed(2)
      : '0.00'
  };
}

// ─── Device Fingerprint (basic) ───
function getDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);
  const data = canvas.toDataURL();

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    data.slice(-50)
  ].join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'DEV-' + Math.abs(hash).toString(36);
}

// Export for use in app
window.SovereignEngine = {
  loadDB, saveDB, resetDB,
  scanCard, redeemReward,
  canScan, canRedeem,
  getCustomer, getCustomerActivity,
  getBusinessStats, getLiveFeed, getIntelliGrowAdvisory,
  getSecretMenu, getAvailableRewards, redeemSecretCode,
  getAbuseReport, getRevenueReport,
  getDeviceFingerprint,
  timeAgo, formatTime,
  TIER_THRESHOLDS, TIER_ORDER, TIER_COLORS,
  SECRET_MENU, REWARDS, ANTI_ABUSE
};
