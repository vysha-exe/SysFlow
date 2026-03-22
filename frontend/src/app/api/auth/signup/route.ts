import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { ensureUserSystem } from "@/lib/accounts";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existing = await UserModel.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);
    const user = await UserModel.create({
      email,
      name,
      passwordHash,
      provider: "credentials",
    });

    await ensureUserSystem(String(user._id), user.name, user.email);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isMongo =
      msg.includes("Mongo") ||
      msg.includes("querySrv") ||
      msg.includes("whitelist") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND");

    return NextResponse.json(
      {
        error: isMongo
          ? "Cannot reach the database. Check MONGODB_URI and Atlas → Network Access (add your IP or 0.0.0.0/0 for testing)."
          : "Something went wrong creating your account.",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: isMongo ? 503 : 500 },
    );
  }
}
