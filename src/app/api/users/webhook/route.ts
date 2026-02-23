import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { notifyAdmins } from "@/lib/admin-notify";

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.CLERK_SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    console.error("CLERK_SIGNING_SECRET is missing in env");
    return new Response("Server configuration error", { status: 500 });
  }

  // Create new Svix instance with the signing secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  // Validate headers
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  // Get the raw JSON body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  // Verify payload with Svix
  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Verification failed", { status: 400 });
  }

  const eventType = evt.type;
  console.log(`Received webhook: ${eventType} for user: ${evt.data.id}`);

  // Handle user.created
  if (eventType === "user.created") {
    try {
      const data = evt.data as {
        id: string;
        first_name: string;
        last_name: string;
        image_url?: string;
      };

      await db.insert(users).values({
        clerkId: data.id,
        name: `${data.first_name} ${data.last_name}`,
        imageURL: data.image_url || "",
      });

      // Notify admins about new user signup
      try {
        await notifyAdmins(db, {
          type: "new_user_signup",
          priority: "low",
          title: "New user signed up",
          message: `${data.first_name} ${data.last_name} just joined NepTube`,
          link: `/admin/users`,
          targetType: "user",
          metadata: { clerkId: data.id, name: `${data.first_name} ${data.last_name}` },
        });
      } catch (err) {
        console.error("Failed to send admin notification for new user:", err);
      }

      console.log(`User created: ${data.id}`);
    } catch (err) {
      console.error("Error inserting user:", err);
      return new Response("Database error", { status: 500 });
    }
  }

  // Handle user.deleted
  if (eventType === "user.deleted") {
    try {
      const data = evt.data as { id: string };
      await db.delete(users).where(eq(users.clerkId, data.id));
      console.log(`User deleted: ${data.id}`);
    } catch (err) {
      console.error("Error deleting user:", err);
      return new Response("Database error", { status: 500 });
    }
  }

  // Return 200 OK
  return new Response("Webhook received", { status: 200 });
}
