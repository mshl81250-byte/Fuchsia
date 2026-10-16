import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface PublicImageUpload {
  key: string;
  body: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
}

interface StorageConfig {
  client: S3Client;
  bucket: string;
  publicBaseUrl: string;
}

let cachedClient: S3Client | undefined;
let cachedSignature = "";

function requiredEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

function readStorageConfig(): StorageConfig {
  const bucket = requiredEnv("OBJECT_STORAGE_BUCKET");
  const publicBaseUrl = requiredEnv("OBJECT_STORAGE_PUBLIC_BASE_URL").replace(/\/+$/, "");
  const endpoint = requiredEnv("OBJECT_STORAGE_ENDPOINT");
  const region = requiredEnv("OBJECT_STORAGE_REGION") || "auto";
  const accessKeyId = requiredEnv("OBJECT_STORAGE_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("OBJECT_STORAGE_SECRET_ACCESS_KEY");

  if (!bucket || !publicBaseUrl) {
    throw new Error("Object storage is not configured: bucket and public base URL are required");
  }
  let publicUrl: URL;
  try { publicUrl = new URL(publicBaseUrl); } catch { throw new Error("Object storage public base URL is invalid"); }
  if (publicUrl.protocol !== "https:" || publicUrl.search || publicUrl.hash) {
    throw new Error("Object storage public base URL must be an HTTPS base URL without query or fragment");
  }
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error("Both object storage access key and secret key must be configured together");
  }
  if (endpoint && (!accessKeyId || !secretAccessKey)) {
    throw new Error("Custom S3-compatible endpoints require access and secret keys");
  }

  const signature = [endpoint, region, accessKeyId, secretAccessKey].join("\u0000");
  if (!cachedClient || signature !== cachedSignature) {
    cachedClient?.destroy();
    cachedClient = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle: Boolean(endpoint),
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
    cachedSignature = signature;
  }

  return { client: cachedClient, bucket, publicBaseUrl };
}

export async function uploadPublicImage(input: PublicImageUpload): Promise<string> {
  const { client, bucket, publicBaseUrl } = readStorageConfig();
  const key = input.key.split("/").map(encodeURIComponent).join("/");
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${publicBaseUrl}/${key}`;
}
