import { User } from './user.entity';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  googleId: string | null;
  createdAt: Date;
  // Temporary bypass fields — remove when subscriptions are implemented
  plan: 'free' | 'basic' | 'advanced';
  credits: number;
  maxCredits: number;
  extraCredits: number;
}

export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    googleId: user.googleId,
    createdAt: user.createdAt,
    // Bypass: grant advanced plan with full credits
    plan: 'advanced',
    credits: 1000,
    maxCredits: 1000,
    extraCredits: 0,
  };
}
