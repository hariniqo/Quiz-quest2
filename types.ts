export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points?: number;
  timeLimit?: number; // in seconds
}

export interface Quiz {
  id?: string;
  title: string;
  description: string;
  questions: Question[];
  totalPossiblePoints?: number;
  narrative?: string; // For Story-Based Adventures
  createdBy?: string;
  createdAt?: any;
}

export interface MindmapNode {
  id: string;
  label: string;
  description?: string;
  color?: string; // hex or tailwind class
  children?: MindmapNode[];
}

export interface Mindmap {
  title: string;
  root: MindmapNode;
}

export interface HandsOnActivity {
  title: string;
  materials: string[];
  steps: string[];
  objective: string;
}

export interface Summary {
  title: string;
  content: string;
  keyPoints: string[];
}

export interface UserStats {
  score: number;
  streak: number;
  maxStreak: number;
  accuracy: number;
  level: number;
  xp: number;
  lastActive?: string;
  problemsSolved: number;
  totalSubmissions: number;
  correctSubmissions: number;
  incorrectSubmissions: number;
  practiceScore: number;
  instituteRank?: number;
  articlesPublished: number;
  potdStreak: number;
  potdMaxStreak: number;
  potdsSolved: number;
  submissions: Record<string, number>; // date string -> count
  problemsBreakdown: {
    school: number;
    basic: number;
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: any;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp?: any;
  createdAt?: any;
  read?: boolean;
}

export interface ActivityLog {
  date: string;
  count: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  headline?: string;
  aboutMe?: string;
  experience?: string;
  links?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  skills?: string[];
  interests?: string[];
  qualifications?: {
    institution: string;
    year: string;
  }[];
  followers: number;
  following: number;
  followerUids?: string[];
  followingUids?: string[];
  stats: UserStats;
  badges: string[];
  activityLog?: ActivityLog[];
  createdAt: any;
  updatedAt: any;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  participants: number;
  status: 'upcoming' | 'active' | 'finished';
  type: '1v1' | '2v2' | '3v1' | 'open';
  organizer: string; // school or college name
}

export interface ErrorNote {
  id?: string;
  userId: string;
  questionId: string;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  note: string;
  timestamp: any;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  score: number;
  level: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  mnemonic?: string;
}

export interface FlashcardSet {
  title: string;
  cards: Flashcard[];
}

export interface Institution {
  id: string;
  name: string;
  type: 'school' | 'college';
  totalScore: number;
  rank: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  correctIds: string[];
  incorrectIds: string[];
  timestamp: any;
}

export interface VisualifyStep {
  step: number;
  action: string;
  description: string;
}

export interface VisualifyResponse {
  title: string;
  metaphor: string;
  sceneDesign: string;
  animationFlow: VisualifyStep[];
  explanation: string;
  keyFacts: string[];
  realLifeApplication: string;
  styleSuggestions: string;
  videoUrl?: string;
}

export interface SavedContent {
  id?: string;
  userId: string;
  type: 'mindmap' | 'flashcards' | 'summary' | 'visualify';
  title: string;
  data: any;
  timestamp: any;
}

export type QuizState = 'idle' | 'features' | 'about' | 'generating' | 'taking' | 'finished' | 'mindmap' | 'analytics' | 'leaderboard' | 'chat' | 'profile' | 'contests' | 'flashcards' | 'teacher-dashboard' | 'notifications' | 'summary' | 'visualify';
export type Language = 'english' | 'hindi' | 'tamil';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  voiceNavigation: boolean;
  colorBlindMode: ColorBlindMode;
}
