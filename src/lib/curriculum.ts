import type {
  AchievementBadge,
  GrammarTopic,
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
  'Introduction',
  'Daily Routine',
  'Hobbies',
  'Traveling',
  'Food and Restaurant',
  'Education',
  'Technology',
  'Career and Job Interview',
  'Business',
  'Free Discussion',
] as const;

export const SIMULATOR_SCENARIOS = [
  {
    id: 'restaurant',
    title: 'Ordering Food at a Restaurant',
    subtitle: 'Memesan makanan di restoran',
    userRole: 'Customer',
    aiRole: 'Waiter / Server',
    context: 'You are dining at a busy neighborhood bistro and want to ask about specials, dietary options, and order a meal.',
    starterLine: 'Good evening and welcome to Harbor Bistro! Here is your menu. Can I start you off with something to drink?',
  },
  {
    id: 'hotel',
    title: 'Hotel Check-In',
    subtitle: 'Check-in hotel',
    userRole: 'Guest',
    aiRole: 'Front Desk Receptionist',
    context: 'You just arrived after a long flight and are checking into your hotel, requesting a quiet room and asking about breakfast.',
    starterLine: 'Welcome to the Grand Meridian Hotel! May I have your name or reservation number to get you checked in?',
  },
  {
    id: 'directions',
    title: 'Asking for Directions',
    subtitle: 'Bertanya arah',
    userRole: 'Traveler',
    aiRole: 'Local Resident',
    context: 'You are looking for the nearest subway station and a good local bookstore.',
    starterLine: 'Oh, hi there! You look like you might be looking for somewhere—can I help you find your way?',
  },
  {
    id: 'shopping',
    title: 'Shopping & Exchanges',
    subtitle: 'Berbelanja di toko',
    userRole: 'Shopper',
    aiRole: 'Store Associate',
    context: 'You want to find a jacket in a different size, ask about materials, and check the return policy.',
    starterLine: 'Hi! Let me know if you need any help finding a size or checking what we have in the back.',
  },
  {
    id: 'interview',
    title: 'Job Interview',
    subtitle: 'Interview pekerjaan',
    userRole: 'Candidate',
    aiRole: 'Hiring Manager',
    context: 'You are interviewing for a Product & Operations role and need to highlight your problem-solving strengths.',
    starterLine: "Thanks for joining us today. To kick things off, could you walk me through a project you're particularly proud of?",
  },
  {
    id: 'presentation',
    title: 'Business Presentation Q&A',
    subtitle: 'Presentasi bisnis',
    userRole: 'Presenter',
    aiRole: 'Executive Stakeholder',
    context: 'You just shared quarterly growth results and are handling clarifying questions from leadership.',
    starterLine: 'That was a clear overview. Before we move on, what was the biggest driver behind the Q3 retention improvement?',
  },
  {
    id: 'client-meeting',
    title: 'Client Discovery Meeting',
    subtitle: 'Meeting dengan klien',
    userRole: 'Account Lead',
    aiRole: 'Prospective Client',
    context: 'You are aligning on project scope, timeline expectations, and next steps with a new international client.',
    starterLine: "Appreciate you making time today. We're aiming to launch within eight weeks—how do you usually structure onboarding?",
  },
  {
    id: 'networking',
    title: 'Meeting Someone New',
    subtitle: 'Berkenalan dengan orang asing',
    userRole: 'Attendee',
    aiRole: 'Fellow Event Guest',
    context: 'You are at an international tech & design mixer striking up a warm, natural conversation.',
    starterLine: "Hey! This coffee line is taking forever, isn't it? Is this your first time attending this conference?",
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
    'Advanced Grammar',
    'Can, could, may, might, should, must, dan would untuk nuansa sopan dan pasti.',
    'Modal verbs tidak pernah berubah bentuk (tidak pakai -s, -ed, atau "to") dan langsung diikuti oleh kata kerja dasar V1.',
    'Subject + Modal (can/could/should/must/might) + V1',
    [
      { english: 'Could you speak a bit more slowly, please?', indonesian: 'Bisakah Anda berbicara sedikit lebih pelan?', highlight: 'Could + V1 (permintaan sopan)' },
    ],
    [
      { incorrect: 'You must to practice every day.', correct: 'You must practice every day.', why: 'Jangan pernah menambahkan "to" setelah modal verbs seperti must, can, should.' },
    ],
    [
      { id: 'q1', question: 'Which sentence is grammatically correct?', options: ['He cans speak French.', 'She should to rest.', 'We might join later.', 'They musted leave early.'], correctIndex: 2, explanation: 'Modals never take -s, -ed, or "to" before the base verb.' },
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
  id: 'starter-improve',
  userId: 'preview',
  word: 'improve',
  meaningId: 'meningkatkan / memperbaiki',
  category: 'verb',
  ipa: '/ɪmˈpruːv/',
  commonUsage:
    'Used when talking about making skills, habits, performance, or situations better over time.',
  grammarExplanation:
    '"Improve" dapat digunakan sebagai transitive verb (membutuhkan objek: improve my English) maupun intransitive verb (tanpa objek: My pronunciation is improving).',
  synonyms: ['enhance', 'upgrade', 'develop', 'boost'],
  antonyms: ['worsen', 'decline', 'deteriorate'],
  collocations: ['improve significantly', 'improve performance', 'room to improve', 'improve communication'],
  phrasalVerbs: ['improve on (something) — membuat hasil lebih baik dari sebelumnya'],
  relatedWords: ['improvement (noun)', 'improved (adj)', 'improver (noun)'],
  commonMistakes: [
    'Hindari menulis "improve to my English" — gunakan langsung objek: "improve my English".',
    'Jangan mengganti noun dengan verb: katakan "a big improvement", bukan "a big improve".',
  ],
  dailyConversations: [
    {
      speaker: 'A',
      line: 'Your English sounds much smoother this month!',
      translationId: 'Bahasa Inggrismu terdengar jauh lebih lancar bulan ini!',
    },
    {
      speaker: 'B',
      line: 'Thanks! I have been practicing for 20 minutes every morning to improve my fluency.',
      translationId: 'Terima kasih! Saya berlatih 20 menit setiap pagi untuk meningkatkan kefasihan saya.',
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
    vocabId: 'starter-improve',
    tense: 'Simple Present',
    sentence: 'I improve my English every day.',
    translationId: 'Saya meningkatkan bahasa Inggris saya setiap hari.',
    formula: 'Subject + V1(s/es) + Object/Complement',
    subject: 'I',
    verb: 'improve',
    objectComplement: 'my English every day',
    structureReason: 'Menyatakan kebiasaan atau rutinitas harian yang terus dilakukan secara konsisten.',
    dailyUsage: 'Digunakan saat menceritakan rutinitas belajar atau target harian Anda kepada teman atau tutor.',
    affirmative: 'I improve my English every day.',
    negative: 'I do not improve my English by skipping practice.',
    interrogative: 'Do you improve your English every day?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-2',
    userId: 'preview',
    vocabId: 'starter-improve',
    tense: 'Simple Past',
    sentence: 'I improved my English last year.',
    translationId: 'Saya meningkatkan bahasa Inggris saya tahun lalu.',
    formula: 'Subject + V2 + Object/Complement',
    subject: 'I',
    verb: 'improved',
    objectComplement: 'my English last year',
    structureReason: 'Menjelaskan pencapaian yang sudah terjadi dan selesai pada waktu lampau yang jelas ("last year").',
    dailyUsage: 'Dipakai saat wawancara kerja atau bercerita tentang progres masa lalu.',
    affirmative: 'I improved my English last year.',
    negative: 'I did not improve my English until I started speaking daily.',
    interrogative: 'Did you improve your English last year?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-3',
    userId: 'preview',
    vocabId: 'starter-improve',
    tense: 'Simple Future',
    sentence: 'I will improve my English tomorrow.',
    translationId: 'Saya akan meningkatkan bahasa Inggris saya besok.',
    formula: 'Subject + will + V1 + Object/Complement',
    subject: 'I',
    verb: 'will improve',
    objectComplement: 'my English tomorrow',
    structureReason: 'Menyatakan tekad, komitmen, atau rencana masa depan.',
    dailyUsage: 'Cocok untuk menyampaikan niat atau target sesi berikutnya.',
    affirmative: 'I will improve my English tomorrow.',
    negative: 'I will not give up; I will keep improving.',
    interrogative: 'Will you improve your English this month?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-4',
    userId: 'preview',
    vocabId: 'starter-improve',
    tense: 'Present Continuous',
    sentence: 'I am improving my English.',
    translationId: 'Saya sedang meningkatkan bahasa Inggris saya.',
    formula: 'Subject + am/is/are + V-ing + Object/Complement',
    subject: 'I',
    verb: 'am improving',
    objectComplement: 'my English',
    structureReason: 'Menunjukkan proses perkembangan yang sedang aktif berjalan saat ini.',
    dailyUsage: 'Sangat natural saat menjawab "What are you working on these days?"',
    affirmative: 'I am improving my English.',
    negative: 'I am not improving as fast as I hoped yet.',
    interrogative: 'Are you improving your English with a tutor?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-5',
    userId: 'preview',
    vocabId: 'starter-improve',
    tense: 'Present Perfect',
    sentence: 'I have improved my English.',
    translationId: 'Saya telah meningkatkan bahasa Inggris saya.',
    formula: 'Subject + have/has + V3 + Object/Complement',
    subject: 'I',
    verb: 'have improved',
    objectComplement: 'my English',
    structureReason: 'Menekankan hasil perubahan yang sudah tercapai dan masih terasa manfaatnya sekarang.',
    dailyUsage: 'Dipakai saat menunjukkan pencapaian tanpa perlu menyebut kapan tepatnya dimulai.',
    affirmative: 'I have improved my English.',
    negative: 'I have not improved my listening skills enough yet.',
    interrogative: 'Have you improved your English since January?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-6',
    userId: 'preview',
    vocabId: 'starter-improve',
    tense: 'Present Perfect Continuous',
    sentence: 'I have been improving my English.',
    translationId: 'Saya sudah terus meningkatkan bahasa Inggris saya.',
    formula: 'Subject + have/has + been + V-ing + Object/Complement',
    subject: 'I',
    verb: 'have been improving',
    objectComplement: 'my English',
    structureReason: 'Menekankan proses berkelanjutan yang dimulai di masa lalu dan masih berlanjut hingga sekarang.',
    dailyUsage: 'Natural digunakan bersama durasi waktu seperti "for the past three months".',
    affirmative: 'I have been improving my English.',
    negative: 'I have not been improving steadily without daily feedback.',
    interrogative: 'How long have you been improving your English?',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sent-7',
    userId: 'preview',
    vocabId: 'starter-improve',
    tense: 'Simple Past (Workplace Context)',
    sentence: 'Our team improved customer response times within two weeks.',
    translationId: 'Tim kami meningkatkan waktu respons pelanggan dalam dua minggu.',
    formula: 'Subject + V2 + Object + Time Phrase',
    subject: 'Our team',
    verb: 'improved',
    objectComplement: 'customer response times within two weeks',
    structureReason: 'Menunjukkan pencapaian terukur dalam konteks profesional di masa lampau.',
    dailyUsage: 'Sangat sering dipakai dalam wawancara kerja atau presentasi hasil proyek.',
    affirmative: 'Our team improved customer response times within two weeks.',
    negative: 'Our team did not improve the process overnight.',
    interrogative: 'How did your team improve response times?',
    createdAt: new Date().toISOString(),
  },
];
