import { FAVORITE_ALBUMS, TOTAL_COLLECTION_PLAYS, type AlbumState } from '../data/albums';

interface ListeningStatsProps {
  albums: AlbumState[];
  selectedId: string;
  onSelectAlbum: (id: string) => void;
}

export function ListeningStats({
  albums,
  selectedId,
  onSelectAlbum,
}: ListeningStatsProps) {
  const maxPlays = FAVORITE_ALBUMS[0].plays;
  const enrichedCount = albums.filter((a) => Boolean(a.enriched)).length;

  // Compute top repeated artists in the Top 20
  const artistCounts = new Map<string, { albums: number; plays: number }>();
  for (const item of FAVORITE_ALBUMS) {
    const prev = artistCounts.get(item.artist) ?? { albums: 0, plays: 0 };
    artistCounts.set(item.artist, {
      albums: prev.albums + 1,
      plays: prev.plays + item.plays,
    });
  }
  const topMultiArtist = [...artistCounts.entries()].sort(
    (a, b) => b[1].plays - a[1].plays
  )[0];

  return (
    <section id="play-stats" className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#2f2a24]">
          Archive Scrobble Telemetry
        </h2>
        <p className="text-sm text-[#5a5348]">
          Play count distribution across your 20 most-spun records. Click any bar to jump to its dossier.
        </p>
      </div>

      {/* 4-column Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="neu-raised-sm rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-[#5a5348]">Total Top-20 Plays</p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#2f2a24]">
            {TOTAL_COLLECTION_PLAYS.toLocaleString()}
          </p>
        </div>

        <div className="neu-raised-sm rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-[#5a5348]">#1 Most Played</p>
          <p className="font-display text-lg sm:text-xl font-bold text-[#2f2a24] truncate">
            Clayman
          </p>
          <p className="font-mono-tabular text-xs text-[#b84b3f]">
            In Flames · 1,268 plays
          </p>
        </div>

        <div className="neu-raised-sm rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-[#5a5348]">Most Featured Artist</p>
          <p className="font-display text-lg sm:text-xl font-bold text-[#2f2a24] truncate">
            {topMultiArtist[0]}
          </p>
          <p className="font-mono-tabular text-xs text-[#5a5348]">
            {topMultiArtist[1].albums} albums · {topMultiArtist[1].plays.toLocaleString()} plays
          </p>
        </div>

        <div className="neu-raised-sm rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium text-[#5a5348]">Gemini Notes Ready</p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#2f2a24]">
            {enrichedCount} / 20
          </p>
        </div>
      </div>

      {/* Tactile Play Distribution Bars */}
      <div className="neu-raised rounded-3xl p-5 sm:p-8 space-y-2.5">
        {albums.map((item) => {
          const pct = Math.round((item.plays / maxPlays) * 100);
          const active = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectAlbum(item.id)}
              className={`w-full text-left grid grid-cols-12 items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b3f] ${
                active ? 'neu-inset-sm' : 'hover:bg-[#ece8e0]/60'
              }`}
            >
              <div className="col-span-5 sm:col-span-4 flex items-baseline gap-2 min-w-0">
                <span className="font-mono-tabular text-xs text-[#786f62] shrink-0">
                  #{String(item.rank).padStart(2, '0')}
                </span>
                <span
                  className={`text-xs sm:text-sm font-medium truncate ${
                    active ? 'text-[#b84b3f] font-semibold' : 'text-[#2f2a24]'
                  }`}
                >
                  {item.artist} — {item.album}
                </span>
              </div>

              <div className="col-span-5 sm:col-span-6">
                <div className="h-3 rounded-full neu-inset-sm overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      background: active
                        ? 'linear-gradient(90deg, #b84b3f, #E9897E)'
                        : 'linear-gradient(90deg, #a79e8e, #c9c2b5)',
                    }}
                  />
                </div>
              </div>

              <div className="col-span-2 text-right font-mono-tabular text-xs font-medium text-[#5a5348]">
                {item.plays.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
