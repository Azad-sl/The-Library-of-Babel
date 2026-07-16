export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  hexagon: string;
  published: boolean;
  featured: boolean;
  readMinutes: number;
  views: number;
  likes: number;
  authorId: string;
  authorName: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  hexagon: string;
  featured: boolean;
  readMinutes: number;
  views: number;
  likes: number;
  authorName: string;
  tags: string;
  createdAt: string;
}

export interface HexagonStat {
  name: string;
  count: number;
}

export interface LibraryStats {
  totalVolumes: number;
  totalHexagons: number;
  totalViews: number;
  totalLikes: number;
  oldestDate: string | null;
  newestDate: string | null;
}

/** Detailed library statistics for the About page ledger visualization. */
export interface HexagonDistribution {
  name: string;
  count: number;
  totalWords: number;
  totalViews: number;
  totalLikes: number;
}

export interface MonthlyTrendPoint {
  month: string; // "YYYY-MM"
  count: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface TopPost {
  title: string;
  slug: string;
  views?: number;
  likes?: number;
  hexagon: string;
}

export interface LongestPost {
  title: string;
  slug: string;
  readMinutes: number;
  wordCount: number;
}

export interface LibraryStatsDetail {
  totalWords: number;
  totalReadingMinutes: number;
  avgReadingMinutes: number;
  longestPost: LongestPost | null;
  hexagonDistribution: HexagonDistribution[];
  monthlyTrend: MonthlyTrendPoint[];
  topTags: TagCount[];
  topViewed: TopPost[];
  topLiked: TopPost[];
}

export interface Comment {
  id: string;
  postId: string;
  name: string;
  content: string;
  createdAt: string;
}

/** Anchor locating a highlight inside the article prose. */
export interface HighlightAnchor {
  /** Index of the paragraph among all `p, blockquote, li` inside `.prose-babel`. */
  paragraph: number;
  /** Character offset of the highlighted text within that paragraph's textContent. */
  offset: number;
}

/** A user-saved text highlight with optional margin note. Persisted in localStorage per slug. */
export interface Highlight {
  id: string;
  text: string;
  note?: string;
  createdAt: number;
  anchor: HighlightAnchor;
}

export type View =
  | { name: "home" }
  | { name: "library"; hexagon?: string; tag?: string }
  | { name: "volume"; slug: string }
  | { name: "hexagons" }
  | { name: "hexagon"; hexagon: string }
  | { name: "search"; query: string }
  | { name: "about" }
  | { name: "marginalia" }
  | { name: "write"; slug?: string };
