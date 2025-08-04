
import { db } from '../db';
import { storesTable } from '../db/schema';
import { type UpdateStoreInput, type Store } from '../schema';
import { eq } from 'drizzle-orm';

export const updateStore = async (input: UpdateStoreInput): Promise<Store> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.address !== undefined) {
      updateData.address = input.address;
    }
    if (input.latitude !== undefined) {
      updateData.latitude = input.latitude !== null ? input.latitude.toString() : null;
    }
    if (input.longitude !== undefined) {
      updateData.longitude = input.longitude !== null ? input.longitude.toString() : null;
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }
    if (input.operating_hours !== undefined) {
      updateData.operating_hours = input.operating_hours;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update store record
    const result = await db.update(storesTable)
      .set(updateData)
      .where(eq(storesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Store with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const store = result[0];
    return {
      ...store,
      latitude: store.latitude ? parseFloat(store.latitude) : null,
      longitude: store.longitude ? parseFloat(store.longitude) : null
    };
  } catch (error) {
    console.error('Store update failed:', error);
    throw error;
  }
};
