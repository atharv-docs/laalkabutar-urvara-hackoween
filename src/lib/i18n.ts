/**
 * Farmer Portal strings in English, Hindi and Punjabi (Gurmukhi). Short, plain, respectful wording.
 * Owner Portal is English-only for the hackathon.
 */
import type { Language } from "@/types";

const dict = {
  today: { en: "Today", hi: "आज", pa: "ਅੱਜ" },
  report: { en: "Speak", hi: "बोलें", pa: "ਬੋਲੋ" },
  fields: { en: "My fields", hi: "मेरे खेत", pa: "ਮੇਰੇ ਖੇਤ" },
  score: { en: "My record", hi: "मेरा रिकॉर्ड", pa: "ਮੇਰਾ ਰਿਕਾਰਡ" },
  settings: { en: "Settings", hi: "सेटिंग", pa: "ਸੈਟਿੰਗ" },
  greeting: { en: "Namaste", hi: "नमस्ते", pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ" },
  tapToSpeak: { en: "Tap and speak", hi: "दबाएं और बोलें", pa: "ਦਬਾਓ ਤੇ ਬੋਲੋ" },
  speakHint: { en: "Report a problem, say a task is done, or ask a question", hi: "समस्या बताएं, काम पूरा होने की खबर दें, या सवाल पूछें", pa: "ਸਮੱਸਿਆ ਦੱਸੋ, ਕੰਮ ਪੂਰਾ ਹੋਣ ਦੀ ਖ਼ਬਰ ਦਿਓ, ਜਾਂ ਸਵਾਲ ਪੁੱਛੋ" },
  tasksToday: { en: "Today's work", hi: "आज के काम", pa: "ਅੱਜ ਦੇ ਕੰਮ" },
  upcoming: { en: "Coming days", hi: "आने वाले दिन", pa: "ਆਉਣ ਵਾਲੇ ਦਿਨ" },
  noTasksToday: { en: "No work assigned for today.", hi: "आज कोई काम नहीं दिया गया है।", pa: "ਅੱਜ ਲਈ ਕੋਈ ਕੰਮ ਨਹੀਂ ਦਿੱਤਾ ਗਿਆ।" },
  noTasksTodayHint: { en: "New work from the owner will appear here.", hi: "मालिक से नया काम यहाँ दिखेगा।", pa: "ਮਾਲਕ ਵੱਲੋਂ ਨਵਾਂ ਕੰਮ ਇੱਥੇ ਦਿਖੇਗਾ।" },
  changed: { en: "Time changed", hi: "समय बदला", pa: "ਸਮਾਂ ਬਦਲਿਆ" },
  overdue: { en: "Not done yet", hi: "अभी बाकी है", pa: "ਹਾਲੇ ਬਾਕੀ ਹੈ" },
  riskWarning: { en: "Disease check needed nearby", hi: "पास में रोग की जांच ज़रूरी", pa: "ਨੇੜੇ ਰੋਗ ਦੀ ਜਾਂਚ ਜ਼ਰੂਰੀ" },
  riskWarningBody: { en: "A crop problem was reported near your field. Look at the lower leaves today.", hi: "आपके खेत के पास फसल की समस्या बताई गई है। आज नीचे की पत्तियां देखें।", pa: "ਤੁਹਾਡੇ ਖੇਤ ਦੇ ਨੇੜੇ ਫ਼ਸਲ ਦੀ ਸਮੱਸਿਆ ਦੱਸੀ ਗਈ ਹੈ। ਅੱਜ ਹੇਠਲੇ ਪੱਤੇ ਦੇਖੋ।" },
  rainWarning: { en: "Rain expected", hi: "बारिश की संभावना", pa: "ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ" },
  rainChance: { en: "chance of rain", hi: "बारिश की संभावना", pa: "ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ" },
  start: { en: "Start work", hi: "काम शुरू करें", pa: "ਕੰਮ ਸ਼ੁਰੂ ਕਰੋ" },
  markDone: { en: "Work done", hi: "काम पूरा", pa: "ਕੰਮ ਪੂਰਾ" },
  cantDo: { en: "Can't do it", hi: "नहीं हो पा रहा", pa: "ਨਹੀਂ ਹੋ ਸਕਦਾ" },
  why: { en: "Why this work?", hi: "यह काम क्यों?", pa: "ਇਹ ਕੰਮ ਕਿਉਂ?" },
  whatChanged: { en: "What changed", hi: "क्या बदला", pa: "ਕੀ ਬਦਲਿਆ" },
  okGotIt: { en: "OK, got it", hi: "ठीक है, समझ गया", pa: "ਠੀਕ ਹੈ, ਸਮਝ ਗਿਆ" },
  machine: { en: "Machine", hi: "मशीन", pa: "ਮਸ਼ੀਨ" },
  materials: { en: "Materials", hi: "सामग्री", pa: "ਸਮਾਨ" },
  when: { en: "When", hi: "कब", pa: "ਕਦੋਂ" },
  where: { en: "Where", hi: "कहाँ", pa: "ਕਿੱਥੇ" },
  whyBlocked: { en: "What is stopping you?", hi: "क्या रुकावट है?", pa: "ਕੀ ਰੁਕਾਵਟ ਹੈ?" },
  addNote: { en: "Add a short note (optional)", hi: "छोटा नोट लिखें (ज़रूरी नहीं)", pa: "ਛੋਟਾ ਨੋਟ ਲਿਖੋ (ਜ਼ਰੂਰੀ ਨਹੀਂ)" },
  send: { en: "Send", hi: "भेजें", pa: "ਭੇਜੋ" },
  back: { en: "Back", hi: "वापस", pa: "ਪਿੱਛੇ" },
  listening: { en: "Listening… speak now", hi: "सुन रहे हैं… अब बोलें", pa: "ਸੁਣ ਰਹੇ ਹਾਂ… ਹੁਣ ਬੋਲੋ" },
  stop: { en: "Stop", hi: "रोकें", pa: "ਰੋਕੋ" },
  cancel: { en: "Cancel", hi: "रद्द करें", pa: "ਰੱਦ ਕਰੋ" },
  processing: { en: "Understanding what you said…", hi: "आपकी बात समझ रहे हैं…", pa: "ਤੁਹਾਡੀ ਗੱਲ ਸਮਝ ਰਹੇ ਹਾਂ…" },
  checkTranscript: { en: "Is this what you said?", hi: "क्या आपने यही कहा?", pa: "ਕੀ ਤੁਸੀਂ ਇਹੀ ਕਿਹਾ?" },
  editText: { en: "You can fix any word", hi: "आप कोई भी शब्द ठीक कर सकते हैं", pa: "ਤੁਸੀਂ ਕੋਈ ਵੀ ਸ਼ਬਦ ਠੀਕ ਕਰ ਸਕਦੇ ਹੋ" },
  understood: { en: "What Urvara understood", hi: "Urvara ने क्या समझा", pa: "Urvara ਨੇ ਕੀ ਸਮਝਿਆ" },
  confirmSend: { en: "Yes, send report", hi: "हाँ, रिपोर्ट भेजें", pa: "ਹਾਂ, ਰਿਪੋਰਟ ਭੇਜੋ" },
  confirmAsk: { en: "Ask Urvara", hi: "Urvara से पूछें", pa: "Urvara ਨੂੰ ਪੁੱਛੋ" },
  tryAgain: { en: "Speak again", hi: "फिर से बोलें", pa: "ਫਿਰ ਬੋਲੋ" },
  typeInstead: { en: "Type instead", hi: "लिखकर बताएं", pa: "ਲਿਖ ਕੇ ਦੱਸੋ" },
  typeHere: { en: "Type what you want to say", hi: "जो कहना है वह लिखें", pa: "ਜੋ ਕਹਿਣਾ ਹੈ ਉਹ ਲਿਖੋ" },
  samples: { en: "Demo samples", hi: "डेमो उदाहरण", pa: "ਡੈਮੋ ਉਦਾਹਰਣ" },
  samplesHint: { en: "Pre-written phrases for the demo. They are not recordings.", hi: "डेमो के लिए लिखे वाक्य। ये रिकॉर्डिंग नहीं हैं।", pa: "ਡੈਮੋ ਲਈ ਲਿਖੇ ਵਾਕ। ਇਹ ਰਿਕਾਰਡਿੰਗ ਨਹੀਂ ਹਨ।" },
  voiceUnavailable: { en: "Voice input is not available in this browser. Type instead, or use a demo sample.", hi: "इस ब्राउज़र में आवाज़ से लिखना उपलब्ध नहीं है। लिखकर बताएं या डेमो उदाहरण चुनें।", pa: "ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਆਵਾਜ਼ ਨਾਲ ਦੱਸਣਾ ਉਪਲਬਧ ਨਹੀਂ। ਲਿਖ ਕੇ ਦੱਸੋ ਜਾਂ ਡੈਮੋ ਉਦਾਹਰਣ ਵਰਤੋ।" },
  voiceFailed: { en: "We couldn't hear that clearly. Your words are safe; try again or type.", hi: "आवाज़ साफ़ नहीं सुनाई दी। फिर से बोलें या लिखें।", pa: "ਆਵਾਜ਼ ਸਾਫ਼ ਨਹੀਂ ਸੁਣੀ। ਫਿਰ ਬੋਲੋ ਜਾਂ ਲਿਖੋ।" },
  voiceDenied: { en: "Microphone permission was blocked. Allow it in the browser, or type instead.", hi: "माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र में अनुमति दें या लिखें।", pa: "ਮਾਈਕ ਦੀ ਇਜਾਜ਼ਤ ਬੰਦ ਹੈ। ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਇਜਾਜ਼ਤ ਦਿਓ ਜਾਂ ਲਿਖ ਕੇ ਦੱਸੋ।" },
  sent: { en: "Report sent", hi: "रिपोर्ट भेज दी गई", pa: "ਰਿਪੋਰਟ ਭੇਜੀ ਗਈ" },
  sentProblem: { en: "The owner can see it now. It is marked unverified until someone checks the field.", hi: "मालिक अब इसे देख सकते हैं। खेत की जांच होने तक यह 'जांच बाकी' रहेगी।", pa: "ਮਾਲਕ ਹੁਣ ਇਸ ਨੂੰ ਦੇਖ ਸਕਦੇ ਹਨ। ਖੇਤ ਦੀ ਜਾਂਚ ਹੋਣ ਤੱਕ ਇਹ ਅਣਜਾਂਚੀ ਰਹੇਗੀ।" },
  sentDone: { en: "The task is marked done and the owner can see it.", hi: "काम पूरा दर्ज हो गया और मालिक देख सकते हैं।", pa: "ਕੰਮ ਪੂਰਾ ਦਰਜ ਹੋ ਗਿਆ ਅਤੇ ਮਾਲਕ ਦੇਖ ਸਕਦੇ ਹਨ।" },
  sentOther: { en: "The owner can see it now.", hi: "मालिक अब इसे देख सकते हैं।", pa: "ਮਾਲਕ ਹੁਣ ਇਸ ਨੂੰ ਦੇਖ ਸਕਦੇ ਹਨ।" },
  answer: { en: "Answer", hi: "जवाब", pa: "ਜਵਾਬ" },
  basedOn: { en: "Based on", hi: "इस जानकारी से", pa: "ਇਸ ਜਾਣਕਾਰੀ ਤੋਂ" },
  speakAnother: { en: "Speak again", hi: "फिर बोलें", pa: "ਫਿਰ ਬੋਲੋ" },
  goHome: { en: "Back to today", hi: "आज पर वापस", pa: "ਅੱਜ ਤੇ ਵਾਪਸ" },
  kind_problem: { en: "Crop problem", hi: "फसल की समस्या", pa: "ਫ਼ਸਲ ਦੀ ਸਮੱਸਿਆ" },
  kind_completion: { en: "Work completed", hi: "काम पूरा हुआ", pa: "ਕੰਮ ਪੂਰਾ ਹੋਇਆ" },
  kind_resource_request: { en: "Need something", hi: "कुछ चाहिए", pa: "ਕੁਝ ਚਾਹੀਦਾ ਹੈ" },
  kind_question: { en: "Question", hi: "सवाल", pa: "ਸਵਾਲ" },
  kind_condition: { en: "Field update", hi: "खेत की जानकारी", pa: "ਖੇਤ ਦੀ ਖ਼ਬਰ" },
  field: { en: "Field", hi: "खेत", pa: "ਖੇਤ" },
  crop: { en: "Crop", hi: "फसल", pa: "ਫ਼ਸਲ" },
  problem: { en: "Problem", hi: "समस्या", pa: "ਸਮੱਸਿਆ" },
  howBad: { en: "How bad is it?", hi: "कितना गंभीर?", pa: "ਕਿੰਨੀ ਗੰਭੀਰ ਹੈ?" },
  sev_low: { en: "A little", hi: "थोड़ा", pa: "ਥੋੜ੍ਹੀ" },
  sev_medium: { en: "Some plants", hi: "कुछ पौधे", pa: "ਕੁਝ ਪੌਦੇ" },
  sev_high: { en: "Spreading", hi: "फैल रहा है", pa: "ਫੈਲ ਰਹੀ ਹੈ" },
  needs: { en: "Needs", hi: "ज़रूरत", pa: "ਲੋੜ" },
  willMarkDone: { en: "Will mark as done", hi: "पूरा दर्ज होगा", pa: "ਪੂਰਾ ਦਰਜ ਹੋਵੇਗਾ" },
  noMatchingTask: { en: "No matching open task found; this will be sent as an update.", hi: "मिलता-जुलता काम नहीं मिला; यह जानकारी के रूप में भेजा जाएगा।", pa: "ਮਿਲਦਾ ਖੁੱਲ੍ਹਾ ਕੰਮ ਨਹੀਂ ਮਿਲਿਆ; ਇਹ ਖ਼ਬਰ ਵਜੋਂ ਭੇਜਿਆ ਜਾਵੇਗਾ।" },
  soilMoisture: { en: "Soil moisture", hi: "मिट्टी की नमी", pa: "ਮਿੱਟੀ ਦੀ ਨਮੀ" },
  dry: { en: "Dry", hi: "सूखा", pa: "ਸੁੱਕਾ" },
  wet: { en: "Wet", hi: "गीला", pa: "ਗਿੱਲਾ" },
  okay: { en: "OK", hi: "ठीक", pa: "ਠੀਕ" },
  stage: { en: "Stage", hi: "अवस्था", pa: "ਪੜਾਅ" },
  recentReports: { en: "My recent reports", hi: "मेरी हाल की रिपोर्ट", pa: "ਮੇਰੀਆਂ ਹਾਲੀਆ ਰਿਪੋਰਟਾਂ" },
  unverified: { en: "Waiting for check", hi: "जांच बाकी", pa: "ਜਾਂਚ ਬਾਕੀ" },
  reviewed: { en: "Seen by owner", hi: "मालिक ने देखा", pa: "ਮਾਲਕ ਨੇ ਦੇਖੀ" },
  dismissed: { en: "Closed", hi: "बंद", pa: "ਬੰਦ" },
  language: { en: "Language", hi: "भाषा", pa: "ਭਾਸ਼ਾ" },
  signOut: { en: "Sign out", hi: "बाहर निकलें", pa: "ਸਾਈਨ ਆਊਟ" },
  recordTitle: { en: "My crop record", hi: "मेरा फसल रिकॉर्ड", pa: "ਮੇਰਾ ਫ਼ਸਲ ਰਿਕਾਰਡ" },
  recordHint: {
    en: "Rupee Score is a 0–100 record of your work for each crop. It is not money. It is a demo method and must not decide wages or jobs.",
    hi: "रुपया स्कोर हर फसल के लिए आपके काम का 0–100 रिकॉर्ड है। यह पैसा नहीं है। यह डेमो तरीका है और इससे मज़दूरी या नौकरी तय नहीं होनी चाहिए।",
    pa: "ਰੁਪਈਆ ਸਕੋਰ ਹਰ ਫ਼ਸਲ ਲਈ ਤੁਹਾਡੇ ਕੰਮ ਦਾ 0–100 ਰਿਕਾਰਡ ਹੈ। ਇਹ ਪੈਸਾ ਨਹੀਂ ਹੈ। ਇਹ ਡੈਮੋ ਤਰੀਕਾ ਹੈ ਅਤੇ ਇਸ ਨਾਲ ਮਜ਼ਦੂਰੀ ਜਾਂ ਨੌਕਰੀ ਤੈਅ ਨਹੀਂ ਹੋਣੀ ਚਾਹੀਦੀ।",
  },
  notEnoughData: { en: "Not enough data yet", hi: "अभी पर्याप्त जानकारी नहीं", pa: "ਹਾਲੇ ਕਾਫ਼ੀ ਡੇਟਾ ਨਹੀਂ" },
  whatCounts: { en: "What counts", hi: "क्या गिना जाता है", pa: "ਕੀ ਗਿਣਿਆ ਜਾਂਦਾ ਹੈ" },
  wrongRecord: { en: "If something looks wrong, tell the owner. They can correct it.", hi: "कुछ गलत लगे तो मालिक को बताएं। वे इसे ठीक कर सकते हैं।", pa: "ਜੇ ਕੁਝ ਗਲਤ ਲੱਗੇ ਤਾਂ ਮਾਲਕ ਨੂੰ ਦੱਸੋ। ਉਹ ਠੀਕ ਕਰ ਸਕਦੇ ਹਨ।" },
  done: { en: "Done", hi: "पूरा", pa: "ਪੂਰਾ" },
  inProgress: { en: "In progress", hi: "चल रहा है", pa: "ਚੱਲ ਰਿਹਾ" },
  blocked: { en: "Stopped", hi: "रुका हुआ", pa: "ਰੁਕਿਆ" },
  scheduled: { en: "To do", hi: "करना है", pa: "ਕਰਨਾ ਹੈ" },
  voiceLanguageNote: { en: "Your voice is understood in your language (Sarvam AI). Works best in Chrome.", hi: "आपकी आवाज़ आपकी भाषा में समझी जाती है (Sarvam AI)। Chrome में सबसे अच्छा चलता है।", pa: "ਆਵਾਜ਼ ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ ਸਮਝੀ ਜਾਂਦੀ ਹੈ (Sarvam AI)। ਸਭ ਤੋਂ ਵਧੀਆ Chrome ਵਿੱਚ ਚੱਲਦੀ ਹੈ।" },
  speechOutput: { en: "Read answers aloud", hi: "जवाब बोलकर सुनाएं", pa: "ਜਵਾਬ ਬੋਲ ਕੇ ਸੁਣਾਓ" },
  listen: { en: "Listen", hi: "सुनें", pa: "ਸੁਣੋ" },
  demoSampleTag: { en: "Demo sample, not a recording", hi: "डेमो उदाहरण, रिकॉर्डिंग नहीं", pa: "ਡੈਮੋ ਉਦਾਹਰਣ, ਰਿਕਾਰਡਿੰਗ ਨਹੀਂ" },
  voiceTag: { en: "From your voice", hi: "आपकी आवाज़ से", pa: "ਤੁਹਾਡੀ ਆਵਾਜ਼ ਤੋਂ" },
  typedTag: { en: "Typed", hi: "लिखा हुआ", pa: "ਲਿਖਿਆ ਹੋਇਆ" },
} as const;

export type I18nKey = keyof typeof dict;

export function tr(lang: Language, key: I18nKey): string {
  return dict[key][lang];
}

/** Each language named in its own script, for pickers and labels. */
export const LANGUAGE_NAME: Record<Language, string> = { en: "English", hi: "हिंदी", pa: "ਪੰਜਾਬੀ" };

/** Seeded or generated text in the farmer's language, falling back to English when there is no translation. */
export function pick(lang: Language, en: string, hi?: string, pa?: string): string {
  return (lang === "hi" ? hi : lang === "pa" ? pa : undefined) ?? en;
}

export function useT(lang: Language) {
  return (key: I18nKey) => dict[key][lang];
}
