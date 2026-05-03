import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Mic, 
  Square, 
  FileText, 
  Printer, 
  History, 
  Settings, 
  User, 
  Shield, 
  CheckCircle, 
  PlusCircle,
  Loader2, 
  Languages, 
  Trash2,
  Download,
  Video,
  AlertCircle,
  LogOut,
  Search,
  Eye,
  ChevronRight,
  EyeOff,
  CloudCheck,
  ShieldCheck,
  Fingerprint,
  Zap,
  Play,
  Lock,
  BarChart4,
  PieChart,
  FileBarChart,
  Menu,
  X,
  ChevronLeft,
  UserCheck,
  Users,
  Pause,
  Scan,
  Archive,
  FileX,
  RefreshCw,
  FileSearch,
  Upload,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { transcribeAndTranslateAudio } from './lib/gemini';
import { 
  auth, 
  db, 
  googleProvider, 
  OperationType, 
  handleFirestoreError 
} from './lib/firebase';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  addDoc,
  where,
  deleteDoc,
  getDocs,
  arrayUnion,
  getDoc
} from 'firebase/firestore';

// Types
interface StaffProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  password?: string;
  userType: 'Investigator' | 'Admin';
}

interface RecordingFile {
  id: string;
  name: string;
  data: string; // base64
  mimeType: string;
  duration: number;
  createdAt: any;
  transcription?: string;
}

interface CaseRecord {
  id: string;
  caseId: string;
  detectiveName: string;
  intervieweeName: string;
  personType: 'Suspect' | 'Witness' | 'Complainant';
  language: string;
  transcription: string;
  status: 'Recording' | 'Processing' | 'Draft' | 'Finalized';
  investigatorUid: string;
  investigatorEmail: string;
  updatedAt: any;
  hasVideo?: boolean;
  recordings?: RecordingFile[];
}

interface Translation {
  title: string;
  subtitle: string;
  signIn: string;
  email: string;
  password: string;
  authOnly: string;
  investigator: string;
  supervisor: string;
  admin: string;
  logout: string;
  addInvestigator: string;
  fullName: string;
  phone: string;
  rank: string;
  accPassword: string;
  register: string;
  team: string;
  name: string;
  joined: string;
  testimonyInfo: string;
  caseId: string;
  subjectName: string;
  role: string;
  language: string;
  history: string;
  noHistory: string;
  finalize: string;
  back: string;
  processing: string;
  processingSub: string;
  placeholder: string;
  locked: string;
  oversight: string;
  oversightSub: string;
  search: string;
  status: string;
  caseDetails: string;
  officer: string;
  sync: string;
  monitoring: string;
  noFeeds: string;
  feedSub: string;
  statementReview: string;
  captureArchive: string;
  establish: string;
  reports: string;
  totalCases: string;
  witnesses: string;
  suspects: string;
  complainants: string;
  caseStatusStats: string;
  languageStats: string;
  liveFeed: string;
  stopRecording: string;
  startRecording: string;
  pauseRecording: string;
  resumeRecording: string;
  remoteStop: string;
  generateReport: string;
  printReport: string;
  recordingTypes: string;
  videoRecords: string;
  audioRecords: string;
  witness: string;
  suspect: string;
  complainant: string;
  witnessStatement: string;
  suspectStatement: string;
  complainantStatement: string;
  giverSign: string;
  receiverSign: string;
  recordingMode: string;
  video: string;
  audio: string;
  scanQR: string;
  scanningTitle: string;
  verifySuccess: string;
  verifyFail: string;
  verifyBtn: string;
  myArchives: string;
  openFile: string;
  editActive: string;
  transcribing: string;
  transcriptionSuccess: string;
  ready: string;
  activeSession: string;
  officialEntry: string;
  liveStream: string;
  stationID: string;
  snapshot: string;
  newInvestigation: string;
  saveDraft: string;
  draftSaved: string;
  groupByDetective: string;
  allDetectives: string;
  byDetective: string;
  scanFile: string;
  scanCamera: string;
  viewDetails: string;
  totalStaff: string;
  activeNow: string;
  transcribe: string;
  switchCamera: string;
  verifyScannedRecord: string;
  confirmVerification: string;
  dataMatches: string;
  dataMismatch: string;
  savedRecordings: string;
  convertToText: string;
  noRecordings: string;
  recordingSaved: string;
  uploadLogo: string;
  logoUpdated: string;
  brandingSettings: string;
  watermark: string;
  liveMonitoringActive: string;
  monitorNow: string;
  micSelection: string;
  audioDevices: string;
}

const translations: Record<'EN' | 'AM', Translation> = {
  EN: {
    title: "BG Police Commission",
    subtitle: "Digital Testimony Capture System",
    signIn: "Sign In to System",
    email: "Email Address",
    password: "Password",
    authOnly: "Authorized Personnel Only • Confidential",
    investigator: "Investigator",
    supervisor: "Supervisor",
    admin: "Admin",
    logout: "Logout",
    addInvestigator: "Add New Investigator",
    fullName: "Full Name",
    phone: "Phone",
    rank: "Rank / Position",
    accPassword: "Account Password",
    register: "Register Investigator",
    team: "Registered Investigation Team",
    name: "Name",
    joined: "Joined",
    testimonyInfo: "Testimony Info",
    caseId: "Case ID / File No.",
    subjectName: "Subject Full Name",
    role: "Role",
    language: "Language",
    history: "My Session History",
    noHistory: "No active investigations.",
    finalize: "Finalize & Print",
    back: "Back",
    processing: "AI Translation in Progress...",
    processingSub: "Translating to Amharic...",
    placeholder: "Automatic translation will appear here...",
    locked: "LOCKED - FINALIZED",
    oversight: "Mission Oversight Control",
    oversightSub: "Live monitoring of all investigative testimonies across the region.",
    search: "Filter by Case, Subject or Officer...",
    status: "Status",
    caseDetails: "Case Details",
    officer: "Investigating Officer",
    sync: "Sync Info",
    monitoring: "Monitoring",
    noFeeds: "No active feeds detected",
    feedSub: "Regional investigation activity is currently idle.",
    statementReview: "Statement Review",
    captureArchive: "Capture Archive",
    establish: "Establishing secure connection to regional node...",
    reports: "Statistical Reports",
    totalCases: "Total Cases",
    witnesses: "Witnesses",
    suspects: "Suspects",
    complainants: "Complainants",
    caseStatusStats: "Case Status Distribution",
    languageStats: "Language Distribution",
    liveFeed: "LIVE MONITORING",
    stopRecording: "Stop Recording",
    startRecording: "Start Recording",
    pauseRecording: "Pause",
    resumeRecording: "Resume",
    remoteStop: "Force Stop Recording",
    generateReport: "Generate Official Report",
    printReport: "Print Statistics Report",
    recordingTypes: "Recording Types",
    videoRecords: "Video Records",
    audioRecords: "Audio Records",
    witness: "Witness",
    suspect: "Suspect",
    complainant: "Complainant",
    witnessStatement: "Witness Statement",
    suspectStatement: "Suspect Statement",
    complainantStatement: "Complainant Statement",
    giverSign: "Statement Giver Sign",
    receiverSign: "Investigator Sign",
    recordingMode: "Recording Mode",
    video: "Video",
    audio: "Audio",
    scanQR: "Scan QR Verification",
    scanningTitle: "Align QR Code within Frame",
    verifySuccess: "Authenticity Verified Successfully",
    verifyFail: "Verification Failed: Record Not Found",
    verifyBtn: "Verify QR Code",
    myArchives: "My Case Archives",
    openFile: "Open Record",
    editActive: "Currently Editing Record",
    transcribing: "Converting voice to text...",
    transcriptionSuccess: "Transcription successfully completed!",
    ready: "Ready",
    activeSession: "Active Investigation Session",
    officialEntry: "Official Database Entry Identified",
    liveStream: "Live Stream",
    stationID: "Monitoring Station Bravo-9",
    snapshot: "Transcription Snapshot",
    newInvestigation: "New Investigation",
    saveDraft: "Save Draft",
    draftSaved: "Draft Saved!",
    groupByDetective: "Group by Officer",
    allDetectives: "All Detectives",
    byDetective: "By Detective",
    scanFile: "Upload & Scan File",
    scanCamera: "Scan with Camera",
    viewDetails: "View Details",
    totalStaff: "Total Staff",
    activeNow: "Active Now",
    transcribe: "Transcribe Voice",
    switchCamera: "Switch Camera",
    verifyScannedRecord: "Verify Scanned Record",
    confirmVerification: "Confirm Authenticity",
    dataMatches: "System data matches record",
    dataMismatch: "System data mismatch",
    savedRecordings: "Case Files & Recordings",
    convertToText: "Convert to Text (Amharic)",
    noRecordings: "No files saved for this case yet.",
    recordingSaved: "Recording saved to case file.",
    uploadLogo: "Upload Police Logo",
    logoUpdated: "Logo updated successfully.",
    brandingSettings: "Branding",
    watermark: "Watermark",
    liveMonitoringActive: "Live Monitoring Active",
    monitorNow: "Monitor Live",
    micSelection: "Select Microphone",
    audioDevices: "Audio Devices"
  },
  AM: {
    title: "የቤንሻንጉል ጉሙዝ ፖሊስ ኮሚሽን",
    subtitle: "ዲጂታል የቃል መቀበያ ሲስተም",
    signIn: "ወደ ሲስተሙ ይግቡ",
    email: "ኢሜል",
    password: "የይለፍ ቃል",
    authOnly: "የተፈቀደላቸው ሰራተኞች ብቻ • ምስጢራዊ",
    investigator: "መርማሪ",
    supervisor: "ሱፐርቫይዘር",
    admin: "አድሚን",
    logout: "ውጣ",
    addInvestigator: "አዲስ መርማሪ መዝግብ",
    fullName: "ሙሉ ስም",
    phone: "ስልክ",
    rank: "የስራ መደብ",
    accPassword: "የአካውንት ይለፍ ቃል",
    register: "መርማሪውን መዝግብ",
    team: "የተመዘገቡ መርማሪዎች",
    name: "ስም",
    joined: "የተቀላቀሉበት",
    testimonyInfo: "የቃል መረጃ",
    caseId: "የመዝገብ ቁጥር",
    subjectName: "የባለጉዳዩ ሙሉ ስም",
    role: "ሚና",
    language: "ቋንቋ",
    history: "የቅርብ ጊዜ ስራዎች",
    noHistory: "ምንም ንቁ ምርመራ የለም።",
    finalize: "አረጋግጥና አትም",
    back: "ተመለስ",
    processing: "በአርቴፊሻል ኢንተለጀንስ ትርጉም እየተሰራ ነው...",
    processingSub: "ወደ አማርኛ እየተተረጎመ ነው...",
    placeholder: "አውቶማቲክ ትርጉሙ እዚህ ይታያል...",
    locked: "ተቆልፏል - ተጠናቋል",
    oversight: "የክዋኔ ቁጥጥር ማዕከል",
    oversightSub: "በክልሉ እየተካሄዱ ያሉ የምርመራ ቃላትን በቀጥታ መከታተያ።",
    search: "በመዝገብ፣ በስም ወይም በመርማሪ ፈልግ...",
    status: "ሁኔታ",
    caseDetails: "ዝርዝር መረጃ",
    officer: "መርማሪ መኮንን",
    sync: "የማመሳሰል መረጃ",
    monitoring: "ክትትል",
    noFeeds: "ምንም ንቁ ስራ አልተገኘም",
    feedSub: "የክልሉ የምርመራ እንቅስቃሴ በአሁኑ ጊዜ ስራ የለም።",
    statementReview: "የቃል ምርመራ ክትትል",
    captureArchive: "መረጃውን አትም/አስቀምጥ",
    establish: "ከክልል ማእከል ጋር ግንኙነት እየተፈጠረ ነው...",
    reports: "የስታቲስቲክስ ሪፖርቶች",
    totalCases: "ጠቅላላ መዝገቦች",
    witnesses: "ምስክሮች",
    suspects: "ተጠርጣሪዎች",
    complainants: "ከሳሾች",
    caseStatusStats: "የመዝገቦች ሁኔታ ስርጭት",
    languageStats: "የቋንቋዎች ስርጭት",
    liveFeed: "የቀጥታ ስርጭት (LIVE)",
    stopRecording: "ቀረጻ አቁም",
    startRecording: "መቅዳት ጀምር",
    pauseRecording: "ለጊዜው አቁም",
    resumeRecording: "ቀጥል",
    remoteStop: "ቀረጻውን በግዴታ አቁም",
    generateReport: "ይፋዊ ሪፖርት አውጣ",
    printReport: "የስታቲስቲክስ ሪፖርት አትም",
    recordingTypes: "የመቅጃ አይነቶች",
    videoRecords: "የቪዲዮ ቅጂዎች",
    audioRecords: "የድምፅ ቅጂዎች",
    witness: "ምስክር",
    suspect: "ተጠርጣሪ",
    complainant: "ከሳሽ",
    witnessStatement: "የምስክርነት ቃል",
    suspectStatement: "የተጠረጣሪ ቃል",
    complainantStatement: "የከሳሽ ቃል",
    giverSign: "የቃል ሰጪ ፊርማ",
    receiverSign: "የመርማሪ ፊርማ",
    recordingMode: "የመቅጃ ዘዴ",
    video: "ቪዲዮ",
    audio: "ድምፅ",
    scanQR: "QR ኮድ ስካን አድርግ",
    scanningTitle: "QR ኮዱን በትክክለኛው ቦታ ያስገቡ",
    verifySuccess: "ትክክለኛነቱ በተሳካ ሁኔታ ተረጋግጧል",
    verifyFail: "ትክክለኛነቱ አልተረጋገጠም፡ መዝገቡ አልተገኘም",
    verifyBtn: "QR ኮድ አረጋግጥ",
    myArchives: "የእኔ የሰነድ መዛግብት",
    openFile: "ሰነዱን ክፈት",
    editActive: "አሁን እየታረመ ያለ ሰነድ",
    transcribing: "ድምፁን ወደ ጽሁፍ እየቀየረ ነው...",
    transcriptionSuccess: "ወደ ጽሁፍ የመቀየር ስራው በተሳካ ሁኔታ ተጠናቋል!",
    ready: "ዝግጁ",
    activeSession: "ንቁ የምርመራ ክፍለ ጊዜ",
    officialEntry: "ይፋዊ የመረጃ ቋት ግቤት ተለይቷል",
    liveStream: "የቀጥታ ስርጭት",
    stationID: "የክትትል ማዕከል ብራቮ-9",
    snapshot: "የቃል መዝገብ ቅንጭብ",
    newInvestigation: "አዲስ ምርመራ",
    saveDraft: "ረቂቅ አስቀምጥ",
    draftSaved: "ረቂቅ ተቀምጧል!",
    groupByDetective: "በመርማሪ ስም ቃላትን አደራጅ",
    allDetectives: "ሁሉም መርማሪዎች",
    byDetective: "በመርማሪ ስም",
    scanFile: "ከጋለሪ ፎቶ መርጥህ ስካን አድርግ",
    scanCamera: "በካሜራ ፎቶ አንስተህ ስካን አድርግ",
    viewDetails: "ዝርዝር መረጃ ተመልከት",
    totalStaff: "ጠቅላላ ሰራተኞች",
    activeNow: "አሁን ስራ ላይ ያሉ",
    transcribe: "ድምፁን ወደ ጽሁፍ ቀይር",
    switchCamera: "ካሜራ ቀይር",
    verifyScannedRecord: "የተቃኘ መዝገብ አረጋግጥ",
    confirmVerification: "ትክክለኛነቱን አረጋግጥ",
    dataMatches: "መረጃው በትክክል ይገጥማል",
    dataMismatch: "መረጃው አይገጥምም",
    savedRecordings: "የተቀመጡ የድምፅና ቪዲዮ ፋይሎች",
    convertToText: "ወደ ጽሁፍ ቀይር (Amharic)",
    noRecordings: "ለዚህ መዝገብ እስካሁን የተቀመጠ ፋይል የለም።",
    recordingSaved: "ቀረጻው በመዝገቡ ውስጥ በትክክል ተቀምጧል።",
    uploadLogo: "የፖሊስ ሎጎ ጫን (Upload Logo)",
    logoUpdated: "ሎጎው በትክክል ተቀይሯል።",
    brandingSettings: "የማንነት መገለጫ (Branding)",
    watermark: "የውሃ ምልክት (Watermark)",
    liveMonitoringActive: "የቀጥታ ስርጭት ክትትል እየተካሄደ ነው",
    monitorNow: "ቀጥታ ተከታተል",
    micSelection: "ማይክሮፎን ምረጥ (Select Mic)",
    audioDevices: "የድምፅ አማራጮች"
  }
};

// Global types for Speech Recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function App() {
  // Auth State
  const [user, setUser] = useState<{uid: string, email: string, displayName?: string} | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => setIsOffline(false));
      window.addEventListener('offline', () => setIsOffline(true));
    }
  }, []);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const [clientDate, setClientDate] = useState<string | null>(null);

  const generateCaseId = useCallback(() => `BGP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`, []);

  // App State
  const [uiLanguage, setUiLanguage] = useState<'EN' | 'AM'>('AM');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = translations[uiLanguage];
  const [mode, setMode] = useState<'Investigator' | 'Supervisor' | 'Admin' | 'Reports'>('Investigator');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentCaseDocId, setCurrentCaseDocId] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<'Recording' | 'Processing' | 'Draft' | 'Finalized' | 'Initial'>('Initial');
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedCase, setVerifiedCase] = useState<CaseRecord | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  const [caseInfo, setCaseInfo] = useState({
    caseId: '',
    detectiveName: '',
    intervieweeName: '',
    personType: 'Witness' as const,
    language: 'Amharic',
    recordingMode: 'Audio' as 'Audio' | 'Video' | 'Document'
  });
  
  const [allCases, setAllCases] = useState<CaseRecord[]>([]);
  const [allStaff, setAllStaff] = useState<StaffProfile[]>([]);
  const [systemSettings, setSystemSettings] = useState<{ policeLogo?: string, stationName?: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('police_logo_cache');
      if (cached) return { policeLogo: cached };
    }
    return null;
  });
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activePrintId, setActivePrintId] = useState<'case' | 'stats'>('case');
  const [supervisorGroupByDetective, setSupervisorGroupByDetective] = useState(false);
  const [activeReportFilter, setActiveReportFilter] = useState<{type: string, value: string} | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [recordedBlob, setRecordedBlob] = useState<{blob: Blob, mimeType: string} | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [previewAudioId, setPreviewAudioId] = useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob.blob);
      setRecordedUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setRecordedUrl(null);
    }
  }, [recordedBlob]);

  const playHistoricalRecording = (rec: any) => {
    if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    const blob = base64ToBlob(rec.data, rec.mimeType);
    const url = URL.createObjectURL(blob);
    setPreviewAudioUrl(url);
    setPreviewAudioId(rec.id);
  };
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');

  // Admin Form State
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    userType: 'Investigator' as const
  });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const getDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
    } catch (err) {
      console.error("Error listing devices:", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      getDevices();
      navigator.mediaDevices.addEventListener('devicechange', getDevices);
      return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    }
  }, [getDevices]);

  // Auth Listener
  useEffect(() => {
    setIsMounted(true);
    setClientDate(new Date().toLocaleDateString('en-GB'));
    setCaseInfo(prev => ({
      ...prev,
      caseId: prev.caseId || generateCaseId()
    }));

    // Fetch System Settings
    const settingsUnsubscribe = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as any;
        setSystemSettings(data);
        if (data.policeLogo) {
          localStorage.setItem('police_logo_cache', data.policeLogo);
        }
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email || '', displayName: u.displayName || '' });
        
        // Initial quick check for main dev email
        const isMainAdmin = u.email === 'sendeqbuild@gmail.com';
        setIsAdmin(isMainAdmin);
        
        // Deep check for role
        getDoc(doc(db, 'users', u.uid)).then(userDoc => {
          if (userDoc.exists() && userDoc.data()?.userType === 'Admin') {
            setIsAdmin(true);
          }
        }).catch(() => {});

        setCaseInfo(prev => ({ ...prev, detectiveName: u.displayName || '' }));
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoadingApp(false);
    });
    return () => {
      unsubscribe();
      settingsUnsubscribe();
    };
  }, []);

  // Cases Listener
  useEffect(() => {
    if (!user) return;
    
    let q;
    if (user.email === 'sendeqbuild@gmail.com') {
      q = query(collection(db, 'cases'), orderBy('updatedAt', 'desc'));
    } else {
      q = query(collection(db, 'cases'), 
        where('investigatorEmail', '==', user.email)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CaseRecord));
      setAllCases(docs);
      
      // Update selected case if it's currently open
      if (selectedCase) {
        const updated = docs.find(c => c.id === selectedCase.id);
        if (updated) setSelectedCase(updated);
      }
    }, (err) => {
      // If index is missing, we might get an error, but usually for single field equality it's fine.
      handleFirestoreError(err, OperationType.LIST, 'cases');
    });
    
    return () => unsubscribe();
  }, [user, selectedCase?.id]);

  // Staff Listener (Admin only)
  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffProfile));
      setAllStaff(docs);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // Auto-scroll transcription while recording
  useEffect(() => {
    if (isRecording && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [transcription, isRecording]);

  // Sync current transcription to Firestore
  useEffect(() => {
    if (user && currentCaseDocId && transcription && mode === 'Investigator' && caseStatus !== 'Finalized') {
      const timeout = setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'cases', currentCaseDocId), {
            transcription,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Sync error:", err);
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [transcription, currentCaseDocId, user, mode, caseStatus]);

  // Timer for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isRecording, stream]);

  const filteredCases = allCases.filter(c => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = (
      c.caseId.toLowerCase().includes(s) || 
      c.intervieweeName.toLowerCase().includes(s) ||
      c.detectiveName.toLowerCase().includes(s) ||
      (s.length > 3 && c.transcription?.toLowerCase().includes(s))
    );
    
    if (!activeReportFilter || activeReportFilter.type === 'all') return matchesSearch;
    
    if (activeReportFilter.type === 'personType') {
      return matchesSearch && c.personType === activeReportFilter.value;
    }
    
    if (activeReportFilter.type === 'detective') {
      return matchesSearch && c.detectiveName === activeReportFilter.value;
    }

    return matchesSearch;
  });

  const casesGroupedByDetective = filteredCases.reduce((acc: {[key: string]: CaseRecord[]}, c) => {
    if (!acc[c.detectiveName]) acc[c.detectiveName] = [];
    acc[c.detectiveName].push(c);
    return acc;
  }, {});

  const stats = {
    total: allCases.length,
    finalized: allCases.filter(c => c.status === 'Finalized').length,
    drafts: allCases.filter(c => c.status === 'Draft').length,
    recording: allCases.filter(c => c.status === 'Recording' || c.status === 'Processing').length,
    witnesses: allCases.filter(c => c.personType === 'Witness').length,
    suspects: allCases.filter(c => c.personType === 'Suspect').length,
    complainants: allCases.filter(c => c.personType === 'Complainant').length,
    video: allCases.filter(c => (c as any).hasVideo).length,
    audio: allCases.filter(c => !(c as any).hasVideo).length,
    languages: allCases.reduce((acc: any, c) => {
      acc[c.language] = (acc[c.language] || 0) + 1;
      return acc;
    }, {})
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
    } catch (err: any) {
      // If admin and not found, bootstrap it
      if (loginForm.email === 'sendeqbuild@gmail.com' && loginForm.password === 'Bi092714@' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-login-credentials')) {
        try {
          await createUserWithEmailAndPassword(auth, loginForm.email, loginForm.password);
          return;
        } catch (createErr) {
          console.error("Bootstrap error:", createErr);
        }
      }
      setError("Invalid email or password. Unauthorized access.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
    // Reset all session states
    setCurrentCaseDocId(null);
    setTranscription('');
    setCaseStatus('Initial');
    setSearchTerm('');
    setMode('Investigator');
    setSelectedCase(null);
  };

  // Auto-reset Investigator form when switching back to creation mode (currentCaseDocId becomes null)
  useEffect(() => {
    if (!currentCaseDocId && user) {
      setCaseInfo({
        caseId: `POL-${Math.floor(1000 + Math.random() * 9000)}`,
        detectiveName: user.displayName || user.email?.split('@')[0] || '',
        intervieweeName: '',
        personType: 'Witness',
        language: 'Amharic',
        recordingMode: 'Audio'
      });
      setTranscription('');
      setCaseStatus('Initial');
      setIsRecording(false);
      setIsProcessing(false);
      setDuration(0);
    }
  }, [currentCaseDocId, user]);

  useEffect(() => {
    const checkVerifyUrl = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const verifyId = urlParams.get('verify');
      if (verifyId) {
        setScanResult(verifyId);
        setIsVerifying(true);
        try {
          const q = query(
            collection(db, 'cases'), 
            where('caseId', '==', verifyId),
            where('status', '==', 'Finalized')
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            setVerifiedCase(querySnapshot.docs[0].data() as any);
          } else {
            // Document might not be finalized yet or doesn't exist
            setVerificationError(t.verifyFail);
          }
        } catch (err) {
          console.error("Verification error:", err);
          setVerificationError("Verification service offline.");
        } finally {
          setIsVerifying(false);
        }
      }
    };
    checkVerifyUrl();
  }, []);

   useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!caseInfo.caseId || !caseInfo.intervieweeName) {
      setError("እባክዎ መጀመሪያ የመዝገብ ቁጥር እና የባለሙን ስም ያስገቡ።");
      return;
    }

    if (caseStatus === 'Finalized') {
      setError("ይህ መዝገብ በመጠናቀቁ ድጋሚ መቅዳት አይቻልም። (Record is finalized)");
      return;
    }

    try {
      const constraints = { 
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: caseInfo.recordingMode === 'Video' ? { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } : false
      };

      const liveStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(liveStream);

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const options: MediaRecorderOptions = {};
      
      if (caseInfo.recordingMode === 'Video') {
        if (isIOS) {
          options.mimeType = 'video/mp4;codecs=avc1';
        } else {
          options.mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
            ? 'video/webm;codecs=vp9,opus' 
            : 'video/webm';
        }
      } else {
        if (isIOS) {
          options.mimeType = 'audio/mp4';
        } else {
          options.mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
        }
      }

      // Check if the selected mimeType is actually supported, fallback to empty options if not
      if (options.mimeType && !MediaRecorder.isTypeSupported(options.mimeType)) {
        delete options.mimeType;
      }

      const recorder = new MediaRecorder(liveStream, options);
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      let docId = currentCaseDocId;
      if (!docId) {
        const docRef = await addDoc(collection(db, 'cases'), {
          ...caseInfo,
          transcription: '',
          status: 'Recording',
          investigatorUid: user?.uid,
          investigatorEmail: user?.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          hasVideo: caseInfo.recordingMode === 'Video'
        });
        docId = docRef.id;
        setCurrentCaseDocId(docId);
      } else {
        await updateDoc(doc(db, 'cases', docId), {
          status: 'Recording',
          updatedAt: serverTimestamp(),
          hasVideo: caseInfo.recordingMode === 'Video'
        });
      }
      
      setCaseStatus('Recording');

      // Start WebRTC Broadcasting
      if (docId) {
        startBroadcasting(docId, liveStream);
      }

      // Initialize Speech Recognition (Keyless)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = caseInfo.language === 'Amharic' ? 'am-ET' : 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onend = () => {
          if (isRecording && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.log("Speech recognition safe-restart");
            }
          }
        };

        recognition.onresult = (event: any) => {
          let interimText = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              setTranscription(prev => (prev ? prev + ' ' : '') + event.results[i][0].transcript);
            } else {
              interimText += event.results[i][0].transcript;
            }
          }
        };

        recognition.onerror = (err: any) => {
          console.error("Speech Recognition Error:", err);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const recordedMimeType = recorder.mimeType || (caseInfo.recordingMode === 'Video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        setRecordedBlob({ blob, mimeType: recordedMimeType });
        const finalDuration = duration;
        setCaseStatus('Processing'); // Set immediately to show quick feedback
        
        // Save the recording
        if (docId) {
          // Automatic high-quality verbatim transcription happens inside saveRecording now
          await saveRecording(blob, docId, recordedMimeType, finalDuration);
        }
      };

      recorder.start();
      setIsRecording(true);
      setDuration(0);
      setError(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('ማይክሮፎኑን ወይም ካሜራውን ማግኘት አልተቻለም። እባክዎ ፈቃድ መስጠትዎን ያረጋግጡ።');
    }
  };

  const startBroadcasting = async (caseDocId: string, localStream: MediaStream) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, 'cases', caseDocId, 'signals'), {
            type: 'candidate',
            candidate: event.candidate.toJSON(),
            role: 'broadcaster',
            createdAt: serverTimestamp()
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await setDoc(doc(db, 'cases', caseDocId, 'signals', 'offer'), {
        type: offer.type,
        sdp: offer.sdp,
        createdAt: serverTimestamp()
      });

      onSnapshot(doc(db, 'cases', caseDocId, 'signals', 'answer'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (pc.signalingState !== 'stable') {
            pc.setRemoteDescription(new RTCSessionDescription(data as any));
          }
        }
      });
    } catch (err) {
      console.error("WebRTC Error:", err);
    }
  };

  const joinLiveStream = async (caseDocId: string) => {
    try {
      setRemoteStream(null);
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, 'cases', caseDocId, 'signals'), {
            type: 'candidate',
            candidate: event.candidate.toJSON(),
            role: 'watcher',
            createdAt: serverTimestamp()
          });
        }
      };

      onSnapshot(doc(db, 'cases', caseDocId, 'signals', 'offer'), async (snapshot) => {
        if (snapshot.exists()) {
          const offer = snapshot.data();
          if (pc.signalingState === 'stable') return;
          await pc.setRemoteDescription(new RTCSessionDescription(offer as any));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await setDoc(doc(db, 'cases', caseDocId, 'signals', 'answer'), {
            type: answer.type,
            sdp: answer.sdp,
            createdAt: serverTimestamp()
          });
        }
      });

      const q = query(collection(db, 'cases', caseDocId, 'signals'), where('role', '==', 'broadcaster'));
      onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        });
      });
    } catch (err) {
      console.error("Join WebRTC Error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      setIsRecording(false);
      setIsPaused(false);
      setStream(null);
      setCaseStatus('Processing');
      if (currentCaseDocId) {
        updateDoc(doc(db, 'cases', currentCaseDocId), { status: 'Processing' });
      }
    }
  };

  const base64ToBlob = (base64: string, mimeType: string) => {
    try {
      // Safety: Strip data URL prefix if present
      const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
      
      // Safety: Strip whitespace
      const finalBase64 = cleanBase64.trim();
      
      if (!finalBase64) {
        throw new Error("Empty base64 string");
      }

      const byteCharacters = atob(finalBase64);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      return new Blob(byteArrays, { type: mimeType });
    } catch (e) {
      console.error("base64ToBlob error:", e);
      return new Blob([], { type: mimeType });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // Create a canvas to resize the image
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Max dimensions 400x400 for logo
            const MAX_SIZE = 400;
            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Compress as JPEG with 0.8 quality
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = reject;
          img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await setDoc(doc(db, 'settings', 'global'), {
        policeLogo: base64,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email
      }, { merge: true });

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      setError(null);
    } catch (err) {
      console.error("Logo upload error:", err);
      setError("ሎጎውን መጫን አልተቻለም። (Failed to upload logo)");
    } finally {
      setIsProcessing(false);
    }
  };

  const pauseRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      
      if (currentCaseDocId) {
        try {
          await updateDoc(doc(db, 'cases', currentCaseDocId), {
            status: 'Recording', // We keep it as Recording but maybe add a sub-status
            isPaused: true,
            updatedAt: serverTimestamp()
          });
        } catch (err) { console.error(err); }
      }
    }
  };

  const resumeRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      if (currentCaseDocId) {
        try {
          await updateDoc(doc(db, 'cases', currentCaseDocId), {
            isPaused: false,
            updatedAt: serverTimestamp()
          });
        } catch (err) { console.error(err); }
      }
    }
  };

  const remoteStopCase = async (caseId: string) => {
    if (window.confirm("Are you sure you want to forcibly stop this recording?")) {
      try {
        await updateDoc(doc(db, 'cases', caseId), {
          status: 'Draft',
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Remote stop error:", err);
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    // If we are in Document mode, maybe we want to use the result as text if it's not a caseId
    if (caseInfo.recordingMode === 'Document') {
       setTranscription(prev => prev ? prev + "\n\n" + decodedText : decodedText);
       setShowScanner(false);
       return;
    }

    let caseId = decodedText;
    if (decodedText.startsWith('http')) {
      try {
        const url = new URL(decodedText);
        caseId = url.searchParams.get('verify') || decodedText;
      } catch (e) {
        caseId = decodedText;
      }
    }

    setScanResult(caseId);
    setShowScanner(false);
    setIsVerifying(true);
    setVerificationError(null);
    setVerifiedCase(null);

    try {
      const q = query(
        collection(db, 'cases'), 
        where('caseId', '==', caseId),
        where('status', '==', 'Finalized')
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setVerifiedCase(querySnapshot.docs[0].data() as any);
      } else {
        setVerificationError(t.verifyFail);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setVerificationError("Database access error during verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (showScanner) {
      const timer = setTimeout(() => {
        const elementId = "qr-reader";
        const element = document.getElementById(elementId);
        if (element && !scannerRef.current) {
          try {
            const html5QrCode = new Html5Qrcode(elementId);
            scannerRef.current = html5QrCode;
            
            const config = { 
              fps: 15, 
              qrbox: (viewWidth: number, viewHeight: number) => {
                const minDimension = Math.min(viewWidth, viewHeight);
                return { width: minDimension * 0.7, height: minDimension * 0.7 };
              },
              aspectRatio: 1.0
            };
            
            html5QrCode.start(
              { facingMode: cameraFacingMode },
              config,
              (decodedText) => {
                handleScanSuccess(decodedText);
              },
              (errorMessage) => {
                // Ignore noise
              }
            ).catch(err => {
              console.error("Scanner start failed:", err);
              setError("የካሜራ ስካነሩን ማስጀመር አልተቻለም። እባክዎ ካሜራውን መጠቀም እንደሚቻል ያረጋግጡ። (Scanner failed to start.)");
            });
          } catch (err) {
            console.error("Scanner setup failed:", err);
          }
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
               console.log("Scanner stopped");
               scannerRef.current = null;
            }).catch(err => console.warn("Scanner stop error:", err));
          } else {
            scannerRef.current = null;
          }
        }
      };
    }
  }, [showScanner, cameraFacingMode, handleScanSuccess]);

  const saveRecording = async (blob: Blob, docId: string, mimeType: string, dur: number) => {
    setIsProcessing(true);
    try {
      const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const result = reader.result?.toString() || '';
          // Robustly get the data part of the data URL
          const commaIndex = result.indexOf(',');
          if (commaIndex !== -1) {
            resolve(result.substring(commaIndex + 1));
          } else {
            // Some environments might just return the base64? Unlikely but safe.
            resolve(result);
          }
        };
        reader.onerror = () => reject(reader.error);
      });

      const recId = `REC-${Date.now()}`;
      const recFile: RecordingFile = {
        id: recId,
        name: `${caseInfo.recordingMode} - ${new Date().toLocaleTimeString()}`,
        data: base64data,
        mimeType: mimeType,
        duration: dur,
        transcription: transcription, // Save the real-time transcription captured during recording
        createdAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'cases', docId), {
        recordings: arrayUnion(recFile),
        transcription: transcription, // Update main transcription with whatever we have
        updatedAt: serverTimestamp()
      });

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      // Only call Gemini if we have a valid key (detected via failure or simple check)
      // If we already have real-time transcription, and API likely fails, we could skip it or handle gracefully
      try {
        await transcribeRecording(base64data, docId, mimeType, true);
      } catch (e) {
        console.warn("Auto-transcription skipped or failed, using real-time results.");
      }
    } catch (err) {
      console.error("Save recording error:", err);
      setError("ፋይሉን ማስቀመጥ አልተቻለም። (Failed to save recording)");
    } finally {
      setIsProcessing(false);
    }
  };

  const transcribeRecording = async (base64data: string, docId: string, mimeType: string, silent = false) => {
    if (!silent) setIsProcessing(true);
    setError(null);
    try {
      const result = await transcribeAndTranslateAudio(base64data, mimeType, caseInfo.language);
      const newTranscription = transcription ? transcription + "\n\n" + result : result;
      setTranscription(newTranscription);
      setCaseStatus('Draft');
      await updateDoc(doc(db, 'cases', docId), {
        transcription: newTranscription,
        status: 'Draft',
        updatedAt: serverTimestamp()
      });
      if (!silent) {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 5000);
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      
      if (!silent) {
        let userMessage = 'ድምፁን ወደ ፅሁፍ መቀየር አልተቻለም።';
        
        if (err?.message === 'MISSING_API_KEY') {
          userMessage = 'የ Gemini API Key አልተገኘም። እባክዎ በ Settings > Secrets ውስጥ GEMINI_API_KEY ያስገቡ። እስከዚያው ድረስ ያለ ቁልፍ የሚሰራውን የቀጥታ ቀረጻ (Real-time) ይጠቀሙ።';
        } else if (err?.message === 'INVALID_API_KEY') {
          userMessage = 'የ Gemini API Key በትክክል አልተዋቀረም (Invalid Key)። እባክዎ በ Settings > Secrets ውስጥ ያለውን ቁልፍ ያረጋግጡ።';
        } else if (JSON.stringify(err).includes('SAFETY') || err?.message?.includes('SAFETY')) {
          userMessage = 'የደህንነት ገደብ ተጥሷል (Safety restriction)። ድምፁ ተቀባይነት የሌለው ይዘት ሊኖረው ይችላል።';
        }
        
        setError(userMessage);
      }
    } finally {
      if (!silent) setIsProcessing(false);
    }
  };

  const finalizeAndPrint = async () => {
    if (!currentCaseDocId) return;
    
    // Always save current transcription before finalizing
    try {
      await updateDoc(doc(db, 'cases', currentCaseDocId), {
        transcription: transcription,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Save error:", err);
    }
    
    const confirm = window.confirm("ካተሙ በኋላ ፅሁፉን መቀየር አይቻልም። እርግጠኛ ነዎት? (Once printed, editing is locked. Continue?)");
    if (confirm) {
      try {
        await updateDoc(doc(db, 'cases', currentCaseDocId), {
          status: 'Finalized',
          updatedAt: serverTimestamp()
        });
        setCaseStatus('Finalized');
        setActivePrintId('case');
        setTimeout(() => window.print(), 500);
      } catch (err) {
        console.error("Finalization error:", err);
      }
    }
  };

   const selectCaseForEditing = (c: CaseRecord) => {
    setCaseInfo({
      caseId: c.caseId,
      detectiveName: c.detectiveName,
      intervieweeName: c.intervieweeName,
      personType: c.personType,
      language: c.language,
      recordingMode: (c as any).recordingMode || 'Audio'
    });
    setTranscription(c.transcription);
    setCaseStatus(c.status);
    setCurrentCaseDocId(c.id);
    setMode('Investigator');
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.email || !newStaff.fullName) return;
    
    try {
      if (editingStaffId) {
        await updateDoc(doc(db, 'users', editingStaffId), {
          fullName: newStaff.fullName,
          email: newStaff.email,
          phone: newStaff.phone,
          role: newStaff.role,
          userType: newStaff.userType,
          updatedAt: serverTimestamp()
        });
        setEditingStaffId(null);
        alert("የመዝገብ መረጃው በትክክል ተስተካክሏል! (Staff profile updated successfully)");
      } else {
        if (!newStaff.password) return;
        const { secondaryAuth } = await import('./lib/firebase');
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStaff.email, newStaff.password);
        
        await updateProfile(userCredential.user, { displayName: newStaff.fullName });
        
        const { password, ...staffData } = newStaff;
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          ...staffData,
          displayName: newStaff.fullName,
          createdAt: serverTimestamp()
        });
        alert("መርማሪው በትክክል ተመዝግቧል! (Officer registered successfully)");
      }
      setNewStaff({ fullName: '', email: '', phone: '', role: '', password: '', userType: 'Investigator' });
    } catch (err: any) {
      console.error("Error managing staff:", err);
      setError("Staff operation failed: " + err.message);
    }
  };

  const verifyUrl = isMounted ? `${window.location.origin}${window.location.pathname}?verify=${caseInfo.caseId || 'UNK'}` : '';

  if (loadingApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-police-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-ethiopic text-slate-800">
      {!user ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-police-blue rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg overflow-hidden border-4 border-white">
                 {systemSettings?.policeLogo ? (
                   <img src={systemSettings.policeLogo} alt="Police Logo" className="w-full h-full object-contain" />
                 ) : (
                   <Shield className="w-10 h-10 text-white" />
                 )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{t.title}</h1>
              <p className="text-slate-500 font-ethiopic">{t.subtitle}</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">{t.email}</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-police-blue transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input 
                    type="email" 
                    required
                    className="input-field pl-11" 
                    placeholder="officer@bgpolice.gov.et"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">{t.password}</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-police-blue transition-colors">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    className="input-field pl-11 pr-11" 
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-police-blue bg-white p-1 rounded-md"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full btn-primary py-4 text-base shadow-xl shadow-blue-900/20"
              >
                {t.signIn}
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-500 mb-2 font-ethiopic leading-relaxed">
                የተዘጋጀው በቤንሻንጉል ጉሙዝ ክልል ፖሊስ ኮሚሽን ቴክኖሎጂ ማስፋፊያና መረጃ ክፍል (by D.INS B.Y)
              </p>
              <p className="text-[10px] text-slate-400 font-sans uppercase tracking-[0.2em]">{t.authOnly}</p>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col no-print">
          {/* Header */}
          <header className="bg-police-blue text-white shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center relative gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { 
                    if (mode !== 'Investigator') setMode('Investigator'); 
                    else if (selectedCase) setSelectedCase(null); 
                    else if (currentCaseDocId) {
                      setCurrentCaseDocId(null);
                      setCaseStatus('Initial');
                    }
                  }}
                  className={`p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all ${(mode === 'Investigator' && !selectedCase && (caseStatus === 'Initial' || !currentCaseDocId)) ? 'hidden' : 'block'}`}
                  title={t.back}
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </button>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 border-2 border-police-blue/20 overflow-hidden">
              {systemSettings?.policeLogo ? (
                <img src={systemSettings.policeLogo} alt="Police Logo" className="w-full h-full object-contain" />
              ) : (
                <Shield className="w-6 h-6 md:w-8 md:h-8 text-police-blue" />
              )}
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-black text-white tracking-tighter leading-none">{t.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {isOffline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <p className="text-[9px] md:text-xs font-bold text-red-100 uppercase tracking-widest leading-none">Database Offline</p>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-[9px] md:text-xs font-bold text-blue-100 uppercase tracking-widest leading-none">Regional Node Active</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center bg-white/10 p-1.5 rounded-2xl border border-white/15 backdrop-blur-md">
            <button 
              onClick={() => setUiLanguage(uiLanguage === 'EN' ? 'AM' : 'EN')}
              className="flex items-center gap-2.5 px-4 py-2 hover:bg-white/10 rounded-xl transition-all font-bold text-white text-xs group"
            >
              <Languages className="w-4 h-4 text-blue-200 group-hover:text-white" />
              {uiLanguage === 'EN' ? 'አማርኛ' : 'English'}
            </button>
            <div className="w-px h-5 bg-white/10 mx-2" />
            <button 
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2.5 px-4 py-2 hover:bg-white/10 rounded-xl transition-all font-bold text-white text-xs group"
            >
              <Scan className="w-4 h-4 text-blue-200 group-hover:text-white" />
              {t.scanQR}
            </button>
            <div className="w-px h-5 bg-white/10 mx-2" />
            <button
              onClick={() => setMode('Investigator')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'Investigator' ? 'bg-white text-police-blue' : 'text-white hover:bg-white/10'}`}
            >
              {t.investigator}
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setMode('Supervisor')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'Supervisor' ? 'bg-white text-police-blue' : 'text-white hover:bg-white/10'}`}
                >
                  {t.supervisor}
                </button>
                <button
                  onClick={() => setMode('Admin')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'Admin' ? 'bg-white text-police-blue' : 'text-white hover:bg-white/10'}`}
                >
                  {t.admin}
                </button>
                <button
                  onClick={() => setMode('Reports')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'Reports' ? 'bg-white text-police-blue' : 'text-white hover:bg-white/10'}`}
                >
                  {t.reports}
                </button>
              </>
            )}
            <div className="w-px h-5 bg-white/10 mx-2" />
            <button
              onClick={handleLogout}
              className="p-2.5 hover:bg-red-500/20 text-red-200 hover:text-white rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-white bg-white/10 rounded-xl"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-[100%] left-0 right-0 bg-police-blue p-4 flex flex-col gap-2 z-50 md:hidden border-t border-white/10 shadow-2xl"
              >
                <button 
                  onClick={() => { setMode('Investigator'); setIsMenuOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${mode === 'Investigator' ? 'bg-white text-police-blue' : 'text-white hover:bg-white/10'}`}
                >
                  <FileText className="w-5 h-5" />
                  {t.investigator}
                </button>
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => { setMode('Supervisor'); setIsMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${mode === 'Supervisor' ? 'bg-white text-police-blue' : 'text-white hover:bg-white/10'}`}
                    >
                      <UserCheck className="w-5 h-5" />
                      {t.supervisor}
                    </button>
                    <button 
                      onClick={() => { setMode('Admin'); setIsMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${mode === 'Admin' ? 'bg-white text-police-blue' : 'text-white hover:bg-white/10'}`}
                    >
                      <Users className="w-5 h-5" />
                      {t.admin}
                    </button>
                    <button 
                      onClick={() => { setMode('Reports'); setIsMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${mode === 'Reports' ? 'bg-white text-police-blue' : 'text-white hover:bg-white/10'}`}
                    >
                      <BarChart4 className="w-5 h-5" />
                      {t.reports}
                    </button>
                  </>
                )}
                <div className="h-px bg-white/10 my-2" />
                <button 
                  onClick={() => { setUiLanguage(uiLanguage === 'EN' ? 'AM' : 'EN'); setIsMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-white hover:bg-white/10"
                >
                  <Languages className="w-5 h-5" />
                  {uiLanguage === 'EN' ? 'አማርኛ' : 'English'}
                </button>
                <button 
                  onClick={() => { setShowScanner(true); setIsMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-white hover:bg-white/10"
                >
                  <Scan className="w-5 h-5" />
                  {t.scanQR}
                </button>
                <button 
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 mt-4 md:mt-8 no-print flex-1 mb-10">
        {mode === 'Reports' ? (
          /* Reports Dashboard */
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                  <BarChart4 className="w-8 h-8 text-indigo-600" />
                  {t.reports}
                </h2>
                <p className="text-slate-500 font-medium text-sm md:text-base">Automatic system-wide statistical accumulation and analysis</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setMode('Investigator')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t.back}
                </button>
                <button 
                  onClick={() => {
                    setActivePrintId('stats');
                    setTimeout(() => window.print(), 300);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  <Printer className="w-5 h-5" />
                  {t.printReport}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { id: 'all', label: t.totalCases, val: stats.total, color: 'text-police-blue', bg: 'bg-blue-50', icon: FileText },
                { id: 'Witness', label: t.witnesses, val: stats.witnesses, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: User },
                { id: 'Suspect', label: t.suspects, val: stats.suspects, color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
                { id: 'Complainant', label: t.complainants, val: stats.complainants, color: 'text-amber-600', bg: 'bg-amber-50', icon: Shield },
              ].map((card) => (
                <div 
                  key={card.id} 
                  className="card p-6 flex items-center gap-5 cursor-pointer hover:ring-2 hover:ring-police-blue transition-all group"
                  onClick={() => {
                    setActiveReportFilter({ type: card.id === 'all' ? 'all' : 'personType', value: card.id });
                    setMode('Supervisor');
                  }}
                >
                  <div className={`w-14 h-14 ${card.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <card.icon className={`w-7 h-7 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
                    <p className="text-3xl font-black text-slate-800 leading-none mt-1">{card.val}</p>
                    <p className="text-[10px] text-police-blue font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">{t.viewDetails} →</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 card p-8">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-500" />
                  {t.caseStatusStats}
                </h3>
                <div className="space-y-6">
                  {[
                    { label: 'Finalized', val: stats.finalized, color: 'bg-green-500', bg: 'bg-green-100' },
                    { label: 'Drafts', val: stats.drafts, color: 'bg-blue-500', bg: 'bg-blue-100' },
                    { label: 'Active/Processing', val: stats.recording, color: 'bg-amber-500', bg: 'bg-amber-100' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-bold mb-2">
                         <span className="text-slate-600">{item.label}</span>
                         <span className="text-slate-900">{item.val} ({Math.round(item.val / (stats.total || 1) * 100)}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-50 overflow-hidden">
                        <div 
                          className={`h-full ${item.color}`} 
                          style={{ width: `${(item.val / (stats.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1 card p-8">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Video className="w-5 h-5 text-indigo-500" />
                  {t.recordingTypes}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                    <Video className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <p className="text-2xl font-black text-slate-800">{stats.video}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t.videoRecords}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                    <Mic className="w-8 h-8 text-amber-600 mx-auto mb-3" />
                    <p className="text-2xl font-black text-slate-800">{stats.audio}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t.audioRecords}</p>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-slate-100">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Regional Node Activity</h4>
                   <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-xs font-bold text-slate-600">All regional systems operational</p>
                   </div>
                </div>
              </div>

              <div className="lg:col-span-1 card p-8">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Languages className="w-5 h-5 text-indigo-500" />
                  {t.languageStats}
                </h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                   {Object.entries(stats.languages).length > 0 ? (
                     Object.entries(stats.languages).map(([lang, count]) => (
                       <div key={lang} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <span className="text-sm font-bold text-slate-700">{lang}</span>
                         <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-police-blue">{count as number}</span>
                            <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                               <div className="h-full bg-police-blue" style={{ width: `${((count as number) / stats.total) * 100}%` }} />
                            </div>
                         </div>
                       </div>
                     ))
                   ) : (
                     <p className="text-xs text-slate-400 text-center py-10 italic">No data yet</p>
                   )}
                </div>
              </div>
            </div>
          </div>
        ) : mode === 'Admin' ? (
          /* Admin Dashboard */
          <>
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <button 
                onClick={() => setMode('Investigator')}
                className="md:hidden flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-sm font-bold text-slate-600 shadow-sm border border-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
                {t.back}
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                {/* Branding Settings */}
                <div className="card p-6 bg-gradient-to-br from-police-blue to-blue-900 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Shield className="w-24 h-24" />
                  </div>
                  <h2 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                    <Settings className="w-5 h-5 text-blue-200" />
                    {t.brandingSettings}
                  </h2>
                  <div className="space-y-6 relative z-10">
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-400/50 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group relative">
                      {systemSettings?.policeLogo ? (
                        <img src={systemSettings.policeLogo} alt="Police Logo" className="w-24 h-24 object-contain mb-4 drop-shadow-xl" />
                      ) : (
                        <Shield className="w-16 h-16 text-blue-200/50 mb-4" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <p className="text-xs font-bold text-blue-100 uppercase tracking-widest">{t.uploadLogo}</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-xl">
                      <p className="text-[10px] uppercase font-black tracking-widest text-blue-200 mb-2">{t.watermark}</p>
                      <div className="flex items-center gap-3">
                         <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 w-1/4" />
                         </div>
                         <span className="text-[10px] font-black">25%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-police-blue" />
                    {t.addInvestigator}
                  </h2>
                  <form onSubmit={handleCreateStaff} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.fullName}</label>
                      <input 
                        type="text" 
                        required
                        className="input-field" 
                        value={newStaff.fullName}
                        onChange={(e) => setNewStaff({...newStaff, fullName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label>
                      <input 
                        type="email" 
                        required
                        className="input-field" 
                        value={newStaff.email}
                        onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.phone}</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={newStaff.phone}
                        onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.rank}</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={newStaff.role}
                        onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                        placeholder="e.g. Major Detective"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.accPassword}</label>
                      <input 
                        type="text" 
                        required
                        className="input-field" 
                        value={newStaff.password}
                        onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                        placeholder="Create temporary password"
                      />
                    </div>
                    <button type="submit" className="w-full btn-primary py-4 text-base">{t.register}</button>
                  </form>
                </div>
              </div>
              <div className="lg:col-span-8">
                <div className="card p-6">
                  <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-police-blue" />
                    {t.team}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                          <th className="px-4 py-2">{t.name}</th>
                          <th className="px-4 py-2">{t.email}</th>
                          <th className="px-4 py-2">{t.rank}</th>
                          <th className="px-4 py-2">{t.joined}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allStaff.map(s => (
                          <tr key={s.id} className="text-sm">
                            <td className="px-4 py-3 font-bold">{s.fullName}</td>
                            <td className="px-4 py-3 text-slate-500">{s.email}</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-police-blue rounded-md text-xs font-bold">{s.role || 'Officer'}</span></td>
                            <td className="px-4 py-3 text-xs text-slate-400">Recent</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : mode === 'Investigator' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            {/* Left Column: Form & Controls */}
            <div className={`lg:col-span-4 space-y-6 ${currentCaseDocId ? 'hidden lg:block' : 'block'}`}>
              <div className="card p-5 md:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-police-blue" />
                    {t.testimonyInfo}
                  </h3>
                  {currentCaseDocId && (
                    <button 
                      onClick={() => {
                        if (window.confirm("Are you sure you want to start a new entry? Current progress will be saved.")) {
                          setCurrentCaseDocId(null);
                        }
                      }}
                      className="text-[10px] font-bold text-police-blue uppercase tracking-widest hover:underline"
                    >
                      + New Entry
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{t.caseId}</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-police-blue/40 group-focus-within:text-police-blue transition-colors">
                        <Fingerprint className="w-4 h-4" />
                      </div>
                      <input 
                        type="text" 
                        className="input-field pl-11 bg-slate-50 cursor-not-allowed font-bold" 
                        value={caseInfo.caseId}
                        readOnly
                        disabled={isRecording || caseStatus === 'Finalized'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{t.subjectName}</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-police-blue/40 group-focus-within:text-police-blue transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <input 
                        type="text" 
                        className="input-field pl-11" 
                        value={caseInfo.intervieweeName}
                        onChange={(e) => setCaseInfo({...caseInfo, intervieweeName: e.target.value})}
                        disabled={isRecording || caseStatus === 'Finalized'}
                        placeholder="Enter name..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{t.role}</label>
                      <select 
                        className="input-field text-sm"
                        value={caseInfo.personType}
                        onChange={(e) => setCaseInfo({...caseInfo, personType: e.target.value as any})}
                        disabled={isRecording || caseStatus === 'Finalized'}
                      >
                        <option value="Witness">{t.witness}</option>
                        <option value="Suspect">{t.suspect}</option>
                        <option value="Complainant">{t.complainant}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{t.language}</label>
                      <select className="input-field text-sm" value={caseInfo.language} onChange={(e) => setCaseInfo({...caseInfo, language: e.target.value})} disabled={isRecording || caseStatus === 'Finalized'}>
                        <option value="Amharic">አማርኛ (Amharic)</option>
                        <option value="Gumuz">ጉሙዘኛ (Gumuz)</option>
                        <option value="Berta">በርተኛ (Berta)</option>
                        <option value="Shinasha">ሺናሸኛ (Shinasha)</option>
                        <option value="Arabic">ዓረብኛ (Arabic)</option>
                        <option value="Oromo">ኦሮሚኛ (Oromo)</option>
                        <option value="Tigrigna">ትግርኛ (Tigrigna)</option>
                        <option value="Somali">ሶማሊኛ (Somali)</option>
                        <option value="Afar">አፋርኛ (Afar)</option>
                        <option value="Agaw">አገውኛ (Agaw)</option>
                        <option value="English">English</option>
                        <option value="International">International/Other</option>
                      </select>
                      <div className="mt-4">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{t.recordingMode}</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => setCaseInfo({...caseInfo, recordingMode: 'Video'})}
                            disabled={isRecording || caseStatus === 'Finalized'}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border-2 transition-all ${caseInfo.recordingMode === 'Video' ? 'border-police-blue bg-blue-50 text-police-blue' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                          >
                            <Video className="w-4 h-4" /> {t.video}
                          </button>
                          <button 
                            onClick={() => setCaseInfo({...caseInfo, recordingMode: 'Audio'})}
                            disabled={isRecording || caseStatus === 'Finalized'}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border-2 transition-all ${caseInfo.recordingMode === 'Audio' ? 'border-police-blue bg-blue-50 text-police-blue' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                          >
                            <Mic className="w-4 h-4" /> {t.audio}
                          </button>
                          <button 
                            onClick={() => setCaseInfo({...caseInfo, recordingMode: 'Document'})}
                            disabled={isRecording || caseStatus === 'Finalized'}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border-2 transition-all ${caseInfo.recordingMode === 'Document' ? 'border-police-blue bg-blue-50 text-police-blue' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                          >
                            <FileSearch className="w-4 h-4" /> ሰነድ (Doc)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recorder Widget */}
              <div className={`card overflow-hidden ${isRecording ? 'ring-2 ring-red-500 shadow-xl shadow-red-100' : ''}`}>
                {isRecording && caseInfo.recordingMode === 'Video' && (
                  <div className="relative aspect-video bg-black overflow-hidden ring-1 ring-inset ring-white/10">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-white" />
                      Live Video Record
                    </div>
                  </div>
                )}
                {isRecording && caseInfo.recordingMode === 'Audio' && (
                  <div className="p-12 bg-slate-900 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse mb-4">
                      <Mic className="w-10 h-10 text-red-500" />
                    </div>
                    <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Audio Capture Active</span>
                  </div>
                )}
                {caseInfo.recordingMode === 'Document' && (
                   <div className="p-12 bg-slate-900 flex flex-col items-center justify-center min-h-[200px]">
                      <FileText className="w-16 h-16 text-blue-400 mb-4 opacity-50" />
                      <p className="text-xs text-slate-400 text-center font-ethiopic">የምርመራ ሰነዶችን ፎቶ በማንሳት ወይም ፋይል በመጫን ወደ ፅሁፍ ይቀይሩ። (Upload or snap document to convert to text)</p>
                   </div>
                )}
                <div className="p-6 bg-slate-900 text-white text-center border-t border-white/5">
                  <div className="text-4xl font-mono mb-4">{caseInfo.recordingMode === 'Document' ? 'DOCUMENT OCR' : formatTime(duration)}</div>
                  
                  {recordedUrl && !isRecording && (
                    <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
                        <Play className="w-3 h-3" />
                        Listen to Recording (ቀረጻውን ያዳምጡ)
                      </p>
                      <audio controls src={recordedUrl} className="w-full h-8 opacity-80" />
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    {/* Mic Selection (Always visible in Audio/Video modes) */}
                    {caseInfo.recordingMode !== 'Document' && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-1 text-left">
                        <label className="text-[9px] font-black text-blue-300 uppercase tracking-widest flex items-center gap-2">
                           <Mic className="w-3 h-3" />
                           {t.micSelection}
                        </label>
                        <select 
                          value={selectedMicId}
                          onChange={(e) => setSelectedMicId(e.target.value)}
                          className="bg-transparent border-none text-[11px] font-bold p-0 focus:ring-0 text-white cursor-pointer"
                        >
                          <option value="" className="text-slate-900">Default / System Auto</option>
                          {audioDevices.map(device => (
                            <option key={device.deviceId} value={device.deviceId} className="text-slate-900">
                              {device.label || `Microphone ${device.deviceId.substring(0, 5)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isRecording ? (
                      caseInfo.recordingMode === 'Document' ? (
                        <div className="grid grid-cols-1 gap-3">
                           <div className="relative">
                             <input 
                               type="file" 
                               accept="image/*"
                               disabled={isProcessing || caseStatus === 'Finalized'}
                               onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 setIsProcessing(true);
                                 try {
                                   const base64 = await new Promise<string>((resolve) => {
                                      const reader = new FileReader();
                                      reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
                                      reader.readAsDataURL(file);
                                   });
                                   const { processImageToText } = await import('./lib/gemini');
                                   const result = await processImageToText(base64, file.type);
                                   setTranscription(prev => prev ? prev + "\n\n" + result : result);
                                   setShowSuccessToast(true);
                                   setTimeout(() => setShowSuccessToast(false), 5000);
                                 } catch (err: any) {
                                   console.error(err);
                                   let userMessage = "ሰነዱን ማንበብ አልተቻለም። (Failed to process document)";
                                   if (err?.message === 'INVALID_API_KEY') {
                                     userMessage = 'የ Gemini API Key በትክክል አልተዋቀረም (Invalid API Key). OCR መጠቀም አይቻልም።';
                                   }
                                   setError(userMessage);
                                 } finally {
                                   setIsProcessing(false);
                                 }
                               }}
                               className="absolute inset-0 opacity-0 cursor-pointer z-10"
                             />
                             <button className="btn-primary w-full py-4 text-lg bg-blue-600 hover:bg-blue-700 shadow-blue-900/20">
                               <Upload className="w-6 h-6" />
                               {t.scanFile}
                             </button>
                           </div>
                           <p className="text-[10px] text-slate-500 uppercase tracking-widest">OR</p>
                           <button 
                             onClick={() => setShowScanner(true)}
                             className="btn-primary w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20"
                           >
                             <Camera className="w-6 h-6" />
                             {t.scanCamera}
                           </button>
                        </div>
                      ) : (
                        <button 
                          onClick={startRecording} 
                          disabled={isProcessing || caseStatus === 'Finalized'} 
                          className="btn-primary w-full py-4 text-lg bg-green-600 hover:bg-green-700 shadow-green-900/20"
                        >
                          <Mic className="w-6 h-6" />
                          {t.startRecording}
                        </button>
                      )
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={isPaused ? resumeRecording : pauseRecording} 
                            className={`btn-primary py-4 text-lg ${isPaused ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-900/20' : 'bg-slate-700 hover:bg-slate-800 shadow-slate-900/20'}`}
                          >
                             {isPaused ? <Zap className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                             {isPaused ? t.resumeRecording : t.pauseRecording}
                          </button>
                          <button 
                            onClick={stopRecording} 
                            className="btn-primary py-4 text-lg bg-red-600 hover:bg-red-700 shadow-red-900/20"
                          >
                            <Square className="w-6 h-6" />
                            {t.stopRecording}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mt-6 tracking-widest text-center">
                    {isRecording ? (
                      <span className="flex items-center justify-center gap-2 text-green-600">
                        <Zap className="w-3 h-3 animate-pulse" />
                        Keyless Transcription Active (ያለ ቁልፍ እየተጻፈ ነው)
                      </span>
                    ) : 'System Ready'}
                  </p>
                </div>
              </div>

              {/* Investigator's My Case Archives */}
              <div className="card overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <History className="w-4 h-4" />
                      {t.myArchives} (Folders)
                    </h3>
                  </div>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-police-blue transition-colors" />
                    <input 
                      type="text" 
                      placeholder={t.search} 
                      className="w-full bg-white border-2 border-slate-100 rounded-xl py-2 pl-9 pr-4 text-xs focus:border-police-blue focus:ring-0 transition-all placeholder:text-slate-300 font-ethiopic"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="p-0 overflow-y-auto max-h-[600px] bg-white divide-y divide-slate-50">
                  {['Recording', 'Draft', 'Finalized'].map(folderStatus => {
                    const statusCases = filteredCases.filter(c => c.investigatorEmail === user?.email && c.status === folderStatus);
                    if (statusCases.length === 0) return null;
                    
                    return (
                      <div key={folderStatus} className="bg-white">
                        <div className="bg-slate-50/80 px-4 py-2 flex items-center gap-2 border-y border-slate-100 first:border-t-0">
                          <Archive className={`w-3.5 h-3.5 ${
                            folderStatus === 'Finalized' ? 'text-green-500' : 
                            folderStatus === 'Recording' ? 'text-red-500' : 'text-amber-500'
                          }`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {folderStatus} Folders ({statusCases.length})
                          </span>
                        </div>
                        <div className="p-2 space-y-1">
                          {statusCases.map(c => (
                            <div 
                              key={c.id}
                              onClick={() => selectCaseForEditing(c)}
                              className={`group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border-2 ${
                                currentCaseDocId === c.id ? 'border-police-blue bg-blue-50/50' : 'border-transparent hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                folderStatus === 'Finalized' ? 'bg-green-100 text-green-600' : 
                                folderStatus === 'Recording' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-amber-100 text-amber-600'
                              }`}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-slate-800 truncate leading-none mb-1">{c.intervieweeName || "Pending Subject"}</p>
                                <div className="flex justify-between items-center">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{c.caseId}</span>
                                  <span className="text-[7px] text-slate-400 font-mono tracking-tighter">
                                    {c.updatedAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {filteredCases.filter(c => c.investigatorEmail === user?.email).length === 0 && (
                    <div className="text-center py-20 opacity-30">
                      <FileSearch className="w-12 h-12 mx-auto mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest">{t.noHistory}</p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Right Column: Transcription/Translation */}
            <div className={`lg:col-span-8 space-y-6 ${currentCaseDocId ? 'block' : 'hidden lg:block'}`}>
              <div className="card flex flex-col h-[500px] md:h-[750px] shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${caseStatus === 'Recording' ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">
                      {currentCaseDocId ? `${t.editActive}: ${caseInfo.caseId}` : t.statementReview}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    {currentCaseDocId && caseStatus === 'Finalized' && (
                      <button 
                        onClick={() => {
                          if (window.confirm("Unlock this record for further editing?")) {
                            setCaseStatus('Draft');
                          }
                        }}
                        className="btn-secondary py-2 px-4 text-[10px] uppercase border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        <Lock className="w-4 h-4" />
                        Unlock to Edit
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setCurrentCaseDocId(null);
                        setTranscription('');
                        setCaseStatus('Initial');
                        setCaseInfo({
                          caseId: generateCaseId(),
                          detectiveName: user?.displayName || user?.email || '',
                          intervieweeName: '',
                          personType: 'Witness',
                          language: 'Amharic',
                          recordingMode: 'Audio'
                        });
                      }}
                      disabled={isRecording}
                      className="btn-secondary py-2 px-4 text-[10px] uppercase"
                    >
                      <PlusCircle className="w-4 h-4" />
                      {t.newInvestigation}
                    </button>
                    {recordedBlob && caseStatus !== 'Finalized' && (
                      <button 
                        onClick={async () => {
                          if (!currentCaseDocId) return;
                          // For now using the existing transcribeRecording
                          const reader = new FileReader();
                          reader.readAsDataURL(recordedBlob.blob);
                          reader.onloadend = async () => {
                            const base64 = reader.result?.toString().split(',')[1];
                            if (base64) await transcribeRecording(base64, currentCaseDocId, recordedBlob.mimeType);
                          };
                          setRecordedBlob(null);
                        }}
                        disabled={isProcessing || isRecording}
                        className="btn-primary py-2 px-6 text-[11px] uppercase bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20"
                      >
                        <Mic className="w-4 h-4" />
                        {t.transcribe}
                      </button>
                    )}
                    {currentCaseDocId && caseStatus !== 'Finalized' && (
                      <button 
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'cases', currentCaseDocId), {
                              transcription: transcription,
                              updatedAt: serverTimestamp()
                            });
                            setShowSuccessToast(true);
                            setTimeout(() => setShowSuccessToast(false), 3000);
                          } catch (err) {
                            console.error("Draft save error:", err);
                          }
                        }}
                        className="btn-secondary py-2 px-4 text-[10px] uppercase bg-blue-50 text-blue-700 border-blue-200"
                      >
                        <CloudCheck className="w-4 h-4" />
                        {t.saveDraft}
                      </button>
                    )}
                    {currentCaseDocId && (
                      <button 
                        onClick={() => {
                          setActivePrintId('case');
                          setTimeout(() => window.print(), 100);
                        }}
                        className="btn-secondary py-2 px-4 text-[10px] uppercase bg-slate-100 text-slate-700 border-slate-200"
                        title="Print Transcript Only"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                    )}
                    <button 
                      onClick={finalizeAndPrint} 
                      disabled={!transcription || caseStatus === 'Recording'} 
                      className="btn-primary py-2 px-4 shadow-none text-[10px] uppercase transition-all active:scale-95"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {t.finalize}
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 p-8 relative overflow-hidden bg-white">
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                        <div className="relative mb-6">
                          <Loader2 className="w-16 h-16 text-police-blue animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-t-2 border-police-blue animate-ping" />
                          </div>
                        </div>
                        <span className="font-black text-police-blue uppercase tracking-[0.2em] text-sm animate-pulse">{t.transcribing}</span>
                        <div className="mt-8 flex gap-1 items-center">
                           {[...Array(3)].map((_, i) => (
                             <motion.div 
                               key={i}
                               animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                               transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                               className="w-1.5 h-1.5 rounded-full bg-police-blue"
                             />
                           ))}
                        </div>
                        <p className="text-slate-400 text-[10px] mt-4 font-ethiopic uppercase tracking-widest">{t.processingSub}</p>
                      </motion.div>
                    )}
                    {showSuccessToast && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -20 }} 
                        className="absolute top-8 left-1/2 -translate-x-1/2 z-20 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-green-400"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-bold text-xs uppercase tracking-widest">{t.transcriptionSuccess}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <textarea 
                    ref={textareaRef}
                    id="transcription-textarea"
                    className="w-full h-full resize-none border-none focus:ring-0 text-xl md:text-2xl leading-relaxed font-ethiopic text-slate-800 placeholder:text-slate-200 scroll-smooth"
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    readOnly={caseStatus === 'Finalized'}
                    placeholder={t.placeholder}
                  />
                  
                  {/* Spatial Navigation Helpers (Up, Down, Left, Right feel) */}
                  <div className="absolute bottom-6 right-6 flex flex-col gap-2 no-print">
                      <button 
                        onClick={() => {
                          const el = document.getElementById('transcription-textarea');
                          if (el) el.scrollTop = 0;
                        }}
                        className="w-12 h-12 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-50 transition-all text-slate-400 hover:text-police-blue group"
                        title="Scroll to Top"
                      >
                        <ChevronLeft className="w-6 h-6 rotate-90" />
                        <span className="absolute right-full mr-2 px-2 py-1 bg-slate-800 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">ወደ ላይ</span>
                      </button>
                      <button 
                        onClick={() => {
                          const el = document.getElementById('transcription-textarea');
                          if (el) el.scrollTop = el.scrollHeight;
                        }}
                        className="w-12 h-12 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-50 transition-all text-slate-400 hover:text-police-blue group"
                        title="Scroll to Bottom"
                      >
                        <ChevronLeft className="w-6 h-6 -rotate-90" />
                        <span className="absolute right-full mr-2 px-2 py-1 bg-slate-800 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">ወደ ታች</span>
                      </button>
                  </div>
                  {caseStatus === 'Finalized' && (
                    <div className="absolute top-4 right-4 bg-amber-50 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
                      {t.locked}
                    </div>
                  )}
                </div>
                
                {/* Saved Recordings List */}
                {(() => {
                  const currentCase = allCases.find(c => c.id === currentCaseDocId);
                  if (currentCase?.recordings && currentCase.recordings.length > 0) {
                    return (
                      <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Archive className="w-4 h-4" />
                           {t.savedRecordings}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {currentCase.recordings.map((rec) => (
                            <div key={rec.id} className="p-4 bg-white rounded-2xl border-2 border-slate-100/80 shadow-sm flex flex-col gap-3 group transition-all hover:border-police-blue">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    {rec.mimeType.includes('video') ? <Video className="w-4 h-4 text-blue-600" /> : <Mic className="w-4 h-4 text-blue-600" />}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-800 truncate max-w-[120px] leading-tight">{rec.name}</p>
                                    <p className="text-[9px] text-slate-400 font-mono tracking-tight">{formatTime(rec.duration)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => playHistoricalRecording(rec)}
                                    className={`p-1.5 rounded-md transition-all ${previewAudioId === rec.id ? 'bg-police-blue text-white' : 'hover:bg-blue-50 text-blue-600'}`}
                                    title="Listen Inline"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const blob = base64ToBlob(rec.data, rec.mimeType);
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `${rec.name}.${rec.mimeType.includes('video') ? 'webm' : 'webm'}`;
                                      a.click();
                                      setTimeout(() => URL.revokeObjectURL(url), 100);
                                    }}
                                    className="p-1.5 hover:bg-police-blue hover:text-white text-slate-300 rounded-md transition-all"
                                    title="Download File"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              
                              {previewAudioId === rec.id && previewAudioUrl && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                   <audio controls src={previewAudioUrl} autoPlay className="w-full h-8" />
                                </div>
                              )}

                              <div className="h-px bg-slate-50 w-full" />
                              <button 
                                onClick={() => transcribeRecording(rec.data, currentCase.id, rec.mimeType)}
                                disabled={isProcessing}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-police-blue hover:text-white text-police-blue rounded-xl text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                              >
                                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                {t.convertToText}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        ) : (
          /* Supervisor Dashboard */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{t.oversight}</h2>
                  <p className="text-slate-500">{t.oversightSub}</p>
                </div>
                {activeReportFilter && (
                  <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest leading-none">
                      Filter: {activeReportFilter.value}
                    </span>
                    <button 
                      onClick={() => setActiveReportFilter(null)}
                      className="p-1 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <X className="w-3 h-3 text-indigo-400" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={() => setSupervisorGroupByDetective(!supervisorGroupByDetective)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all border-2 text-xs uppercase tracking-widest ${
                    supervisorGroupByDetective ? 'bg-police-blue text-white border-police-blue' : 'bg-white text-slate-600 border-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {t.groupByDetective}
                </button>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder={t.search} 
                    className="input-field pl-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="card h-[75vh] overflow-y-auto overflow-x-auto shadow-xl bg-white p-2">
                <div className="min-w-[800px]"> {/* Ensure horizontal scroll on small screens */}
                {supervisorGroupByDetective ? (
                  /* Grouped View */
                  <div className="space-y-6 p-4">
                    {(Object.entries(casesGroupedByDetective) as [string, CaseRecord[]][]).map(([detective, cases]) => (
                      <details key={detective} className="group overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50" open>
                         <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-100/50 transition-all list-none outline-none">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-2xl bg-police-blue text-white flex items-center justify-center font-bold shadow-lg shadow-blue-900/10 transform transition-transform group-open:rotate-3">
                                 {detective.charAt(0)}
                               </div>
                               <div>
                                 <h3 className="font-black text-slate-800 text-lg">{detective}</h3>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mt-1">{cases.length} Investigations assigned</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="flex -space-x-2 mr-4">
                                  {cases.slice(0, 3).map((c, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-400 uppercase">
                                       {c.intervieweeName.charAt(0)}
                                    </div>
                                  ))}
                                  {cases.length > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                                       +{cases.length - 3}
                                    </div>
                                  )}
                               </div>
                               <ChevronRight className="w-5 h-5 text-slate-300 transition-transform group-open:rotate-90" />
                            </div>
                         </summary>
                         <div className="p-4 pt-0 border-t border-slate-100 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                               {cases.map(c => (
                                 <div 
                                   key={c.id} 
                                   onClick={() => setSelectedCase(c)}
                                   className="p-4 rounded-xl border border-slate-100 hover:border-police-blue hover:shadow-md transition-all cursor-pointer group/item relative overflow-hidden"
                                 >
                                    <div className="flex justify-between items-start mb-3">
                                       <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                         c.status === 'Recording' ? 'bg-red-100 text-red-600' : 
                                         c.status === 'Finalized' ? 'bg-green-100 text-green-600' : 
                                         'bg-blue-100 text-blue-600'
                                       }`}>
                                         {c.status}
                                       </span>
                                       <span className="text-[8px] font-mono text-slate-400">{c.caseId}</span>
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-800 truncate mb-1">{c.intervieweeName}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.personType} • {c.language}</p>
                                    {c.status === 'Recording' && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Live Now</span>
                                      </div>
                                    )}
                                    <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover/item:opacity-100 transition-opacity translate-y-2 group-hover/item:translate-y-0 text-police-blue">
                                       <Eye className="w-4 h-4" />
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </details>
                    ))}
                    {Object.keys(casesGroupedByDetective).length === 0 && (
                      <div className="py-20 text-center opacity-40">
                         <Search className="w-12 h-12 mx-auto mb-4" />
                         <p className="font-bold uppercase tracking-widest">No matching records found</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standard List View */
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 py-4">{t.status}</th>
                        <th className="px-6 py-4">{t.caseDetails}</th>
                        <th className="px-6 py-4">{t.officer}</th>
                        <th className="px-6 py-4">{t.sync}</th>
                        <th className="px-6 py-4 text-right">{t.monitoring}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredCases.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedCase(c)}>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border flex items-center gap-1.5 ${
                                c.status === 'Recording' ? 'bg-red-50 text-red-600 border-red-100' :
                                c.status === 'Finalized' ? 'bg-green-50 text-green-600 border-green-100' :
                                'bg-blue-50 text-blue-600 border-blue-100'
                              }`}>
                                {c.status === 'Recording' && <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />}
                                {c.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-bold text-slate-800">{c.caseId}</div>
                            <div className="text-xs text-slate-500">{c.intervieweeName} ({c.personType})</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                 {c.detectiveName.charAt(0)}
                               </div>
                               <div>
                                 <div className="text-sm font-bold text-slate-700">{c.detectiveName}</div>
                                 <div className="text-[10px] text-slate-400">{c.investigatorEmail}</div>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-xs text-slate-500 flex flex-col gap-1">
                              <span className="flex items-center gap-1"><CloudCheck className="w-3 h-3 text-green-500" /> Latency: Low</span>
                              <span className="text-[10px] text-slate-400">{c.updatedAt?.toDate?.()?.toLocaleString() || 'Syncing...'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <div className="flex justify-end items-center gap-2">
                               {c.status === 'Recording' && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); remoteStopCase(c.id); }}
                                   className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                   title={t.remoteStop}
                                 >
                                   <Square className="w-4 h-4" />
                                 </button>
                               )}
                               <button className="p-2 text-slate-300 group-hover:text-police-blue transition-colors">
                                 <Eye className="w-5 h-5" />
                               </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                      {filteredCases.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-2 text-slate-300">
                              <History className="w-12 h-12 mb-2" />
                              <p className="text-lg font-bold">{t.noFeeds}</p>
                              <p className="text-sm">{t.feedSub}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
                </div>
              </div>
            </div>

            </div>
          )}
        </main>
      </div>
    )}

    {/* Global Modals OUTSIDE auth check */}
    {/* Supervisor Monitor / Case Details Modal */}
    <AnimatePresence>
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-0 md:p-4" onClick={() => setSelectedCase(null)}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full md:max-w-5xl h-full md:h-[85vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
            >
              <div className="p-5 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                     <h3 className="text-xl md:text-2xl font-bold text-slate-900">{selectedCase.caseId}</h3>
                     {selectedCase.status === 'Recording' && (
                       <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded-md uppercase animate-pulse">{t.liveFeed}</span>
                     )}
                  </div>
                  <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest truncate max-w-[200px] md:max-w-none">
                    {selectedCase.intervieweeName} • {t.statementReview}
                  </p>
                </div>
                <button onClick={() => { setSelectedCase(null); setRemoteStream(null); if (pcRef.current) { pcRef.current.close(); pcRef.current = null; } }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 p-6 md:p-10 bg-white overflow-y-auto font-ethiopic">
                <div className="max-w-3xl mx-auto border-l-4 border-police-blue/20 pl-4 md:pl-8">
                  {selectedCase.status === 'Recording' && user && (
                    <div className="mb-6 flex flex-col gap-4">
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                          <span className="text-xs font-black text-red-600 uppercase tracking-widest italic font-sans">{t.activeSession}</span>
                        </div>
                        <button 
                          onClick={() => remoteStopCase(selectedCase.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-900/20 font-sans"
                        >
                          {t.remoteStop}
                        </button>
                      </div>
                      
                        <div className="mb-8 p-6 bg-slate-900 rounded-3xl relative overflow-hidden group shadow-2xl">
                          {remoteStream ? (
                            <div className="relative group/video">
                              <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full aspect-video object-cover rounded-2xl bg-black shadow-2xl"
                              />
                              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-30 opacity-100 transition-opacity">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
                                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest font-sans">Live Monitoring</span>
                                </div>
                                <div className="flex items-center gap-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
                                  <Mic className="w-3 h-3 text-white/60" />
                                  <div className="flex gap-0.5 items-end h-3">
                                    {[1,2,3,4,5].map(i => (
                                      <motion.div 
                                        key={i}
                                        animate={{ height: [4, 12, 4] }}
                                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                        className="w-0.5 bg-green-400 rounded-full"
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                              <div className="relative z-20 flex flex-col items-center justify-center py-10">
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse mb-4">
                                  <Video className="w-8 h-8 text-red-500" />
                                </div>
                                <button 
                                  onClick={() => joinLiveStream(selectedCase.id)}
                                  className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-900/20 font-sans"
                                >
                                  {t.monitorNow}
                                </button>
                                <p className="text-white font-black uppercase tracking-[0.2em] text-xs font-sans mt-4">{t.liveFeed}</p>
                                <p className="text-slate-400 text-[10px] mt-1 font-bold font-sans">{t.stationID}</p>
                              </div>
                            </>
                          )}
                          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse font-sans">
                            <div className="w-2 h-2 rounded-full bg-white" />
                            {t.liveStream}
                          </div>
                        </div>
                    </div>
                  )}
                  <p className="text-lg md:text-2xl leading-[1.8] text-slate-800 whitespace-pre-line bg-slate-50 p-6 rounded-2xl border border-slate-100 italic">
                    {selectedCase.transcription || t.establish}
                  </p>
                </div>
              </div>

              <div className="p-5 md:p-6 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="grid grid-cols-2 md:flex gap-4 md:gap-8 text-[10px] md:text-xs font-bold text-slate-400 w-full md:w-auto">
                   <div className="flex flex-col">
                     <span className="font-sans uppercase tracking-widest text-[8px]">{t.officer}</span>
                     <span className="text-white truncate">{selectedCase.detectiveName}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="font-sans uppercase tracking-widest text-[8px]">{t.language}</span>
                     <span className="text-white">{selectedCase.language}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="font-sans uppercase tracking-widest text-[8px]">{t.status}</span>
                     <span className={selectedCase.status === 'Recording' ? 'text-red-400' : 'text-green-400'}>{selectedCase.status}</span>
                   </div>
                </div>
                {user && (
                  <button 
                    onClick={() => {
                      setActivePrintId('case');
                      setTimeout(() => window.print(), 300);
                    }}
                    className="w-full md:w-auto btn-primary bg-white text-police-blue hover:bg-slate-100 flex items-center justify-center gap-2 py-3 md:py-2 font-sans tracking-widest text-[10px] font-black"
                  >
                    <Download className="w-4 h-4" />
                    {t.captureArchive}
                  </button>
                )}
              </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* QR Scanner Modal */}
    <AnimatePresence>
      {showScanner && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                 <Scan className="w-6 h-6 text-police-blue" />
                 {t.scanQR}
               </h2>
               <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                 <X className="w-5 h-5 text-slate-500" />
               </button>
            </div>
            <div className="p-8">
               <p className="text-center text-sm font-bold text-slate-500 mb-6 uppercase tracking-widest">{t.scanningTitle}</p>
               <div className="flex justify-center mb-6">
                  <button 
                    onClick={() => setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                    className="px-6 py-2 bg-police-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    <RefreshCw className={`w-4 h-4 ${cameraFacingMode === 'user' ? 'rotate-180' : ''} transition-transform`} />
                    {t.switchCamera} ({cameraFacingMode === 'user' ? 'Front' : 'Back'})
                  </button>
               </div>
               <div 
                 id="qr-reader" 
                 className="rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-50 min-h-[300px] relative"
               >
                 {caseInfo.recordingMode === 'Document' && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                       <button 
                         onClick={async () => {
                            if (scannerRef.current && scannerRef.current.isScanning) {
                               try {
                                  // html5-qrcode doesn't have a direct "snap" but we can get the video element
                                  const video = document.querySelector('#qr-reader video') as HTMLVideoElement;
                                  if (video) {
                                     const canvas = document.createElement('canvas');
                                     canvas.width = video.videoWidth;
                                     canvas.height = video.videoHeight;
                                     const ctx = canvas.getContext('2d');
                                     ctx?.drawImage(video, 0, 0);
                                     const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
                                     
                                     setShowScanner(false);
                                     setIsProcessing(true);
                                     const { processImageToText } = await import('./lib/gemini');
                                     const result = await processImageToText(base64, 'image/jpeg');
                                     setTranscription(prev => prev ? prev + "\n\n" + result : result);
                                     setShowSuccessToast(true);
                                     setTimeout(() => setShowSuccessToast(false), 5000);
                                  }
                               } catch (err) {
                                  console.error(err);
                                  setError("ፎቶውን ማንበብ አልተቻለም። (Failed to capture/process image)");
                               } finally {
                                  setIsProcessing(false);
                               }
                            }
                         }}
                         className="bg-red-500 hover:bg-red-600 text-white w-16 h-16 rounded-full border-4 border-white shadow-xl flex items-center justify-center transition-transform active:scale-90"
                       >
                         <div className="w-8 h-8 rounded-full border-2 border-white/50" />
                       </button>
                    </div>
                 )}
               </div>
               
               <div className="mt-8 grid grid-cols-1 gap-3">
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        try {
                          let scanner = scannerRef.current;
                          let shouldDispose = false;
                          
                          if (!scanner) {
                            scanner = new Html5Qrcode("qr-reader");
                            shouldDispose = true;
                          }
                          
                          const decodedText = await scanner.scanFile(file, true);
                          handleScanSuccess(decodedText);
                          
                          if (shouldDispose) {
                            // No need to keep it if it was just for file
                          }
                        } catch (err) {
                           console.error(err);
                           setError("QR ኮድ በምስሉ ውስጥ አልተገኘም። (Could not find QR code in image.)");
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <button className="w-full py-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center gap-3 text-xs font-black text-slate-600 uppercase tracking-widest group-hover:bg-slate-100 transition-all">
                       <FileBarChart className="w-5 h-5 text-police-blue" />
                       {(t as any).scanFile}
                    </button>
                  </div>
               </div>

               <div className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 py-3 rounded-xl border border-dashed border-slate-200 uppercase tracking-widest">
                  {t.establish}
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Verification Result Modal */}
    <AnimatePresence>
      {(isVerifying || scanResult) && !showScanner && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4" onClick={() => { setScanResult(null); setVerifiedCase(null); }}>
           <motion.div 
             initial={{ y: 50, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             exit={{ y: 50, opacity: 0 }}
             onClick={(e) => e.stopPropagation()}
             className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl relative"
           >
              {isVerifying ? (
                <div className="p-20 text-center uppercase">
                  <div className="w-12 h-12 border-4 border-police-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="font-black text-slate-400 tracking-widest">{t.processingSub}</p>
                </div>
              ) : (
                <div className="p-10">
                  {verifiedCase ? (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <ShieldCheck className="w-10 h-10 text-green-600" />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 mb-1">{t.verifyScannedRecord}</h2>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">{t.dataMatches}</p>
                      
                      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-left space-y-4 mb-8 max-h-[400px] overflow-y-auto">
                         <div className="flex justify-between items-start">
                           <div>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.caseId}</span>
                             <p className="font-black text-xl text-police-blue">{verifiedCase.caseId}</p>
                           </div>
                           <div className="text-right">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.subjectName}</span>
                             <p className="font-bold text-slate-800">{verifiedCase.intervieweeName}</p>
                           </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                           <div>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.officer}</span>
                             <p className="text-xs font-bold text-slate-600">{verifiedCase.detectiveName}</p>
                           </div>
                           <div>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.status}</span>
                             <p className="text-xs font-bold text-green-600 uppercase">{verifiedCase.status}</p>
                           </div>
                         </div>
                         <div className="pt-4 border-t border-slate-200">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">{t.snapshot}</span>
                           <p className="text-sm font-ethiopic text-slate-600 mt-2 italic leading-relaxed">{verifiedCase.transcription}</p>
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => { setScanResult(null); setVerifiedCase(null); }}
                          className="btn-secondary py-4 rounded-2xl font-sans font-bold uppercase tracking-widest text-xs"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => { 
                            setScanResult(null); 
                            setSelectedCase(verifiedCase); 
                            alert("የመዝገቡ ትክክለኛነት ተረጋግጧል! (Record validity confirmed)");
                          }}
                          className="btn-primary py-4 rounded-2xl shadow-xl shadow-blue-200 font-sans tracking-widest font-black uppercase text-xs"
                        >
                          {t.confirmVerification}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                         <AlertCircle className="w-14 h-14 text-red-600" />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 mb-2">{t.verifyFail}</h2>
                      <p className="text-slate-500 mb-10 px-6 font-bold uppercase tracking-widest text-xs font-sans">{verificationError || "The scanned QR code does not match any official record in the regional investigation server."}</p>
                      <button 
                        onClick={() => setScanResult(null)}
                        className="btn-secondary w-full py-5 rounded-2xl border-2 font-sans font-bold uppercase tracking-widest text-xs"
                      >
                        Close Verification Window
                      </button>
                    </div>
                  )}
                </div>
              )}
           </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Hidden Printable Official Document (Case) */}
      <div id="printable-report" className={`${activePrintId === 'case' ? 'print:block' : 'print:hidden'} hidden font-serif text-black p-0 leading-relaxed overflow-visible`}>
        <div className="w-[190mm] mx-auto min-h-screen relative p-[15mm] overflow-hidden">
          {/* Watermark Logo (Centered Globally on Page) */}
          {systemSettings?.policeLogo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] z-0 h-full w-full">
               <img src={systemSettings.policeLogo} alt="Watermark" className="w-[150mm] h-auto object-contain transform -rotate-12" />
            </div>
          )}
          
          {/* Header */}
          <div className="text-center mb-10 border-b-2 border-black pb-8 relative">
             <div className="absolute top-0 right-0 z-10">
                <QRCodeCanvas 
                  value={verifyUrl} 
                  size={95}
                  level="H"
                  includeMargin={false}
                />
                <p className="text-[7px] mt-1 font-bold text-center">SCAN TO VERIFY</p>
             </div>
             <div className="flex justify-center mb-4 relative z-10">
                {systemSettings?.policeLogo ? (
                  <img src={systemSettings.policeLogo} alt="Police Logo" className="w-20 h-20 object-contain" />
                ) : (
                  <Shield className="w-16 h-16 text-black" />
                )}
             </div>
             <div className="text-2xl font-black uppercase tracking-wider mb-1 px-4 relative z-10">{translations.EN.title}</div>
             <div className="text-xl font-bold mb-2 font-ethiopic relative z-10">{translations.AM.title}</div>
             
             {/* Dynamic Title based on Role */}
             <div className="text-[26pt] font-black border-y-2 border-black py-4 inline-block px-14 mb-4 font-ethiopic mt-4">
                {caseInfo.personType === 'Witness' && t.witnessStatement}
                {caseInfo.personType === 'Suspect' && t.suspectStatement}
                {caseInfo.personType === 'Complainant' && t.complainantStatement}
             </div>
             
             <div className="mt-2 text-xs font-bold bg-slate-100 py-1 inline-block px-6 rounded-full border border-slate-200">
                DATE: {clientDate || '...'}
             </div>
          </div>

          {/* Case Meta Data */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-12 text-sm">
             <div className="border-b border-dotted border-slate-400 pb-1 flex justify-between">
                <span className="font-bold uppercase text-[9px] text-slate-500">Case ID / መዝገብ ቁጥር:</span>
                <span className="font-bold text-base">{caseInfo.caseId}</span>
             </div>
             <div className="border-b border-dotted border-slate-400 pb-1 flex justify-between">
                <span className="font-bold uppercase text-[9px] text-slate-500">Investigator / መርማሪ:</span>
                <span className="font-bold text-base">{caseInfo.detectiveName}</span>
             </div>
             <div className="border-b border-dotted border-slate-400 pb-1 flex justify-between">
                <span className="font-bold uppercase text-[9px] text-slate-500">Subject Name / ባለጉዳይ:</span>
                <span className="font-bold text-base">{caseInfo.intervieweeName}</span>
             </div>
             <div className="border-b border-dotted border-slate-400 pb-1 flex justify-between">
                <span className="font-bold uppercase text-[9px] text-slate-500">Language / ቋንቋ:</span>
                <span className="font-bold text-base">{caseInfo.language}</span>
             </div>
          </div>

          {/* Content */}
          <div className="mb-20">
            <h4 className="font-black mb-6 border-l-4 border-black pl-4 text-xl flex items-center gap-3">
              <FileText className="w-5 h-5" />
              TESTIMONY TRANSCRIPT / የቃል መዝገብ ፅሁፍ
            </h4>
            <div className="text-[14pt] leading-[2] font-ethiopic text-justify whitespace-pre-line min-h-[500px]">
              {transcription || "..."}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-20 mt-auto pt-24 border-t-2 border-black border-dashed">
            <div className="text-center">
              <div className="border-t-2 border-black pt-4 px-4">
                <p className="font-black uppercase text-[10px] mb-1">Statement Giver</p>
                <p className="font-bold font-ethiopic text-lg mb-4">{t.giverSign}</p>
                <div className="h-24 flex items-end justify-center">
                  <span className="text-xs text-slate-400 font-mono tracking-widest text-[8px]">DIGITAL SIGNATURE AREA</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-black pt-4 px-4">
                <p className="font-black uppercase text-[10px] mb-1">Receiving Investigator</p>
                <p className="font-bold font-ethiopic text-lg mb-4">{t.receiverSign}</p>
                <div className="h-24 flex items-end justify-center">
                  <span className="text-xs text-slate-400 font-mono tracking-widest text-[8px]">OFFICIAL POLICE SEAL AREA</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-10 left-[15mm] right-[15mm] flex justify-between items-center border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">
                 <Shield className="w-3 h-3" />
                 BG POLICE INTEGRITY RECORD • CLASS A SECURE
              </div>
              <div className="text-[8px] font-mono text-slate-400 uppercase flex flex-col text-right">
                 <span>ID: {currentCaseDocId?.toUpperCase() || 'UNSYNCED'}</span>
                 <span>TIMESTAMP: {isMounted ? clientDate || '...' : '...'}</span>
              </div>
          </div>
        </div>
      </div>

      {/* Hidden Printable Official Document (Statistics) */}
      <div id="printable-stats" className={`${activePrintId === 'stats' ? 'print:block' : 'print:hidden'} hidden font-serif text-black p-10 leading-relaxed overflow-hidden relative min-h-screen`}>
        {/* Watermark Logo (Centered Globally on Page) */}
        {systemSettings?.policeLogo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] z-0 h-full w-full">
             <img src={systemSettings.policeLogo} alt="Watermark" className="w-[150mm] h-auto object-contain transform -rotate-12" />
          </div>
        )}

        <div className="text-center mb-10 border-b-2 border-black pb-8 relative z-10">
           <h1 className="text-3xl font-black">{t.title}</h1>
           <h2 className="text-xl font-bold mt-2 uppercase">{t.reports}</h2>
           <p className="text-xs mt-4">Generated on: {clientDate}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-8 mb-10">
           <div className="border border-black p-6">
              <h3 className="font-bold border-b border-black mb-4 uppercase">{t.totalCases}</h3>
              <p className="text-4xl font-black">{stats.total}</p>
           </div>
           <div className="border border-black p-6">
              <h3 className="font-bold border-b border-black mb-4 uppercase">{t.recordingTypes}</h3>
              <p className="text-sm">Video: {stats.video}</p>
              <p className="text-sm">Audio: {stats.audio}</p>
           </div>
        </div>

        <div className="border border-black p-6 mb-10">
           <h3 className="font-bold border-b border-black mb-4 uppercase">{t.caseStatusStats}</h3>
           <p className="text-sm">Finalized: {stats.finalized}</p>
           <p className="text-sm">Drafts: {stats.drafts}</p>
           <p className="text-sm">Active: {stats.recording}</p>
        </div>

        <div className="border border-black p-6 mb-10">
           <h3 className="font-bold border-b border-black mb-4 uppercase">Regional Staffing</h3>
           <p className="text-sm">Total Personnel: {allStaff.length}</p>
        </div>

        <div className="mt-20 flex justify-between">
           <div className="text-center">
              <div className="w-40 h-px bg-black mb-2" />
              <p className="text-xs font-bold uppercase">System Administrator</p>
           </div>
           <div className="text-center">
              <div className="w-40 h-px bg-black mb-2" />
              <p className="text-xs font-bold uppercase">Command Center Seal</p>
           </div>
        </div>
      </div>
    </div>
  );
}

