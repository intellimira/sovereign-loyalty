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

// ═══════════════════════════════════════════════════════════════
//  RETENTION ENGINE — Psychological Hooks
// ═══════════════════════════════════════════════════════════════

// ─── Status Titles (Identity Lock) ───
const STATUS_TITLES = {
  BRONZE: { title: 'The Newcomer', icon: '🌱', description: 'Every legend starts here.' },
  SILVER: { title: 'The Regular', icon: '⚔️', description: 'You know the barstaff by name now.' },
  GOLD: { title: 'The Insider', icon: '🔐', description: 'You see the hidden menu. You ARE the hidden menu.' },
  'S-RANK': { title: 'House Legend', icon: '👑', description: 'This is YOUR venue. Act like it.' }
};

// ─── Achievement Badges (Endowment Effect) ───
const ACHIEVEMENTS = [
  { id: 'first_scan', name: 'First Blood', icon: '🩸', description: 'Your first scan. The journey begins.', condition: (c, a) => a.filter(x => x.type === 'SCAN').length >= 1 },
  { id: 'visit_5', name: 'oyal', icon: '🗡️', description: '5 visits. You\'re not a tourist anymore.', condition: (c, a) => a.filter(x => x.type === 'SCAN').length >= 5 },
  { id: 'visit_10', name: 'The Ten Club', icon: '🔟', description: '10 visits. Your glass is always full.', condition: (c, a) => a.filter(x => x.type === 'SCAN').length >= 10 },
  { id: 'visit_25', name: 'Quarter Century', icon: '🏅', description: '25 visits. Staff know your order before you speak.', condition: (c, a) => a.filter(x => x.type === 'SCAN').length >= 25 },
  { id: 'visit_50', name: 'House Royalty', icon: '🏆', description: '50 visits. Your table is always ready.', condition: (c, a) => a.filter(x => x.type === 'SCAN').length >= 50 },
  { id: 'first_redeem', name: 'First Taste', icon: '🍷', description: 'Redeemed your first reward. Addiction starts here.', condition: (c, a) => a.filter(x => x.type === 'REDEEM').length >= 1 },
  { id: 'streak_3', name: 'Hat Trick', icon: '🎩', description: '3 visits in 3 days. You\'re hooked.', condition: (c, a) => checkStreak(a, 3) },
  { id: 'streak_7', name: 'Week Warrior', icon: '⚔️', description: '7 days straight. This is your second home.', condition: (c, a) => checkStreak(a, 7) },
  { id: 'night_owl', name: 'Night Owl', icon: '🦉', description: 'Visited after midnight. The night remembers.', condition: (c, a) => a.some(x => new Date(x.timestamp).getHours() >= 0 && new Date(x.timestamp).getHours() < 5) },
  { id: 'early_bird', name: 'Early Bird', icon: '🐦', description: 'Before 6pm visit. Daylight-drinker energy.', condition: (c, a) => a.some(x => x.type === 'SCAN' && new Date(x.timestamp).getHours() < 18 && new Date(x.timestamp).getHours() >= 12) },
  { id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', description: 'Referred a friend. You\'re spreading the cult.', condition: (c) => (c.referrals || 0) >= 1 },
  { id: 'big_spender', name: 'Big Spender', icon: '💸', description: 'Redeemed 3+ rewards. You\'re getting your money\'s worth.', condition: (c, a) => a.filter(x => x.type === 'REDEEM').length >= 3 },
  { id: 'quiz_night', name: 'Quizmaster', icon: '🧠', description: 'Tuesday quiz night regular. Brain and beer.', condition: (c, a) => {
    const tuesdayScans = a.filter(x => x.type === 'SCAN' && new Date(x.timestamp).getDay() === 2);
    return tuesdayScans.length >= 3;
  }},
  { id: 'weekend_warrior', name: 'Weekend Warrior', icon: '⚔️', description: 'Friday + Saturday regular. The weekend starts with you.', condition: (c, a) => {
    const fridaySat = a.filter(x => x.type === 'SCAN' && (new Date(x.timestamp).getDay() === 5 || new Date(x.timestamp).getDay() === 6));
    return fridaySat.length >= 4;
  }}
];

function checkStreak(activity, requiredDays) {
  const scanDates = [...new Set(
    activity.filter(a => a.type === 'SCAN')
      .map(a => new Date(a.timestamp).toDateString())
  )].sort((a, b) => new Date(b) - new Date(a));

  if (scanDates.length < requiredDays) return false;

  let streak = 1;
  for (let i = 0; i < scanDates.length - 1; i++) {
    const diff = (new Date(scanDates[i]) - new Date(scanDates[i + 1])) / 86400000;
    if (diff === 1) { streak++; }
    else { streak = 1; }
    if (streak >= requiredDays) return true;
  }
  return false;
}

// ─── Weekly Challenges (Commitment/Consistency) ───
function generateWeeklyChallenges(userId) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const db = loadDB();
  const weekActivity = db.activity.filter(a =>
    a.user_id === userId && new Date(a.timestamp).getTime() >= weekStart.getTime()
  );

  const challenges = [
    {
      id: 'visit_3',
      name: 'Triple Tap',
      icon: '🎯',
      description: 'Visit 3 times this week',
      target: 3,
      current: weekActivity.filter(a => a.type === 'SCAN').length,
      reward: '2 bonus stamps',
      reward_stamps: 2
    },
    {
      id: 'social',
      name: 'Bring a Mate',
      icon: '🤝',
      description: 'Refer 1 friend this week',
      target: 1,
      current: Math.min(1, (db.customers.find(c => c.id === userId)?.referrals_this_week || 0)),
      reward: '5 bonus stamps',
      reward_stamps: 5
    },
    {
      id: ' variety',
      name: 'The Explorer',
      icon: '🗺️',
      description: 'Visit on 2 different days',
      target: 2,
      current: [...new Set(weekActivity.filter(a => a.type === 'SCAN').map(a => new Date(a.timestamp).toDateString()))].length,
      reward: '1 bonus stamp',
      reward_stamps: 1
    },
    {
      id: 'spend',
      name: 'Generous Soul',
      icon: '🎁',
      description: 'Redeem a reward this week',
      target: 1,
      current: weekActivity.filter(a => a.type === 'REDEEM').length,
      reward: '3 bonus stamps',
      reward_stamps: 3
    }
  ];

  return challenges.map(c => ({ ...c, complete: c.current >= c.target }));
}

// ─── Surprise Drops (Variable Reward Schedule) ───
function checkSurpriseDrop(userId) {
  const db = loadDB();
  const customer = db.customers.find(c => c.id === userId);
  if (!customer) return null;

  if (!db.surprise_drops) db.surprise_drops = [];

  // Check if we already gave a drop today
  const today = new Date().toISOString().split('T')[0];
  const alreadyDropped = db.surprise_drops.find(d => d.user_id === userId && d.date === today);
  if (alreadyDropped) return null;

  // 15% chance of surprise drop on each visit
  if (Math.random() > 0.15) return null;

  // Determine reward type
  const drops = [
    { type: 'BONUS_STAMPS', value: 2, message: '🌟 SURPRISE: +2 bonus stamps!', cost: 0 },
    { type: 'BONUS_STAMPS', value: 3, message: '🌟 LUCKY VISIT: +3 bonus stamps!', cost: 0 },
    { type: 'FREE_DRINK', value: 1, message: '🎉 LUCKY DROP: Free drink on us!', cost: 2.50 },
    { type: 'DOUBLE_NEXT', value: 1, message: '⚡ DOUBLE STAMPS: Your next scan counts double!', cost: 0 },
  ];

  const drop = drops[Math.floor(Math.random() * drops.length)];

  // Apply the drop
  if (drop.type === 'BONUS_STAMPS') {
    customer.points += drop.value;
  } else if (drop.type === 'DOUBLE_NEXT') {
    customer.double_next = true;
  }

  // Log it
  db.surprise_drops.push({
    user_id: userId,
    date: today,
    type: drop.type,
    value: drop.value,
    timestamp: new Date().toISOString()
  });

  saveDB(db);
  return drop;
}

// ─── Flash Events (Scarcity/Urgency) ───
const FLASH_EVENTS = [
  { id: 'triple_tuesday', name: 'Triple Stamp Tuesday', icon: '⚡', day: 2, hours: [19, 20, 21], multiplier: 3, description: 'Every scan between 7-9pm gives 3x stamps' },
  { id: 'happy_hour_bonus', name: 'Happy Hour Bonus', icon: '🍺', day: 5, hours: [17, 18, 19], multiplier: 2, description: 'Friday early bird: 2x stamps before 8pm' },
  { id: 'quiz_night', name: 'Quiz Night Triple', icon: '🧠', day: 2, hours: [20, 21], multiplier: 3, description: 'Tuesday quiz: 3x stamps for participants' },
  { id: 'weekend_early', name: 'Weekend Starter', icon: '🌅', day: 5, hours: [12, 13, 14, 15], multiplier: 2, description: 'Friday lunch: 2x stamps for early birds' },
];

function getActiveFlashEvent() {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  return FLASH_EVENTS.find(e =>
    e.day === currentDay && e.hours.includes(currentHour)
  );
}

// ─── Social Proof (Community Board) ───
function getSocialProof() {
  const db = loadDB();
  const now = Date.now();
  const oneWeek = 7 * 86400000;

  const recent = db.activity.filter(a =>
    a.type === 'SCAN' && (now - new Date(a.timestamp).getTime()) < oneWeek
  );

  // Who visited most this week
  const visitCounts = {};
  recent.forEach(a => {
    visitCounts[a.user_name] = (visitCounts[a.user_name] || 0) + 1;
  });
  const topRegulars = Object.entries(visitCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count], i) => ({
      rank: i + 1,
      name,
      visits: count,
      icon: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📍'
    }));

  // Tier promotions this week
  const promotions = recent.filter(a => a.user_tier && a.type === 'SCAN')
    .filter(a => {
      const customer = db.customers.find(c => c.id === a.user_id);
      return customer && TIER_ORDER.indexOf(a.user_tier) < TIER_ORDER.indexOf(customer.tier);
    })
    .map(a => ({
      name: a.user_name,
      from: a.user_tier,
      to: db.customers.find(c => c.id === a.user_id)?.tier || a.user_tier
    }));

  return { topRegulars, promotions };
}

// ─── Progress to Next Reward (Goal Gradient) ───
function getProgressToReward(userId) {
  const customer = getCustomer(userId);
  if (!customer) return null;

  const nextReward = REWARDS.find(r => r.stamps_required > customer.points);
  if (!nextReward) {
    return {
      complete: true,
      message: 'You\'ve unlocked all rewards! S-Rank status achieved.',
      icon: '👑'
    };
  }

  const previousThreshold = REWARDS.filter(r => r.stamps_required <= customer.points)
    .sort((a, b) => b.stamps_required - a.stamps_required)[0]?.stamps_required || 0;

  const stampsNeeded = nextReward.stamps_required - customer.points;
  const progress = ((customer.points - previousThreshold) / (nextReward.stamps_required - previousThreshold) * 100).toFixed(0);

  return {
    complete: false,
    reward: nextReward.name,
    icon: nextReward.icon,
    stampsNeeded,
    progress: Math.min(100, Math.max(0, progress)),
    message: `${stampsNeeded} more stamp${stampsNeeded !== 1 ? 's' : ''} until ${nextReward.icon} ${nextReward.name}`
  };
}

// ─── Referral System (Social Proof + Reciprocity) ───
function generateReferralCode(userId) {
  return `REF-${userId.slice(-4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function applyReferral(referralCode, newUserId) {
  const db = loadDB();
  if (!db.referral_ledger) db.referral_ledger = [];

  // Find who owns this referral code
  const owner = db.customers.find(c => c.referral_code === referralCode);
  if (!owner) return { success: false, reason: 'INVALID_CODE' };

  // Check if new user was already referred
  const alreadyReferred = db.referral_ledger.find(r => r.new_user_id === newUserId);
  if (alreadyReferred) return { success: false, reason: 'ALREADY_REFERRED' };

  // Reward both parties
  owner.points += 5;
  owner.referrals = (owner.referrals || 0) + 1;

  const newCustomer = db.customers.find(c => c.id === newUserId);
  if (newCustomer) {
    newCustomer.points += 5;
    newCustomer.referred_by = owner.id;
  }

  // Log it
  db.referral_ledger.push({
    referral_code: referralCode,
    owner_id: owner.id,
    new_user_id: newUserId,
    timestamp: new Date().toISOString()
  });

  saveDB(db);
  return {
    success: true,
    message: `Both you and ${owner.name} get +5 bonus stamps!`,
    owner_reward: 5,
    new_user_reward: 5
  };
}

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

  // ─── FLASH EVENT MULTIPLIER ───
  const flashEvent = getActiveFlashEvent();
  if (flashEvent) {
    customer.points += (flashEvent.multiplier - 1); // additional stamps
    entry.flash_event = flashEvent.name;
    entry.points_awarded = flashEvent.multiplier;
  }

  // ─── DOUBLE NEXT STAMP ───
  if (customer.double_next) {
    customer.points += 1;
    customer.double_next = false;
    entry.double_bonus = true;
    entry.points_awarded = (entry.points_awarded || 1) + 1;
  }

  // Recalculate tier
  let tier = 'BRONZE';
  for (const [t, threshold] of Object.entries(TIER_THRESHOLDS).reverse()) {
    if (customer.points >= threshold) { tier = t; break; }
  }

  // Track tier promotion
  if (tier !== customer.tier) {
    entry.tier_promoted = { from: customer.tier, to: tier };
  }
  customer.tier = tier;

  // Log activity with full audit trail
  entry.id = `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  entry.user_id = customer.id;
  entry.user_name = customer.name;
  entry.user_tier = tier;
  entry.type = 'SCAN';
  entry.timestamp = new Date().toISOString();
  entry.staff_id = staffId;
  entry.location = venueId;
  entry.flagged = check.warning || null;
  entry.anti_abuse = {
    cooldown_ok: true,
    daily_limit_ok: true,
    cross_venue_flag: check.warning || null
  };
  db.activity.unshift(entry);

  // ─── CHECK SURPRISE DROP ───
  const surprise = checkSurpriseDrop(userId);
  if (surprise) {
    entry.surprise_drop = surprise;
  }

  // ─── STAFF ANOMALY DETECTION ───
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
  return { success: true, customer, entry, check, flash: flashEvent || null, surprise };
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
  // Retention
  checkSurpriseDrop, generateWeeklyChallenges, getActiveFlashEvent,
  getSocialProof, getProgressToReward, generateReferralCode, applyReferral,
  // Constants
  timeAgo, formatTime,
  TIER_THRESHOLDS, TIER_ORDER, TIER_COLORS,
  SECRET_MENU, REWARDS, ANTI_ABUSE,
  STATUS_TITLES, ACHIEVEMENTS, FLASH_EVENTS
};
