/**
 * SOVEREIGN LOYALTY ENGINE — Client-Side Demo
 * FAAW Stage 3: Automate
 * 
 * Full loyalty engine running in localStorage for instant mobile demo.
 * No server required — works offline after first load.
 */

const DB_KEY = 'sovereign_loyalty_db';

const TIER_THRESHOLDS = { BRONZE: 0, SILVER: 10, GOLD: 20, 'S-RANK': 50 };
const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'S-RANK'];
const TIER_COLORS = {
  BRONZE: '#cd7f32',
  SILVER: '#c0c0c0',
  GOLD: '#c9a84c',
  'S-RANK': '#e2c06a'
};

const SECRET_MENU = [
  {
    id: 'TW001',
    name: 'The Two Winds Cocktail',
    tier_required: 'S-RANK',
    description: 'A tactical blend of dark rum, ginger, and lime, served in a chilled ceramic vessel.',
    price: '£8.50',
    code: 'BREEZE-442'
  },
  {
    id: 'TW002',
    name: 'Shadow Draught',
    tier_required: 'GOLD',
    description: 'A secret local ale with high notes of citrus. Ask for "The Passenger" at the bar.',
    price: '£5.50',
    code: 'DRAUGHT-77'
  }
];

const REWARDS = [
  { name: 'Free Pint', stamps_required: 10, icon: '🍺' },
  { name: 'Free Shot', stamps_required: 20, icon: '🥃' },
  { name: 'Table Service', stamps_required: 30, icon: '🪑' },
  { name: 'VIP Entry', stamps_required: 50, icon: '👑' }
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

// ─── Core Engine ───
function scanCard(userId, staffId = 'DOOR_01') {
  const db = loadDB();
  let customer = db.customers.find(c => c.id === userId);

  if (!customer) {
    customer = {
      id: userId,
      name: userId,
      tier: 'BRONZE',
      points: 0,
      notes: '',
      joined: new Date().toISOString().split('T')[0]
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

  // Log activity
  const entry = {
    id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: customer.id,
    user_name: customer.name,
    user_tier: tier,
    type: 'SCAN',
    points_awarded: 1,
    timestamp: new Date().toISOString(),
    staff_id: staffId,
    location: 'Main Bar'
  };
  db.activity.unshift(entry);

  saveDB(db);
  return { customer, entry };
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

function getSecretMenu(tier) {
  const tierLevel = TIER_ORDER.indexOf(tier);
  return SECRET_MENU.filter(item => TIER_ORDER.indexOf(item.tier_required) <= tierLevel);
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

// Export for use in app
window.SovereignEngine = {
  loadDB, saveDB, resetDB,
  scanCard, getCustomer, getCustomerActivity,
  getBusinessStats, getLiveFeed, getIntelliGrowAdvisory,
  getSecretMenu, getAvailableRewards,
  timeAgo, formatTime,
  TIER_THRESHOLDS, TIER_ORDER, TIER_COLORS,
  SECRET_MENU, REWARDS
};
