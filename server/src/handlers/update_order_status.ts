
import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type UpdateOrderStatusInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export const updateOrderStatus = async (input: UpdateOrderStatusInput): Promise<Order> => {
  try {
    // Build the update object with non-undefined values
    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Only include rider_id if it's explicitly provided
    if (input.rider_id !== undefined) {
      updateData.rider_id = input.rider_id;
    }

    // Update the order
    const result = await db.update(ordersTable)
      .set(updateData)
      .where(eq(ordersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Order with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const order = result[0];
    return {
      ...order,
      total_amount: parseFloat(order.total_amount)
    };
  } catch (error) {
    console.error('Order status update failed:', error);
    throw error;
  }
};
