import { useEffect } from 'react';
import {
  ArrowLeftRight,
  ExternalLink,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { TOTAL_COLLECTION_PLAYS, type AlbumState } from '../data/albums';
import { AlbumArtwork } from './AlbumArtwork';

interface AlbumCompareModalProps {
  isOpen: boolean;
  albums: AlbumState[];
  leftId: string;
  rightId: string;
  enrichingIds: Set<string>;
  onSelectLeft: (id: string) => void;
  onSelectRight: (id: string) => void;
  onSwap: () => void;
  onEnrichAlbum: (id: string) => void;
  onSelectForStage: (id: string) => void;
  onClose: () => void;
}

function getGenre(album: AlbumState): string {
  return album.enriched?.genre ?? album.catalogGenre ?? 'Not loaded yet';
}

function getReleaseYear(album: AlbumState): string {
  return album.enriched?.releaseYear ?? album.catalogYear ?? '—';
}

function getTrackCount(album: AlbumState): string {
  const count = album.enriched?.tracks.length ?? album.catalogTracks?.length;
  return count ? `${count} tracks` : '—';
}

export function AlbumCompareModal({
  isOpen,
  albums,
  leftId,
  rightId,
  enrichingIds,
  onSelectLeft,
  onSelectRight,
  onSwap,
  onEnrichAlbum,
  onSelectForStage,
  onClose,
}: AlbumCompareModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const left = albums.find((a) => a.id === leftId) ?? albums[0];
  const right = albums.find((a) => a.id === rightId) ?? albums[1] ?? albums[0];

  const maxPlays = Math.max(left.plays, right.plays, 1);
  const playDiff = left.plays - right.plays;
  const rankDiff = right.rank - left.rank; // positive means left is higher rank (#1 vs #5 -> +4)

  const leftYearNum = Number.parseInt(getReleaseYear(left), 10);
  const rightYearNum = Number.parseInt(getReleaseYear(right), 10);
  const yearGap =
    Number.isFinite(leftYearNum) && Number.isFinite(rightYearNum)
      ? Math.abs(leftYearNum - rightYearNum)
      : null;

  const leftShare = ((left.plays / TOTAL_COLLECTION_PLAYS) * 100).toFixed(1);
  const rightShare = ((right.plays / TOTAL_COLLECTION_PLAYS) * 100).toFixed(1);

  const leftStandouts =
    left.enriched?.tracks
      .filter((t) => t.isStandout)
      .map((t) => t.title)
      .join(' · ') || '—';
  const rightStandouts =
    right.enriched?.tracks
      .filter((t) => t.isStandout)
      .map((t) => t.title)
      .join(' · ') || '—';

  const leftLinks = {
    ...left.defaultLinks,
    appleMusic: left.appleMusicUrl ?? left.defaultLinks.appleMusic,
    deezer: left.deezerUrl,
    ...(left.enriched?.directLinks ?? {}),
  };
  const rightLinks = {
    ...right.defaultLinks,
    appleMusic: right.appleMusicUrl ?? right.defaultLinks.appleMusic,
    deezer: right.deezerUrl,
    ...(right.enriched?.directLinks ?? {}),
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2f2a24]/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="neu-raised rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-8 space-y-6 bg-[#E6E1D8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2
              id="compare-modal-title"
              className="font-display text-2xl sm:text-3xl font-bold text-[#2f2a24]"
            >
              Album Compare
            </h2>
            <p className="text-xs sm:text-sm text-[#5a5348]">
              Select any two records from your Top 20 archive to compare play stats, genre, release year, and production details side-by-side.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onSwap}
              aria-label="Swap compared albums"
              className="neu-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#2f2a24] whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f]"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#b84b3f]" />
              <span className="hidden sm:inline">Swap</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close album comparison"
              className="neu-btn w-10 h-10 rounded-xl flex items-center justify-center text-[#2f2a24] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Side-by-Side Album Selectors & Cover Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              slotLabel: 'Album A',
              item: left,
              selectedValue: left.id,
              onChange: onSelectLeft,
            },
            {
              slotLabel: 'Album B',
              item: right,
              selectedValue: right.id,
              onChange: onSelectRight,
            },
          ].map(({ slotLabel, item, selectedValue, onChange }) => {
            const isEnriching = enrichingIds.has(item.id);
            return (
              <div
                key={slotLabel}
                className="neu-flat rounded-2xl p-4 space-y-4"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor={`compare-select-${slotLabel}`}
                    className="block text-xs font-semibold text-[#5a5348]"
                  >
                    {slotLabel}
                  </label>
                  <div className="neu-inset-sm rounded-xl px-3 py-2">
                    <select
                      id={`compare-select-${slotLabel}`}
                      value={selectedValue}
                      onChange={(e) => onChange(e.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-[#2f2a24] focus:outline-none cursor-pointer"
                    >
                      {albums.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          #{String(opt.rank).padStart(2, '0')} · {opt.artist} — {opt.album} ({opt.plays.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <AlbumArtwork
                      coverUrl={item.coverUrl}
                      artist={item.artist}
                      album={item.album}
                      palette={item.palette}
                      size="md"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-mono-tabular text-xs font-semibold text-[#b84b3f]">
                      #{String(item.rank).padStart(2, '0')} · {item.plays.toLocaleString()} plays
                    </p>
                    <h3 className="font-display text-lg font-bold text-[#2f2a24] leading-snug line-clamp-2">
                      {item.album}
                    </h3>
                    <p className="text-sm text-[#5a5348] truncate">{item.artist}</p>

                    <div className="pt-1.5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectForStage(item.id);
                          onClose();
                        }}
                        className="text-xs font-semibold text-[#2f2a24] hover:text-[#b84b3f] underline underline-offset-4 cursor-pointer"
                      >
                        Open in Player
                      </button>

                      {!item.enriched && (
                        <button
                          type="button"
                          disabled={isEnriching}
                          onClick={() => onEnrichAlbum(item.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#b84b3f] hover:underline underline-offset-4 disabled:opacity-50 cursor-pointer"
                        >
                          {isEnriching ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Loading notes...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>Generate Gemini Notes</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Side-by-Side Comparison Table */}
        <div className="neu-inset rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#c9c2b5]/70 text-xs font-semibold text-[#5a5348]">
                  <th scope="col" className="py-3.5 px-4 sm:px-5 w-[24%]">
                    Metric / Attribute
                  </th>
                  <th scope="col" className="py-3.5 px-4 sm:px-5 w-[38%] text-[#2f2a24]">
                    {left.album}
                  </th>
                  <th scope="col" className="py-3.5 px-4 sm:px-5 w-[38%] text-[#2f2a24]">
                    {right.album}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c9c2b5]/50 text-sm">
                {/* Archive Rank */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Archive Rank
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 font-mono-tabular align-top">
                    <span className={left.rank < right.rank ? 'font-bold text-[#b84b3f]' : 'text-[#2f2a24]'}>
                      #{String(left.rank).padStart(2, '0')}
                    </span>
                    {rankDiff > 0 && (
                      <span className="block text-xs text-[#5a5348] mt-0.5">
                        {rankDiff} {rankDiff === 1 ? 'spot' : 'spots'} higher
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 font-mono-tabular align-top">
                    <span className={right.rank < left.rank ? 'font-bold text-[#b84b3f]' : 'text-[#2f2a24]'}>
                      #{String(right.rank).padStart(2, '0')}
                    </span>
                    {rankDiff < 0 && (
                      <span className="block text-xs text-[#5a5348] mt-0.5">
                        {Math.abs(rankDiff)} {Math.abs(rankDiff) === 1 ? 'spot' : 'spots'} higher
                      </span>
                    )}
                  </td>
                </tr>

                {/* Total Plays + Comparative Bar */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Total Plays
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 align-top space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 font-mono-tabular">
                      <span className={playDiff > 0 ? 'font-bold text-[#b84b3f]' : 'font-semibold text-[#2f2a24]'}>
                        {left.plays.toLocaleString()}
                      </span>
                      {playDiff > 0 && (
                        <span className="text-xs text-[#b84b3f]">
                          +{playDiff.toLocaleString()} plays
                        </span>
                      )}
                    </div>
                    <div className="h-2 rounded-full neu-inset-sm overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((left.plays / maxPlays) * 100)}%`,
                          background:
                            playDiff >= 0
                              ? 'linear-gradient(90deg, #b84b3f, #E9897E)'
                              : '#a79e8e',
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 align-top space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 font-mono-tabular">
                      <span className={playDiff < 0 ? 'font-bold text-[#b84b3f]' : 'font-semibold text-[#2f2a24]'}>
                        {right.plays.toLocaleString()}
                      </span>
                      {playDiff < 0 && (
                        <span className="text-xs text-[#b84b3f]">
                          +{Math.abs(playDiff).toLocaleString()} plays
                        </span>
                      )}
                    </div>
                    <div className="h-2 rounded-full neu-inset-sm overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((right.plays / maxPlays) * 100)}%`,
                          background:
                            playDiff <= 0
                              ? 'linear-gradient(90deg, #b84b3f, #E9897E)'
                              : '#a79e8e',
                        }}
                      />
                    </div>
                  </td>
                </tr>

                {/* Share of Top-20 Plays */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Top-20 Play Share
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 font-mono-tabular text-[#2f2a24] align-top">
                    {leftShare}%
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 font-mono-tabular text-[#2f2a24] align-top">
                    {rightShare}%
                  </td>
                </tr>

                {/* Release Year */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Release Year
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 font-mono-tabular text-[#2f2a24] align-top">
                    {getReleaseYear(left)}
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 font-mono-tabular text-[#2f2a24] align-top">
                    <span>{getReleaseYear(right)}</span>
                    {yearGap !== null && yearGap > 0 && left.id !== right.id && (
                      <span className="block text-xs font-sans text-[#786f62] mt-0.5">
                        {yearGap} {yearGap === 1 ? 'year' : 'years'} apart
                      </span>
                    )}
                  </td>
                </tr>

                {/* Genre */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Genre
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 text-[#2f2a24] align-top">
                    {getGenre(left)}
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 text-[#2f2a24] align-top">
                    {getGenre(right)}
                  </td>
                </tr>

                {/* Record Label */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Record Label
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 text-[#2f2a24] align-top">
                    {left.enriched?.label ?? '—'}
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 text-[#2f2a24] align-top">
                    {right.enriched?.label ?? '—'}
                  </td>
                </tr>

                {/* Origin */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Origin
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 text-[#2f2a24] align-top">
                    {left.enriched?.origin ?? '—'}
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 text-[#2f2a24] align-top">
                    {right.enriched?.origin ?? '—'}
                  </td>
                </tr>

                {/* Producer */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Producer
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 text-[#2f2a24] align-top">
                    {left.enriched?.producer ?? '—'}
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 text-[#2f2a24] align-top">
                    {right.enriched?.producer ?? '—'}
                  </td>
                </tr>

                {/* Tracks & Runtime */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Tracks &amp; Runtime
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 font-mono-tabular text-[#2f2a24] align-top">
                    {getTrackCount(left)}
                    {left.enriched?.runtime ? ` · ${left.enriched.runtime}` : ''}
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 font-mono-tabular text-[#2f2a24] align-top">
                    {getTrackCount(right)}
                    {right.enriched?.runtime ? ` · ${right.enriched.runtime}` : ''}
                  </td>
                </tr>

                {/* Sonic Profile */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Sonic Profile
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 text-xs leading-relaxed text-[#5a5348] align-top">
                    {left.enriched?.sonicSignature.length
                      ? left.enriched.sonicSignature.join(' · ')
                      : 'Generate Gemini notes to reveal sonic traits.'}
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 text-xs leading-relaxed text-[#5a5348] align-top">
                    {right.enriched?.sonicSignature.length
                      ? right.enriched.sonicSignature.join(' · ')
                      : 'Generate Gemini notes to reveal sonic traits.'}
                  </td>
                </tr>

                {/* Key Standout Tracks */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Key Tracks
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 text-xs leading-relaxed text-[#2f2a24] align-top">
                    {leftStandouts}
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 text-xs leading-relaxed text-[#2f2a24] align-top">
                    {rightStandouts}
                  </td>
                </tr>

                {/* Streaming & Last.fm Links */}
                <tr>
                  <th scope="row" className="py-3.5 px-4 sm:px-5 font-medium text-[#5a5348] align-top">
                    Listen &amp; Scrobble
                  </th>
                  <td className="py-3.5 px-4 sm:px-5 align-top">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
                      <a
                        href={leftLinks.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2f2a24] hover:text-[#b84b3f] underline underline-offset-4"
                      >
                        Spotify
                      </a>
                      <a
                        href={leftLinks.appleMusic}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2f2a24] hover:text-[#b84b3f] underline underline-offset-4"
                      >
                        Apple Music
                      </a>
                      <a
                        href={leftLinks.lastFm}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#b84b3f] font-semibold hover:underline underline-offset-4"
                      >
                        <span>Last.fm</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 sm:px-5 align-top">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
                      <a
                        href={rightLinks.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2f2a24] hover:text-[#b84b3f] underline underline-offset-4"
                      >
                        Spotify
                      </a>
                      <a
                        href={rightLinks.appleMusic}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2f2a24] hover:text-[#b84b3f] underline underline-offset-4"
                      >
                        Apple Music
                      </a>
                      <a
                        href={rightLinks.lastFm}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#b84b3f] font-semibold hover:underline underline-offset-4"
                      >
                        <span>Last.fm</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
