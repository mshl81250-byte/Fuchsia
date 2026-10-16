import { createSign } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, partnerPushTokensTable } from "@workspace/db";

type PartnerPushInput = {
  recipientUserId: number;
  bookingType?: string | null;
  bookingId?: number | null;
  requestId?: number | null;
  type: string;
  title: string;
  message: string;
};

type ServiceAccountConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function getConfig(): ServiceAccountConfig | null {
  const projectId = process.env.FCM_PROJECT_ID?.trim();
  const clientEmail = process.env.FCM_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

async function getAccessToken(config: ServiceAccountConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify({
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${encodeBase64Url(signer.sign(config.privateKey))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`FCM OAuth token request failed with status ${response.status}`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("FCM OAuth response did not include an access token");
  return body.access_token;
}

export async function dispatchPartnerPushNotification(input: PartnerPushInput): Promise<void> {
  const config = getConfig();
  if (!config || !Number.isInteger(input.recipientUserId) || input.recipientUserId < 1) return;

  const tokens = await db.select({ id: partnerPushTokensTable.id, token: partnerPushTokensTable.token })
    .from(partnerPushTokensTable)
    .where(eq(partnerPushTokensTable.userId, input.recipientUserId));
  if (tokens.length === 0) return;

  let accessToken: string;
  try {
    accessToken = await getAccessToken(config);
  } catch (error) {
    console.error("FCM access token creation failed", error);
    return;
  }

  await Promise.all(tokens.map(async ({ id, token }) => {
    try {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: input.title, body: input.message },
            data: {
              type: input.type,
              bookingType: input.bookingType ?? "",
              bookingId: String(input.bookingId ?? ""),
              requestId: String(input.requestId ?? ""),
            },
            android: { priority: "high", notification: { channel_id: "partner_orders" } },
          },
        }),
      });
      if (response.ok) return;
      if (response.status === 400 || response.status === 404) {
        await db.delete(partnerPushTokensTable).where(and(eq(partnerPushTokensTable.id, id), eq(partnerPushTokensTable.userId, input.recipientUserId)));
      } else {
        console.error("FCM message delivery failed", { status: response.status, userId: input.recipientUserId });
      }
    } catch (error) {
      console.error("FCM message delivery failed", { error, userId: input.recipientUserId });
    }
  }));
}
