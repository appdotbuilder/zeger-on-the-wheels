
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, storesTable, productsTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const results = await getProducts();
    expect(results).toEqual([]);
  });

  it('should return all products when no store filter is provided', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'store_staff'
      })
      .returning()
      .execute();

    // Create test stores
    const store1 = await db.insert(storesTable)
      .values({
        owner_id: user[0].id,
        name: 'Store 1',
        address: '123 Main St',
        operating_hours: '{"monday": "9-5"}'
      })
      .returning()
      .execute();

    const store2 = await db.insert(storesTable)
      .values({
        owner_id: user[0].id,
        name: 'Store 2',
        address: '456 Oak Ave',
        operating_hours: '{"monday": "10-6"}'
      })
      .returning()
      .execute();

    // Create products in different stores
    await db.insert(productsTable)
      .values([
        {
          store_id: store1[0].id,
          name: 'Product 1',
          price: '19.99',
          category: 'Food'
        },
        {
          store_id: store2[0].id,
          name: 'Product 2',
          price: '29.99',
          category: 'Beverage'
        }
      ])
      .execute();

    const results = await getProducts();

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Product 1');
    expect(results[0].price).toBe(19.99);
    expect(typeof results[0].price).toBe('number');
    expect(results[1].name).toBe('Product 2');
    expect(results[1].price).toBe(29.99);
    expect(typeof results[1].price).toBe('number');
  });

  it('should return products for specific store when store_id is provided', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'store_staff'
      })
      .returning()
      .execute();

    // Create test stores
    const store1 = await db.insert(storesTable)
      .values({
        owner_id: user[0].id,
        name: 'Store 1',
        address: '123 Main St',
        operating_hours: '{"monday": "9-5"}'
      })
      .returning()
      .execute();

    const store2 = await db.insert(storesTable)
      .values({
        owner_id: user[0].id,
        name: 'Store 2',
        address: '456 Oak Ave',
        operating_hours: '{"monday": "10-6"}'
      })
      .returning()
      .execute();

    // Create products in different stores
    await db.insert(productsTable)
      .values([
        {
          store_id: store1[0].id,
          name: 'Store 1 Product',
          price: '15.50',
          category: 'Food'
        },
        {
          store_id: store2[0].id,
          name: 'Store 2 Product',
          price: '25.00',
          category: 'Beverage'
        }
      ])
      .execute();

    const results = await getProducts(store1[0].id);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Store 1 Product');
    expect(results[0].store_id).toBe(store1[0].id);
    expect(results[0].price).toBe(15.50);
    expect(typeof results[0].price).toBe('number');
  });

  it('should return empty array for non-existent store', async () => {
    const results = await getProducts(999);
    expect(results).toEqual([]);
  });

  it('should return products with all expected fields', async () => {
    // Create test user and store
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'store_staff'
      })
      .returning()
      .execute();

    const store = await db.insert(storesTable)
      .values({
        owner_id: user[0].id,
        name: 'Test Store',
        address: '123 Test St',
        operating_hours: '{"monday": "9-5"}'
      })
      .returning()
      .execute();

    // Create product with all fields
    await db.insert(productsTable)
      .values({
        store_id: store[0].id,
        name: 'Test Product',
        description: 'A test product',
        price: '12.99',
        category: 'Test Category',
        image_url: 'https://example.com/image.jpg',
        is_available: false
      })
      .execute();

    const results = await getProducts();

    expect(results).toHaveLength(1);
    const product = results[0];
    
    expect(product.id).toBeDefined();
    expect(product.store_id).toBe(store[0].id);
    expect(product.name).toBe('Test Product');
    expect(product.description).toBe('A test product');
    expect(product.price).toBe(12.99);
    expect(typeof product.price).toBe('number');
    expect(product.category).toBe('Test Category');
    expect(product.image_url).toBe('https://example.com/image.jpg');
    expect(product.is_available).toBe(false);
    expect(product.created_at).toBeInstanceOf(Date);
    expect(product.updated_at).toBeInstanceOf(Date);
  });

  it('should handle products with nullable fields', async () => {
    // Create test user and store
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'store_staff'
      })
      .returning()
      .execute();

    const store = await db.insert(storesTable)
      .values({
        owner_id: user[0].id,
        name: 'Test Store',
        address: '123 Test St',
        operating_hours: '{"monday": "9-5"}'
      })
      .returning()
      .execute();

    // Create product with minimal required fields
    await db.insert(productsTable)
      .values({
        store_id: store[0].id,
        name: 'Minimal Product',
        price: '5.00',
        category: 'Basic'
        // description and image_url are null
      })
      .execute();

    const results = await getProducts();

    expect(results).toHaveLength(1);
    const product = results[0];
    
    expect(product.name).toBe('Minimal Product');
    expect(product.description).toBeNull();
    expect(product.image_url).toBeNull();
    expect(product.price).toBe(5.00);
    expect(product.is_available).toBe(true); // Default value
  });
});
