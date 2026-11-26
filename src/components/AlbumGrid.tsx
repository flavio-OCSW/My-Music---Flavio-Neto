import { ExternalLink, Search, Sparkles } from 'lucide-react';
import type { AlbumMoodGroup, AlbumState } from '../data/albums';
import { AlbumArtwork } from './AlbumArtwork';

export type SortOrder = 'rank' | 'artist' | 'enriched';

interface AlbumGridProps {
  albums: AlbumState[];
  selectedId: string;
  searchQuery: string;
  activeGroup: AlbumMoodGroup;
  sortOrder: SortOrder;
  enrichingIds: Set<string>;
  onSelectAlbum: (id: string) => void;
  onSearchChange: (q: string) => void;
  onGroupChange: (group: AlbumMoodGroup) => void;
  onSortChange: (sort: SortOrder) => void;
}

const FILTER_TABS: Array<{ id: AlbumMoodGroup; label: string }> = [
  { id: 'all', label: 'All 20' },
  { id: 'melodic-extreme', label: 'Melodic & Groove' },
  { id: 'black-death-thrash', label: 'Extreme & Thrash' },
  { id: 'alt-prog-ost', label: 'Alt, Prog & OST' },
];

export function AlbumGrid({
  albums,
  selectedId,
  searchQuery,
  activeGroup,
  sortOrder,
  enrichingIds,
  onSelectAlbum,
  onSearchChange,
  onGroupChange,
  onSortChange,
}: AlbumGridProps) {
  return (
    <section id="album-collection" className="space-y-6">
      {/* Workspace Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#2f2a24]">
            Top 20 Rotation
          </h2>
          <p className="text-sm text-[#5a5348]">
            Select any record to inspect its cover art, Gemini dossier, and unique tracklist notes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Recessed Neumorphic Search */}
          <div className="relative neu-inset-sm rounded-xl flex items-center px-3.5 py-2 min-w-[220px]">
            <Search className="w-4 h-4 text-[#786f62] shrink-0 mr-2.5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter artist or album..."
              aria-label="Filter artist or album"
              className="w-full bg-transparent text-sm text-[#2f2a24] placeholder:text-[#786f62] focus:outline-none"
            />
          </div>

          {/* Sort Select */}
          <div className="neu-inset-sm rounded-xl p-1 flex items-center gap-1">
            {(
              [
                { id: 'rank', label: 'By Plays' },
                { id: 'artist', label: 'Artist A–Z' },
                { id: 'enriched', label: 'With Notes' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSortChange(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  sortOrder === opt.id
                    ? 'neu-raised-sm text-[#2f2a24] font-semibold'
                    : 'text-[#5a5348] hover:text-[#2f2a24]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Segmented Bar */}
      <div className="flex flex-wrap items-center gap-2 neu-inset-sm rounded-2xl p-1.5 w-fit max-w-full">
        {FILTER_TABS.map((tab) => {
          const active = activeGroup === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onGroupChange(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f] ${
                active
                  ? 'neu-raised-sm text-[#b84b3f]'
                  : 'text-[#5a5348] hover:text-[#2f2a24]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 20-Album Grid */}
      {albums.length === 0 ? (
        <div className="neu-inset rounded-2xl p-10 text-center space-y-3">
          <p className="font-display text-lg font-semibold text-[#2f2a24]">
            No albums match &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onGroupChange('all');
            }}
            className="neu-btn px-4 py-2 rounded-xl text-xs font-semibold text-[#2f2a24] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {albums.map((item) => {
            const isSelected = item.id === selectedId;
            const isEnriching = enrichingIds.has(item.id);
            const links = item.enriched?.directLinks ?? item.defaultLinks;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectAlbum(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectAlbum(item.id);
                  }
                }}
                aria-pressed={isSelected}
                className={`group rounded-2xl p-4 flex flex-col justify-between gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f] ${
                  isSelected ? 'neu-card-active' : 'neu-card-interactive'
                }`}
              >
                <div className="space-y-3.5">
                  <AlbumArtwork
                    coverUrl={item.coverUrl}
                    artist={item.artist}
                    album={item.album}
                    palette={item.palette}
                    size="md"
                  />

                  {/* Unboxed Metadata Kicker */}
                  <div className="flex items-center justify-between gap-2 text-xs text-[#5a5348]">
                    <span className="font-mono-tabular">
                      <strong className={isSelected ? 'text-[#b84b3f]' : 'text-[#2f2a24]'}>
                        #{String(item.rank).padStart(2, '0')}
                      </strong>{' '}
                      · {item.plays.toLocaleString()} plays
                    </span>

                    {isEnriching ? (
                      <span className="text-[11px] font-medium text-[#b84b3f]">
                        Loading notes...
                      </span>
                    ) : item.enriched ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5a5348]">
                        <Sparkles className="w-3 h-3 text-[#b84b3f]" />
                        <span>{item.enriched.releaseYear}</span>
                      </span>
                    ) : item.catalogYear ? (
                      <span className="font-mono-tabular text-[11px] text-[#786f62]">
                        {item.catalogYear}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="font-display text-base font-bold text-[#2f2a24] leading-snug line-clamp-1 group-hover:text-[#b84b3f] transition-colors">
                      {item.album}
                    </h3>
                    <p className="text-sm text-[#5a5348] truncate">{item.artist}</p>
                  </div>
                </div>

                {/* Quiet Footer Line + Direct Quick Links */}
                <div className="pt-2.5 border-t border-[#c9c2b5]/50 flex items-center justify-between gap-2 text-xs text-[#786f62]">
                  <span className="truncate">
                    {item.enriched
                      ? `${item.enriched.tracks.length} tracks · ${item.enriched.genre}`
                      : item.catalogTracks?.length
                        ? `${item.catalogTracks.length} tracks${item.catalogGenre ? ` · ${item.catalogGenre}` : ''}`
                        : 'Click for Gemini notes'}
                  </span>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <a
                      href={links.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Listen to ${item.album} on Spotify`}
                      className="hover:text-[#b84b3f] font-medium transition-colors"
                    >
                      Spotify
                    </a>
                    <span aria-hidden="true">·</span>
                    <a
                      href={links.lastFm}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`View ${item.album} on Last.fm`}
                      className="inline-flex items-center gap-0.5 hover:text-[#b84b3f] font-medium transition-colors"
                    >
                      <span>Last.fm</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
