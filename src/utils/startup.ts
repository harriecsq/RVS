import { publicAnonKey } from './supabase/info';
import { API_BASE_URL } from '@/utils/api-config';

async function checkAndSeedUsers(onMigrationDetected: () => void): Promise<void> {
  const usersResponse = await fetch(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });

  if (!usersResponse.ok) {
    console.log('[Init] Backend server not responding yet (this is normal on first load)');
    return;
  }

  const usersResult = await usersResponse.json();
  const needsMigration =
    usersResult.success &&
    usersResult.data.length > 0 &&
    usersResult.data.some((u: any) => u.department === 'BD' || u.department === 'PD');

  if (!(usersResult.success && usersResult.data.length === 0) && !needsMigration) {
    return;
  }

  if (needsMigration) {
    console.log('Old user format detected. Migrating to new department names...');
    onMigrationDetected();
  } else {
    console.log('No users found. Auto-seeding test users...');
  }

  const seedResponse = await fetch(`${API_BASE_URL}/auth/seed-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    },
  });

  if (!seedResponse.ok) {
    console.log('[Init] Unable to seed users (server not ready)');
    return;
  }

  const seedResult = await seedResponse.json();
  if (seedResult.success) {
    console.log('✅ Test users seeded successfully!');
    if (needsMigration) console.log('🔄 Migration complete. Please log in again.');
  } else {
    console.log('[Init] Failed to seed users:', seedResult.error);
  }
}

async function checkAndSeedTicketTypes(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/ticket-types`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });

    if (!response.ok) {
      console.log('[Init] Ticket types endpoint not ready yet');
      return;
    }

    const result = await response.json();
    if (!result.success || result.data.length > 0) return;

    console.log('No ticket types found. Auto-seeding ticket types...');
    const seedResponse = await fetch(`${API_BASE_URL}/ticket-types/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!seedResponse.ok) {
      console.log('[Init] Unable to seed ticket types (server not ready)');
      return;
    }

    const seedResult = await seedResponse.json();
    if (seedResult.success) {
      console.log('✅ Ticket types seeded successfully!');
    } else {
      console.log('[Init] Failed to seed ticket types:', seedResult.error);
    }
  } catch {
    console.log('[Init] Ticket types check skipped (server not ready)');
  }
}

/**
 * Fire-and-forget server initialization: seeds users and ticket types on first boot.
 * @param onMigrationDetected Called when legacy users (BD/PD department) are detected — clears local session.
 */
export async function runServerInitialization(onMigrationDetected: () => void): Promise<void> {
  try {
    if (!publicAnonKey) {
      console.log('[Init] Supabase configuration not found. Skipping initialization.');
      return;
    }
    await checkAndSeedUsers(onMigrationDetected);
    await checkAndSeedTicketTypes();
  } catch (error) {
    console.log('[Init] Backend server is not available. App will work in offline mode.', error);
  }
}
