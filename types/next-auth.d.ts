import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      discordId?: string;
      role?: "admin" | "user";
      isApproved?: boolean;
    };
  }

  interface User {
    discordId?: string;
    role?: "admin" | "user";
    isApproved?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
    role?: "admin" | "user";
    isApproved?: boolean;
  }
}
