export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  oauthProvider?: 'google';
  oauthId?: string;
  marketingOptOut: boolean;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt?: Date;
}
