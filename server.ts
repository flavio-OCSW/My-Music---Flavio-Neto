import "dotenv/config";
import express, { type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  FAVORITE_ALBUMS,
  type AlbumSeed,
  type AlbumState,
  type EnrichedAlbumData,
  type GroundingSource,
  type StreamingLinks,
} from "./src/data/albums.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const CACHE_DIR = path.resolve(__dirname, "data");
const CACHE_FILE = path.join(CACHE_DIR, "album-cache.json");

interface CachedTrackSeed {
  number: number;
  title: string;
  duration: string;
}

interface CachedCover {
  rawUrl: string;
  source: string;
  appleMusicUrl?: string;
  deezerUrl?: string;
  releaseYear?: string;
  genre?: string;
  tracks?: CachedTrackSeed[];
  updatedAt: string;
}

interface DiskCache {
  covers: Record<string, CachedCover>;
  enriched: Record<string, EnrichedAlbumData>;
}

function loadCache(): DiskCache {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Partial<DiskCache>;
      return {
        covers: parsed.covers ?? {},
        enriched: parsed.enriched ?? {},
      };
    }
  } catch (err) {
    console.warn("Could not read album cache, starting fresh:", err);
  }
  return { covers: {}, enriched: {} };
}

let cacheWriteChain: Promise<void> = Promise.resolve();
const diskCache: DiskCache = loadCache();

function persistCache(): void {
  cacheWriteChain = cacheWriteChain
    .then(async () => {
      await fs.promises.mkdir(CACHE_DIR, { recursive: true });
      await fs.promises.writeFile(
        CACHE_FILE,
        JSON.stringify(diskCache, null, 2),
        "utf-8"
      );
    })
    .catch((err) => {
      console.error("Failed to persist album cache:", err);
    });
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  console.error("[Gemini Error]", err);
  if (
    raw.includes("429") ||
    raw.includes("RESOURCE_EXHAUSTED") ||
    raw.toLowerCase().includes("quota")
  ) {
    return {
      status: 429,
      message:
        "Gemini API quota or rate limit reached (429). Please wait a moment and try again, or select a billing-enabled API key in Settings > Secrets.",
    };
  }
  if (
    raw.includes("403") ||
    raw.includes("PERMISSION_DENIED") ||
    raw.includes("API_KEY_INVALID")
  ) {
    return {
      status: 403,
      message:
        "Gemini API key was rejected or lacks permission. Please verify your key in Settings > Secrets.",
    };
  }
  if (
    raw.includes("503") ||
    raw.includes("UNAVAILABLE") ||
    raw.toLowerCase().includes("high demand")
  ) {
    return {
      status: 503,
      message:
        "Gemini is experiencing temporary high demand (503). Please wait a few seconds and click Retry.",
    };
  }
  if (raw.includes("GEMINI_API_KEY")) {
    return { status: 503, message: raw };
  }
  return {
    status: 502,
    message: `Gemini request failed: ${raw.slice(0, 180)}`,
  };
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Never retry hard quota exhaustion or invalid-key errors
      const isHardQuota =
        msg.toLowerCase().includes("exceeded your current quota") ||
        msg.toLowerCase().includes("plan and billing") ||
        msg.includes("API_KEY_INVALID") ||
        msg.includes("PERMISSION_DENIED");
      const isTransient =
        !isHardQuota &&
        (msg.includes("503") ||
          msg.includes("500") ||
          msg.includes("UNAVAILABLE"));
      if (!isTransient || attempt === retries) {
        throw err;
      }
      const delayMs = 900 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(
  candidateArtist: string,
  candidateAlbum: string,
  targetArtist: string,
  targetAlbum: string
): number {
  const ca = normalizeForMatch(candidateArtist);
  const cb = normalizeForMatch(candidateAlbum);
  const ta = normalizeForMatch(targetArtist);
  const tb = normalizeForMatch(targetAlbum);

  let score = 0;
  if (ca === ta) score += 60;
  else if (ca.includes(ta) || ta.includes(ca)) score += 35;
  else {
    const taWords = ta.split(" ");
    const hits = taWords.filter((w) => w.length > 2 && ca.includes(w)).length;
    score += hits * 10;
  }

  if (cb === tb) score += 70;
  else if (cb.startsWith(tb)) score += 45;
  else if (cb.includes(tb) || tb.includes(cb)) score += 30;
  else {
    const tbWords = tb.split(" ");
    const hits = tbWords.filter((w) => w.length > 2 && cb.includes(w)).length;
    score += hits * 10;
  }

  const penaltyTerms = [
    "ep",
    "live",
    "single",
    "karaoke",
    "tribute",
    "instrumental",
    "2020",
  ];
  for (const term of penaltyTerms) {
    if (cb.split(" ").includes(term) && !tb.split(" ").includes(term)) {
      score -= 35;
    }
  }

  for (const editionTerm of ["anniversary", "deluxe", "remastered"]) {
    if (cb.split(" ").includes(editionTerm) && !tb.split(" ").includes(editionTerm)) {
      score -= 15;
    }
  }

  return score;
}

function formatMsDuration(ms?: number): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "--:--";
  const totalSec = Math.round(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSecDuration(sec?: number): string {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return "--:--";
  const mins = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

async function fetchJsonWithTimeout<T>(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 7000
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SoftwaveTop20/1.0 (https://aistudio.google.com)",
        ...headers,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function verifyImageUrl(url: string): Promise<boolean> {
  if (!url.startsWith("https://")) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SoftwaveTop20/1.0)",
      },
    });
    const contentType = res.headers.get("content-type") || "";
    return res.ok && contentType.startsWith("image/");
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

interface ITunesResult {
  results?: Array<{
    wrapperType?: string;
    collectionId?: number;
    artistName?: string;
    collectionName?: string;
    artworkUrl100?: string;
    collectionViewUrl?: string;
    releaseDate?: string;
    primaryGenreName?: string;
    trackName?: string;
    trackNumber?: number;
    trackTimeMillis?: number;
  }>;
}

async function searchITunes(
  artist: string,
  album: string
): Promise<{
  coverUrl?: string;
  appleMusicUrl?: string;
  releaseYear?: string;
  genre?: string;
  tracks?: CachedTrackSeed[];
}> {
  const cleanAlbum = album.replace(/OST\s*1:\s*/i, "").replace(/[^\w\s]/g, " ");
  const queries = [
    `${artist} ${album}`,
    `${artist} ${cleanAlbum}`,
    album === "FLCL OST 1: Addict" ? "the pillows FLCL" : "",
  ].filter(Boolean);

  for (const q of queries) {
    const data = await fetchJsonWithTimeout<ITunesResult>(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=8`
    );
    if (!data?.results?.length) continue;

    let best: NonNullable<ITunesResult["results"]>[number] | null = null;
    let bestScore = 0;

    for (const item of data.results) {
      const s = scoreMatch(
        item.artistName ?? "",
        item.collectionName ?? "",
        artist,
        album
      );
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    }

    if (best && bestScore >= 45 && best.artworkUrl100) {
      const highRes = best.artworkUrl100
        .replace("100x100bb", "600x600bb")
        .replace("http://", "https://");

      let tracks: CachedTrackSeed[] | undefined;
      if (best.collectionId) {
        const lookup = await fetchJsonWithTimeout<ITunesResult>(
          `https://itunes.apple.com/lookup?id=${best.collectionId}&entity=song`
        );
        const songRows = (lookup?.results ?? []).filter(
          (r) => r.wrapperType === "track" && r.trackName
        );
        if (songRows.length > 0) {
          tracks = songRows.map((r, idx) => ({
            number: r.trackNumber ?? idx + 1,
            title: r.trackName ?? `Track ${idx + 1}`,
            duration: formatMsDuration(r.trackTimeMillis),
          }));
        }
      }

      return {
        coverUrl: highRes,
        appleMusicUrl: best.collectionViewUrl,
        releaseYear: best.releaseDate ? best.releaseDate.slice(0, 4) : undefined,
        genre: best.primaryGenreName,
        tracks,
      };
    }
  }
  return {};
}

interface DeezerResult {
  data?: Array<{
    id?: number;
    title?: string;
    link?: string;
    cover_xl?: string;
    cover_big?: string;
    artist?: { name?: string };
  }>;
}

interface DeezerAlbumDetail {
  release_date?: string;
  genres?: { data?: Array<{ name?: string }> };
  tracks?: {
    data?: Array<{
      title?: string;
      duration?: number;
      track_position?: number;
    }>;
  };
}

async function searchDeezer(
  artist: string,
  album: string
): Promise<{
  coverUrl?: string;
  deezerUrl?: string;
  releaseYear?: string;
  genre?: string;
  tracks?: CachedTrackSeed[];
}> {
  const queries = [
    `${artist} ${album}`,
    album === "FLCL OST 1: Addict" ? "the pillows FLCL Addict" : "",
  ].filter(Boolean);

  for (const q of queries) {
    const data = await fetchJsonWithTimeout<DeezerResult>(
      `https://api.deezer.com/search/album?q=${encodeURIComponent(q)}&limit=8`
    );
    if (!data?.data?.length) continue;

    let best: NonNullable<DeezerResult["data"]>[number] | null = null;
    let bestScore = 0;
    for (const item of data.data) {
      const s = scoreMatch(
        item.artist?.name ?? "",
        item.title ?? "",
        artist,
        album
      );
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    }

    if (best && bestScore >= 45) {
      const cover = (best.cover_xl || best.cover_big || "").replace(
        "http://",
        "https://"
      );
      let releaseYear: string | undefined;
      let genre: string | undefined;
      let tracks: CachedTrackSeed[] | undefined;

      if (best.id) {
        const detail = await fetchJsonWithTimeout<DeezerAlbumDetail>(
          `https://api.deezer.com/album/${best.id}`
        );
        if (detail?.release_date) {
          releaseYear = detail.release_date.slice(0, 4);
        }
        genre = detail?.genres?.data?.[0]?.name;
        const rows = detail?.tracks?.data ?? [];
        if (rows.length > 0) {
          tracks = rows.map((t, idx) => ({
            number: t.track_position ?? idx + 1,
            title: t.title ?? `Track ${idx + 1}`,
            duration: formatSecDuration(t.duration),
          }));
        }
      }

      if (cover) {
        return {
          coverUrl: cover,
          deezerUrl: best.link,
          releaseYear,
          genre,
          tracks,
        };
      }
    }
  }
  return {};
}

interface MusicBrainzResult {
  "release-groups"?: Array<{
    id: string;
    title?: string;
    "first-release-date"?: string;
    "artist-credit"?: Array<{ name?: string }>;
  }>;
}

async function searchCoverArtArchive(
  artist: string,
  album: string
): Promise<{ coverUrl: string | null; releaseYear?: string }> {
  const queries = [
    `artist:"${artist}" AND releasegroup:"${album}"`,
    `${artist} ${album}`,
  ];

  for (const query of queries) {
    const data = await fetchJsonWithTimeout<MusicBrainzResult>(
      `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=5`
    );
    if (!data?.["release-groups"]?.length) continue;

    for (const rg of data["release-groups"].slice(0, 3)) {
      const rgArtist = rg["artist-credit"]?.[0]?.name ?? "";
      const s = scoreMatch(rgArtist, rg.title ?? "", artist, album);
      if (s >= 40) {
        const candidateUrl = `https://coverartarchive.org/release-group/${rg.id}/front-500`;
        if (await verifyImageUrl(candidateUrl)) {
          return {
            coverUrl: candidateUrl,
            releaseYear: rg["first-release-date"]?.slice(0, 4),
          };
        }
      }
    }
  }
  return { coverUrl: null };
}

interface WikipediaSearchResult {
  query?: {
    search?: Array<{ pageid: number; title: string }>;
    pages?: Record<
      string,
      {
        original?: { source?: string };
        thumbnail?: { source?: string };
      }
    >;
  };
}

async function searchWikipediaCover(
  artist: string,
  album: string
): Promise<string | null> {
  const q = `${album} ${artist} album`;
  const searchRes = await fetchJsonWithTimeout<WikipediaSearchResult>(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=3`
  );
  const topTitle = searchRes?.query?.search?.[0]?.title;
  if (!topTitle) return null;

  const pageRes = await fetchJsonWithTimeout<WikipediaSearchResult>(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(topTitle)}&prop=pageimages&pithumbsize=600&format=json`
  );
  const pages = pageRes?.query?.pages;
  if (!pages) return null;
  const firstPage = Object.values(pages)[0];
  const imgUrl = firstPage?.thumbnail?.source || firstPage?.original?.source;
  if (imgUrl && (await verifyImageUrl(imgUrl))) {
    return imgUrl;
  }
  return null;
}

const ALLOWED_COVER_HOSTS = [
  "mzstatic.com",
  "dzcdn.net",
  "coverartarchive.org",
  "archive.org",
  "lastfm.freetls.fastly.net",
  "upload.wikimedia.org",
  "f4.bcbits.com",
  "i.scdn.co",
  "i.discogs.com",
  "img.discogs.com",
  "m.media-amazon.com",
  "www.metal-archives.com",
];

function isAllowedCoverHost(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_COVER_HOSTS.some(
      (host) =>
        parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

function toProxiedCoverUrl(rawUrl: string): string {
  return `/api/cover-proxy?url=${encodeURIComponent(rawUrl)}`;
}

const inflightCovers = new Map<string, Promise<CachedCover | null>>();

async function resolveAlbumCover(
  seed: AlbumSeed
): Promise<CachedCover | null> {
  const existing = diskCache.covers[seed.id];
  if (existing?.rawUrl) {
    return existing;
  }

  const pending = inflightCovers.get(seed.id);
  if (pending) return pending;

  const task = (async (): Promise<CachedCover | null> => {
    try {
      const [itunesRes, deezerRes] = await Promise.all([
        searchITunes(seed.artist, seed.album),
        searchDeezer(seed.artist, seed.album),
      ]);

      let rawUrl: string | undefined;
      let source = "";
      let caaYear: string | undefined;

      if (itunesRes.coverUrl && (await verifyImageUrl(itunesRes.coverUrl))) {
        rawUrl = itunesRes.coverUrl;
        source = "iTunes";
      } else if (
        deezerRes.coverUrl &&
        (await verifyImageUrl(deezerRes.coverUrl))
      ) {
        rawUrl = deezerRes.coverUrl;
        source = "Deezer";
      } else {
        const caa = await searchCoverArtArchive(seed.artist, seed.album);
        caaYear = caa.releaseYear;
        if (caa.coverUrl) {
          rawUrl = caa.coverUrl;
          source = "Cover Art Archive";
        } else {
          const wikiCover = await searchWikipediaCover(seed.artist, seed.album);
          if (wikiCover) {
            rawUrl = wikiCover;
            source = "Wikipedia";
          }
        }
      }

      const mergedTracks =
        (itunesRes.tracks?.length ? itunesRes.tracks : undefined) ??
        (deezerRes.tracks?.length ? deezerRes.tracks : undefined);

      if (
        !rawUrl &&
        !itunesRes.appleMusicUrl &&
        !deezerRes.deezerUrl &&
        !mergedTracks
      ) {
        return null;
      }

      const cached: CachedCover = {
        rawUrl: rawUrl ?? "",
        source,
        appleMusicUrl: itunesRes.appleMusicUrl,
        deezerUrl: deezerRes.deezerUrl,
        releaseYear: itunesRes.releaseYear ?? deezerRes.releaseYear ?? caaYear,
        genre: itunesRes.genre ?? deezerRes.genre,
        tracks: mergedTracks,
        updatedAt: new Date().toISOString(),
      };

      diskCache.covers[seed.id] = cached;
      persistCache();
      return cached;
    } finally {
      inflightCovers.delete(seed.id);
    }
  })();

  inflightCovers.set(seed.id, task);
  return task;
}

const inflightEnrich = new Map<string, Promise<EnrichedAlbumData>>();

async function enrichAlbumWithGemini(
  seed: AlbumSeed,
  force = false
): Promise<{ cover: CachedCover | null; enriched: EnrichedAlbumData }> {
  const coverPromise = resolveAlbumCover(seed);

  if (!force && diskCache.enriched[seed.id]) {
    const cover = await coverPromise;
    return { cover, enriched: diskCache.enriched[seed.id] };
  }

  const existingTask = !force ? inflightEnrich.get(seed.id) : undefined;
  if (existingTask) {
    const [cover, enriched] = await Promise.all([coverPromise, existingTask]);
    return { cover, enriched };
  }

  const task = (async (): Promise<EnrichedAlbumData> => {
    try {
      const ai = getAiClient();
      const resolvedCover = await coverPromise;

      const catalogHintLines: string[] = [];
      if (resolvedCover?.releaseYear) {
        catalogHintLines.push(`Release Year: ${resolvedCover.releaseYear}`);
      }
      if (resolvedCover?.genre) {
        catalogHintLines.push(`Catalog Genre: ${resolvedCover.genre}`);
      }
      if (resolvedCover?.tracks?.length) {
        catalogHintLines.push(
          `Verified Catalog Tracklist:\n${resolvedCover.tracks
            .map((t) => `${t.number}. ${t.title} (${t.duration})`)
            .join("\n")}`
        );
      }

      const catalogContext =
        catalogHintLines.length > 0
          ? `\nReference Catalog Data:\n${catalogHintLines.join("\n")}\n`
          : "";

      const prompt = `You are a seasoned music journalist and archival record curator.
Generate a complete, accurate JSON dossier for the album "${seed.album}" by "${seed.artist}" (ranked #${seed.rank} in the listener's archive with ${seed.plays.toLocaleString()} plays).
${catalogContext}
Requirements:
- releaseYear: exact 4-digit original release year string (e.g., "2000").
- label: primary record label.
- genre: concise primary genre/subgenre label (e.g., "Melodic Death Metal", "Technical Death Metal", "Post-Hardcore").
- origin: artist city and country.
- producer: producer name(s) and studio if known.
- runtime: total album runtime formatted "MM:SS".
- editorialSummary: 2 crisp, deeply informed paragraphs analyzing the album's sonic architecture, production character, emotional trajectory, and enduring appeal.
- sonicSignature: 3 or 4 concise, vivid phrases (3-6 words each) describing its distinct instrumentation or production traits.
- tracks: EVERY track from the standard album tracklist in exact order (preserving the exact titles and durations from the Reference Catalog Data if provided). For EACH track:
  - number: 1-based track number
  - title: exact song title
  - duration: formatted "MM:SS"
  - isStandout: true for 2 to 3 essential tracks on the album, false for the rest
  - description: a UNIQUE, evocative 2-sentence critical note tailored specifically to that individual track—analyzing its opening motif, rhythmic feel, riff/chord progression, vocal contrast, or role in the album arc. Never write generic filler.`;

      const generateJson = (modelName: string) =>
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            thinkingConfig: {
              thinkingLevel:
                modelName === "gemini-3.1-flash-lite"
                  ? ThinkingLevel.MINIMAL
                  : ThinkingLevel.LOW,
            },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                releaseYear: { type: Type.STRING },
                label: { type: Type.STRING },
                genre: { type: Type.STRING },
                origin: { type: Type.STRING },
                producer: { type: Type.STRING },
                runtime: { type: Type.STRING },
                editorialSummary: { type: Type.STRING },
                sonicSignature: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                tracks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      number: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      isStandout: { type: Type.BOOLEAN },
                      description: { type: Type.STRING },
                    },
                    required: [
                      "number",
                      "title",
                      "duration",
                      "isStandout",
                      "description",
                    ],
                  },
                },
              },
              required: [
                "releaseYear",
                "label",
                "genre",
                "origin",
                "producer",
                "runtime",
                "editorialSummary",
                "sonicSignature",
                "tracks",
              ],
            },
          },
        });

      let structuredResponse;
      try {
        structuredResponse = await withRetry(() =>
          generateJson("gemini-4-hydrogen")
        );
      } catch (primaryErr) {
        const msg =
          primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
        const canFallbackModel =
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED");
        if (!canFallbackModel) {
          throw primaryErr;
        }
        console.warn(
          `gemini-4-hydrogen unavailable for ${seed.id}, trying gemini-3.1-flash-lite...`
        );
        structuredResponse = await withRetry(() =>
          generateJson("gemini-3.1-flash-lite")
        );
      }

      const jsonText = (structuredResponse.text ?? "{}").trim();
      const parsed = JSON.parse(jsonText) as Omit<
        EnrichedAlbumData,
        "albumId" | "directLinks" | "groundingSources" | "enrichedAt"
      >;

      const directLinks: StreamingLinks = {
        ...seed.defaultLinks,
        appleMusic:
          resolvedCover?.appleMusicUrl ?? seed.defaultLinks.appleMusic,
        deezer: resolvedCover?.deezerUrl,
      };

      const groundingSources: GroundingSource[] = [];

      const enriched: EnrichedAlbumData = {
        albumId: seed.id,
        releaseYear: parsed.releaseYear || resolvedCover?.releaseYear || "Unknown",
        label: parsed.label || "Independent",
        genre: parsed.genre || resolvedCover?.genre || "Alternative / Metal",
        origin: parsed.origin || "International",
        producer: parsed.producer || "Studio Recording",
        runtime: parsed.runtime || "--:--",
        editorialSummary: parsed.editorialSummary || "",
        sonicSignature: Array.isArray(parsed.sonicSignature)
          ? parsed.sonicSignature.slice(0, 4)
          : [],
        tracks: Array.isArray(parsed.tracks)
          ? parsed.tracks.map((t, idx) => ({
              number: t.number || idx + 1,
              title: t.title,
              duration: t.duration || "--:--",
              description: t.description,
              isStandout: Boolean(t.isStandout),
            }))
          : [],
        directLinks,
        groundingSources,
        enrichedAt: new Date().toISOString(),
      };

      diskCache.enriched[seed.id] = enriched;
      persistCache();
      return enriched;
    } finally {
      inflightEnrich.delete(seed.id);
    }
  })();

  inflightEnrich.set(seed.id, task);
  const [cover, enriched] = await Promise.all([coverPromise, task]);
  return { cover, enriched };
}

function buildAlbumState(seed: AlbumSeed): AlbumState {
  const cachedCover = diskCache.covers[seed.id];
  const enriched = diskCache.enriched[seed.id] ?? null;

  const coverUrl =
    cachedCover?.rawUrl && isAllowedCoverHost(cachedCover.rawUrl)
      ? toProxiedCoverUrl(cachedCover.rawUrl)
      : cachedCover?.rawUrl || null;

  return {
    ...seed,
    coverUrl,
    coverSource: cachedCover?.source || null,
    catalogYear: cachedCover?.releaseYear,
    catalogGenre: cachedCover?.genre,
    catalogTracks: cachedCover?.tracks,
    appleMusicUrl: cachedCover?.appleMusicUrl,
    deezerUrl: cachedCover?.deezerUrl,
    enriched,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get("/api/albums", (_req: Request, res: Response) => {
    const albums = FAVORITE_ALBUMS.map(buildAlbumState);
    res.json({ albums });
  });

  app.get("/api/albums/:id/cover", async (req: Request, res: Response) => {
    const seed = FAVORITE_ALBUMS.find((a) => a.id === req.params.id);
    if (!seed) {
      res.status(404).json({ error: "Album not found" });
      return;
    }
    try {
      const cached = await resolveAlbumCover(seed);
      const coverUrl =
        cached?.rawUrl && isAllowedCoverHost(cached.rawUrl)
          ? toProxiedCoverUrl(cached.rawUrl)
          : cached?.rawUrl || null;
      res.json({
        albumId: seed.id,
        coverUrl,
        coverSource: cached?.source || null,
        appleMusicUrl: cached?.appleMusicUrl,
        deezerUrl: cached?.deezerUrl,
        catalogYear: cached?.releaseYear,
        catalogGenre: cached?.genre,
        catalogTracks: cached?.tracks,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch cover";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/albums/:id/enrich", async (req: Request, res: Response) => {
    const seed = FAVORITE_ALBUMS.find((a) => a.id === req.params.id);
    if (!seed) {
      res.status(404).json({ error: "Album not found" });
      return;
    }

    const force = Boolean((req.body as { force?: boolean } | undefined)?.force);

    try {
      const { cover, enriched } = await enrichAlbumWithGemini(seed, force);
      const coverUrl =
        cover?.rawUrl && isAllowedCoverHost(cover.rawUrl)
          ? toProxiedCoverUrl(cover.rawUrl)
          : cover?.rawUrl || null;
      res.json({
        albumId: seed.id,
        coverUrl,
        coverSource: cover?.source || null,
        enriched,
      });
    } catch (err) {
      const { status, message } = formatGeminiError(err);
      console.warn(`Gemini enrich (${status}) for ${seed.id}: ${message}`);
      res.status(status).json({ error: message });
    }
  });

  app.get("/api/cover-proxy", async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
    if (!rawUrl || !isAllowedCoverHost(rawUrl)) {
      res.status(400).json({ error: "Invalid or disallowed cover URL" });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const upstream = await fetch(rawUrl, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SoftwaveTop20/1.0)",
        },
      });
      if (!upstream.ok) {
        res.status(upstream.status).end();
        return;
      }
      const contentType = upstream.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        res.status(415).end();
        return;
      }
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch {
      res.status(502).end();
    } finally {
      clearTimeout(timer);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Softwave Top 20 server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
