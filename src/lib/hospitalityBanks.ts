export interface HospitalityListeningDrill {
  id: string;
  station: string;
  phrase: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface HospitalityDictationDrill {
  id: string;
  station: string;
  phrase: string;
  contextId: string;
}

export interface HospitalityPronunciationDrill {
  id: string;
  level: string;
  phrase: string;
  ipa: string;
  focus: string;
}

export interface HospitalityGrammarQuestion {
  id: string;
  grammarId:
    | 'simple-present'
    | 'present-continuous'
    | 'simple-past'
    | 'simple-future'
    | 'present-perfect'
    | 'modal-verbs'
    | 'imperatives';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const TOTAL_BANK_SIZE = 150;
export const SESSION_QUESTION_COUNT = 30;

// ---------------------------------------------------------------------------
// Deterministic Seeded PRNG & Per-Login Session Rotation
// ---------------------------------------------------------------------------
function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getSessionSlice<T>(
  bank: readonly T[],
  seedString: string,
  count: number = SESSION_QUESTION_COUNT
): T[] {
  const arr = [...bank];
  const rand = mulberry32(hashString(seedString));
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr.slice(0, Math.min(count, arr.length));
}

export function getLoginSeedKey(uid: string): string {
  return `lingua_login_quiz_seed_${uid || 'preview'}`;
}

export function getOrCreateLoginSeed(uid: string): string {
  const key = getLoginSeedKey(uid);
  if (typeof window !== 'undefined') {
    try {
      const existing = window.sessionStorage.getItem(key);
      if (existing) return existing;
      const fresh = `${uid || 'preview'}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(key, fresh);
      return fresh;
    } catch {
      // Fallback in restricted storage environments
    }
  }
  return `${uid || 'preview'}:default`;
}

export function rotateLoginSeed(uid: string): string {
  const key = getLoginSeedKey(uid);
  const fresh = `${uid || 'preview'}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(key, fresh);
    } catch {
      // ignore
    }
  }
  return fresh;
}

export function clearLoginSeed(uid: string): void {
  const key = getLoginSeedKey(uid);
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// 1. LISTENING BANK (150 Unique Hotel & Restaurant Waiter Questions)
// ---------------------------------------------------------------------------
function buildListeningBank(): HospitalityListeningDrill[] {
  const drills: HospitalityListeningDrill[] = [];
  const push = (
    station: string,
    phrase: string,
    question: string,
    correct: string,
    distractors: [string, string, string],
    rotateIdx: number
  ) => {
    const pos = rotateIdx % 4;
    const options = [...distractors];
    options.splice(pos, 0, correct);
    drills.push({
      id: `hl-${drills.length + 1}`,
      station,
      phrase,
      question,
      options,
      correctIndex: pos,
    });
  };

  // Group A: Greeting, Reservation & Seating (25)
  const guestParties = ['two guests', 'three guests', 'four guests', 'five guests', 'six guests'];
  const areas = [
    { en: 'by the window', ans: 'A table by the window' },
    { en: 'on the garden terrace', ans: 'A table on the garden terrace' },
    { en: 'in a quiet corner', ans: 'A quiet corner table' },
    { en: 'near the lounge', ans: 'A seat near the lounge' },
    { en: 'in the non-smoking section', ans: 'The non-smoking section' },
  ];
  guestParties.forEach((party, pIdx) => {
    areas.forEach((area, aIdx) => {
      const idx = pIdx * areas.length + aIdx;
      const times = ['at 7 p.m.', 'at 7:30 p.m.', 'at 8 p.m.', 'under Mr. Tanaka', 'for dinner'];
      push(
        'Greeting & Seating',
        `Good evening, we have a reservation for ${party} ${times[aIdx]} ${area.en}.`,
        'Where would the guests like to sit?',
        area.ans,
        [
          'Inside the kitchen prep area',
          'At the poolside towel desk',
          'Near the luggage storage room',
        ],
        idx
      );
    });
  });

  // Group B: Taking Main Course & Steak Orders (25)
  const steaks = [
    { dish: 'grilled ribeye steak', temp: 'medium rare', side: 'mashed potatoes' },
    { dish: 'pan-seared salmon fillet', temp: 'well done', side: 'steamed vegetables' },
    { dish: 'roasted lamb chop', temp: 'medium', side: 'garlic butter rice' },
    { dish: 'beef tenderloin', temp: 'medium well', side: 'roasted baby potatoes' },
    { dish: 'herb-crusted chicken breast', temp: 'fully cooked', side: 'mixed green salad' },
  ];
  const starters = ['tomato basil soup', 'caesar salad', 'mushroom bruschetta', 'crispy calamari', 'corn chowder'];
  steaks.forEach((st, sIdx) => {
    starters.forEach((starter, stIdx) => {
      const idx = sIdx * starters.length + stIdx;
      push(
        'Taking Orders',
        `I would like to start with ${starter}, and then have the ${st.dish} cooked ${st.temp} with ${st.side}.`,
        'How does the guest want the main course prepared?',
        `${st.dish}, cooked ${st.temp}, with ${st.side}`,
        [
          'Served cold without any side dish',
          'Packed immediately for airport takeaway',
          'Replaced with a double espresso and fruit',
        ],
        idx + 1
      );
    });
  });

  // Group C: Dietary Restrictions & Allergies (25)
  const allergies = [
    { item: 'peanuts and tree nuts', safe: 'No peanuts or tree nuts' },
    { item: 'shellfish and shrimp', safe: 'No shellfish or shrimp' },
    { item: 'dairy and cream', safe: 'Dairy-free without cream' },
    { item: 'gluten and wheat', safe: 'Gluten-free preparation' },
    { item: 'spicy chili peppers', safe: 'Mild without chili peppers' },
  ];
  const courses = ['appetizer', 'pasta dish', 'chef special', 'soup bowl', 'dessert plate'];
  allergies.forEach((al, aIdx) => {
    courses.forEach((course, cIdx) => {
      const idx = aIdx * courses.length + cIdx;
      push(
        'Menu & Allergies',
        `Excuse me, I have an allergy to ${al.item}, so please make sure my ${course} does not contain any.`,
        'What dietary requirement must the waiter report to the kitchen?',
        al.safe,
        [
          'Add extra cheese on top',
          'Serve double portions of dessert',
          'Bring the check before serving food',
        ],
        idx + 2
      );
    });
  });

  // Group D: Beverage, Bar & Coffee Service (25)
  const drinks = [
    { bev: 'sparkling water with lime', alt: 'Sparkling water with lime' },
    { bev: 'iced oat milk latte', alt: 'An iced oat milk latte' },
    { bev: 'fresh watermelon juice without sugar', alt: 'Fresh watermelon juice with no sugar' },
    { bev: 'hot chamomile herbal tea', alt: 'Hot chamomile herbal tea' },
    { bev: 'chilled glass of house chardonnay', alt: 'Chilled house chardonnay' },
  ];
  const timings = [
    'right away before the starters arrive',
    'together with the main course',
    'instead of tap water',
    'with extra ice on the side',
    'in a tall glass with a straw',
  ];
  drinks.forEach((dr, dIdx) => {
    timings.forEach((tm, tIdx) => {
      const idx = dIdx * timings.length + tIdx;
      push(
        'Beverage Service',
        `Could you bring me a ${dr.bev} ${tm}, please?`,
        'Which beverage did the guest order?',
        dr.alt,
        [
          'A pot of black espresso',
          'Two bottles of tomato sauce',
          'A bowl of hot noodle soup',
        ],
        idx + 3
      );
    });
  });

  // Group E: Hotel Room Service Calls (25)
  const rooms = ['Room 304', 'Room 512', 'Room 708', 'Room 915', 'Suite 1202'];
  const rsOrders = [
    { item: 'two club sandwiches and two black coffees', desc: 'Two club sandwiches and two black coffees' },
    { item: 'an extra breakfast tray with scrambled eggs', desc: 'A breakfast tray with scrambled eggs' },
    { item: 'a bowl of fresh fruit and warm milk', desc: 'Fresh fruit and warm milk' },
    { item: 'chicken noodle soup and toasted garlic bread', desc: 'Chicken noodle soup and garlic bread' },
    { item: 'two bottles of mineral water and an ice bucket', desc: 'Two mineral waters and an ice bucket' },
  ];
  rooms.forEach((rm, rIdx) => {
    rsOrders.forEach((ord, oIdx) => {
      const idx = rIdx * rsOrders.length + oIdx;
      push(
        'Room Service',
        `Hello room service, this is ${rm}. Could we order ${ord.item} in about twenty minutes?`,
        `What does ${rm} want delivered?`,
        ord.desc,
        [
          'Extra bath towels from housekeeping',
          'A late airport taxi booking',
          'A meeting projector setup',
        ],
        idx
      );
    });
  });

  // Group F: Complaints, Billing & Farewells (25)
  const recoveryItems = [
    {
      phrase: 'Excuse me, my soup arrived lukewarm—could you ask the kitchen to warm it up?',
      q: 'What issue did the guest mention?',
      ans: 'The soup is not hot enough',
      bad: ['The table is too bright', 'The bill has a wrong currency', 'The napkin is the wrong color'],
    },
    {
      phrase: 'Could we split the bill evenly between two credit cards, please?',
      q: 'How do the guests want to pay?',
      ans: 'Split evenly across two credit cards',
      bad: ['Charge everything to another table', 'Pay next week by bank wire', 'Pay only for the drinks'],
    },
    {
      phrase: 'Sorry to bother you, I ordered iced tea without sugar, and this one tastes quite sweet.',
      q: 'Why is the guest asking for a replacement?',
      ans: 'The iced tea contains sugar',
      bad: ['The plate is chipped', 'The steak is too spicy', 'The coffee cup is empty'],
    },
    {
      phrase: 'Could you charge dinner to Room 804 and print a copy of the itemized receipt?',
      q: 'What does the hotel guest request for payment?',
      ans: 'Charge to Room 804 with an itemized receipt',
      bad: ['Cancel the reservation immediately', 'Deliver dessert to the lobby bar', 'Change to a window seat'],
    },
    {
      phrase: 'Everything was wonderful tonight—thank you for taking such attentive care of our table.',
      q: 'How did the guest feel about the service?',
      ans: 'Very satisfied with the attentive service',
      bad: ['Disappointed with the seating wait', 'Confused about the breakfast hours', 'Unhappy about the background music'],
    },
  ];
  const modifiers = [
    'Thank you so much.',
    'If that is not too much trouble.',
    'Whenever you have a moment.',
    'We really appreciate your help.',
    'Have a pleasant evening.',
  ];
  recoveryItems.forEach((rec, rIdx) => {
    modifiers.forEach((mod, mIdx) => {
      const idx = rIdx * modifiers.length + mIdx;
      push(
        'Billing & Recovery',
        `${rec.phrase} ${mod}`,
        rec.q,
        rec.ans,
        rec.bad as [string, string, string],
        idx + 1
      );
    });
  });

  return drills.slice(0, TOTAL_BANK_SIZE);
}

// ---------------------------------------------------------------------------
// 2. DICTATION BANK (150 Unique Hotel & Restaurant Waiter Sentences)
// ---------------------------------------------------------------------------
function buildDictationBank(): HospitalityDictationDrill[] {
  const drills: HospitalityDictationDrill[] = [];
  const push = (station: string, phrase: string, contextId: string) => {
    drills.push({ id: `hd-${drills.length + 1}`, station, phrase, contextId });
  };

  // 25 Greeting & Seating
  const greetings = ['Good morning', 'Good afternoon', 'Good evening', 'Welcome', 'Hello there'];
  const seats = [
    'do you have a reservation with us today?',
    'right this way to your table by the window.',
    'may I take your coats and show you to your booth?',
    'your table on the terrace is ready for you now.',
    'would you prefer indoor seating or the garden patio?',
  ];
  greetings.forEach((g) => {
    seats.forEach((s) => {
      push('Greeting & Seating', `${g}, ${s}`, 'Menyambut & mengantar tamu ke meja');
    });
  });

  // 25 Menu & Specials
  const specials = [
    'grilled sea bass with lemon butter',
    'slow-braised beef short ribs',
    'truffle mushroom risotto',
    'pan-roasted herb chicken',
    'freshly caught lobster ravioli',
  ];
  const openers = [
    'Today our chef highly recommends the',
    'Our signature dinner special tonight is the',
    'Many hotel guests especially enjoy the',
    'For a lighter main course, I suggest the',
    'If you like savory flavors, please try the',
  ];
  openers.forEach((op) => {
    specials.forEach((sp) => {
      push('Menu & Specials', `${op} ${sp}.`, 'Menjelaskan menu spesial kepada tamu');
    });
  });

  // 25 Order Confirmation & Allergies
  const confirmations = [
    'Just to double-check, are there any food allergies at the table?',
    'Would you like your steak cooked medium rare or medium well?',
    'I will inform the kitchen to prepare your pasta completely nut-free.',
    'May I confirm two grilled salmon plates and one caesar salad?',
    'Would you prefer still mineral water or sparkling water with lime?',
  ];
  const closers = [
    'Thank you for letting me know.',
    'Your order will be ready shortly.',
    'Please let me know if you need anything else.',
    'I will bring your drinks first.',
    'Allow me to repeat that order back to you.',
  ];
  confirmations.forEach((cf) => {
    closers.forEach((cl) => {
      push('Taking Orders', `${cf} ${cl}`, 'Konfirmasi pesanan & alergi makanan');
    });
  });

  // 25 Serving & Check-Back
  const dishes = ['appetizer', 'main course', 'espresso', 'chocolate mousse', 'breakfast tray'];
  const checks = [
    'Please enjoy your',
    'How is everything tasting with your',
    'Careful, the plate is warm as I serve your',
    'I have brought fresh napkins along with your',
    'Would you care for extra black pepper on your',
  ];
  checks.forEach((ch) => {
    dishes.forEach((di) => {
      const punct = ch.startsWith('How') || ch.startsWith('Would') ? '?' : '.';
      push('Table Service', `${ch} ${di}${punct}`, 'Menyajikan hidangan & check-back tamu');
    });
  });

  // 25 Room Service
  const roomNumbers = ['Room 205', 'Room 410', 'Room 618', 'Room 822', 'Suite 1001'];
  const deliveries = [
    'your room service breakfast has arrived.',
    'may I set your dinner tray near the balcony table?',
    'your fresh coffee pot and warm croissants are here.',
    'please sign the room charge slip at the bottom.',
    'call extension four zero two when we may clear the tray.',
  ];
  roomNumbers.forEach((rm) => {
    deliveries.forEach((del) => {
      push('Room Service', `Good day ${rm}, ${del}`, 'Layanan antar makanan kamar hotel');
    });
  });

  // 25 Billing & Recovery
  const issues = [
    'I sincerely apologize for the delay with your main course',
    'I am so sorry that the steak arrived overcooked',
    'Certainly, I will replace this lukewarm soup right away',
    'Here is your itemized bill whenever you are ready',
    'Thank you so much for dining with us tonight',
  ];
  const resolutions = [
    'and I will bring a fresh plate immediately.',
    'and we have removed that drink from your check.',
    'so please enjoy a complimentary dessert on us.',
    'and you may settle by card, cash, or room charge.',
    'and we hope to welcome you back tomorrow morning.',
  ];
  issues.forEach((iss) => {
    resolutions.forEach((res) => {
      push('Billing & Recovery', `${iss}, ${res}`, 'Menangani komplain & pembayaran tamu');
    });
  });

  return drills.slice(0, TOTAL_BANK_SIZE);
}

// ---------------------------------------------------------------------------
// 3. PRONUNCIATION & SHADOWING BANK (150 Unique Waiter Drills with IPA)
// ---------------------------------------------------------------------------
function buildPronunciationBank(): HospitalityPronunciationDrill[] {
  const drills: HospitalityPronunciationDrill[] = [];
  const push = (level: string, phrase: string, ipa: string, focus: string) => {
    drills.push({ id: `hp-${drills.length + 1}`, level, phrase, ipa, focus });
  };

  // Curated base templates x variations with verified IPA & pronunciation focus (6 x 25 = 150)
  const greetingStarts = [
    { w: 'Good morning', ipa: '/ɡʊd ˈmɔːrnɪŋ/' },
    { w: 'Good afternoon', ipa: '/ɡʊd ˌæftərˈnuːn/' },
    { w: 'Good evening', ipa: '/ɡʊd ˈiːvnɪŋ/' },
    { w: 'Welcome back', ipa: '/ˈwelkəm bæk/' },
    { w: 'Hello again', ipa: '/həˈləʊ əˈɡen/' },
  ];
  const greetingEnds = [
    { t: 'may I show you to your table?', ipa: '/meɪ aɪ ʃəʊ juː tuː jɔːr ˈteɪbəl/', f: 'Intonasi ramah naik di akhir kalimat tanya.' },
    { t: 'have you booked a reservation today?', ipa: '/hæv juː bʊkt ə ˌrezərˈveɪʃən təˈdeɪ/', f: 'Penekanan kata "reservation" pada suku kata ke-3.' },
    { t: 'here are our breakfast menus for you.', ipa: '/hɪər ɑːr ˈaʊər ˈbrekfəst ˈmenjuːz fɔːr juː/', f: 'Bunyi jelas /mɛnjuːz/ pada "menus".' },
    { t: 'please follow me to the garden terrace.', ipa: '/pliːz ˈfɒləʊ miː tuː ðə ˈɡɑːrdən ˈterəs/', f: 'Bunyi /ð/ lembut pada kata "the".' },
    { t: 'how many guests are joining you tonight?', ipa: '/haʊ ˈmeni ɡests ɑːr ˈdʒɔɪnɪŋ juː təˈnaɪt/', f: 'Akhiran konsonan /ts/ pada "guests".' },
  ];
  greetingStarts.forEach((gs) => {
    greetingEnds.forEach((ge) => {
      push('Greeting & Seating', `${gs.w}, ${ge.t}`, `${gs.ipa} ${ge.ipa}`, ge.f);
    });
  });

  const drinkPolite = [
    { s: 'Would you care for', ipa: '/wʊd juː keər fɔːr/' },
    { s: 'May I bring you', ipa: '/meɪ aɪ brɪŋ juː/' },
    { s: 'Can I start you with', ipa: '/kæn aɪ stɑːrt juː wɪð/' },
    { s: 'Would you like to try', ipa: '/wʊd juː laɪk tuː traɪ/' },
    { s: 'Shall I pour you', ipa: '/ʃæl aɪ pɔːr juː/' },
  ];
  const drinkItems = [
    { d: 'chilled sparkling mineral water?', ipa: '/tʃɪld ˈspɑːrklɪŋ ˈmɪnərəl ˈwɔːtər/', f: 'Sambungan halus "chilled sparkling" tanpa jeda.' },
    { d: 'a freshly brewed cappuccino?', ipa: '/ə ˈfreʃli bruːd ˌkæpʊˈtʃiːnəʊ/', f: 'Bunyi /ʃ/ jelas pada "freshly".' },
    { d: 'our signature tropical mocktail?', ipa: '/ˈaʊər ˈsɪɡnətʃər ˈtrɒpɪkəl ˈmɒkteɪl/', f: 'Penekanan awal pada "signature".' },
    { d: 'a glass of house red wine?', ipa: '/ə ɡlɑːs əv haʊs red waɪn/', f: 'Bunyi pendek /əv/ untuk kata "of".' },
    { d: 'warm chamomile herbal tea?', ipa: '/wɔːrm ˈkæməmaɪl ˈhɜːrbəl tiː/', f: 'Pelafalan tepat "chamomile" (/ˈkæməmaɪl/).' },
  ];
  drinkPolite.forEach((dp) => {
    drinkItems.forEach((di) => {
      push('Beverage Service', `${dp.s} ${di.d}`, `${dp.ipa} ${di.ipa}`, di.f);
    });
  });

  const orderIntros = [
    { s: 'Certainly,', ipa: '/ˈsɜːrtənli/' },
    { s: 'Of course,', ipa: '/əv kɔːrs/' },
    { s: 'Right away,', ipa: '/raɪt əˈweɪ/' },
    { s: 'With pleasure,', ipa: '/wɪð ˈpleʒər/' },
    { s: 'No problem,', ipa: '/nəʊ ˈprɒbləm/' },
  ];
  const orderBodies = [
    { b: 'I will prepare your steak medium rare.', ipa: '/aɪ wɪl prɪˈpeər jɔːr steɪk ˈmiːdiəm reər/', f: 'Bedakan /eɪ/ pada "steak" agar tidak tertukar "stick".' },
    { b: 'let me check the ingredients with our chef.', ipa: '/let miː tʃek ði ɪnˈɡriːdiənts wɪð ˈaʊər ʃef/', f: 'Bunyi /ʃ/ lembut pada "chef".' },
    { b: 'we can serve the dressing on the side.', ipa: '/wiː kæn sɜːrv ðə ˈdresɪŋ ɒn ðə saɪd/', f: 'Bunyi vokal panjang /ɜːr/ di "serve".' },
    { b: 'your appetizers will arrive in ten minutes.', ipa: '/jɔːr ˈæpɪtaɪzərz wɪl əˈraɪv ɪn ten ˈmɪnɪts/', f: 'Akhiran /z/ halus di "appetizers".' },
    { b: 'I have noted your gluten-free request carefully.', ipa: '/aɪ hæv ˈnəʊtɪd jɔːr ˈɡluːtən friː rɪˈkwest ˈkeərfəli/', f: 'Bunyi tegas /kw/ pada "request".' },
  ];
  orderIntros.forEach((oi) => {
    orderBodies.forEach((ob) => {
      push('Taking Orders', `${oi.s} ${ob.b}`, `${oi.ipa} ${ob.ipa}`, ob.f);
    });
  });

  const allergyStarts = [
    { s: 'Please let me assure you', ipa: '/pliːz let miː əˈʃʊər juː/' },
    { s: 'For your safety,', ipa: '/fɔːr jɔːr ˈseɪfti/' },
    { s: 'Our kitchen confirms', ipa: '/ˈaʊər ˈkɪtʃən kənˈfɜːrmz/' },
    { s: 'We gladly adjust dishes', ipa: '/wiː ˈɡlædli əˈdʒʌst ˈdɪʃɪz/' },
    { s: 'Rest assured that', ipa: '/rest əˈʃʊərd ðæt/' },
  ];
  const allergyEnds = [
    { e: 'this sauce contains no dairy or nuts.', ipa: '/ðɪs sɔːs kənˈteɪnz nəʊ ˈdeəri ɔːr nʌts/', f: 'Bunyi /sɔːs/ pada "sauce" dan /ts/ di "nuts".' },
    { e: 'we use separate pans for allergy meals.', ipa: '/wiː juːz ˈsepərət pænz fɔːr ˈælərdʒi miːlz/', f: 'Penekanan awal pada "separate" (/ˈsepərət/).' },
    { e: 'the grilled vegetable platter is vegan.', ipa: '/ðə ɡrɪld ˈvedʒtəbəl ˈplætər ɪz ˈviːɡən/', f: 'Tiga suku kata bersih pada "vegetable" (/ˈvedʒtəbəl/).' },
    { e: 'every dessert here is freshly baked.', ipa: '/ˈevri dɪˈzɜːrt hɪər ɪz ˈfreʃli beɪkt/', f: 'Stress pada suku kata kedua di "dessert" (/dɪˈzɜːrt/).' },
    { e: 'this soup is made without shellfish stock.', ipa: '/ðɪs suːp ɪz meɪd wɪˈðaʊt ˈʃelfɪʃ stɒk/', f: 'Bunyi /ð/ bersuara pada "without".' },
  ];
  allergyStarts.forEach((as) => {
    allergyEnds.forEach((ae) => {
      push('Menu & Allergies', `${as.s} ${ae.e}`, `${as.ipa} ${ae.ipa}`, ae.f);
    });
  });

  const rsStarts = [
    { s: 'Good evening, room service speaking,', ipa: '/ɡʊd ˈiːvnɪŋ ruːm ˈsɜːrvɪs ˈspiːkɪŋ/' },
    { s: 'Thank you for calling room service,', ipa: '/θæŋk juː fɔːr ˈkɔːlɪŋ ruːm ˈsɜːrvɪs/' },
    { s: 'Your room service tray is ready,', ipa: '/jɔːr ruːm ˈsɜːrvɪs treɪ ɪz ˈredi/' },
    { s: 'May I confirm your suite number,', ipa: '/meɪ aɪ kənˈfɜːrm jɔːr swiːt ˈnʌmbər/' },
    { s: 'Our attendant is on the way,', ipa: '/ˈaʊər əˈtendənt ɪz ɒn ðə weɪ/' },
  ];
  const rsEnds = [
    { e: 'dinner will arrive within twenty minutes.', ipa: '/ˈdɪnər wɪl əˈraɪv wɪˈðɪn ˈtwenti ˈmɪnɪts/', f: 'Linking alami antara "arrive within".' },
    { e: 'would you like extra cutlery included?', ipa: '/wʊd juː laɪk ˈekstrə ˈkʌtləri ɪnˈkluːdɪd/', f: 'Pelafalan bersih "cutlery" (/ˈkʌtləri/).' },
    { e: 'where may I place your breakfast tray?', ipa: '/weər meɪ aɪ pleɪs jɔːr ˈbrekfəst treɪ/', f: 'Bunyi panjang /eɪ/ pada "place" dan "tray".' },
    { e: 'please sign the folio when convenient.', ipa: '/pliːz saɪn ðə ˈfəʊliəʊ wen kənˈviːniənt/', f: 'Huruf g senyap pada kata "sign" (/saɪn/).' },
    { e: 'do you need anything else for tonight?', ipa: '/duː juː niːd ˈeniθɪŋ els fɔːr təˈnaɪt/', f: 'Bunyi voiceless /θ/ pada "anything".' },
  ];
  rsStarts.forEach((rs) => {
    rsEnds.forEach((re) => {
      push('Room Service', `${rs.s} ${re.e}`, `${rs.ipa} ${re.ipa}`, re.f);
    });
  });

  const recoveryStarts = [
    { s: 'I sincerely apologize for the wait;', ipa: '/aɪ sɪnˈsɪərli əˈpɒlədʒaɪz fɔːr ðə weɪt/' },
    { s: 'Thank you for bringing this to my attention;', ipa: '/θæŋk juː fɔːr ˈbrɪŋɪŋ ðɪs tuː maɪ əˈtenʃən/' },
    { s: 'Please accept my warmest apologies;', ipa: '/pliːz əkˈsept maɪ ˈwɔːrmɪst əˈpɒlədʒiz/' },
    { s: 'I completely understand your concern;', ipa: '/aɪ kəmˈpliːtli ˌʌndərˈstænd jɔːr kənˈsɜːrn/' },
    { s: 'We truly value your feedback tonight;', ipa: '/wiː ˈtruːli ˈvæljuː jɔːr ˈfiːdbæk təˈnaɪt/' },
  ];
  const recoveryEnds = [
    { e: 'let me replace it with a hot dish immediately.', ipa: '/let miː rɪˈpleɪs ɪt wɪð ə hɒt dɪʃ ɪˈmiːdiətli/', f: 'Nada tenang dan penekanan empatik pada "immediately".' },
    { e: 'here is your separate receipt as requested.', ipa: '/hɪər ɪz jɔːr ˈsepərət rɪˈsiːt æz rɪˈkwestɪd/', f: 'Huruf p senyap di "receipt" (/rɪˈsiːt/).' },
    { e: 'would you prefer to pay by card or cash?', ipa: '/wʊd juː prɪˈfɜːr tuː peɪ baɪ kɑːrd ɔːr kæʃ/', f: 'Bunyi /ʃ/ tajam di akhir "cash".' },
    { e: 'we hope you had a pleasant dining experience.', ipa: '/wiː həʊp juː hæd ə ˈplezənt ˈdaɪnɪŋ ɪkˈspɪəriəns/', f: 'Kejelasan /ks/ pada "experience".' },
    { e: 'thank you for staying with our hotel.', ipa: '/θæŋk juː fɔːr ˈsteɪɪŋ wɪð ˈaʊər həʊˈtel/', f: 'Tekanan pada suku kata kedua di "hotel" (/həʊˈtel/).' },
  ];
  recoveryStarts.forEach((rcs) => {
    recoveryEnds.forEach((rce) => {
      push('Complaint & Billing', `${rcs.s} ${rce.e}`, `${rcs.ipa} ${rce.ipa}`, rce.f);
    });
  });

  return drills.slice(0, TOTAL_BANK_SIZE);
}

// ---------------------------------------------------------------------------
// 4. GRAMMAR BANK (150 Unique Waiter Questions Across 7 Basic Grammars)
// ---------------------------------------------------------------------------
function buildGrammarBank(): HospitalityGrammarQuestion[] {
  const qs: HospitalityGrammarQuestion[] = [];
  const push = (
    grammarId: HospitalityGrammarQuestion['grammarId'],
    question: string,
    options: [string, string, string, string],
    correctIndex: number,
    explanation: string
  ) => {
    qs.push({
      id: `hg-${qs.length + 1}`,
      grammarId,
      question,
      options,
      correctIndex,
      explanation,
    });
  };

  // 1. Simple Present (22 items)
  const spSeeds: [string, [string, string, string, string], number, string][] = [
    ['Our hotel restaurant _____ breakfast from 6:30 a.m. to 10:30 a.m. every day.', ['serve', 'serves', 'serving', 'served'], 1, 'Subjek tunggal "Our hotel restaurant" memakai V1+s ("serves") untuk jadwal tetap.'],
    ['The head chef always _____ fresh seafood before dinner service.', ['inspect', 'inspects', 'inspecting', 'inspected'], 1, 'Rutinitas harian dengan subjek tunggal "head chef" memakai V1+s.'],
    ['Waiters _____ clean uniforms and name tags on every shift.', ['wear', 'wears', 'wearing', 'wore'], 0, 'Subjek jamak "Waiters" memakai kata kerja dasar V1 ("wear").'],
    ['_____ this signature pasta contain any dairy or nuts?', ['Do', 'Does', 'Is', 'Are'], 1, 'Pertanyaan Simple Present untuk benda tunggal "this signature pasta" memakai "Does".'],
    ['House coffee _____ complimentary for all hotel breakfast guests.', ['is', 'are', 'be', 'do'], 0, 'Subjek uncountable "House coffee" memakai linking verb "is".'],
    ['Our lounge bar _____ not close until midnight on weekends.', ['do', 'does', 'is', 'has'], 1, 'Kalimat negatif Simple Present subjek tunggal memakai "does not + V1".'],
    ['Guests usually _____ a table near the terrace during sunset.', ['prefer', 'prefers', 'preferring', 'preferred'], 0, 'Subjek jamak "Guests" dengan "usually" memakai V1 ("prefer").'],
    ['That spicy curry dish _____ with steamed jasmine rice.', ['come', 'comes', 'coming', 'came'], 1, 'Fakta menu untuk subjek tunggal "dish" memakai "comes".'],
    ['How many rooms _____ the morning room service team cover?', ['do', 'does', 'is', 'are'], 1, '"the morning room service team" adalah satu unit tunggal -> "does".'],
    ['Every waiter _____ guests warmly within ten seconds of arrival.', ['greet', 'greets', 'greeting', 'greeted'], 1, '"Every waiter" selalu dihitung tunggal -> V1+s ("greets").'],
    ['Freshly squeezed orange juice _____ rich in vitamin C.', ['is', 'are', 'am', 'be'], 0, '"orange juice" adalah uncountable noun -> "is".'],
    ['We _____ separate cutting boards for gluten-free orders.', ['use', 'uses', 'using', 'used'], 0, 'Subjek "We" untuk prosedur standar memakai V1 ("use").'],
    ['The sommelier _____ the best local wine for each steak.', ['recommend', 'recommends', 'recommending', 'recommended'], 1, 'Subjek tunggal "The sommelier" -> "recommends".'],
    ['Do you _____ a smoking or non-smoking table today?', ['prefer', 'prefers', 'preferred', 'preferring'], 0, 'Setelah "Do you" selalu gunakan V1 ("prefer").'],
    ['Our kitchen _____ halal chicken for all poultry dishes.', ['prepare', 'prepares', 'preparing', 'prepared'], 1, '"Our kitchen" (tunggal) -> V1+s ("prepares").'],
    ['Room service _____ twenty-four hours a day at this resort.', ['operate', 'operates', 'operating', 'operated'], 1, 'Jadwal tetap layanan tunggal -> "operates".'],
    ['These linen napkins _____ spotless and neatly folded.', ['is', 'are', 'was', 'be'], 1, 'Subjek jamak "napkins" memakai "are".'],
    ['Does the set menu _____ dessert and coffee?', ['include', 'includes', 'included', 'including'], 0, 'Setelah "Does", kata kerja kembali ke V1 ("include").'],
    ['Our cashier _____ receipts in both cash and card terminals.', ['print', 'prints', 'printing', 'printed'], 1, '"Our cashier" (tunggal) -> "prints".'],
    ['I always _____ the order aloud to avoid kitchen mistakes.', ['repeat', 'repeats', 'repeating', 'repeated'], 0, 'Subjek "I" selalu memakai V1 tanpa -s ("repeat").'],
    ['Most guests _____ still water instead of soda at lunch.', ['choose', 'chooses', 'choosing', 'chose'], 0, 'Subjek jamak "Most guests" memakai "choose".'],
    ['The garden patio _____ great views of the pool.', ['offer', 'offers', 'offering', 'offered'], 1, 'Subjek tunggal "The garden patio" -> "offers".'],
  ];
  spSeeds.forEach((s) => push('simple-present', s[0], s[1], s[2], s[3]));

  // 2. Present Continuous (22 items)
  const pcSeeds: [string, [string, string, string, string], number, string][] = [
    ['Our chef _____ your grilled salmon right now; it will be out in five minutes.', ['prepares', 'is preparing', 'prepared', 'has prepared'], 1, '"right now" menunjukkan aksi yang sedang berlangsung -> "is preparing".'],
    ['Waiter: Hold on, I _____ a clean baby chair to Table 6 at the moment.', ['bring', 'am bringing', 'brought', 'have brought'], 1, 'Subjek "I" + aksi sekarang ("at the moment") -> "am bringing".'],
    ['The kitchen staff _____ a large banquet order for Suite 1200 right now.', ['plate', 'are plating', 'plated', 'plates'], 1, '"staff" yang bertindak aktif saat ini memakai "are plating".'],
    ['Look! Guest at Table 3 _____ his hand for the bill.', ['raises', 'is raising', 'raised', 'raise'], 1, 'Tanda "Look!" menandakan aksi sedang terjadi -> "is raising".'],
    ['We _____ a new seasonal dessert menu this week.', ['feature', 'are featuring', 'featured', 'features'], 1, 'Promo sementara minggu ini memakai Present Continuous ("are featuring").'],
    ['Excuse me, the barista _____ your iced oat latte right now.', ['makes', 'is making', 'made', 'make'], 1, 'Sedang dibuat saat ini -> "is making".'],
    ['Are you still _____ on the appetizer menu, or ready to order?', ['decide', 'deciding', 'decided', 'decides'], 1, 'Bentuk tanya Present Continuous: "Are you + V-ing".'],
    ['The trainee waiter _____ how to carry three plates safely today.', ['learns', 'is learning', 'learned', 'learn'], 1, 'Aktivitas yang sedang dijalani hari ini -> "is learning".'],
    ['I _____ currently _____ with the kitchen about your nut allergy.', ['am / checking', 'is / checking', 'do / check', 'have / checked'], 0, 'Subjek "I" memakai "am checking".'],
    ['Two guests _____ at the reception desk for a terrace table.', ['wait', 'are waiting', 'waited', 'waits'], 1, 'Subjek jamak "Two guests" -> "are waiting".'],
    ['Our sommelier _____ wine pairings for Table 9 right now.', ['is explaining', 'explains', 'explained', 'explain'], 0, 'Sedang menjelaskan sekarang -> "is explaining".'],
    ['The floor supervisor _____ our service quality during dinner rush.', ['monitors', 'is monitoring', 'monitored', 'monitor'], 1, 'Berlangsung selama jam sibuk saat ini -> "is monitoring".'],
    ['Right now, room service _____ breakfast trays to the fifth floor.', ['delivers', 'is delivering', 'delivered', 'deliver'], 1, '"Right now" memicu "is delivering".'],
    ['Why _____ the guests at Table 4 _____ for extra menus?', ['is / asking', 'are / asking', 'do / asking', 'have / ask'], 1, 'Subjek jamak "guests" memakai "are ... asking".'],
    ['I _____ a fresh pot of peppermint tea for your table now.', ['brew', 'am brewing', 'brewed', 'brews'], 1, 'Subjek "I" + "now" -> "am brewing".'],
    ['The dishwasher team _____ extra glasses for tonight’s event.', ['polishes', 'is polishing', 'polished', 'polish'], 1, 'Sedang memoles gelas sekarang -> "is polishing".'],
    ['Guests _____ more plant-based dishes at our hotel this month.', ['order', 'are ordering', 'ordered', 'orders'], 1, 'Tren bulan ini memakai "are ordering".'],
    ['Listen! Room 508 _____ the room service line again.', ['calls', 'is calling', 'called', 'call'], 1, '"Listen!" menandai kejadian saat ini -> "is calling".'],
    ['We _____ not _____ alcohol at the poolside bar until noon today.', ['are / serving', 'is / serving', 'do / serving', 'were / serve'], 0, 'Negatif Present Continuous untuk "We" -> "are not serving".'],
    ['The pastry chef _____ warm croissants straight from the oven.', ['takes', 'is taking', 'took', 'take'], 1, 'Sedang berlangsung saat ini -> "is taking".'],
    ['Table 12 _____ their anniversary cake right now.', ['enjoys', 'is enjoying', 'enjoyed', 'enjoy'], 1, 'Sedang menikmati sekarang -> "is enjoying".'],
    ['I _____ just _____ your credit card payment at the counter.', ['am / processing', 'is / processing', 'do / process', 'have / process'], 0, 'Sedang memproses pembayaran sekarang -> "am processing".'],
  ];
  pcSeeds.forEach((s) => push('present-continuous', s[0], s[1], s[2], s[3]));

  // 3. Simple Past (22 items)
  const pastSeeds: [string, [string, string, string, string], number, string][] = [
    ['Guest at Table 5 _____ two grilled steaks ten minutes ago.', ['order', 'ordered', 'ordering', 'orders'], 1, '"ten minutes ago" adalah waktu lampau selesai -> V2 ("ordered").'],
    ['Did you _____ the allergy note to the kitchen before firing the order?', ['send', 'sent', 'sending', 'sends'], 0, 'Setelah "Did", kata kerja wajib kembali ke V1 ("send").'],
    ['Yesterday evening, we _____ over eighty dinner guests on the terrace.', ['serve', 'served', 'serving', 'serves'], 1, '"Yesterday evening" memakai Simple Past V2 ("served").'],
    ['The guest _____ very happy with our quick replacement dish last night.', ['is', 'was', 'were', 'been'], 1, 'Subjek tunggal lampau "The guest" + "last night" -> "was".'],
    ['Room 402 _____ for extra pillows and warm milk earlier this morning.', ['calls', 'called', 'calling', 'call'], 1, '"earlier this morning" sudah selesai -> V2 ("called").'],
    ['Sorry, the waiter accidentally _____ tap water instead of sparkling water.', ['bring', 'brought', 'bringing', 'brings'], 1, 'Bentuk V2 dari "bring" adalah "brought".'],
    ['We _____ out of truffle oil before the late shift ended.', ['run', 'ran', 'running', 'runs'], 1, 'Bentuk V2 dari "run" adalah "ran".'],
    ['The couple _____ their anniversary bill by credit card an hour ago.', ['pay', 'paid', 'paying', 'pays'], 1, 'Bentuk V2 dari "pay" adalah "paid".'],
    ['_____ the guests enjoy the chef’s complimentary dessert?', ['Do', 'Did', 'Were', 'Have'], 1, 'Tanya Simple Past untuk kata kerja aksi "enjoy" memakai "Did".'],
    ['Unfortunately, table 8 _____ not receive their side salads on time.', ['do', 'did', 'was', 'were'], 1, 'Negatif Simple Past memakai "did not + V1".'],
    ['Our manager _____ personally to Table 2 after the delay.', ['apologize', 'apologized', 'apologizing', 'apologizes'], 1, 'Kejadian lampau -> V2 ("apologized").'],
    ['How much tip _____ the tour group leave last night?', ['do', 'did', 'was', 'has'], 1, 'Pertanyaan lampau memakai "did".'],
    ['I _____ the broken wine glass from the floor immediately.', ['clear', 'cleared', 'clearing', 'clears'], 1, 'Aksi selesai -> V2 ("cleared").'],
    ['They _____ three bottles of sparkling water during lunch yesterday.', ['drink', 'drank', 'drunk', 'drinking'], 1, 'V2 dari "drink" adalah "drank".'],
    ['Last Friday, our morning team _____ every buffet tray before 6 a.m.', ['set', 'sets', 'setting', 'seated'], 0, 'V2 dari "set" tetap "set".'],
    ['The guest _____ his receipt at the counter and walked out.', ['take', 'took', 'taken', 'taking'], 1, 'V2 dari "take" adalah "took".'],
    ['There _____ four VIP guests at Table 1 this afternoon.', ['is', 'was', 'were', 'are'], 2, 'Subjek jamak lampau "four VIP guests" memakai "were".'],
    ['She _____ a mild tomato soup because she had a sore throat.', ['choose', 'chose', 'chosen', 'choosing'], 1, 'V2 dari "choose" adalah "chose".'],
    ['Did the barista _____ almond milk in this cappuccino?', ['use', 'used', 'using', 'uses'], 0, 'Setelah "Did", selalu pakai V1 ("use").'],
    ['We _____ a polite greeting card on the honeymoon table earlier.', ['place', 'placed', 'placing', 'places'], 1, 'Kejadian lampau -> "placed".'],
    ['The chef _____ extra herbs to make the broth richer yesterday.', ['add', 'added', 'adding', 'adds'], 1, '"yesterday" memicu V2 ("added").'],
    ['I _____ the kitchen ticket twice to make sure it was accurate.', ['check', 'checked', 'checking', 'checks'], 1, 'Aksi lampau selesai -> "checked".'],
  ];
  pastSeeds.forEach((s) => push('simple-past', s[0], s[1], s[2], s[3]));

  // 4. Simple Future (21 items)
  const futSeeds: [string, [string, string, string, string], number, string][] = [
    ['Waiter: I _____ bring your fresh orange juice right away.', ['will', 'am', 'did', 'have'], 0, 'Janji spontan waiter saat melayani tamu memakai "will + V1".'],
    ['Your grilled sea bass _____ ready in approximately twelve minutes.', ['will be', 'is been', 'was', 'going be'], 0, 'Prediksi waktu siap di masa depan: "will be + adjective".'],
    ['We _____ set up a larger table for six guests near the patio.', ['will', 'were', 'are', 'have'], 0, 'Tindakan yang akan segera dilakukan -> "will + V1".'],
    ['Don’t worry, I _____ ask the chef to prepare a nut-free portion.', ['will', 'do', 'was', 'am'], 0, 'Keputusan cepat membantu tamu -> "will".'],
    ['Are you _____ pay by credit card or charge to your hotel room?', ['will', 'going to', 'go to', 'went'], 1, 'Pola "Are you going to + V1" untuk menanyakan rencana tamu.'],
    ['Our manager _____ come to your table shortly to check on you.', ['will', 'did', 'is', 'has'], 0, 'Janji layanan segera -> "will + come".'],
    ['Tomorrow morning, breakfast buffet service _____ start at six o’clock.', ['will', 'was', 'has', 'is'], 0, 'Jadwal besok pagi -> "will + start".'],
    ['I _____ not forget to leave out the onions from your salad.', ['will', 'am', 'did', 'have'], 0, 'Janji negatif sopan -> "will not + V1".'],
    ['Next month, the hotel _____ launch a new Italian tasting menu.', ['is going to', 'going to', 'will to', 'was going'], 0, 'Rencana yang sudah dijadwalkan -> "is going to + V1".'],
    ['_____ you need a high chair for the baby when we seat you?', ['Will', 'Are', 'Did', 'Have'], 0, 'Pertanyaan kebutuhan tamu sesaat lagi -> "Will you need...".'],
    ['I _____ refill your coffee cup as soon as I return from the bar.', ['will', 'did', 'am', 'have'], 0, 'Tawaran bantuan segera -> "will refill".'],
    ['The kitchen _____ close for deep cleaning at eleven tonight.', ['will', 'was', 'had', 'are'], 0, 'Jadwal nanti malam -> "will close".'],
    ['We _____ deliver your room service tray within twenty minutes.', ['will', 'were', 'have', 'are'], 0, 'Estimasi pengantaran -> "will deliver".'],
    ['She _____ have the chocolate lava cake after finishing her soup.', ['is going to', 'going to', 'will to', 'has'], 0, 'Pilihan tamu untuk dessert nanti -> "is going to".'],
    ['I _____ print a separate receipt for your business expense report.', ['will', 'am', 'did', 'was'], 0, 'Tindakan yang segera dilakukan -> "will print".'],
    ['Our sommelier _____ recommend a crisp white wine in a moment.', ['will', 'has', 'did', 'was'], 0, 'Aksi sesaat lagi -> "will recommend".'],
    ['Will the terrace heaters _____ on later this evening?', ['be', 'are', 'is', 'been'], 0, 'Setelah "Will + Subject", kata kerja dasar harus "be".'],
    ['We _____ reserve Table 10 by the window for your party tonight.', ['will', 'were', 'did', 'had'], 0, 'Konfirmasi reservasi nanti malam -> "will reserve".'],
    ['The pastry chef _____ bake fresh croissants for the morning shift.', ['is going to', 'will to', 'going', 'was'], 0, 'Rencana shift pagi -> "is going to bake".'],
    ['I _____ check if any gluten-free bread is still available.', ['will', 'did', 'was', 'have'], 0, 'Inisiatif segera waiter -> "will check".'],
    ['They _____ check out tomorrow after eating breakfast here.', ['are going to', 'going to', 'will to', 'were'], 0, 'Rencana tamu besok -> "are going to".'],
  ];
  futSeeds.forEach((s) => push('simple-future', s[0], s[1], s[2], s[3]));

  // 5. Present Perfect (21 items)
  const ppSeeds: [string, [string, string, string, string], number, string][] = [
    ['Waiter: I _____ already _____ the kitchen about your shellfish allergy.', ['have / informed', 'has / informed', 'am / inform', 'did / informed'], 0, 'Subjek "I" + "already" -> "have informed".'],
    ['Your room service order _____ just _____ at the service elevator.', ['has / arrived', 'have / arrived', 'is / arrive', 'did / arrived'], 0, 'Subjek tunggal "order" + "just" -> "has arrived".'],
    ['Have you _____ our chef’s homemade tiramisu before?', ['try', 'tried', 'trying', 'tries'], 1, 'Present Perfect tanya memakai "Have + Subject + V3 (tried)".'],
    ['The kitchen _____ prepared a fresh, hotter bowl of tomato soup for you.', ['has', 'have', 'is', 'was'], 0, 'Subjek tunggal "The kitchen" -> "has + V3".'],
    ['We _____ removed the mistaken beverage charge from your bill.', ['have', 'has', 'are', 'did'], 0, 'Subjek "We" -> "have removed".'],
    ['Has Table 7 _____ their main courses yet?', ['receive', 'received', 'receiving', 'receives'], 1, 'Dengan "yet", gunakan "Has + Subject + V3 (received)".'],
    ['She _____ never _____ Indonesian beef rendang, so she wants to order it.', ['has / tasted', 'have / tasted', 'is / taste', 'did / tasted'], 0, 'Pengalaman hidup subjek tunggal "She" -> "has tasted".'],
    ['I _____ placed extra napkins and cutlery on your table.', ['have', 'has', 'am', 'was'], 0, 'Hasil tindakan yang sudah siap sekarang -> "have placed".'],
    ['Sorry, we _____ sold out of the grilled lobster for tonight.', ['have', 'has', 'were', 'did'], 0, 'Kondisi stok habis yang berdampak saat ini -> "have sold out".'],
    ['Mr. Lee _____ stayed at our hotel three times this year.', ['has', 'have', 'is', 'was'], 0, 'Frekuensi hingga saat ini untuk subjek tunggal -> "has stayed".'],
    ['The barista _____ freshly ground the espresso beans for your coffee.', ['has', 'have', 'was', 'did'], 0, '"The barista" tunggal -> "has freshly ground".'],
    ['Have the guests in Suite 901 _____ their breakfast order yet?', ['place', 'placed', 'placing', 'places'], 1, 'Present Perfect membutuhkan V3 ("placed").'],
    ['I _____ worked as a hotel restaurant waiter for four years.', ['have', 'has', 'am', 'was'], 0, 'Durasi dengan "for four years" hingga sekarang -> "have worked".'],
    ['Our chef _____ updated the menu with three new vegan appetizers.', ['has', 'have', 'did', 'is'], 0, '"Our chef" tunggal -> "has updated".'],
    ['We _____ not _____ the payment terminal receipt yet.', ['have / printed', 'has / printed', 'did / printed', 'are / print'], 0, 'Negatif dengan "yet" -> "have not printed".'],
    ['Has the sommelier _____ your glass of chardonnay already?', ['pour', 'poured', 'pouring', 'pours'], 1, 'Tanya Present Perfect memakai V3 ("poured").'],
    ['The dining terrace _____ been fully booked since five o’clock.', ['has', 'have', 'is', 'was'], 0, 'Keadaan sejak jam 5 hingga kini -> "has been".'],
    ['You _____ made a wonderful choice with the herb-crusted lamb!', ['have', 'has', 'are', 'did'], 0, 'Subjek "You" -> "have made".'],
    ['Our manager _____ already offered the guest a complimentary drink.', ['has', 'have', 'is', 'did'], 0, '"Our manager" tunggal -> "has offered".'],
    ['I _____ checked the reservation list twice, and your name is confirmed.', ['have', 'has', 'am', 'was'], 0, 'Sudah dicek dan valid sekarang -> "have checked".'],
    ['The buffet staff _____ refilled the hot breakfast trays.', ['have', 'has', 'is', 'was'], 0, 'Subjek jamak "staff" yang bertindak -> "have refilled".'],
  ];
  ppSeeds.forEach((s) => push('present-perfect', s[0], s[1], s[2], s[3]));

  // 6. Modal Verbs — Polite Offers & Requests (21 items)
  const modSeeds: [string, [string, string, string, string], number, string][] = [
    ['_____ you like something to drink while you look over the menu?', ['Would', 'Are', 'Have', 'Does'], 0, '"Would you like..." adalah ungkapan paling sopan dan standar bagi waiter.'],
    ['_____ I take your dinner order now, or do you need a few more minutes?', ['May', 'Am', 'Do', 'Have'], 0, '"May I..." sangat sopan untuk menawarkan layanan kepada tamu.'],
    ['_____ you please let me know if anyone has a food allergy?', ['Could', 'Are', 'Did', 'Has'], 0, '"Could you please + V1" digunakan untuk permintaan sopan kepada tamu.'],
    ['Guest: _____ we have a quiet table away from the live band?', ['Could', 'Does', 'Is', 'Were'], 0, '"Could we have..." sopan untuk meminta meja.'],
    ['You _____ try our chef’s grilled salmon—it is the freshest catch today.', ['should', 'would to', 'musted', 'canning'], 0, '"should + V1" memberi saran menu yang ramah tanpa memaksa.'],
    ['Waiter: I _____ easily ask the chef to make that pasta mild for you.', ['can', 'cans', 'am can', 'coulds'], 0, 'Modal verb "can" tidak pernah memakai -s dan langsung diikuti V1.'],
    ['_____ you care for freshly cracked black pepper on your salad?', ['Would', 'Are', 'Has', 'Did'], 0, '"Would you care for..." adalah frasa elegan restoran/hotel.'],
    ['Guests _____ charge restaurant meals directly to their hotel room.', ['may', 'mays', 'may to', 'are may'], 0, 'Modal "may + V1" menyatakan izin/prosedur resmi hotel.'],
    ['Could you _____ me your room number so I can complete the slip?', ['give', 'gave', 'giving', 'to give'], 0, 'Setelah modal "Could", selalu gunakan kata kerja dasar V1 ("give").'],
    ['Would you mind _____ at the lounge for five minutes while we set Table 8?', ['wait', 'waiting', 'waited', 'to wait'], 1, 'Khusus frasa "Would you mind...", kata kerja wajib berbentuk V-ing ("waiting").'],
    ['I _____ recommend pairing this ribeye steak with our house red wine.', ['would', 'would to', 'am would', 'willing'], 0, '"I would recommend..." terdengar profesional dan sopan.'],
    ['_____ I bring you an extra glass of ice water?', ['Shall', 'Am', 'Does', 'Have'], 0, '"Shall I + V1" sopan untuk menawarkan bantuan kecil.'],
    ['Guests with severe allergies _____ inform their server before ordering.', ['should', 'should to', 'shoulds', 'are should'], 0, 'Modal "should" tidak pernah diikuti "to".'],
    ['Can I _____ you anything else, such as dessert or espresso?', ['get', 'got', 'getting', 'to get'], 0, 'Setelah "Can I", gunakan V1 ("get").'],
    ['You _____ not pay right now; we can add it to your room folio.', ['need', 'must to', 'would to', 'can to'], 0, '"need not + V1" atau "do not need to" berarti tidak perlu bayar sekarang.'],
    ['_____ you prefer still or sparkling water with your meal?', ['Would', 'Do', 'Are', 'Has'], 0, '"Would you prefer..." menanyakan pilihan tamu dengan sopan.'],
    ['Could I _____ your plates if everyone has finished eating?', ['clear', 'cleared', 'clearing', 'to clear'], 0, '"Could I + V1 (clear)" adalah cara sopan meminta izin mengangkat piring.'],
    ['We _____ substitute regular milk with oat milk in any coffee drink.', ['can', 'cans', 'can to', 'are can'], 0, 'Modal "can" menyatakan kemampuan/opsi menu dengan V1.'],
    ['May I _____ your full name for the dinner reservation?', ['have', 'has', 'having', 'to have'], 0, '"May I have..." selalu memakai V1 ("have").'],
    ['You _____ enjoy sitting on the balcony if you like cool evening air.', ['might', 'mights', 'might to', 'are might'], 0, '"might + V1" memberi saran lembut yang tidak memaksa.'],
    ['Would you _____ your itemized receipt inside the folder or by email?', ['like', 'likes', 'liked', 'to liking'], 0, '"Would you like..." selalu diikuti noun/to-V1 dengan kata dasar "like".'],
  ];
  modSeeds.forEach((s) => push('modal-verbs', s[0], s[1], s[2], s[3]));

  // 7. Imperatives & Polite Instructions (21 items)
  const impSeeds: [string, [string, string, string, string], number, string][] = [
    ['_____ me to your reserved table by the window.', ['Please follow', 'You following', 'Followed', 'To follow'], 0, 'Instruksi sopan ke tamu diawali "Please + V1" ("Please follow").'],
    ['Please _____ careful—this cast-iron skillet is extremely hot.', ['be', 'is', 'are', 'being'], 0, 'Kalimat perintah/peringatan dengan kata sifat memakai "Please be + adj".'],
    ['_____ a seat comfortably while I bring your menus and water.', ['Please take', 'Taking', 'Took', 'To take'], 0, 'Ajakan duduk sopan memakai "Please + V1 (take)".'],
    ['Kitchen note: Please _____ the dressing on the side for Table 3.', ['serve', 'serves', 'served', 'serving'], 0, 'Instruksi ke dapur memakai kata kerja dasar V1 ("serve").'],
    ['_____ hesitate to wave if you need more water or napkins.', ['Do not', 'Not do', 'Does not', 'Are not'], 0, 'Larangan sopan memakai "Do not + V1" ("Do not hesitate").'],
    ['Please _____ the room number and sign at the bottom of the bill.', ['write', 'writes', 'wrote', 'writing'], 0, 'Permintaan pengisian struk memakai "Please + V1 (write)".'],
    ['_____ your delicious meal, and let me know if everything is good.', ['Please enjoy', 'Enjoying', 'Enjoyed', 'Enjoys'], 0, 'Kalimat harapan/persilakan sopan memakai V1 ("Please enjoy").'],
    ['Chef, please _____ this steak medium rare without black pepper.', ['cook', 'cooks', 'cooked', 'cooking'], 0, 'Perintah dapur selalu memakai V1 ("cook").'],
    ['Kindly _____ a moment while I check if Table 10 is clean.', ['wait', 'waits', 'waited', 'waiting'], 0, '"Kindly + V1" adalah bentuk imperative sopan di hotel.'],
    ['Please _____ free to order another round of drinks anytime.', ['feel', 'feels', 'felt', 'feeling'], 0, '"Please feel free to..." memakai kata kerja dasar V1 ("feel").'],
    ['_____ forget to check the allergy column on the order ticket!', ['Never', 'No', 'Not', 'Do'], 0, 'Peringatan penting: "Never + V1 (forget)".'],
    ['Please _____ your coat here on the hanger so it stays clean.', ['hang', 'hangs', 'hung', 'hanging'], 0, 'Arahan sopan memakai "Please + V1 (hang)".'],
    ['_____ your time reviewing our wine list and chef specials.', ['Take', 'Takes', 'Took', 'Taking'], 0, '"Take your time..." memakai V1 di awal kalimat.'],
    ['Please _____ the hotel operator if you want us to clear the tray.', ['call', 'calls', 'called', 'calling'], 0, 'Instruksi layanan kamar memakai "Please + V1 (call)".'],
    ['_____ touch the soup bowl directly; the handle is quite warm.', ['Please do not', 'Please not', 'Do no', 'Are not'], 0, 'Peringatan larangan sopan memakai "Please do not + V1".'],
    ['Kindly _____ this card against the contactless reader to pay.', ['tap', 'taps', 'tapped', 'tapping'], 0, 'Petunjuk pembayaran memakai "Kindly + V1 (tap)".'],
    ['_____ a pleasant stay with us here at the Grand Hotel!', ['Have', 'Has', 'Having', 'Had'], 0, 'Ucapan perpisahan standar perhotelan memakai V1 ("Have...").'],
    ['Please _____ me know once you are ready to order dessert.', ['let', 'lets', 'letting', 'to let'], 0, '"Please let me know..." memakai V1 ("let").'],
    ['_____ the fresh lime juice into the glass just before serving.', ['Squeeze', 'Squeezes', 'Squeezed', 'Squeezing'], 0, 'Instruksi penyajian memakai V1 ("Squeeze").'],
    ['Please _____ straight ahead; the restrooms are on your left.', ['walk', 'walks', 'walked', 'walking'], 0, 'Memberi arah kepada tamu memakai "Please + V1 (walk)".'],
    ['_____ sure to double-check whether the guest prefers still or sparkling.', ['Make', 'Makes', 'Made', 'Making'], 0, 'SOP waiter menggunakan imperative V1 ("Make sure...").'],
  ];
  impSeeds.forEach((s) => push('imperatives', s[0], s[1], s[2], s[3]));

  return qs.slice(0, TOTAL_BANK_SIZE);
}

export const LISTENING_BANK_150: HospitalityListeningDrill[] = buildListeningBank();
export const DICTATION_BANK_150: HospitalityDictationDrill[] = buildDictationBank();
export const PRONUNCIATION_BANK_150: HospitalityPronunciationDrill[] = buildPronunciationBank();
export const GRAMMAR_BANK_150: HospitalityGrammarQuestion[] = buildGrammarBank();
