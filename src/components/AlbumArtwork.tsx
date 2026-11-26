import { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface AlbumArtworkProps {
  coverUrl: string | null;
  artist: string;
  album: string;
  palette: [string, string];
  size?: 'sm' | 'md' | 'lg';
  isSpinning?: boolean;
  showVinylDisc?: boolean;
  className?: string;
}

export function AlbumArtwork({
  coverUrl,
  artist,
  album,
  palette,
  size = 'md',
  isSpinning = false,
  showVinylDisc = false,
  className = '',
}: AlbumArtworkProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  const showImage = Boolean(coverUrl && failedUrl !== coverUrl);
  const isLoaded = Boolean(coverUrl && loadedUrl === coverUrl);

  const initials = artist
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className={`relative select-none ${showVinylDisc ? 'pr-6 sm:pr-10' : ''} ${className}`}>
      {showVinylDisc && (
        <div
          aria-hidden="true"
          className={`absolute top-2 bottom-2 right-0 aspect-square rounded-full bg-[#24201c] shadow-lg flex items-center justify-center transition-transform duration-500 ${
            isSpinning ? 'animate-vinyl-spin' : 'animate-vinyl-paused'
          }`}
          style={{
            background:
              'repeating-radial-gradient(circle at center, #1f1b18 0px, #1f1b18 3px, #2b2621 4px, #1e1a17 6px)',
            boxShadow:
              '8px 8px 18px rgba(170, 162, 148, 0.75), -2px -2px 8px rgba(253, 251, 247, 0.45)',
          }}
        >
          <div
            className="w-[34%] h-[34%] rounded-full flex items-center justify-center border-2 border-[#fdfbf7]/30"
            style={{ backgroundColor: '#E9897E' }}
          >
            <div className="w-[26%] h-[26%] rounded-full bg-[#E6E1D8] shadow-inner" />
          </div>
        </div>
      )}

      <div
        className={`relative z-10 aspect-square w-full overflow-hidden neu-inset-sm ${
          size === 'lg' ? 'rounded-2xl p-2' : 'rounded-xl p-1.5'
        }`}
      >
        <div
          className={`relative w-full h-full overflow-hidden ${
            size === 'lg' ? 'rounded-xl' : 'rounded-lg'
          }`}
          style={{
            background: `linear-gradient(145deg, ${palette[0]}, ${palette[1]})`,
          }}
        >
          {/* Fallback / Loading Vinyl Sleeve Graphic */}
          <div
            className={`absolute inset-0 flex flex-col justify-between p-4 text-[#fdfbf7]/90 transition-opacity duration-300 ${
              showImage && isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-tabular text-[11px] tracking-wider uppercase opacity-75">
                {initials}
              </span>
              <Disc3
                className={`w-4 h-4 opacity-70 ${
                  !showImage ? '' : 'animate-vinyl-spin'
                }`}
              />
            </div>
            <div className="space-y-0.5">
              <p className="font-display font-semibold text-sm leading-tight line-clamp-2">
                {album}
              </p>
              <p className="text-xs opacity-75 truncate">{artist}</p>
            </div>
          </div>

          {showImage && coverUrl && (
            <img
              src={coverUrl}
              alt={`${album} by ${artist} album cover`}
              referrerPolicy="no-referrer"
              loading={size === 'lg' ? 'eager' : 'lazy'}
              onLoad={() => setLoadedUrl(coverUrl)}
              onError={() => setFailedUrl(coverUrl)}
              className={`relative z-10 w-full h-full object-cover transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
