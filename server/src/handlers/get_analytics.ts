
import { db } from '../db';
import { ordersTable, salesTransactionsTable, productsTable, storesTable, usersTable } from '../db/schema';
import { type AnalyticsInput } from '../schema';
import { eq, and, between, gte, lte, sum, count, desc, sql } from 'drizzle-orm';

export interface AnalyticsResponse {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  bestSellingItems: Array<{
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  salesByDay: Array<{
    date: string;
    total_sales: number;
    order_count: number;
  }>;
  revenueByRider: Array<{
    rider_name: string;
    total_revenue: number;
    order_count: number;
  }>;
  inventoryTurnover: Array<{
    product_name: string;
    turnover_rate: number;
  }>;
}

export const getAnalytics = async (input: AnalyticsInput): Promise<AnalyticsResponse> => {
  try {
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);

    // Verify store exists
    const store = await db.select()
      .from(storesTable)
      .where(eq(storesTable.id, input.store_id))
      .execute();

    if (store.length === 0) {
      throw new Error('Store not found');
    }

    // Get total sales and orders
    const salesSummary = await db.select({
      totalSales: sum(salesTransactionsTable.amount),
      totalOrders: count(salesTransactionsTable.id)
    })
    .from(salesTransactionsTable)
    .where(
      and(
        eq(salesTransactionsTable.store_id, input.store_id),
        between(salesTransactionsTable.transaction_date, startDate, endDate)
      )
    )
    .execute();

    const totalSales = parseFloat(salesSummary[0]?.totalSales || '0');
    const totalOrders = salesSummary[0]?.totalOrders || 0;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Get orders within date range to analyze order items
    const ordersInRange = await db.select({
      id: ordersTable.id,
      order_items: ordersTable.order_items,
      total_amount: ordersTable.total_amount,
      created_at: ordersTable.created_at
    })
    .from(ordersTable)
    .innerJoin(salesTransactionsTable, eq(ordersTable.id, salesTransactionsTable.order_id))
    .where(
      and(
        eq(ordersTable.store_id, input.store_id),
        between(salesTransactionsTable.transaction_date, startDate, endDate)
      )
    )
    .execute();

    // Parse order items and aggregate
    const itemSales = new Map<string, { quantity: number; revenue: number }>();
    
    ordersInRange.forEach(order => {
      try {
        const items = JSON.parse(order.order_items) as Array<{
          product_name: string;
          quantity: number;
          price: number;
        }>;
        
        items.forEach(item => {
          const existing = itemSales.get(item.product_name) || { quantity: 0, revenue: 0 };
          itemSales.set(item.product_name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + (item.quantity * item.price)
          });
        });
      } catch (e) {
        // Skip invalid JSON
      }
    });

    const bestSellingItems = Array.from(itemSales.entries())
      .map(([product_name, data]) => ({
        product_name,
        total_quantity: data.quantity,
        total_revenue: data.revenue
      }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 10);

    // Get sales by day
    const dailySales = await db.select({
      date: sql<string>`DATE(${salesTransactionsTable.transaction_date})`,
      total_sales: sum(salesTransactionsTable.amount),
      order_count: count(salesTransactionsTable.id)
    })
    .from(salesTransactionsTable)
    .where(
      and(
        eq(salesTransactionsTable.store_id, input.store_id),
        between(salesTransactionsTable.transaction_date, startDate, endDate)
      )
    )
    .groupBy(sql`DATE(${salesTransactionsTable.transaction_date})`)
    .orderBy(sql`DATE(${salesTransactionsTable.transaction_date})`)
    .execute();

    const salesByDay = dailySales.map(day => ({
      date: day.date,
      total_sales: parseFloat(day.total_sales || '0'),
      order_count: day.order_count || 0
    }));

    // Get revenue by rider
    const riderRevenue = await db.select({
      rider_name: sql<string>`CONCAT(${usersTable.first_name}, ' ', ${usersTable.last_name})`,
      total_revenue: sum(salesTransactionsTable.amount),
      order_count: count(salesTransactionsTable.id)
    })
    .from(salesTransactionsTable)
    .innerJoin(usersTable, eq(salesTransactionsTable.rider_id, usersTable.id))
    .where(
      and(
        eq(salesTransactionsTable.store_id, input.store_id),
        between(salesTransactionsTable.transaction_date, startDate, endDate)
      )
    )
    .groupBy(usersTable.id, usersTable.first_name, usersTable.last_name)
    .orderBy(desc(sum(salesTransactionsTable.amount)))
    .execute();

    const revenueByRider = riderRevenue.map(rider => ({
      rider_name: rider.rider_name,
      total_revenue: parseFloat(rider.total_revenue || '0'),
      order_count: rider.order_count || 0
    }));

    // Calculate inventory turnover (simplified - based on order frequency)
    const productTurnover = Array.from(itemSales.entries())
      .map(([product_name, data]) => ({
        product_name,
        turnover_rate: data.quantity // Simplified turnover rate
      }))
      .sort((a, b) => b.turnover_rate - a.turnover_rate);

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      bestSellingItems,
      salesByDay,
      revenueByRider,
      inventoryTurnover: productTurnover
    };
  } catch (error) {
    console.error('Analytics retrieval failed:', error);
    throw error;
  }
};
