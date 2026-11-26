export type AlbumMoodGroup = 'all' | 'melodic-extreme' | 'black-death-thrash' | 'alt-prog-ost';

export interface AlbumTrack {
  number: number;
  title: string;
  duration: string;
  description: string;
  isStandout: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface StreamingLinks {
  spotify: string;
  appleMusic: string;
  youtubeMusic: string;
  bandcamp: string;
  deezer?: string;
  lastFm: string;
  lastFmArtist: string;
}

export interface EnrichedAlbumData {
  albumId: string;
  releaseYear: string;
  label: string;
  genre: string;
  origin: string;
  producer: string;
  runtime: string;
  editorialSummary: string;
  sonicSignature: string[];
  tracks: AlbumTrack[];
  directLinks: StreamingLinks;
  groundingSources: GroundingSource[];
  enrichedAt: string;
}

export interface AlbumSeed {
  id: string;
  rank: number;
  artist: string;
  album: string;
  plays: number;
  group: Exclude<AlbumMoodGroup, 'all'>;
  palette: [string, string];
  defaultLinks: StreamingLinks;
}

export interface CatalogTrack {
  number: number;
  title: string;
  duration: string;
}

export interface AlbumState extends AlbumSeed {
  coverUrl: string | null;
  coverSource: string | null;
  catalogYear?: string;
  catalogGenre?: string;
  catalogTracks?: CatalogTrack[];
  appleMusicUrl?: string;
  deezerUrl?: string;
  enriched: EnrichedAlbumData | null;
}

function buildLastFmSegment(text: string): string {
  return encodeURIComponent(text).replace(/%20/g, '+');
}

function buildDefaultLinks(artist: string, album: string): StreamingLinks {
  const query = encodeURIComponent(`${artist} ${album}`);
  return {
    spotify: `https://open.spotify.com/search/${query}`,
    appleMusic: `https://music.apple.com/us/search?term=${query}`,
    youtubeMusic: `https://music.youtube.com/search?q=${query}`,
    bandcamp: `https://bandcamp.com/search?q=${query}`,
    lastFm: `https://www.last.fm/music/${buildLastFmSegment(artist)}/${buildLastFmSegment(album)}`,
    lastFmArtist: `https://www.last.fm/music/${buildLastFmSegment(artist)}`,
  };
}

export const FAVORITE_ALBUMS: AlbumSeed[] = [
  {
    id: '01-in-flames-clayman',
    rank: 1,
    artist: 'In Flames',
    album: 'Clayman',
    plays: 1268,
    group: 'melodic-extreme',
    palette: ['#8d442b', '#33251d'],
    defaultLinks: buildDefaultLinks('In Flames', 'Clayman'),
  },
  {
    id: '02-lamb-of-god-ashes-of-the-wake',
    rank: 2,
    artist: 'Lamb of God',
    album: 'Ashes of the Wake',
    plays: 1244,
    group: 'melodic-extreme',
    palette: ['#7f2d24', '#26211e'],
    defaultLinks: buildDefaultLinks('Lamb of God', 'Ashes of the Wake'),
  },
  {
    id: '03-nile-annihilation-of-the-wicked',
    rank: 3,
    artist: 'Nile',
    album: 'Annihilation of the Wicked',
    plays: 1002,
    group: 'black-death-thrash',
    palette: ['#8a6a38', '#2a2217'],
    defaultLinks: buildDefaultLinks('Nile', 'Annihilation of the Wicked'),
  },
  {
    id: '04-anaal-nathrakh-the-whole-of-the-law',
    rank: 4,
    artist: 'Anaal Nathrakh',
    album: 'The Whole of the Law',
    plays: 787,
    group: 'black-death-thrash',
    palette: ['#5f584f', '#211f1d'],
    defaultLinks: buildDefaultLinks('Anaal Nathrakh', 'The Whole of the Law'),
  },
  {
    id: '05-melechesh-emissaries',
    rank: 5,
    artist: 'Melechesh',
    album: 'Emissaries',
    plays: 769,
    group: 'black-death-thrash',
    palette: ['#93632e', '#342214'],
    defaultLinks: buildDefaultLinks('Melechesh', 'Emissaries'),
  },
  {
    id: '06-anaal-nathrakh-hell-is-empty',
    rank: 6,
    artist: 'Anaal Nathrakh',
    album: 'Hell Is Empty, and All the Devils Are Here',
    plays: 752,
    group: 'black-death-thrash',
    palette: ['#753129', '#251a19'],
    defaultLinks: buildDefaultLinks('Anaal Nathrakh', 'Hell Is Empty, and All the Devils Are Here'),
  },
  {
    id: '07-bad-religion-the-process-of-belief',
    rank: 7,
    artist: 'Bad Religion',
    album: 'The Process of Belief',
    plays: 729,
    group: 'alt-prog-ost',
    palette: ['#6f523b', '#272320'],
    defaultLinks: buildDefaultLinks('Bad Religion', 'The Process of Belief'),
  },
  {
    id: '08-in-flames-colony',
    rank: 8,
    artist: 'In Flames',
    album: 'Colony',
    plays: 681,
    group: 'melodic-extreme',
    palette: ['#4e5d52', '#202622'],
    defaultLinks: buildDefaultLinks('In Flames', 'Colony'),
  },
  {
    id: '09-dark-tranquillity-we-are-the-void',
    rank: 9,
    artist: 'Dark Tranquillity',
    album: 'We Are the Void',
    plays: 676,
    group: 'melodic-extreme',
    palette: ['#495561', '#1d2227'],
    defaultLinks: buildDefaultLinks('Dark Tranquillity', 'We Are the Void'),
  },
  {
    id: '10-thorns-thorns',
    rank: 10,
    artist: 'Thorns',
    album: 'Thorns',
    plays: 610,
    group: 'black-death-thrash',
    palette: ['#535558', '#1d1e20'],
    defaultLinks: buildDefaultLinks('Thorns', 'Thorns'),
  },
  {
    id: '11-gama-bomb-citizen-brain',
    rank: 11,
    artist: 'Gama Bomb',
    album: 'Citizen Brain',
    plays: 604,
    group: 'black-death-thrash',
    palette: ['#627247', '#262b1c'],
    defaultLinks: buildDefaultLinks('Gama Bomb', 'Citizen Brain'),
  },
  {
    id: '12-hafdis-huld-synchronised-swimmers',
    rank: 12,
    artist: 'Hafdís Huld',
    album: 'Synchronised Swimmers',
    plays: 596,
    group: 'alt-prog-ost',
    palette: ['#4c707a', '#213137'],
    defaultLinks: buildDefaultLinks('Hafdís Huld', 'Synchronised Swimmers'),
  },
  {
    id: '13-borknagar-quintessence',
    rank: 13,
    artist: 'Borknagar',
    album: 'Quintessence',
    plays: 591,
    group: 'melodic-extreme',
    palette: ['#5b5046', '#25211d'],
    defaultLinks: buildDefaultLinks('Borknagar', 'Quintessence'),
  },
  {
    id: '14-carpathian-forest-fuck-you-all',
    rank: 14,
    artist: 'Carpathian Forest',
    album: 'Fuck You All',
    plays: 584,
    group: 'black-death-thrash',
    palette: ['#4a4643', '#1c1a19'],
    defaultLinks: buildDefaultLinks('Carpathian Forest', 'Fuck You All'),
  },
  {
    id: '15-morbid-angel-gateways-to-annihilation',
    rank: 15,
    artist: 'Morbid Angel',
    album: 'Gateways to Annihilation',
    plays: 582,
    group: 'black-death-thrash',
    palette: ['#6e503f', '#271e19'],
    defaultLinks: buildDefaultLinks('Morbid Angel', 'Gateways to Annihilation'),
  },
  {
    id: '16-anaal-nathrakh-eschaton',
    rank: 16,
    artist: 'Anaal Nathrakh',
    album: 'Eschaton',
    plays: 581,
    group: 'black-death-thrash',
    palette: ['#723c33', '#241715'],
    defaultLinks: buildDefaultLinks('Anaal Nathrakh', 'Eschaton'),
  },
  {
    id: '17-the-pillows-flcl-ost-1-addict',
    rank: 17,
    artist: 'The Pillows',
    album: 'FLCL OST 1: Addict',
    plays: 573,
    group: 'alt-prog-ost',
    palette: ['#b56146', '#3a2219'],
    defaultLinks: buildDefaultLinks('The Pillows', 'FLCL OST 1: Addict'),
  },
  {
    id: '18-agent-fresco-destrier',
    rank: 18,
    artist: 'Agent Fresco',
    album: 'Destrier',
    plays: 559,
    group: 'alt-prog-ost',
    palette: ['#676158', '#262421'],
    defaultLinks: buildDefaultLinks('Agent Fresco', 'Destrier'),
  },
  {
    id: '19-iron-reagan-worse-than-dead',
    rank: 19,
    artist: 'Iron Reagan',
    album: 'Worse Than Dead',
    plays: 558,
    group: 'black-death-thrash',
    palette: ['#79493b', '#2b1c17'],
    defaultLinks: buildDefaultLinks('Iron Reagan', 'Worse Than Dead'),
  },
  {
    id: '20-monster-magnet-powertrip',
    rank: 20,
    artist: 'Monster Magnet',
    album: 'Powertrip',
    plays: 557,
    group: 'alt-prog-ost',
    palette: ['#9e5132', '#331b12'],
    defaultLinks: buildDefaultLinks('Monster Magnet', 'Powertrip'),
  },
];

export const TOTAL_COLLECTION_PLAYS = FAVORITE_ALBUMS.reduce((sum, item) => sum + item.plays, 0);
