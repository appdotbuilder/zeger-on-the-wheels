
import { db } from '../db';
import { storesTable } from '../db/schema';
import { type CreateStoreInput, type Store } from '../schema';

export const createStore = async (input: CreateStoreInput, userId: number): Promise<Store> => {
  try {
    // Insert store record
    const result = await db.insert(storesTable)
      .values({
        owner_id: userId,
        name: input.name,
        description: input.description,
        address: input.address,
        latitude: input.latitude?.toString(),
        longitude: input.longitude?.toString(),
        phone: input.phone,
        operating_hours: input.operating_hours,
        status: 'pending_verification',
        is_verified: false
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const store = result[0];
    return {
      ...store,
      latitude: store.latitude ? parseFloat(store.latitude) : null,
      longitude: store.longitude ? parseFloat(store.longitude) : null
    };
  } catch (error) {
    console.error('Store creation failed:', error);
    throw error;
  }
};
