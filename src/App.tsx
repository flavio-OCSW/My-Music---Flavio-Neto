/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlbumCompareModal } from './components/AlbumCompareModal';
import { AlbumGrid, type SortOrder } from './components/AlbumGrid';
import { ListeningStats } from './components/ListeningStats';
import { PlayerStage } from './components/PlayerStage';
import {
  FAVORITE_ALBUMS,
  type AlbumMoodGroup,
  type AlbumState,
  type CatalogTrack,
  type EnrichedAlbumData,
} from './data/albums';

const INITIAL_ALBUMS: AlbumState[] = FAVORITE_ALBUMS.map((seed) => ({
  ...seed,
  coverUrl: null,
  coverSource: null,
  enriched: null,
}));

export default function App() {
  const [albums, setAlbums] = useState<AlbumState[]>(INITIAL_ALBUMS);
  const [selectedId, setSelectedId] = useState<string>(FAVORITE_ALBUMS[0].id);
  const [focusedTrackNumber, setFocusedTrackNumber] = useState<number>(1);
  const [isAuditioning, setIsAuditioning] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeGroup, setActiveGroup] = useState<AlbumMoodGroup>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('rank');

  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [errorsById, setErrorsById] = useState<Record<string, string>>({});
  const [isBatchEnriching, setIsBatchEnriching] = useState<boolean>(false);

  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [compareLeftId, setCompareLeftId] = useState<string>(FAVORITE_ALBUMS[0].id);
  const [compareRightId, setCompareRightId] = useState<string>(FAVORITE_ALBUMS[1].id);

  const batchCancelledRef = useRef<boolean>(false);
  const albumsRef = useRef<AlbumState[]>(albums);
  albumsRef.current = albums;

  const enrichAlbum = useCallback(
    async (albumId: string, force = false): Promise<'ok' | 'quota' | 'error'> => {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        next.add(albumId);
        return next;
      });
      setErrorsById((prev) => {
        const next = { ...prev };
        delete next[albumId];
        return next;
      });

      try {
        const res = await fetch(`/api/albums/${encodeURIComponent(albumId)}/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force }),
        });

        const data = (await res.json()) as {
          coverUrl?: string | null;
          coverSource?: string | null;
          enriched?: EnrichedAlbumData;
          error?: string;
        };

        if (!res.ok || !data.enriched) {
          const msg = data.error || `Failed to load notes (${res.status})`;
          setErrorsById((prev) => ({ ...prev, [albumId]: msg }));
          return res.status === 429 || res.status === 403 || res.status === 503
            ? 'quota'
            : 'error';
        }

        setAlbums((prev) =>
          prev.map((item) =>
            item.id === albumId
              ? {
                  ...item,
                  coverUrl: data.coverUrl ?? item.coverUrl,
                  coverSource: data.coverSource ?? item.coverSource,
                  enriched: data.enriched ?? item.enriched,
                }
              : item
          )
        );
        return 'ok';
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to reach Gemini service.';
        setErrorsById((prev) => ({ ...prev, [albumId]: msg }));
        return 'error';
      } finally {
        setEnrichingIds((prev) => {
          const next = new Set(prev);
          next.delete(albumId);
          return next;
        });
      }
    },
    []
  );

  // Hydrate cached albums & resolve missing covers/catalog tracks on mount (no Gemini quota spent)
  useEffect(() => {
    let active = true;

    async function bootstrap() {
      let hydrated: AlbumState[] = INITIAL_ALBUMS;
      try {
        const res = await fetch('/api/albums');
        if (res.ok) {
          const payload = (await res.json()) as { albums?: AlbumState[] };
          if (payload.albums && active) {
            hydrated = payload.albums;
            setAlbums(payload.albums);
          }
        }
      } catch {
        // Proceed with initial list
      }

      if (!active) return;

      const missingCovers = hydrated.filter(
        (a) => !a.coverUrl || !a.catalogTracks?.length
      );
      const concurrency = 4;
      let cursor = 0;

      async function coverWorker() {
        while (active && cursor < missingCovers.length) {
          const target = missingCovers[cursor++];
          if (!target) break;
          try {
            const res = await fetch(
              `/api/albums/${encodeURIComponent(target.id)}/cover`
            );
            if (!res.ok) continue;
            const data = (await res.json()) as {
              coverUrl?: string | null;
              coverSource?: string | null;
              appleMusicUrl?: string;
              deezerUrl?: string;
              catalogYear?: string;
              catalogGenre?: string;
              catalogTracks?: CatalogTrack[];
            };
            if (active) {
              setAlbums((prev) =>
                prev.map((item) =>
                  item.id === target.id
                    ? {
                        ...item,
                        coverUrl: data.coverUrl ?? item.coverUrl,
                        coverSource: data.coverSource ?? item.coverSource,
                        appleMusicUrl: data.appleMusicUrl ?? item.appleMusicUrl,
                        deezerUrl: data.deezerUrl ?? item.deezerUrl,
                        catalogYear: data.catalogYear ?? item.catalogYear,
                        catalogGenre: data.catalogGenre ?? item.catalogGenre,
                        catalogTracks: data.catalogTracks ?? item.catalogTracks,
                      }
                    : item
                )
              );
            }
          } catch {
            // Keep graceful vinyl sleeve fallback
          }
        }
      }

      await Promise.all(
        Array.from({ length: concurrency }, () => coverWorker())
      );
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectAlbum = useCallback(
    (albumId: string, scrollToTop = true) => {
      setSelectedId(albumId);
      setFocusedTrackNumber(1);
      if (scrollToTop) {
        document
          .getElementById('player-stage')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const target = albumsRef.current.find((a) => a.id === albumId);
      if (target && !target.enriched && !enrichingIds.has(albumId)) {
        void enrichAlbum(albumId, false);
      }
    },
    [enrichAlbum, enrichingIds]
  );

  const selectedIndex = useMemo(
    () => Math.max(0, albums.findIndex((a) => a.id === selectedId)),
    [albums, selectedId]
  );
  const selectedAlbum = albums[selectedIndex] ?? albums[0];

  const handlePrevAlbum = useCallback(() => {
    const prevIdx = (selectedIndex - 1 + albums.length) % albums.length;
    handleSelectAlbum(albums[prevIdx].id, false);
  }, [albums, handleSelectAlbum, selectedIndex]);

  const handleNextAlbum = useCallback(() => {
    const nextIdx = (selectedIndex + 1) % albums.length;
    handleSelectAlbum(albums[nextIdx].id, false);
  }, [albums, handleSelectAlbum, selectedIndex]);

  const enrichedCount = useMemo(
    () => albums.filter((a) => Boolean(a.enriched)).length,
    [albums]
  );

  const handleBatchEnrich = useCallback(async () => {
    if (isBatchEnriching) {
      batchCancelledRef.current = true;
      setIsBatchEnriching(false);
      return;
    }

    const remaining = albumsRef.current.filter((a) => !a.enriched);
    if (remaining.length === 0) return;

    batchCancelledRef.current = false;
    setIsBatchEnriching(true);

    for (const nextItem of remaining) {
      if (batchCancelledRef.current) break;
      const result = await enrichAlbum(nextItem.id, false);
      if (result === 'quota') {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    setIsBatchEnriching(false);
  }, [enrichAlbum, isBatchEnriching]);

  const filteredAlbums = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = albums.filter((item) => {
      if (activeGroup !== 'all' && item.group !== activeGroup) return false;
      if (!q) return true;
      const genreText = (
        item.enriched?.genre ??
        item.catalogGenre ??
        ''
      ).toLowerCase();
      return (
        item.artist.toLowerCase().includes(q) ||
        item.album.toLowerCase().includes(q) ||
        genreText.includes(q)
      );
    });

    const sorted = [...list];
    if (sortOrder === 'artist') {
      sorted.sort((a, b) => a.artist.localeCompare(b.artist) || a.rank - b.rank);
    } else if (sortOrder === 'enriched') {
      sorted.sort((a, b) => {
        const ea = a.enriched ? 1 : 0;
        const eb = b.enriched ? 1 : 0;
        return eb - ea || a.rank - b.rank;
      });
    } else {
      sorted.sort((a, b) => a.rank - b.rank);
    }
    return sorted;
  }, [activeGroup, albums, searchQuery, sortOrder]);

  const openCompareModal = useCallback(
    (primaryId?: string) => {
      const targetLeft = primaryId ?? selectedId;
      setCompareLeftId(targetLeft);
      setCompareRightId((prevRight) => {
        if (prevRight && prevRight !== targetLeft) return prevRight;
        const fallback =
          FAVORITE_ALBUMS.find((a) => a.id !== targetLeft) ?? FAVORITE_ALBUMS[1];
        return fallback.id;
      });
      setIsCompareOpen(true);
    },
    [selectedId]
  );

  return (
    <div id="top" className="min-h-screen bg-[#E6E1D8] text-[#2f2a24]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#E6E1D8]/90 backdrop-blur-md border-b border-[#c9c2b5]/50">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-[#2f2a24] whitespace-nowrap shrink-0"
          >
            Softwave 20
          </a>

          {/* Zone 2: 4 Single-line Nav Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5a5348]"
          >
            <a
              href="#player-stage"
              className="hover:text-[#2f2a24] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Player Stage
            </a>
            <a
              href="#tracklist-notes"
              className="hover:text-[#2f2a24] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Tracklist Notes
            </a>
            <a
              href="#album-collection"
              className="hover:text-[#2f2a24] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Top 20 Grid
            </a>
            <a
              href="#play-stats"
              className="hover:text-[#2f2a24] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Play Stats
            </a>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleBatchEnrich}
              disabled={!isBatchEnriching && enrichedCount === 20}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f2a24] ${
                enrichedCount === 20
                  ? 'neu-inset-sm text-[#5a5348] cursor-default'
                  : 'neu-btn-accent text-[#fdfbf7]'
              }`}
            >
              {isBatchEnriching
                ? `Stop Batch (${enrichedCount}/20)`
                : enrichedCount === 20
                  ? 'All 20 Enriched'
                  : `Enrich All (${enrichedCount}/20)`}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-14">
        <PlayerStage
          album={selectedAlbum}
          focusedTrackNumber={focusedTrackNumber}
          isAuditioning={isAuditioning}
          isLoadingEnrich={enrichingIds.has(selectedAlbum.id)}
          enrichError={errorsById[selectedAlbum.id] ?? null}
          onToggleAudition={() => setIsAuditioning((prev) => !prev)}
          onSelectTrack={setFocusedTrackNumber}
          onPrevAlbum={handlePrevAlbum}
          onNextAlbum={handleNextAlbum}
          onEnrich={(force) => enrichAlbum(selectedAlbum.id, Boolean(force))}
          onOpenCompare={() => openCompareModal(selectedAlbum.id)}
        />

        <AlbumGrid
          albums={filteredAlbums}
          selectedId={selectedAlbum.id}
          searchQuery={searchQuery}
          activeGroup={activeGroup}
          sortOrder={sortOrder}
          enrichingIds={enrichingIds}
          onSelectAlbum={(id) => handleSelectAlbum(id, true)}
          onSearchChange={setSearchQuery}
          onGroupChange={setActiveGroup}
          onSortChange={setSortOrder}
          onOpenCompare={() => openCompareModal(selectedAlbum.id)}
        />

        <ListeningStats
          albums={albums}
          selectedId={selectedAlbum.id}
          onSelectAlbum={(id) => handleSelectAlbum(id, true)}
        />
      </main>

      <AlbumCompareModal
        isOpen={isCompareOpen}
        albums={albums}
        leftId={compareLeftId}
        rightId={compareRightId}
        enrichingIds={enrichingIds}
        onSelectLeft={setCompareLeftId}
        onSelectRight={setCompareRightId}
        onSwap={() => {
          setCompareLeftId(compareRightId);
          setCompareRightId(compareLeftId);
        }}
        onEnrichAlbum={(id) => void enrichAlbum(id, false)}
        onSelectForStage={(id) => handleSelectAlbum(id, true)}
        onClose={() => setIsCompareOpen(false)}
      />

      <footer className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 border-t border-[#c9c2b5]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#786f62]">
        <p>Softwave 20 — Personal Album Archive &amp; Tracklist Notes</p>
        <p>Artwork &amp; links indexed from Apple Music, Deezer, Cover Art Archive, and Last.fm</p>
      </footer>
    </div>
  );
}
