import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { connectToDatabase } from "./db";
import { User } from "./models/User";

interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
}

// Validate env vars
if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
  throw new Error("Missing Discord OAuth credentials");
}
if (!process.env.NEXTAUTH_URL) {
  throw new Error("Missing NEXTAUTH_URL");
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("Missing NEXTAUTH_SECRET");
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "identify email",
        },
      },
      httpOptions: {
        timeout: 10000,
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const discordProfile = profile as DiscordProfile;
        
        if (!discordProfile?.id) {
          return false;
        }

        const discordId = discordProfile.id;
        const masterDiscordId = process.env.MASTER_DISCORD_ID;

        // Only allow master admin
        if (discordId !== masterDiscordId) {
          return "/login?error=not_allowed";
        }

        // Connect to DB and create/update user
        await connectToDatabase();

        const existingUser = await User.findOne({ discordId });

        if (existingUser) {
          // Update existing user
          existingUser.username = discordProfile.username;
          existingUser.discriminator = discordProfile.discriminator;
          existingUser.avatar = discordProfile.avatar;
          existingUser.isApproved = true;
          existingUser.role = "admin";
          existingUser.lastLoginAt = new Date();
          await existingUser.save();
        } else {
          // Create new user
          await User.create({
            discordId,
            username: discordProfile.username,
            discriminator: discordProfile.discriminator,
            avatar: discordProfile.avatar,
            isApproved: true,
            role: "admin",
            lastLoginAt: new Date(),
          });
        }

        return true;
      } catch (error) {
        return false;
      }
    },
    async jwt({ token, profile, account }) {
      const discordProfile = profile as DiscordProfile;
      if (discordProfile?.id) {
        token.discordId = discordProfile.id;
        token.role = "admin";
        token.isApproved = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).discordId = token.discordId;
        (session.user as any).role = token.role;
        (session.user as any).isApproved = token.isApproved;
      }
      return session;
    },
  },
};
