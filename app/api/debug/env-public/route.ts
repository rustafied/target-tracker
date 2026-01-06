import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasDiscordClientId: !!process.env.DISCORD_CLIENT_ID,
    discordClientIdPrefix: process.env.DISCORD_CLIENT_ID?.substring(0, 8) + "...",
    hasDiscordClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
    discordClientSecretPrefix: process.env.DISCORD_CLIENT_SECRET?.substring(0, 8) + "...",
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasMasterDiscordId: !!process.env.MASTER_DISCORD_ID,
    masterDiscordIdValue: process.env.MASTER_DISCORD_ID,
    hasMongoUri: !!process.env.MONGODB_URI,
    nodeEnv: process.env.NODE_ENV,
  });
}
