import {
  ChevronLeft,
  ChevronRight,
  Disc3,
  ExternalLink,
  Headphones,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Radio,
  Sparkles,
} from 'lucide-react';
import type { AlbumState } from '../data/albums';
import { AlbumArtwork } from './AlbumArtwork';

interface PlayerStageProps {
  album: AlbumState;
  focusedTrackNumber: number;
  isAuditioning: boolean;
  isLoadingEnrich: boolean;
  enrichError: string | null;
  onToggleAudition: () => void;
  onSelectTrack: (trackNumber: number) => void;
  onPrevAlbum: () => void;
  onNextAlbum: () => void;
  onEnrich: (force?: boolean) => void;
}

export function PlayerStage({
  album,
  focusedTrackNumber,
  isAuditioning,
  isLoadingEnrich,
  enrichError,
  onToggleAudition,
  onSelectTrack,
  onPrevAlbum,
  onNextAlbum,
  onEnrich,
}: PlayerStageProps) {
  const enriched = album.enriched;
  const links = {
    ...album.defaultLinks,
    appleMusic: album.appleMusicUrl ?? album.defaultLinks.appleMusic,
    deezer: album.deezerUrl,
    ...(enriched?.directLinks ?? {}),
  };

  const displayTracks = enriched?.tracks ?? album.catalogTracks ?? [];
  const activeTrack =
    displayTracks.find((t) => t.number === focusedTrackNumber) ??
    displayTracks[0] ??
    null;

  const displayYear = enriched?.releaseYear ?? album.catalogYear;
  const displayGenre = enriched?.genre ?? album.catalogGenre;

  return (
    <section
      id="player-stage"
      aria-label="Featured Album Deck"
      className="neu-raised rounded-3xl p-5 sm:p-8 lg:p-10 space-y-8"
    >
      {/* Top Split: Turntable Artwork Cradle + Album Editorial Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Tactile Cover Platter & Transport Controls */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-stretch gap-6">
          <div className="w-full max-w-[360px] mx-auto lg:max-w-none">
            <AlbumArtwork
              coverUrl={album.coverUrl}
              artist={album.artist}
              album={album.album}
              palette={album.palette}
              size="lg"
              showVinylDisc
              isSpinning={isAuditioning}
            />
          </div>

          {/* SOFTWAVE Tactile Transport Deck */}
          <div className="w-full max-w-[360px] mx-auto lg:max-w-none neu-inset rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#5a5348] truncate">
                  {activeTrack
                    ? `Track ${String(activeTrack.number).padStart(2, '0')} — ${activeTrack.title}`
                    : `${album.album} — ${album.artist}`}
                </p>
                <p className="font-mono-tabular text-xs text-[#786f62]">
                  {activeTrack
                    ? `${activeTrack.duration} · Rank #${String(album.rank).padStart(2, '0')}`
                    : `Rank #${String(album.rank).padStart(2, '0')} · ${album.plays.toLocaleString()} plays`}
                </p>
              </div>

              {/* Animated Waveform Indicator */}
              <div
                aria-hidden="true"
                className="flex items-end gap-1 h-5 shrink-0 px-1"
              >
                <span
                  className={`w-1 rounded-full bg-[#b84b3f] ${
                    isAuditioning ? 'h-full animate-eq-1' : 'h-2 opacity-40'
                  }`}
                />
                <span
                  className={`w-1 rounded-full bg-[#E9897E] ${
                    isAuditioning ? 'h-full animate-eq-2' : 'h-3.5 opacity-40'
                  }`}
                />
                <span
                  className={`w-1 rounded-full bg-[#b84b3f] ${
                    isAuditioning ? 'h-full animate-eq-3' : 'h-2.5 opacity-40'
                  }`}
                />
                <span
                  className={`w-1 rounded-full bg-[#E9897E] ${
                    isAuditioning ? 'h-full animate-eq-4' : 'h-1.5 opacity-40'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={onPrevAlbum}
                aria-label="Previous album"
                className="neu-btn w-11 h-11 rounded-full flex items-center justify-center text-[#2f2a24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f] cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={onToggleAudition}
                aria-label={
                  isAuditioning ? 'Pause turntable spin' : 'Spin turntable deck'
                }
                className="neu-btn-accent w-14 h-14 rounded-full flex items-center justify-center text-[#fdfbf7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f2a24] cursor-pointer"
              >
                {isAuditioning ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onNextAlbum}
                aria-label="Next album"
                className="neu-btn w-11 h-11 rounded-full flex items-center justify-center text-[#2f2a24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f] cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Editorial Album Dossier & Streaming Deck */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-[#5a5348] font-medium">
              <span className="font-mono-tabular font-semibold text-[#b84b3f]">
                #{String(album.rank).padStart(2, '0')}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {album.plays.toLocaleString()} plays
              </span>
              {displayYear && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{displayYear}</span>
                </>
              )}
              {enriched?.label && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{enriched.label}</span>
                </>
              )}
              {displayGenre && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{displayGenre}</span>
                </>
              )}
            </div>

            <div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-[#2f2a24] leading-[1.1] text-balance">
                {album.album}
              </h1>
              <p className="mt-2 text-lg sm:text-xl font-medium text-[#5a5348]">
                {album.artist}
                {enriched?.origin ? (
                  <span className="text-sm font-normal text-[#786f62]">
                    {' '}
                    — {enriched.origin}
                  </span>
                ) : null}
              </p>
            </div>

            {/* Production & Sonic Signature */}
            {enriched && (
              <div className="pt-2 border-t border-[#c9c2b5]/50 space-y-2 text-sm text-[#5a5348]">
                <p>
                  <span className="font-semibold text-[#2f2a24]">Production:</span>{' '}
                  {enriched.producer}{' '}
                  <span aria-hidden="true" className="mx-1.5">
                    ·
                  </span>
                  <span className="font-mono-tabular">{enriched.runtime}</span>
                  {album.coverSource ? (
                    <>
                      <span aria-hidden="true" className="mx-1.5">
                        ·
                      </span>
                      <span className="text-xs text-[#786f62]">
                        Artwork via {album.coverSource}
                      </span>
                    </>
                  ) : null}
                </p>

                {enriched.sonicSignature.length > 0 && (
                  <p className="text-xs sm:text-sm text-[#5a5348]">
                    <span className="font-semibold text-[#2f2a24]">
                      Sonic Profile:
                    </span>{' '}
                    {enriched.sonicSignature.join(' · ')}
                  </p>
                )}
              </div>
            )}

            {/* Gemini Editorial Summary */}
            {isLoadingEnrich && !enriched ? (
              <div className="neu-inset rounded-2xl p-5 flex items-center gap-3.5 text-sm text-[#5a5348]">
                <Loader2 className="w-5 h-5 animate-spin text-[#b84b3f] shrink-0" />
                <div>
                  <p className="font-medium text-[#2f2a24]">
                    Composing album dossier and tracklist notes with Gemini...
                  </p>
                  <p className="text-xs text-[#786f62] mt-0.5">
                    Writing unique descriptions for every song on {album.album}.
                  </p>
                </div>
              </div>
            ) : enrichError && !enriched ? (
              <div className="neu-inset rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#b84b3f]">
                    Gemini Notes Unavailable
                  </p>
                  <p className="text-xs text-[#5a5348] leading-relaxed">
                    {enrichError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEnrich(false)}
                  className="neu-btn px-4 py-2 rounded-xl text-xs font-semibold text-[#2f2a24] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : enriched ? (
              <div className="space-y-3 text-[15px] leading-relaxed text-[#3f3931] max-w-[68ch]">
                {enriched.editorialSummary
                  .split(/\n+/)
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
              </div>
            ) : (
              <div className="neu-inset rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#2f2a24]">
                    Ready to generate Gemini editorial notes
                  </p>
                  <p className="text-xs text-[#5a5348]">
                    Produces an archival overview and unique critical descriptions for every track.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEnrich(false)}
                  className="neu-btn-accent inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#fdfbf7] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Notes</span>
                </button>
              </div>
            )}
          </div>

          {/* Streaming & Last.fm Listening Links */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xs font-semibold tracking-wide text-[#5a5348]">
                Listen &amp; Scrobble
              </h2>
              {enriched && (
                <button
                  type="button"
                  onClick={() => onEnrich(true)}
                  disabled={isLoadingEnrich}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5a5348] hover:text-[#b84b3f] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isLoadingEnrich ? 'animate-spin' : ''}`}
                  />
                  <span>{isLoadingEnrich ? 'Refreshing...' : 'Regenerate Notes'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={links.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2f2a24] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f]"
              >
                <Headphones className="w-3.5 h-3.5 text-[#b84b3f]" />
                <span>Spotify</span>
                <ExternalLink className="w-3 h-3 opacity-55" />
              </a>

              <a
                href={links.appleMusic}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2f2a24] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f]"
              >
                <Disc3 className="w-3.5 h-3.5 text-[#b84b3f]" />
                <span>Apple Music</span>
                <ExternalLink className="w-3 h-3 opacity-55" />
              </a>

              <a
                href={links.youtubeMusic}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2f2a24] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f]"
              >
                <Play className="w-3.5 h-3.5 text-[#b84b3f]" />
                <span>YouTube Music</span>
                <ExternalLink className="w-3 h-3 opacity-55" />
              </a>

              {links.deezer ? (
                <a
                  href={links.deezer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neu-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2f2a24] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f]"
                >
                  <Radio className="w-3.5 h-3.5 text-[#b84b3f]" />
                  <span>Deezer</span>
                  <ExternalLink className="w-3 h-3 opacity-55" />
                </a>
              ) : (
                <a
                  href={links.bandcamp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neu-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#2f2a24] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f]"
                >
                  <Radio className="w-3.5 h-3.5 text-[#b84b3f]" />
                  <span>Bandcamp</span>
                  <ExternalLink className="w-3 h-3 opacity-55" />
                </a>
              )}

              <a
                href={links.lastFm}
                target="_blank"
                rel="noopener noreferrer"
                className="neu-btn-accent inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#fdfbf7] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f2a24]"
              >
                <span>Last.fm Album</span>
                <ExternalLink className="w-3 h-3 opacity-85" />
              </a>

              <a
                href={links.lastFmArtist}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[#5a5348] hover:text-[#b84b3f] underline underline-offset-4 whitespace-nowrap shrink-0 px-1"
              >
                Artist on Last.fm
              </a>
            </div>
          </div>

          {/* Grounding Sources */}
          {enriched && enriched.groundingSources.length > 0 && (
            <div className="pt-2 border-t border-[#c9c2b5]/50 text-xs text-[#786f62] flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-[#5a5348]">Sources:</span>
              {enriched.groundingSources.map((src, idx) => (
                <a
                  key={src.uri}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#b84b3f] underline underline-offset-2 truncate max-w-[220px]"
                >
                  {idx + 1}. {src.title}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Annotated Tracklist Panel */}
      <div id="tracklist-notes" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#2f2a24]">
            Tracklist &amp; Track-by-Track Notes
          </h2>
          {displayTracks.length > 0 && (
            <span className="font-mono-tabular text-xs text-[#5a5348]">
              {displayTracks.length} tracks
              {enriched?.runtime ? ` · ${enriched.runtime}` : ''}
            </span>
          )}
        </div>

        {isLoadingEnrich && !enriched && displayTracks.length === 0 ? (
          <div className="neu-inset rounded-2xl p-6 space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-14 rounded-xl bg-[#d9d2c6]/60 animate-pulse"
              />
            ))}
          </div>
        ) : enriched && enriched.tracks.length > 0 ? (
          <div className="neu-inset rounded-2xl p-3 sm:p-5 divide-y divide-[#c9c2b5]/55">
            {enriched.tracks.map((track) => {
              const isSelected = activeTrack?.number === track.number;
              return (
                <button
                  key={`${track.number}-${track.title}`}
                  type="button"
                  onClick={() => onSelectTrack(track.number)}
                  className={`w-full text-left px-3.5 py-4 sm:px-5 rounded-xl transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f] ${
                    isSelected
                      ? 'neu-raised-sm my-1'
                      : 'hover:bg-[#ece8e0]/55'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-3.5 min-w-0">
                      <span
                        className={`font-mono-tabular text-xs font-semibold shrink-0 ${
                          isSelected ? 'text-[#b84b3f]' : 'text-[#786f62]'
                        }`}
                      >
                        {String(track.number).padStart(2, '0')}
                      </span>
                      <span className="font-display text-base font-semibold text-[#2f2a24] truncate">
                        {track.title}
                      </span>
                      {track.isStandout && (
                        <span className="text-[11px] font-medium text-[#b84b3f] whitespace-nowrap shrink-0">
                          Key Track
                        </span>
                      )}
                    </div>
                    <span className="font-mono-tabular text-xs text-[#5a5348] shrink-0">
                      {track.duration}
                    </span>
                  </div>
                  <p className="mt-1.5 pl-7 text-sm leading-relaxed text-[#5a5348]">
                    {track.description}
                  </p>
                </button>
              );
            })}
          </div>
        ) : displayTracks.length > 0 ? (
          <div className="neu-inset rounded-2xl p-3 sm:p-5 divide-y divide-[#c9c2b5]/55">
            {displayTracks.map((track) => {
              const isSelected = activeTrack?.number === track.number;
              return (
                <button
                  key={`${track.number}-${track.title}`}
                  type="button"
                  onClick={() => onSelectTrack(track.number)}
                  className={`w-full text-left px-3.5 py-3.5 sm:px-5 rounded-xl transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f] ${
                    isSelected
                      ? 'neu-raised-sm my-1'
                      : 'hover:bg-[#ece8e0]/55'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-3.5 min-w-0">
                      <span
                        className={`font-mono-tabular text-xs font-semibold shrink-0 ${
                          isSelected ? 'text-[#b84b3f]' : 'text-[#786f62]'
                        }`}
                      >
                        {String(track.number).padStart(2, '0')}
                      </span>
                      <span className="font-display text-base font-semibold text-[#2f2a24] truncate">
                        {track.title}
                      </span>
                    </div>
                    <span className="font-mono-tabular text-xs text-[#5a5348] shrink-0">
                      {track.duration}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="neu-inset rounded-2xl p-6 text-sm text-[#5a5348]">
            Select &ldquo;Generate Notes&rdquo; above to retrieve the tracklist and unique Gemini track descriptions for {album.album}.
          </div>
        )}
      </div>
    </section>
  );
}
