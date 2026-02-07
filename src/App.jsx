import { useState, useReducer, useCallback, useRef, useEffect } from "react";

// ─── QUESTIONS FROM KILMACRENNAN SCHOOL QUIZ (sports removed) + general knowledge ───
const DEFAULT_QUESTIONS = {
  "Nature & Wildlife": [
    { question: "What animal lives in a home called a drey?", options: ["Badger", "Squirrel", "Fox", "Rabbit"], answer: "Squirrel", flavour: "A drey is a compact, ball-shaped nest usually found high in the fork of a tree." },
    { question: "What species of bear is commonly found in The Arctic Circle?", options: ["Grizzly", "Black bear", "Polar bear", "Brown bear"], answer: "Polar bear", flavour: "Polar bears are the largest land carnivores and can swim for days at a time." },
    { question: "Known as Bellis in Latin, name the common garden flower traditionally used to make chains.", options: ["Buttercup", "Daisy", "Clover", "Dandelion"], answer: "Daisy", flavour: "The name 'daisy' comes from 'day's eye' because the flower opens at dawn." },
    { question: "What 'M' refers to shellfish like cockles, mussels and oysters that stick to rocks?", options: ["Mammals", "Molluscs", "Minerals", "Microbes"], answer: "Molluscs", flavour: "There are over 85,000 known species of mollusc — the second-largest phylum of animals." },
    { question: "Which tree has varieties called 'Weeping' and 'Pussy'?", options: ["Oak", "Birch", "Willow", "Elm"], answer: "Willow", flavour: "Willow bark contains salicin, which led to the development of aspirin." },
    { question: "What name is given to a mass of ice that travels slowly overland?", options: ["Iceberg", "Glacier", "Avalanche", "Tundra"], answer: "Glacier", flavour: "Glaciers store about 69% of the world's fresh water." },
    { question: "What type of rock forms as a result of magma or lava cooling down?", options: ["Sedimentary", "Metamorphic", "Igneous", "Limestone"], answer: "Igneous", flavour: "The word 'igneous' comes from the Latin 'ignis' meaning fire." },
    { question: "What is a group of crows called?", options: ["A flock", "A murder", "A parliament", "A charm"], answer: "A murder", flavour: "The term dates back to the 15th century and likely refers to crows' association with battlefields." },
    { question: "Which corvid is the largest?", options: ["Magpie", "Jackdaw", "Raven", "Rook"], answer: "Raven", flavour: "Common ravens can have a wingspan of over 1.3 metres!" },
    { question: "What colour eggs do blackbirds lay?", options: ["White", "Blue-green with spots", "Brown", "Pink"], answer: "Blue-green with spots", flavour: "The distinctive colour comes from the pigment biliverdin." },
  ],
  "History & Geography": [
    { question: "World War 1 Armistice Day came into effect on which date in November 1918?", options: ["1st", "5th", "11th", "15th"], answer: "11th", flavour: "The armistice was signed at 5am but took effect at 11am — the eleventh hour of the eleventh day of the eleventh month." },
    { question: "In what city was Martin Luther King shot in 1968?", options: ["Atlanta", "Washington", "Memphis", "Birmingham"], answer: "Memphis", flavour: "Dr King was standing on the balcony of the Lorraine Motel when he was assassinated." },
    { question: "The Statue of Liberty was given by France to the United States in what year?", options: ["1876", "1884", "1892", "1901"], answer: "1884", flavour: "The statue's full name is 'Liberty Enlightening the World' and she weighs about 204 tonnes." },
    { question: "In which county of Ireland would you find the Cliffs of Moher?", options: ["Kerry", "Cork", "Clare", "Galway"], answer: "Clare", flavour: "The Cliffs of Moher reach 214 metres at their highest point and are over 300 million years old." },
    { question: "In which year did the Easter Rising take place in Ireland?", options: ["1912", "1916", "1921", "1922"], answer: "1916", flavour: "The rising lasted six days, from 24 to 30 April, centred on Dublin." },
    { question: "What were the four historical provinces of Ireland?", options: ["Dublin, Cork, Galway, Belfast", "Ulster, Munster, Leinster, Connacht", "North, South, East, West", "Meath, Offaly, Antrim, Kerry"], answer: "Ulster, Munster, Leinster, Connacht", flavour: "Each province once had its own king. A fifth province, Meath, was historically sometimes included." },
    { question: "Which is the longest river in Ireland?", options: ["River Liffey", "River Shannon", "River Lee", "River Barrow"], answer: "River Shannon", flavour: "The Shannon is 360km long and drains one-fifth of the island's land area." },
    { question: "Older than Stonehenge or the Egyptian pyramids, Newgrange was built around what year BC?", options: ["1200 BC", "2000 BC", "3200 BC", "4500 BC"], answer: "3200 BC", flavour: "Newgrange is illuminated by sunlight through a roof box on the winter solstice each December." },
    { question: "The Po and Tiber rivers are found in which European country?", options: ["Spain", "France", "Italy", "Greece"], answer: "Italy", flavour: "The Tiber flows through Rome and the Po is the longest river in Italy at 652km." },
    { question: "Which English port is closest to France?", options: ["Southampton", "Portsmouth", "Dover", "Plymouth"], answer: "Dover", flavour: "The Strait of Dover is only 33.3km wide at its narrowest point." },
  ],
  "Science & Discovery": [
    { question: "What 'H' is the acid produced in the human stomach to help break down food?", options: ["Hydrogen peroxide", "Hydrochloric acid", "Hyaluronic acid", "Hydrofluoric acid"], answer: "Hydrochloric acid", flavour: "Your stomach lining replaces itself every few days to protect against this powerful acid." },
    { question: "On what side of your body is your heart located?", options: ["Right", "Centre", "Left", "It varies"], answer: "Left", flavour: "The heart is actually slightly left of centre, with about two-thirds of it on the left side." },
    { question: "Is the diaphragm muscle located under the lungs or the heart?", options: ["Under the heart", "Under the lungs", "In the abdomen", "In the neck"], answer: "Under the lungs", flavour: "The diaphragm is a dome-shaped muscle essential for breathing — it contracts to create a vacuum." },
    { question: "Molars, premolars, canines and incisors are all types of what?", options: ["Bones", "Muscles", "Teeth", "Joints"], answer: "Teeth", flavour: "Adult humans have 32 teeth — 8 incisors, 4 canines, 8 premolars, and 12 molars." },
    { question: "Beginning with A, what is a counting frame where coloured beads help calculate?", options: ["Algebra", "Abacus", "Algorithm", "Axiom"], answer: "Abacus", flavour: "The abacus has been used for over 4,000 years and is still used in some parts of Asia today." },
    { question: "If Jonathan leaves at 8:30am and arrives at 9:05am, how long is the journey?", options: ["25 minutes", "30 minutes", "35 minutes", "40 minutes"], answer: "35 minutes", flavour: "Time calculations are one of the most practical maths skills used every day!" },
    { question: "How many straight edges are there on a triangular prism?", options: ["Six", "Eight", "Nine", "Twelve"], answer: "Nine", flavour: "A triangular prism has 5 faces, 9 edges, and 6 vertices." },
    { question: "Beginning with T, what is a violently spinning funnel of air sometimes called a twister?", options: ["Typhoon", "Tornado", "Tempest", "Tremor"], answer: "Tornado", flavour: "The most powerful tornadoes can have wind speeds exceeding 480 km/h." },
    { question: "How many minutes in 2 hours?", options: ["100", "110", "120", "130"], answer: "120", flavour: "The minute gets its name from the Latin 'pars minuta' meaning 'small part'." },
    { question: "What is the name of the oath taken by doctors named after a Greek doctor?", options: ["Socratic oath", "Hippocratic oath", "Platonic oath", "Galenic oath"], answer: "Hippocratic oath", flavour: "Hippocrates is considered the 'Father of Medicine' and lived around 460–370 BC." },
  ],
  "Arts & Culture": [
    { question: "Who composed the Dance of the Sugar Plum Fairy?", options: ["Mozart", "Tchaikovsky", "Beethoven", "Bach"], answer: "Tchaikovsky", flavour: "It's part of The Nutcracker ballet and uses a celesta, giving it that magical tinkling sound." },
    { question: "Pierce Brosnan, Daniel Craig and Sean Connery have all played which iconic role?", options: ["Sherlock Holmes", "James Bond", "Robin Hood", "Doctor Who"], answer: "James Bond", flavour: "There have been six official Bond actors since the franchise began in 1962." },
    { question: "Which actor plays Bilbo Baggins in The Hobbit and Dr Watson in Sherlock?", options: ["Benedict Cumberbatch", "Ian McKellen", "Martin Freeman", "Elijah Wood"], answer: "Martin Freeman", flavour: "Freeman also starred in The Office UK and the Hitchhiker's Guide to the Galaxy film." },
    { question: "Fathers Jack, Ted and Dougal lived on which fictional island?", options: ["Inis Mór", "Craggy Island", "Skellig Island", "Blasket Island"], answer: "Craggy Island", flavour: "Father Ted was filmed on location around Counties Clare, Galway and Dublin." },
    { question: "Muy Bien means 'Very Good' in what language?", options: ["French", "Italian", "Portuguese", "Spanish"], answer: "Spanish", flavour: "Spanish is the second most spoken language in the world by native speakers." },
    { question: "Complete the flag name: The Union ________?", options: ["Flag", "Jack", "Standard", "Banner"], answer: "Jack", flavour: "It combines the crosses of St George, St Andrew, and St Patrick." },
    { question: "Who released the album '25' in 2015?", options: ["Taylor Swift", "Adele", "Beyoncé", "Ed Sheeran"], answer: "Adele", flavour: "The album sold over 3.38 million copies in its first week in the US alone." },
    { question: "Rachel's Holiday and Watermelon were written by which Irish novelist?", options: ["Maeve Binchy", "Cecelia Ahern", "Marian Keyes", "Sally Rooney"], answer: "Marian Keyes", flavour: "Keyes has sold over 35 million books worldwide in 33 languages." },
    { question: "Ciarán Brennan, Moya Brennan and Pól Brennan are members of which Irish folk band?", options: ["The Dubliners", "Clannad", "The Chieftains", "The Corrs"], answer: "Clannad", flavour: "Clannad are from Gweedore, County Donegal, and Enya is Moya's sister." },
    { question: "How many letters are there in the Irish alphabet?", options: ["18", "21", "24", "26"], answer: "18", flavour: "The Irish alphabet omits J, K, Q, V, W, X, Y, and Z from the standard Latin alphabet." },
  ],
  "Food & Foraging": [
    { question: "Tahini is a paste or condiment made from which seeds?", options: ["Sunflower", "Pumpkin", "Sesame", "Poppy"], answer: "Sesame", flavour: "Tahini has been eaten for over 4,000 years and is a key ingredient in hummus." },
    { question: "What common woodland berry is deadly poisonous?", options: ["Blackberry", "Elderberry", "Deadly nightshade", "Sloe"], answer: "Deadly nightshade", flavour: "Just 2-5 berries of Atropa belladonna can be fatal to a child." },
    { question: "What nut comes from an oak tree?", options: ["Chestnut", "Hazelnut", "Acorn", "Walnut"], answer: "Acorn", flavour: "Acorns were a staple food for many peoples, ground into flour after leaching out tannins." },
    { question: "What is 'mead' made from?", options: ["Grapes", "Barley", "Honey", "Apples"], answer: "Honey", flavour: "Mead is one of the oldest alcoholic drinks, predating wine and beer by thousands of years." },
    { question: "Which fruit grows wild on brambles?", options: ["Raspberry", "Blackberry", "Gooseberry", "Strawberry"], answer: "Blackberry", flavour: "In Irish folklore, blackberries shouldn't be eaten after Halloween as the púca spits on them!" },
    { question: "What is 'wild garlic' also known as?", options: ["Chives", "Ramsons", "Leeks", "Shallots"], answer: "Ramsons", flavour: "Wild garlic carpets woodland floors in spring with white star-shaped flowers." },
    { question: "What colour is a ripe sloe berry?", options: ["Red", "Dark blue-purple", "Green", "Orange"], answer: "Dark blue-purple", flavour: "Sloes are traditionally picked after the first frost to make sloe gin." },
    { question: "What part of a dandelion can you eat?", options: ["Only the flower", "Only the leaves", "Only the root", "All parts"], answer: "All parts", flavour: "Dandelion greens are more nutritious than spinach, and the root makes a coffee substitute." },
    { question: "Which mushroom is prized in French cuisine and can cost over €3,000 per kilo?", options: ["Button mushroom", "Truffle", "Portobello", "Chanterelle"], answer: "Truffle", flavour: "White truffles from Alba, Italy are the most expensive variety in the world." },
    { question: "What plant makes nettle tea?", options: ["Dock leaves", "Stinging nettle", "Clover", "Dandelion"], answer: "Stinging nettle", flavour: "Cooking or drying nettles destroys the stinging chemicals. They're rich in iron and vitamins." },
  ],
  "Riddles & Whimsy": [
    { question: "NEWS stands for North, East, West and _______?", options: ["South", "Sky", "Sun", "Star"], answer: "South", flavour: "Though this is a popular folk etymology, NEWS actually just comes from the word 'new'!" },
    { question: "I have cities but no houses, forests but no trees, and water but no fish. What am I?", options: ["A dream", "A map", "A painting", "A story"], answer: "A map", flavour: "The oldest known world map is a Babylonian clay tablet from about 600 BC." },
    { question: "The more you take, the more you leave behind. What are they?", options: ["Memories", "Footsteps", "Breaths", "Dreams"], answer: "Footsteps", flavour: "A woodland favourite — every creature leaves its mark on the forest floor." },
    { question: "What gets wetter the more it dries?", options: ["A sponge", "A towel", "Rain", "A river"], answer: "A towel", flavour: "The oldest known towels date back to ancient Turkey — hence 'Turkish towels'." },
    { question: "What belongs to you but others use it more?", options: ["Your shadow", "Your name", "Your voice", "Your reflection"], answer: "Your name", flavour: "In many folklore traditions, knowing someone's true name gives you power over them." },
    { question: "If a rooster laid an egg on the peak of a roof, which way would it roll?", options: ["Left", "Right", "Both sides", "Roosters don't lay eggs"], answer: "Roosters don't lay eggs", flavour: "Only hens lay eggs — but corvids are much cleverer than chickens anyway!" },
    { question: "What has many keys but can't open a single lock?", options: ["A piano", "A keyboard", "A typewriter", "All of these"], answer: "All of these", flavour: "The QWERTY keyboard layout was designed in 1873 and hasn't changed much since." },
    { question: "When does a ship fly the Blue Peter Flag?", options: ["During storms", "When leaving port", "When in distress", "On Sundays"], answer: "When leaving port", flavour: "The Blue Peter flag is blue with a white rectangle in the centre — it signals 'all aboard'." },
    { question: "What 'R' is a room used for communal meals in a religious institution?", options: ["Rectory", "Refectory", "Repository", "Reliquary"], answer: "Refectory", flavour: "Leonardo da Vinci's The Last Supper was painted on the wall of a refectory in Milan." },
    { question: "Which nursery rhyme character was a merry old soul who called for his fiddlers three?", options: ["Humpty Dumpty", "Old King Cole", "Jack and Jill", "Little Bo Peep"], answer: "Old King Cole", flavour: "Old King Cole may have been based on a real Romano-British king from the 3rd century." },
  ],
};

const CATEGORIES = Object.keys(DEFAULT_QUESTIONS);
const CAT_COLORS = ["#6B8E5B", "#C4915E", "#7B86B5", "#B57BAA", "#6B9EC4", "#C4A64E"];
const CAT_ICONS = ["🌿", "🗺️", "🔬", "🎨", "🍄", "✨"];
const CAT_LABELS_SHORT = ["Nature", "History", "Science", "Arts", "Food", "Riddles"];

// ─── ISOMETRIC BOARD ───
// Create a winding path through an isometric woodland landscape
const ISO_ANGLE = Math.PI / 6; // 30 degrees for isometric
const toIso = (x, y, z = 0) => ({
  sx: 500 + (x - y) * Math.cos(ISO_ANGLE) * 1.0,
  sy: 300 + (x + y) * Math.sin(ISO_ANGLE) * 0.6 - z * 0.8,
});

// Winding path through the woodland
const PATH_POINTS = [
  // Start bottom-left, wind through forest
  { gx: -4, gy: 4 }, { gx: -3, gy: 5 }, { gx: -2, gy: 5.5 }, { gx: -1, gy: 5 }, { gx: 0, gy: 4.5 },
  // Wind up through centre
  { gx: 1, gy: 4 }, { gx: 2, gy: 3.5 }, { gx: 3, gy: 3 }, { gx: 3.5, gy: 2 }, { gx: 3, gy: 1 },
  // Across the top
  { gx: 2, gy: 0.5 }, { gx: 1, gy: 0 }, { gx: 0, gy: -0.5 }, { gx: -1, gy: -1 }, { gx: -2, gy: -1.5 },
  // Down the left side
  { gx: -3, gy: -1 }, { gx: -4, gy: -0.5 }, { gx: -4.5, gy: 0.5 }, { gx: -4, gy: 1.5 }, { gx: -3.5, gy: 2.5 },
  // Wind back to middle
  { gx: -3, gy: 3 }, { gx: -2, gy: 2.5 }, { gx: -1, gy: 2 }, { gx: 0, gy: 2 }, { gx: 1, gy: 2.5 },
  // Final stretch to centre
  { gx: 1.5, gy: 1.5 }, { gx: 1, gy: 1 }, { gx: 0.5, gy: 0.5 }, { gx: 0, gy: 1 }, { gx: -0.5, gy: 1.5 },
];

const BOARD_SPACES = PATH_POINTS.map((p, i) => {
  const scale = 60;
  const iso = toIso(p.gx * scale, p.gy * scale);
  const catIndex = i % 6;
  const isHub = i % 5 === 0;
  const hubNames = ["The Old Oak", "Mossy Bridge", "Bramble Hollow", "Rookery Tower", "Magpie's Market", "Blackbird Pond"];
  return {
    id: i, x: iso.sx, y: iso.sy,
    gx: p.gx, gy: p.gy,
    catIndex, isHub,
    label: isHub ? hubNames[catIndex] : null,
  };
});

const CENTER_ISO = toIso(0, 1 * 30);

const BIRD_NAMES = ["Crow", "Magpie", "Rook", "Jackdaw"];
const BIRD_COLORS = ["#1A1A2E", "#F0EBE0", "#3D2B5A", "#4A5D6B"];
const BIRD_ACCENTS = ["#FFD700", "#2196F3", "#9C27B0", "#4CAF50"];
const BIRD_EMOJIS = ["🐦‍⬛", "🐦", "🪶", "🕊️"];

// ─── ISOMETRIC DECORATIONS ───
const TREES = [
  // Dense outer forest ring
  { gx: -6.5, gy: 6.5, type: "pine", size: 1.3 }, { gx: -5.5, gy: 6, type: "oak", size: 1.2 },
  { gx: -4.5, gy: 6.5, type: "pine", size: 1.0 }, { gx: -3.5, gy: 7, type: "birch", size: 0.9 },
  { gx: -2, gy: 7, type: "pine", size: 1.1 }, { gx: -0.5, gy: 6.5, type: "oak", size: 1.0 },
  { gx: 1, gy: 6.5, type: "pine", size: 0.8 }, { gx: 2.5, gy: 6, type: "birch", size: 1.1 },
  { gx: 3.5, gy: 5.5, type: "pine", size: 1.2 }, { gx: 4.5, gy: 5, type: "oak", size: 1.0 },
  { gx: 5.5, gy: 4.5, type: "pine", size: 1.3 }, { gx: 6, gy: 3.5, type: "birch", size: 0.9 },
  { gx: 6.5, gy: 2.5, type: "oak", size: 1.1 }, { gx: 6.5, gy: 1, type: "pine", size: 1.0 },
  { gx: 6, gy: -0.5, type: "pine", size: 1.2 }, { gx: 5.5, gy: -1.5, type: "oak", size: 0.9 },
  { gx: 4.5, gy: -2, type: "birch", size: 1.1 }, { gx: 3.5, gy: -2.5, type: "pine", size: 1.0 },
  { gx: 2, gy: -3, type: "oak", size: 1.3 }, { gx: 0.5, gy: -3, type: "pine", size: 0.8 },
  { gx: -1, gy: -2.5, type: "birch", size: 1.0 }, { gx: -2.5, gy: -2.5, type: "pine", size: 1.2 },
  { gx: -4, gy: -2, type: "oak", size: 1.1 }, { gx: -5.5, gy: -1.5, type: "pine", size: 0.9 },
  { gx: -6.5, gy: -0.5, type: "birch", size: 1.0 }, { gx: -7, gy: 1, type: "pine", size: 1.3 },
  { gx: -7, gy: 2.5, type: "oak", size: 1.2 }, { gx: -6.5, gy: 4, type: "pine", size: 1.1 },
  { gx: -6, gy: 5, type: "birch", size: 0.8 },
  // Inner scattered trees
  { gx: -3, gy: -1.5, type: "oak", size: 1.4 }, { gx: 4, gy: 4, type: "pine", size: 1.0 },
  { gx: -5, gy: -0.5, type: "oak", size: 1.1 }, { gx: 5, gy: 1, type: "pine", size: 0.9 },
  { gx: -1, gy: 6, type: "birch", size: 1.0 }, { gx: 4, gy: -1, type: "pine", size: 1.3 },
  { gx: -6, gy: 3, type: "oak", size: 1.2 }, { gx: 2.5, gy: 5.5, type: "birch", size: 0.8 },
  { gx: -2, gy: -2, type: "pine", size: 1.1 }, { gx: 5, gy: 2.5, type: "oak", size: 0.9 },
  { gx: -6, gy: 0.5, type: "birch", size: 1.0 }, { gx: 3, gy: -1.5, type: "pine", size: 1.2 },
  { gx: -4, gy: 5.5, type: "oak", size: 0.8 }, { gx: 1, gy: -2, type: "birch", size: 0.7 },
  { gx: -3, gy: 4.5, type: "pine", size: 0.6 }, { gx: 6, gy: 3, type: "oak", size: 1.0 },
  { gx: -1, gy: -1.8, type: "pine", size: 0.9 },
  // Small understorey trees
  { gx: -5.8, gy: 5.2, type: "birch", size: 0.5 }, { gx: 3.8, gy: -1.8, type: "birch", size: 0.5 },
  { gx: -4.2, gy: -1.2, type: "birch", size: 0.6 }, { gx: 5.8, gy: 3.8, type: "pine", size: 0.5 },
  { gx: -6.8, gy: 1.8, type: "pine", size: 0.6 }, { gx: 1.8, gy: -2.5, type: "birch", size: 0.5 },
  { gx: -3.2, gy: 6.2, type: "pine", size: 0.5 }, { gx: 4.8, gy: 4.8, type: "birch", size: 0.4 },
  { gx: -1.8, gy: 6.8, type: "pine", size: 0.6 }, { gx: 5.2, gy: -0.8, type: "oak", size: 0.6 },
];

const ROCKS = [
  { gx: 2, gy: -1.5, size: 1.0 }, { gx: -5, gy: 2, size: 1.2 }, { gx: 4, gy: 5, size: 0.8 },
  { gx: -3, gy: 6, size: 1.0 }, { gx: 5, gy: 0, size: 0.9 }, { gx: -2, gy: 4, size: 1.1 },
  { gx: 3, gy: 2, size: 0.7 }, { gx: -6, gy: 4.5, size: 0.8 }, { gx: 1, gy: 6, size: 0.6 },
  { gx: -4, gy: -1, size: 1.0 }, { gx: 6, gy: 2, size: 0.9 }, { gx: -1, gy: -2.2, size: 0.7 },
  { gx: 3.5, gy: -2.2, size: 0.8 }, { gx: -5.5, gy: 5.5, size: 0.6 },
];

const FLOWERS = [
  { gx: -1, gy: 3.5, emoji: "🌸" }, { gx: 2, gy: 1, emoji: "🌼" }, { gx: -3, gy: 0, emoji: "🌺" },
  { gx: 4, gy: 3.5, emoji: "🌻" }, { gx: -5, gy: 4, emoji: "🌷" }, { gx: 1, gy: -1, emoji: "🌸" },
  { gx: -2, gy: 1, emoji: "🌼" }, { gx: 3, gy: 4.5, emoji: "🌺" }, { gx: -4.5, gy: 3.5, emoji: "🌸" },
  { gx: 0, gy: 5.5, emoji: "🌼" }, { gx: -3.5, gy: 5, emoji: "🌷" }, { gx: 5, gy: 3, emoji: "🌻" },
  { gx: -6, gy: 2, emoji: "🌸" }, { gx: 2.5, gy: -1, emoji: "🌼" }, { gx: -1.5, gy: -1.5, emoji: "🌺" },
  { gx: 4, gy: 1, emoji: "🌷" }, { gx: -2.5, gy: 6, emoji: "🌸" }, { gx: 1.5, gy: 4, emoji: "🌻" },
];

const MUSHROOMS = [
  { gx: -4.5, gy: 1 }, { gx: 2.5, gy: -0.5 }, { gx: -1.5, gy: 4.5 }, { gx: 4.5, gy: 2 },
  { gx: -3.5, gy: -0.5 }, { gx: 0.5, gy: 5.5 }, { gx: -5.5, gy: 3 }, { gx: 3, gy: 5 },
  { gx: -2, gy: -1.8 }, { gx: 5.5, gy: 1.5 }, { gx: -4, gy: 6 }, { gx: 1, gy: -1.5 },
];

// Woodland animals — SVG-drawn creatures
const ANIMALS = [
  { gx: -3.8, gy: 2.8, type: "fox", flip: false },
  { gx: 4.2, gy: 3.2, type: "rabbit", flip: true },
  { gx: -5.2, gy: 5, type: "hedgehog", flip: false },
  { gx: 2.8, gy: -1.2, type: "rabbit", flip: false },
  { gx: -1.2, gy: 5.8, type: "deer", flip: true },
  { gx: 5.5, gy: 2, type: "badger", flip: false },
  { gx: -4.8, gy: -0.8, type: "squirrel", flip: true },
  { gx: 3.2, gy: 5.8, type: "hedgehog", flip: false },
  { gx: -2.8, gy: -1.8, type: "fox", flip: true },
  { gx: 0.8, gy: 3.2, type: "mouse", flip: false },
  { gx: 5.8, gy: 4, type: "rabbit", flip: true },
  { gx: -6.2, gy: 1.5, type: "owl", flip: false },
  { gx: 1.5, gy: 5.2, type: "frog", flip: true },
  { gx: -3.2, gy: 3.8, type: "snail", flip: false },
  { gx: 4.8, gy: 0.5, type: "butterfly", flip: false },
  { gx: -1.8, gy: 2.5, type: "dragonfly", flip: true },
  { gx: 3.8, gy: 2.2, type: "mouse", flip: false },
  { gx: -5.5, gy: 4.2, type: "squirrel", flip: false },
];

// ─── GAME REDUCER ───
const initialState = (playerCount) => ({
  phase: "setup",
  playerCount: playerCount || 2,
  players: Array.from({ length: playerCount || 2 }, (_, i) => ({
    id: i, name: BIRD_NAMES[i], color: BIRD_COLORS[i],
    accent: BIRD_ACCENTS[i], emoji: BIRD_EMOJIS[i],
    position: 0, feathers: [false, false, false, false, false, false],
  })),
  currentPlayer: 0,
  diceValue: null,
  currentQuestion: null,
  currentCatIndex: null,
  selectedAnswer: null,
  answerRevealed: false,
  questions: JSON.parse(JSON.stringify(DEFAULT_QUESTIONS)),
  winner: null,
  message: "",
});

function gameReducer(state, action) {
  switch (action.type) {
    case "SET_PLAYERS": return initialState(action.count);
    case "START_GAME": return { ...state, phase: "playing", message: `${state.players[0].name}'s turn — roll the dice!` };
    case "ROLL_DICE": {
      const val = Math.floor(Math.random() * 6) + 1;
      const p = state.players[state.currentPlayer];
      const newPos = (p.position + val) % BOARD_SPACES.length;
      const space = BOARD_SPACES[newPos];
      const newPlayers = state.players.map((pl, i) => i === state.currentPlayer ? { ...pl, position: newPos } : pl);
      const allFeathers = newPlayers[state.currentPlayer].feathers.every(Boolean);
      const catIndex = allFeathers && space.isHub ? Math.floor(Math.random() * 6) : space.catIndex;
      const qs = state.questions[CATEGORIES[catIndex]];
      if (!qs || qs.length === 0) {
        return { ...state, players: newPlayers, diceValue: val,
          currentPlayer: (state.currentPlayer + 1) % state.playerCount,
          message: `${p.name} rolled ${val}. No questions available! Next turn.` };
      }
      return { ...state, players: newPlayers, diceValue: val, phase: "question",
        currentQuestion: qs[Math.floor(Math.random() * qs.length)],
        currentCatIndex: catIndex, selectedAnswer: null, answerRevealed: false,
        message: allFeathers && space.isHub
          ? `${p.name} rolled a ${val}! ✨ Final challenge!`
          : `${p.name} rolled a ${val}!` };
    }
    case "ANSWER": {
      const correct = action.answer === state.currentQuestion.answer;
      const p = state.players[state.currentPlayer];
      const space = BOARD_SPACES[p.position];
      let newPlayers = [...state.players];
      let winner = null;
      if (correct && space.isHub) {
        const f = [...p.feathers]; f[state.currentCatIndex] = true;
        newPlayers[state.currentPlayer] = { ...p, feathers: f };
        if (f.every(Boolean)) winner = state.currentPlayer;
      }
      return { ...state, selectedAnswer: action.answer, answerRevealed: true, players: newPlayers, winner,
        message: correct
          ? winner !== null ? `🎉 ${p.name} wins the game!`
            : space.isHub ? `✨ Correct! ${p.name} earns a ${CAT_LABELS_SHORT[state.currentCatIndex]} feather!`
            : `✨ Correct! Well done!`
          : `Not quite! The answer was: ${state.currentQuestion.answer}` };
    }
    case "NEXT_TURN": {
      if (state.winner !== null) return { ...state, phase: "gameover" };
      const next = (state.currentPlayer + 1) % state.playerCount;
      return { ...state, phase: "playing", currentPlayer: next, currentQuestion: null,
        selectedAnswer: null, answerRevealed: false, diceValue: null,
        message: `${state.players[next].name}'s turn — roll the dice!` };
    }
    case "OPEN_EDITOR": return { ...state, phase: "editor" };
    case "CLOSE_EDITOR": return { ...state, phase: "playing", message: `${state.players[state.currentPlayer].name}'s turn!` };
    case "UPDATE_QUESTIONS": return { ...state, questions: action.questions };
    case "RESET": return initialState(state.playerCount);
    default: return state;
  }
}

// ─── SVG COMPONENTS ───
function IsoTree({ gx, gy, type, size = 1 }) {
  const { sx, sy } = toIso(gx * 60, gy * 60);
  const s = size * 28;
  if (type === "pine") {
    return (
      <g>
        <polygon points={`${sx},${sy - s * 2.5} ${sx - s * 0.8},${sy - s * 0.5} ${sx + s * 0.8},${sy - s * 0.5}`}
          fill="#2D5016" opacity="0.9" />
        <polygon points={`${sx},${sy - s * 3.2} ${sx - s * 0.6},${sy - s * 1.5} ${sx + s * 0.6},${sy - s * 1.5}`}
          fill="#3A6B1E" opacity="0.9" />
        <polygon points={`${sx},${sy - s * 3.8} ${sx - s * 0.4},${sy - s * 2.3} ${sx + s * 0.4},${sy - s * 2.3}`}
          fill="#4A8B2E" opacity="0.9" />
        <rect x={sx - 3} y={sy - s * 0.5} width="6" height={s * 0.5} fill="#5C3D1A" rx="1" />
        <ellipse cx={sx} cy={sy} rx={s * 0.4} ry={s * 0.15} fill="rgba(0,0,0,0.15)" />
      </g>
    );
  }
  if (type === "birch") {
    return (
      <g>
        <rect x={sx - 2.5} y={sy - s * 2.5} width="5" height={s * 2.5} fill="#E8E0D0" rx="2" />
        <rect x={sx - 1} y={sy - s * 1.8} width="2" height="4" fill="#A09080" />
        <rect x={sx} y={sy - s * 2.2} width="2" height="3" fill="#A09080" />
        <circle cx={sx} cy={sy - s * 2.8} r={s * 0.7} fill="#7BAA4D" opacity="0.85" />
        <circle cx={sx - s * 0.3} cy={sy - s * 3.1} r={s * 0.5} fill="#8BC45A" opacity="0.8" />
        <circle cx={sx + s * 0.4} cy={sy - s * 2.6} r={s * 0.45} fill="#6B9A3D" opacity="0.8" />
        <ellipse cx={sx} cy={sy} rx={s * 0.35} ry={s * 0.12} fill="rgba(0,0,0,0.12)" />
      </g>
    );
  }
  // oak
  return (
    <g>
      <rect x={sx - 4} y={sy - s * 1.8} width="8" height={s * 1.8} fill="#6B4226" rx="2" />
      <circle cx={sx} cy={sy - s * 2.2} r={s * 0.9} fill="#3D7A1E" opacity="0.85" />
      <circle cx={sx - s * 0.5} cy={sy - s * 2.5} r={s * 0.65} fill="#4A8B2E" opacity="0.8" />
      <circle cx={sx + s * 0.5} cy={sy - s * 2.0} r={s * 0.6} fill="#2D6B16" opacity="0.8" />
      <circle cx={sx} cy={sy - s * 2.8} r={s * 0.5} fill="#5A9E38" opacity="0.75" />
      <ellipse cx={sx} cy={sy} rx={s * 0.5} ry={s * 0.18} fill="rgba(0,0,0,0.15)" />
    </g>
  );
}

function IsoRock({ gx, gy, size = 1 }) {
  const { sx, sy } = toIso(gx * 60, gy * 60);
  const s = size;
  return (
    <g>
      <ellipse cx={sx} cy={sy} rx={12 * s} ry={6 * s} fill="#8E8575" />
      <ellipse cx={sx} cy={sy - 3 * s} rx={10 * s} ry={5 * s} fill="#A59A8A" />
      <ellipse cx={sx - 2 * s} cy={sy - 5 * s} rx={6 * s} ry={3.5 * s} fill="#B8ACA0" />
      {/* Moss patches */}
      <ellipse cx={sx + 3 * s} cy={sy - 2 * s} rx={3 * s} ry={1.5 * s} fill="#7BA35B" opacity="0.5" />
    </g>
  );
}

// ─── WOODLAND ANIMAL SVG COMPONENTS ───
function AnimalFox({ sx, sy, flip }) {
  const t = flip ? `translate(${sx * 2}, 0) scale(-1, 1)` : "";
  return (
    <g transform={t}>
      {/* Shadow */}
      <ellipse cx={sx} cy={sy + 2} rx="12" ry="4" fill="rgba(0,0,0,0.12)" />
      {/* Body */}
      <ellipse cx={sx} cy={sy - 6} rx="10" ry="6" fill="#D4743A" />
      {/* Head */}
      <circle cx={sx + 8} cy={sy - 10} r="5" fill="#E08040" />
      {/* Ears */}
      <polygon points={`${sx + 5},${sy - 16} ${sx + 7},${sy - 10} ${sx + 3},${sy - 11}`} fill="#D06030" />
      <polygon points={`${sx + 11},${sy - 16} ${sx + 13},${sy - 10} ${sx + 9},${sy - 11}`} fill="#D06030" />
      {/* Inner ears */}
      <polygon points={`${sx + 5.5},${sy - 14.5} ${sx + 7},${sy - 11} ${sx + 4},${sy - 11.5}`} fill="#FFD0A0" />
      <polygon points={`${sx + 10.5},${sy - 14.5} ${sx + 12},${sy - 11} ${sx + 9.5},${sy - 11.5}`} fill="#FFD0A0" />
      {/* Snout */}
      <ellipse cx={sx + 10} cy={sy - 8} rx="3" ry="2" fill="#FFD0A0" />
      <circle cx={sx + 12} cy={sy - 8.5} r="0.8" fill="#2D1A0A" />
      {/* Eye */}
      <circle cx={sx + 7} cy={sy - 11} r="1.2" fill="#2D1A0A" />
      <circle cx={sx + 6.6} cy={sy - 11.3} r="0.4" fill="#fff" />
      {/* Tail */}
      <path d={`M${sx - 8} ${sy - 6} Q${sx - 14} ${sy - 14} ${sx - 12} ${sy - 18}`} fill="none" stroke="#D4743A" strokeWidth="4" strokeLinecap="round" />
      <circle cx={sx - 12} cy={sy - 18} r="2.5" fill="#FFF0E0" />
      {/* Legs */}
      <rect x={sx - 5} y={sy - 2} width="2.5" height="4" rx="1" fill="#B85C2A" />
      <rect x={sx + 3} y={sy - 2} width="2.5" height="4" rx="1" fill="#B85C2A" />
    </g>
  );
}

function AnimalRabbit({ sx, sy, flip }) {
  const t = flip ? `translate(${sx * 2}, 0) scale(-1, 1)` : "";
  return (
    <g transform={t}>
      <ellipse cx={sx} cy={sy + 1} rx="8" ry="3" fill="rgba(0,0,0,0.1)" />
      {/* Body */}
      <ellipse cx={sx} cy={sy - 5} rx="7" ry="5" fill="#C8B8A0" />
      {/* Head */}
      <circle cx={sx + 5} cy={sy - 9} r="4" fill="#D4C4AC" />
      {/* Ears - long and tall */}
      <ellipse cx={sx + 3} cy={sy - 19} rx="2" ry="6" fill="#D4C4AC" />
      <ellipse cx={sx + 7} cy={sy - 18} rx="2" ry="5.5" fill="#D4C4AC" />
      <ellipse cx={sx + 3} cy={sy - 19} rx="1.2" ry="4.5" fill="#EAADA0" />
      <ellipse cx={sx + 7} cy={sy - 18} rx="1.2" ry="4" fill="#EAADA0" />
      {/* Eye */}
      <circle cx={sx + 6.5} cy={sy - 9.5} r="1.3" fill="#3A2A1A" />
      <circle cx={sx + 6.2} cy={sy - 9.8} r="0.4" fill="#fff" />
      {/* Nose */}
      <circle cx={sx + 8} cy={sy - 8} r="0.8" fill="#E0A0A0" />
      {/* Tail fluff */}
      <circle cx={sx - 6} cy={sy - 5} r="2.5" fill="#E8DDD0" />
      {/* Legs */}
      <rect x={sx - 3} y={sy - 1} width="2" height="3" rx="1" fill="#B5A590" />
      <rect x={sx + 2} y={sy - 1} width="2" height="3" rx="1" fill="#B5A590" />
    </g>
  );
}

function AnimalHedgehog({ sx, sy, flip }) {
  const t = flip ? `translate(${sx * 2}, 0) scale(-1, 1)` : "";
  return (
    <g transform={t}>
      <ellipse cx={sx} cy={sy + 1} rx="8" ry="3" fill="rgba(0,0,0,0.1)" />
      {/* Spines */}
      {[-4, -2, 0, 2, 4].map((dx, i) => (
        <line key={i} x1={sx + dx} y1={sy - 6} x2={sx + dx + [0.8, -0.6, 0.3, -0.9, 0.5][i]} y2={sy - 12 - [1.5, 2.1, 0.8, 2.5, 1.2][i]}
          stroke="#6B5030" strokeWidth="1.5" />
      ))}
      {[-3, -1, 1, 3].map((dx, i) => (
        <line key={`s2${i}`} x1={sx + dx} y1={sy - 7} x2={sx + dx} y2={sy - 14 - [1.0, 1.8, 0.5, 1.3][i]}
          stroke="#8B6840" strokeWidth="1.2" />
      ))}
      {/* Body */}
      <ellipse cx={sx} cy={sy - 4} rx="8" ry="5" fill="#8B6840" />
      {/* Face */}
      <ellipse cx={sx + 6} cy={sy - 4} rx="4" ry="3.5" fill="#D4B898" />
      {/* Eye */}
      <circle cx={sx + 7} cy={sy - 5} r="1" fill="#1A1A1A" />
      <circle cx={sx + 6.7} cy={sy - 5.3} r="0.3" fill="#fff" />
      {/* Nose */}
      <circle cx={sx + 9} cy={sy - 3.5} r="0.8" fill="#2D1A0A" />
      {/* Feet */}
      <ellipse cx={sx - 3} cy={sy} rx="2" ry="1" fill="#B5A080" />
      <ellipse cx={sx + 3} cy={sy} rx="2" ry="1" fill="#B5A080" />
    </g>
  );
}

function AnimalDeer({ sx, sy, flip }) {
  const t = flip ? `translate(${sx * 2}, 0) scale(-1, 1)` : "";
  return (
    <g transform={t}>
      <ellipse cx={sx} cy={sy + 2} rx="10" ry="3" fill="rgba(0,0,0,0.1)" />
      {/* Legs */}
      <rect x={sx - 6} y={sy - 4} width="2" height="8" rx="1" fill="#8B6B40" />
      <rect x={sx - 2} y={sy - 4} width="2" height="8" rx="1" fill="#8B6B40" />
      <rect x={sx + 2} y={sy - 4} width="2" height="8" rx="1" fill="#9B7B50" />
      <rect x={sx + 6} y={sy - 4} width="2" height="8" rx="1" fill="#9B7B50" />
      {/* Body */}
      <ellipse cx={sx} cy={sy - 8} rx="10" ry="6" fill="#C4955A" />
      {/* Spots */}
      <circle cx={sx - 3} cy={sy - 9} r="1" fill="#DDB880" opacity="0.6" />
      <circle cx={sx + 2} cy={sy - 7} r="1" fill="#DDB880" opacity="0.6" />
      <circle cx={sx + 5} cy={sy - 10} r="0.8" fill="#DDB880" opacity="0.6" />
      {/* Neck */}
      <rect x={sx + 7} y={sy - 18} width="4" height="10" rx="2" fill="#C4955A" />
      {/* Head */}
      <ellipse cx={sx + 12} cy={sy - 20} rx="4" ry="3.5" fill="#D4A56A" />
      {/* Ears */}
      <ellipse cx={sx + 10} cy={sy - 24} rx="1.5" ry="3" fill="#D4A56A" />
      <ellipse cx={sx + 14} cy={sy - 24} rx="1.5" ry="3" fill="#D4A56A" />
      <ellipse cx={sx + 10} cy={sy - 24} rx="0.8" ry="2" fill="#EAADA0" />
      <ellipse cx={sx + 14} cy={sy - 24} rx="0.8" ry="2" fill="#EAADA0" />
      {/* Eye */}
      <circle cx={sx + 13} cy={sy - 20} r="1.2" fill="#2D1A0A" />
      <circle cx={sx + 12.7} cy={sy - 20.3} r="0.4" fill="#fff" />
      {/* Nose */}
      <circle cx={sx + 15} cy={sy - 19} r="0.8" fill="#4A3020" />
      {/* Tail */}
      <ellipse cx={sx - 9} cy={sy - 9} rx="2" ry="1.5" fill="#E8D8C0" />
    </g>
  );
}

function AnimalBadger({ sx, sy, flip }) {
  const t = flip ? `translate(${sx * 2}, 0) scale(-1, 1)` : "";
  return (
    <g transform={t}>
      <ellipse cx={sx} cy={sy + 1} rx="9" ry="3" fill="rgba(0,0,0,0.1)" />
      {/* Body */}
      <ellipse cx={sx} cy={sy - 5} rx="9" ry="6" fill="#4A4A4A" />
      {/* Head */}
      <ellipse cx={sx + 7} cy={sy - 6} rx="5" ry="4" fill="#3A3A3A" />
      {/* White stripes on face */}
      <path d={`M${sx + 4} ${sy - 10} L${sx + 6} ${sy - 3}`} stroke="#F0F0F0" strokeWidth="2" />
      <path d={`M${sx + 8} ${sy - 10} L${sx + 10} ${sy - 3}`} stroke="#F0F0F0" strokeWidth="2" />
      {/* Central white stripe */}
      <path d={`M${sx + 6} ${sy - 10} L${sx + 8} ${sy - 3}`} stroke="#2A2A2A" strokeWidth="1.5" />
      {/* Eyes */}
      <circle cx={sx + 6} cy={sy - 7} r="1" fill="#1A1A1A" />
      <circle cx={sx + 9} cy={sy - 7} r="1" fill="#1A1A1A" />
      {/* Nose */}
      <circle cx={sx + 11} cy={sy - 5.5} r="1" fill="#1A1A1A" />
      {/* Ears */}
      <circle cx={sx + 5} cy={sy - 10} r="1.5" fill="#4A4A4A" />
      <circle cx={sx + 9} cy={sy - 10} r="1.5" fill="#4A4A4A" />
      {/* Legs */}
      <rect x={sx - 4} y={sy - 1} width="2.5" height="3" rx="1" fill="#3A3A3A" />
      <rect x={sx + 2} y={sy - 1} width="2.5" height="3" rx="1" fill="#3A3A3A" />
    </g>
  );
}

function AnimalSquirrel({ sx, sy, flip }) {
  const t = flip ? `translate(${sx * 2}, 0) scale(-1, 1)` : "";
  return (
    <g transform={t}>
      <ellipse cx={sx} cy={sy + 1} rx="6" ry="2" fill="rgba(0,0,0,0.1)" />
      {/* Tail - big and fluffy */}
      <path d={`M${sx - 4} ${sy - 6} Q${sx - 10} ${sy - 18} ${sx - 4} ${sy - 20} Q${sx + 2} ${sy - 22} ${sx} ${sy - 14}`}
        fill="#B86B30" stroke="#A05A20" strokeWidth="0.5" />
      {/* Body */}
      <ellipse cx={sx} cy={sy - 5} rx="5" ry="4" fill="#C87B3A" />
      {/* Head */}
      <circle cx={sx + 4} cy={sy - 9} r="3.5" fill="#D08B4A" />
      {/* Ears */}
      <polygon points={`${sx + 2},${sy - 14} ${sx + 3},${sy - 10} ${sx + 1},${sy - 10}`} fill="#D08B4A" />
      <polygon points={`${sx + 6},${sy - 14} ${sx + 7},${sy - 10} ${sx + 5},${sy - 10}`} fill="#D08B4A" />
      {/* Ear tufts */}
      <circle cx={sx + 2} cy={sy - 14} r="0.8" fill="#E0A060" />
      <circle cx={sx + 6} cy={sy - 14} r="0.8" fill="#E0A060" />
      {/* White belly */}
      <ellipse cx={sx + 1} cy={sy - 4} rx="3" ry="2.5" fill="#F0E0D0" />
      {/* Eye */}
      <circle cx={sx + 5} cy={sy - 9.5} r="1.2" fill="#1A1A1A" />
      <circle cx={sx + 4.7} cy={sy - 9.8} r="0.4" fill="#fff" />
      {/* Nose */}
      <circle cx={sx + 7} cy={sy - 8.5} r="0.6" fill="#4A2A10" />
      {/* Arms holding acorn */}
      <ellipse cx={sx + 3} cy={sy - 5} rx="1.5" ry="1" fill="#B86B30" />
      <circle cx={sx + 3.5} cy={sy - 4.5} r="1.2" fill="#8B6830" />
      <ellipse cx={sx + 3.5} cy={sy - 5.5} rx="1" ry="0.6" fill="#6B5020" />
    </g>
  );
}

function AnimalMouse({ sx, sy, flip }) {
  const t = flip ? `translate(${sx * 2}, 0) scale(-1, 1)` : "";
  return (
    <g transform={t}>
      <ellipse cx={sx} cy={sy + 0.5} rx="4" ry="1.5" fill="rgba(0,0,0,0.08)" />
      {/* Body */}
      <ellipse cx={sx} cy={sy - 2} rx="4" ry="2.5" fill="#B8A088" />
      {/* Head */}
      <circle cx={sx + 3} cy={sy - 4} r="2.5" fill="#C4AA90" />
      {/* Ears */}
      <circle cx={sx + 2} cy={sy - 7} r="2" fill="#C4AA90" />
      <circle cx={sx + 5} cy={sy - 6.5} r="2" fill="#C4AA90" />
      <circle cx={sx + 2} cy={sy - 7} r="1.2" fill="#E8B8A0" />
      <circle cx={sx + 5} cy={sy - 6.5} r="1.2" fill="#E8B8A0" />
      {/* Eye */}
      <circle cx={sx + 4} cy={sy - 4.5} r="0.8" fill="#1A1A1A" />
      <circle cx={sx + 3.8} cy={sy - 4.7} r="0.25" fill="#fff" />
      {/* Nose */}
      <circle cx={sx + 5} cy={sy - 3.5} r="0.5" fill="#E0A0A0" />
      {/* Whiskers */}
      <line x1={sx + 5} y1={sy - 3.5} x2={sx + 8} y2={sy - 4.5} stroke="#B8A088" strokeWidth="0.3" />
      <line x1={sx + 5} y1={sy - 3.5} x2={sx + 8} y2={sy - 3} stroke="#B8A088" strokeWidth="0.3" />
      {/* Tail */}
      <path d={`M${sx - 3.5} ${sy - 2} Q${sx - 7} ${sy - 4} ${sx - 6} ${sy - 6}`}
        fill="none" stroke="#C4AA90" strokeWidth="0.8" />
    </g>
  );
}

function AnimalOwl({ sx, sy }) {
  return (
    <g>
      {/* Perched up higher (in a tree) */}
      {/* Body */}
      <ellipse cx={sx} cy={sy - 14} rx="5" ry="6" fill="#8B6B40" />
      {/* Chest feather pattern */}
      <ellipse cx={sx} cy={sy - 12} rx="3.5" ry="4" fill="#C4A870" />
      {[0, 1, 2].map(i => (
        <path key={i} d={`M${sx - 2} ${sy - 14 + i * 2} Q${sx} ${sy - 13 + i * 2} ${sx + 2} ${sy - 14 + i * 2}`}
          fill="none" stroke="#A08850" strokeWidth="0.5" />
      ))}
      {/* Head */}
      <circle cx={sx} cy={sy - 20} r="4.5" fill="#9B7B50" />
      {/* Ear tufts */}
      <polygon points={`${sx - 3},${sy - 25} ${sx - 4},${sy - 21} ${sx - 1},${sy - 22}`} fill="#8B6B40" />
      <polygon points={`${sx + 3},${sy - 25} ${sx + 4},${sy - 21} ${sx + 1},${sy - 22}`} fill="#8B6B40" />
      {/* Facial disc */}
      <circle cx={sx} cy={sy - 19.5} r="3.5" fill="#D4BA90" />
      {/* Eyes - big and round */}
      <circle cx={sx - 1.5} cy={sy - 20} r="1.8" fill="#FFD700" />
      <circle cx={sx + 1.5} cy={sy - 20} r="1.8" fill="#FFD700" />
      <circle cx={sx - 1.5} cy={sy - 20} r="1" fill="#1A1A1A" />
      <circle cx={sx + 1.5} cy={sy - 20} r="1" fill="#1A1A1A" />
      <circle cx={sx - 1.8} cy={sy - 20.3} r="0.3" fill="#fff" />
      <circle cx={sx + 1.2} cy={sy - 20.3} r="0.3" fill="#fff" />
      {/* Beak */}
      <polygon points={`${sx},${sy - 18.5} ${sx - 0.8},${sy - 17.5} ${sx + 0.8},${sy - 17.5}`} fill="#C88830" />
      {/* Feet */}
      <path d={`M${sx - 2} ${sy - 8} L${sx - 3} ${sy - 7} M${sx - 2} ${sy - 8} L${sx - 1} ${sy - 7} M${sx - 2} ${sy - 8} L${sx - 2} ${sy - 7}`}
        stroke="#8B6B40" strokeWidth="1" />
      <path d={`M${sx + 2} ${sy - 8} L${sx + 3} ${sy - 7} M${sx + 2} ${sy - 8} L${sx + 1} ${sy - 7} M${sx + 2} ${sy - 8} L${sx + 2} ${sy - 7}`}
        stroke="#8B6B40" strokeWidth="1" />
    </g>
  );
}

function AnimalFrog({ sx, sy, flip }) {
  const t = flip ? `translate(${sx * 2}, 0) scale(-1, 1)` : "";
  return (
    <g transform={t}>
      <ellipse cx={sx} cy={sy + 0.5} rx="5" ry="2" fill="rgba(0,0,0,0.08)" />
      {/* Body */}
      <ellipse cx={sx} cy={sy - 3} rx="5" ry="3.5" fill="#5A8B3A" />
      {/* Head */}
      <ellipse cx={sx + 3} cy={sy - 4} rx="3.5" ry="2.8" fill="#6B9B4A" />
      {/* Eyes - protruding */}
      <circle cx={sx + 2} cy={sy - 7} r="2" fill="#6B9B4A" />
      <circle cx={sx + 5} cy={sy - 7} r="2" fill="#6B9B4A" />
      <circle cx={sx + 2} cy={sy - 7} r="1.3" fill="#FFD700" />
      <circle cx={sx + 5} cy={sy - 7} r="1.3" fill="#FFD700" />
      <circle cx={sx + 2} cy={sy - 7} r="0.7" fill="#1A1A1A" />
      <circle cx={sx + 5} cy={sy - 7} r="0.7" fill="#1A1A1A" />
      {/* Back legs */}
      <ellipse cx={sx - 4} cy={sy - 1} rx="3" ry="1.5" fill="#4A7B2A" />
      {/* Spots */}
      <circle cx={sx - 1} cy={sy - 4} r="0.8" fill="#4A7B2A" />
      <circle cx={sx + 1} cy={sy - 2} r="0.6" fill="#4A7B2A" />
    </g>
  );
}

function AnimalSnail({ sx, sy, flip }) {
  const t = flip ? `translate(${sx * 2}, 0) scale(-1, 1)` : "";
  return (
    <g transform={t}>
      {/* Body/foot */}
      <ellipse cx={sx} cy={sy - 1} rx="6" ry="2" fill="#C4AA80" />
      {/* Shell */}
      <circle cx={sx - 1} cy={sy - 5} r="4.5" fill="#B5855A" />
      <circle cx={sx - 1} cy={sy - 5} r="3.5" fill="#C89B6A" />
      {/* Shell spiral */}
      <path d={`M${sx - 1} ${sy - 5} Q${sx + 1} ${sy - 7} ${sx} ${sy - 3} Q${sx - 3} ${sy - 2} ${sx - 3} ${sy - 6}`}
        fill="none" stroke="#A07845" strokeWidth="0.8" />
      {/* Head */}
      <ellipse cx={sx + 4} cy={sy - 2} rx="2.5" ry="2" fill="#D4BA90" />
      {/* Eye stalks */}
      <line x1={sx + 4} y1={sy - 4} x2={sx + 3} y2={sy - 7} stroke="#C4AA80" strokeWidth="0.8" />
      <line x1={sx + 5} y1={sy - 4} x2={sx + 6} y2={sy - 7} stroke="#C4AA80" strokeWidth="0.8" />
      <circle cx={sx + 3} cy={sy - 7} r="0.8" fill="#3A3A3A" />
      <circle cx={sx + 6} cy={sy - 7} r="0.8" fill="#3A3A3A" />
    </g>
  );
}

function AnimalButterfly({ sx, sy }) {
  return (
    <g>
      {/* Wings */}
      <ellipse cx={sx - 4} cy={sy - 10} rx="4" ry="6" fill="#E8A0C0" opacity="0.8" transform={`rotate(-15 ${sx - 4} ${sy - 10})`} />
      <ellipse cx={sx + 4} cy={sy - 10} rx="4" ry="6" fill="#E8A0C0" opacity="0.8" transform={`rotate(15 ${sx + 4} ${sy - 10})`} />
      <ellipse cx={sx - 3} cy={sy - 6} rx="2.5" ry="4" fill="#D080A0" opacity="0.7" transform={`rotate(-10 ${sx - 3} ${sy - 6})`} />
      <ellipse cx={sx + 3} cy={sy - 6} rx="2.5" ry="4" fill="#D080A0" opacity="0.7" transform={`rotate(10 ${sx + 3} ${sy - 6})`} />
      {/* Wing spots */}
      <circle cx={sx - 4} cy={sy - 10} r="1.5" fill="#F0C0D8" />
      <circle cx={sx + 4} cy={sy - 10} r="1.5" fill="#F0C0D8" />
      {/* Body */}
      <ellipse cx={sx} cy={sy - 8} rx="1" ry="4" fill="#4A3030" />
      {/* Antennae */}
      <path d={`M${sx} ${sy - 12} Q${sx - 2} ${sy - 16} ${sx - 3} ${sy - 15}`} fill="none" stroke="#4A3030" strokeWidth="0.5" />
      <path d={`M${sx} ${sy - 12} Q${sx + 2} ${sy - 16} ${sx + 3} ${sy - 15}`} fill="none" stroke="#4A3030" strokeWidth="0.5" />
      <circle cx={sx - 3} cy={sy - 15} r="0.6" fill="#4A3030" />
      <circle cx={sx + 3} cy={sy - 15} r="0.6" fill="#4A3030" />
    </g>
  );
}

function AnimalDragonfly({ sx, sy, flip }) {
  const t = flip ? `translate(${sx * 2}, 0) scale(-1, 1)` : "";
  return (
    <g transform={t}>
      {/* Wings */}
      <ellipse cx={sx - 5} cy={sy - 10} rx="6" ry="2" fill="#B0D8F0" opacity="0.5" transform={`rotate(-20 ${sx - 5} ${sy - 10})`} />
      <ellipse cx={sx + 5} cy={sy - 10} rx="6" ry="2" fill="#B0D8F0" opacity="0.5" transform={`rotate(20 ${sx + 5} ${sy - 10})`} />
      <ellipse cx={sx - 4} cy={sy - 8} rx="5" ry="1.5" fill="#A0C8E0" opacity="0.4" transform={`rotate(-10 ${sx - 4} ${sy - 8})`} />
      <ellipse cx={sx + 4} cy={sy - 8} rx="5" ry="1.5" fill="#A0C8E0" opacity="0.4" transform={`rotate(10 ${sx + 4} ${sy - 8})`} />
      {/* Body - long and thin */}
      <line x1={sx} y1={sy - 5} x2={sx} y2={sy - 16} stroke="#2080A0" strokeWidth="1.5" />
      {/* Head */}
      <circle cx={sx} cy={sy - 5} r="1.8" fill="#2890B0" />
      {/* Eyes */}
      <circle cx={sx - 1} cy={sy - 5} r="1" fill="#40B0D0" />
      <circle cx={sx + 1} cy={sy - 5} r="1" fill="#40B0D0" />
      {/* Tail segments */}
      {[0, 1, 2, 3].map(i => (
        <circle key={i} cx={sx} cy={sy - 10 - i * 2} r={1.2 - i * 0.2} fill="#2080A0" />
      ))}
    </g>
  );
}

function IsoAnimal({ gx, gy, type, flip }) {
  const { sx, sy } = toIso(gx * 60, gy * 60);
  switch (type) {
    case "fox": return <AnimalFox sx={sx} sy={sy} flip={flip} />;
    case "rabbit": return <AnimalRabbit sx={sx} sy={sy} flip={flip} />;
    case "hedgehog": return <AnimalHedgehog sx={sx} sy={sy} flip={flip} />;
    case "deer": return <AnimalDeer sx={sx} sy={sy} flip={flip} />;
    case "badger": return <AnimalBadger sx={sx} sy={sy} flip={flip} />;
    case "squirrel": return <AnimalSquirrel sx={sx} sy={sy} flip={flip} />;
    case "mouse": return <AnimalMouse sx={sx} sy={sy} flip={flip} />;
    case "owl": return <AnimalOwl sx={sx} sy={sy} />;
    case "frog": return <AnimalFrog sx={sx} sy={sy} flip={flip} />;
    case "snail": return <AnimalSnail sx={sx} sy={sy} flip={flip} />;
    case "butterfly": return <AnimalButterfly sx={sx} sy={sy} />;
    case "dragonfly": return <AnimalDragonfly sx={sx} sy={sy} flip={flip} />;
    default: return null;
  }
}

function IsometricBoard({ spaces, players, currentPlayer }) {
  // Sort decorations and spaces by y for proper depth
  const allItems = [];
  TREES.forEach((t, i) => allItems.push({ type: "tree", data: t, sortY: t.gy, key: `t${i}` }));
  ROCKS.forEach((r, i) => allItems.push({ type: "rock", data: r, sortY: r.gy, key: `r${i}` }));
  FLOWERS.forEach((f, i) => allItems.push({ type: "flower", data: f, sortY: f.gy, key: `f${i}` }));
  MUSHROOMS.forEach((m, i) => allItems.push({ type: "mush", data: m, sortY: m.gy, key: `m${i}` }));
  ANIMALS.forEach((a, i) => allItems.push({ type: "animal", data: a, sortY: a.gy, key: `a${i}` }));
  spaces.forEach((s, i) => allItems.push({ type: "space", data: s, sortY: s.gy || 0, key: `s${i}` }));
  allItems.sort((a, b) => a.sortY - b.sortY);

  // Pre-generate deterministic grass using a seed pattern
  const grassBlades = [];
  for (let i = 0; i < 300; i++) {
    const seed = i * 7919;
    const px = ((seed * 13) % 800) + 100;
    const py = ((seed * 17) % 500) + 100;
    const h = 3 + (seed % 8);
    const lean = ((seed * 3) % 7) - 3;
    const shade = ((seed * 11) % 3);
    const colors = ["#4A7A2A", "#5A8A3A", "#3A6A1A", "#6A9A4A", "#4A8030"];
    grassBlades.push({ px, py, h, lean, color: colors[shade % colors.length], opacity: 0.15 + (seed % 20) / 100 });
  }

  // Grass clumps — clusters of taller grass
  const grassClumps = [];
  for (let i = 0; i < 50; i++) {
    const seed = i * 3571;
    const cx = ((seed * 13) % 700) + 150;
    const cy = ((seed * 17) % 440) + 130;
    grassClumps.push({ cx, cy });
  }

  // Fallen leaves scattered on ground
  const leaves = [];
  for (let i = 0; i < 40; i++) {
    const seed = i * 4217;
    const lx = ((seed * 13) % 750) + 125;
    const ly = ((seed * 17) % 460) + 120;
    const rot = (seed * 7) % 360;
    const colors = ["#C4955A", "#A07040", "#D4A060", "#8B6030", "#B88040"];
    leaves.push({ lx, ly, rot, color: colors[seed % colors.length], size: 2 + (seed % 3) });
  }

  return (
    <svg viewBox="0 0 1000 700" style={{ width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="groundGrad" cx="50%" cy="45%">
          <stop offset="0%" stopColor="#92B86E" />
          <stop offset="25%" stopColor="#85AB62" />
          <stop offset="50%" stopColor="#78A055" />
          <stop offset="75%" stopColor="#6B934B" />
          <stop offset="100%" stopColor="#5A8340" />
        </radialGradient>
        {/* Noise-like pattern for grass texture */}
        <pattern id="grassNoise" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="transparent" />
          <circle cx="2" cy="2" r="0.6" fill="#5A8030" opacity="0.3" />
          <circle cx="6" cy="5" r="0.5" fill="#4A7020" opacity="0.25" />
          <circle cx="4" cy="7" r="0.4" fill="#6A9040" opacity="0.2" />
        </pattern>
        {/* Darker grass patches */}
        <pattern id="grassDark" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="transparent" />
          <ellipse cx="4" cy="4" rx="3" ry="2" fill="#4A7A2A" opacity="0.08" />
          <ellipse cx="12" cy="10" rx="4" ry="2.5" fill="#3A6A1A" opacity="0.06" />
        </pattern>
        <filter id="softShadow">
          <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#00000044" />
        </filter>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="cardShadow">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#00000033" />
        </filter>
        <pattern id="waterPat" width="20" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 5 Q5 0 10 5 Q15 10 20 5" fill="none" stroke="#5BA0C8" strokeWidth="0.5" opacity="0.3" />
        </pattern>
        {/* Light dappled pattern for sunlight through canopy */}
        <pattern id="dapple" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="transparent" />
          <ellipse cx="10" cy="12" rx="8" ry="5" fill="#FFEE88" opacity="0.04" />
          <ellipse cx="30" cy="28" rx="6" ry="4" fill="#FFEE88" opacity="0.03" />
        </pattern>
      </defs>

      {/* Ground plane - isometric diamond */}
      <polygon points="500,50 950,350 500,650 50,350" fill="url(#groundGrad)" />
      {/* Grass noise overlay */}
      <polygon points="500,50 950,350 500,650 50,350" fill="url(#grassNoise)" />
      {/* Dark grass patches */}
      <polygon points="500,50 950,350 500,650 50,350" fill="url(#grassDark)" />
      {/* Dappled sunlight */}
      <polygon points="500,50 950,350 500,650 50,350" fill="url(#dapple)" />
      {/* Edge stroke */}
      <polygon points="500,50 950,350 500,650 50,350" fill="none" stroke="#4A7030" strokeWidth="2.5" opacity="0.4" />

      {/* Organic darker grass patches on the ground */}
      <ellipse cx="300" cy="250" rx="80" ry="35" fill="#5A8535" opacity="0.12" />
      <ellipse cx="650" cy="400" rx="70" ry="30" fill="#4A7525" opacity="0.1" />
      <ellipse cx="450" cy="500" rx="90" ry="35" fill="#5A8535" opacity="0.08" />
      <ellipse cx="200" cy="400" rx="60" ry="25" fill="#6A9545" opacity="0.1" />
      <ellipse cx="750" cy="280" rx="50" ry="22" fill="#4A7525" opacity="0.09" />
      <ellipse cx="550" cy="200" rx="65" ry="28" fill="#5A8535" opacity="0.07" />
      <ellipse cx="350" cy="380" rx="55" ry="24" fill="#4A7525" opacity="0.1" />
      <ellipse cx="600" cy="550" rx="70" ry="30" fill="#6A9545" opacity="0.08" />

      {/* Dirt/path worn areas near the trail */}
      <ellipse cx="500" cy="350" rx="120" ry="60" fill="#A89870" opacity="0.06" />

      {/* Individual grass blades */}
      {grassBlades.map((g, i) => (
        <line key={`gb${i}`} x1={g.px} y1={g.py} x2={g.px + g.lean} y2={g.py - g.h}
          stroke={g.color} strokeWidth="0.8" opacity={g.opacity} strokeLinecap="round" />
      ))}

      {/* Grass clumps - tufts of 3-5 blades */}
      {grassClumps.map((c, i) => (
        <g key={`gc${i}`}>
          <line x1={c.cx} y1={c.cy} x2={c.cx - 2} y2={c.cy - 8} stroke="#4A8030" strokeWidth="1" opacity="0.2" strokeLinecap="round" />
          <line x1={c.cx + 2} y1={c.cy} x2={c.cx + 1} y2={c.cy - 9} stroke="#5A9040" strokeWidth="0.8" opacity="0.18" strokeLinecap="round" />
          <line x1={c.cx - 1} y1={c.cy} x2={c.cx - 3} y2={c.cy - 7} stroke="#3A7020" strokeWidth="0.9" opacity="0.22" strokeLinecap="round" />
          <line x1={c.cx + 3} y1={c.cy} x2={c.cx + 4} y2={c.cy - 6} stroke="#6AA050" strokeWidth="0.7" opacity="0.15" strokeLinecap="round" />
        </g>
      ))}

      {/* Scattered fallen leaves */}
      {leaves.map((l, i) => (
        <ellipse key={`leaf${i}`} cx={l.lx} cy={l.ly} rx={l.size} ry={l.size * 0.6}
          fill={l.color} opacity="0.15" transform={`rotate(${l.rot} ${l.lx} ${l.ly})`} />
      ))}

      {/* Small pebbles near the path */}
      {[{x:420,y:320},{x:510,y:360},{x:580,y:340},{x:460,y:380},{x:540,y:400},{x:390,y:350},
        {x:620,y:370},{x:480,y:310},{x:550,y:420},{x:410,y:400}].map((p, i) => (
        <circle key={`peb${i}`} cx={p.x} cy={p.y} r={1 + (i % 2)} fill="#A09080" opacity="0.2" />
      ))}

      {/* Small stream/creek */}
      <path d="M 180 200 Q 220 230 200 270 Q 180 310 210 340 Q 240 370 220 400"
        fill="none" stroke="#5AACCC" strokeWidth="4" opacity="0.25" strokeLinecap="round" />
      <path d="M 182 202 Q 222 232 202 272 Q 182 312 212 342 Q 242 372 222 402"
        fill="none" stroke="#7BC4E0" strokeWidth="2" opacity="0.15" strokeLinecap="round" />

      {/* Pond with more detail */}
      <ellipse cx="720" cy="420" rx="55" ry="28" fill="#3A7090" opacity="0.5" />
      <ellipse cx="720" cy="420" rx="55" ry="28" fill="url(#waterPat)" />
      <ellipse cx="720" cy="418" rx="46" ry="22" fill="#5AACCC" opacity="0.25" />
      <ellipse cx="720" cy="416" rx="30" ry="14" fill="#6BBCDC" opacity="0.15" />
      {/* Lily pads */}
      <ellipse cx="710" cy="415" rx="5" ry="2.5" fill="#5A9040" opacity="0.6" />
      <ellipse cx="730" cy="425" rx="4" ry="2" fill="#4A8030" opacity="0.5" />
      <ellipse cx="705" cy="425" rx="3.5" ry="1.8" fill="#5A9040" opacity="0.55" />
      {/* Tiny flower on lily pad */}
      <circle cx="710" cy="414" r="1.2" fill="#E8A0C0" />
      {/* Reeds */}
      <line x1="745" y1="420" x2="748" y2="400" stroke="#5A8030" strokeWidth="1.5" opacity="0.5" />
      <line x1="750" y1="422" x2="752" y2="404" stroke="#4A7020" strokeWidth="1.2" opacity="0.45" />
      <line x1="755" y1="418" x2="757" y2="398" stroke="#5A8030" strokeWidth="1" opacity="0.4" />
      <ellipse cx="748" cy="399" rx="2" ry="3" fill="#8B6030" opacity="0.5" />
      <ellipse cx="752" cy="403" rx="1.8" ry="2.5" fill="#8B6030" opacity="0.45" />

      {/* Path connections */}
      {spaces.map((s, i) => {
        const next = spaces[(i + 1) % spaces.length];
        return <line key={`path${i}`} x1={s.x} y1={s.y} x2={next.x} y2={next.y}
          stroke="#A08B6B" strokeWidth="6" strokeLinecap="round" opacity="0.5" />;
      })}
      {spaces.map((s, i) => {
        const next = spaces[(i + 1) % spaces.length];
        return <line key={`pathIn${i}`} x1={s.x} y1={s.y} x2={next.x} y2={next.y}
          stroke="#D4C5A0" strokeWidth="3" strokeDasharray="6,4" strokeLinecap="round" opacity="0.5" />;
      })}

      {/* Render all items depth-sorted */}
      {allItems.map((item) => {
        if (item.type === "tree") return <IsoTree key={item.key} {...item.data} />;
        if (item.type === "rock") return <IsoRock key={item.key} {...item.data} />;
        if (item.type === "animal") return <IsoAnimal key={item.key} {...item.data} />;
        if (item.type === "flower") {
          const { sx, sy } = toIso(item.data.gx * 60, item.data.gy * 60);
          return <text key={item.key} x={sx} y={sy} fontSize="14" textAnchor="middle" style={{ pointerEvents: "none" }}>{item.data.emoji}</text>;
        }
        if (item.type === "mush") {
          const { sx, sy } = toIso(item.data.gx * 60, item.data.gy * 60);
          return <text key={item.key} x={sx} y={sy} fontSize="12" textAnchor="middle" style={{ pointerEvents: "none" }}>🍄</text>;
        }
        if (item.type === "space") {
          const s = item.data;
          return (
            <g key={item.key}>
              {/* Isometric tile */}
              <ellipse cx={s.x} cy={s.y + 2} rx={s.isHub ? 22 : 14} ry={s.isHub ? 11 : 7}
                fill="rgba(0,0,0,0.15)" />
              <ellipse cx={s.x} cy={s.y} rx={s.isHub ? 20 : 12} ry={s.isHub ? 10 : 6}
                fill={CAT_COLORS[s.catIndex]} stroke={s.isHub ? "#3D2E1E" : "#5A7B3A"}
                strokeWidth={s.isHub ? 2.5 : 1.5} filter={s.isHub ? "url(#cardShadow)" : undefined} />
              {/* Raised effect */}
              <ellipse cx={s.x} cy={s.y - (s.isHub ? 6 : 3)} rx={s.isHub ? 20 : 12} ry={s.isHub ? 10 : 6}
                fill={CAT_COLORS[s.catIndex]} stroke={s.isHub ? "#3D2E1E" : "#5A7B3A"}
                strokeWidth={s.isHub ? 2.5 : 1.5} opacity="0.95" />
              {/* Side */}
              {s.isHub && (
                <path d={`M${s.x - 20} ${s.y} L${s.x - 20} ${s.y - 6} A20 10 0 0 0 ${s.x + 20} ${s.y - 6} L${s.x + 20} ${s.y} A20 10 0 0 1 ${s.x - 20} ${s.y}`}
                  fill={CAT_COLORS[s.catIndex]} opacity="0.6" stroke="#3D2E1E" strokeWidth="1" />
              )}
              {s.isHub && (
                <>
                  <text x={s.x} y={s.y - 4} textAnchor="middle" fontSize="14">{CAT_ICONS[s.catIndex]}</text>
                  <text x={s.x} y={s.y + 22} textAnchor="middle" fontSize="7" fill="#3D2E1E"
                    fontFamily="Georgia, serif" fontWeight="bold">{s.label}</text>
                </>
              )}
              {!s.isHub && (
                <text x={s.x} y={s.y - 1} textAnchor="middle" fontSize="9">{CAT_ICONS[s.catIndex]}</text>
              )}
            </g>
          );
        }
        return null;
      })}

      {/* Centre: The Great Nest */}
      {(() => {
        const c = toIso(0, 1.0 * 30);
        return (
          <g>
            <ellipse cx={c.sx} cy={c.sy + 3} rx="35" ry="18" fill="rgba(0,0,0,0.2)" />
            <ellipse cx={c.sx} cy={c.sy} rx="32" ry="16" fill="#8B7355" opacity="0.5" />
            <ellipse cx={c.sx} cy={c.sy - 5} rx="28" ry="14" fill="#A08B6B" opacity="0.6" />
            <ellipse cx={c.sx} cy={c.sy - 9} rx="22" ry="11" fill="#C4A87A" opacity="0.7" />
            <text x={c.sx} y={c.sy - 16} textAnchor="middle" fontSize="8" fill="#3D2E1E"
              fontFamily="Georgia, serif" fontWeight="bold">The Great Nest</text>
            <text x={c.sx} y={c.sy - 4} textAnchor="middle" fontSize="16">🪹</text>
          </g>
        );
      })()}

      {/* Players */}
      {players.map((p, i) => {
        const space = spaces[p.position];
        const offsetX = (i % 2) * 14 - 7;
        const offsetY = Math.floor(i / 2) * 8 - 4;
        const px = space.x + offsetX;
        const py = space.y + offsetY - 18;
        return (
          <g key={p.id} filter="url(#glow)" style={{ transition: "all 0.6s ease" }}>
            {/* Shadow */}
            <ellipse cx={px} cy={space.y + offsetY + 2} rx="8" ry="3" fill="rgba(0,0,0,0.2)" />
            {/* Body */}
            <circle cx={px} cy={py} r="11" fill={p.color}
              stroke={i === currentPlayer ? "#FFD700" : p.accent} strokeWidth={i === currentPlayer ? 3 : 1.5} />
            <text x={px} y={py + 4} textAnchor="middle" fontSize="12">{p.emoji}</text>
            {/* Name tag */}
            {i === currentPlayer && (
              <>
                <rect x={px - 16} y={py - 22} width="32" height="12" rx="4" fill="#FFD700" opacity="0.9" />
                <text x={px} y={py - 13} textAnchor="middle" fontSize="7" fill="#3D2E1E"
                  fontFamily="Georgia, serif" fontWeight="bold">{p.name}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── QUESTION CARD ───
function QuestionCard({ question, catIndex, selectedAnswer, answerRevealed, onAnswer }) {
  if (!question) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(30,25,15,0.75)", backdropFilter: "blur(6px)", animation: "fadeIn 0.3s ease" }}>
      <div style={{
        background: "linear-gradient(145deg, #FFF8ED 0%, #F5ECD7 40%, #EDE0C8 100%)",
        borderRadius: "20px", maxWidth: "520px", width: "92%", overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,248,237,0.3)",
        border: "3px solid #8B7355", animation: "slideUp 0.4s ease",
      }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${CAT_COLORS[catIndex]}, ${CAT_COLORS[catIndex]}BB)`,
          padding: "14px 22px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "2px solid #A08B6B" }}>
          <span style={{ fontSize: "22px" }}>{CAT_ICONS[catIndex]}</span>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "17px", fontWeight: "bold",
            color: "#FFF8ED", textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>{CATEGORIES[catIndex]}</span>
        </div>
        {/* Decorative border line */}
        <div style={{ height: "3px", background: `linear-gradient(90deg, transparent, ${CAT_COLORS[catIndex]}, transparent)` }} />

        <div style={{ padding: "22px 26px 20px" }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "17px", lineHeight: "1.6",
            color: "#2D2010", margin: "0 0 20px" }}>{question.question}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {question.options.map((opt, i) => {
              const isSelected = selectedAnswer === opt;
              const isCorrect = opt === question.answer;
              let bg = "linear-gradient(135deg, #EDE0C8, #E0D4B8)";
              let border = "#C4B8A0"; let textColor = "#2D2010";
              if (answerRevealed) {
                if (isCorrect) { bg = "linear-gradient(135deg, #6B8E5B, #5A7E4B)"; border = "#4A6E3B"; textColor = "#fff"; }
                else if (isSelected && !isCorrect) { bg = "linear-gradient(135deg, #C07070, #B06060)"; border = "#A05050"; textColor = "#fff"; }
              } else if (isSelected) {
                bg = `linear-gradient(135deg, ${CAT_COLORS[catIndex]}, ${CAT_COLORS[catIndex]}AA)`;
                border = "#3D2E1E"; textColor = "#fff";
              }
              return (
                <button key={i} onClick={() => !answerRevealed && onAnswer(opt)} style={{
                  background: bg, border: `2px solid ${border}`, borderRadius: "11px",
                  padding: "11px 16px", cursor: answerRevealed ? "default" : "pointer",
                  fontFamily: "Georgia, serif", fontSize: "14px", color: textColor,
                  textAlign: "left", transition: "all 0.2s ease",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  transform: isSelected && !answerRevealed ? "scale(1.02)" : "scale(1)",
                }}>
                  <span style={{ fontWeight: "bold", marginRight: "8px", opacity: 0.5 }}>{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {answerRevealed && question.flavour && (
            <div style={{ marginTop: "16px", padding: "12px 14px", background: "rgba(107,142,91,0.1)",
              borderRadius: "10px", borderLeft: `4px solid ${CAT_COLORS[catIndex]}` }}>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "12.5px", color: "#5A4D3A",
                lineHeight: "1.5", margin: 0, fontStyle: "italic" }}>💡 {question.flavour}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DICE ───
function Dice({ value, onRoll }) {
  const dots = { 1:[[50,50]], 2:[[28,28],[72,72]], 3:[[28,28],[50,50],[72,72]],
    4:[[28,28],[72,28],[28,72],[72,72]], 5:[[28,28],[72,28],[50,50],[28,72],[72,72]],
    6:[[28,28],[72,28],[28,50],[72,50],[28,72],[72,72]] };
  return (
    <button onClick={onRoll} style={{ width: "58px", height: "58px", background: "linear-gradient(135deg, #FFF8ED, #E8DCC4)",
      border: "3px solid #8B7355", borderRadius: "12px", cursor: "pointer", padding: 0,
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)", transition: "transform 0.15s", position: "relative" }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.92)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
        {(dots[value || 1] || []).map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="9" fill="#2D2010" />
        ))}
      </svg>
    </button>
  );
}

function FeatherDisplay({ feathers, size = 22 }) {
  return (
    <div style={{ display: "flex", gap: "3px" }}>
      {feathers.map((has, i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: "50%",
          background: has ? CAT_COLORS[i] : "rgba(180,170,150,0.25)",
          border: `1.5px solid ${has ? CAT_COLORS[i] : "rgba(180,170,150,0.4)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: `${size * 0.5}px`, transition: "all 0.3s ease",
          boxShadow: has ? `0 0 6px ${CAT_COLORS[i]}55` : "none",
        }}>{has ? "🪶" : ""}</div>
      ))}
    </div>
  );
}

// ─── QUESTION EDITOR ───
function QuestionEditor({ questions, onUpdate, onClose }) {
  const [activeCat, setActiveCat] = useState(0);
  const [editingQ, setEditingQ] = useState(null);
  const [form, setForm] = useState({ question: "", options: ["", "", "", ""], answer: "", flavour: "" });
  const catName = CATEGORIES[activeCat];
  const qs = questions[catName] || [];

  const saveQ = () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    const n = { ...questions };
    if (editingQ !== null) n[catName][editingQ] = { ...form };
    else n[catName] = [...(n[catName] || []), { ...form }];
    onUpdate(n);
    setEditingQ(null);
    setForm({ question: "", options: ["", "", "", ""], answer: "", flavour: "" });
  };
  const deleteQ = (idx) => { const n = { ...questions }; n[catName] = n[catName].filter((_, i) => i !== idx); onUpdate(n); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(30,25,15,0.85)", backdropFilter: "blur(6px)" }}>
      <div style={{ background: "linear-gradient(145deg, #FFF8ED, #F0E6D0)", borderRadius: "20px",
        maxWidth: "680px", width: "95%", maxHeight: "85vh", overflow: "hidden",
        border: "3px solid #8B7355", boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 22px", borderBottom: "2px solid #D4C5A0", display: "flex",
          justifyContent: "space-between", alignItems: "center",
          background: "linear-gradient(135deg, #6B5040, #8B7355)" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#FFF8ED", fontWeight: "bold" }}>
            📝 Question Editor</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none",
            borderRadius: "8px", padding: "5px 14px", color: "#FFF8ED", cursor: "pointer",
            fontSize: "13px", fontFamily: "Georgia, serif" }}>✕ Close</button>
        </div>
        <div style={{ display: "flex", padding: "8px 12px", gap: "5px", flexWrap: "wrap", borderBottom: "1px solid #D4C5A0" }}>
          {CATEGORIES.map((c, i) => (
            <button key={i} onClick={() => { setActiveCat(i); setEditingQ(null); setForm({ question: "", options: ["", "", "", ""], answer: "", flavour: "" }); }}
              style={{ background: i === activeCat ? CAT_COLORS[i] : "transparent",
                border: `2px solid ${CAT_COLORS[i]}`, borderRadius: "7px", padding: "3px 9px",
                fontSize: "11px", cursor: "pointer", fontFamily: "Georgia, serif",
                color: i === activeCat ? "#fff" : "#3D2E1E" }}>
              {CAT_ICONS[i]} {CAT_LABELS_SHORT[i]} ({(questions[c] || []).length})
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "14px 18px" }}>
          {qs.map((q, idx) => (
            <div key={idx} style={{ padding: "8px 12px", marginBottom: "6px", background: "rgba(255,255,255,0.5)",
              borderRadius: "8px", border: "1px solid #D4C5A0", display: "flex",
              justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#2D2010", flex: 1 }}>{q.question}</span>
              <div style={{ display: "flex", gap: "5px", marginLeft: "8px", flexShrink: 0 }}>
                <button onClick={() => { setEditingQ(idx); setForm({ ...qs[idx] }); }}
                  style={{ background: "#6B9EC4", border: "none", borderRadius: "5px", padding: "3px 9px",
                    color: "#fff", cursor: "pointer", fontSize: "11px" }}>Edit</button>
                <button onClick={() => deleteQ(idx)}
                  style={{ background: "#C07070", border: "none", borderRadius: "5px", padding: "3px 9px",
                    color: "#fff", cursor: "pointer", fontSize: "11px" }}>Del</button>
              </div>
            </div>
          ))}
          <div style={{ marginTop: "14px", padding: "14px", background: "rgba(107,90,70,0.08)",
            borderRadius: "10px", border: "2px dashed #B8A88A" }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#4A3D2E", margin: "0 0 10px", fontWeight: "bold" }}>
              {editingQ !== null ? "✏️ Edit Question" : "➕ Add New Question"}</p>
            <input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })}
              placeholder="Question text..." style={{ width: "100%", padding: "9px 11px", borderRadius: "7px",
                border: "2px solid #D4C5A0", background: "#FFF8ED", fontFamily: "Georgia, serif",
                fontSize: "13px", marginBottom: "6px", boxSizing: "border-box" }} />
            {form.options.map((opt, i) => (
              <input key={i} value={opt}
                onChange={e => { const o = [...form.options]; o[i] = e.target.value; setForm({ ...form, options: o }); }}
                placeholder={`Option ${String.fromCharCode(65 + i)}...`}
                style={{ width: "100%", padding: "7px 11px", borderRadius: "7px", border: "1px solid #D4C5A0",
                  background: "#FFF8ED", fontFamily: "Georgia, serif", fontSize: "12px",
                  marginBottom: "3px", boxSizing: "border-box" }} />
            ))}
            <select value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })}
              style={{ width: "100%", padding: "7px 11px", borderRadius: "7px", border: "2px solid #D4C5A0",
                background: "#FFF8ED", fontFamily: "Georgia, serif", fontSize: "12px",
                margin: "3px 0", boxSizing: "border-box" }}>
              <option value="">Select correct answer...</option>
              {form.options.filter(Boolean).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
            <input value={form.flavour} onChange={e => setForm({ ...form, flavour: e.target.value })}
              placeholder="Fun fact (optional)..." style={{ width: "100%", padding: "7px 11px",
                borderRadius: "7px", border: "1px solid #D4C5A0", background: "#FFF8ED",
                fontFamily: "Georgia, serif", fontSize: "12px", marginBottom: "8px", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={saveQ} style={{ background: "#6B8E5B", border: "none", borderRadius: "8px",
                padding: "7px 18px", color: "#fff", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px" }}>
                {editingQ !== null ? "Update" : "Add"}</button>
              {editingQ !== null && (
                <button onClick={() => { setEditingQ(null); setForm({ question: "", options: ["", "", "", ""], answer: "", flavour: "" }); }}
                  style={{ background: "#B8A88A", border: "none", borderRadius: "8px", padding: "7px 18px",
                    color: "#fff", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px" }}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ───
export default function WoodlandTrivia() {
  const [state, dispatch] = useReducer(gameReducer, initialState(2));

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const boardRef = useRef(null);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(0.4, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = (e) => {
    if (e.button === 0) { setDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }
  };
  const handleMouseMove = (e) => { if (dragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleMouseUp = () => setDragging(false);

  useEffect(() => {
    const el = boardRef.current;
    if (el) { el.addEventListener("wheel", handleWheel, { passive: false }); return () => el.removeEventListener("wheel", handleWheel); }
  }, [handleWheel]);

  const [lastTouchDist, setLastTouchDist] = useState(null);
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) { setDragging(true); setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y }); }
    else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setLastTouchDist(Math.hypot(dx, dy));
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && dragging) setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    else if (e.touches.length === 2 && lastTouchDist) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setZoom(z => Math.min(4, Math.max(0.4, z * (d / lastTouchDist)))); setLastTouchDist(d);
    }
  };
  const handleTouchEnd = () => { setDragging(false); setLastTouchDist(null); };
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const globalStyles = `
    @keyframes fadeIn { from{opacity:0}to{opacity:1} }
    @keyframes slideUp { from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)} }
    @keyframes pulse { 0%,100%{opacity:0.6}50%{opacity:1} }
    @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)} }
    @keyframes shimmer { 0%{background-position:-200%}100%{background-position:200%} }
    * { box-sizing: border-box; }
  `;

  // ─── SETUP ───
  if (state.phase === "setup") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", background: "linear-gradient(160deg, #1A1810 0%, #2D2818 40%, #3A3020 100%)",
        fontFamily: "Georgia, 'Palatino Linotype', serif" }}>
        <style>{globalStyles}</style>
        <div style={{ background: "linear-gradient(145deg, #FFF8ED, #F0E6D0)", borderRadius: "24px",
          padding: "44px 48px", maxWidth: "480px", border: "3px solid #8B7355",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)", textAlign: "center", animation: "slideUp 0.6s ease" }}>
          <div style={{ fontSize: "42px", marginBottom: "6px", letterSpacing: "8px" }}>🐦‍⬛🐦🪶🕊️</div>
          <h1 style={{ fontSize: "30px", color: "#2D2010", margin: "4px 0", fontWeight: "bold",
            background: "linear-gradient(135deg, #2D2010, #6B5040)", WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent" }}>Woodland Trivia</h1>
          <p style={{ color: "#8B7355", fontSize: "13px", margin: "4px 0 28px", fontStyle: "italic" }}>
            A cozy corvid board game in the whispering woods</p>
          <p style={{ color: "#4A3D2E", fontSize: "15px", margin: "0 0 14px" }}>How many players?</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "28px" }}>
            {[2, 3, 4].map(n => (
              <button key={n} onClick={() => dispatch({ type: "SET_PLAYERS", count: n })} style={{
                width: "52px", height: "52px", borderRadius: "14px",
                background: state.playerCount === n ? "linear-gradient(135deg, #6B8E5B, #5A7E4B)"
                  : "linear-gradient(135deg, #EDE0C8, #DDD0B8)",
                border: `2px solid ${state.playerCount === n ? "#4A6E3B" : "#B8A88A"}`,
                color: state.playerCount === n ? "#fff" : "#2D2010",
                fontSize: "20px", fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif",
                transition: "all 0.15s ease" }}>{n}</button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginBottom: "22px" }}>
            {state.players.map(p => (
              <div key={p.id} style={{ textAlign: "center" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%",
                  background: `linear-gradient(135deg, ${p.color}, ${p.color}DD)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "22px", margin: "0 auto 4px", border: `2px solid ${p.accent}` }}>{p.emoji}</div>
                <span style={{ fontSize: "11px", color: "#4A3D2E" }}>{p.name}</span>
              </div>
            ))}
          </div>
          <button onClick={() => dispatch({ type: "START_GAME" })} style={{
            background: "linear-gradient(135deg, #6B8E5B, #4A7E3B)", border: "none",
            borderRadius: "14px", padding: "13px 44px", color: "#FFF8ED",
            fontSize: "17px", fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif",
            boxShadow: "0 6px 20px rgba(74,126,59,0.4)", transition: "all 0.15s" }}>
            🌿 Begin Adventure</button>
        </div>
      </div>
    );
  }

  // ─── GAME OVER ───
  if (state.phase === "gameover") {
    const w = state.players[state.winner];
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #1A1810, #2D2818)", fontFamily: "Georgia, serif" }}>
        <style>{globalStyles}</style>
        <div style={{ background: "linear-gradient(145deg, #FFF8ED, #F0E6D0)", borderRadius: "24px",
          padding: "44px", textAlign: "center", border: "3px solid #FFD700",
          boxShadow: "0 0 60px rgba(255,215,0,0.2)", animation: "slideUp 0.6s ease" }}>
          <div style={{ fontSize: "56px", animation: "float 2.5s ease infinite" }}>{w.emoji}</div>
          <h1 style={{ fontSize: "26px", color: "#2D2010", margin: "14px 0 6px" }}>🎉 {w.name} Wins! 🎉</h1>
          <p style={{ color: "#6B5D4A", margin: "0 0 20px", fontSize: "14px" }}>All six feathers collected!</p>
          <FeatherDisplay feathers={w.feathers} size={28} />
          <br />
          <button onClick={() => dispatch({ type: "RESET" })} style={{ marginTop: "20px",
            background: "linear-gradient(135deg, #6B8E5B, #4A7E3B)", border: "none",
            borderRadius: "14px", padding: "11px 32px", color: "#FFF8ED", fontSize: "15px",
            cursor: "pointer", fontFamily: "Georgia, serif" }}>🌿 Play Again</button>
        </div>
      </div>
    );
  }

  // ─── MAIN GAME ───
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg, #1A1810 0%, #252218 50%, #2D2818 100%)",
      fontFamily: "Georgia, 'Palatino Linotype', serif", overflow: "hidden", userSelect: "none" }}>
      <style>{globalStyles}</style>

      {/* Top bar */}
      <div style={{ padding: "6px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(255,248,237,0.05)", borderBottom: "1px solid rgba(255,248,237,0.08)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>🐦‍⬛</span>
          <span style={{ color: "#C4B8A0", fontSize: "15px", fontWeight: "bold" }}>Woodland Trivia</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[["📝 Questions", "OPEN_EDITOR"], ["🗺️ Reset View", null], ["🔄 New Game", "RESET"]].map(([label, action], i) => (
            <button key={i} onClick={() => action ? dispatch({ type: action }) : resetView()}
              style={{ background: "rgba(255,248,237,0.08)", border: "1px solid rgba(255,248,237,0.12)",
                borderRadius: "7px", padding: "3px 10px", color: "#B8AA90", cursor: "pointer",
                fontSize: "11px", fontFamily: "Georgia, serif" }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div ref={boardRef} style={{ flex: 1, overflow: "hidden", cursor: dragging ? "grabbing" : "grab", position: "relative" }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center", width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: dragging ? "none" : "transform 0.1s ease" }}>
          <div style={{ width: "min(95vh, 95vw)", height: "min(75vh, 75vw)" }}>
            <IsometricBoard spaces={BOARD_SPACES} players={state.players} currentPlayer={state.currentPlayer} />
          </div>
        </div>

        {/* Zoom controls */}
        <div style={{ position: "absolute", bottom: "14px", right: "14px", display: "flex", flexDirection: "column", gap: "3px" }}>
          {[["+", () => setZoom(z => Math.min(4, z + 0.3))], ["−", () => setZoom(z => Math.max(0.4, z - 0.3))], ["⊙", resetView]].map(([label, fn], i) => (
            <button key={i} onClick={fn} style={{ width: "34px", height: "34px", borderRadius: "8px",
              background: "rgba(255,248,237,0.9)", border: "2px solid #8B7355",
              cursor: "pointer", fontSize: i < 2 ? "18px" : "12px", fontWeight: "bold",
              color: "#2D2010" }}>{label}</button>
          ))}
        </div>
      </div>

      {/* HUD */}
      <div style={{ padding: "10px 14px", background: "rgba(255,248,237,0.04)",
        borderTop: "1px solid rgba(255,248,237,0.08)", flexShrink: 0 }}>
        <div style={{ textAlign: "center", marginBottom: "8px", color: "#C4B8A0",
          fontSize: "13px", fontStyle: "italic", animation: "pulse 2s ease infinite" }}>{state.message}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
          {state.players.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px",
              padding: "5px 10px", borderRadius: "10px",
              background: i === state.currentPlayer ? "rgba(255,215,0,0.1)" : "transparent",
              border: i === state.currentPlayer ? "1.5px solid rgba(255,215,0,0.25)" : "1.5px solid transparent",
              transition: "all 0.3s ease" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: p.color,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px",
                border: `2px solid ${i === state.currentPlayer ? "#FFD700" : p.accent}` }}>{p.emoji}</div>
              <div>
                <div style={{ color: "#C4B8A0", fontSize: "11px", fontWeight: "bold" }}>{p.name}</div>
                <FeatherDisplay feathers={p.feathers} size={18} />
              </div>
            </div>
          ))}
          {state.phase === "playing" && (
            <Dice value={state.diceValue} onRoll={() => dispatch({ type: "ROLL_DICE" })} />
          )}
        </div>
      </div>

      {/* Question overlay */}
      {state.phase === "question" && state.currentQuestion && (
        <div>
          <QuestionCard question={state.currentQuestion} catIndex={state.currentCatIndex}
            selectedAnswer={state.selectedAnswer} answerRevealed={state.answerRevealed}
            onAnswer={(a) => dispatch({ type: "ANSWER", answer: a })} />
          {state.answerRevealed && (
            <div style={{ position: "fixed", bottom: "36px", left: "50%", transform: "translateX(-50%)", zIndex: 101 }}>
              <button onClick={() => dispatch({ type: "NEXT_TURN" })} style={{
                background: "linear-gradient(135deg, #6B8E5B, #4A7E3B)", border: "none",
                borderRadius: "14px", padding: "11px 32px", color: "#FFF8ED", fontSize: "15px",
                fontWeight: "bold", cursor: "pointer", fontFamily: "Georgia, serif",
                boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }}>Continue →</button>
            </div>
          )}
        </div>
      )}

      {state.phase === "editor" && (
        <QuestionEditor questions={state.questions}
          onUpdate={(q) => dispatch({ type: "UPDATE_QUESTIONS", questions: q })}
          onClose={() => dispatch({ type: "CLOSE_EDITOR" })} />
      )}
    </div>
  );
}
