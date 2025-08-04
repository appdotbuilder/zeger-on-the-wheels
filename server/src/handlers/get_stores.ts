
import { db } from '../db';
import { storesTable, usersTable } from '../db/schema';
import { type Store } from '../schema';
import { eq } from 'drizzle-orm';

export const getStores = async (userId?: number): Promise<Store[]> => {
  try {
    // If userId is provided, filter based on user role
    if (userId !== undefined) {
      // First get the user to check their role
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];

      // Filter based on user role
      if (user.role === 'store_staff') {
        // Store staff can only see their own stores
        const results = await db.select()
          .from(storesTable)
          .where(eq(storesTable.owner_id, userId))
          .execute();

        // Convert numeric fields back to numbers
        return results.map(store => ({
          ...store,
          latitude: store.latitude ? parseFloat(store.latitude) : null,
          longitude: store.longitude ? parseFloat(store.longitude) : null
        }));
      }
      // Administrators and rider_sellers can see all stores - fall through to get all
    }

    // Get all stores (no user provided, or admin/rider user)
    const results = await db.select()
      .from(storesTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(store => ({
      ...store,
      latitude: store.latitude ? parseFloat(store.latitude) : null,
      longitude: store.longitude ? parseFloat(store.longitude) : null
    }));
  } catch (error) {
    console.error('Failed to fetch stores:', error);
    throw error;
  }
};
