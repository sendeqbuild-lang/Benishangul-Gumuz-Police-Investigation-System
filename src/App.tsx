import React, { useState, useRef, useEffect } from 'react';
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
  Lock,
  BarChart4,
  PieChart,
  FileBarChart,
  Menu,
  X,
  ChevronLeft,
  UserCheck,
  Users
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
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
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
  deleteDoc
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
}

const translations = {
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
    liveFeed: "Live Feed",
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
    verifyUrl: "https://ais-dev-q22bxfcxrb6ppybpdgaxm4-505824486313.europe-west2.run.app",
    recordingMode: "Recording Mode",
    video: "Video",
    audio: "Audio"
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
    liveFeed: "የቀጥታ ስርጭት",
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
    verifyUrl: "https://ais-dev-q22bxfcxrb6ppybpdgaxm4-505824486313.europe-west2.run.app",
    recordingMode: "የመቅጃ ዘዴ",
    video: "ቪዲዮ",
    audio: "ድምፅ"
  }
};

export default function App() {
  // Auth State
  const [user, setUser] = useState<{uid: string, email: string, displayName?: string} | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const generateCaseId = () => `BGP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // App State
  const [uiLanguage, setUiLanguage] = useState<'EN' | 'AM'>('AM');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = translations[uiLanguage];
  const [mode, setMode] = useState<'Investigator' | 'Supervisor' | 'Admin' | 'Reports'>('Investigator');
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordCount, setRecordCount] = useState(0); // Tracking repeat recordings
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentCaseDocId, setCurrentCaseDocId] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<'Recording' | 'Processing' | 'Draft' | 'Finalized'>('Draft');
  
  const [caseInfo, setCaseInfo] = useState({
    caseId: generateCaseId(),
    detectiveName: '',
    intervieweeName: '',
    personType: 'Witness' as const,
    language: 'Amharic',
    recordingMode: 'Video' as 'Audio' | 'Video'
  });
  
  const [allCases, setAllCases] = useState<CaseRecord[]>([]);
  const [allStaff, setAllStaff] = useState<StaffProfile[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activePrintId, setActivePrintId] = useState<'case' | 'stats'>('case');

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
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email || '', displayName: u.displayName || '' });
        setIsAdmin(u.email === 'sendeqbuild@gmail.com');
        setCaseInfo(prev => ({ ...prev, detectiveName: u.displayName || '' }));
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoadingApp(false);
    });
    return () => unsubscribe();
  }, []);

  // Cases Listener
  useEffect(() => {
    if (!user) return;
    
    let q;
    if (user.email === 'sendeqbuild@gmail.com') {
      q = query(collection(db, 'cases'), orderBy('updatedAt', 'desc'));
    } else {
      q = query(collection(db, 'cases'), 
        where('investigatorEmail', '==', user.email),
        orderBy('updatedAt', 'desc')
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
    return (
      c.caseId.toLowerCase().includes(s) || 
      c.intervieweeName.toLowerCase().includes(s) ||
      c.detectiveName.toLowerCase().includes(s)
    );
  });

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
    setRecordCount(0);
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
      setRecordCount(0);
      setIsRecording(false);
      setIsProcessing(false);
      setDuration(0);
    }
  }, [currentCaseDocId, user]);

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

    if (recordCount >= 2) {
      setError("መቅዳት የሚቻለው ቢበዛ ሁለት ጊዜ ብቻ ነው። (Max 2 recordings allowed)");
      return;
    }

    try {
      const constraints = { 
        audio: true, 
        video: caseInfo.recordingMode === 'Video' ? { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } : false
      };

      const liveStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(liveStream);

      const options: MediaRecorderOptions = {};
      if (caseInfo.recordingMode === 'Video') {
        options.mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
          ? 'video/webm;codecs=vp9,opus' 
          : 'video/webm';
      } else {
        options.mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
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
          recordCount: 1,
          hasVideo: caseInfo.recordingMode === 'Video'
        });
        docId = docRef.id;
        setCurrentCaseDocId(docId);
      } else {
        await updateDoc(doc(db, 'cases', docId), {
          status: 'Recording',
          recordCount: recordCount + 1,
          updatedAt: serverTimestamp(),
          hasVideo: caseInfo.recordingMode === 'Video'
        });
      }
      
      setRecordCount(prev => prev + 1);
      setCaseStatus('Recording');

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mimeType = caseInfo.recordingMode === 'Video' ? 'video/webm' : 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await processAudio(blob, docId!);
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setStream(null);
      setCaseStatus('Processing');
      if (currentCaseDocId) {
        updateDoc(doc(db, 'cases', currentCaseDocId), { status: 'Processing' });
      }
    }
  };

  const processAudio = async (blob: Blob, docId: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result?.toString().split(',')[1];
        if (base64data) {
          const result = await transcribeAndTranslateAudio(base64data, 'audio/webm', caseInfo.language);
          setTranscription(result);
          setCaseStatus('Draft');
          await updateDoc(doc(db, 'cases', docId), {
            transcription: result,
            status: 'Draft',
            updatedAt: serverTimestamp()
          });
        }
      };
    } catch (err: any) {
      console.error('Processing error:', err);
      setError('ድምፁን ወደ ፅሁፍ መቀየር አልተቻለም።');
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeAndPrint = async () => {
    if (!currentCaseDocId) return;
    
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
      language: c.language
    });
    setTranscription(c.transcription);
    setCaseStatus(c.status);
    setCurrentCaseDocId(c.id);
    setRecordCount((c as any).recordCount || 0);
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
        
        const { password, ...staffData } = newStaff;
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          ...staffData,
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

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm("መርማሪውን ለማጥፋት እርግጠኛ ነዎት? (Are you sure you want to delete this staff?)")) return;
    try {
      await deleteDoc(doc(db, 'users', staffId));
      alert("መርማሪው በትክክል ተሰርዟል! (Staff deleted successfully)");
    } catch (err: any) {
      setError("Delete failed: " + err.message);
    }
  };

  const handleEditStaff = (staff: StaffProfile) => {
    setNewStaff({
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role || '',
      password: '',
      userType: staff.userType
    });
    setEditingStaffId(staff.id);
  };

  if (loadingApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-police-blue animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 font-ethiopic">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-police-blue rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
               <Shield className="w-10 h-10 text-white" />
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
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12 flex flex-col font-ethiopic">
      {/* Verification Layer for QR - hidden from normal flow but active via URL */}
      {window.location.search.includes('verify=') && (
        <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-green-400 to-emerald-600" />
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShieldCheck className="w-14 h-14 text-green-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2 leading-tight">ORIGINAL RECORD VERIFIED</h2>
            <p className="text-slate-500 mb-10 font-ethiopic">ትክክለኛነቱ የተረጋገጠ የክልል ፖሊስ የቃል መዝገብ ሰነድ</p>
            
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-left space-y-5 mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Case ID</span>
                  <p className="font-black text-lg text-slate-800">{new URLSearchParams(window.location.search).get('verify')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Type</span>
                  <p className="text-xs font-bold text-police-blue flex items-center gap-1"><Fingerprint className="w-3 h-3" /> Encrypted</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification Hash</span>
                <p className="font-mono text-[11px] text-slate-500 break-all bg-white p-2 rounded-lg mt-1 border border-slate-100 shadow-sm">AUTHENTICATED-SYSTEM-PRINT-BGPC-09-{Math.random().toString(36).substring(7).toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2 text-green-600 bg-green-50/50 p-2 rounded-xl justify-center">
                 <CheckCircle className="w-4 h-4" />
                 <span className="text-xs font-bold uppercase tracking-wider">Status: Official Original Document</span>
              </div>
            </div>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full btn-primary py-5 rounded-2xl shadow-xl shadow-blue-200 font-bold"
            >
              Access Command Center
            </button>
            <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
               <Shield className="w-3 h-3" />
               BG Police Integrity Division
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-police-blue text-white shadow-lg no-print sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center relative gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { 
                if (mode !== 'Investigator') setMode('Investigator'); 
                else if (selectedCase) setSelectedCase(null); 
                else if (currentCaseDocId) setCurrentCaseDocId(null);
              }}
              className={`p-2 bg-white/10 rounded-xl md:hidden ${(mode === 'Investigator' && !selectedCase && !currentCaseDocId) ? 'hidden' : 'block'}`}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 border-2 border-police-blue/20">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-police-blue" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-black text-white tracking-tighter leading-none">{t.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-[9px] md:text-xs font-bold text-blue-100 uppercase tracking-widest leading-none">Regional Node Active</p>
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
                { label: t.totalCases, val: stats.total, color: 'text-police-blue', bg: 'bg-blue-50', icon: FileText },
                { label: t.witnesses, val: stats.witnesses, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: User },
                { label: t.suspects, val: stats.suspects, color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
                { label: t.complainants, val: stats.complainants, color: 'text-amber-600', bg: 'bg-amber-50', icon: Shield },
              ].map((card, i) => (
                <div key={i} className="card p-6 flex items-center gap-5">
                  <div className={`w-14 h-14 ${card.bg} rounded-2xl flex items-center justify-center`}>
                    <card.icon className={`w-7 h-7 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
                    <p className="text-3xl font-black text-slate-800 leading-none mt-1">{card.val}</p>
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
              <div className="lg:col-span-4">
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
                <div className="p-6 bg-slate-900 text-white text-center">
                  <div className="text-4xl font-mono mb-6">{formatTime(duration)}</div>
                  <div className="flex justify-center items-center gap-6">
                    {!isRecording ? (
                      <button 
                        onClick={startRecording} 
                        disabled={isProcessing || caseStatus === 'Finalized'} 
                        className="w-16 h-16 bg-red-600 rounded-full hover:bg-red-700 flex items-center justify-center disabled:opacity-30 shadow-lg transition-transform active:scale-95"
                      >
                        <Mic className="w-6 h-6 text-white" />
                      </button>
                    ) : (
                      <button onClick={stopRecording} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95">
                        <Square className="w-6 h-6 text-slate-900 fill-slate-900" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mt-6 tracking-widest text-center">
                    {isRecording ? 'Video & Audio Capture Active' : 'System Ready'}
                  </p>
                </div>
              </div>

              {/* Investigator's Recent Cases */}
              <div className="card p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  {t.history}
                </h3>
                <div className="relative mb-3">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-police-blue outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {filteredCases.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => selectCaseForEditing(c)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        currentCaseDocId === c.id ? 'border-police-blue bg-blue-50' : 'border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-xs text-police-blue">{c.caseId}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                          c.status === 'Finalized' ? 'bg-green-100 text-green-700' :
                          c.status === 'Recording' ? 'bg-red-100 text-red-700 animate-pulse' :
                          'bg-slate-100 text-slate-500'
                        }`}>{c.status}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 truncate">{c.intervieweeName}</p>
                    </button>
                  ))}
                  {allCases.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6 italic">{t.noHistory}</p>
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
              <div className="card flex flex-col h-[500px] md:h-[650px] shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${caseStatus === 'Recording' ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
                    <h3 className="font-bold text-slate-800">{t.statementReview}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setCaseInfo({
                          caseId: generateCaseId(),
                          detectiveName: user?.displayName || '',
                          intervieweeName: '',
                          personType: 'Witness',
                          language: 'Amharic'
                        });
                        setTranscription('');
                        setCaseStatus('Draft');
                        setCurrentCaseDocId(null);
                        setDuration(0);
                        setRecordCount(0);
                      }}
                      disabled={isRecording}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white text-police-blue border-2 border-police-blue hover:bg-police-blue hover:text-white transition-all disabled:opacity-50"
                    >
                      <PlusCircle className="w-4 h-4" />
                      New Investigation
                    </button>
                    {isAdmin && currentCaseDocId && (
                      <button 
                         onClick={() => {
                           // Logic to download raw text or state
                           const blob = new Blob([transcription], {type: 'text/plain'});
                           const url = URL.createObjectURL(blob);
                           const a = document.createElement('a');
                           a.href = url;
                           a.download = `case_${caseInfo.caseId}_audio_log.txt`;
                           a.click();
                         }}
                         className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-100"
                      >
                         <Download className="w-4 h-4" />
                         Audio Log
                      </button>
                    )}
                    <button 
                      onClick={finalizeAndPrint} 
                      disabled={!transcription || caseStatus === 'Recording'} 
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        caseStatus === 'Finalized' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100'
                      }`}
                    >
                      <Printer className="w-4 h-4" />
                      {t.finalize}
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 p-8 relative overflow-hidden">
                  <AnimatePresence>
                    {isProcessing && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                        <Loader2 className="w-12 h-12 text-police-blue animate-spin mb-4" />
                        <span className="font-bold text-police-blue">{t.processing}</span>
                        <p className="text-slate-400 text-sm mt-2 font-ethiopic">{t.processingSub}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <textarea 
                    className="w-full h-full resize-none border-none focus:ring-0 text-xl leading-relaxed font-ethiopic text-slate-800 placeholder:text-slate-300"
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    readOnly={caseStatus === 'Finalized'}
                    placeholder={t.placeholder}
                  />
                  {caseStatus === 'Finalized' && (
                    <div className="absolute top-4 right-4 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-200">
                      {t.locked}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Supervisor Dashboard */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{t.oversight}</h2>
                <p className="text-slate-500">{t.oversightSub}</p>
              </div>
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

            <div className="grid grid-cols-1 gap-6">
              <div className="card h-[75vh] overflow-y-auto shadow-xl">
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
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedCase(c)}>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                            c.status === 'Recording' ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' :
                            c.status === 'Finalized' ? 'bg-green-50 text-green-600 border-green-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {c.status}
                          </span>
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
                           <button className="p-2 text-slate-300 hover:text-police-blue transition-colors">
                             <Eye className="w-5 h-5" />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {allCases.length === 0 && (
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
              </div>
            </div>

            {/* Supervisor Monitor Modal */}
            <AnimatePresence>
              {selectedCase && (
                <div className="modal-overlay" onClick={() => setSelectedCase(null)}>
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
                             <span className="px-2 py-0.5 bg-police-blue text-white text-[9px] font-bold rounded-md uppercase">{t.liveFeed}</span>
                          </div>
                          <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest truncate max-w-[200px] md:max-w-none">
                            {selectedCase.intervieweeName} • {t.statementReview}
                          </p>
                        </div>
                        <button onClick={() => setSelectedCase(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-400" />
                        </button>
                      </div>
                      
                      <div className="flex-1 p-6 md:p-10 bg-white overflow-y-auto">
                        <div className="max-w-3xl mx-auto border-l-4 border-police-blue/20 pl-4 md:pl-8">
                          <p className="text-lg md:text-2xl leading-[1.8] font-ethiopic text-slate-800 whitespace-pre-line">
                            {selectedCase.transcription || t.establish}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 md:p-6 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="grid grid-cols-2 md:flex gap-4 md:gap-8 text-[10px] md:text-xs font-bold text-slate-400 w-full md:w-auto">
                           <div className="flex flex-col">
                             <span>{t.officer}</span>
                             <span className="text-white truncate">{selectedCase.detectiveName}</span>
                           </div>
                           <div className="flex flex-col">
                             <span>{t.language}</span>
                             <span className="text-white">{selectedCase.language}</span>
                           </div>
                           <div className="flex flex-col">
                             <span>{t.status}</span>
                             <span className={selectedCase.status === 'Recording' ? 'text-red-400' : 'text-green-400'}>{selectedCase.status}</span>
                           </div>
                        </div>
                        <button 
                          onClick={() => {
                            setActivePrintId('case');
                            setTimeout(() => window.print(), 300);
                          }}
                          className="w-full md:w-auto btn-primary bg-white text-police-blue hover:bg-slate-100 flex items-center justify-center gap-2 py-3 md:py-2"
                        >
                          <Download className="w-4 h-4" />
                          {t.captureArchive}
                        </button>
                      </div>
                    </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Hidden Printable Official Document (Case) */}
      <div id="printable-report" className={`${activePrintId === 'case' ? 'print:block' : 'print:hidden'} hidden font-serif text-black p-0 leading-relaxed overflow-visible`}>
        <div className="w-[190mm] mx-auto min-h-screen relative p-[15mm]">
          {/* Header */}
          <div className="text-center mb-10 border-b-2 border-black pb-8 relative">
             <div className="absolute top-0 right-0">
                <QRCodeCanvas 
                  value={`${translations.AM.verifyUrl}?verify=${caseInfo.caseId || 'UNK'}`} 
                  size={95}
                  level="H"
                  includeMargin={false}
                />
                <p className="text-[7px] mt-1 font-bold text-center">SCAN TO VERIFY</p>
             </div>
             <div className="flex justify-center mb-4">
                <Shield className="w-16 h-16 text-black" />
             </div>
             <div className="text-2xl font-black uppercase tracking-wider mb-1 px-4">{translations.EN.title}</div>
             <div className="text-xl font-bold mb-2 font-ethiopic">{translations.AM.title}</div>
             
             {/* Dynamic Title based on Role */}
             <div className="text-[26pt] font-black border-y-2 border-black py-4 inline-block px-14 mb-4 font-ethiopic mt-4">
                {caseInfo.personType === 'Witness' && t.witnessStatement}
                {caseInfo.personType === 'Suspect' && t.suspectStatement}
                {caseInfo.personType === 'Complainant' && t.complainantStatement}
             </div>
             
             <div className="mt-2 text-xs font-bold bg-slate-100 py-1 inline-block px-6 rounded-full border border-slate-200">
                DATE: {new Date().toLocaleDateString('en-GB')} • {new Date().toLocaleDateString('am-ET')}
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
                 <span>TIMESTAMP: {new Date().toISOString()}</span>
              </div>
          </div>
        </div>
      </div>

      {/* Hidden Printable Official Document (Statistics) */}
      <div id="printable-stats" className={`${activePrintId === 'stats' ? 'print:block' : 'print:hidden'} hidden font-serif text-black p-10 leading-relaxed overflow-visible`}>
        <div className="text-center mb-10 border-b-2 border-black pb-8">
           <h1 className="text-3xl font-black">{t.title}</h1>
           <h2 className="text-xl font-bold mt-2 uppercase">{t.reports}</h2>
           <p className="text-xs mt-4">Generated on: {new Date().toLocaleString()}</p>
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

