/**
 * Seed Script — populates MySQL with demo users, groups, expenses, splits, and audit history.
 * Run: node seed_sql_data.js
 * 
 * This bypasses the auth layer and inserts directly into the database.
 * Passwords are hashed with bcryptjs (same as the signup route).
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db/sqlconnect');
const { promisify } = require('util');

const query = promisify(db.query).bind(db);

const USERS = [
  { name: 'Boss',      email: 'theboss122805@gmail.com',         password: 'Boss@123' },
  { name: 'Nishu',     email: 'nischalre.cs23@rvce.edu.in',      password: 'Nishu@123' },
  { name: 'Niranjan',  email: 'niranjanarn.cs23@rvce.edu.in',    password: 'Niranjan@123' },
  { name: 'Mani',      email: 'nischalrellur2805@outlook.com',   password: 'Mani@123' },
];

async function seed() {
  console.log('Seeding database...\n');

  // Wait a moment for DB connection
  await new Promise(r => setTimeout(r, 2000));

  // ─── 1. INSERT USERS ───
  console.log('Creating users...');
  const userIds = {};
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    try {
      const res = await query(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        [u.name, u.email, hash]
      );
      userIds[u.name] = res.insertId;
      console.log(`  + ${u.name} (id=${res.insertId})`);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        const [existing] = await query('SELECT id FROM users WHERE email = ?', [u.email]);
        userIds[u.name] = existing.id;
        console.log(`  ~ ${u.name} already exists (id=${existing.id})`);
      } else throw e;
    }
  }

  const [boss, nishu, niranjan, mani] = [userIds['Boss'], userIds['Nishu'], userIds['Niranjan'], userIds['Mani']];

  // ─── 2. CREATE GROUPS ───
  console.log('\nCreating groups...');
  const groups = {};

  const groupDefs = [
    { name: 'Goa Trip',        created_by: boss },
    { name: 'Monthly Rent',    created_by: nishu },
    { name: 'Weekend Foodies', created_by: niranjan },
  ];

  for (const g of groupDefs) {
    try {
      const res = await query('INSERT INTO groups_made (name, created_by) VALUES (?, ?)', [g.name, g.created_by]);
      groups[g.name] = res.insertId;
      console.log(`  + "${g.name}" (id=${res.insertId})`);
    } catch (e) {
      console.log(`  ~ Group "${g.name}" error: ${e.message}`);
      const [existing] = await query('SELECT id FROM groups_made WHERE name = ? AND created_by = ?', [g.name, g.created_by]);
      if (existing) groups[g.name] = existing.id;
    }
  }

  // ─── 3. ADD MEMBERS TO GROUPS ───
  console.log('\nAdding members to groups...');
  const memberships = [
    // Goa Trip — all 4
    [groups['Goa Trip'], boss], [groups['Goa Trip'], nishu], [groups['Goa Trip'], niranjan], [groups['Goa Trip'], mani],
    // Monthly Rent — 3 people
    [groups['Monthly Rent'], nishu], [groups['Monthly Rent'], niranjan], [groups['Monthly Rent'], mani],
    // Weekend Foodies — all 4
    [groups['Weekend Foodies'], boss], [groups['Weekend Foodies'], nishu], [groups['Weekend Foodies'], niranjan], [groups['Weekend Foodies'], mani],
  ];

  for (const [gid, uid] of memberships) {
    try {
      await query('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [gid, uid]);
    } catch (e) {
      // Duplicate — fine
    }
  }
  console.log('  Done.');

  // ─── 4. CREATE A SUB-GROUP ───
  console.log('\nCreating a sub-group...');
  try {
    const subRes = await query('INSERT INTO groups_made (name, created_by, parent_id) VALUES (?, ?, ?)', ['Goa Hotel Bills', boss, groups['Goa Trip']]);
    const subGrpId = subRes.insertId;
    console.log(`  + "Goa Hotel Bills" (sub-group of Goa Trip, id=${subGrpId})`);
    // Add members
    for (const uid of [boss, nishu, niranjan]) {
      try { await query('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [subGrpId, uid]); } catch {}
    }
  } catch (e) {
    console.log(`  ~ Sub-group error: ${e.message}`);
  }

  // ─── 5. INSERT EXPENSES (spread across Oct 2025 – Feb 2026) ───
  console.log('\nCreating expenses...');
  const expenses = [
    // Goa Trip expenses
    { grp: 'Goa Trip', paid: boss,     amt: 4500,  desc: 'Flight tickets booking',       date: '2025-10-05 10:30:00', split: [boss, nishu, niranjan, mani] },
    { grp: 'Goa Trip', paid: nishu,    amt: 3200,  desc: 'Beach resort 2 nights',        date: '2025-10-06 14:00:00', split: [boss, nishu, niranjan, mani] },
    { grp: 'Goa Trip', paid: niranjan, amt: 1800,  desc: 'Dinner at Fishermans Wharf',   date: '2025-10-07 20:00:00', split: [boss, nishu, niranjan, mani] },
    { grp: 'Goa Trip', paid: mani,     amt: 800,   desc: 'Cab to airport',               date: '2025-10-08 06:00:00', split: [boss, nishu, niranjan, mani] },
    { grp: 'Goa Trip', paid: boss,     amt: 2200,  desc: 'Water sports activities',      date: '2025-10-07 11:00:00', split: [boss, nishu, niranjan] },
    { grp: 'Goa Trip', paid: nishu,    amt: 600,   desc: 'Souvenirs and gifts',          date: '2025-10-08 15:00:00', split: [nishu, niranjan, mani] },

    // Monthly Rent expenses
    { grp: 'Monthly Rent', paid: nishu,    amt: 15000, desc: 'November rent',             date: '2025-11-01 09:00:00', split: [nishu, niranjan, mani] },
    { grp: 'Monthly Rent', paid: niranjan, amt: 2400,  desc: 'Electricity bill November', date: '2025-11-10 12:00:00', split: [nishu, niranjan, mani] },
    { grp: 'Monthly Rent', paid: mani,     amt: 800,   desc: 'WiFi bill November',        date: '2025-11-12 10:00:00', split: [nishu, niranjan, mani] },
    { grp: 'Monthly Rent', paid: nishu,    amt: 15000, desc: 'December rent',             date: '2025-12-01 09:00:00', split: [nishu, niranjan, mani] },
    { grp: 'Monthly Rent', paid: niranjan, amt: 2800,  desc: 'Electricity bill December', date: '2025-12-11 12:00:00', split: [nishu, niranjan, mani] },
    { grp: 'Monthly Rent', paid: mani,     amt: 800,   desc: 'WiFi bill December',        date: '2025-12-13 10:00:00', split: [nishu, niranjan, mani] },
    { grp: 'Monthly Rent', paid: nishu,    amt: 15000, desc: 'January rent',              date: '2026-01-01 09:00:00', split: [nishu, niranjan, mani] },
    { grp: 'Monthly Rent', paid: mani,     amt: 3100,  desc: 'Electricity bill January',  date: '2026-01-10 12:00:00', split: [nishu, niranjan, mani] },

    // Weekend Foodies expenses
    { grp: 'Weekend Foodies', paid: boss,     amt: 1200, desc: 'Lunch at Meghana Foods',     date: '2025-11-15 13:00:00', split: [boss, nishu, niranjan, mani] },
    { grp: 'Weekend Foodies', paid: niranjan, amt: 850,  desc: 'Cafe coffee and snacks',     date: '2025-11-22 16:00:00', split: [boss, nishu, niranjan] },
    { grp: 'Weekend Foodies', paid: mani,     amt: 2100, desc: 'Birthday dinner for Nishu',  date: '2025-12-05 20:00:00', split: [boss, nishu, niranjan, mani] },
    { grp: 'Weekend Foodies', paid: boss,     amt: 650,  desc: 'Movie tickets Pushpa 2',     date: '2025-12-12 18:00:00', split: [boss, nishu, mani] },
    { grp: 'Weekend Foodies', paid: nishu,    amt: 1400, desc: 'Dominos pizza party',        date: '2025-12-28 21:00:00', split: [boss, nishu, niranjan, mani] },
    { grp: 'Weekend Foodies', paid: niranjan, amt: 900,  desc: 'Lunch at Truffles',          date: '2026-01-11 13:30:00', split: [boss, nishu, niranjan, mani] },
    { grp: 'Weekend Foodies', paid: boss,     amt: 1800, desc: 'BBQ dinner at Barbeque Nation', date: '2026-01-25 19:30:00', split: [boss, nishu, niranjan, mani] },
    { grp: 'Weekend Foodies', paid: mani,     amt: 550,  desc: 'Chai and samosa at Darshini', date: '2026-02-01 17:00:00', split: [boss, nishu, niranjan, mani] },
    { grp: 'Weekend Foodies', paid: nishu,    amt: 1650, desc: 'Thai food at Rim Naam',       date: '2026-02-08 20:00:00', split: [boss, nishu, niranjan, mani] },
  ];

  const expenseIds = [];
  for (const e of expenses) {
    const grpId = groups[e.grp];
    const res = await query(
      'INSERT INTO expenses (group_id, paid_by, amount, description, created_at) VALUES (?, ?, ?, ?, ?)',
      [grpId, e.paid, e.amt, e.desc, e.date]
    );
    const expId = res.insertId;
    expenseIds.push(expId);

    // Split equally among participants
    const perPerson = +(e.amt / e.split.length).toFixed(2);
    for (const uid of e.split) {
      await query(
        'INSERT INTO expense_splits (expense_id, user_id, owed_amount) VALUES (?, ?, ?)',
        [expId, uid, perPerson]
      );
    }

    console.log(`  + Expense #${expId}: ${e.desc} (${e.amt}) in "${e.grp}"`);
  }

  // ─── 6. INSERT AUDIT HISTORY for time-travel demo ───
  console.log('\nCreating audit trail entries...');
  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i];
    await query(
      `INSERT INTO expense_history (expense_id, action, changed_by, new_amount, new_description, snapshot, changed_at)
       VALUES (?, 'created', ?, ?, ?, ?, ?)`,
      [
        expenseIds[i],
        e.paid,
        e.amt,
        e.desc,
        JSON.stringify({ old: null, new: { amount: e.amt, description: e.desc, group_id: groups[e.grp], paid_by: e.paid, splits: e.split.map(uid => ({ user_id: uid, owed_amount: +(e.amt / e.split.length).toFixed(2) })) }, timestamp: e.date }),
        e.date
      ]
    );
  }
  console.log(`  Done (${expenses.length} entries).`);

  // ─── 7. SUMMARY ───
  console.log('\n========================================');
  console.log('  SEED COMPLETE');
  console.log('========================================');
  console.log(`  Users:    ${USERS.length}`);
  console.log(`  Groups:   ${Object.keys(groups).length} + 1 sub-group`);
  console.log(`  Expenses: ${expenses.length}`);
  console.log(`  Audit:    ${expenses.length} history entries`);
  console.log('========================================\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
