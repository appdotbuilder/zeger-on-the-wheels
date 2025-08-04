
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'plaintext-password', // In production, this would be a bcrypt hash
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890',
  role: 'store_staff' as const,
  is_active: true
};

const testInput: LoginInput = {
  email: 'test@example.com',
  password: 'plaintext-password'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser(testInput);

    // Verify token format
    expect(result.token).toMatch(/^token-\d+-\d+$/);
    
    // Verify user data (without password hash)
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.first_name).toEqual('John');
    expect(result.user.last_name).toEqual('Doe');
    expect(result.user.phone).toEqual('+1234567890');
    expect(result.user.role).toEqual('store_staff');
    expect(result.user.is_active).toEqual(true);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify password hash is not included
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('should reject login with invalid email', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const invalidInput: LoginInput = {
      email: 'wrong@example.com',
      password: 'plaintext-password'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login with invalid password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const invalidInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrong-password'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login for inactive user', async () => {
    // Create inactive test user
    await db.insert(usersTable)
      .values({
        ...testUser,
        is_active: false
      })
      .execute();

    await expect(loginUser(testInput)).rejects.toThrow(/user account is not active/i);
  });

  it('should reject login when user does not exist', async () => {
    // No user created in database

    await expect(loginUser(testInput)).rejects.toThrow(/invalid email or password/i);
  });
});
