
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<{ token: string; user: Omit<User, 'password_hash'> }> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is not active');
    }

    // In a real implementation, you would verify the password hash here
    // For this implementation, we'll do a simple string comparison
    // Note: In production, use bcrypt.compare(input.password, user.password_hash)
    if (input.password !== user.password_hash) {
      throw new Error('Invalid email or password');
    }

    // Generate a simple token (in production, use JWT)
    const token = `token-${user.id}-${Date.now()}`;

    // Return user data without password hash
    const { password_hash, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};
