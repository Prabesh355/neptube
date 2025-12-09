import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// This route should be deleted after first use!
// Visit: http://localhost:3000/api/setup-admin
export async function GET() {
  const clerkId = "user_36YIVVx0ihzEX4jo0JG59DEKzsB";

  try {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (existingUser[0]) {
      // Update to admin
      await db
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.clerkId, clerkId));

      return NextResponse.json({
        success: true,
        message: `User ${clerkId} is now an ADMIN!`,
        user: existingUser[0].name,
      });
    } else {
      // Create admin user
      const newUser = await db
        .insert(users)
        .values({
          clerkId: clerkId,
          name: "Admin",
          role: "admin",
          imageURL: "",
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: `Created new ADMIN user: ${clerkId}`,
        user: newUser[0],
      });
    }
  } catch (error) {
    console.error("Error setting up admin:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
