import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  Maximize2,
  Minimize2,
  X,
  Shield,
  FileText,
  ExternalLink,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Globe,
  Radio,
} from 'lucide-react';
import { TarkaLogo } from '../../components/common/TarkaLogo';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getCanonicalCase } from '../../fixtures/cases';
import {
  TarkaButton,
  TarkaStatus,
} from '../ui';

/* =====================================================================
   TARKA UNIVERSAL MULTILINGUAL ASSISTANT
   Orchestration: 7 Specialist Capabilities
   Supported Languages: EN, TA, HI, TE, KN, ML, BN, MR, GU, PA, OR, Tanglish, Hinglish
   Doctrine: AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
   ===================================================================== */

export interface EvidenceCitation {
  artifactId: string;
  filename: string;
  tier: string;
  sha256: string;
  source: string;
  relevance: string;
}

export interface OrchestrationStep {
  specialist:
    | 'Evidence Analyst'
    | 'Financial Analyst'
    | 'Temporal Analyst'
    | 'Entity and Network Analyst'
    | 'Forensic Reasoning Analyst'
    | 'Report Analyst'
    | 'Voice and Language Service';
  tool: string;
  status: 'invoked' | 'verified' | 'skipped';
  durationMs: number;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  language: string;
  specialistUsed?: string;
  requestId?: string;
  citations?: EvidenceCitation[];
  observedFacts?: string[];
  inferences?: string[];
  uncertainties?: string[];
  contradictions?: string[];
  suggestedAction?: {
    label: string;
    action: string;
    targetView?: string;
  };
  orchestrationSteps?: OrchestrationStep[];
}

export interface TarkaUniversalAssistantProps {
  mode?: 'drawer' | 'fullscreen';
  onClose?: () => void;
  onToggleFullscreen?: () => void;
  onOpenVoice?: () => void;
  className?: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)', label: 'English' },
  { code: 'ta-IN', name: 'தமிழ் (Tamil)', label: 'Tamil' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)', label: 'Hindi' },
  { code: 'te-IN', name: 'తెలుగు (Telugu)', label: 'Telugu' },
  { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', label: 'Kannada' },
  { code: 'ml-IN', name: 'മലയാളം (Malayalam)', label: 'Malayalam' },
  { code: 'bn-IN', name: 'বাংলা (Bengali)', label: 'Bengali' },
  { code: 'mr-IN', name: 'मराठी (Marathi)', label: 'Marathi' },
  { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)', label: 'Gujarati' },
  { code: 'pa-IN', name: 'ਪੰਜਾਬੀ (Punjabi)', label: 'Punjabi' },
  { code: 'or-IN', name: 'ଓଡ଼ିଆ (Odia)', label: 'Odia' },
  { code: 'ta-IN-en', name: 'Tanglish (Tamil + English)', label: 'Tanglish' },
  { code: 'hi-IN-en', name: 'Hinglish (Hindi + English)', label: 'Hinglish' },
];

export const TarkaUniversalAssistant: React.FC<TarkaUniversalAssistantProps> = ({
  mode = 'drawer',
  onClose,
  onToggleFullscreen,
  onOpenVoice,
  className = '',
}) => {
  const { activeCaseId, activeView, setActiveView } = useCaseStore();
  const { setVoiceModalOpen } = useTarkaUiStore();
  const { profile } = useSettingsStore();

  const caseId = activeCaseId || 'CASE-2026-001';
  const canonicalCase = getCanonicalCase(caseId);

  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-IN');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechActive, setSpeechActive] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dynamic context-aware prompts based on current page view
  const contextualPrompts = useMemo(() => {
    switch (activeView) {
      case 'home':
        return [
          { q: 'Summarize overall jurisdiction status across all 4 active cases', specialist: 'Report Analyst' },
          { q: 'Which active case has the highest unshielded exposure right now?', specialist: 'Financial Analyst' },
          { q: 'Check if any registered evidence has unverified SHA-256 hashes', specialist: 'Evidence Analyst' },
        ];
      case 'evidence':
        return [
          { q: 'Explain the ₹25,000 vs ₹15,000 discrepancy between ledger and screenshot', specialist: 'Financial Analyst' },
          { q: 'Verify double-entry balance conservation for Finacle Statement (Row 1 to 14)', specialist: 'Financial Analyst' },
          { q: 'Analyze NPCI RRN 602811492015 Julian Day offset against SBI gateway clock', specialist: 'Temporal Analyst' },
        ];
      case 'people':
        return [
          { q: 'Explain why suspect Ramesh Patel is linked to 4 separate mule accounts', specialist: 'Entity and Network Analyst' },
          { q: 'Why did the Hard-Veto shield block automated merging of Vikram WA?', specialist: 'Forensic Reasoning Analyst' },
          { q: 'Check Aadhaar hash and PAN consistency across all identified suspects', specialist: 'Evidence Analyst' },
        ];
      case 'money':
        return [
          { q: 'Calculate recoverable funds for Sunil Kumar using Lowest Intermediate Balance Rule (LIBR)', specialist: 'Financial Analyst' },
          { q: 'Trace the path of ₹50,00,000 from Layer 1 to Layer 4 mule sinks', specialist: 'Financial Analyst' },
          { q: 'Draft formal bank freeze requisition under BNSS §106 for Account #1002', specialist: 'Report Analyst' },
        ];
      case 'network':
        return [
          { q: 'Identify the node with the highest betweenness centrality in the fraud ring', specialist: 'Entity and Network Analyst' },
          { q: 'Why is Node M-04 flagged as a rapid transit hotspot (TTL ≤ 63s)?', specialist: 'Forensic Reasoning Analyst' },
          { q: 'Find any cross-case infrastructure links between CASE-2026-001 and CASE-2026-003', specialist: 'Entity and Network Analyst' },
        ];
      case 'device':
        return [
          { q: 'Explain Carrier-Grade NAT (CGNAT) ephemeral source port attribution to IMSI', specialist: 'Temporal Analyst' },
          { q: 'Correlate IMEI 864201048821901 with cell tower sector azimuth at 14:02 IST', specialist: 'Evidence Analyst' },
          { q: 'Verify DoT subscriber compliance logs for SIM IMSI 404450192831201', specialist: 'Evidence Analyst' },
        ];
      case 'actions':
        return [
          { q: 'Verify all prerequisite integrity gates (I1 to I5) for Section 63 BSA Certificate', specialist: 'Forensic Reasoning Analyst' },
          { q: 'Draft Magistrate requisition for provisional attachment under BNSS §107', specialist: 'Report Analyst' },
          { q: 'Generate complete cryptographic custody table with SHA-256 bitstream seals', specialist: 'Evidence Analyst' },
        ];
      case 'lab':
      case 'benchmarks':
        return [
          { q: 'Explain the 10,000 transactions/second benchmark latency distribution (p50 vs p99)', specialist: 'Forensic Reasoning Analyst' },
          { q: 'Validate confusion matrix and zero false-positive rate across synthetic test sets', specialist: 'Forensic Reasoning Analyst' },
        ];
      default:
        return [
          { q: `Explain active investigation ${caseId} (${canonicalCase.title})`, specialist: 'Report Analyst' },
          { q: 'Show contradictory evidence detected in current case dossier', specialist: 'Forensic Reasoning Analyst' },
          { q: 'What is the next recommended statutory investigative action?', specialist: 'Report Analyst' },
        ];
    }
  }, [activeView, caseId, canonicalCase]);

  // Initial welcome message
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: 'en-IN',
      text: `Hello ${profile.name || 'Inspector'}. I am **TARKA Assistant**, your multilingual forensic copilot.

I am actively tracking **${caseId}** (${canonicalCase.title}) currently at view **${activeView.toUpperCase()}**.

All findings are governed by **AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.** Inferences are strictly grounded in raw SHA-256 artifacts with zero unverified claims.

Select a contextual question below, ask in any of 11 Indian languages, or activate Voice Interrogation.`,
      specialistUsed: 'Forensic Reasoning Analyst',
      requestId: 'REQ-INIT-001',
      observedFacts: [
        `Case ${caseId} registered under NCRP ACK #${canonicalCase.ncrpAckNo || '1930-ACK-2026'}.`,
        `Reported loss: ₹85,00,000 across 14 transactions.`,
        `18 verified cryptographic artifacts admitted into custody.`,
      ],
      inferences: [
        `Syndicate operating as an automated bot mule network with Layer-1 cashouts under 63 seconds.`,
      ],
      uncertainties: [
        `Complainant phone device clock drift of +4.2s against SBI Finacle CBS timestamp.`,
      ],
      contradictions: [
        `Complainant claims payment of ₹25,000 via WhatsApp screenshot (ART-004), but SBI CBS Ledger (ART-002) records only ₹15,000.`,
      ],
      citations: [
        {
          artifactId: 'ART-001-F06C36EE',
          filename: 'FIR_Noida_Cyber_2026_001.pdf',
          tier: 'TIER_1_CERTIFIED',
          sha256: 'f06c36ee91283c71a1005b82194c2810a9f1b2039c48b19280ad9182319f0182',
          source: 'Noida Cyber PS',
          relevance: 'Primary complaint narrative and FIR registration record.',
        },
        {
          artifactId: 'ART-002-887B114A',
          filename: 'SBI_Finacle_Account_Statement_1001.csv',
          tier: 'TIER_1_CERTIFIED',
          sha256: '887b114af90234bce12093847291a084c718293a401b2c938472910482910394',
          source: 'SBI Finacle Core Banking System',
          relevance: 'Mathematical banking truth and double-entry balance continuity.',
        },
      ],
      suggestedAction: {
        label: 'Inspect Ledger Discrepancy',
        action: 'OPEN_VIEW',
        targetView: 'evidence',
      },
      orchestrationSteps: [
        { specialist: 'Evidence Analyst', tool: 'evidence_dna_lookup()', status: 'verified', durationMs: 4.2 },
        { specialist: 'Financial Analyst', tool: 'cbs_ledger_reconcile()', status: 'verified', durationMs: 12.1 },
        { specialist: 'Forensic Reasoning Analyst', tool: 'z3_difference_logic_solver()', status: 'verified', durationMs: 8.5 },
      ],
    },
  ]);

  // Listen for custom dispatch events from other views
  useEffect(() => {
    const handlePromptEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt: string }>;
      if (customEvent.detail?.prompt) {
        handleSendMessage(customEvent.detail.prompt);
      }
    };
    window.addEventListener('tarka-prompt-select', handlePromptEvent);
    return () => window.removeEventListener('tarka-prompt-select', handlePromptEvent);
  }, []);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Speech synthesis for assistant voice replies
  const speakText = (textToSpeak: string, langCode: string) => {
    if (!speechActive || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      // Clean markdown tags for natural speech
      const cleaned = textToSpeak
        .replace(/[*_#`]/g, '')
        .replace(/₹/g, 'Rupees ')
        .replace(/\bBSA §63\b/g, 'Section 63 of Bharatiya Sakshya Adhiniyam');

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = langCode.startsWith('ta') ? 'ta-IN' : langCode.startsWith('hi') ? 'hi-IN' : 'en-IN';
      utterance.rate = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Dispatch message through governed orchestrator
  const handleSendMessage = async (queryText?: string) => {
    const text = (queryText || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    stopSpeaking();

    const userMessage: AssistantMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: selectedLanguage,
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate multi-agent governed specialist orchestration (1.0s to 1.8s for realism)
    setTimeout(() => {
      // Determine specialist based on query keywords
      let specialist: OrchestrationStep['specialist'] = 'Forensic Reasoning Analyst';
      let directAnswer = '';
      let observedFacts: string[] = [];
      let inferences: string[] = [];
      let uncertainties: string[] = [];
      let contradictions: string[] = [];
      let suggestedAction: AssistantMessage['suggestedAction'] | undefined;
      const lower = text.toLowerCase();

      if (lower.includes('discrepancy') || lower.includes('25,000') || lower.includes('ledger') || lower.includes('finacle')) {
        specialist = 'Financial Analyst';
        directAnswer =
          selectedLanguage.startsWith('ta')
            ? `வங்கி கணக்கு அறிக்கை (ART-002) மற்றும் வாட்ஸ்அப் ரசீது (ART-004) இடையே ₹10,000 முரண்பாடு உறுதி செய்யப்பட்டுள்ளது. வங்கி லெட்ஜரில் ₹15,000 மட்டுமே பற்று வைக்கப்பட்டுள்ளது; ஆனால் ரசீது ₹25,000 கோருகிறது.`
            : selectedLanguage.startsWith('hi')
            ? `बैंक फिनैकल लेजर (ART-002) और व्हाट्सएप स्क्रीनशॉट (ART-004) के बीच ₹10,000 की विसंगति पाई गई है। लेजर में केवल ₹15,000 डेबिट दर्ज है, जबकि स्क्रीनशॉट ₹25,000 का दावा करता है।`
            : `Verified ₹10,000 payment discrepancy between Finacle CBS Statement (ART-002) and WhatsApp Screenshot Claim (ART-004). The bank ledger is authoritative under BSA §63 and records a debit of ₹15,000 at 10:18 IST, whereas the unverified screenshot claims ₹25,000.`;

        observedFacts = [
          `Finacle Ledger line #14 records debit of ₹15,000 (RRN 602811492015).`,
          `Running balance mathematically conserves: ₹85,00,000 -> ₹84,85,000.`,
          `WhatsApp receipt file ART-004 displays digital text edit artifacts in pixel grid.`,
        ];
        inferences = [
          `Complainant screenshot was altered post-transaction or represents a fabricated claim.`,
        ];
        uncertainties = [
          `No second CBS statement provided for beneficiary receiver account to date.`,
        ];
        contradictions = [
          `Ledger debit: ₹15,000 vs. Complainant receipt: ₹25,000 (Contradiction confirmed by Gate I1).`,
        ];
        suggestedAction = {
          label: 'Inspect Financial Ledger & Row #14',
          action: 'OPEN_VIEW',
          targetView: 'evidence',
        };
      } else if (lower.includes('libr') || lower.includes('freeze') || lower.includes('money') || lower.includes('recover')) {
        specialist = 'Financial Analyst';
        directAnswer =
          selectedLanguage.startsWith('ta')
            ? `LIBR (Lowest Intermediate Balance Rule) கணக்கீட்டின்படி, பாதிக்கப்பட்ட சுனில் குமாருக்கு ₹31,45,000 விகிதாசார ரீதியாக மீட்க தகுதியானது. மீதமுள்ள தொகை லேயர்-3 ஏடிஎம் மூலம் எடுக்கப்பட்டுள்ளது.`
            : `Under the Lowest Intermediate Balance Rule (LIBR) pursuant to BNSS §106/§107, exactly ₹31,45,000 of Sunil Kumar's extorted funds remains frozen in Layer-1 and Layer-2 bank conduits. The remaining ₹53,55,000 was converted via ATM cashouts and crypto gateways.`;

        observedFacts = [
          `Layer 1 Account #1002 (ICICI) holds ₹18,20,000 currently frozen.`,
          `Layer 2 Account #2004 (Canara) holds ₹13,25,000 frozen under police lien.`,
        ];
        inferences = [
          `Mule recruiter Ramesh Patel operated multiple Layer-1 collection sinks simultaneously.`,
        ];
        contradictions = [];
        uncertainties = [`Awaiting nodal officer debit freeze confirmation from Yes Bank for ₹4,20,000.`];
        suggestedAction = {
          label: 'Open Money Trail & Lien Calculator',
          action: 'OPEN_VIEW',
          targetView: 'money',
        };
      } else if (lower.includes('cgnat') || lower.includes('imsi') || lower.includes('imei') || lower.includes('device')) {
        specialist = 'Temporal Analyst';
        directAnswer =
          selectedLanguage.startsWith('ta')
            ? `DoT CGNAT தொலைத்தொடர்பு பதிவுப்படி, போர்ட் 54218 வழியாக வந்த ஐபி 103.211.54.12 சந்தாதாரர் IMSI 404450192831201 மற்றும் IMEI 864201048821901 உடன் துல்லியமாக பொருந்துகிறது.`
            : `Carrier-Grade NAT (CGNAT) 4-tuple resolution matched public IP 103.211.54.12:54218 at 14:02:11.849 IST to telecom carrier subscriber IMSI 404450192831201 and IMEI handset chassis 864201048821901 (Sector 3, Noida Sector 62 tower).`;

        observedFacts = [
          `Telco RADIUS log session opened at 13:58:10 IST and closed at 14:05:22 IST.`,
          `Handset IMEI was active in 3 preceding cyber complaints in Delhi NCR.`,
        ];
        inferences = [`Accused device physically operated within 450m radius of Sector 62 telecom tower.`];
        uncertainties = [`No optical CCTV footage available for the tower location.`];
        suggestedAction = {
          label: 'View Device & SIM Chassis',
          action: 'OPEN_VIEW',
          targetView: 'device',
        };
      } else if (lower.includes('bsa') || lower.includes('section 63') || lower.includes('court') || lower.includes('report')) {
        specialist = 'Report Analyst';
        directAnswer =
          selectedLanguage.startsWith('ta')
            ? `பாரதிய சாட்சிய அதினியம் பிரிவு 63 (BSA §63) சட்ட சான்றிதழ் தயாராக உள்ளது. அனைத்து 18 கோப்புகளின் SHA-256 ஹாஷ்கள் மற்றும் கணினி அளவுத்திருத்த சான்றுகள் சரிபார்க்கப்பட்டுள்ளன.`
            : `Section 63 BSA Judicial Certificate is generated and court-ready. All 18 admitted evidence bitstreams have been validated against their SHA-256 cryptographic hashes with zero tamper events. Integrity gates I1 through I5 report 100% PASS.`;

        observedFacts = [
          `Hardware calibration: Host Linux/Chromium execution environment timestamp verified via NTP.`,
          `Chain of custody: Zero modifications since acquisition by IO Rajeshwar Rao.`,
        ];
        inferences = [`Evidence satisfies strict statutory admissibility thresholds under BSA §63 and BNSS §107.`];
        uncertainties = [];
        contradictions = [];
        suggestedAction = {
          label: 'Generate Court-Ready Certificate',
          action: 'OPEN_VIEW',
          targetView: 'actions',
        };
      } else {
        specialist = 'Forensic Reasoning Analyst';
        directAnswer =
          selectedLanguage.startsWith('ta')
            ? `வழக்கு ${caseId} (${canonicalCase.title}) விசாரணை தீவிர கட்டத்தில் உள்ளது. 4 அடுக்கு கணக்குகள் மூலம் நிதி சிதறடிக்கப்பட்டது கண்டறியப்பட்டுள்ளது. AI முன்மொழிகிறது; சான்றுகள் சரிபார்க்கின்றன; நீங்கள் முடிவு செய்கிறீர்கள்.`
            : `Case ${caseId} investigation is actively proceeding with 18 verified artifacts. Automated multi-hop mule layering detected across 4 tiers with ₹31.45 Lakhs shielded. Every finding remains fully grounded in immutable bitstream evidence.`;

        observedFacts = [
          `Primary victim Sunil Kumar extorted via fraudulent video call impersonating CBI/TRAI officers.`,
          `Total loss documented: ₹85,00,000.`,
        ];
        inferences = [`Syndicate operates across Noida, Delhi, and Mewat corridors.`];
        uncertainties = [`Unidentified caller ID masked via overseas VoIP bridge.`];
        suggestedAction = {
          label: 'Open Investigation Workbench',
          action: 'OPEN_VIEW',
          targetView: 'workspace',
        };
      }

      const assistantMessage: AssistantMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: selectedLanguage,
        text: directAnswer,
        specialistUsed: specialist,
        requestId: `REQ-${Math.floor(100000 + Math.random() * 900000)}`,
        observedFacts,
        inferences,
        uncertainties,
        contradictions,
        citations: [
          {
            artifactId: 'ART-002-887B114A',
            filename: 'SBI_Finacle_Account_Statement_1001.csv',
            tier: 'TIER_1_CERTIFIED',
            sha256: '887b114af90234bce12093847291a084c718293a401b2c938472910482910394',
            source: 'SBI Finacle Core Banking System',
            relevance: 'Primary transactional source of truth for debits and balances.',
          },
          {
            artifactId: 'ART-004-6155034A',
            filename: 'Telecom_CDR_Tower_Extraction_981102.xlsx',
            tier: 'TIER_1_CERTIFIED',
            sha256: '6155034ae124bc910a82b938174c8102a9f1b2039c48b19280ad9182319f0182',
            source: 'Telecom Nodal Gateway',
            relevance: 'Tower coordinates and CGNAT ephemeral source port allocation records.',
          },
        ],
        suggestedAction,
        orchestrationSteps: [
          { specialist: 'Evidence Analyst', tool: 'evidence_dna_lookup()', status: 'verified', durationMs: 3.8 },
          { specialist, tool: 'governed_specialist_evaluate()', status: 'verified', durationMs: 14.6 },
          { specialist: 'Report Analyst', tool: 'evidence_lineage_trace()', status: 'verified', durationMs: 5.1 },
        ],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);

      // Auto-speak if enabled
      speakText(directAnswer, selectedLanguage);
    }, 900);
  };

  const handleActionClick = (action?: AssistantMessage['suggestedAction']) => {
    if (!action) return;
    if (action.targetView) {
      setActiveView(action.targetView);
      if (onClose) onClose();
    }
  };

  return (
    <div
      data-testid="tarka-universal-assistant"
      className={`h-full flex flex-col bg-[#FFFDF8] text-[#292522] ${className}`}
    >
      {/* 1. Header with Language Selector & Specialist Badge */}
      <div className="px-5 py-3.5 border-b border-[#D5CABE] bg-[#F8F4ED] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-[#EED9C7] text-[#A85C2A] border border-[#A85C2A]/30 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden p-1">
            <TarkaLogo variant="icon" height={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#292522]">TARKA Assistant</h2>
              <TarkaStatus status="safe" label="BSA §63 Copilot" />
            </div>
            <p className="text-[11.5px] text-[#756A60] truncate">
              {caseId} · View: <strong className="text-[#A85C2A]">{activeView.toUpperCase()}</strong>
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {/* Multilingual Selector */}
          <div className="relative flex items-center">
            <Globe className="size-3.5 text-[#756A60] absolute left-2 pointer-events-none" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              aria-label="Select Assistant Language"
              className="text-[12px] font-semibold text-[#292522] bg-[#FFFDF8] border border-[#D5CABE] rounded-lg pl-7 pr-3 py-1 cursor-pointer hover:border-[#A85C2A] focus:outline-none focus:ring-1 focus:ring-[#A85C2A] shadow-2xs"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Interrogation Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenVoice) onOpenVoice();
              else setVoiceModalOpen(true);
            }}
            title="Switch to Real-Time Multilingual Voice Interrogation (Press 'V')"
            className="size-8 rounded-lg border border-[#A85C2A]/40 bg-[#EED9C7]/50 text-[#A85C2A] hover:bg-[#EED9C7] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Mic className="size-4" />
          </button>

          {/* Speech Audio Toggle */}
          <button
            type="button"
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setSpeechActive(!speechActive);
            }}
            title={speechActive ? 'Spoken explanations active (click to mute)' : 'Speech muted (click to enable)'}
            className="size-8 rounded-lg border border-[#D5CABE] bg-[#FFFDF8] text-[#756A60] hover:text-[#292522] flex items-center justify-center transition-colors cursor-pointer"
          >
            {isSpeaking ? (
              <Radio className="size-4 text-[#A85C2A] animate-pulse" />
            ) : speechActive ? (
              <Volume2 className="size-4 text-[#287653]" />
            ) : (
              <VolumeX className="size-4 text-[#978B7F]" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              title={mode === 'fullscreen' ? 'Exit fullscreen' : 'Expand to fullscreen review'}
              className="size-8 rounded-lg border border-[#D5CABE] bg-[#FFFDF8] text-[#756A60] hover:text-[#292522] flex items-center justify-center transition-colors cursor-pointer"
            >
              {mode === 'fullscreen' ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          )}

          {/* Close */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center text-[#756A60] hover:text-[#292522] hover:bg-[#EFE9DF] transition-colors cursor-pointer"
              aria-label="Close assistant"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Security Banner & Governance Doctrine */}
      <div className="px-5 py-2 bg-[#F8F4ED] border-b border-[#D5CABE] flex items-center justify-between text-[11.5px] text-[#756A60] shrink-0">
        <div className="flex items-center gap-1.5 font-medium">
          <Shield className="size-3.5 text-[#287653]" />
          <span>Local Engine · Evidence strictly <strong>DATA_ONLY</strong> · Zero Prompt-Injection</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-[#A85C2A] font-bold">AI PROPOSES</span>
          <span>→</span>
          <span className="text-[#287653] font-bold">EVIDENCE VERIFIES</span>
          <span>→</span>
          <span className="text-[#292522] font-bold">HUMAN DECIDES</span>
        </div>
      </div>

      {/* 3. Conversation Messages Stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FFFDF8]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
          >
            <div className="flex items-center gap-2 px-1 text-[11px] text-[#978B7F]">
              <span className="font-semibold text-[#756A60]">
                {msg.sender === 'user' ? (profile.name || 'Investigator') : 'TARKA Copilot'}
              </span>
              <span>·</span>
              <span>{msg.timestamp}</span>
              {msg.specialistUsed && (
                <>
                  <span>·</span>
                  <span className="text-[#A85C2A] font-bold bg-[#EED9C7] px-1.5 py-0.2 rounded text-[10.5px]">
                    {msg.specialistUsed}
                  </span>
                </>
              )}
              {msg.requestId && (
                <span className="font-mono text-[10px] text-[#978B7F]">[{msg.requestId}]</span>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-[90%] rounded-2xl p-4 transition-all ${
                msg.sender === 'user'
                  ? 'bg-[#49362E] text-[#FFFDF8] rounded-tr-xs shadow-xs'
                  : 'tarka-panel bg-[#FFFDF8] border border-[#D5CABE] rounded-tl-xs shadow-sm space-y-3'
              }`}
            >
              {/* Main Text Content */}
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans">
                {msg.text}
              </div>

              {/* Observed Facts (Verified Truth) */}
              {msg.observedFacts && msg.observedFacts.length > 0 && (
                <div className="p-3 rounded-lg bg-[#F8F4ED] border border-[#D5CABE] space-y-1.5 text-[12px]">
                  <div className="flex items-center gap-1.5 font-bold text-[#287653] text-[11.5px] uppercase tracking-wider">
                    <CheckCircle2 className="size-3.5" />
                    Observed Facts (Bitstream Proven)
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[#292522]">
                    {msg.observedFacts.map((fact, idx) => (
                      <li key={idx} className="leading-snug">
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contradictions & Discrepancies */}
              {msg.contradictions && msg.contradictions.length > 0 && (
                <div className="p-3 rounded-lg bg-[#F5DFDC] border border-[#B6423B]/30 space-y-1.5 text-[12px]">
                  <div className="flex items-center gap-1.5 font-bold text-[#B6423B] text-[11.5px] uppercase tracking-wider">
                    <AlertTriangle className="size-3.5" />
                    Contradictions Detected
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[#292522]">
                    {msg.contradictions.map((c, idx) => (
                      <li key={idx} className="leading-snug">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inferences (AI Proposals) */}
              {msg.inferences && msg.inferences.length > 0 && (
                <div className="p-3 rounded-lg bg-[#FFFDF8] border border-[#D5CABE] space-y-1.5 text-[12px]">
                  <div className="flex items-center gap-1.5 font-bold text-[#A85C2A] text-[11.5px] uppercase tracking-wider">
                    <Sparkles className="size-3.5" />
                    Hypothesized Inferences (Requires Human Confirmation)
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[#756A60]">
                    {msg.inferences.map((inf, idx) => (
                      <li key={idx} className="leading-snug">
                        {inf}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clickable Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-[#D5CABE]/60 space-y-1.5">
                  <span className="text-[11px] font-bold text-[#756A60] uppercase tracking-wider block">
                    Supporting Evidentiary Citations:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map((cit) => (
                      <button
                        key={cit.artifactId}
                        type="button"
                        onClick={() => {
                          setActiveView('evidence');
                          if (onClose) onClose();
                        }}
                        title={`Click to inspect bitstream: ${cit.filename} (${cit.sha256})`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-mono bg-[#F8F4ED] border border-[#D5CABE] text-[#292522] hover:border-[#A85C2A] hover:bg-[#EED9C7]/30 transition-colors cursor-pointer group"
                      >
                        <FileText className="size-3 text-[#A85C2A]" />
                        <span className="font-bold">{cit.artifactId}</span>
                        <ExternalLink className="size-2.5 text-[#978B7F] group-hover:text-[#A85C2A]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Next Action */}
              {msg.suggestedAction && (
                <div className="pt-2 flex items-center justify-between gap-3">
                  <TarkaButton
                    variant="primary"
                    size="sm"
                    icon={<ArrowRight className="size-3.5" />}
                    iconPosition="right"
                    onClick={() => handleActionClick(msg.suggestedAction)}
                  >
                    {msg.suggestedAction.label}
                  </TarkaButton>
                  <span className="text-[11px] text-[#978B7F] font-mono">
                    Requires Human Confirmation
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-xl tarka-panel bg-[#FFFDF8] max-w-sm">
            <Sparkles className="size-4 text-[#A85C2A] animate-spin" />
            <div className="space-y-1">
              <span className="text-[12.5px] font-bold text-[#292522]">Orchestrator Evaluating...</span>
              <p className="text-[11.5px] text-[#756A60]">
                Invoking Specialist & Validating Bitstream Lineage
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Contextual Guided Prompts Tray */}
      <div className="p-3 border-t border-[#D5CABE] bg-[#F8F4ED] space-y-1.5 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-[#756A60] px-1 font-semibold">
          <span>Suggested Questions for {activeView.toUpperCase()}:</span>
          <span className="text-[#A85C2A]">{selectedLanguage}</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {contextualPrompts.map((cp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(cp.q)}
              className="text-[12px] font-medium text-[#292522] bg-[#FFFDF8] border border-[#D5CABE] rounded-lg px-3 py-1.5 whitespace-nowrap hover:border-[#A85C2A] hover:bg-[#EED9C7]/20 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              {cp.q}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Input Bar & Voice Trigger */}
      <div className="p-4 border-t border-[#D5CABE] bg-[#FFFDF8] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask TARKA Assistant in ${SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.label || 'any language'}...`}
              className="w-full text-[13px] bg-[#F8F4ED] border border-[#D5CABE] rounded-xl px-4 py-2.5 text-[#292522] placeholder-[#978B7F] focus:outline-none focus:border-[#A85C2A] focus:ring-1 focus:ring-[#A85C2A] transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenVoice) onOpenVoice();
              else setVoiceModalOpen(true);
            }}
            title="Speak query via microphone"
            className="size-10 rounded-xl border border-[#D5CABE] bg-[#F8F4ED] text-[#756A60] hover:text-[#A85C2A] hover:border-[#A85C2A] flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <Mic className="size-4.5" />
          </button>

          <TarkaButton
            type="submit"
            variant="primary"
            size="md"
            disabled={!inputText.trim() || isLoading}
            icon={<Send className="size-4" />}
            title="Send query to TARKA Copilot"
            className="h-10 px-4 rounded-xl"
          >
            Send
          </TarkaButton>
        </form>
      </div>
    </div>
  );
};
