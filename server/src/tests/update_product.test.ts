
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, storesTable, usersTable } from '../db/schema';
import { type UpdateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testStoreId: number;
  let testProductId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        phone: '1234567890',
        role: 'store_staff'
      })
      .returning({ id: usersTable.id })
      .execute();
    
    testUserId = userResult[0].id;

    // Create test store
    const storeResult = await db.insert(storesTable)
      .values({
        owner_id: testUserId,
        name: 'Test Store',
        address: '123 Test St',
        operating_hours: JSON.stringify({ monday: '9-17' })
      })
      .returning({ id: storesTable.id })
      .execute();
    
    testStoreId = storeResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        store_id: testStoreId,
        name: 'Original Product',
        description: 'Original description',
        price: '19.99', // Store as string for numeric column
        category: 'Original Category'
      })
      .returning({ id: productsTable.id })
      .execute();
    
    testProductId = productResult[0].id;
  });

  it('should update product name', async () => {
    const input: UpdateProductInput = {
      id: testProductId,
      name: 'Updated Product Name'
    };

    const result = await updateProduct(input);

    expect(result.id).toEqual(testProductId);
    expect(result.name).toEqual('Updated Product Name');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toBe('number');
    expect(result.category).toEqual('Original Category'); // Unchanged
  });

  it('should update product price', async () => {
    const input: UpdateProductInput = {
      id: testProductId,
      price: 29.99
    };

    const result = await updateProduct(input);

    expect(result.price).toEqual(29.99);
    expect(typeof result.price).toBe('number');
    expect(result.name).toEqual('Original Product'); // Unchanged
  });

  it('should update multiple fields', async () => {
    const input: UpdateProductInput = {
      id: testProductId,
      name: 'Multi-Updated Product',
      description: 'New description',
      price: 39.99,
      category: 'New Category',
      image_url: 'https://example.com/image.jpg',
      is_available: false
    };

    const result = await updateProduct(input);

    expect(result.name).toEqual('Multi-Updated Product');
    expect(result.description).toEqual('New description');
    expect(result.price).toEqual(39.99);
    expect(typeof result.price).toBe('number');
    expect(result.category).toEqual('New Category');
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.is_available).toEqual(false);
  });

  it('should handle null values', async () => {
    const input: UpdateProductInput = {
      id: testProductId,
      description: null,
      image_url: null
    };

    const result = await updateProduct(input);

    expect(result.description).toBeNull();
    expect(result.image_url).toBeNull();
    expect(result.name).toEqual('Original Product'); // Unchanged
  });

  it('should update updated_at timestamp', async () => {
    const beforeUpdate = new Date();
    
    const input: UpdateProductInput = {
      id: testProductId,
      name: 'Timestamp Test'
    };

    const result = await updateProduct(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  it('should save updates to database', async () => {
    const input: UpdateProductInput = {
      id: testProductId,
      name: 'Database Test Product',
      price: 49.99
    };

    await updateProduct(input);

    // Verify changes persisted to database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Test Product');
    expect(parseFloat(products[0].price)).toEqual(49.99);
  });

  it('should throw error for non-existent product', async () => {
    const input: UpdateProductInput = {
      id: 99999,
      name: 'Non-existent Product'
    };

    await expect(updateProduct(input)).rejects.toThrow(/not found/i);
  });
});
