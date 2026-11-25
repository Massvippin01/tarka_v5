import { useSettingsStore, type UiLanguage } from "../store/useSettingsStore";

export const DICTIONARY: Record<UiLanguage, Record<string, string>> = {
  en: {
    // Top-Level Navigation
    "nav.dashboard": "Command Center",
    "nav.workspaces": "All Cases",
    "nav.workbench": "Workbench",
    "nav.intake": "Exhibit Ledger",
    "nav.entities": "Entity Extraction",
    "nav.taint": "Taint Engine",
    "nav.network": "Fraud Network",
    "nav.attribution": "Attribution",
    "nav.report": "Court Dossier & Report",
    "nav.actions": "Recommended Actions",
    "nav.settings": "Settings & Administration",

    // Roles
    "role.investigator": "Frontline Investigator",
    "role.supervisor": "Supervisory Officer",
    "role.admin": "System Administrator",

    // Financial & Status Metrics
    "metric.booked_loss": "Total Booked Fraud Loss",
    "metric.claimed_loss": "Claimed Loss",
    "metric.recoverable": "Mandated Recoverable Pool",
    "metric.frozen": "Secured Debit Lien (§107)",
    "metric.golden_hour": "Golden Hour SLA Countdown",
    "metric.active_cases": "Active Investigations",
    "metric.contained": "100% Contained (Secured)",

    // Common Buttons & Actions
    "action.save": "Save Changes",
    "action.saved": "Settings Saved",
    "action.cancel": "Cancel",
    "action.reset_defaults": "Reset to Default",
    "action.reset_demo": "Reset Demo Data",
    "action.simulate_bank": "Simulate Bank Response",
    "action.export_json": "Export Case (JSON)",
    "action.import_json": "Import Case (JSON)",
    "action.clear_cache": "Clear Local Cache",

    // Section Titles
    "settings.profile_role": "Officer Profile & Operational Role",
    "settings.station_jurisdiction": "Station & Jurisdictional Letterhead",
    "settings.appearance": "Display Theme & Interface Language",
    "settings.investigation_defaults": "Statutory Investigation Thresholds & SLA",
    "settings.ai_scoring": "AI Engine & Mule Detection Weights",
    "settings.data_demo": "Data Architecture & Demo Controls",
    "settings.notifications": "Real-Time Urgency & Compliance Alerts",
    "settings.shortcuts": "Keyboard Shortcuts & Operational Keys",
  },
  hi: {
    // Top-Level Navigation
    "nav.dashboard": "कमांड सेंटर",
    "nav.workspaces": "सभी मामले",
    "nav.workbench": "कार्यक्षेत्र",
    "nav.intake": "साक्ष्य लेजर",
    "nav.entities": "पहचान निष्कर्षण",
    "nav.taint": "ट्रैकिंग इंजन",
    "nav.network": "धोखाधड़ी नेटवर्क",
    "nav.attribution": "दोषारोपण",
    "nav.report": "अदालत साक्ष्य एवं रिपोर्ट",
    "nav.actions": "अनुशंसित कार्रवाई",
    "nav.settings": "सेटिंग्स एवं प्रशासन",

    // Roles
    "role.investigator": "जांच अधिकारी (IO)",
    "role.supervisor": "पर्यवेक्षक अधिकारी (SHO/ACP)",
    "role.admin": "सिस्टम प्रशासक",

    // Financial & Status Metrics
    "metric.booked_loss": "कुल दर्ज धोखाधड़ी हानि",
    "metric.claimed_loss": "दावा की गई हानि",
    "metric.recoverable": "वसूली योग्य पूंजी",
    "metric.frozen": "फ्रीज की गई राशि (§107)",
    "metric.golden_hour": "गोल्डन ऑवर उलटी गिनती",
    "metric.active_cases": "सक्रिय जांच मामले",
    "metric.contained": "१००% सुरक्षित (नियंत्रित)",

    // Common Buttons & Actions
    "action.save": "परिवर्तन सहेजें",
    "action.saved": "सेटिंग्स सहेजी गईं",
    "action.cancel": "रद्द करें",
    "action.reset_defaults": "डिफ़ॉल्ट पर रीसेट करें",
    "action.reset_demo": "डेमो डेटा रीसेट करें",
    "action.simulate_bank": "बैंक प्रतिक्रिया अनुकरण",
    "action.export_json": "केस निर्यात करें (JSON)",
    "action.import_json": "केस आयात करें (JSON)",
    "action.clear_cache": "लोकल कैश साफ करें",

    // Section Titles
    "settings.profile_role": "अधिकारी प्रोफ़ाइल एवं परिचालन भूमिका",
    "settings.station_jurisdiction": "थाना एवं क्षेत्राधिकार लेटरहेड",
    "settings.appearance": "डिस्प्ले थीम एवं इंटरफ़ेस भाषा",
    "settings.investigation_defaults": "वैधानिक जांच सीमाएं एवं SLA",
    "settings.ai_scoring": "एआई इंजन एवं म्यूल स्कोरिंग भार",
    "settings.data_demo": "डेटा वास्तुकला एवं डेमो नियंत्रण",
    "settings.notifications": "त्वरित सूचनाएं एवं सतर्कताएं",
    "settings.shortcuts": "कीबोर्ड शॉर्टकट एवं त्वरित कुंजी",
  },
};

/**
 * Hook to translate keys based on currently active language in useSettingsStore.
 */
export function useTranslation() {
  const language = useSettingsStore((s) => s.appearance.language);

  const t = (key: string, defaultText?: string): string => {
    const dict = DICTIONARY[language] || DICTIONARY.en;
    return dict[key] || defaultText || key;
  };

  return { t, language };
}

