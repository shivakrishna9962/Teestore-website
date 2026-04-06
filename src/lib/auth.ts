import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from './db';
import UserModel from '../models/User';
import { verifyOtp } from './otp';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectToDatabase();
        const user = await UserModel.findOne({ email: credentials.email });
        if (!user || !user.password) return null;
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      id: 'mobile-otp',
      name: 'mobile-otp',
      credentials: {
        mobileNumber: { label: 'Mobile Number', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.mobileNumber || !credentials?.otp) return null;
        const result = await verifyOtp(credentials.mobileNumber, credentials.otp);
        if (!result.ok || !result.userId) return null;
        await connectToDatabase();
        const user = await UserModel.findById(result.userId).select('_id name email role status mobileNumber');
        if (!user) return null;
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email ?? null,
          role: user.role,
          status: user.status,
          mobileNumber: user.mobileNumber,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await connectToDatabase();
        let dbUser = await UserModel.findOne({ email: user.email });
        if (!dbUser) {
          dbUser = await UserModel.create({
            name: user.name,
            email: user.email,
            oauthProvider: 'google',
            oauthId: account.providerAccountId,
            role: 'user',
            status: 'active',
            marketingOptOut: false,
          });
        }
        // Set user.id to the MongoDB _id so token.sub is correct
        user.id = dbUser._id.toString();
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.status = (user as any).status;
        if ((user as any).id) {
          token.sub = (user as any).id;
        }
        if ((user as any).mobileNumber !== undefined) {
          token.mobileNumber = (user as any).mobileNumber;
        }
      }
      // Re-fetch status on each token refresh to catch suspensions
      if (!user) {
        await connectToDatabase();
        if (token.email) {
          // Email-based users (credentials or Google)
          const dbUser = await UserModel.findOne({ email: token.email }).select('_id role status mobileNumber');
          if (dbUser) {
            token.role = dbUser.role;
            token.status = dbUser.status;
            token.mobileNumber = dbUser.mobileNumber ?? null;
            // Ensure token.sub always reflects the MongoDB _id
            if (!token.sub || token.sub !== dbUser._id.toString()) {
              token.sub = dbUser._id.toString();
            }
          }
        } else if (token.sub) {
          // Mobile-only users (no email) — look up by MongoDB _id stored in token.sub
          const dbUser = await UserModel.findById(token.sub).select('_id role status mobileNumber');
          if (dbUser) {
            token.role = dbUser.role;
            token.status = dbUser.status;
            token.mobileNumber = dbUser.mobileNumber ?? null;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
        (session.user as any).id = token.sub;
        (session.user as any).mobileNumber = token.mobileNumber ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
