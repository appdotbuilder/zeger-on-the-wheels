
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'testpassword123',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  role: 'store_staff'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.phone).toEqual('+1234567890');
    expect(result.role).toEqual('store_staff');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed, not plain text
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('testpassword123');
    expect(result.password_hash.length).toBeGreaterThan(20);
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].phone).toEqual('+1234567890');
    expect(users[0].role).toEqual('store_staff');
    expect(users[0].is_active).toBe(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password correctly', async () => {
    const result = await registerUser(testInput);

    // Verify password was hashed using Bun's bcrypt
    const isValidPassword = await Bun.password.verify('testpassword123', result.password_hash);
    expect(isValidPassword).toBe(true);

    // Verify wrong password fails
    const isInvalidPassword = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalidPassword).toBe(false);
  });

  it('should handle user with null phone', async () => {
    const inputWithNullPhone: RegisterUserInput = {
      ...testInput,
      phone: null
    };

    const result = await registerUser(inputWithNullPhone);

    expect(result.phone).toBeNull();
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
  });

  it('should register administrator role', async () => {
    const adminInput: RegisterUserInput = {
      ...testInput,
      email: 'admin@example.com',
      role: 'administrator'
    };

    const result = await registerUser(adminInput);

    expect(result.role).toEqual('administrator');
    expect(result.email).toEqual('admin@example.com');
  });

  it('should register rider_seller role', async () => {
    const riderInput: RegisterUserInput = {
      ...testInput,
      email: 'rider@example.com',
      role: 'rider_seller'
    };

    const result = await registerUser(riderInput);

    expect(result.role).toEqual('rider_seller');
    expect(result.email).toEqual('rider@example.com');
  });
});
