import * as jose from "jose";
import prisma from "./prisma";

const googleEmail = import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const googleKey = import.meta.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;

if (!googleEmail || !googleKey) {
  console.error("❌ ERROR: Google Drive environment variables missing!");
}

const ROOT_ID = import.meta.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

export interface DriveItem {
  id: string;
  name: string;
  mimeType?: string;
  webContentLink?: string;
}

// --- PERSISTENT CACHE (DATABASE) ---
async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cache = await prisma.driveCache.findUnique({
      where: { key },
    });
    if (cache && cache.expiresAt > new Date()) {
      console.log(`[DRIVE CACHE] Hit: ${key}`);
      return cache.value as T;
    }
    return null;
  } catch (e) {
    console.error("Cache Read Error:", e);
    return null;
  }
}

async function setCachedData(key: string, data: any, ttlSeconds: number = 3600): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await prisma.driveCache.upsert({
      where: { key },
      update: {
        value: data,
        expiresAt,
      },
      create: {
        key,
        value: data,
        expiresAt,
      },
    });
  } catch (e) {
    console.error("Cache Write Error:", e);
  }
}

async function getAccessToken(): Promise<string> {
  const cacheKey = "google_access_token";
  const cached = await getCachedData<string>(cacheKey);
  if (cached) return cached;

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const key = await jose.importPKCS8(googleKey!.replace(/\\n/g, "\n"), "RS256");

  const jwt = await new jose.SignJWT({
    iss: googleEmail,
    sub: googleEmail,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to get Google Access Token: ${JSON.stringify(data)}`);
  }

  const token = data.access_token;
  // Cache token dengan sedikit buffer (minus 60 detik)
  await setCachedData(cacheKey, token, data.expires_in - 60);
  return token;
}

export async function getFolders(parentId: string): Promise<DriveItem[]> {
  const cacheKey = `folders_${parentId}`;
  const cached = await getCachedData<DriveItem[]>(cacheKey);
  if (cached) return cached;

  const accessToken = await getAccessToken();
  const q = encodeURIComponent(`'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const fields = "files(id, name)";
  const orderBy = "name desc";
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=${orderBy}`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();
  const folders = (data.files as DriveItem[]) || [];
  await setCachedData(cacheKey, folders);
  return folders;
}

export async function getMediaFiles(
  folderId: string,
  pageToken?: string | null,
  limit: number = 4,
): Promise<{ files: DriveItem[]; nextPageToken: string | null }> {
  const cacheKey = `media_${folderId}_${pageToken || 'first'}_${limit}`;
  const cached = await getCachedData<{ files: DriveItem[]; nextPageToken: string | null }>(cacheKey);
  if (cached) return cached;

  try {
    const accessToken = await getAccessToken();
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = "nextPageToken, files(id, name, mimeType, webContentLink)";
    const pageSize = limit;
    
    let url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=${pageSize}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    const result = {
      files: (data.files as DriveItem[]) || [],
      nextPageToken: data.nextPageToken || null,
    };
    
    await setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching media files:", error);
    throw error;
  }
}

/**
 * Mengambil foto terbaru secara global (diurutkan berdasarkan waktu pembuatan)
 */
export async function getLatestMedia(limit: number = 4): Promise<DriveItem[]> {
  const cacheKey = `latest_media_${limit}`;
  const cached = await getCachedData<DriveItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const accessToken = await getAccessToken();
    const q = encodeURIComponent("mimeType contains 'image/' and trashed = false");
    const fields = "files(id, name, webContentLink)";
    const orderBy = "createdTime desc";
    const pageSize = limit;

    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=${orderBy}&pageSize=${pageSize}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    const files = (data.files as DriveItem[]) || [];
    await setCachedData(cacheKey, files);
    return files;
  } catch (error) {
    console.error("Error fetching latest media:", error);
    return [];
  }
}

export async function getArchiveNavigation(
  yearId?: string | null,
  monthId?: string | null,
  activityId?: string | null,
): Promise<{ data: DriveItem[]; view: string; baseUrl: string }> {
  try {
    let data: DriveItem[] = [];
    let view = "years";
    let baseUrl = "?yearId=";

    if (activityId) {
      view = "files";
      return { data: [], view, baseUrl: "" };
    }

    if (monthId && yearId) {
      data = await getFolders(monthId);
      view = "activities";
      baseUrl = `?yearId=${yearId}&monthId=${monthId}&activityId=`;
    } else if (yearId) {
      data = await getFolders(yearId);
      view = "months";
      baseUrl = `?yearId=${yearId}&monthId=`;
    } else {
      data = await getFolders(ROOT_ID);
      view = "years";
      baseUrl = "?yearId=";
    }

    return { data, view, baseUrl };
  } catch (error) {
    console.error("Fungsi getArchiveNavigation Error:", error);
    throw new Error("Gagal mengambil struktur arsip.");
  }
}
