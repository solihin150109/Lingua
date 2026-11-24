import type {
  AchievementBadge,
  GrammarTopic,
  SpeakingGuideScript,
  TutorPersona,
  VocabularyItem,
  VocabularySentence,
} from '../types/lingua';

export const TUTOR_PERSONAS: TutorPersona[] = [
  {
    id: 'emma',
    name: 'Emma',
    roleTitle: 'Friendly American English Tutor',
    avatarUrl: '/src/assets/images/tutor_emma_1795357906189.jpg',
    accent: 'American',
    personality: 'Warm, encouraging, and conversational. Uses everyday idioms gently.',
    speakingSpeed: 'normal',
    teachingStyle: 'Conversational scaffolding with gentle natural phrasing upgrades',
    expertise: ['Daily Conversation', 'Pronunciation Clarity', 'Natural Phrasal Verbs'],
    voiceName: 'Kore',
    greeting: "Hi there! I'm Emma. Let's have a relaxed English chat—no pressure at all!",
  },
  {
    id: 'james',
    name: 'James',
    roleTitle: 'Professional British English Tutor',
    avatarUrl: '/src/assets/images/tutor_james_1795357908032.jpg',
    accent: 'British',
    personality: 'Articulate, structured, and polite. Focuses on precision and register.',
    speakingSpeed: 'normal',
    teachingStyle: 'Structured feedback on grammar precision and formal British usage',
    expertise: ['British Pronunciation', 'Academic Writing', 'Formal Communication'],
    voiceName: 'Charon',
    greeting: "Good day! I'm James from London. Ready to polish your clarity and confidence?",
  },
  {
    id: 'oliver',
    name: 'Oliver',
    roleTitle: 'Casual Conversation Partner',
    avatarUrl: '/src/assets/images/tutor_oliver_1795357907651.jpg',
    accent: 'American',
    personality: 'Upbeat, curious, and laid-back. Great for building speaking fluency.',
    speakingSpeed: 'natural',
    teachingStyle: 'Fast-flowing dialogue with real-world slang and reaction expressions',
    expertise: ['Small Talk', 'Travel & Culture', 'Fluency & Storytelling'],
    voiceName: 'Puck',
    greeting: "Hey! I'm Oliver. Tell me what's going on in your week and let's get speaking!",
  },
  {
    id: 'sophia',
    name: 'Sophia',
    roleTitle: 'Patient English Teacher',
    avatarUrl: '/src/assets/images/tutor_sophia_1795357907564.jpg',
    accent: 'American',
    personality: 'Calm, patient, and methodical. Breaks down tricky grammar clearly.',
    speakingSpeed: 'slow',
    teachingStyle: 'Step-by-step pacing with clear Indonesian bridge explanations when asked',
    expertise: ['Beginner Foundations', 'Tense Mastery', 'Confidence Building'],
    voiceName: 'Zephyr',
    greeting: "Hello! I'm Sophia. Take your time with every sentence—we'll grow step by step.",
  },
  {
    id: 'daniel',
    name: 'Daniel',
    roleTitle: 'Business English Specialist',
    avatarUrl: '/src/assets/images/tutor_daniel_1795357907170.jpg',
    accent: 'American',
    personality: 'Sharp, executive, and goal-oriented. Ideal for meetings and interviews.',
    speakingSpeed: 'normal',
    teachingStyle: 'Executive coaching for persuasion, concise answers, and interview impact',
    expertise: ['Job Interviews', 'Client Presentations', 'Negotiation English'],
    voiceName: 'Fenrir',
    greeting: "Welcome. I'm Daniel. Let's sharpen your executive presence and business vocabulary.",
  },
];

export const TUTOR_MODES = [
  'Friendly Conversation',
  'Professional Tutor',
  'Strict Practice',
  'Interview Practice',
  'Free Speaking',
] as const;

export const COMMUNITY_TOPICS = [
  'Greeting & Seating',
  'Taking Food & Drink Orders',
  'Menu & Allergy Recommendations',
  'Room Service Call',
  'Handling Complaints Politely',
  'Payment & Farewell',
] as const;

export const SPEAKING_TOPIC_SCRIPTS: Record<string, SpeakingGuideScript> = {
  'Greeting & Seating': {
    topic: 'Greeting & Seating',
    roleA: 'Waiter',
    roleB: 'Guest',
    starterPrompts: [
      { speakerRole: 'A', line: 'Good evening and welcome to Grand Terrace. Have you booked a reservation?', translationId: 'Selamat malam, selamat datang di Grand Terrace. Apakah Anda sudah reservasi?' },
      { speakerRole: 'B', line: 'Yes, we have a reservation for two under Mr. Tanaka at 7 p.m.', translationId: 'Ya, kami punya reservasi untuk dua orang atas nama Bapak Tanaka jam 7 malam.' },
      { speakerRole: 'A', line: 'Right this way, please. Would you prefer indoor seating or a table by the window?', translationId: 'Silakan lewat sini. Apakah Anda lebih suka di dalam ruangan atau meja dekat jendela?' },
      { speakerRole: 'B', line: 'A table by the window would be lovely, thank you.', translationId: 'Meja dekat jendela sangat bagus, terima kasih.' },
      { speakerRole: 'A', line: 'Here are your menus. May I start you off with still or sparkling water?', translationId: 'Ini buku menunya. Bolehkah saya mulai dengan air mineral biasa atau bersoda?' },
      { speakerRole: 'B', line: 'Still water with lemon, please. We will look over the menu for a moment.', translationId: 'Air mineral biasa dengan lemon. Kami lihat menunya sebentar ya.' },
    ],
    vocabularyHints: [
      { word: 'reservation', meaningId: 'pemesanan meja' },
      { word: 'indoor seating', meaningId: 'tempat duduk dalam ruangan' },
      { word: 'by the window', meaningId: 'di dekat jendela' },
      { word: 'still or sparkling', meaningId: 'air biasa atau bersoda' },
      { word: 'look over', meaningId: 'melihat-lihat (menu)' },
    ],
    suggestedResponses: [
      'Right this way, please follow me.',
      'May I take your coats?',
      'Take your time reviewing the menu.',
    ],
  },
  'Taking Food & Drink Orders': {
    topic: 'Taking Food & Drink Orders',
    roleA: 'Waiter',
    roleB: 'Guest',
    starterPrompts: [
      { speakerRole: 'A', line: 'Are you ready to order, or do you need a few more minutes?', translationId: 'Apakah Anda sudah siap memesan, atau masih butuh beberapa menit?' },
      { speakerRole: 'B', line: 'We are ready. I would like the caesar salad and the grilled ribeye steak.', translationId: 'Kami sudah siap. Saya mau salad caesar dan steak ribeye panggang.' },
      { speakerRole: 'A', line: 'Certainly. How would you like your steak cooked—medium rare or medium well?', translationId: 'Baik. Tingkat kematangan steak yang Anda inginkan medium rare atau medium well?' },
      { speakerRole: 'B', line: 'Medium rare, please, with mashed potatoes on the side.', translationId: 'Medium rare saja, dengan kentang tumbuk sebagai pendamping.' },
      { speakerRole: 'A', line: 'Would you care for a beverage with your meal, such as iced tea or juice?', translationId: 'Apakah Anda ingin memesan minuman seperti es teh atau jus?' },
      { speakerRole: 'B', line: 'Fresh orange juice without sugar, please. Thank you!', translationId: 'Jus jeruk segar tanpa gula, terima kasih!' },
    ],
    vocabularyHints: [
      { word: 'ready to order', meaningId: 'siap memesan' },
      { word: 'medium rare', meaningId: 'setengah matang' },
      { word: 'on the side', meaningId: 'disajikan terpisah' },
      { word: 'beverage', meaningId: 'minuman' },
      { word: 'certainly', meaningId: 'tentu saja / baik' },
    ],
    suggestedResponses: [
      'Allow me to repeat your order.',
      'Your drinks will arrive shortly.',
      'Would you like dressing on the side?',
    ],
  },
  'Menu & Allergy Recommendations': {
    topic: 'Menu & Allergy Recommendations',
    roleA: 'Waiter',
    roleB: 'Guest',
    starterPrompts: [
      { speakerRole: 'A', line: 'Tonight our chef recommends the grilled sea bass with lemon butter sauce.', translationId: 'Malam ini chef kami merekomendasikan ikan sea bass panggang saus mentega lemon.' },
      { speakerRole: 'B', line: 'That sounds delicious, but I have an allergy to nuts and shellfish.', translationId: 'Kedengarannya lezat, tapi saya alergi kacang dan kerang/udang.' },
      { speakerRole: 'A', line: 'Thank you for letting me know. The sea bass is completely nut-free and shellfish-free.', translationId: 'Terima kasih sudah memberi tahu. Sea bass ini bebas kacang dan bebas kerang.' },
      { speakerRole: 'B', line: 'Great! Could the kitchen prepare it with olive oil instead of butter?', translationId: 'Bagus! Bisakah dapur memasaknya dengan minyak zaitun bukan mentega?' },
      { speakerRole: 'A', line: 'Of course. I will inform the chef immediately so your dish is safe.', translationId: 'Tentu saja. Saya akan segera menginformasikan chef agar hidangan Anda aman.' },
      { speakerRole: 'B', line: 'I really appreciate your careful attention.', translationId: 'Saya sangat menghargai perhatian teliti Anda.' },
    ],
    vocabularyHints: [
      { word: 'recommend', meaningId: 'merekomendasikan' },
      { word: 'allergy', meaningId: 'alergi' },
      { word: 'nut-free', meaningId: 'bebas kacang' },
      { word: 'instead of', meaningId: 'sebagai pengganti' },
      { word: 'inform the chef', meaningId: 'memberi tahu koki' },
    ],
    suggestedResponses: [
      'Are there any food allergies at the table?',
      'We use separate pans for allergy orders.',
      'May I suggest a mild, dairy-free option?',
    ],
  },
  'Room Service Call': {
    topic: 'Room Service Call',
    roleA: 'Waiter',
    roleB: 'Guest',
    starterPrompts: [
      { speakerRole: 'A', line: 'Good evening, room service speaking. May I have your room number, please?', translationId: 'Selamat malam, room service berbicara. Boleh saya tahu nomor kamar Anda?' },
      { speakerRole: 'B', line: 'Hello, this is Room 512. Can I order a club sandwich and hot tea?', translationId: 'Halo, ini Kamar 512. Bisakah saya pesan club sandwich dan teh panas?' },
      { speakerRole: 'A', line: 'Certainly, Room 512. Would you like chamomile or English breakfast tea?', translationId: 'Baik, Kamar 512. Apakah Anda mau teh chamomile atau English breakfast?' },
      { speakerRole: 'B', line: 'Chamomile tea, please. How long will delivery take?', translationId: 'Teh chamomile saja. Berapa lama pengantarannya?' },
      { speakerRole: 'A', line: 'Your tray will arrive within twenty minutes. Should we charge it to your room?', translationId: 'Nampan Anda akan tiba dalam 20 menit. Apakah tagihannya masuk ke kamar?' },
      { speakerRole: 'B', line: 'Yes, please charge it to Room 512. Thank you.', translationId: 'Ya, tolong tagihkan ke Kamar 512. Terima kasih.' },
    ],
    vocabularyHints: [
      { word: 'room service', meaningId: 'layanan makan ke kamar' },
      { word: 'tray', meaningId: 'nampan makanan' },
      { word: 'within twenty minutes', meaningId: 'dalam 20 menit' },
      { word: 'charge to room', meaningId: 'masukkan tagihan kamar' },
      { word: 'cutlery', meaningId: 'alat makan' },
    ],
    suggestedResponses: [
      'Thank you for calling room service.',
      'May I confirm your suite number?',
      'Please sign the room slip on delivery.',
    ],
  },
  'Handling Complaints Politely': {
    topic: 'Handling Complaints Politely',
    roleA: 'Waiter',
    roleB: 'Guest',
    starterPrompts: [
      { speakerRole: 'A', line: 'Excuse me, how is everything tasting with your main course so far?', translationId: 'Permisi, bagaimana rasa hidangan utama Anda sejauh ini?' },
      { speakerRole: 'B', line: 'Actually, my tomato soup arrived lukewarm and my steak is a bit overcooked.', translationId: 'Sebenarnya, sup tomat saya agak dingin dan steak saya terlalu matang.' },
      { speakerRole: 'A', line: 'I sincerely apologize for that. Please let me replace both right away.', translationId: 'Saya mohon maaf sebesar-besarnya. Izinkan saya segera mengganti keduanya.' },
      { speakerRole: 'B', line: 'Thank you, I would appreciate a hotter soup and a medium rare steak.', translationId: 'Terima kasih, saya ingin sup yang lebih panas dan steak medium rare.' },
      { speakerRole: 'A', line: 'Right away. While you wait, please enjoy a complimentary juice on the house.', translationId: 'Segera kami siapkan. Sambil menunggu, silakan nikmati jus gratis dari kami.' },
      { speakerRole: 'B', line: 'Thank you for handling that so quickly and politely.', translationId: 'Terima kasih sudah menanganinya dengan cepat dan sopan.' },
    ],
    vocabularyHints: [
      { word: 'apologize', meaningId: 'meminta maaf' },
      { word: 'lukewarm', meaningId: 'suam-suam kuku / kurang panas' },
      { word: 'replace', meaningId: 'mengganti dengan yang baru' },
      { word: 'complimentary', meaningId: 'gratis (dari restoran)' },
      { word: 'right away', meaningId: 'segera / sekarang juga' },
    ],
    suggestedResponses: [
      'I sincerely apologize for the delay.',
      'Let me bring a fresh plate immediately.',
      'Thank you for bringing this to my attention.',
    ],
  },
  'Payment & Farewell': {
    topic: 'Payment & Farewell',
    roleA: 'Waiter',
    roleB: 'Guest',
    starterPrompts: [
      { speakerRole: 'A', line: 'Did you enjoy your meal tonight? Would you care for dessert or espresso?', translationId: 'Apakah Anda menikmati makan malamnya? Apakah mau hidangan penutup atau espresso?' },
      { speakerRole: 'B', line: 'Everything was great, thank you. Could we have the bill, please?', translationId: 'Semuanya enak, terima kasih. Boleh kami minta tagihannya?' },
      { speakerRole: 'A', line: 'Of course. Would you prefer to pay together or split the bill?', translationId: 'Tentu. Apakah Anda ingin bayar gabung atau pisah tagihan?' },
      { speakerRole: 'B', line: 'We will pay together by credit card, and please print an itemized receipt.', translationId: 'Kami bayar gabung pakai kartu kredit, dan tolong cetak struk rincian.' },
      { speakerRole: 'A', line: 'Here is the terminal—kindly tap your card. Your receipt is inside the folder.', translationId: 'Ini mesin kartunya—silakan tap kartu Anda. Struk ada di dalam map.' },
      { speakerRole: 'B', line: 'Thank you so much for the warm service. Have a good evening!', translationId: 'Terima kasih banyak atas pelayanan hangatnya. Selamat malam!' },
    ],
    vocabularyHints: [
      { word: 'bill / check', meaningId: 'tagihan makanan' },
      { word: 'split the bill', meaningId: 'membagi tagihan' },
      { word: 'itemized receipt', meaningId: 'struk rincian' },
      { word: 'tap your card', meaningId: 'tempelkan kartu Anda' },
      { word: 'pleasant evening', meaningId: 'malam yang menyenangkan' },
    ],
    suggestedResponses: [
      'Here is your bill whenever you are ready.',
      'Would you like to charge it to your room?',
      'We hope to welcome you back soon!',
    ],
  },
};

export interface BasicGrammarDefinition {
  id: string;
  name: string;
  shortLabel: string;
  formula: string;
  explanationId: string;
  whenToUseId: string;
}

export const BASIC_GRAMMAR_STRUCTURES: BasicGrammarDefinition[] = [
  {
    id: 'simple-present',
    name: 'Simple Present',
    shortLabel: 'Menu & Rutinitas',
    formula: 'Subject + V1(s/es) / (am, is, are)',
    explanationId: 'Menjelaskan menu tetap, jam buka restoran, dan SOP layanan harian.',
    whenToUseId: 'every day, always, usually, include',
  },
  {
    id: 'present-continuous',
    name: 'Present Continuous',
    shortLabel: 'Sedang Diproses',
    formula: 'Subject + am/is/are + V-ing',
    explanationId: 'Menjelaskan pesanan yang sedang dimasak, disiapkan, atau diantar sekarang.',
    whenToUseId: 'right now, at the moment, currently',
  },
  {
    id: 'simple-past',
    name: 'Simple Past',
    shortLabel: 'Pesanan Selesai',
    formula: 'Subject + V2 / (was, were)',
    explanationId: 'Menjelaskan pesanan yang sudah dicatat, disajikan, atau terjadi tadi.',
    whenToUseId: 'earlier, ten minutes ago, yesterday',
  },
  {
    id: 'simple-future',
    name: 'Simple Future',
    shortLabel: 'Janji Layanan',
    formula: 'Subject + will / (am/is/are going to) + V1',
    explanationId: 'Menyatakan kesiapan waiter melayani atau estimasi waktu hidangan siap.',
    whenToUseId: 'right away, shortly, in 10 minutes',
  },
  {
    id: 'present-perfect',
    name: 'Present Perfect',
    shortLabel: 'Sudah Siap / Tiba',
    formula: 'Subject + have/has + V3',
    explanationId: 'Mengonfirmasi pesanan sudah siap, catatan alergi sudah diteruskan, atau tamu sudah bayar.',
    whenToUseId: 'already, just, yet, twice',
  },
  {
    id: 'modal-verbs',
    name: 'Modal Verbs',
    shortLabel: 'Tawaran Sopan',
    formula: 'Would / Could / May / Can + Subject/V1',
    explanationId: 'Ungkapan wajib waiter untuk menawarkan menu dan menerima permintaan dengan sopan.',
    whenToUseId: 'Would you like, May I, Could I',
  },
  {
    id: 'imperatives',
    name: 'Imperatives',
    shortLabel: 'Arahan Tamu',
    formula: 'Please / Kindly + V1 + Object',
    explanationId: 'Mengarahkan tamu ke meja, memperingatkan piring panas, dan mempersilakan makan.',
    whenToUseId: 'Please follow me, Enjoy your meal',
  },
];

export const SIMULATOR_SCENARIOS = [
  {
    id: 'greeting-seating',
    title: 'Greeting & Seating Guests',
    subtitle: 'Menyambut & mengantar tamu ke meja',
    userRole: 'Waiter / Server',
    aiRole: 'Restaurant Guest',
    context: 'A guest walks into the hotel restaurant for dinner and wants a quiet table near the window.',
    starterLine: 'Good evening! We have a reservation for two under Mrs. Evans. Could we sit somewhere quiet?',
  },
  {
    id: 'menu-allergy',
    title: 'Menu Advice & Food Allergies',
    subtitle: 'Rekomendasi menu & cek alergi',
    userRole: 'Waiter / Server',
    aiRole: 'Restaurant Guest',
    context: 'The guest asks for today’s chef recommendation and mentions a peanut and dairy allergy.',
    starterLine: 'Excuse me, what dish do you recommend tonight? Just so you know, I am allergic to peanuts and cream.',
  },
  {
    id: 'taking-order',
    title: 'Taking Food & Beverage Orders',
    subtitle: 'Mencatat pesanan makanan & minuman',
    userRole: 'Waiter / Server',
    aiRole: 'Restaurant Guest',
    context: 'You are taking a complete appetizer, main steak temperature, side dish, and drink order.',
    starterLine: 'We are ready to order now. I will have the grilled ribeye steak and sparkling water, please.',
  },
  {
    id: 'room-service',
    title: 'Hotel Room Service Call',
    subtitle: 'Menerima pesanan room service kamar',
    userRole: 'Waiter / Server',
    aiRole: 'Hotel Guest (Room 604)',
    context: 'A hotel guest calls room service at night asking for hot soup, tea, and delivery time.',
    starterLine: 'Hello, this is Room 604. Can I order chicken noodle soup and chamomile tea right now?',
  },
  {
    id: 'complaint-recovery',
    title: 'Handling a Complaint Politely',
    subtitle: 'Menangani keluhan hidangan dengan tenang',
    userRole: 'Waiter / Server',
    aiRole: 'Restaurant Guest',
    context: 'The guest tells you their soup arrived cold and their iced tea tastes too sweet.',
    starterLine: 'Excuse me, my tomato soup is lukewarm, and I asked for iced tea without sugar.',
  },
  {
    id: 'billing-farewell',
    title: 'Splitting the Bill & Farewell',
    subtitle: 'Pembayaran, struk & ucapan perpisahan',
    userRole: 'Waiter / Server',
    aiRole: 'Hotel Guest',
    context: 'The guest wants to split the bill, charge part to their hotel room, and get a receipt.',
    starterLine: 'Dinner was wonderful! Could we get the check and charge half of it to Room 412?',
  },
];

export const PLACEMENT_QUESTIONS = [
  {
    id: 'p1',
    question: 'She _____ to the office by train every morning.',
    options: ['go', 'goes', 'going', 'gone'],
    correctIndex: 1,
    levelWeight: 'A1-A2',
  },
  {
    id: 'p2',
    question: 'While I _____ dinner, my friend called from Jakarta.',
    options: ['cooked', 'was cooking', 'am cooking', 'have cooked'],
    correctIndex: 1,
    levelWeight: 'B1',
  },
  {
    id: 'p3',
    question: 'We have been working on this proposal _____ three weeks.',
    options: ['since', 'for', 'during', 'from'],
    correctIndex: 1,
    levelWeight: 'B1-B2',
  },
  {
    id: 'p4',
    question: 'If she _____ earlier, she would not have missed the keynote.',
    options: ['left', 'has left', 'had left', 'would leave'],
    correctIndex: 2,
    levelWeight: 'B2-C1',
  },
  {
    id: 'p5',
    question: 'Not only _____ the deadline, but the team also exceeded quality benchmarks.',
    options: ['they met', 'did they meet', 'they did meet', 'met they'],
    correctIndex: 1,
    levelWeight: 'C1-C2',
  },
];

export const ACHIEVEMENT_BADGES: AchievementBadge[] = [
  {
    key: 'first_word',
    title: 'First Spark',
    description: 'Added your very first vocabulary entry with AI breakdown.',
    requirementLabel: '1 vocabulary word',
  },
  {
    key: 'first_50_words',
    title: 'First 50 Words',
    description: 'Built a personal lexicon of 50+ vocabulary words.',
    requirementLabel: '50 vocabulary words',
  },
  {
    key: 'word_master',
    title: 'Lexicon Builder',
    description: 'Reached Mastered status on 5 vocabulary entries.',
    requirementLabel: '5 mastered words',
  },
  {
    key: 'grammar_beginner',
    title: 'Grammar Beginner',
    description: 'Completed 3 Grammar Center lessons and quizzes.',
    requirementLabel: '3 grammar lessons',
  },
  {
    key: 'ten_min_speaking',
    title: '10 Minutes Speaking',
    description: 'Completed 10+ minutes of live speaking practice.',
    requirementLabel: '10 speaking minutes',
  },
  {
    key: 'seven_day_streak',
    title: '7-Day Streak',
    description: 'Maintained consistent daily English practice for 7 days.',
    requirementLabel: '7-day streak',
  },
  {
    key: 'confident_speaker',
    title: 'Confident Speaker',
    description: 'Accumulated 60+ minutes of interactive voice conversation.',
    requirementLabel: '60 speaking minutes',
  },
  {
    key: 'sentence_architect',
    title: 'Sentence Architect',
    description: 'Completed 5 AI Sentence Builder evaluations.',
    requirementLabel: '5 sentence builds',
  },
];

export const DAILY_CHALLENGES_POOL = [
  {
    title: 'Use 3 Action Verbs in Present Perfect',
    prompt: 'Write two natural sentences describing something you have accomplished this week using Present Perfect (have/has + V3).',
    targetWords: ['improve', 'build', 'learn'],
    xp: 45,
  },
  {
    title: 'Polite Requests in Daily Conversation',
    prompt: 'Write a polite request you might say at a cafe or meeting using a modal verb ("Could you...", "Would you mind...").',
    targetWords: ['prepare', 'schedule', 'explain'],
    xp: 40,
  },
  {
    title: 'Describe Your Routine Clearly',
    prompt: 'Write two sentences contrasting what you do every morning (Simple Present) with what you are focusing on today (Present Continuous).',
    targetWords: ['focus', 'practice', 'review'],
    xp: 40,
  },
  {
    title: 'Reflect on Past Growth',
    prompt: 'Write a short sentence comparing a challenge you faced last year (Simple Past) with how you handle it now.',
    targetWords: ['overcome', 'improve', 'adapt'],
    xp: 50,
  },
];

export function getTodayChallenge(date: Date = new Date()) {
  const dateKey = date.toISOString().slice(0, 10);
  const dayNum = Math.floor(date.getTime() / 86400000);
  const item = DAILY_CHALLENGES_POOL[dayNum % DAILY_CHALLENGES_POOL.length];
  return { dateKey, ...item };
}

function makeGrammarTopic(
  id: string,
  title: string,
  category: GrammarTopic['category'],
  summary: string,
  simpleExplanation: string,
  formula: string,
  examples: GrammarTopic['examples'],
  commonMistakes: GrammarTopic['commonMistakes'],
  quiz: GrammarTopic['quiz']
): GrammarTopic {
  return { id, title, category, summary, simpleExplanation, formula, examples, commonMistakes, quiz };
}

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  // BASIC GRAMMAR (10)
  makeGrammarTopic(
    'parts-of-speech',
    'Parts of Speech',
    'Basic Grammar',
    '8 kelas kata utama dalam bahasa Inggris untuk menyusun kalimat dengan benar.',
    'Setiap kata dalam bahasa Inggris memiliki peran: Noun (kata benda), Pronoun (kata ganti), Verb (kata kerja), Adjective (kata sifat), Adverb (kata keterangan), Preposition (kata depan), Conjunction (kata hubung), dan Interjection.',
    'Noun / Pronoun + Verb + (Adjective + Noun) + Adverb',
    [
      { english: 'She speaks English clearly.', indonesian: 'Dia berbicara bahasa Inggris dengan jelas.', highlight: 'She (Pronoun) · speaks (Verb) · clearly (Adverb)' },
      { english: 'A patient tutor helps learners.', indonesian: 'Tutor yang sabar membantu para pelajar.', highlight: 'patient (Adj) · tutor (Noun)' },
    ],
    [
      { incorrect: 'She speaks clear.', correct: 'She speaks clearly.', why: 'Gunakan adverb (clearly) untuk menjelaskan kata kerja (speaks), bukan adjective (clear).' },
    ],
    [
      { id: 'q1', question: 'Which word is an adverb in "He answered the question calmly"?', options: ['answered', 'question', 'calmly', 'He'], correctIndex: 2, explanation: '"calmly" describes how he answered (modifies the verb).' },
      { id: 'q2', question: 'What part of speech is "fluency" in "Fluency takes daily practice"?', options: ['Verb', 'Noun', 'Adverb', 'Preposition'], correctIndex: 1, explanation: '"Fluency" is a noun functioning as the subject.' },
    ]
  ),
  makeGrammarTopic(
    'subject-and-predicate',
    'Subject and Predicate',
    'Basic Grammar',
    'Mengenal pelaku/topik kalimat (Subject) dan aksi/kondisinya (Predicate).',
    'Kalimat lengkap selalu punya Subject (siapa/apa yang dibicarakan) dan Predicate (kata kerja + pelengkap yang menjelaskan Subject).',
    'Subject + Predicate (Verb + Object/Complement)',
    [
      { english: 'Our speaking club meets every Thursday.', indonesian: 'Klub berbicara kita bertemu setiap hari Kamis.', highlight: 'Subject: Our speaking club | Predicate: meets every Thursday' },
    ],
    [
      { incorrect: 'Running in the morning very healthy.', correct: 'Running in the morning is very healthy.', why: 'Predicate wajib memiliki kata kerja utama (linking verb "is").' },
    ],
    [
      { id: 'q1', question: 'Identify the subject in "Consistent daily practice builds confidence."', options: ['builds confidence', 'Consistent daily practice', 'confidence', 'daily'], correctIndex: 1, explanation: '"Consistent daily practice" is the noun phrase performing the action.' },
    ]
  ),
  makeGrammarTopic(
    'nouns',
    'Nouns',
    'Basic Grammar',
    'Kata benda countable, uncountable, singular, dan plural.',
    'Countable nouns bisa dihitung (a book, two books), sedangkan uncountable nouns tidak bisa diberi akhiran -s (information, advice, water).',
    'Determiner (a/an/the/some/many/much) + Noun',
    [
      { english: 'She gave me helpful advice.', indonesian: 'Dia memberiku saran yang bermanfaat.', highlight: 'advice (uncountable, tanpa -s)' },
      { english: 'We learned five new phrases today.', indonesian: 'Kami mempelajari lima frasa baru hari ini.', highlight: 'phrases (countable plural)' },
    ],
    [
      { incorrect: 'I need many informations.', correct: 'I need a lot of information.', why: '"information" adalah uncountable noun; tidak memakai -s maupun "many".' },
    ],
    [
      { id: 'q1', question: 'Choose the correct sentence:', options: ['She has many homeworks.', 'She has a lot of homework.', 'She has two homeworks.', 'She has few homework.'], correctIndex: 1, explanation: '"homework" is uncountable, so use "a lot of" or "much", never plural -s.' },
    ]
  ),
  makeGrammarTopic(
    'pronouns',
    'Pronouns',
    'Basic Grammar',
    'Kata ganti subjek, objek, dan kepemilikan (I, me, my, mine).',
    'Gunakan subject pronoun (I, you, he, she, we, they) sebelum kata kerja, dan object pronoun (me, you, him, her, us, them) setelah kata kerja atau preposisi.',
    'Subject Pronoun + Verb + Object Pronoun',
    [
      { english: 'They invited us to join the discussion.', indonesian: 'Mereka mengundang kami untuk bergabung dalam diskusi.', highlight: 'They (Subject) · us (Object)' },
    ],
    [
      { incorrect: 'Between you and I, English is fun.', correct: 'Between you and me, English is fun.', why: 'Setelah preposisi "between", gunakan object pronoun ("me").' },
    ],
    [
      { id: 'q1', question: 'Please send the notes to Sarah and _____.', options: ['I', 'me', 'my', 'mine'], correctIndex: 1, explanation: 'After the preposition "to", use the object pronoun "me".' },
    ]
  ),
  makeGrammarTopic(
    'verbs',
    'Verbs',
    'Basic Grammar',
    'Action verbs, linking verbs, serta bentuk V1, V2, V3, dan V-ing.',
    'Verb menunjukkan aksi (speak, write) atau keadaan (be, seem, feel). Memahami perubahan V1-V2-V3 adalah kunci menguasai semua tenses.',
    'Subject + Auxiliary (optional) + Main Verb',
    [
      { english: 'We write journals to improve our grammar.', indonesian: 'Kami menulis jurnal untuk meningkatkan tata bahasa kami.', highlight: 'write (action verb)' },
    ],
    [
      { incorrect: 'He didn’t went to class yesterday.', correct: 'He didn’t go to class yesterday.', why: 'Setelah "did / didn’t", kata kerja selalu kembali ke bentuk dasar (V1: go).' },
    ],
    [
      { id: 'q1', question: 'Did you _____ the podcast I recommended?', options: ['listened', 'listen to', 'listening', 'listens'], correctIndex: 1, explanation: 'Use base verb V1 ("listen to") after "Did".' },
    ]
  ),
  makeGrammarTopic(
    'adjectives',
    'Adjectives',
    'Basic Grammar',
    'Kata sifat untuk mendeskripsikan noun dan perbandingan (comparative/superlative).',
    'Adjective diletakkan sebelum kata benda (a clear explanation) atau setelah linking verb (the explanation is clear).',
    'Adjective + Noun  |  Subject + be/seem + Adjective',
    [
      { english: 'This lesson is more practical than the previous one.', indonesian: 'Pelajaran ini lebih praktis daripada yang sebelumnya.', highlight: 'more practical (comparative)' },
    ],
    [
      { incorrect: 'She is a woman very smart.', correct: 'She is a very smart woman.', why: 'Adjective selalu berada sebelum noun dalam frasa benda bahasa Inggris.' },
    ],
    [
      { id: 'q1', question: 'Which comparative form is correct?', options: ['more clearer', 'clearer', 'most clear than', 'clearliest'], correctIndex: 1, explanation: 'Short 1-syllable adjectives take -er ("clearer"), not "more".' },
    ]
  ),
  makeGrammarTopic(
    'adverbs',
    'Adverbs',
    'Basic Grammar',
    'Kata keterangan cara (manner), waktu (time), dan frekuensi (frequency).',
    'Adverbs of frequency (always, usually, often, rarely) umumnya diletakkan sebelum kata kerja utama, atau setelah "to be".',
    'Subject + Frequency Adverb + Verb  |  Verb + Manner Adverb',
    [
      { english: 'I usually practice speaking for twenty minutes.', indonesian: 'Saya biasanya berlatih berbicara selama dua puluh menit.', highlight: 'usually (sebelum verb practice)' },
    ],
    [
      { incorrect: 'I practice usually every night.', correct: 'I usually practice every night.', why: 'Frequency adverb diletakkan sebelum main verb, bukan di tengah verb dan time expression.' },
    ],
    [
      { id: 'q1', question: 'Choose the natural word order:', options: ['She is late never.', 'She never is late.', 'She is never late.', 'Never she is late.'], correctIndex: 2, explanation: 'Frequency adverbs go after the verb "to be" ("is never").' },
    ]
  ),
  makeGrammarTopic(
    'articles',
    'Articles (a, an, the)',
    'Basic Grammar',
    'Penggunaan a/an (umum/pertama kali) dan the (spesifik/sudah diketahui).',
    'Gunakan "a" sebelum bunyi konsonan, "an" sebelum bunyi vokal (an hour, a university), dan "the" untuk benda yang spesifik bagi pembicara dan pendengar.',
    'a / an + Singular Countable Noun  |  the + Specific Noun',
    [
      { english: 'Wait an hour before checking the results.', indonesian: 'Tunggu satu jam sebelum memeriksa hasilnya.', highlight: 'an hour (bunyi vokal /aʊər/) · the results (spesifik)' },
    ],
    [
      { incorrect: 'I want to study in an university.', correct: 'I want to study in a university.', why: '"university" diawali bunyi konsonan /j/ ("yoo"), sehingga memakai "a".' },
    ],
    [
      { id: 'q1', question: 'It was _____ honest mistake.', options: ['a', 'an', 'the', 'no article'], correctIndex: 1, explanation: '"honest" starts with a silent h and a vowel sound, so use "an".' },
    ]
  ),
  makeGrammarTopic(
    'prepositions',
    'Prepositions (in, on, at)',
    'Basic Grammar',
    'Kata depan waktu dan tempat yang sering tertukar.',
    'At untuk jam/titik spesifik (at 7 PM, at the station), On untuk hari/tanggal/permukaan (on Monday, on the table), In untuk bulan/tahun/ruang tertutup (in 2026, in Jakarta).',
    'at (exact time/point) · on (day/surface) · in (month/year/area)',
    [
      { english: 'Our session starts at 8 PM on Wednesday in November.', indonesian: 'Sesi kita mulai pukul 8 malam pada hari Rabu di bulan November.', highlight: 'at 8 PM · on Wednesday · in November' },
    ],
    [
      { incorrect: 'I will meet you in Monday.', correct: 'I will meet you on Monday.', why: 'Nama hari selalu menggunakan preposisi "on".' },
    ],
    [
      { id: 'q1', question: 'The workshop takes place _____ Friday morning.', options: ['in', 'at', 'on', 'by'], correctIndex: 2, explanation: 'Days and parts of a specific day ("Friday morning") take "on".' },
    ]
  ),
  makeGrammarTopic(
    'conjunctions',
    'Conjunctions',
    'Basic Grammar',
    'Menghubungkan ide secara logis (and, but, although, because, so).',
    'Jangan menggabungkan "although" dan "but" dalam satu kalimat! Pilih salah satu.',
    'Clause 1 + Conjunction + Clause 2',
    [
      { english: 'Although she was nervous, she spoke clearly.', indonesian: 'Meskipun dia gugup, dia berbicara dengan jelas.', highlight: 'Although (tanpa "but")' },
    ],
    [
      { incorrect: 'Although it rained, but we went out.', correct: 'Although it rained, we went out.', why: 'Dalam bahasa Inggris, tidak boleh memakai "although" sekaligus "but" untuk satu kontras.' },
    ],
    [
      { id: 'q1', question: '_____ the traffic was heavy, he arrived on time.', options: ['Although', 'Because', 'So', 'Despite of'], correctIndex: 0, explanation: '"Although" introduces a full clause showing contrast.' },
    ]
  ),

  // TENSES (12)
  makeGrammarTopic(
    'simple-present',
    'Simple Present',
    'Tenses',
    'Kebiasaan, rutinitas harian, dan fakta umum.',
    'Digunakan untuk hal yang terjadi berulang kali, rutinitas, atau kebenaran umum. Subjek tunggal orang ketiga (he/she/it) menambah -s/-es pada verb.',
    'Subject + V1(s/es) + Object/Complement',
    [
      { english: 'I improve my English every day.', indonesian: 'Saya meningkatkan bahasa Inggris saya setiap hari.', highlight: 'improve (V1)' },
      { english: 'She practices pronunciation before work.', indonesian: 'Dia berlatih pelafalan sebelum bekerja.', highlight: 'practices (V1+es)' },
    ],
    [
      { incorrect: 'She don’t like speaking fast.', correct: 'She doesn’t like speaking fast.', why: 'Subjek "she/he/it" menggunakan auxiliary "doesn’t", bukan "don’t".' },
    ],
    [
      { id: 'q1', question: 'My tutor _____ feedback after every session.', options: ['give', 'gives', 'giving', 'given'], correctIndex: 1, explanation: 'Singular subject "My tutor" takes V1+s ("gives").' },
    ]
  ),
  makeGrammarTopic(
    'present-continuous',
    'Present Continuous',
    'Tenses',
    'Aksi yang sedang berlangsung saat ini atau tren sementara.',
    'Gunakan am/is/are + V-ing untuk aktivitas yang sedang terjadi tepat sekarang atau proyek yang sedang berjalan minggu ini.',
    'Subject + am/is/are + V-ing + Object/Complement',
    [
      { english: 'I am improving my vocabulary right now.', indonesian: 'Saya sedang meningkatkan kosakata saya sekarang.', highlight: 'am improving' },
    ],
    [
      { incorrect: 'I am knowing the answer.', correct: 'I know the answer.', why: 'Stative verbs seperti know, believe, understand umumnya tidak dipakai dalam bentuk -ing.' },
    ],
    [
      { id: 'q1', question: 'Listen! Someone _____ at the front door.', options: ['knocks', 'is knocking', 'knocked', 'has knocked'], correctIndex: 1, explanation: '"Listen!" signals an action happening right now -> Present Continuous.' },
    ]
  ),
  makeGrammarTopic(
    'present-perfect',
    'Present Perfect',
    'Tenses',
    'Pengalaman hidup atau aksi lampau yang hasilnya masih terasa sekarang.',
    'Gunakan have/has + V3 ketika waktu tepatnya tidak disebutkan, atau saat pengalaman tersebut masih relevan hingga detik ini.',
    'Subject + have/has + V3 + Object/Complement',
    [
      { english: 'I have improved my confidence since joining.', indonesian: 'Saya telah meningkatkan rasa percaya diri sejak bergabung.', highlight: 'have improved' },
    ],
    [
      { incorrect: 'I have visited Bali last year.', correct: 'I visited Bali last year.', why: 'Jika ada penanda waktu spesifik yang sudah selesai ("last year"), gunakan Simple Past.' },
    ],
    [
      { id: 'q1', question: 'Have you ever _____ to an English-speaking country?', options: ['be', 'was', 'been', 'went'], correctIndex: 2, explanation: 'Present Perfect uses have + V3 ("been").' },
    ]
  ),
  makeGrammarTopic(
    'present-perfect-continuous',
    'Present Perfect Continuous',
    'Tenses',
    'Aksi yang dimulai di masa lalu dan masih terus berlangsung hingga kini.',
    'Menekankan durasi kegiatan yang masih berjalan sampai sekarang (sering memakai "for" atau "since").',
    'Subject + have/has + been + V-ing + (for/since)',
    [
      { english: 'I have been improving my speaking skills for six months.', indonesian: 'Saya sudah terus melatih kemampuan berbicara selama enam bulan.', highlight: 'have been improving' },
    ],
    [
      { incorrect: 'I am learning English since 2024.', correct: 'I have been learning English since 2024.', why: 'Durasi dari masa lalu hingga kini wajib memakai Present Perfect / Continuous, bukan Present Continuous.' },
    ],
    [
      { id: 'q1', question: 'She _____ for that company since 2022.', options: ['is working', 'works', 'has been working', 'worked'], correctIndex: 2, explanation: 'Ongoing duration up to now with "since" uses Present Perfect Continuous.' },
    ]
  ),
  makeGrammarTopic(
    'simple-past',
    'Simple Past',
    'Tenses',
    'Kejadian yang sudah selesai sepenuhnya di masa lalu.',
    'Gunakan V2 untuk kejadian yang selesai pada waktu lampau tertentu (yesterday, last week, in 2023).',
    'Subject + V2 + Object/Complement  |  Subject + did not + V1',
    [
      { english: 'I improved my English last year.', indonesian: 'Saya meningkatkan bahasa Inggris saya tahun lalu.', highlight: 'improved (V2)' },
    ],
    [
      { incorrect: 'Did you saw the message?', correct: 'Did you see the message?', why: 'Pertanyaan "Did" selalu diikuti kata kerja dasar V1 ("see").' },
    ],
    [
      { id: 'q1', question: 'They _____ a great presentation yesterday.', options: ['give', 'gave', 'given', 'giving'], correctIndex: 1, explanation: '"yesterday" triggers Simple Past V2 ("gave").' },
    ]
  ),
  makeGrammarTopic(
    'past-continuous',
    'Past Continuous',
    'Tenses',
    'Aksi yang sedang berlangsung pada suatu momen di masa lalu.',
    'Sering digunakan untuk aksi latar belakang yang sedang berjalan ketika kejadian lain (Simple Past) memotongnya.',
    'Subject + was/were + V-ing',
    [
      { english: 'I was reviewing flashcards when you called.', indonesian: 'Saya sedang mengulas kartu kata ketika kamu menelepon.', highlight: 'was reviewing' },
    ],
    [
      { incorrect: 'We was discussing the topic.', correct: 'We were discussing the topic.', why: 'Subjek jamak (we/you/they) menggunakan "were", bukan "was".' },
    ],
    [
      { id: 'q1', question: 'While we _____ dinner, the lights went out.', options: ['had', 'were having', 'have', 'are having'], correctIndex: 1, explanation: 'Background ongoing action in the past uses "were having".' },
    ]
  ),
  makeGrammarTopic(
    'past-perfect',
    'Past Perfect',
    'Tenses',
    'Aksi yang sudah selesai lebih dulu sebelum kejadian lampau lainnya.',
    'Membantu menunjukkan urutan dua kejadian di masa lalu: kejadian pertama memakai had + V3, kejadian kedua memakai Simple Past.',
    'Subject + had + V3 + before + Simple Past',
    [
      { english: 'She had practiced her speech before the meeting started.', indonesian: 'Dia sudah melatih pidatonya sebelum rapat dimulai.', highlight: 'had practiced' },
    ],
    [
      { incorrect: 'When I arrived, the train already left.', correct: 'When I arrived, the train had already left.', why: 'Kereta berangkat sebelum kamu tiba, jadi gunakan "had left".' },
    ],
    [
      { id: 'q1', question: 'By the time he called, I _____ the report.', options: ['finished', 'have finished', 'had finished', 'finish'], correctIndex: 2, explanation: 'Action completed prior to another past action uses Past Perfect ("had finished").' },
    ]
  ),
  makeGrammarTopic(
    'past-perfect-continuous',
    'Past Perfect Continuous',
    'Tenses',
    'Durasi kegiatan yang sudah berlangsung sebelum titik waktu di masa lalu.',
    'Menekankan lamanya proses sebelum sesuatu terjadi di masa lalu.',
    'Subject + had + been + V-ing',
    [
      { english: 'He had been waiting for thirty minutes before the interview began.', indonesian: 'Dia sudah menunggu selama tiga puluh menit sebelum wawancara dimulai.', highlight: 'had been waiting' },
    ],
    [
      { incorrect: 'He had waiting for an hour.', correct: 'He had been waiting for an hour.', why: 'Jangan lupa menyertakan "been" setelah "had".' },
    ],
    [
      { id: 'q1', question: 'They were tired because they _____ all afternoon.', options: ['had been studying', 'have been studying', 'were study', 'studied been'], correctIndex: 0, explanation: 'Duration prior to a past state ("were tired") uses "had been studying".' },
    ]
  ),
  makeGrammarTopic(
    'simple-future',
    'Simple Future',
    'Tenses',
    'Rencana, keputusan spontan, atau prediksi masa depan (will / going to).',
    'Gunakan "will + V1" untuk keputusan spontan, janji, atau prediksi; gunakan "am/is/are going to + V1" untuk rencana yang sudah diputuskan.',
    'Subject + will + V1  |  Subject + am/is/are + going to + V1',
    [
      { english: 'I will improve my pronunciation this month.', indonesian: 'Saya akan meningkatkan pelafalan saya bulan ini.', highlight: 'will improve' },
    ],
    [
      { incorrect: 'I will going to call you tomorrow.', correct: 'I am going to call you / I will call you tomorrow.', why: 'Jangan menggabungkan "will" dengan "going to".' },
    ],
    [
      { id: 'q1', question: 'Hold on, I _____ open the door for you.', options: ['will', 'am', 'going to', 'did'], correctIndex: 0, explanation: 'Spontaneous decision at the moment of speaking uses "will".' },
    ]
  ),
  makeGrammarTopic(
    'future-continuous',
    'Future Continuous',
    'Tenses',
    'Aksi yang akan sedang berlangsung pada waktu tertentu di masa depan.',
    'Membayangkan aktivitas yang sedang berjalan pada titik waktu tertentu besok atau minggu depan.',
    'Subject + will + be + V-ing',
    [
      { english: 'This time tomorrow, I will be practicing with my tutor.', indonesian: 'Jam segini besok, saya akan sedang berlatih bersama tutor saya.', highlight: 'will be practicing' },
    ],
    [
      { incorrect: 'At 9 AM tomorrow, I will be work.', correct: 'At 9 AM tomorrow, I will be working.', why: 'Setelah "will be", gunakan V-ing untuk Future Continuous.' },
    ],
    [
      { id: 'q1', question: 'At 8 PM tonight, we _____ the live session.', options: ['will be attending', 'will attend', 'are attend', 'attended'], correctIndex: 0, explanation: 'Action in progress at a future point uses "will be + V-ing".' },
    ]
  ),
  makeGrammarTopic(
    'future-perfect',
    'Future Perfect',
    'Tenses',
    'Aksi yang dipastikan sudah selesai sebelum waktu tertentu di masa depan.',
    'Sering dipasangkan dengan "by next week / by 2027" untuk target yang akan tuntas.',
    'Subject + will + have + V3',
    [
      { english: 'By Friday, I will have mastered twenty new words.', indonesian: 'Menjelang hari Jumat, saya akan sudah menguasai dua puluh kata baru.', highlight: 'will have mastered' },
    ],
    [
      { incorrect: 'By next month, she will finished the course.', correct: 'By next month, she will have finished the course.', why: 'Harus menyertakan "have" sebelum V3.' },
    ],
    [
      { id: 'q1', question: 'By the end of the year, they _____ the new app.', options: ['will launch', 'will have launched', 'launched', 'have launched'], correctIndex: 1, explanation: '"By the end of..." signals completion before a future deadline ("will have launched").' },
    ]
  ),
  makeGrammarTopic(
    'future-perfect-continuous',
    'Future Perfect Continuous',
    'Tenses',
    'Menekankan berapa lama aksi sudah berjalan hingga titik waktu di masa depan.',
    'Mengukur akumulasi durasi hingga suatu momen masa depan.',
    'Subject + will + have + been + V-ing',
    [
      { english: 'By June, I will have been studying English for two years.', indonesian: 'Menjelang bulan Juni, saya akan sudah belajar bahasa Inggris selama dua tahun.', highlight: 'will have been studying' },
    ],
    [
      { incorrect: 'I will have been study for a year.', correct: 'I will have been studying for a year.', why: 'Selalu gunakan V-ing setelah "will have been".' },
    ],
    [
      { id: 'q1', question: 'Next month, she _____ here for five years.', options: ['will have been living', 'will living', 'has lived', 'is living'], correctIndex: 0, explanation: 'Ongoing duration measured at a future milestone uses "will have been living".' },
    ]
  ),

  // ADVANCED GRAMMAR (7)
  makeGrammarTopic(
    'modal-verbs',
    'Modal Verbs',
    'Basic Grammar',
    'Ungkapan sopan waiter: Would you like, May I, Could you.',
    'Modal verbs tidak berubah bentuk (-s/-ed) dan langsung diikuti V1. Sangat penting untuk menawarkan menu atau meminta sesuatu dengan sopan kepada tamu.',
    'Would / Could / May / Can + Subject + V1',
    [
      { english: 'Would you like something to drink while reviewing the menu?', indonesian: 'Apakah Anda ingin minum sambil melihat menu?', highlight: 'Would you like' },
      { english: 'May I take your order now, or do you need more time?', indonesian: 'Boleh saya catat pesanan Anda sekarang, atau butuh waktu lagi?', highlight: 'May I take' },
    ],
    [
      { incorrect: 'Would you like to drinking water?', correct: 'Would you like drinking water / to drink water?', why: 'Setelah "Would you like to", pakai kata kerja dasar V1.' },
    ],
    [
      { id: 'q1', question: '_____ I bring you a glass of still or sparkling water?', options: ['May', 'Am', 'Does', 'Have'], correctIndex: 0, explanation: '"May I + V1" adalah cara paling sopan untuk menawarkan layanan.' },
    ]
  ),
  makeGrammarTopic(
    'imperatives',
    'Imperatives',
    'Basic Grammar',
    'Instruksi & arahan sopan untuk tamu hotel/restoran.',
    'Awali kalimat dengan "Please + V1" atau "Kindly + V1" untuk mengarahkan tamu ke meja, memperingatkan piring panas, atau mempersilakan makan.',
    'Please / Kindly + V1 + Object',
    [
      { english: 'Please follow me to your table by the window.', indonesian: 'Silakan ikuti saya ke meja Anda dekat jendela.', highlight: 'Please follow' },
      { english: 'Please be careful, the plate is quite hot.', indonesian: 'Hati-hati ya, piringnya cukup panas.', highlight: 'Please be careful' },
    ],
    [
      { incorrect: 'Please following me to Table 5.', correct: 'Please follow me to Table 5.', why: 'Setelah "Please" untuk instruksi, gunakan kata kerja dasar V1 ("follow").' },
    ],
    [
      { id: 'q1', question: '_____ a seat comfortably while I fetch your menus.', options: ['Please take', 'Please taking', 'Took', 'To take'], correctIndex: 0, explanation: 'Imperative sopan menggunakan "Please + V1".' },
    ]
  ),
  makeGrammarTopic(
    'passive-voice',
    'Passive Voice',
    'Advanced Grammar',
    'Menekankan objek atau hasil aksi daripada pelakunya.',
    'Gunakan "be (sesuai tense) + V3" ketika pelaku tidak diketahui, tidak penting, atau ingin terdengar formal.',
    'Subject + be (am/is/are/was/were/been) + V3 + (by Agent)',
    [
      { english: 'The grammar guide was updated this morning.', indonesian: 'Panduan tata bahasa diperbarui pagi ini.', highlight: 'was updated' },
    ],
    [
      { incorrect: 'The email was send yesterday.', correct: 'The email was sent yesterday.', why: 'Passive voice selalu menggunakan V3 ("sent"), bukan V1.' },
    ],
    [
      { id: 'q1', question: 'All speaking sessions _____ in your history log.', options: ['are saved', 'saving', 'have save', 'is saved'], correctIndex: 0, explanation: 'Plural subject "sessions" requires "are + V3" ("are saved").' },
    ]
  ),
  makeGrammarTopic(
    'conditional-sentences',
    'Conditional Sentences (Type 0–3)',
    'Advanced Grammar',
    'Kalimat pengandaian untuk fakta, kemungkinan nyata, imajinasi, dan penyesalan.',
    'Type 1 (kemungkinan nyata): If + Present, will + V1. Type 2 (imajinasi saat ini): If + Simple Past, would + V1. Type 3 (pengandaian masa lalu): If + Past Perfect, would have + V3.',
    'If + Condition Clause, Main Result Clause',
    [
      { english: 'If you practice daily, your fluency will grow.', indonesian: 'Jika kamu berlatih setiap hari, kefasihanmu akan berkembang.', highlight: 'Type 1: practice -> will grow' },
    ],
    [
      { incorrect: 'If I would have time, I would join.', correct: 'If I had time, I would join.', why: 'Jangan gunakan "would" di dalam klausa "If".' },
    ],
    [
      { id: 'q1', question: 'If I _____ more confident, I would speak at the conference.', options: ['am', 'were', 'will be', 'have been'], correctIndex: 1, explanation: 'Type 2 hypothetical condition uses "were" in the if-clause.' },
    ]
  ),
  makeGrammarTopic(
    'relative-clauses',
    'Relative Clauses',
    'Advanced Grammar',
    'Menggabungkan detail kata benda dengan who, which, that, whose, where.',
    'Gunakan "who/that" untuk orang, "which/that" untuk benda/hal, "where" untuk tempat, dan "whose" untuk kepemilikan.',
    'Noun + who/which/that/where + Describing Clause',
    [
      { english: 'The tutor who helped me yesterday is from London.', indonesian: 'Tutor yang membantu saya kemarin berasal dari London.', highlight: 'who helped me yesterday' },
    ],
    [
      { incorrect: 'The book who I bought is useful.', correct: 'The book which/that I bought is useful.', why: 'Gunakan "which" atau "that" untuk benda, bukan "who".' },
    ],
    [
      { id: 'q1', question: 'That is the café _____ we first met.', options: ['which', 'who', 'where', 'whose'], correctIndex: 2, explanation: '"where" refers to a location ("the café").' },
    ]
  ),
  makeGrammarTopic(
    'reported-speech',
    'Reported Speech',
    'Advanced Grammar',
    'Menyampaikan ulang perkataan orang lain secara tidak langsung.',
    'Saat melaporkan ucapan lampau ("said / told"), tense biasanya mundur satu langkah (am -> was, will -> would, can -> could).',
    'Subject + said (that) / told + Object + Backshifted Clause',
    [
      { english: 'She told me that she was preparing for her interview.', indonesian: 'Dia mengatakan kepada saya bahwa dia sedang bersiap untuk wawancaranya.', highlight: 'told me · was preparing' },
    ],
    [
      { incorrect: 'He said me that he was busy.', correct: 'He told me / He said that he was busy.', why: '"say" tidak diikuti objek orang langsung tanpa "to"; gunakan "told me".' },
    ],
    [
      { id: 'q1', question: 'Direct: "I will call you." -> Reported: He said he _____ call me.', options: ['will', 'would', 'can', 'calls'], correctIndex: 1, explanation: '"will" backshifts to "would" in reported speech.' },
    ]
  ),
  makeGrammarTopic(
    'gerunds-and-infinitives',
    'Gerunds and Infinitives',
    'Advanced Grammar',
    'Kapan memakai V-ing (gerund) vs to + V1 (infinitive).',
    'Kata kerja seperti enjoy, avoid, finish, suggest diikuti Gerund (V-ing). Kata kerja seperti want, decide, plan, hope diikuti Infinitive (to + V1).',
    'Verb + V-ing  |  Verb + to + V1',
    [
      { english: 'I enjoy practicing with native speakers.', indonesian: 'Saya menikmati berlatih bersama penutur asli.', highlight: 'enjoy + practicing' },
    ],
    [
      { incorrect: 'I look forward to meet you.', correct: 'I look forward to meeting you.', why: 'Di sini "to" adalah preposisi, sehingga wajib diikuti V-ing ("meeting").' },
    ],
    [
      { id: 'q1', question: 'She avoided _____ too quickly during the presentation.', options: ['to speak', 'speaking', 'speak', 'spoke'], correctIndex: 1, explanation: '"avoid" is always followed by a gerund (V-ing).' },
    ]
  ),
  makeGrammarTopic(
    'phrasal-verbs',
    'Phrasal Verbs',
    'Advanced Grammar',
    'Kombinasi verb + particle yang memiliki makna idiomatik alami.',
    'Penutur asli lebih sering memakai phrasal verbs dalam percakapan (look up = mencari arti, figure out = memahami, bring up = mengangkat topik).',
    'Verb + Preposition/Adverb Particle',
    [
      { english: 'Let’s go over the key points before the call.', indonesian: 'Mari kita tinjau ulang poin-poin penting sebelum panggilan.', highlight: 'go over (review)' },
    ],
    [
      { incorrect: 'Look up it in the dictionary.', correct: 'Look it up in the dictionary.', why: 'Jika objeknya pronoun ("it"), harus diletakkan di tengah phrasal verb yang dapat dipisah.' },
    ],
    [
      { id: 'q1', question: 'What does "figure out" mean in "I finally figured out the grammar rule"?', options: ['forgot', 'understood/solved', 'deleted', 'ignored'], correctIndex: 1, explanation: '"figure out" means to understand or solve something after thinking.' },
    ]
  ),
];

export const STARTER_VOCAB: VocabularyItem = {
  id: 'starter-recommend',
  userId: 'preview',
  word: 'recommend',
  meaningId: 'merekomendasikan / menyarankan',
  category: 'verb',
  ipa: '/ˌrekəˈmend/',
  commonUsage:
    'Dipakai waiter saat menyarankan menu spesial, minuman pasangan, atau pilihan bebas alergi kepada tamu.',
  grammarExplanation:
    '"Recommend" diikuti objek langsung ("I recommend the grilled salmon"), tanpa kata "to" sebelum benda.',
  synonyms: ['suggest', 'advise', 'propose'],
  antonyms: ['discourage', 'avoid'],
  collocations: ['highly recommend', 'recommend a dish', 'chef recommends'],
  phrasalVerbs: ['go with (cocok dipadukan dengan)'],
  relatedWords: ['recommendation (noun)', 'recommended (adj)'],
  commonMistakes: [
    'Hindari "recommend you to order" — katakan "recommend ordering" atau "recommend the grilled salmon".',
  ],
  dailyConversations: [
    {
      speaker: 'Guest',
      line: 'Excuse me, what main course do you recommend tonight?',
      translationId: 'Permisi, hidangan utama apa yang Anda rekomendasikan malam ini?',
    },
    {
      speaker: 'Waiter',
      line: 'I highly recommend our grilled sea bass with lemon butter sauce.',
      translationId: 'Saya sangat merekomendasikan ikan sea bass panggang saus mentega lemon.',
    },
  ],
  masteryStatus: 'Learning',
  reviewCount: 2,
  errorCount: 0,
  isFavorite: true,
  nextReviewAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const STARTER_SENTENCES: VocabularySentence[] = [
  {
    id: 'sent-1',
    userId: 'preview',
    vocabId: 'starter-recommend',
    tense: 'Simple Present',
    sentence: 'Our chef recommends the grilled sea bass every evening.',
    translationId: 'Chef kami merekomendasikan sea bass panggang setiap malam.',
    formula: 'Subject + V1(s/es) + Object',
    subject: 'Our chef',
    verb: 'recommends',
    objectComplement: 'the grilled sea bass every evening',
    structureReason: 'Menyatakan rekomendasi rutin menu andalan restoran.',
    dailyUsage: 'Saat menjelaskan signature dish kepada tamu baru.',
    affirmative: 'Our chef recommends the grilled sea bass every evening.',
    negative: 'Our chef does not recommend spicy sauces for young children.',
    interrogative: 'What dish do you recommend tonight?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-2',
    userId: 'preview',
    vocabId: 'starter-recommend',
    tense: 'Present Continuous',
    sentence: 'I am recommending our house red wine for Table 5 right now.',
    translationId: 'Saya sedang merekomendasikan house red wine untuk Meja 5 sekarang.',
    formula: 'Subject + am/is/are + V-ing + Object',
    subject: 'I',
    verb: 'am recommending',
    objectComplement: 'our house red wine for Table 5 right now',
    structureReason: 'Aktivitas menyarankan menu yang sedang berlangsung.',
    dailyUsage: 'Menjelaskan layanan yang sedang dilakukan di lantai restoran.',
    affirmative: 'I am recommending our house red wine right now.',
    negative: 'We are not recommending shellfish to guests with allergies.',
    interrogative: 'Which dessert are you recommending today?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-3',
    userId: 'preview',
    vocabId: 'starter-recommend',
    tense: 'Simple Past',
    sentence: 'I recommended the tomato soup to the guests ten minutes ago.',
    translationId: 'Saya merekomendasikan sup tomat kepada tamu sepuluh menit lalu.',
    formula: 'Subject + V2 + Object',
    subject: 'I',
    verb: 'recommended',
    objectComplement: 'the tomato soup to the guests ten minutes ago',
    structureReason: 'Kejadian menawarkan menu yang sudah terjadi tadi.',
    dailyUsage: 'Berkoordinasi dengan rekan waiter atau kapten restoran.',
    affirmative: 'I recommended the tomato soup ten minutes ago.',
    negative: 'I did not recommend the chili dish because the guest wanted mild food.',
    interrogative: 'Did you recommend the dessert platter to Table 3?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-4',
    userId: 'preview',
    vocabId: 'starter-recommend',
    tense: 'Simple Future',
    sentence: 'I will recommend a nut-free pasta option when they are ready.',
    translationId: 'Saya akan merekomendasikan pilihan pasta bebas kacang saat mereka siap.',
    formula: 'Subject + will + V1 + Object',
    subject: 'I',
    verb: 'will recommend',
    objectComplement: 'a nut-free pasta option',
    structureReason: 'Rencana atau niat bantuan waiter sesaat lagi.',
    dailyUsage: 'Persiapan melayani tamu dengan kebutuhan diet khusus.',
    affirmative: 'I will recommend a nut-free pasta option.',
    negative: 'I will not recommend creamy soup for dairy-free guests.',
    interrogative: 'Will you recommend the chef special to Room 402?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-5',
    userId: 'preview',
    vocabId: 'starter-recommend',
    tense: 'Present Perfect',
    sentence: 'I have already recommended our breakfast buffet to the new hotel guests.',
    translationId: 'Saya sudah merekomendasikan sarapan prasmanan kami ke tamu hotel baru.',
    formula: 'Subject + have/has + V3 + Object',
    subject: 'I',
    verb: 'have already recommended',
    objectComplement: 'our breakfast buffet to the new hotel guests',
    structureReason: 'Tindakan yang sudah selesai dilakukan dan relevan saat ini.',
    dailyUsage: 'Melaporkan status pelayanan ke supervisor.',
    affirmative: 'I have already recommended our breakfast buffet.',
    negative: 'I have not recommended the wine list yet.',
    interrogative: 'Have you recommended today’s pastry special yet?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-6',
    userId: 'preview',
    vocabId: 'starter-recommend',
    tense: 'Modal Verbs',
    sentence: 'I would recommend pairing your ribeye steak with mashed potatoes.',
    translationId: 'Saya sarankan memadukan steak ribeye Anda dengan kentang tumbuk.',
    formula: 'Subject + would/could/may + V1',
    subject: 'I',
    verb: 'would recommend',
    objectComplement: 'pairing your ribeye steak with mashed potatoes',
    structureReason: 'Cara sopan dan profesional memberi saran kepada tamu.',
    dailyUsage: 'Dipakai hampir setiap kali tamu bertanya saran waiter.',
    affirmative: 'I would recommend pairing your steak with mashed potatoes.',
    negative: 'I would not recommend extra chili if you prefer mild flavors.',
    interrogative: 'Could you recommend a light appetizer for two?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-7',
    userId: 'preview',
    vocabId: 'starter-recommend',
    tense: 'Imperatives',
    sentence: 'Please ask our sommelier if you want a wine recommendation.',
    translationId: 'Silakan tanya sommelier kami jika Anda ingin rekomendasi wine.',
    formula: 'Please + V1 + Object',
    subject: '(You)',
    verb: 'Please ask',
    objectComplement: 'our sommelier for a wine recommendation',
    structureReason: 'Mengarahkan atau mempersilakan tamu secara sopan.',
    dailyUsage: 'Memberikan arahan layanan tambahan di restoran hotel.',
    affirmative: 'Please ask me anytime if you need a menu recommendation.',
    negative: 'Please do not hesitate to ask for gluten-free recommendations.',
    interrogative: 'Would you like me to recommend our most popular dish?',
    createdAt: new Date().toISOString(),
  },
];
