/**
 * Placeholder catalog used by the watch landing page until a real content API is wired up.
 */

export type Title = {
  id: string;
  name: string;
  genre: string;
  year: number;
  runtime: string;
  /** Background color for the poster placeholder. */
  color: string;
  /** Watch progress from 0 to 1, for titles the viewer has started. */
  progress?: number;
};

export type Rail = {
  id: string;
  heading: string;
  titles: Title[];
};

export const Categories = ['All', 'Movies', 'Series', 'Live', 'Documentaries', 'Kids'] as const;

export const Featured: Title & { synopsis: string } = {
  id: 'featured',
  name: 'Northern Lights',
  genre: 'Drama',
  year: 2026,
  runtime: '2h 4m',
  color: '#1F3A5F',
  synopsis:
    'A lighthouse keeper on a remote island uncovers a decades-old signal that changes everything she believed about her family.',
};

export const Rails: Rail[] = [
  {
    id: 'continue',
    heading: 'Continue watching',
    titles: [
      { id: 'c1', name: 'Harbor City', genre: 'Crime', year: 2025, runtime: 'S2 · E4', color: '#5B2A3C', progress: 0.62 },
      { id: 'c2', name: 'Quiet Orbit', genre: 'Sci-Fi', year: 2026, runtime: '1h 48m', color: '#2D4A3E', progress: 0.25 },
      { id: 'c3', name: 'The Long Table', genre: 'Food', year: 2024, runtime: 'S1 · E7', color: '#6B4A1F', progress: 0.84 },
    ],
  },
  {
    id: 'trending',
    heading: 'Trending now',
    titles: [
      { id: 't1', name: 'Saltwater', genre: 'Thriller', year: 2026, runtime: '1h 52m', color: '#1E4E5C' },
      { id: 't2', name: 'Paper Kings', genre: 'Comedy', year: 2025, runtime: 'S3', color: '#5C3B1E' },
      { id: 't3', name: 'Ember Road', genre: 'Western', year: 2026, runtime: '2h 11m', color: '#6A2C20' },
      { id: 't4', name: 'Signal Lost', genre: 'Mystery', year: 2024, runtime: 'S1', color: '#33305E' },
      { id: 't5', name: 'Wildwood', genre: 'Family', year: 2026, runtime: '1h 36m', color: '#2E5230' },
    ],
  },
  {
    id: 'new',
    heading: 'New releases',
    titles: [
      { id: 'n1', name: 'Glasshouse', genre: 'Drama', year: 2026, runtime: '1h 58m', color: '#3F4A5A' },
      { id: 'n2', name: 'Night Shift', genre: 'Action', year: 2026, runtime: 'S1', color: '#4A1F3A' },
      { id: 'n3', name: 'Deep Field', genre: 'Documentary', year: 2026, runtime: '1h 22m', color: '#1F2F4A' },
      { id: 'n4', name: 'Second Act', genre: 'Romance', year: 2026, runtime: '1h 44m', color: '#5A3A44' },
    ],
  },
];
