import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { supabase } from "./supabase";
import type { User } from "./supabase";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Passport configuration
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// JWT utilities
export const generateToken = (user: User): string => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      username: user.username 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePasswords = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Supabase Auth integration
export const createSupabaseUser = async (userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}): Promise<User> => {
  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      first_name: userData.firstName,
      last_name: userData.lastName,
      username: userData.username
    }
  });

  if (authError) throw authError;

  // Create user profile in our users table
  const hashedPassword = await hashPassword(userData.password);
  const user = await storage.createUser({
    id: authData.user.id,
    email: userData.email,
    password: hashedPassword,
    first_name: userData.firstName,
    last_name: userData.lastName,
    username: userData.username,
    avatar: null
  });

  return user;
};