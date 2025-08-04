
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput, type User } from '../schema';

export const registerUser = async (input: RegisterUserInput): Promise<User> => {
  try {
    // Hash the password using Bun's built-in bcrypt
    const password_hash = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: password_hash,
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    return user;
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};
