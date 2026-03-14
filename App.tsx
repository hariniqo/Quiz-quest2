/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trophy, 
  BookOpen,
  Loader2,
  Zap,
  Flame,
  Star,
  Globe,
  Plus,
  Minus,
  Timer,
  Award,
  LogOut,
  LogIn,
  Moon,
  Sun,
  Accessibility,
  MessageSquare,
  BarChart3,
  Network,
  TrendingUp,
  Eye,
  Bell,
  X,
  Home,
  Info,
  Download,
  Share2,
  Send,
  Maximize,
  Languages,
  Contrast,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  LayoutDashboard,
  Users,
  School,
  GraduationCap,
  CreditCard,
  Mail,
  MapPin,
  Calendar,
  Edit3,
  Github,
  Twitter,
  Linkedin,
  ExternalLink,
  MessageCircle,
  UserPlus,
  Settings,
  MoreVertical,
  Briefcase,
  Save,
  Video,
  Play,
  Volume2,
  VolumeX,
  Palette,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { generateQuiz, generateMindmap, generateSummary, chatWithAI, generateFlashcards, textToSpeech, generateVisualify, generateVideo } from './services/geminiService';
import { Quiz, QuizState, Language, ColorBlindMode, AccessibilitySettings, UserStats, UserProfile, Mindmap as MindmapType, Summary, FlashcardSet, Contest, Institution, QuizAttempt, ErrorNote, Message, Notification as QuizNotification, SavedContent, VisualifyResponse } from './types';
import ReactMarkdown from 'react-markdown';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, getDoc, setDoc, updateDoc, serverTimestamp, FirebaseUser, handleFirestoreError, OperationType, collection, query, where, orderBy, onSnapshot, deleteDoc } from './firebase';
import { getDocFromServer, addDoc } from 'firebase/firestore';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center p-8 brutal-grid">
          <div className="brutal-card bg-white p-12 max-w-2xl w-full text-center space-y-8">
            <div className="w-24 h-24 bg-brutal-orange text-white rounded-2xl flex items-center justify-center mx-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <XCircle size={64} />
            </div>
            <h1 className="text-5xl font-display uppercase tracking-tighter">System Error</h1>
            <p className="text-xl font-bold uppercase text-red-600">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="brutal-btn bg-brutal-yellow w-full py-4 text-2xl flex items-center justify-center gap-4 hover:bg-white"
            >
              <RotateCcw size={24} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const MOCK_USER_DATA = {
  uid: 'mock-user-123',
  email: 'sample.user@example.com',
  displayName: 'Sample Learner',
  photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
};

const MOCK_PROFILE_DATA: UserProfile = {
  uid: 'mock-user-123',
  email: 'sample.user@example.com',
  displayName: 'Sample Learner',
  photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  headline: 'Aspiring Polymath & Quiz Enthusiast',
  aboutMe: 'I love learning new things every day. Science and History are my favorite subjects!',
  experience: '500+ Quizzes Solved',
  stats: {
    score: 12500,
    streak: 15,
    maxStreak: 24,
    accuracy: 88,
    level: 12,
    xp: 4500,
    problemsSolved: 452,
    totalSubmissions: 520,
    correctSubmissions: 452,
    incorrectSubmissions: 68,
    practiceScore: 850,
    articlesPublished: 3,
    potdStreak: 5,
    potdMaxStreak: 10,
    potdsSolved: 45,
    submissions: {},
    problemsBreakdown: {
      school: 100,
      basic: 150,
      easy: 100,
      medium: 80,
      hard: 22
    }
  },
  followers: 128,
  following: 45,
  badges: ['Early Adopter', 'Streak Master', 'Quiz King'],
  createdAt: { 
    seconds: 1700000000, 
    nanoseconds: 0,
    toDate: () => new Date(1700000000 * 1000)
  },
  updatedAt: { 
    seconds: 1700000000, 
    nanoseconds: 0,
    toDate: () => new Date(1700000000 * 1000)
  }
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [state, setState] = useState<QuizState>('idle');
  const [prompt, setPrompt] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [grade, setGrade] = useState('Grade 10');
  const [subject, setSubject] = useState('Science');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [flashcards, setFlashcards] = useState<FlashcardSet | null>(null);
  const [institution, setInstitution] = useState('');
  const [institutionType, setInstitutionType] = useState<'school' | 'college'>('college');
  const [correctQuestions, setCorrectQuestions] = useState<any[]>([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState<any[]>([]);
  const [allContests, setAllContests] = useState<Contest[]>([]);
  const [allInstitutions, setAllInstitutions] = useState<Institution[]>([]);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const lastSpokenQuestionRef = useRef<number>(-1);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<Language>('english');
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    screenReader: false,
    voiceNavigation: false,
    colorBlindMode: 'none'
  });
  const [mindmap, setMindmap] = useState<MindmapType | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [visualify, setVisualify] = useState<VisualifyResponse | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isListeningForAnswer, setIsListeningForAnswer] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);
  const mainRecognitionRef = useRef<any>(null);

  const stopAllVoice = () => {
    // Stop TTS
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;

    // Stop STT
    if (mainRecognitionRef.current) {
      try {
        mainRecognitionRef.current.onend = null;
        mainRecognitionRef.current.stop();
      } catch (e) {}
      mainRecognitionRef.current = null;
    }
    setIsListeningForAnswer(false);
  };

  const speak = (text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      if (!text || text.trim().length < 2) {
        resolve();
        return;
      }

      isSpeakingRef.current = true;

      // Stop any current audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // Cancel browser speech
      window.speechSynthesis.cancel();

      try {
        const audioUrl = await textToSpeech(text);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        audio.onended = () => {
          if (currentAudioRef.current === audio) currentAudioRef.current = null;
          isSpeakingRef.current = false;
          resolve();
        };
        audio.onerror = () => {
          if (currentAudioRef.current === audio) currentAudioRef.current = null;
          isSpeakingRef.current = false;
          resolve();
        };
        audio.play();
      } catch (err: any) {
        // Only log if it's not a known fallback case
        if (!err.message?.includes('QUOTA_EXCEEDED') && !err.message?.includes('INVALID_PROMPT')) {
          console.error("TTS Error:", err);
        }
        
        // Fallback to browser TTS if AI TTS fails
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to find a female voice
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('google uk english female') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('victoria')
        );
        if (femaleVoice) utterance.voice = femaleVoice;
        
        utterance.onend = () => {
          isSpeakingRef.current = false;
          resolve();
        };
        utterance.onerror = () => {
          isSpeakingRef.current = false;
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      }
    });
  };

  const listenForAnswer = (options: string[]): Promise<string> => {
    return new Promise((resolve) => {
      // Stop main recognition if running
      if (mainRecognitionRef.current) {
        try { 
          mainRecognitionRef.current.onend = null;
          mainRecognitionRef.current.stop(); 
        } catch (e) {}
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        resolve('');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language === 'english' ? 'en-US' : language === 'hindi' ? 'hi-IN' : 'ta-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let resolved = false;

      recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript.toLowerCase();
        console.log('STT Result:', result);
        resolved = true;
        resolve(result);
      };

      recognition.onerror = (event: any) => {
        console.error('ListenForAnswer Error:', event.error);
        if (!resolved) {
          resolved = true;
          resolve('');
        }
      };

      recognition.onend = () => {
        if (!resolved) {
          resolved = true;
          resolve('');
        }
        setIsListeningForAnswer(false);
        // Restart main recognition if needed
        if (accessibility.voiceNavigation) {
          startMainRecognition();
        }
      };

      try {
        recognition.start();
        setIsListeningForAnswer(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
        resolve('');
      }

      // 8 second window
      setTimeout(() => {
        if (!resolved) {
          try { recognition.stop(); } catch (e) {}
          resolved = true;
          resolve('');
        }
      }, 8000);
    });
  };

  const startMainRecognition = () => {
    if (!accessibility.voiceNavigation) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (mainRecognitionRef.current) {
      try { 
        mainRecognitionRef.current.onend = null;
        mainRecognitionRef.current.stop(); 
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    mainRecognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language === 'english' ? 'en-US' : language === 'hindi' ? 'hi-IN' : 'ta-IN';

    recognition.onresult = (event: any) => {
      if (isSpeakingRef.current || isListeningForAnswer) return; 
      const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log('Voice Command:', command);

      if (command.includes('next') || command.includes('continue')) {
        if (state === 'taking' && showFeedback) {
          if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setShowFeedback(null);
            setTimeLeft(quiz?.questions[currentQuestionIndex + 1].timeLimit || 20);
          } else {
            finishQuiz();
          }
        }
      } else if (command.includes('reset') || command.includes('home')) {
        reset();
      } else if (command.includes('stop') || command.includes('clear')) {
        stopAllVoice();
      } else if (command.includes('listen')) {
        if (state === 'idle') {
          speak("Welcome to Quiz Quest AI. You can generate a quiz by typing a topic, view features, or check the leaderboard. Say 'generate' to start a quiz.");
        } else if (state === 'taking' && quiz) {
          const currentQuestion = quiz.questions[currentQuestionIndex];
          speak(`Question ${currentQuestionIndex + 1}: ${currentQuestion.question}. Options are: ${currentQuestion.options.join(', ')}`);
        } else if (state === 'profile') {
          speak(`This is your profile. You have ${xp} XP and a streak of ${streak} days. You have solved ${userProfile?.stats.problemsSolved || 0} problems.`);
        } else if (state === 'leaderboard') {
          speak("This is the global leaderboard. You can see the top learners here.");
        }
      } else if (command.includes('generate')) {
        if (state === 'idle' && prompt.trim()) {
          handleGenerate();
        } else {
          speak("Please provide a topic first by typing or using the voice input.");
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Main Speech Recognition Error:', event.error);
      if (event.error === 'not-allowed') {
        speak("Microphone access was denied. Please enable it in your browser settings to use voice navigation.");
      }
    };

    recognition.onend = () => {
      if (accessibility.voiceNavigation && !isListeningForAnswer) {
        setTimeout(() => {
          if (accessibility.voiceNavigation && !isListeningForAnswer) {
            try { recognition.start(); } catch (e) {}
          }
        }, 1000);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start main recognition:', e);
    }
  };

  // Voice navigation logic removed for manual trigger
  
  useEffect(() => {
    if (accessibility.highContrast) {
      document.body.classList.add('accessibility-contrast');
    } else {
      document.body.classList.remove('accessibility-contrast');
    }
  }, [accessibility.highContrast]);
  const [contests, setContests] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [isGeneratingMindmap, setIsGeneratingMindmap] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [badges, setBadges] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [savedContentList, setSavedContentList] = useState<SavedContent[]>([]);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [mindmapScale, setMindmapScale] = useState(1);
  const [mindmapPos, setMindmapPos] = useState({ x: 0, y: 0 });
  const [isDraggingMindmap, setIsDraggingMindmap] = useState(false);

  const handleMindmapMouseDown = (e: React.MouseEvent) => {
    if (state !== 'mindmap') return;
    setIsDraggingMindmap(true);
  };

  const handleMindmapMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingMindmap) return;
    setMindmapPos(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }));
  };

  const handleMindmapMouseUp = () => {
    setIsDraggingMindmap(false);
  };

  const handleMindmapWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setMindmapScale(prev => Math.min(Math.max(0.5, prev + delta), 3));
    }
  };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'overview' | 'activity' | 'badges' | 'saved'>('overview');
  const [notifications, setNotifications] = useState<QuizNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [errorNotes, setErrorNotes] = useState<ErrorNote[]>([]);
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherAnalytics, setTeacherAnalytics] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedUserForChat, setSelectedUserForChat] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [publicQuizzes, setPublicQuizzes] = useState<Quiz[]>([]);
  
  const [isCreateContestOpen, setIsCreateContestOpen] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isGeneratingVisualify, setIsGeneratingVisualify] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          setError("Firestore connection failed. Please check your configuration.");
        }
      }
    };
    testConnection();

    // Fetch public quizzes
    const fetchPublicQuizzes = async () => {
      try {
        const { collection, query, limit, getDocs, orderBy } = await import('firebase/firestore');
        const quizzesRef = collection(db, 'quizzes');
        const q = query(quizzesRef, orderBy('createdAt', 'desc'), limit(6));
        const querySnapshot = await getDocs(q);
        const quizzes = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Quiz));
        setPublicQuizzes(quizzes);
      } catch (err) {
        console.error("Error fetching public quizzes:", err);
      }
    };
    fetchPublicQuizzes();

    // Mock Auth logic
    const savedUser = localStorage.getItem('mock_user_logged_in');
    if (savedUser === 'true') {
      setUser(MOCK_USER_DATA);
      setUserProfile(MOCK_PROFILE_DATA);
      setScore(MOCK_PROFILE_DATA.stats.score);
      setStreak(MOCK_PROFILE_DATA.stats.streak);
      setMaxStreak(MOCK_PROFILE_DATA.stats.maxStreak);
      setXp(MOCK_PROFILE_DATA.stats.xp);
      setLevel(MOCK_PROFILE_DATA.stats.level);
      setBadges(MOCK_PROFILE_DATA.badges);
    }
    setAuthLoading(false);

    // Disable real auth listener for demo
    /*
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      ...
    });
    return () => unsubscribe();
    */
  }, []);


  const handleListenToQuestion = async () => {
    if (state === 'taking' && quiz && !showFeedback) {
      const currentQuestion = quiz.questions[currentQuestionIndex];
      if (currentQuestion) {
        await speak(`Question ${currentQuestionIndex + 1}: ${currentQuestion.question}`);
        
        const optionsText = currentQuestion.options.map((opt, i) => 
          `Option ${String.fromCharCode(65 + i)}: ${opt}`
        ).join('. ');
        
        await speak(`The options are: ${optionsText}. Please say your answer now.`);
        
        const voiceAnswer = await listenForAnswer(currentQuestion.options);
        if (voiceAnswer) {
          // Try to match option letter or text
          const optionIndex = ['a', 'b', 'c', 'd'].indexOf(voiceAnswer.charAt(0));
          if (optionIndex !== -1 && optionIndex < currentQuestion.options.length) {
            handleAnswer(currentQuestion.options[optionIndex]);
          } else {
            // Try to match text
            const matchedOption = currentQuestion.options.find(opt => 
              voiceAnswer.includes(opt.toLowerCase())
            );
            if (matchedOption) {
              handleAnswer(matchedOption);
            } else {
              await speak("I didn't catch that. Please try again or click the option.");
            }
          }
        }
      }
    }
  };

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    // Mock Sign In
    setTimeout(() => {
      setUser(MOCK_USER_DATA);
      setUserProfile(MOCK_PROFILE_DATA);
      setScore(MOCK_PROFILE_DATA.stats.score);
      setStreak(MOCK_PROFILE_DATA.stats.streak);
      setMaxStreak(MOCK_PROFILE_DATA.stats.maxStreak);
      setXp(MOCK_PROFILE_DATA.stats.xp);
      setLevel(MOCK_PROFILE_DATA.stats.level);
      setBadges(MOCK_PROFILE_DATA.badges);
      localStorage.setItem('mock_user_logged_in', 'true');
      setIsSigningIn(false);
    }, 1000);
  };

  const handleSignOut = async () => {
    setUser(null);
    setUserProfile(null);
    localStorage.removeItem('mock_user_logged_in');
    reset();
    setState('idle');
  };

  useEffect(() => {
    if (!user || !selectedUserForChat) return;
    const q = query(
      collection(db, 'messages'),
      where('senderId', 'in', [user.uid, selectedUserForChat.uid]),
      where('receiverId', 'in', [user.uid, selectedUserForChat.uid]),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Message)));
    }, (error) => {
      console.error("Chat listener error:", error);
    });
    return () => unsubscribe();
  }, [user, selectedUserForChat]);

  useEffect(() => {
    const currentQuestion = quiz?.questions[currentQuestionIndex];
    const isAnswered = currentQuestion && userAnswers[currentQuestion.id];

    if (state === 'taking' && timeLeft > 0 && !showFeedback && !isAnswered && !accessibility.voiceNavigation) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAnswer(''); // Time's up
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, currentQuestionIndex, timeLeft, showFeedback, quiz, userAnswers]);

  const handleGenerate = async () => {
    if (!prompt.trim() && !sourceImage && !sourceUrl) return;

    setState('generating');
    setError(null);
    try {
      const sourceData = {
        text: prompt,
        image: sourceImage || undefined,
        url: sourceUrl || undefined
      };
      const generatedQuiz = await generateQuiz(
        `${prompt} (Target: ${grade}, Subject: ${subject}, Questions: ${numQuestions})`, 
        sourceData,
        isStoryMode,
        language
      );
      setQuiz(generatedQuiz);
      setState('taking');
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setCorrectQuestions([]);
      setIncorrectQuestions([]);
      setTimeLeft(generatedQuiz.questions[0].timeLimit || 20);
    } catch (err) {
      console.error(err);
      setError('Failed to generate quiz. Please try again.');
      setState('idle');
    }
  };

  const handleVisualify = async () => {
    if (!prompt.trim() && !sourceImage && !sourceUrl) return;
    setIsGeneratingVisualify(true);
    setError(null);
    setState('generating');
    try {
      const sourceData = {
        text: prompt,
        image: sourceImage || undefined,
        url: sourceUrl || undefined
      };
      const result = await generateVisualify(prompt, sourceData, language);
      setVisualify(result);
      setState('visualify');
    } catch (err) {
      console.error(err);
      setError('Failed to visualify concept. Please try again.');
      setState('idle');
    } finally {
      setIsGeneratingVisualify(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!visualify) return;
    
    // Check for API key
    if (!(window as any).aistudio?.hasSelectedApiKey()) {
      await (window as any).aistudio?.openSelectKey();
      // Proceed assuming success as per instructions
    }

    setIsGeneratingVideo(true);
    setVideoError(null);
    try {
      const videoUrl = await generateVideo(visualify.sceneDesign);
      setVisualify(prev => prev ? { ...prev, videoUrl } : null);
    } catch (err) {
      console.error(err);
      setVideoError('Failed to generate animation. Please check your API key and billing.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (showFeedback || !quiz || !user) return;
    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (userAnswers[currentQuestion.id]) return; // Prevent answering again
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = answer === currentQuestion.correctAnswer;
    setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));

    if (isCorrect) {
      setCorrectQuestions(prev => [...prev, currentQuestion]);
    } else {
      setIncorrectQuestions(prev => [...prev, currentQuestion]);
    }

    let newScore = score;
    let newStreak = streak;
    let newMaxStreak = maxStreak;
    let newXp = xp;
    let newLevel = level;

    if (isCorrect) {
      const timeBonus = Math.round((timeLeft / (currentQuestion.timeLimit || 20)) * 500);
      const basePoints = currentQuestion.points || 500;
      const totalPoints = basePoints + timeBonus;
      
      newScore += totalPoints;
      newStreak += 1;
      if (newStreak > newMaxStreak) newMaxStreak = newStreak;

      setScore(newScore);
      setStreak(newStreak);
      setMaxStreak(newMaxStreak);
      setLastPoints(totalPoints);
      setShowFeedback('correct');
      
      const gainedXp = Math.floor(totalPoints / 10);
      newXp += gainedXp;
      if (newXp >= newLevel * 1000) {
        newLevel += 1;
        setLevel(newLevel);
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.3 },
          colors: ['#FFD700', '#FFFFFF', '#00FF00']
        });
      }
      setXp(newXp);
    } else {
      newStreak = 0;
      setStreak(0);
      setShowFeedback(answer === '' ? 'timeout' : 'incorrect');
      setLastPoints(0);
    }

    setTimeout(async () => {
      setShowFeedback(null);
      if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setTimeLeft(quiz.questions[currentQuestionIndex + 1].timeLimit || 20);
      } else {
        finishQuiz();
      }
    }, 1500);
  };

  const finishQuiz = async () => {
    setState('finished');
    
    let finalQuizId = quiz.id;

    // Save Quiz to Firestore only if it's new
    if (!finalQuizId) {
      finalQuizId = `quiz_${Date.now()}`;
      await setDoc(doc(db, 'quizzes', finalQuizId), {
        ...quiz,
        id: finalQuizId,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
    }

    // Save Attempt to Firestore
    const attemptId = `attempt_${Date.now()}`;
    const correctIds = quiz.questions.filter(q => userAnswers[q.id] === q.correctAnswer).map(q => q.id);
    const incorrectIds = quiz.questions.filter(q => userAnswers[q.id] !== q.correctAnswer).map(q => q.id);

    await setDoc(doc(db, 'attempts', attemptId), {
      id: attemptId,
      quizId: finalQuizId,
      userId: user.uid,
      score: score,
      correctIds,
      incorrectIds,
      timestamp: serverTimestamp()
    });

    // Update User Stats
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      'stats.score': score,
      'stats.streak': streak,
      'stats.maxStreak': maxStreak,
      'stats.xp': xp,
      'stats.level': level,
      'stats.practiceScore': score,
      'updatedAt': serverTimestamp()
    });

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#10b981', '#f59e0b']
    });
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    let correct = 0;
    quiz.questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const reset = () => {
    setState('idle');
    setQuiz(null);
    setPrompt('');
    setUserAnswers({});
    setError(null);
  };

  const handleClaimBadge = async () => {
    if (!quiz || !user) return;
    const accuracy = Math.round((quiz.questions.filter(q => userAnswers[q.id] === q.correctAnswer).length / quiz.questions.length) * 100);
    let badgeName = '';
    
    if (accuracy === 100) badgeName = 'Perfect Scholar';
    else if (maxStreak >= 5) badgeName = 'Streak Master';
    else if (score > 5000) badgeName = 'High Roller';
    else badgeName = 'Quest Finisher';

    if (!badges.includes(badgeName)) {
      const newBadges = [...badges, badgeName];
      setBadges(newBadges);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        badges: newBadges,
        updatedAt: serverTimestamp()
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF00FF', '#00FFFF']
      });
    }
  };

  const translations = {
    english: {
      heroTitle: "Knowledge Unlocked",
      heroSubtitle: "Stop boring learning. Start your AI-powered quest now.",
      startQuest: "AI Quest",
      visualify: "Visualify",
      generateSummary: "Summary",
      generateMindmap: "Mindmap",
      doubtSupport: "24/7 Support",
      leaderboard: "Leaderboard",
      analytics: "Analytics",
      home: "Home",
      features: "Features",
      about: "About",
      grade: "Grade",
      subject: "Subject",
      concept: "Enter Concept",
      questions: "Number of Questions",
      storyMode: "Story Mode",
      correct: "AWESOME!",
      incorrect: "OOF!",
      timeout: "TIME'S UP!",
      perfect: "Perfect Scholar",
      streakMaster: "Streak Master"
    },
    hindi: {
      heroTitle: "मस्तिष्क शक्ति अनलॉक",
      heroSubtitle: "उबाऊ सीखना बंद करें। अपनी एआई-संचालित खोज अभी शुरू करें।",
      startQuest: "एआई खोज",
      generateMindmap: "माइंडमैप",
      generateSummary: "सारांश",
      doubtSupport: "24/7 सहायता",
      leaderboard: "लीडरबोर्ड",
      analytics: "एनालिटिक्स",
      home: "होम",
      features: "विशेषताएं",
      about: "हमारे बारे में",
      grade: "ग्रेड",
      subject: "विषय",
      concept: "अवधारणा दर्ज करें",
      questions: "प्रश्नों की संख्या",
      storyMode: "कहानी मोड",
      correct: "बहुत बढ़िया!",
      incorrect: "ओह!",
      timeout: "समय समाप्त!",
      perfect: "परफेक्ट स्कॉलर",
      streakMaster: "स्ट्रीक मास्टर"
    },
    tamil: {
      heroTitle: "மூளை சக்தி திறக்கப்பட்டது",
      heroSubtitle: "சலிப்பான கற்றலை நிறுத்துங்கள். உங்கள் AI-இயங்கும் தேடலை இப்போதே தொடங்குங்கள்.",
      startQuest: "AI தேடல்",
      generateMindmap: "மன வரைபடம்",
      generateSummary: "சுருக்கம்",
      doubtSupport: "24/7 ஆதரவு",
      leaderboard: "தரவரிசை",
      analytics: "பகுப்பாய்வு",
      home: "முகப்பு",
      features: "அம்சங்கள்",
      about: "பற்றி",
      grade: "வகுப்பு",
      subject: "பாடம்",
      concept: "கருத்தை உள்ளிடவும்",
      questions: "கேள்விகளின் எண்ணிக்கை",
      storyMode: "கதை முறை",
      correct: "அருமை!",
      incorrect: "ஐயோ!",
      timeout: "நேரம் முடிந்தது!",
      perfect: "சிறந்த அறிஞர்",
      streakMaster: "தொடர் வெற்றியாளர்"
    }
  };

  const t = translations[language];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 1024;
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setSourceImage(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            setSourceImage(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateMindmap = async () => {
    if (!prompt.trim() && !sourceImage && !sourceUrl) return;
    setState('generating');
    try {
      const sourceData = { text: prompt, image: sourceImage || undefined, url: sourceUrl || undefined };
      const mm = await generateMindmap(prompt, sourceData, language);
      setMindmap(mm);
      setState('mindmap');
    } catch (err) {
      console.error(err);
      setError('Failed to generate mindmap.');
      setState('idle');
    }
  };

  const handleGenerateSummary = async () => {
    if (!prompt.trim() && !sourceImage && !sourceUrl) return;
    setState('generating');
    try {
      const sourceData = { text: prompt, image: sourceImage || undefined, url: sourceUrl || undefined };
      const s = await generateSummary(prompt, sourceData, language);
      setSummary(s);
      setState('summary');
    } catch (err) {
      console.error(err);
      setError('Failed to generate summary.');
      setState('idle');
    }
  };

  const saveContent = async (type: 'mindmap' | 'flashcards' | 'summary' | 'visualify', title: string, data: any) => {
    if (!user) {
      alert('Please sign in to save content.');
      return;
    }
    try {
      const contentRef = doc(collection(db, 'users', user.uid, 'savedContent'));
      const newContent = {
        userId: user.uid,
        type,
        title,
        data,
        timestamp: serverTimestamp()
      };
      await setDoc(contentRef, newContent);
      setSavedContentList(prev => [{ id: contentRef.id, ...newContent }, ...prev]);
      alert('Content saved successfully!');
    } catch (err) {
      console.error('Error saving content:', err);
      alert('Failed to save content.');
    }
  };

  const deleteSavedContent = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'savedContent', id));
      setSavedContentList(prev => prev.filter(item => item.id !== id));
      alert('Content deleted successfully!');
    } catch (err) {
      console.error('Error deleting content:', err);
      alert('Failed to delete content.');
    }
  };

  const downloadContent = (type: 'mindmap' | 'flashcards' | 'summary' | 'visualify', title: string, data: any) => {
    let content = '';
    let filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${type}.txt`;
    let mimeType = 'text/plain';

    if (type === 'summary') {
      content = data.content;
    } else if (type === 'flashcards') {
      content = data.cards.map((c: any) => `Q: ${c.front}\nA: ${c.back}${c.mnemonic ? `\nMnemonic: ${c.mnemonic}` : ''}`).join('\n\n');
    } else if (type === 'mindmap') {
      content = JSON.stringify(data, null, 2);
      filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_mindmap.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateFlashcards = async () => {
    if (!prompt.trim() && !sourceImage && !sourceUrl) return;
    setIsGeneratingFlashcards(true);
    setState('generating');
    try {
      const sourceData = { text: prompt, image: sourceImage || undefined, url: sourceUrl || undefined };
      const { generateFlashcards } = await import('./services/geminiService');
      const f = await generateFlashcards(prompt, sourceData, language);
      setFlashcards(f);
      setState('flashcards');
      
      // Log activity
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        const userRef = doc(db, 'users', user.uid);
        const newLog = [...(userProfile?.activityLog || [])];
        const existingIndex = newLog.findIndex(l => l.date === today);
        if (existingIndex >= 0) {
          newLog[existingIndex].count += 1;
        } else {
          newLog.push({ date: today, count: 1 });
        }
        await updateDoc(userRef, { activityLog: newLog });
        setUserProfile(prev => prev ? { ...prev, activityLog: newLog } : null);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate flashcards.');
      setState('idle');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user' as const, text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    try {
      const aiResponse = await chatWithAI(chatInput, quiz?.title || prompt, language);
      setChatMessages(prev => [...prev, { role: 'ai' as const, text: aiResponse }]);
    } catch (err) {
      console.error(err);
    }
  };

  const CircularTimer = ({ current, total }: { current: number, total: number }) => {
    if (accessibility.voiceNavigation) return null;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (current / total) * circumference;
    
    return (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className={`${theme === 'dark' ? 'text-white/10' : 'text-black/10'}`}
          />
          <motion.circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            className={`${current < 5 ? 'text-brutal-orange' : 'text-brutal-blue'}`}
          />
        </svg>
        <span className={`absolute font-display text-3xl ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{current}</span>
      </div>
    );
  };

  const getAccessibilityFilter = () => {
    switch (accessibility.colorBlindMode) {
      case 'protanopia': return 'url(#protanopia-filter)';
      case 'deuteranopia': return 'url(#deuteranopia-filter)';
      case 'tritanopia': return 'url(#tritanopia-filter)';
      default: return 'none';
    }
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-[#F0F0F0] text-black'}`}>
        <Loader2 className={`animate-spin ${theme === 'dark' ? 'text-white' : 'text-black'}`} size={64} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col brutal-grid ${theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-[#F0F0F0] text-black'}`}>
        {/* Login Top Bar */}
        <div className="bg-white dark:bg-zinc-900 border-b-8 border-black dark:border-white p-6 flex justify-between items-center shadow-[0_8px_0_0_rgba(0,0,0,1)] dark:shadow-[0_8px_0_0_rgba(255,255,255,0.2)]">
          <div className="flex items-center gap-4">
            <Sparkles className="text-brutal-green" size={32} />
            <span className="font-display text-3xl uppercase tracking-tighter">QuizQuest AI</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setAccessibility(prev => ({ ...prev, voiceNavigation: !prev.voiceNavigation }))}
              className={`w-12 h-12 border-4 border-black dark:border-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all relative ${accessibility.voiceNavigation ? 'bg-brutal-pink text-white' : 'bg-white dark:bg-zinc-900'}`}
              title="Voice Guide"
              aria-label="Toggle Voice Guide"
            >
              {accessibility.voiceNavigation ? <Volume2 size={24} /> : <VolumeX size={24} />}
              {accessibility.voiceNavigation && (
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute -top-2 -right-2 w-4 h-4 bg-brutal-pink rounded-full border-2 border-white"
                />
              )}
            </button>

            <button 
              onClick={() => setAccessibility(prev => ({ ...prev, highContrast: !prev.highContrast }))}
              className={`w-12 h-12 border-4 border-black dark:border-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all ${accessibility.highContrast ? 'bg-black text-white' : 'bg-white dark:bg-zinc-900'}`}
              title="Toggle High Contrast"
              aria-label="Toggle High Contrast Mode"
            >
              <Palette size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className={`brutal-card p-12 max-w-2xl w-full text-center space-y-8 ${theme === 'dark' ? 'bg-zinc-900 border-white' : 'bg-white border-black'}`}>
            <div className="w-24 h-24 bg-black text-brutal-green rounded-2xl flex items-center justify-center mx-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
              <Sparkles size={64} />
            </div>
            <h1 className="text-7xl font-display uppercase tracking-tighter">QuizQuest AI</h1>
            <p className="text-2xl font-bold uppercase">The ultimate AI-powered learning adventure. Join the quest today.</p>
            <button 
              onClick={handleSignIn}
              className="brutal-btn bg-brutal-yellow w-full py-6 text-3xl flex items-center justify-center gap-4 hover:bg-white dark:hover:text-black"
            >
              <LogIn size={32} />
              Enter Learning Quest
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div 
        style={{ filter: getAccessibilityFilter() }}
        className={`min-h-screen ${
          theme === 'dark' ? 'dark-theme bg-zinc-950 text-white' : 'bg-[#F0F0F0] text-black'
        } ${accessibility.highContrast ? 'high-contrast' : ''} ${accessibility.largeText ? 'large-text' : ''} font-sans overflow-x-hidden brutal-grid transition-colors duration-300`}
      >
      {/* Marquee Ticker */}
      <div className="bg-black text-white border-b-4 border-black overflow-hidden py-2 whitespace-nowrap">
        <div className="inline-block animate-marquee uppercase font-mono text-xs tracking-[0.3em] font-black">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="mx-12">
              Level up your brain • Generate any topic • Unlock badges • Compete globally • AI Powered Learning •
            </span>
          ))}
        </div>
      </div>

      {/* Gamified Header */}
      <header className="bg-white dark:bg-zinc-900 border-b-8 border-black dark:border-white sticky top-0 z-50 shadow-[0_8px_0_0_rgba(0,0,0,1)] dark:shadow-[0_8px_0_0_rgba(255,255,255,0.2)] transition-colors">
        <div className="max-w-[1400px] mx-auto flex items-stretch h-24">
          <div 
            className="flex items-center gap-4 px-10 border-r-8 border-black dark:border-white cursor-pointer hover:bg-brutal-yellow transition-colors"
            onClick={reset}
          >
            <span className="font-display text-5xl uppercase tracking-tighter">QuizQuest</span>
          </div>

          <div className="flex-1 flex items-center px-10">
            <nav className="flex items-center gap-8 h-full">
              {[
                { id: 'idle', icon: Home, label: t.home },
                { id: 'features', icon: Sparkles, label: 'Features' },
                { id: 'leaderboard', icon: Trophy, label: t.leaderboard },
                { id: 'contests', icon: Award, label: 'Contests' },
                { id: 'profile', icon: LayoutDashboard, label: 'Profile' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setState(item.id as QuizState)}
                  className={`flex items-center gap-3 font-display uppercase text-lg hover:text-brutal-pink transition-all relative group h-full px-4 ${state === item.id ? 'text-brutal-pink' : 'dark:text-white'}`}
                >
                  <item.icon size={22} />
                  {item.label}
                  {state === item.id && (
                    <motion.div 
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-0 right-0 h-2 bg-brutal-pink"
                    />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-8 px-10 border-l-8 border-black dark:border-white bg-zinc-50 dark:bg-zinc-800 transition-colors">
            {/* Compact Stats Bar */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 group cursor-help" title="Current Streak">
                <div className="w-10 h-10 bg-brutal-pink/10 border-2 border-black flex items-center justify-center group-hover:bg-brutal-pink group-hover:text-white transition-colors">
                  <Flame size={20} />
                </div>
                <span className="font-display text-2xl">{streak}</span>
              </div>
              <div className="flex items-center gap-2 group cursor-help" title="Total XP">
                <div className="w-10 h-10 bg-brutal-green/10 border-2 border-black flex items-center justify-center group-hover:bg-brutal-green transition-colors">
                  <Zap size={20} />
                </div>
                <span className="font-display text-2xl">{xp}</span>
              </div>
            </div>

            <div className="h-12 w-1 bg-black/10" />

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setAccessibility(prev => ({ ...prev, highContrast: !prev.highContrast }))}
                className={`w-12 h-12 border-4 border-black dark:border-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all ${accessibility.highContrast ? 'bg-black text-white' : 'bg-white dark:bg-zinc-900'}`}
                title="Toggle High Contrast"
                aria-label="Toggle High Contrast Mode"
              >
                <Palette size={24} />
              </button>

              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="w-12 h-12 bg-white dark:bg-zinc-900 border-4 border-black dark:border-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? <Moon size={24} /> : <Sun size={24} className="text-white" />}
              </button>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-12 h-12 bg-white dark:bg-zinc-900 border-4 border-black dark:border-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                title="Settings"
              >
                <Settings size={24} className="dark:text-white" />
              </button>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-12 h-12 bg-white border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all relative"
                  title="Notifications"
                >
                  <Bell size={24} />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-brutal-orange border-2 border-black rounded-full text-[10px] text-white flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-6 w-80 bg-white border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] z-[100] overflow-hidden"
                    >
                      <div className="p-4 bg-brutal-yellow border-b-8 border-black flex justify-between items-center">
                        <h3 className="font-display text-xl uppercase tracking-tight">Notifications</h3>
                        <button onClick={() => setShowNotifications(false)} className="brutal-btn bg-brutal-pink !p-1 !rounded-lg">
                          <X size={20} />
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-12 text-center text-black/30 font-display uppercase text-sm">No notifications</div>
                        ) : (
                          notifications.map(n => (
                            <div 
                              key={n.id} 
                              className={`p-4 border-b-4 border-black hover:bg-zinc-50 cursor-pointer transition-colors ${!n.read ? 'bg-brutal-blue/5' : ''}`}
                              onClick={async () => {
                                const { doc, updateDoc } = await import('firebase/firestore');
                                await updateDoc(doc(db, 'notifications', n.id), { read: true });
                                setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                              }}
                            >
                              <div className="flex gap-4">
                                <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 border-2 border-black ${
                                  n.type === 'success' ? 'bg-brutal-green' : 
                                  n.type === 'error' ? 'bg-brutal-orange' : 
                                  n.type === 'warning' ? 'bg-brutal-yellow' : 'bg-brutal-blue'
                                }`} />
                                <div>
                                  <p className="font-display text-sm uppercase leading-tight mb-1">{n.title}</p>
                                  <p className="font-mono text-[10px] leading-relaxed opacity-70">{n.message}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={profileDropdownRef}>
                <button 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="w-14 h-14 bg-white dark:bg-zinc-900 border-4 border-black dark:border-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all overflow-hidden"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Users size={28} className="dark:text-white" />
                  )}
                </button>
                
                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-6 w-72 bg-white dark:bg-zinc-900 border-8 border-black dark:border-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] z-[100]"
                    >
                      <div className="p-6 border-b-8 border-black dark:border-white bg-brand-accent dark:bg-brand-accent/80">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-12 h-12 bg-black border-4 border-black dark:border-white rounded-full overflow-hidden">
                            {user.photoURL && <img src={user.photoURL} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-xl uppercase truncate text-black">{user.displayName}</p>
                            <p className="font-mono text-[10px] truncate opacity-70 text-black">{user.email}</p>
                          </div>
                        </div>
                        <div className="bg-black/10 p-2 border-2 border-black/20 text-[10px] font-black uppercase text-black">
                          Level {level} Explorer
                        </div>
                      </div>
                      <div className="p-3 space-y-1">
                        {[
                          { id: 'profile', icon: LayoutDashboard, label: 'My Profile', color: 'hover:bg-brand-secondary hover:text-white dark:hover:bg-brand-secondary' },
                          { id: 'edit', icon: Edit3, label: 'Edit Profile', color: 'hover:bg-brand-primary hover:text-white dark:hover:bg-brand-primary', action: () => setIsEditProfileOpen(true) },
                          { id: 'settings', icon: Settings, label: 'Settings', color: 'hover:bg-brand-accent dark:hover:bg-brand-accent', action: () => setIsSettingsOpen(true) },
                        ].map(item => (
                          <button 
                            key={item.id}
                            onClick={() => { 
                              if (item.action) item.action();
                              else setState(item.id as QuizState);
                              setIsProfileDropdownOpen(false); 
                            }}
                            className={`w-full text-left px-4 py-3 font-display uppercase text-sm ${item.color} transition-colors flex items-center gap-4 dark:text-white`}
                          >
                            <item.icon size={20} />
                            {item.label}
                          </button>
                        ))}
                        <div className="h-2 bg-black dark:bg-white mx-[-12px] my-2" />
                        <button 
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-3 font-display uppercase text-sm hover:bg-brutal-orange hover:text-white transition-colors flex items-center gap-4 dark:text-white"
                        >
                          <LogOut size={20} />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 py-12">
        <AnimatePresence mode="wait">
          {state === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 space-y-12"
            >
              <div className="relative">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 90, 180, 270, 360],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-48 h-48 border-[12px] border-black border-t-brand-secondary border-r-brand-primary border-b-brand-accent border-l-brand-muted rounded-full" 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ 
                      filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(0deg)"]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles size={80} className="text-black" />
                  </motion.div>
                </div>
              </div>
              <div className="text-center space-y-6">
                <h2 className="text-8xl font-display tracking-tighter animate-glitch">
                  <span className="bg-black text-white px-4">NEURAL</span> <br />
                  <span className="text-brand-primary">SYNTHESIS</span>
                </h2>
                <p className="text-3xl font-mono font-bold uppercase animate-pulse">
                  Injecting knowledge into your quest...
                </p>
              </div>
            </motion.div>
          )}

          {state === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16 py-12"
            >
              <div className="text-center space-y-6">
                <h2 className="text-9xl font-display uppercase tracking-tighter">All Features</h2>
                <p className="text-2xl font-mono font-bold uppercase opacity-60">Explore the power of AI-driven learning</p>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={async () => {
                    setState('generating');
                    const featuresPrompt = "Explain the features of QuizQuest AI: AI Quiz Generation, Visualify (Mindmaps), Flashcards, Summaries, 24/7 Doubt Support, Accessibility Suite, Competition Contests, Profile Dashboard, Quiz Analysis, Teacher Analytics, Multilingual Support.";
                    try {
                      const mm = await generateMindmap(featuresPrompt, { text: featuresPrompt }, language);
                      setMindmap(mm);
                      setState('mindmap');
                    } catch (err) {
                      console.error(err);
                      setState('idle');
                    }
                  }}
                  className="brutal-btn bg-brutal-pink text-white py-4 px-12 text-2xl flex items-center gap-3 hover:bg-white hover:text-black"
                >
                  <Network size={32} /> Visualify Features
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { title: '24/7 Doubt Support', desc: 'Instant AI assistance for any academic query.', icon: <MessageSquare size={32} />, action: () => setIsChatOpen(true), color: 'bg-brutal-blue' },
                  { title: 'AI Quiz Generation', desc: 'Create custom quizzes from text, images, or URLs.', icon: <Sparkles size={32} />, state: 'idle', color: 'bg-brutal-green' },
                  { title: 'Accessibility Suite', desc: 'Tools for color blindness, high contrast, and more.', icon: <Accessibility size={32} />, action: () => setIsSettingsOpen(true), color: 'bg-brutal-pink' },
                  { title: 'Competition Contests', desc: 'Join school/college level contests and win rankings.', icon: <Award size={32} />, state: 'contests', color: 'bg-brutal-orange' },
                  { title: 'Flashcard Generator', desc: 'Convert notes into interactive flashcards instantly.', icon: <CreditCard size={32} />, state: 'flashcards', color: 'bg-brutal-yellow' },
                  { title: 'Interactive Visualify', desc: 'Visualize complex concepts with dynamic mindmaps.', icon: <Network size={32} />, state: 'mindmap', color: 'bg-brutal-pink' },
                  { title: 'Multilingual Support', desc: 'Learn in English, Hindi, or Tamil seamlessly.', icon: <Globe size={32} />, action: () => setIsSettingsOpen(true), color: 'bg-brutal-blue' },
                  { title: 'Profile Dashboard', desc: 'Track your progress, badges, and institutional ranking.', icon: <LayoutDashboard size={32} />, state: 'profile', color: 'bg-brutal-green' },
                  { title: 'Quiz Analysis', desc: 'Detailed breakdown of correct and incorrect answers.', icon: <BarChart3 size={32} />, state: 'analytics', color: 'bg-brutal-orange' },
                  { title: 'Smart Summaries', desc: 'Get concise summaries of long articles or notes.', icon: <FileText size={32} />, state: 'idle', color: 'bg-brutal-yellow' },
                  { title: 'Teacher Analytics', desc: 'Comprehensive data for educators to track student growth.', icon: <Users size={32} />, state: 'analytics', color: 'bg-brutal-pink' },
                ].sort((a, b) => a.title.localeCompare(b.title)).map((f, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      if (f.state) setState(f.state as any);
                      if (f.action) f.action();
                    }}
                    className="brutal-card p-8 space-y-6 hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all cursor-pointer group dark:bg-zinc-900 dark:border-white"
                  >
                    <div className={`w-20 h-20 ${f.color} border-4 border-black dark:border-white flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] group-hover:rotate-12 transition-transform`}>
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="text-3xl font-display uppercase leading-none mb-2">{f.title}</h3>
                      <p className="text-lg font-bold opacity-70 leading-tight">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {state === 'profile' && userProfile && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12 py-12"
            >
              {/* Profile Header */}
              <div className="brutal-card bg-white p-12 flex flex-col md:flex-row gap-12 items-center md:items-start relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brutal-yellow/10 rounded-full blur-3xl -mr-32 -mt-32" />
                
                <div className="relative">
                  <div className="w-48 h-48 border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-brutal-green">
                    {userProfile.photoURL ? (
                      <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={96} className="m-auto mt-10" />
                    )}
                  </div>
                  <button 
                    onClick={() => setIsEditProfileOpen(true)}
                    className="absolute -bottom-4 -right-4 w-12 h-12 bg-brutal-yellow border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                  >
                    <Edit3 size={24} />
                  </button>
                </div>

                <div className="flex-1 space-y-6 text-center md:text-left">
                  <div className="space-y-2">
                    <h2 className="text-7xl font-display tracking-tighter uppercase">{userProfile.displayName}</h2>
                    <p className="text-2xl font-mono font-bold text-brutal-pink uppercase">{userProfile.headline || 'Quest Explorer'}</p>
                  </div>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-6">
                    <div className="flex items-center gap-2 font-bold uppercase text-sm">
                      <Mail size={18} className="text-brutal-blue" />
                      {userProfile.email}
                    </div>
                    {userProfile.experience && (
                      <div className="flex items-center gap-2 font-bold uppercase text-sm">
                        <Briefcase size={18} className="text-brutal-orange" />
                        {userProfile.experience}
                      </div>
                    )}
                    <div className="flex items-center gap-2 font-bold uppercase text-sm">
                      <Calendar size={18} className="text-brutal-green" />
                      Joined {userProfile.createdAt ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                    <button 
                      onClick={async () => {
                        if (!user || !userProfile) return;
                        const userRef = doc(db, 'users', user.uid);
                        const isFollowingNow = !isFollowing;
                        setIsFollowing(isFollowingNow);
                        
                        const newFollowers = isFollowingNow ? (userProfile.followers || 0) + 1 : Math.max(0, (userProfile.followers || 0) - 1);
                        
                        await updateDoc(userRef, { followers: newFollowers });
                        setUserProfile(prev => prev ? { ...prev, followers: newFollowers } : null);
                        
                        if (isFollowingNow) {
                          confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
                          // Add notification
                          const { collection, addDoc } = await import('firebase/firestore');
                          await addDoc(collection(db, 'notifications'), {
                            userId: user.uid,
                            title: 'New Follower!',
                            message: `${user.displayName} started following you.`,
                            type: 'success',
                            read: false,
                            timestamp: serverTimestamp()
                          });
                        }
                      }}
                      className={`brutal-btn ${isFollowing ? 'bg-zinc-200' : 'bg-black text-white'} px-8 py-2 text-sm flex items-center gap-2`}
                    >
                      {isFollowing ? <CheckCircle2 size={18} /> : <UserPlus size={18} />}
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedUserForChat(userProfile);
                        setIsChatModalOpen(true);
                      }}
                      className="brutal-btn bg-white px-8 py-2 text-sm flex items-center gap-2"
                    >
                      <MessageCircle size={18} />
                      Message
                    </button>
                    <button 
                      onClick={() => setState('leaderboard')}
                      className="w-12 h-12 border-4 border-black flex items-center justify-center hover:bg-brutal-yellow transition-colors"
                    >
                      <Trophy size={24} />
                    </button>
                  </div>
                </div>

                <div className="w-full md:w-64 space-y-4">
                  <div className="brutal-card bg-brutal-yellow p-4 text-center">
                    <p className="text-xs font-bold uppercase opacity-70">Total Score</p>
                    <p className="text-4xl font-display">{userProfile.stats.score}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="brutal-card bg-white p-4 text-center">
                      <p className="text-[10px] font-bold uppercase opacity-70">Rank</p>
                      <p className="text-2xl font-display">#42</p>
                    </div>
                    <div className="brutal-card bg-white p-4 text-center">
                      <p className="text-[10px] font-bold uppercase opacity-70">Level</p>
                      <p className="text-2xl font-display">{userProfile.stats.level}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b-4 border-black">
                {[
                  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                  { id: 'activity', label: 'Activity', icon: BarChart3 },
                  { id: 'badges', label: 'Badges', icon: Award },
                  { id: 'saved', label: 'Saved Content', icon: Save },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setProfileTab(tab.id as any)}
                    className={`px-12 py-6 font-display uppercase text-xl flex items-center gap-3 transition-colors ${profileTab === tab.id ? 'bg-black text-white' : 'bg-white hover:bg-brutal-yellow'}`}
                  >
                    <tab.icon size={24} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                  {profileTab === 'overview' && (
                    <>
                      <div className="brutal-card bg-white p-12 space-y-8">
                        <h3 className="text-4xl font-display uppercase">About Me</h3>
                        <p className="text-xl leading-relaxed">
                          {userProfile.aboutMe || "This explorer hasn't written a bio yet. They're too busy conquering quests!"}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                          <div className="space-y-4">
                            <h4 className="text-2xl font-display uppercase text-brutal-blue">Skills & Interests</h4>
                            <div className="flex flex-wrap gap-2">
                              {['Science', 'History', 'AI', 'Coding', 'Mathematics'].map(skill => (
                                <span key={skill} className="brutal-badge bg-brutal-green">{skill}</span>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-2xl font-display uppercase text-brutal-pink">Social Links</h4>
                            <div className="flex gap-4">
                              <button className="w-12 h-12 border-4 border-black flex items-center justify-center hover:bg-brutal-yellow transition-colors" aria-label="GitHub Profile"><Github size={24} /></button>
                              <button className="w-12 h-12 border-4 border-black flex items-center justify-center hover:bg-brutal-yellow transition-colors" aria-label="Twitter Profile"><Twitter size={24} /></button>
                              <button className="w-12 h-12 border-4 border-black flex items-center justify-center hover:bg-brutal-yellow transition-colors" aria-label="LinkedIn Profile"><Linkedin size={24} /></button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="brutal-card bg-brutal-blue text-white p-8 space-y-2">
                          <p className="text-sm font-bold uppercase opacity-70">Problems Solved</p>
                          <p className="text-5xl font-display">{userProfile.stats.problemsSolved || 0}</p>
                        </div>
                        <div className="brutal-card bg-brutal-green p-8 space-y-2">
                          <p className="text-sm font-bold uppercase opacity-70">Accuracy</p>
                          <p className="text-5xl font-display">{userProfile.stats.accuracy || 0}%</p>
                        </div>
                        <div className="brutal-card bg-brutal-pink text-white p-8 space-y-2">
                          <p className="text-sm font-bold uppercase opacity-70">Practice Score</p>
                          <p className="text-5xl font-display">{userProfile.stats.practiceScore || 0}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {profileTab === 'activity' && (
                    <div className="space-y-12">
                      <div className="brutal-card bg-white p-12 space-y-8">
                        <h3 className="text-4xl font-display uppercase">Activity Heatmap</h3>
                        <div className="p-6 bg-zinc-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                          <CalendarHeatmap
                            startDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
                            endDate={new Date()}
                            values={userProfile.activityLog || []}
                            classForValue={(value) => {
                              if (!value) return 'color-empty';
                              return `color-scale-${Math.min(value.count, 4)}`;
                            }}
                            tooltipDataAttrs={(value: any) => {
                              return {
                                'data-tooltip-id': 'activity-tooltip',
                                'data-tooltip-content': value.date ? `${value.date}: ${value.count} activities` : 'No activity',
                              };
                            }}
                          />
                          <Tooltip id="activity-tooltip" />
                        </div>
                        <div className="flex gap-4 text-xs font-bold uppercase opacity-50">
                          <span>Less</span>
                          <div className="flex gap-1">
                            <div className="w-4 h-4 bg-zinc-100 border border-black" />
                            <div className={`w-4 h-4 bg-brutal-green/20 border border-black`} />
                            <div className={`w-4 h-4 bg-brutal-green/40 border border-black`} />
                            <div className={`w-4 h-4 bg-brutal-green/70 border border-black`} />
                            <div className={`w-4 h-4 bg-brutal-green border border-black`} />
                          </div>
                          <span>More</span>
                        </div>
                      </div>

                      <div className="brutal-card bg-white p-12 space-y-8">
                        <h3 className="text-4xl font-display uppercase">Recent Quests</h3>
                        <div className="space-y-6">
                          {quizAttempts.length > 0 ? quizAttempts.map((attempt, i) => (
                            <div key={i} className="flex items-center justify-between p-6 border-4 border-black hover:bg-brutal-yellow transition-colors">
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-black text-white flex items-center justify-center">
                                  <Sparkles size={32} />
                                </div>
                                <div>
                                  <p className="font-display text-2xl uppercase">Quiz Attempt</p>
                                  <p className="font-mono text-sm opacity-70">{attempt.timestamp ? new Date(attempt.timestamp.seconds * 1000).toLocaleDateString() : 'Unknown date'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-display text-3xl text-brutal-green">+{attempt.score}</p>
                                <p className="font-bold uppercase text-xs">Points Gained</p>
                              </div>
                            </div>
                          )) : (
                            <p className="text-center py-12 font-bold uppercase opacity-50">No recent activity found.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {profileTab === 'badges' && (
                    <div className="brutal-card bg-white p-12 space-y-8">
                      <h3 className="text-4xl font-display uppercase">Unlocked Badges</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {badges.length > 0 ? badges.map((badge, i) => (
                          <div key={i} className="flex flex-col items-center gap-4 p-6 border-4 border-black bg-brutal-yellow/10 group hover:bg-brutal-yellow transition-all">
                            <div className="w-20 h-20 bg-white border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                              <Trophy size={40} className="text-brutal-orange" />
                            </div>
                            <p className="font-display text-center uppercase text-sm">{badge}</p>
                          </div>
                        )) : (
                          <p className="col-span-full text-center py-12 font-bold uppercase opacity-50">No badges unlocked yet. Start a quest!</p>
                        )}
                      </div>
                    </div>
                  )}

                  {profileTab === 'saved' && (
                    <div className="brutal-card bg-white p-12 space-y-8">
                      <h3 className="text-4xl font-display uppercase">Saved Content</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {savedContentList.length > 0 ? savedContentList.map((item, i) => (
                          <div key={i} className="flex flex-col gap-4 p-6 border-4 border-black bg-zinc-50 hover:bg-brutal-yellow transition-all group cursor-pointer" onClick={() => {
                            if (item.type === 'mindmap') {
                              setMindmap(item.data);
                              setState('mindmap');
                            } else if (item.type === 'flashcards') {
                              setFlashcards(item.data);
                              setState('flashcards');
                            } else if (item.type === 'summary') {
                              setSummary(item.data);
                              setState('summary');
                            }
                          }}>
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                                {item.type === 'mindmap' && <Network size={24} className="text-brutal-pink" />}
                                {item.type === 'flashcards' && <CreditCard size={24} className="text-brutal-yellow" />}
                                {item.type === 'summary' && <FileText size={24} className="text-brutal-blue" />}
                              </div>
                              <div>
                                <h4 className="font-display text-xl uppercase truncate max-w-[200px]">{item.title}</h4>
                                <p className="font-bold uppercase text-xs opacity-50">{item.type}</p>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-auto pt-4 border-t-4 border-black/10">
                              <button onClick={(e) => { e.stopPropagation(); downloadContent(item.type, item.title, item.data); }} className="p-2 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black rounded-full" data-tooltip-id="tt" data-tooltip-content="Download">
                                <Download size={20} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); if(item.id) deleteSavedContent(item.id); }} className="p-2 hover:bg-brutal-pink hover:text-white transition-colors border-2 border-transparent hover:border-black rounded-full" data-tooltip-id="tt" data-tooltip-content="Delete">
                                <X size={20} />
                              </button>
                            </div>
                          </div>
                        )) : (
                          <p className="col-span-full text-center py-12 font-bold uppercase opacity-50">No saved content yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-12">
                  <div className="brutal-card bg-white p-8 space-y-6">
                    <h3 className="text-2xl font-display uppercase">Statistics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b-2 border-black pb-2">
                        <span className="font-bold uppercase text-sm">Total Submissions</span>
                        <span className="font-display text-xl">{userProfile.stats.totalSubmissions || 0}</span>
                      </div>
                      <div className="flex justify-between items-center border-b-2 border-black pb-2">
                        <span className="font-bold uppercase text-sm">Correct</span>
                        <span className="font-display text-xl text-brutal-green">{userProfile.stats.correctSubmissions || 0}</span>
                      </div>
                      <div className="flex justify-between items-center border-b-2 border-black pb-2">
                        <span className="font-bold uppercase text-sm">Incorrect</span>
                        <span className="font-display text-xl text-brutal-orange">{userProfile.stats.incorrectSubmissions || 0}</span>
                      </div>
                      <div className="flex justify-between items-center border-b-2 border-black pb-2">
                        <span className="font-bold uppercase text-sm">Articles</span>
                        <span className="font-display text-xl">{userProfile.stats.articlesPublished || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="brutal-card bg-black text-white p-8 space-y-6">
                    <h3 className="text-2xl font-display uppercase text-brutal-yellow">Current Streak</h3>
                    <div className="flex items-center gap-6">
                      <Flame size={64} className="text-brutal-orange fill-brutal-orange" />
                      <div>
                        <p className="text-6xl font-display">{streak}</p>
                        <p className="text-sm font-bold uppercase text-brutal-yellow">Days in a row</p>
                      </div>
                    </div>
                    <p className="text-sm font-mono opacity-70">Personal best: {maxStreak} days</p>
                  </div>

                  <div className="brutal-card bg-white p-8 space-y-6">
                    <h3 className="text-2xl font-display uppercase">Institutional Rank</h3>
                    <div className="flex items-center gap-4">
                      <School size={32} className="text-brutal-blue" />
                      <div>
                        <p className="font-bold uppercase text-sm">IIT Madras</p>
                        <p className="font-display text-2xl">Rank #12</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setState('leaderboard')}
                      className="w-full brutal-btn bg-brutal-yellow py-2 text-sm"
                    >
                      View Leaderboard
                    </button>
                  </div>

                  <div className="brutal-card bg-brutal-pink text-white p-8 space-y-6">
                    <h3 className="text-2xl font-display uppercase">Top Explorers</h3>
                    <div className="space-y-4">
                      {leaderboard.map((player, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-black/20 border-4 border-white/10 hover:bg-black/40 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <span className="font-display text-xl w-6 text-white/50">#{player.rank}</span>
                            <div className={`w-10 h-10 ${player.color} border-2 border-black flex items-center justify-center text-black font-black text-sm`}>
                              {player.name[0]}
                            </div>
                            <div>
                              <span className="font-display text-sm uppercase block leading-none">{player.name}</span>
                              <span className="text-[8px] font-bold uppercase opacity-50 tracking-widest">Mastermind</span>
                            </div>
                          </div>
                          <span className="font-display text-lg text-brutal-yellow">{player.score.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setState('leaderboard')} className="w-full brutal-btn bg-white text-black py-3 uppercase font-display text-xl hover:bg-black hover:text-white transition-all">
                      View All
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16 py-12 max-w-4xl mx-auto text-center"
            >
              <div className="flex items-center justify-center gap-6">
                <h2 className="text-9xl font-display uppercase tracking-tighter">Our Mission</h2>
                <button 
                  onClick={() => speak("Our Mission. QuizQuest AI is dedicated to making learning accessible, engaging, and personalized for everyone. By combining advanced AI with gamification and accessibility features, we empower learners to master any subject at their own pace.")}
                  className="brutal-btn bg-brutal-yellow !p-4"
                  aria-label="Read mission aloud"
                >
                  <Volume2 size={32} />
                </button>
              </div>
              <div className="brutal-card bg-white p-12 space-y-8">
                <p className="text-3xl font-bold leading-tight">
                  QuizQuest AI is dedicated to making learning accessible, engaging, and personalized for everyone. 
                  By combining advanced AI with gamification and accessibility features, we empower learners to 
                  master any subject at their own pace.
                </p>
                <div className="pt-8 border-t-4 border-black flex justify-center gap-12">
                  <div>
                    <p className="text-6xl font-display">1M+</p>
                    <p className="font-bold uppercase opacity-60">Quizzes Taken</p>
                  </div>
                  <div>
                    <p className="text-6xl font-display">500K</p>
                    <p className="font-bold uppercase opacity-60">Active Questers</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Hero Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6 flex flex-col justify-center">
                  <div className="flex items-start gap-6">
                    <h1 className="text-9xl font-display uppercase tracking-tighter leading-[0.8] flex-1">
                      {t.heroTitle.split(' ').map((word, i) => (
                        <span key={i} className={i === 1 ? 'text-brand-primary' : ''}>{word} </span>
                      ))}
                    </h1>
                    <button 
                      onClick={() => speak(`${t.heroTitle}. ${t.heroSubtitle}`)}
                      className="brutal-btn bg-brutal-yellow !p-4 mt-2"
                      aria-label="Read introduction aloud"
                    >
                      <Volume2 size={32} />
                    </button>
                  </div>
                  <p className="text-3xl font-bold uppercase max-w-2xl leading-tight opacity-80">
                    {t.heroSubtitle}
                  </p>
                </div>

                <div className="brutal-card bg-brand-accent p-8 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-black/10 rotate-45 translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-black text-brand-accent flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]">
                        <Trophy size={40} />
                      </div>
                      <div>
                        <h3 className="text-4xl font-display uppercase leading-none mb-2">Daily Challenge</h3>
                        <p className="font-bold uppercase text-sm opacity-70">Master "Quantum Mechanics" today and earn 2x XP!</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setPrompt('Quantum Mechanics'); handleGenerate(); }}
                      className="brutal-btn bg-black text-white px-12 py-4 text-xl font-display uppercase hover:bg-white hover:text-black transition-all"
                    >
                      Start Challenge
                    </button>
                  </div>
                </div>
              </div>

              {/* Public Quizzes Section */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-6xl font-display uppercase tracking-tighter">Public Quests</h2>
                  <button className="font-display uppercase text-brand-primary hover:underline">View All</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {publicQuizzes.map((q, i) => (
                    <div 
                      key={q.id || i}
                      onClick={() => { setQuiz(q); setState('taking'); setCurrentQuestionIndex(0); }}
                      className="brutal-card p-8 space-y-4 hover:border-brand-primary transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-colors">
                          <BookOpen size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase opacity-40">{q.questions.length} Questions</span>
                      </div>
                      <h3 className="text-2xl font-display uppercase truncate">{q.title}</h3>
                      <p className="text-sm font-bold opacity-60 line-clamp-2">{q.description}</p>
                      <div className="pt-4 flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-200 rounded-full" />
                        <span className="text-[10px] font-black uppercase opacity-60">Created by Explorer</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Generator Section */}
              <div className="brutal-card bg-white p-10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-green/10 rotate-45 translate-x-16 -translate-y-16" />
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500">{t.concept}</label>
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Paste text or enter topic..."
                        className="brutal-input w-full h-32 resize-none text-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500">Number of Questions</label>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setNumQuestions(Math.max(1, numQuestions - 1))} 
                          className="brutal-btn p-3 bg-white"
                          aria-label="Decrease number of questions"
                        >
                          <Minus size={20} />
                        </button>
                        <span className="text-4xl font-display w-12 text-center">{numQuestions}</span>
                        <button 
                          onClick={() => setNumQuestions(numQuestions + 1)} 
                          className="brutal-btn p-3 bg-white"
                          aria-label="Increase number of questions"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button onClick={handleGenerate} className="brutal-btn bg-brutal-green py-6 text-2xl flex items-center justify-center gap-3 hover:bg-white">
                      <Zap size={28} /> {t.startQuest}
                    </button>
                    <button onClick={handleGenerateSummary} className="brutal-btn bg-brutal-blue text-white py-6 text-2xl flex items-center justify-center gap-3 hover:bg-white hover:text-black">
                      <FileText size={28} /> Summary
                    </button>
                    <button onClick={handleGenerateMindmap} className="brutal-btn bg-brutal-pink text-white py-6 text-2xl flex items-center justify-center gap-3 hover:bg-white hover:text-black">
                      <Network size={28} /> {t.generateMindmap}
                    </button>
                    <button onClick={handleGenerateFlashcards} className="brutal-btn bg-brutal-yellow py-6 text-2xl flex items-center justify-center gap-3 hover:bg-white">
                      <CreditCard size={28} /> Flashcards
                    </button>
                    <button onClick={handleVisualify} className="brutal-btn bg-brutal-orange text-white py-6 text-2xl flex items-center justify-center gap-3 hover:bg-white hover:text-black">
                      <Sparkles size={28} /> Visualify
                    </button>
                  </div>
                </div>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                {[
                  { label: 'AI Quiz', icon: Sparkles, color: 'bg-brutal-green', desc: 'Test your knowledge', state: 'idle' },
                  { label: 'Visualify', icon: ImageIcon, color: 'bg-brutal-orange', desc: 'Visual stories', state: 'visualify' },
                  { label: 'Mindmaps', icon: Network, color: 'bg-brutal-pink', desc: 'Visualize concepts', state: 'mindmap' },
                  { label: 'Flashcards', icon: CreditCard, color: 'bg-brutal-yellow', desc: 'Quick revision', state: 'flashcards' },
                  { label: 'Summaries', icon: FileText, color: 'bg-brutal-blue', desc: 'Concise notes', state: 'summary' },
                ].map((f, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      if (f.state === 'visualify' && !visualify) {
                        setState('visualify');
                      } else if (f.state) {
                        setState(f.state as any);
                      }
                    }}
                    className="brutal-card bg-white p-8 space-y-6 hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all cursor-pointer group"
                  >
                    <div className={`w-20 h-20 ${f.color} border-4 border-black flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-12 transition-transform`}>
                      <f.icon size={40} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-display uppercase leading-none mb-2">{f.label}</h3>
                      <p className="text-sm font-bold opacity-60 leading-tight">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {state === 'taking' && quiz && (
            <motion.div
              key="taking"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              {isStoryMode && quiz.narrative && (
                <div className="brutal-card bg-black text-white p-8 mb-8 transform -rotate-1">
                  <h3 className="text-3xl font-display mb-4 flex items-center gap-3">
                    <Sparkles className="text-brutal-yellow" />
                    The Adventure Begins...
                  </h3>
                  <p className="text-xl italic font-serif opacity-90 leading-relaxed">
                    "{quiz.narrative}"
                  </p>
                </div>
              )}

              {/* Game Stats Bar */}
              <div className="grid grid-cols-2 gap-6">
                <div className={`brutal-card bg-brutal-blue text-black p-4 flex items-center justify-between transition-all`}>
                  <div className="flex items-center gap-3">
                    <Trophy size={24} />
                    <span className="font-display text-xl uppercase">Score</span>
                  </div>
                  <span className="font-display text-3xl">{score}</span>
                </div>
                <div className={`brutal-card bg-brutal-pink text-white p-4 flex items-center justify-between transition-all`}>
                  <div className="flex items-center gap-3">
                    <Flame size={24} className={streak > 0 ? 'animate-bounce text-brutal-yellow' : ''} />
                    <span className="font-display text-xl uppercase">Streak</span>
                  </div>
                  <span className="font-display text-3xl">{streak}</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-end justify-between border-b-8 border-black pb-8 gap-6">
                <div className="space-y-4">
                  <div className="brutal-badge bg-brutal-green text-black text-xl">QUEST ACTIVE</div>
                  <h2 className="text-6xl font-display leading-none">{quiz.title}</h2>
                </div>
                <div className="text-right space-y-4 w-full md:w-auto">
                  <span className="font-display text-4xl text-brutal-blue block">
                    {currentQuestionIndex + 1} / {quiz.questions.length}
                  </span>
                  <div className="w-full md:w-64 h-8 border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <motion.div 
                      className="h-full bg-brutal-green border-r-4 border-black"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className={`brutal-card p-12 space-y-12 relative overflow-hidden min-h-[600px] flex flex-col justify-center transition-colors duration-300 ${
                showFeedback === 'correct' ? 'bg-brutal-green' : 
                showFeedback === 'incorrect' ? 'bg-brutal-orange' : 
                theme === 'dark' ? 'bg-zinc-900 text-white border-white' : 'bg-white'
              }`}>
                {/* Question Timer Circular */}
                <div className="absolute top-6 right-6">
                  <CircularTimer 
                    current={timeLeft} 
                    total={quiz.questions[currentQuestionIndex].timeLimit || 20} 
                  />
                </div>

                <AnimatePresence mode="wait">
                  {isListeningForAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="absolute top-6 left-6 z-30 flex items-center gap-3 bg-brutal-pink text-white px-6 py-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        <MessageCircle size={24} />
                      </motion.div>
                      <span className="font-display text-xl uppercase tracking-wider">Listening for answer...</span>
                    </motion.div>
                  )}

                  {showFeedback ? (
                    <motion.div
                      key="feedback"
                      initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 1.5, opacity: 0, rotate: 10 }}
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white"
                    >
                      {showFeedback === 'correct' ? (
                        <>
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                          >
                            <CheckCircle2 size={160} className="text-white mb-6" />
                          </motion.div>
                          <h2 className="text-9xl font-display uppercase italic">AWESOME!</h2>
                          <p className="text-5xl font-display mt-6">+{lastPoints} PTS</p>
                          {streak > 1 && (
                            <motion.div 
                              initial={{ y: 50, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              className="mt-10 flex items-center gap-4 bg-black text-white px-12 py-4 border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]"
                            >
                              <Flame size={48} className="text-brutal-yellow animate-bounce" />
                              <span className="text-4xl font-display">{streak} ANSWER STREAK!</span>
                            </motion.div>
                          )}
                        </>
                      ) : showFeedback === 'timeout' ? (
                        <>
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 10, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                          >
                            <Timer size={160} className="text-white mb-6" />
                          </motion.div>
                          <h2 className="text-9xl font-display uppercase italic">TIME'S UP!</h2>
                          <p className="text-4xl font-display mt-6 uppercase">You were too slow!</p>
                          <div className="mt-10 bg-black text-white px-8 py-3 border-4 border-white">
                            <span className="text-2xl font-mono font-bold uppercase">The correct answer was: {quiz.questions[currentQuestionIndex].correctAnswer}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <motion.div
                            animate={{ x: [-10, 10, -10, 10, 0] }}
                            transition={{ duration: 0.3 }}
                          >
                            <XCircle size={160} className="text-white mb-6" />
                          </motion.div>
                          <h2 className="text-9xl font-display uppercase italic">OOF!</h2>
                          <p className="text-4xl font-display mt-6 uppercase">The streak has ended</p>
                          <div className="mt-10 bg-black text-white px-8 py-3 border-4 border-white">
                            <span className="text-2xl font-mono font-bold uppercase">The correct answer was: {quiz.questions[currentQuestionIndex].correctAnswer}</span>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="question"
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -100, opacity: 0 }}
                      className="space-y-16"
                    >
                      <div className="space-y-4 text-center">
                        <span className="font-mono font-bold text-gray-400 uppercase tracking-[0.3em]">Question {currentQuestionIndex + 1}</span>
                        <h3 className="text-3xl md:text-4xl font-display leading-tight">
                          {quiz.questions[currentQuestionIndex].question}
                        </h3>
                        <div className="flex justify-center gap-4">
                          <button 
                            onClick={handleListenToQuestion}
                            className="brutal-btn bg-brutal-pink text-white !p-4 flex items-center gap-3 hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            aria-label="Listen and speak answer"
                          >
                            <Volume2 size={24} />
                            <span className="text-lg font-bold uppercase">Listen & Answer</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {quiz.questions[currentQuestionIndex].options.map((option, i) => {
                          const isAnswered = userAnswers[quiz.questions[currentQuestionIndex].id];
                          const isSelected = isAnswered === option;
                          const isCorrect = quiz.questions[currentQuestionIndex].correctAnswer === option;

                          const colors = ['bg-brand-primary', 'bg-brand-secondary', 'bg-brand-accent', 'bg-brand-muted'];
                          const hoverColors = ['hover:bg-brand-primary/80', 'hover:bg-brand-secondary/80', 'hover:bg-brand-accent/80', 'hover:bg-brand-muted/80'];
                          const textColors = ['text-white', 'text-white', 'text-white', 'text-white'];
                          
                          let btnClass = `${colors[i]} ${textColors[i]} ${hoverColors[i]}`;
                          if (isAnswered) {
                            if (isCorrect) {
                              btnClass = 'bg-brutal-green text-black';
                            } else if (isSelected) {
                              btnClass = 'bg-brutal-pink text-white';
                            } else {
                              btnClass = 'bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-gray-600 opacity-50';
                            }
                          }

                          const shapes = [
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-sm flex items-center justify-center text-2xl md:text-4xl transform rotate-45">▲</div>,
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-sm flex items-center justify-center text-2xl md:text-4xl transform rotate-45">◆</div>,
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-black/10 rounded-full flex items-center justify-center text-2xl md:text-4xl">●</div>,
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-black/10 rounded-sm flex items-center justify-center text-2xl md:text-4xl">■</div>
                          ];
                          
                          return (
                            <motion.button
                              key={i}
                              whileHover={isAnswered ? {} : { scale: 1.02, x: 4, y: -4 }}
                              whileTap={isAnswered ? {} : { scale: 0.98 }}
                              onClick={() => handleAnswer(option)}
                              disabled={!!isAnswered}
                              className={`brutal-btn !text-left !px-6 !py-6 md:!px-10 md:!py-10 flex items-center gap-6 md:gap-8 transition-all group ${btnClass} relative overflow-hidden ${isAnswered ? 'cursor-default' : ''}`}
                            >
                              <div className="absolute top-0 left-0 w-2 h-full bg-black/10" />
                              <div className="font-display shrink-0">{shapes[i]}</div>
                              <span className="text-2xl md:text-3xl font-display flex-1 leading-tight">{option}</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex justify-between items-center pt-8 border-t-2 border-slate-100">
                        <button
                          disabled={currentQuestionIndex === 0}
                          onClick={() => {
                            setCurrentQuestionIndex(prev => prev - 1);
                            setTimeLeft(quiz.questions[currentQuestionIndex - 1].timeLimit || 20);
                          }}
                          className={`brutal-btn !py-3 !px-8 flex items-center gap-2 ${currentQuestionIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'bg-white hover:bg-slate-50'}`}
                        >
                          <ChevronRight size={24} className="rotate-180" />
                          Previous
                        </button>
                        <div className="flex gap-2">
                          {quiz.questions.map((_, i) => (
                            <div 
                              key={i}
                              className={`w-3 h-3 rounded-full border-2 border-black ${i === currentQuestionIndex ? 'bg-brand-primary' : 'bg-slate-200'}`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            if (currentQuestionIndex === quiz.questions.length - 1) {
                              finishQuiz();
                            } else {
                              setCurrentQuestionIndex(prev => prev + 1);
                              setTimeLeft(quiz.questions[currentQuestionIndex + 1].timeLimit || 20);
                            }
                          }}
                          className={`brutal-btn !py-3 !px-8 flex items-center gap-2 bg-brand-primary text-white hover:bg-brand-primary/90`}
                        >
                          {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next'}
                          <ChevronRight size={24} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {state === 'visualify' && (
            <motion.div
              key="visualify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-12 pb-20"
            >
              {/* Visualify Topic Bar */}
              <div className="brutal-card bg-white dark:bg-zinc-900 p-6 border-b-8 border-black dark:border-white flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                  <input 
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVisualify()}
                    placeholder="Enter a concept to Visualify (e.g. Photosynthesis, Gravity)..."
                    className="brutal-input w-full text-2xl"
                  />
                </div>
                <button 
                  onClick={handleVisualify}
                  disabled={isGeneratingVisualify}
                  className="brutal-btn bg-brutal-orange text-white flex items-center gap-3 w-full md:w-auto justify-center disabled:opacity-50"
                >
                  {isGeneratingVisualify ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  Visualify
                </button>
                {visualify && (
                  <button onClick={reset} className="brutal-btn bg-brutal-yellow">
                    <RotateCcw />
                  </button>
                )}
              </div>

              {visualify ? (
                <>
                  <div className="flex items-center justify-between border-b-8 border-black dark:border-white pb-8">
                    <div className="flex items-center gap-6">
                      <h2 className="text-8xl font-display uppercase tracking-tighter">{visualify.title}</h2>
                      <button 
                        onClick={() => speak(`${visualify.title}. ${visualify.metaphor}. ${visualify.explanation}`)}
                        className="brutal-btn bg-brutal-yellow !p-4 flex items-center gap-3 hover:bg-white"
                      >
                        <MessageSquare size={32} />
                      </button>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => saveContent('visualify', visualify.title, visualify)} className="brutal-btn bg-brutal-green !p-4">
                        <Save size={32} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Story & Scene */}
                    <div className="lg:col-span-2 space-y-8">
                      <div className="brutal-card bg-brutal-blue text-white p-10 transform -rotate-1 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="text-4xl font-display mb-6 flex items-center gap-4">
                          <BookOpen size={40} /> The Metaphor
                        </h3>
                        <p className="text-2xl font-serif italic leading-relaxed opacity-90">
                          "{visualify.metaphor}"
                        </p>
                      </div>

                      <div className="brutal-card bg-white dark:bg-zinc-900 p-10 border-4 border-black dark:border-white">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                          <h3 className="text-4xl font-display flex items-center gap-4">
                            <ImageIcon size={40} /> Visual Scene Design
                          </h3>
                          {!visualify.videoUrl && (
                            <button 
                              onClick={handleGenerateVideo}
                              disabled={isGeneratingVideo}
                              className="brutal-btn bg-brutal-orange text-white flex items-center gap-2 disabled:opacity-50"
                            >
                              {isGeneratingVideo ? <Loader2 className="animate-spin" /> : <Video />}
                              {isGeneratingVideo ? 'Generating...' : 'Generate AI Animation'}
                            </button>
                          )}
                        </div>
                        
                        {isGeneratingVideo && (
                          <div className="mb-8 p-8 bg-zinc-100 dark:bg-zinc-800 border-4 border-dashed border-black dark:border-white flex flex-col items-center gap-4 text-center">
                            <Loader2 className="animate-spin text-brutal-orange" size={48} />
                            <div className="space-y-2">
                              <p className="text-2xl font-display uppercase">Creating your animation...</p>
                              <p className="font-mono text-sm opacity-60">This usually takes about 30-60 seconds. Please stay on this page.</p>
                            </div>
                          </div>
                        )}

                        {videoError && (
                          <div className="mb-8 p-6 bg-brutal-pink text-white border-4 border-black flex items-center gap-4">
                            <XCircle size={32} />
                            <p className="font-bold">{videoError}</p>
                          </div>
                        )}

                        {visualify.videoUrl && (
                          <div className="mb-8 brutal-card overflow-hidden border-4 border-black bg-black">
                            <video 
                              src={visualify.videoUrl} 
                              controls 
                              autoPlay 
                              loop 
                              className="w-full aspect-video"
                            />
                            <div className="p-4 bg-white dark:bg-zinc-900 border-t-4 border-black flex justify-between items-center">
                              <p className="font-display uppercase text-sm">AI Generated Animation</p>
                              <a 
                                href={visualify.videoUrl} 
                                download={`${visualify.title}_animation.mp4`}
                                className="text-brutal-blue hover:underline font-bold flex items-center gap-1"
                              >
                                <Download size={16} /> Download
                              </a>
                            </div>
                          </div>
                        )}

                        <div className="prose prose-xl dark:prose-invert max-w-none font-mono">
                          <ReactMarkdown>{visualify.sceneDesign}</ReactMarkdown>
                        </div>
                      </div>

                      <div className="brutal-card bg-brutal-yellow p-10 border-4 border-black">
                        <h3 className="text-4xl font-display mb-8 flex items-center gap-4">
                          <Zap size={40} /> Animation Flow
                        </h3>
                        <div className="space-y-8">
                          {visualify.animationFlow.map((step, i) => (
                            <motion.div 
                              key={i}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex gap-6 items-start group"
                            >
                              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-3xl font-display shrink-0 group-hover:rotate-12 transition-transform">
                                {step.step}
                              </div>
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-2xl font-display uppercase text-black">{step.action}</h4>
                                  <button 
                                    onClick={() => speak(`${step.action}. ${step.description}`)}
                                    className="p-2 hover:text-white transition-colors"
                                    aria-label="Read step aloud"
                                  >
                                    <Volume2 size={20} />
                                  </button>
                                </div>
                                <p className="text-lg font-bold opacity-70">{step.description}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Theory & Facts */}
                    <div className="space-y-8">
                      <div className="brutal-card bg-brutal-green p-8 border-4 border-black">
                        <h3 className="text-3xl font-display mb-6 flex items-center gap-3">
                          <Brain size={32} /> The Theory
                        </h3>
                        <p className="text-xl font-bold leading-snug">
                          {visualify.explanation}
                        </p>
                      </div>

                      <div className="brutal-card bg-white dark:bg-zinc-900 p-8 border-4 border-black dark:border-white">
                        <h3 className="text-3xl font-display mb-6 flex items-center gap-3">
                          <CheckCircle2 size={32} /> Key Facts
                        </h3>
                        <ul className="space-y-4">
                          {visualify.keyFacts.map((fact, i) => (
                            <li key={i} className="flex gap-3 items-start font-mono font-bold">
                              <Star className="shrink-0 text-brutal-orange" size={20} />
                              <span>{fact}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="brutal-card bg-brutal-pink text-white p-8 border-4 border-black">
                        <h3 className="text-3xl font-display mb-6 flex items-center gap-3">
                          <Globe size={32} /> Real-Life
                        </h3>
                        <p className="text-xl font-bold italic">
                          {visualify.realLifeApplication}
                        </p>
                      </div>

                      <div className="brutal-card bg-black text-white p-8 border-4 border-white transform rotate-1">
                        <h3 className="text-2xl font-display mb-4 flex items-center gap-3">
                          <Sparkles className="text-brutal-yellow" /> Style Guide
                        </h3>
                        <p className="text-sm font-mono opacity-80">
                          {visualify.styleSuggestions}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-32 h-32 bg-brutal-orange text-white rounded-3xl flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-float-brutal">
                    <Sparkles size={64} />
                  </div>
                  <h2 className="text-6xl font-display uppercase">Ready to Visualify?</h2>
                  <p className="text-xl font-bold opacity-60 max-w-md">
                    Enter any complex topic above and we'll turn it into a visual learning adventure.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {state === 'mindmap' && mindmap && (
            <motion.div
              key="mindmap"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between border-b-8 border-black dark:border-white pb-8">
                <div className="flex items-center gap-6">
                  <h2 className="text-8xl font-display uppercase tracking-tighter">{mindmap.title}</h2>
                  <button 
                    onClick={() => {
                      const traverse = (node: any): string => {
                        let text = `${node.label}. ${node.description || ''}. `;
                        if (node.children) {
                          text += node.children.map((c: any) => traverse(c)).join(' ');
                        }
                        return text;
                      };
                      const text = `${mindmap.title}. ${traverse(mindmap.root)}`;
                      speak(text);
                    }}
                    className="brutal-btn bg-brutal-yellow !p-4 flex items-center gap-3 hover:bg-white transition-colors"
                    aria-label="Listen to mindmap"
                  >
                    <MessageSquare size={32} />
                  </button>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border-4 border-black dark:border-white px-4 rounded-xl">
                    <button 
                      onClick={() => setMindmapScale(prev => Math.max(0.5, prev - 0.1))} 
                      className="p-2 hover:text-brutal-pink transition-colors"
                      aria-label="Zoom out"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="font-mono font-bold w-12 text-center">{Math.round(mindmapScale * 100)}%</span>
                    <button 
                      onClick={() => setMindmapScale(prev => Math.min(3, prev + 0.1))} 
                      className="p-2 hover:text-brutal-green transition-colors"
                      aria-label="Zoom in"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <button onClick={() => { setMindmapScale(1); setMindmapPos({ x: 0, y: 0 }); }} className="brutal-btn bg-white !p-4" data-tooltip-id="tt" data-tooltip-content="Reset View">
                    <Maximize size={32} />
                  </button>
                  <button onClick={() => downloadContent('mindmap', mindmap.title || 'Mindmap', mindmap)} className="brutal-btn bg-brutal-blue !p-4 text-white" data-tooltip-id="tt" data-tooltip-content="Download Mindmap">
                    <Download size={32} />
                  </button>
                  <button onClick={() => saveContent('mindmap', mindmap.title || 'Mindmap', mindmap)} className="brutal-btn bg-brutal-green !p-4 text-black" data-tooltip-id="tt" data-tooltip-content="Save to Profile">
                    <Save size={32} />
                  </button>
                  <button onClick={reset} className="brutal-btn bg-brutal-yellow !p-4 text-black" data-tooltip-id="tt" data-tooltip-content="Reset">
                    <RotateCcw size={32} />
                  </button>
                </div>
              </div>

              <div 
                className="brutal-card p-12 min-h-[600px] relative overflow-hidden bg-white dark:bg-zinc-900 dark:border-white mindmap-container"
                onMouseDown={handleMindmapMouseDown}
                onMouseMove={handleMindmapMouseMove}
                onMouseUp={handleMindmapMouseUp}
                onMouseLeave={handleMindmapMouseUp}
                onWheel={handleMindmapWheel}
              >
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <div className="w-full h-full brutal-grid dark:opacity-20" />
                </div>
                
                <motion.div 
                  className="flex flex-col items-center gap-16 relative z-10 origin-center"
                  style={{ 
                    transform: `translate(${mindmapPos.x}px, ${mindmapPos.y}px) scale(${mindmapScale})`,
                    cursor: isDraggingMindmap ? 'grabbing' : 'grab'
                  }}
                >
                  {/* Root Node */}
                  <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="brutal-card bg-brand-primary text-white p-8 max-w-md text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] border-black dark:border-white"
                  >
                    <h3 className="text-4xl font-display uppercase mb-2">{mindmap.root.label}</h3>
                    <p className="font-bold opacity-90">{mindmap.root.description}</p>
                  </motion.div>

                  <div className="w-2 h-16 bg-black dark:bg-white" />

                  {/* Child Nodes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    {mindmap.root.children.map((child, i) => (
                      <motion.div
                        key={child.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="brutal-card p-6 border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all bg-white dark:bg-zinc-800"
                        style={{ borderTopColor: child.color || 'black', borderTopWidth: child.color ? '12px' : '4px' }}
                      >
                        <div className="w-12 h-12 bg-brand-secondary text-white border-2 border-black dark:border-white flex items-center justify-center mb-4 font-display text-2xl">
                          {i + 1}
                        </div>
                        <h4 className="text-2xl font-display uppercase mb-2">{child.label}</h4>
                        <p className="text-sm font-bold opacity-70 mb-4">{child.description}</p>
                        {child.children && child.children.length > 0 && (
                          <div className="mt-4 pt-4 border-t-2 border-black/10 dark:border-white/10 space-y-2">
                            {child.children.map((sub) => (
                              <div key={sub.id} className="flex gap-2 text-xs font-bold">
                                <span className="text-brand-secondary">▸</span>
                                <div>
                                  <span className="uppercase">{sub.label}:</span> {sub.description}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {state === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <h2 className="text-8xl font-display uppercase tracking-tighter text-center">Global Rankings</h2>
              <div className="brutal-card bg-white dark:bg-zinc-900 dark:border-white p-8 max-w-4xl mx-auto">
                <div className="space-y-4">
                  {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                    <div key={i} className={`flex items-center gap-6 p-6 border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] ${entry.name === user.displayName ? 'bg-brutal-yellow text-black' : 'bg-white dark:bg-zinc-800'}`}>
                      <span className="font-display text-4xl w-12">{entry.rank}</span>
                      <div className={`w-16 h-16 ${entry.color} text-black border-2 border-black flex items-center justify-center font-display text-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
                        {entry.name[0]}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-3xl font-display uppercase">{entry.name}</h4>
                        <p className="font-bold text-gray-500 dark:text-gray-400 uppercase">Mastermind</p>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-display text-brutal-blue">{entry.score}</p>
                        <p className="font-bold text-xs uppercase opacity-60">Total Points</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center py-12 font-bold uppercase opacity-50">No rankings available yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {state === 'contests' && (
            <motion.div
              key="contests"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b-8 border-black dark:border-white pb-8">
                <h2 className="text-8xl font-display uppercase tracking-tighter">Competitive Arena</h2>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsCreateContestOpen(true)}
                    className="brutal-btn bg-brutal-yellow py-3 px-8 font-display text-xl uppercase flex items-center gap-2 text-black"
                  >
                    <Plus size={24} />
                    Create Contest
                  </button>
                  <button className="brutal-btn bg-brutal-green py-3 px-8 font-display text-xl uppercase text-black">Active</button>
                  <button className="brutal-btn bg-white dark:bg-zinc-800 py-3 px-8 font-display text-xl uppercase">Upcoming</button>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-12">
                <div className="col-span-12 lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 gap-8">
                    {contests.length > 0 ? contests.map((c, i) => (
                      <div key={i} className="brutal-card bg-white dark:bg-zinc-900 dark:border-white p-8 flex flex-col md:flex-row items-center gap-8 group">
                        <div className={`w-32 h-32 ${['bg-brutal-pink', 'bg-brutal-blue', 'bg-brutal-yellow'][i % 3]} border-4 border-black flex items-center justify-center shrink-0 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-6 transition-transform`}>
                          <Trophy size={48} className="text-black" />
                        </div>
                        <div className="flex-1 space-y-2 text-center md:text-left">
                          <h3 className="text-4xl font-display uppercase leading-tight">{c.title}</h3>
                          <p className="font-bold text-gray-500 dark:text-gray-400 uppercase">Organized by {c.org}</p>
                          <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                            <span className="bg-black text-white px-3 py-1 text-xs font-bold uppercase">{c.participants} Joined</span>
                            <span className="bg-brutal-green text-black px-3 py-1 text-xs font-bold uppercase">Prize: {c.prize}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setPrompt(c.title);
                            handleGenerate();
                          }}
                          className="brutal-btn bg-black text-white py-4 px-10 text-xl font-display uppercase hover:bg-brutal-green hover:text-black"
                        >
                          Join Contest
                        </button>
                      </div>
                    )) : (
                      <div className="brutal-card bg-white dark:bg-zinc-900 dark:border-white p-12 text-center space-y-4">
                        <Trophy size={64} className="mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="text-2xl font-display uppercase opacity-50">No active contests found.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-8">
                  <div className="brutal-card bg-brutal-yellow text-black p-8 space-y-6">
                    <h3 className="text-3xl font-display uppercase border-b-4 border-black pb-2">Institution Rankings</h3>
                    <div className="space-y-4">
                      {institutions.length > 0 ? institutions.map((inst, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white border-2 border-black">
                          <div className="flex items-center gap-3">
                            <span className="font-display text-xl">#{inst.rank}</span>
                            <span className="font-bold uppercase text-sm truncate max-w-[150px]">{inst.name}</span>
                          </div>
                          <span className="font-display text-brutal-blue">{inst.points}</span>
                        </div>
                      )) : (
                        <p className="text-center py-4 font-bold uppercase opacity-30">No data available.</p>
                      )}
                    </div>
                    <button className="w-full brutal-btn bg-black text-white py-3 uppercase font-bold">Register Institution</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'flashcards' && flashcards && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-12 max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between border-b-8 border-black dark:border-white pb-8">
                <div>
                  <h2 className="text-8xl font-display uppercase tracking-tighter">{flashcards.title}</h2>
                  <p className="font-bold uppercase text-gray-500 dark:text-gray-400">{flashcards.cards.length} Cards in set</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => downloadContent('flashcards', flashcards.title || 'Flashcards', flashcards)} className="brutal-btn bg-brutal-blue !p-4 text-white" data-tooltip-id="tt" data-tooltip-content="Download Flashcards">
                    <Download size={32} />
                  </button>
                  <button onClick={() => saveContent('flashcards', flashcards.title || 'Flashcards', flashcards)} className="brutal-btn bg-brutal-green !p-4 text-black" data-tooltip-id="tt" data-tooltip-content="Save to Profile">
                    <Save size={32} />
                  </button>
                  <button onClick={reset} className="brutal-btn bg-brutal-yellow !p-4 text-black" data-tooltip-id="tt" data-tooltip-content="Reset">
                    <RotateCcw size={32} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-12">
                {flashcards.cards.map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group perspective-1000 h-80"
                  >
                    <div className="relative w-full h-full transition-transform duration-500 transform-style-3d group-hover:rotate-y-180">
                      {/* Front */}
                      <div className="absolute inset-0 backface-hidden brutal-card bg-white dark:bg-zinc-900 dark:border-white p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto">
                        <span className="absolute top-4 left-4 font-display text-2xl text-gray-300 dark:text-gray-600">#{i + 1}</span>
                        <h3 className="text-2xl md:text-3xl font-semibold leading-relaxed text-gray-900 dark:text-gray-100">{card.front}</h3>
                        <button 
                          onClick={(e) => { e.stopPropagation(); speak(card.front); }}
                          className="brutal-btn bg-white !p-2 flex items-center gap-2 hover:bg-brutal-yellow transition-colors"
                          aria-label="Listen to card front"
                        >
                          <MessageSquare size={16} className="text-black" />
                        </button>
                        <p className="text-xs font-black uppercase text-brutal-pink animate-pulse mt-auto">Hover to reveal</p>
                      </div>
                      {/* Back */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 brutal-card bg-brutal-blue text-white p-8 md:p-12 flex flex-col items-center justify-center text-center border-black dark:border-white overflow-y-auto">
                        <p className="text-xl md:text-2xl font-medium leading-relaxed">{card.back}</p>
                        {card.mnemonic && (
                          <div className="mt-6 p-4 bg-white/20 border-2 border-white/30 rounded-xl">
                            <p className="text-sm font-black uppercase mb-1 opacity-70">Mnemonic</p>
                            <p className="text-lg italic font-serif">{card.mnemonic}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {state === 'summary' && summary && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-12 max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between border-b-8 border-black dark:border-white pb-8">
                <div>
                  <h2 className="text-8xl font-display uppercase tracking-tighter">{summary.title || 'Summary'}</h2>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => downloadContent('summary', summary.title || 'Summary', summary)} className="brutal-btn bg-brutal-blue !p-4 text-white" data-tooltip-id="tt" data-tooltip-content="Download Summary">
                    <Download size={32} />
                  </button>
                  <button onClick={() => saveContent('summary', summary.title || 'Summary', summary)} className="brutal-btn bg-brutal-green !p-4 text-black" data-tooltip-id="tt" data-tooltip-content="Save to Profile">
                    <Save size={32} />
                  </button>
                  <button onClick={reset} className="brutal-btn bg-brutal-yellow !p-4 text-black" data-tooltip-id="tt" data-tooltip-content="Reset">
                    <RotateCcw size={32} />
                  </button>
                </div>
              </div>

              <div className="brutal-card bg-white dark:bg-zinc-900 dark:border-white p-12 space-y-8">
                <div className="flex justify-end">
                  <button 
                    onClick={() => speak(summary.content)}
                    className="brutal-btn bg-brutal-yellow !p-4 flex items-center gap-3 hover:bg-white transition-colors"
                    aria-label="Listen to summary"
                  >
                    <MessageSquare size={24} />
                    <span className="text-xl font-bold">Listen to Summary</span>
                  </button>
                </div>
                <div className="prose prose-lg dark:prose-invert max-w-none markdown-body">
                  <ReactMarkdown>{summary.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'teacher-dashboard' && (
            <motion.div
              key="teacher-dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12 py-12"
            >
              <div className="flex items-center justify-between border-b-8 border-black dark:border-white pb-8">
                <h2 className="text-8xl font-display uppercase tracking-tighter">Teacher Dashboard</h2>
                <button onClick={reset} className="brutal-btn bg-brutal-yellow !p-4 text-black">
                  <RotateCcw size={32} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="brutal-card bg-brutal-blue text-white p-8 space-y-2">
                  <p className="text-sm font-bold uppercase opacity-70">Total Students</p>
                  <p className="text-5xl font-display">124</p>
                </div>
                <div className="brutal-card bg-brutal-green text-black p-8 space-y-2">
                  <p className="text-sm font-bold uppercase opacity-70">Avg. Accuracy</p>
                  <p className="text-5xl font-display">78%</p>
                </div>
                <div className="brutal-card bg-brutal-pink text-white p-8 space-y-2">
                  <p className="text-sm font-bold uppercase opacity-70">Active Quests</p>
                  <p className="text-5xl font-display">12</p>
                </div>
              </div>

              <div className="brutal-card bg-white dark:bg-zinc-900 dark:border-white p-12 space-y-8">
                <h3 className="text-4xl font-display uppercase">Student Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800 border-4 border-black dark:border-white font-display uppercase text-sm">
                        <th className="p-4 text-left border-r-4 border-black dark:border-white">Student</th>
                        <th className="p-4 text-left border-r-4 border-black dark:border-white">Level</th>
                        <th className="p-4 text-left border-r-4 border-black dark:border-white">XP</th>
                        <th className="p-4 text-left border-r-4 border-black dark:border-white">Accuracy</th>
                        <th className="p-4 text-left">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Alex Johnson', level: 12, xp: 12400, accuracy: '85%', last: '2h ago' },
                        { name: 'Sarah Miller', level: 10, xp: 9800, accuracy: '92%', last: '1d ago' },
                        { name: 'Mike Ross', level: 8, xp: 7500, accuracy: '64%', last: '5m ago' },
                      ].map((s, i) => (
                        <tr key={i} className="border-4 border-black dark:border-white hover:bg-brutal-yellow/10 transition-colors">
                          <td className="p-4 border-r-4 border-black dark:border-white font-bold uppercase">{s.name}</td>
                          <td className="p-4 border-r-4 border-black dark:border-white font-mono">{s.level}</td>
                          <td className="p-4 border-r-4 border-black dark:border-white font-mono">{s.xp}</td>
                          <td className="p-4 border-r-4 border-black dark:border-white font-mono">{s.accuracy}</td>
                          <td className="p-4 font-mono text-xs opacity-60">{s.last}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12 py-12"
            >
              <div className="flex items-center justify-between border-b-8 border-black dark:border-white pb-8">
                <h2 className="text-8xl font-display uppercase tracking-tighter">Learning Analytics</h2>
                <button onClick={reset} className="brutal-btn bg-brutal-yellow !p-4 text-black">
                  <RotateCcw size={32} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="brutal-card bg-white dark:bg-zinc-900 dark:border-white p-12 space-y-8">
                  <h3 className="text-4xl font-display uppercase">Subject Mastery</h3>
                  <div className="space-y-6">
                    {[
                      { subject: 'Mathematics', mastery: 85, color: 'bg-brutal-blue' },
                      { subject: 'Science', mastery: 62, color: 'bg-brutal-green' },
                      { subject: 'History', mastery: 94, color: 'bg-brutal-pink' },
                      { subject: 'Language', mastery: 78, color: 'bg-brutal-yellow' },
                    ].map((s, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between font-display uppercase text-sm">
                          <span>{s.subject}</span>
                          <span>{s.mastery}%</span>
                        </div>
                        <div className="h-6 border-4 border-black dark:border-white bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${s.mastery}%` }}
                            className={`h-full ${s.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="brutal-card bg-black dark:bg-zinc-950 text-white p-12 space-y-8 border-black dark:border-white">
                  <h3 className="text-4xl font-display uppercase text-brutal-yellow">Learning Streak</h3>
                  <div className="flex items-center gap-8">
                    <div className="w-32 h-32 bg-white dark:bg-zinc-900 border-4 border-black dark:border-white flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
                      <Flame size={64} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-7xl font-display">{streak}</p>
                      <p className="text-xl font-bold uppercase opacity-70">Current Day Streak</p>
                    </div>
                  </div>
                  <div className="pt-8 border-t border-white/20">
                    <p className="font-bold uppercase mb-4">Consistency is key to mastery!</p>
                    <div className="flex gap-2">
                      {[1, 1, 1, 0, 1, 1, 1].map((active, i) => (
                        <div key={i} className={`flex-1 h-4 border-2 border-white ${active ? 'bg-brutal-green' : 'bg-white/10'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="brutal-card bg-white dark:bg-zinc-900 dark:border-white p-12 space-y-8">
                  <h3 className="text-4xl font-display uppercase">Revisit Error Notes</h3>
                  <div className="space-y-4">
                    {errorNotes.length > 0 ? errorNotes.map((note, i) => (
                      <div key={i} className="p-6 border-4 border-black dark:border-white bg-brutal-pink/5 hover:bg-brutal-pink/10 transition-colors space-y-3">
                        <div className="flex justify-between items-start">
                          <p className="font-display text-lg uppercase leading-tight">{note.question}</p>
                          <span className="text-[10px] font-mono opacity-50">{new Date(note.timestamp?.seconds * 1000).toLocaleDateString()}</span>
                        </div>
                        <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-black dark:border-white font-mono text-sm italic">
                          "{note.note}"
                        </div>
                        <div className="flex gap-4 text-[10px] font-black uppercase">
                          <span className="text-brutal-orange">Correct: {note.correctAnswer}</span>
                          <span className="text-gray-400 dark:text-gray-500">Your: {note.userAnswer}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-12 border-4 border-black dark:border-white border-dashed opacity-30">
                        <p className="font-display uppercase">No error notes yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-16"
            >
              <div className="brutal-card bg-brutal-yellow p-16 text-center space-y-10 relative overflow-hidden text-black">
                <div className="absolute top-0 left-0 w-full h-4 bg-black" />
                <div className="absolute bottom-0 left-0 w-full h-4 bg-black" />
                
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="w-40 h-40 bg-white border-8 border-black flex items-center justify-center mx-auto shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Trophy size={80} className="text-brutal-blue" />
                </motion.div>
                
                <h2 className="text-9xl font-display leading-none">QUEST COMPLETE</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="brutal-card bg-white p-8 space-y-2 border-black">
                    <p className="font-display text-2xl uppercase text-gray-400">Final Score</p>
                    <p className="text-7xl font-display text-brutal-blue">{score}</p>
                  </div>
                  <div className="brutal-card bg-white p-8 space-y-2 border-black">
                    <p className="font-display text-2xl uppercase text-gray-400">Max Streak</p>
                    <p className="text-7xl font-display text-brutal-pink flex items-center justify-center gap-3">
                      <Flame size={48} />
                      {maxStreak}
                    </p>
                  </div>
                  <div className="brutal-card bg-white p-8 space-y-2 border-black">
                    <p className="font-display text-2xl uppercase text-gray-400">Accuracy</p>
                    <p className="text-7xl font-display text-brutal-green">
                      {Math.round((quiz.questions.filter(q => userAnswers[q.id] === q.correctAnswer).length / quiz.questions.length) * 100)}%
                    </p>
                  </div>
                  <div className="brutal-card bg-white p-8 space-y-4 border-black">
                    <p className="font-display text-2xl uppercase text-gray-400">Level {level}</p>
                    <div className="w-full h-6 border-4 border-black bg-gray-100 overflow-hidden">
                      <motion.div 
                        className="h-full bg-brutal-yellow"
                        initial={{ width: 0 }}
                        animate={{ width: `${(xp % 1000) / 10}%` }}
                      />
                    </div>
                    <p className="font-mono font-bold text-sm uppercase">{xp % 1000} / 1000 XP TO NEXT LEVEL</p>
                  </div>
                </div>

                <div className="flex justify-center gap-8">
                  <button
                    onClick={reset}
                    className="brutal-btn bg-brutal-green flex items-center gap-4 text-3xl py-6 px-12 hover:bg-white text-black"
                  >
                    <RotateCcw size={32} />
                    NEW QUEST
                  </button>
                  <button 
                    onClick={handleClaimBadge}
                    className="brutal-btn bg-white flex items-center gap-4 text-3xl py-6 px-12 hover:bg-brutal-pink hover:text-white"
                  >
                    <Award size={32} />
                    {badges.length > 0 ? 'BADGE CLAIMED' : 'CLAIM BADGE'}
                  </button>
                </div>
              </div>

              <div className="space-y-12">
                <h3 className="text-7xl font-display flex items-center gap-6">
                  <BookOpen size={64} className="text-brutal-pink" />
                  KNOWLEDGE LOG
                </h3>
                {quiz.questions.map((q, i) => {
                  const isCorrect = userAnswers[q.id] === q.correctAnswer;
                  return (
                    <div key={i} className="brutal-card p-12 space-y-10 bg-white dark:bg-zinc-900 dark:border-white relative">
                      <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                        <h4 className="text-5xl font-display flex-1 leading-tight">
                          <span className="text-brutal-blue mr-4">[{i + 1}]</span>
                          {q.question}
                        </h4>
                        <div className={`px-10 py-4 border-4 border-black dark:border-white font-display text-3xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] ${
                          isCorrect ? 'bg-brutal-green text-black' : 'bg-brutal-pink text-white'
                        }`}>
                          {isCorrect ? 'SUCCESS' : 'FAILED'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className={`p-10 border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] ${isCorrect ? 'bg-brutal-green/5' : 'bg-brutal-pink/5'}`}>
                          <p className="font-display text-xl uppercase text-gray-500 dark:text-gray-400 mb-4 tracking-widest">Your Input</p>
                          <p className="text-4xl font-display">{userAnswers[q.id] || 'NO INPUT'}</p>
                        </div>
                        {!isCorrect && (
                          <div className="space-y-4">
                            <div className="p-10 border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] bg-brutal-green/5">
                              <p className="font-display text-xl uppercase text-gray-500 dark:text-gray-400 mb-4 tracking-widest">Correct Output</p>
                              <p className="text-4xl font-display">{q.correctAnswer}</p>
                            </div>
                            <div className="brutal-card bg-white dark:bg-zinc-800 p-6 border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)]">
                              <p className="font-display text-sm uppercase mb-2">Personal Error Note</p>
                              <textarea 
                                placeholder="What did you learn from this mistake? (e.g., 'Remember the difference between X and Y')"
                                className="w-full p-4 border-4 border-black dark:border-white bg-white dark:bg-zinc-900 font-mono text-sm focus:bg-brutal-yellow/10 outline-none min-h-[100px] text-black dark:text-white"
                                onChange={(e) => {
                                  const note = e.target.value;
                                  // We'll save this when they click the button below
                                }}
                                id={`note-${q.id}`}
                              />
                              <button 
                                onClick={async () => {
                                  const noteElement = document.getElementById(`note-${q.id}`) as HTMLTextAreaElement;
                                  const note = noteElement?.value;
                                  if (!note || !user) return;
                                  
                                  const { collection, addDoc } = await import('firebase/firestore');
                                  await addDoc(collection(db, 'errorNotes'), {
                                    userId: user.uid,
                                    questionId: q.id,
                                    question: q.question,
                                    correctAnswer: q.correctAnswer,
                                    userAnswer: userAnswers[q.id],
                                    note,
                                    timestamp: serverTimestamp()
                                  });
                                  
                                  // Add notification
                                  await addDoc(collection(db, 'notifications'), {
                                    userId: user.uid,
                                    title: 'Error Note Saved!',
                                    message: 'You can revisit this note in your profile to master this concept.',
                                    type: 'success',
                                    read: false,
                                    timestamp: serverTimestamp()
                                  });
                                  
                                  noteElement.value = '';
                                  alert('Note saved successfully!');
                                }}
                                className="mt-4 w-full brutal-btn bg-black dark:bg-white text-white dark:text-black py-3 uppercase font-display text-sm flex items-center justify-center gap-2"
                              >
                                <Save size={18} />
                                Save Note to Revisit
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-12 bg-black dark:bg-zinc-950 text-white border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] relative">
                        <div className="absolute -top-6 left-10 bg-brutal-yellow text-black border-4 border-black dark:border-white px-6 py-2 font-display text-xl uppercase">
                          AI INSIGHTS
                        </div>
                        <div className="font-mono text-xl leading-relaxed mt-4">
                          <ReactMarkdown>{q.explanation}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditProfileOpen && userProfile && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditProfileOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-12 space-y-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center border-b-8 border-black pb-8">
                <h2 className="text-5xl font-display uppercase tracking-tighter">Edit Profile</h2>
                <button onClick={() => setIsEditProfileOpen(false)} className="brutal-btn bg-brutal-pink !p-4">
                  <X size={32} />
                </button>
              </div>

              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updates = {
                  displayName: formData.get('displayName') as string,
                  headline: formData.get('headline') as string,
                  aboutMe: formData.get('aboutMe') as string,
                  experience: formData.get('experience') as string,
                  updatedAt: serverTimestamp()
                };
                
                try {
                  const userRef = doc(db, 'users', user.uid);
                  await updateDoc(userRef, updates);
                  setUserProfile(prev => prev ? { ...prev, ...updates } : null);
                  setIsEditProfileOpen(false);
                  confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#00FF00', '#FFFF00']
                  });
                } catch (err) {
                  console.error(err);
                  setError('Failed to update profile.');
                }
              }}>
                <div className="space-y-2">
                  <label className="font-display uppercase text-sm">Display Name</label>
                  <input 
                    name="displayName"
                    defaultValue={userProfile.displayName}
                    className="brutal-input w-full"
                    placeholder="Your Name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-display uppercase text-sm">Headline</label>
                  <input 
                    name="headline"
                    defaultValue={userProfile.headline}
                    className="brutal-input w-full"
                    placeholder="e.g. Aspiring Scientist | AI Enthusiast"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-display uppercase text-sm">About Me</label>
                  <textarea 
                    name="aboutMe"
                    defaultValue={userProfile.aboutMe}
                    className="brutal-input w-full min-h-[150px] resize-none"
                    placeholder="Tell the world about your quest..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-display uppercase text-sm">Experience / Institution</label>
                  <input 
                    name="experience"
                    defaultValue={userProfile.experience}
                    className="brutal-input w-full"
                    placeholder="e.g. Student at IIT Madras"
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" className="brutal-btn bg-brutal-green w-full py-4 text-2xl">
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Level Up Overlay removed */}

      <footer className="border-t-4 border-black bg-white py-12">
        <div className="max-w-[1400px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <span className="font-display text-4xl">QUIZQUEST AI</span>
            <div className="px-4 py-1 bg-black text-brutal-green font-mono text-sm uppercase">
              System_Status: Operational
            </div>
          </div>
          <div className="flex gap-12 font-display text-2xl uppercase">
            <a href="#" className="hover:text-brutal-pink transition-colors">Privacy</a>
            <a href="#" className="hover:text-brutal-green transition-colors">Terms</a>
            <a href="#" className="hover:text-brutal-blue transition-colors">Github</a>
          </div>
        </div>
      </footer>

      {/* Floating Chat Widget */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="brutal-card bg-white w-96 h-[500px] mb-4 flex flex-col overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="bg-black text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={20} className="text-brutal-pink" />
                  <span className="font-display uppercase">24/7 Doubt Support</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="brutal-btn bg-brutal-pink !p-1 !rounded-lg border-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 text-gray-500 font-bold uppercase text-sm">
                    Ask me anything about your quest!
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative group ${
                      msg.role === 'user' ? 'bg-brutal-yellow' : 'bg-white'
                    }`}>
                      <p className="text-sm font-bold">{msg.text}</p>
                      <button 
                        onClick={() => speak(msg.text)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-brutal-yellow"
                        aria-label="Read message aloud"
                      >
                        <Volume2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t-4 border-black bg-white flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your doubt..."
                  className="flex-1 brutal-input !py-2 !px-3 text-sm"
                />
                <button 
                  onClick={handleSendMessage}
                  className="brutal-btn bg-brutal-green !p-2"
                >
                  <Send size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-16 h-16 bg-brutal-pink text-white border-4 border-black rounded-full flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] transition-all"
          aria-label="Open AI Chat"
        >
          <MessageSquare size={32} />
        </button>
      </div>
      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white border-8 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] p-12 space-y-10 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center border-b-8 border-black pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-brutal-orange border-4 border-black flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <Settings size={40} className="text-white" />
                  </div>
                  <h2 className="text-6xl font-display uppercase tracking-tighter">Settings</h2>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="brutal-btn bg-brutal-pink !p-4">
                  <X size={32} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <div className="p-8 border-4 border-black bg-brutal-yellow/10 space-y-6">
                    <div className="flex items-center gap-3">
                      <Eye size={24} className="text-brutal-yellow" />
                      <h3 className="font-display text-3xl uppercase">Visuals</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest opacity-60">Color Blindness</label>
                        <select 
                          value={accessibility.colorBlindMode}
                          onChange={(e) => setAccessibility(prev => ({ ...prev, colorBlindMode: e.target.value as any }))}
                          className="brutal-input w-full bg-white"
                        >
                          <option value="none">Standard</option>
                          <option value="protanopia">Protanopia</option>
                          <option value="deuteranopia">Deuteranopia</option>
                          <option value="tritanopia">Tritanopia</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white border-4 border-black">
                        <span className="font-display text-xl uppercase">High Contrast</span>
                        <button 
                          onClick={() => setAccessibility(prev => ({ ...prev, highContrast: !prev.highContrast }))}
                          className={`w-14 h-8 border-4 border-black transition-colors relative ${accessibility.highContrast ? 'bg-black' : 'bg-white'}`}
                        >
                          <motion.div 
                            className={`absolute top-1 bottom-1 w-4 border-2 border-black ${accessibility.highContrast ? 'bg-white right-1' : 'bg-black left-1'}`}
                            layout
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white border-4 border-black">
                        <span className="font-display text-xl uppercase">Large Text</span>
                        <button 
                          onClick={() => setAccessibility(prev => ({ ...prev, largeText: !prev.largeText }))}
                          className={`w-14 h-8 border-4 border-black transition-colors relative ${accessibility.largeText ? 'bg-black' : 'bg-white'}`}
                        >
                          <motion.div 
                            className={`absolute top-1 bottom-1 w-4 border-2 border-black ${accessibility.largeText ? 'bg-white right-1' : 'bg-black left-1'}`}
                            layout
                          />
                        </button>
                      </div>

                    </div>
                  </div>

                  <div className="p-8 border-4 border-black bg-brutal-green/10 space-y-6">
                    <div className="flex items-center gap-3">
                      <Globe size={24} className="text-brutal-green" />
                      <h3 className="font-display text-3xl uppercase">Language</h3>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest opacity-60">Preferred Region</label>
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as any)}
                        className="brutal-input w-full bg-white"
                      >
                        <option value="english">English</option>
                        <option value="hindi">Hindi</option>
                        <option value="tamil">Tamil</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="p-8 border-4 border-black bg-brutal-blue/10 space-y-6">
                    <div className="flex items-center gap-3">
                      <Bell size={24} className="text-brutal-blue" />
                      <h3 className="font-display text-3xl uppercase">Alerts</h3>
                    </div>
                    <div className="space-y-4">
                      {['Daily Reminders', 'Contest Alerts', 'Friend Activity'].map((item) => (
                        <div key={item} className="flex items-center justify-between p-4 bg-white border-4 border-black">
                          <span className="font-display text-lg uppercase">{item}</span>
                          <div className="w-8 h-8 border-4 border-black bg-brutal-green shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t-8 border-black flex justify-end gap-6">
                <button onClick={() => setIsSettingsOpen(false)} className="brutal-btn bg-white hover:bg-black hover:text-white transition-all">
                  Discard
                </button>
                <button onClick={() => setIsSettingsOpen(false)} className="brutal-btn bg-brutal-green hover:bg-white transition-all">
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isCreateContestOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateContestOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] p-12 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b-8 border-black pb-8 mb-8">
                <h2 className="text-6xl font-display uppercase tracking-tighter">Create Contest</h2>
                <button onClick={() => setIsCreateContestOpen(false)} className="brutal-btn bg-brutal-pink !p-4">
                  <X size={32} />
                </button>
              </div>

              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
                const type = (form.elements.namedItem('type') as HTMLSelectElement).value;
                const endTime = (form.elements.namedItem('endTime') as HTMLInputElement).value;

                if (!user) return;

                try {
                  await addDoc(collection(db, 'contests'), {
                    title,
                    description,
                    type,
                    endTime,
                    participants: 1,
                    status: 'upcoming',
                    organizer: user.displayName || 'Anonymous',
                    createdAt: serverTimestamp()
                  });
                  setIsCreateContestOpen(false);
                  confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                  });
                } catch (err) {
                  console.error("Error creating contest:", err);
                }
              }}>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest opacity-60">Contest Title</label>
                  <input name="title" type="text" placeholder="e.g. Physics Masters 2024" className="brutal-input w-full" required />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest opacity-60">Mode</label>
                    <select name="type" className="brutal-input w-full bg-white">
                      <option value="1v1">1v1 Duel</option>
                      <option value="2v2">2v2 Team Battle</option>
                      <option value="3v1">3v1 Boss Raid</option>
                      <option value="free-for-all">Free For All</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest opacity-60">End Date</label>
                    <input name="endTime" type="date" className="brutal-input w-full bg-white" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest opacity-60">Description</label>
                  <textarea name="description" rows={4} placeholder="What is this contest about?" className="brutal-input w-full" required />
                </div>

                <button type="submit" className="w-full brutal-btn bg-brutal-yellow py-6 text-2xl font-display uppercase hover:bg-black hover:text-white transition-all">
                  Launch Contest
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isChatModalOpen && selectedUserForChat && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[80vh] overflow-hidden"
            >
              <div className="p-8 border-b-8 border-black bg-brutal-blue text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white border-4 border-black rounded-full overflow-hidden">
                    {selectedUserForChat.photoURL && <img src={selectedUserForChat.photoURL} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <h2 className="text-3xl font-display uppercase">{selectedUserForChat.displayName}</h2>
                    <p className="text-xs font-bold uppercase opacity-70">Online</p>
                  </div>
                </div>
                <button onClick={() => setIsChatModalOpen(false)} className="brutal-btn bg-brutal-pink !p-4">
                  <X size={32} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-gray-50">
                {messages.filter(m => (m.senderId === user?.uid && m.receiverId === selectedUserForChat.uid) || (m.senderId === selectedUserForChat.uid && m.receiverId === user?.uid))
                  .sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0))
                  .map((msg, i) => (
                    <div key={i} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${msg.senderId === user?.uid ? 'bg-brutal-green' : 'bg-white'}`}>
                        <p className="font-bold">{msg.text}</p>
                        <p className="text-[10px] uppercase mt-1 opacity-50">
                          {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="p-8 border-t-8 border-black bg-white">
                <form className="flex gap-4" onSubmit={async (e) => {
                  e.preventDefault();
                  const input = (e.target as any).message.value;
                  if (!input.trim() || !user) return;
                  
                  try {
                    await addDoc(collection(db, 'messages'), {
                      text: input,
                      senderId: user.uid,
                      receiverId: selectedUserForChat.uid,
                      createdAt: serverTimestamp(),
                      read: false
                    });
                    (e.target as any).message.value = '';
                  } catch (err) {
                    console.error(err);
                  }
                }}>
                  <input name="message" type="text" placeholder="Type a message..." className="brutal-input flex-1" />
                  <button type="submit" className="brutal-btn bg-brutal-yellow px-8">
                    <Send size={24} />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
