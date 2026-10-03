const TONES = [
  ["#1e1b4b", "#6d28d9", "#f9a8d4"],
  ["#111827", "#b91c1c", "#fdba74"],
  ["#042f2e", "#0f766e", "#99f6e4"],
  ["#3f1d12", "#c2410c", "#fed7aa"],
  ["#172554", "#1d4ed8", "#bfdbfe"],
  ["#3b0764", "#a21caf", "#f5d0fe"],
  ["#14532d", "#15803d", "#bbf7d0"],
  ["#1c1917", "#a16207", "#fde68a"],
];

const STREAM = [
  ["After Hours Line", "Drama", "Hindi", 199],
  ["Platform 4", "Thriller", "English", 249],
  ["Little Lanterns", "Kids", "Hindi", 99],
  ["Salt Kitchen", "Documentary", "English", 149],
  ["The Second Bell", "Drama", "Tamil", 199],
  ["Rooftop League", "Comedy", "Hindi", 149],
  ["Quiet Harbour", "Romance", "English", 199],
  ["Signal Lost", "Thriller", "Tamil", 249],
  ["Paper Kites", "Kids", "Hindi", 99],
  ["Night Classroom", "Drama", "English", 199],
  ["River Post", "Adventure", "Tamil", 249],
  ["Two Tickets", "Comedy", "Hindi", 149],
  ["Glass Orchard", "Mystery", "English", 249],
  ["Monsoon Desk", "Drama", "Hindi", 199],
  ["Field Notes", "Documentary", "English", 149],
  ["Copper Sky", "Adventure", "Tamil", 249],
  ["Sunday Match", "Comedy", "Hindi", 149],
  ["The Last Row", "Thriller", "English", 299],
  ["Blue Courtyard", "Romance", "Tamil", 199],
  ["Station Tea", "Drama", "Hindi", 149],
  ["Orbit Club", "Action", "English", 299],
  ["Warm Static", "Documentary", "Tamil", 149],
];

const EVENTS = [
  ["Harbour Jazz Night", "Music", 799, "Bandra Amphitheatre"],
  ["Open Mic at the Mill", "Comedy", 499, "The Mill Hall"],
  ["City Lights Walk", "Workshops", 699, "Old Town Studio"],
  ["Late Local", "Comedy", 599, "Basement Club"],
  ["Indie Band Sundown", "Music", 999, "Seaface Lawn"],
  ["Kids Drum Circle", "Kids", 399, "Community Park"],
  ["Photography Walk", "Workshops", 899, "Heritage Quarter"],
  ["Rooftop Acoustic", "Music", 749, "Skyline Terrace"],
  ["Improv Friday", "Comedy", 549, "Black Box Room"],
  ["Food Lane Festival", "Nightlife", 299, "Market Street"],
  ["Design Talks", "Talks", 499, "Design Hall"],
  ["Classical Evening", "Music", 1299, "Town Hall"],
  ["Comedy Garage", "Comedy", 649, "Warehouse 3"],
  ["Vinyl Night", "Nightlife", 799, "Record Room"],
  ["Poetry Under Trees", "Talks", 349, "Botanical Lawn"],
  ["School Band Fest", "Kids", 299, "College Ground"],
  ["Electronic Dusk", "Nightlife", 1499, "Dockyard"],
  ["Choir in the Park", "Music", 399, "Central Park Stage"],
  ["Startup Stories", "Talks", 599, "Founders Loft"],
  ["Magic for Families", "Kids", 499, "Family Theatre"],
  ["Folk Strings", "Music", 699, "Courtyard Stage"],
  ["Laugh Factory Hour", "Comedy", 799, "Laugh Factory"],
];

const PLAYS = [
  ["The Last Bench", "Drama", 450, "Prithvi-style Studio"],
  ["Two Doorbells", "Comedy", 400, "City Playhouse"],
  ["Monsoon Script", "Drama", 500, "Black Box"],
  ["Aunties of Gate 4", "Comedy", 350, "Neighbourhood Stage"],
  ["Harbour Ghost", "Drama", 550, "Dock Theatre"],
  ["Paper Crown", "Musical", 700, "Music Hall"],
  ["The Waiting Room", "Drama", 480, "Studio 2"],
  ["Three Chairs", "Experimental", 300, "Loft Theatre"],
  ["Wedding Rehearsal", "Comedy", 420, "City Playhouse"],
  ["Night Watchman", "Drama", 520, "Town Hall"],
  ["Little Radio", "Musical", 650, "Music Hall"],
  ["The Empty Flat", "Drama", 480, "Studio 1"],
  ["Bus Stop Stories", "Comedy", 380, "Street Theatre"],
  ["Red Curtain", "Drama", 600, "Grand Stage"],
  ["Kitchen Politics", "Comedy", 400, "Cafe Theatre"],
  ["A Letter Home", "Drama", 450, "Studio 2"],
  ["The Silent Choir", "Musical", 750, "Music Hall"],
  ["Platform Number", "Experimental", 320, "Loft Theatre"],
  ["Sunday Lunch", "Comedy", 360, "Neighbourhood Stage"],
  ["Salt and Script", "Drama", 540, "Black Box"],
  ["The Extra Actor", "Comedy", 410, "City Playhouse"],
  ["Closing Night", "Drama", 580, "Grand Stage"],
];

const SPORTS = [
  ["City Cup: North vs Harbour", "Cricket", 499, "City Cricket Ground"],
  ["Sunday League Derby", "Football", 399, "Municipal Stadium"],
  ["Pro Kabaddi Friendly", "Kabaddi", 599, "Indoor Arena"],
  ["Harbour Open", "Tennis", 799, "Lawn Tennis Club"],
  ["Night Run 10K", "Running", 699, "Seaface Start"],
  ["Badminton Masters", "Badminton", 450, "Sports Complex"],
  ["State Cricket Quarterfinal", "Cricket", 699, "City Cricket Ground"],
  ["Women's Football Cup", "Football", 349, "Municipal Stadium"],
  ["University Cricket", "Cricket", 299, "College Ground"],
  ["Corporate Football", "Football", 250, "Turf Arena"],
  ["Junior Tennis Open", "Tennis", 399, "Lawn Tennis Club"],
  ["Marathon Relay", "Running", 899, "City Start Line"],
  ["Kabaddi Knockout", "Kabaddi", 549, "Indoor Arena"],
  ["Box Cricket Night", "Cricket", 350, "Turf Arena"],
  ["Five-a-side Final", "Football", 299, "Sports Complex"],
  ["Sunrise 5K", "Running", 499, "Lake Path"],
  ["Doubles Badminton", "Badminton", 400, "Sports Complex"],
  ["Legends Cricket", "Cricket", 999, "City Cricket Ground"],
  ["School Football Final", "Football", 199, "College Ground"],
  ["Night Kabaddi", "Kabaddi", 650, "Indoor Arena"],
  ["Club Tennis Final", "Tennis", 850, "Lawn Tennis Club"],
  ["Charity Run", "Running", 599, "Central Park"],
];

const ACTIVITIES = [
  ["Hot Air Balloon Dawn", "Adventure", 3499, "Outskirts Field"],
  ["Pottery Wheel Hour", "Workshops", 899, "Clay Studio"],
  ["Escape Room: Ticket Booth", "Gaming", 799, "Puzzle House"],
  ["Street Food Trail", "Food", 999, "Old Market"],
  ["Kayak on the Creek", "Adventure", 1499, "Creek Jetty"],
  ["Amusement Day Pass", "Amusement", 1299, "Fun City Park"],
  ["Board Game Cafe Night", "Gaming", 499, "Dice Cafe"],
  ["Baking for Beginners", "Food", 1199, "Test Kitchen"],
  ["Heritage Walk", "Tours", 599, "Old Fort Gate"],
  ["Zip Line Park", "Adventure", 1899, "Hill Park"],
  ["VR Arcade Pass", "Gaming", 699, "Pixel Arcade"],
  ["Sunrise Yoga Deck", "Wellness", 499, "Terrace Studio"],
  ["Chocolate Workshop", "Food", 1099, "Cocoa Lab"],
  ["Go-kart Evening", "Amusement", 999, "Speed Track"],
  ["Museum After Dark", "Tours", 450, "City Museum"],
  ["Rock Climbing Intro", "Adventure", 1299, "Climbing Gym"],
  ["Family Picnic Lawn", "Amusement", 399, "Central Park"],
  ["Cocktail Mix Class", "Food", 1599, "Bar School"],
  ["Photography Darkroom", "Workshops", 1399, "Camera House"],
  ["Bowling and Dinner", "Gaming", 899, "Strike Alley"],
  ["Birding Morning", "Tours", 749, "Lake Trail"],
  ["Spa Circuit", "Wellness", 2199, "Quiet Spa"],
];

const GIFTS = [
  ["Birthday Night Out", "Birthday", 1000],
  ["Movie Date", "Occasion", 500],
  ["Family Sunday", "Family", 2000],
  ["Festival Treat", "Festive", 1500],
  ["Just Because", "Generic", 1000],
  ["Thank You", "Occasion", 750],
  ["New Year Screening", "Festive", 2500],
  ["Kids Matinee", "Family", 500],
  ["Anniversary Seats", "Occasion", 3000],
  ["Weekend Pass", "Generic", 2000],
  ["Diwali Lights", "Festive", 5000],
  ["Graduation Night", "Occasion", 1500],
  ["Friends Row", "Generic", 1000],
  ["Monsoon Movie", "Generic", 750],
  ["Premium Premiere", "Occasion", 5000],
  ["Holi Colour Card", "Festive", 1000],
  ["Teacher's Treat", "Occasion", 500],
  ["Welcome Home", "Family", 2000],
  ["Midnight Show", "Generic", 1500],
  ["Silver Screen", "Generic", 2500],
  ["Box of Tickets", "Family", 4000],
  ["Any Film, Any Day", "Generic", 1000],
];

const OFFERS = [
  ["SAVE50", "Flat ₹50 off on your ticket total", "In-app", true],
  ["TAKE10", "10% off when you pay", "In-app", true],
  ["WEEKEND100", "₹100 off on weekend shows above ₹500", "Partner", false],
  ["UPI20", "₹20 back on UPI payments", "Partner", false],
  ["CARD15", "15% off with select cards, up to ₹150", "Partner", false],
  ["FIRSTSHOW", "₹75 off on the first show of the day", "Partner", false],
  ["STUDENT50", "Flat ₹50 off with a student ID", "Partner", false],
  ["FAMILY4", "Buy 3 tickets and get ₹100 off the fourth", "Partner", false],
  ["LUNCHSHOW", "Matinee shows from ₹150", "Partner", false],
  ["PREMIERE10", "10% off premiere rows on Tuesdays", "Partner", false],
  ["WALLET200", "₹200 wallet bonus on a ₹2000 top-up", "Partner", false],
  ["SNACKS", "Free popcorn on gold seats", "Partner", false],
  ["EARLYBIRD", "₹60 off when you book before noon", "Partner", false],
  ["NIGHT50", "₹50 off on shows after 9 pm", "Partner", false],
  ["BIRTHDAY", "A free ticket on your birthday", "Partner", false],
  ["GROUP6", "₹300 off a booking of 6 or more", "Partner", false],
  ["RECLINER", "₹120 off recliner seats", "Partner", false],
  ["IMAX", "₹100 off large-format screens", "Partner", false],
  ["MONSOON", "Rainy-day ticket at ₹199", "Partner", false],
  ["LOYAL5", "Fifth booking in a month is ₹100 off", "Partner", false],
  ["PARKING", "Free parking with two tickets", "Partner", false],
  ["COMBO", "Ticket plus snack combo saves ₹40", "Partner", false],
];

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function streamRows() {
  return STREAM.map((row, index) => ({
    section: "stream",
    slug: slug(row[0]),
    title: row[0],
    category: row[1],
    language: row[2],
    price: row[3],
    dayOffset: 0,
    venue: "BookMyShow Stream",
    about: `${row[0]} is available to stream in ${row[2]}. Rent it once and watch within 48 hours.`,
    tone: index % TONES.length,
  }));
}

function eventRows(section, rows) {
  return rows.map((row, index) => ({
    section,
    slug: slug(row[0]),
    title: row[0],
    category: row[1],
    language: "",
    price: row[2],
    dayOffset: (index % 18) + 1,
    venue: `{city} · ${row[3]}`,
    about: `${row[0]} is listed in {city}. ${row[1]} · from ₹${row[2]} onwards.`,
    tone: index % TONES.length,
  }));
}

function giftRows() {
  return GIFTS.map((row, index) => ({
    section: "gift-cards",
    slug: slug(row[0]),
    title: row[0],
    category: row[1],
    language: "",
    price: row[2],
    dayOffset: 0,
    venue: "Email delivery",
    about: `A ₹${row[2]} BookMyShow gift card for ${row[0].toLowerCase()}. The recipient picks the film.`,
    tone: index % TONES.length,
  }));
}

const LISTS = {
  stream: streamRows(),
  events: eventRows("events", EVENTS),
  plays: eventRows("plays", PLAYS),
  sports: eventRows("sports", SPORTS),
  activities: eventRows("activities", ACTIVITIES),
  "gift-cards": giftRows(),
};

export const SECTION_META = {
  stream: { title: "Stream", noun: "titles" },
  events: { title: "Events", noun: "events" },
  plays: { title: "Plays", noun: "plays" },
  sports: { title: "Sports", noun: "matches" },
  activities: { title: "Activities", noun: "activities" },
  "gift-cards": { title: "Gift Cards", noun: "gift cards" },
};

export function tone(index) {
  return TONES[index % TONES.length];
}

export function listings(section) {
  return LISTS[section] || [];
}

export function categories(section) {
  return [...new Set(listings(section).map((item) => item.category))];
}

export function findListing(section, itemSlug) {
  return listings(section).find((item) => item.slug === itemSlug) || null;
}

export function venueLabel(item, cityName) {
  return item.venue.replaceAll("{city}", cityName || "your city");
}

export function aboutLabel(item, cityName) {
  return item.about.replaceAll("{city}", cityName || "your city");
}

export function whenLabel(item) {
  if (!item.dayOffset) return item.language || item.category;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  const when = new Date(Date.UTC(year, month - 1, day + item.dayOffset));
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(when);
}

export function searchListings(query) {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  return Object.values(LISTS).flat().filter((item) => {
    const haystack = `${item.title} ${item.category} ${item.language}`.toLowerCase();
    return haystack.includes(term);
  });
}

export function offers() {
  return OFFERS.map(([code, text, kind, works], index) => ({
    code,
    text,
    kind,
    works,
    tone: index % TONES.length,
  }));
}
