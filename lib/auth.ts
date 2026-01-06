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

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify email",
          prompt: "none",
        },
      },
      token: {
        url: "https://discord.com/api/oauth2/token",
      },
      userinfo: {
        url: "https://discord.com/api/users/@me",
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
        
        console.log("[AUTH] SignIn callback started", { 
          hasProfile: !!profile, 
          profileId: discordProfile?.id 
        });

        if (!discordProfile?.id) {
          console.error("[AUTH] No Discord profile ID");
          return false;
        }

        const discordId = discordProfile.id;
        const masterDiscordId = process.env.MASTER_DISCORD_ID;

        console.log("[AUTH] Checking authorization", { 
          discordId, 
          masterDiscordId,
          matches: discordId === masterDiscordId 
        });

        // Only allow master admin
        if (discordId !== masterDiscordId) {
          console.error("[AUTH] User not authorized");
          return "/login?error=not_allowed";
        }

        // Connect to DB and create/update user
        console.log("[AUTH] Connecting to database");
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
          console.log("[AUTH] User updated successfully");
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
          console.log("[AUTH] User created successfully");
        }

        return true;
      } catch (error) {
        console.error("[AUTH] SignIn callback error:", error);
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
