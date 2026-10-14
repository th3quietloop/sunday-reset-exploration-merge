/* Sunday Reset starting data: Russell's real week, the dates he knows about, his to do list,
   dinners, and ideas for time with Kim. Everything here is editable in the app; this is only
   what a fresh board starts with. Times are minutes after midnight. */
(function (root) {
  'use strict';

  const h = (hr, mn) => hr * 60 + (mn || 0);

  /* What kind of time each block is. `base` is the block color, `ink` the label on it.
     The palette is the concept art's, deepened so every label reads at 4.5 to 1 or better,
     plus a plum for time with Kim and a green for meals so neither blends into its neighbor. */
  const CATS = {
    sleep: { name: 'Sleep', base: '#5B616C', ink: '#F1F2F4' },
    family: { name: 'Family', base: '#B84A38', ink: '#FFFFFF' },
    us: { name: 'You and Kim', base: '#8A5AA6', ink: '#FFFFFF' },
    work: { name: 'Work', base: '#2D6EA6', ink: '#FFFFFF' },
    yours: { name: 'Yours', base: '#EFB940', ink: '#4B3A18' },
    meals: { name: 'Meals', base: '#3B7F45', ink: '#FFFFFF' },
    home: { name: 'Home', base: '#1F6F87', ink: '#FFFFFF' },
    away: { name: 'Away', base: '#2A4B90', ink: '#FFFFFF' },
    open: { name: 'Breathing room', base: '#EFE3CA', ink: '#5A4430' }
  };
  const CAT_ORDER = ['yours', 'family', 'us', 'work', 'meals', 'home', 'away', 'open', 'sleep'];

  /* A template block. fixed: set by the world (church, daycare, meetings), never pushed.
     soft: open time that makes room when you drop something into it.
     free: soft time that's meant to stay unplanned. It shows as an empty spot on the board, not a block. */
  const B = (id, name, cat, icon, start, end, flags) => Object.assign({ id, name, cat, icon, start, dur: end - start }, flags || {});
  const FIXED = { fixed: true }, SOFT = { soft: true }, FREE = { soft: true, free: true };

  const sunday = {
    wake: h(5, 30), bed: h(22),
    blocks: [
      B('up', 'Up with Elijah', 'family', 'bottle', h(5, 30), h(7, 30)),
      B('ready', 'Get ready', 'family', 'shirt', h(7, 30), h(8, 30)),
      B('drive', 'Drive to church', 'family', 'car', h(8, 30), h(8, 45)),
      B('church', 'Church at 9', 'family', 'church', h(8, 45), h(10, 45), FIXED),
      B('lunch', 'Lunch, pack them up', 'family', 'fork', h(10, 45), h(14)),
      B('reset', 'Sunday Reset', 'yours', 'calendar', h(14), h(14, 45)),
      B('workout', 'Workout', 'yours', 'dumbbell', h(14, 45), h(15, 45)),
      B('creative', 'Creative projects', 'yours', 'brush', h(15, 45), h(18), SOFT),
      B('dinner', 'Dinner', 'meals', 'pot', h(18), h(18, 45), { dinner: true }),
      B('evening', 'Free evening', 'yours', 'moon', h(18, 45), h(22), FREE)
    ]
  };
  const monday = {
    wake: h(6, 30), bed: h(22),
    blocks: [
      B('workout', 'Workout', 'yours', 'dumbbell', h(6, 30), h(7, 30)),
      B('morning', 'Creative time', 'yours', 'brush', h(7, 30), h(8, 30), SOFT),
      B('work', 'Work', 'work', 'laptop', h(8, 30), h(16), SOFT),
      B('groceries', 'Groceries, cook ahead', 'meals', 'cart', h(16), h(17, 30)),
      B('creative', 'Creative projects', 'yours', 'brush', h(17, 30), h(19), SOFT),
      B('home', 'Kim and Elijah home', 'family', 'heart', h(19), h(19, 45)),
      B('dinner', 'Dinner', 'meals', 'pot', h(19, 45), h(20, 30), { dinner: true }),
      B('evening', 'Evening with Kim', 'us', 'heart', h(20, 30), h(22), SOFT)
    ]
  };
  const weekday = {
    wake: h(5, 30), bed: h(22),
    blocks: [
      B('up', 'Up with Elijah', 'family', 'bottle', h(5, 30), h(7)),
      B('ready', 'Get him ready', 'family', 'shirt', h(7), h(8)),
      B('dropoff', 'Daycare drop off', 'family', 'car', h(8), h(8, 30), Object.assign({ daycare: true }, FIXED)),
      B('work', 'Work', 'work', 'laptop', h(8, 30), h(14), SOFT),
      B('creative', 'Creative projects', 'yours', 'brush', h(14), h(16), SOFT),
      B('work2', 'Wrap up work', 'work', 'laptop', h(16), h(16, 30), SOFT),
      B('pickup', 'Daycare pick up', 'family', 'car', h(16, 30), h(17), Object.assign({ daycare: true }, FIXED)),
      B('walk', 'Walk, bath, feed', 'family', 'shoe', h(17), h(19)),
      B('bedtime', 'Shower, bedtime', 'family', 'moon', h(19), h(19, 45)),
      B('dinner', 'Dinner', 'meals', 'pot', h(19, 45), h(20, 30), { dinner: true }),
      B('evening', 'Evening with Kim', 'us', 'heart', h(20, 30), h(22), SOFT)
    ]
  };
  const saturday = {
    wake: h(5, 30), bed: h(22),
    blocks: [
      B('up', 'Up with Elijah', 'family', 'bottle', h(5, 30), h(8)),
      B('morningwalk', 'Morning walk', 'family', 'shoe', h(8), h(9, 30)),
      B('breakfast', 'Breakfast', 'meals', 'fork', h(9, 30), h(10, 30)),
      B('clean', 'Clean the house', 'home', 'broom', h(10, 30), h(12, 30)),
      B('walk', 'Walk, bath, feed', 'family', 'shoe', h(17), h(19)),
      B('bedtime', 'Bedtime', 'family', 'moon', h(19), h(19, 45)),
      B('dinner', 'Dinner', 'meals', 'pot', h(19, 45), h(20, 30), { dinner: true }),
      B('evening', 'Evening with Kim', 'us', 'heart', h(20, 30), h(22), SOFT)
    ]
  };
  const copy = (d) => JSON.parse(JSON.stringify(d));

  /* Week shapes: most weeks Kim and Elijah drive to her parents' on Sunday at 2. Some weeks they go Monday morning. */
  const sundayHome = {
    wake: h(5, 30), bed: h(22),
    blocks: [
      B('up', 'Up with Elijah', 'family', 'bottle', h(5, 30), h(7, 30)),
      B('ready', 'Get ready', 'family', 'shirt', h(7, 30), h(8, 30)),
      B('drive', 'Drive to church', 'family', 'car', h(8, 30), h(8, 45)),
      B('church', 'Church at 9', 'family', 'church', h(8, 45), h(10, 45), FIXED),
      B('lunch', 'Lunch', 'family', 'fork', h(10, 45), h(13)),
      B('reset', 'Sunday Reset', 'yours', 'calendar', h(13), h(13, 45)),
      B('afternoon', 'Family afternoon', 'family', 'heart', h(13, 45), h(17), SOFT),
      B('walk', 'Walk, bath, feed', 'family', 'shoe', h(17), h(19)),
      B('bedtime', 'Bedtime', 'family', 'moon', h(19), h(19, 45)),
      B('dinner', 'Dinner', 'meals', 'pot', h(19, 45), h(20, 30), { dinner: true }),
      B('evening', 'Evening with Kim', 'us', 'heart', h(20, 30), h(22), SOFT)
    ]
  };
  const mondayLeave = {
    wake: h(5, 30), bed: h(22),
    blocks: [
      B('up', 'Up with Elijah', 'family', 'bottle', h(5, 30), h(7, 30)),
      B('leave', 'Kim and Elijah head out', 'family', 'car', h(7, 30), h(8)),
      B('work', 'Work', 'work', 'laptop', h(8, 30), h(16), SOFT),
      B('groceries', 'Groceries, cook ahead', 'meals', 'cart', h(16), h(17, 30)),
      B('creative', 'Creative projects', 'yours', 'brush', h(17, 30), h(19), SOFT),
      B('home', 'Kim and Elijah home', 'family', 'heart', h(19), h(19, 45)),
      B('dinner', 'Dinner', 'meals', 'pot', h(19, 45), h(20, 30), { dinner: true }),
      B('evening', 'Evening with Kim', 'us', 'heart', h(20, 30), h(22), SOFT)
    ]
  };

  const SHAPES = [
    { id: 'usual', name: 'Kim and Elijah leave Sunday at 2', short: 'Leave Sunday' },
    { id: 'monday', name: 'They leave Monday morning', short: 'Leave Monday' }
  ];

  /* Dates Russell knows about. marker: an all day note (yearly repeats). trip: whole days away.
     timed: something at a set time on one date. */
  const EVENTS = [
    { id: 'dad-bday', kind: 'marker', name: 'Dad’s birthday', icon: 'cake', date: '2026-10-04', yearly: true },
    { id: 'my-bday', kind: 'marker', name: 'Your birthday', icon: 'cake', date: '2026-11-09', yearly: true },
    { id: 'kim-bday', kind: 'marker', name: 'Kim’s birthday', icon: 'cake', date: '2027-02-24', yearly: true },
    { id: 'thanksgiving', kind: 'marker', name: 'Thanksgiving', icon: 'pot', date: '2026-11-26', off: true },
    { id: 'christmas-eve', kind: 'marker', name: 'Christmas Eve', icon: 'tree', date: '2026-12-24', yearly: true, off: true },
    { id: 'christmas', kind: 'marker', name: 'Christmas', icon: 'tree', date: '2026-12-25', yearly: true, off: true },
    { id: 'oct-trip', kind: 'trip', name: 'October trip', icon: 'plane', date: '2026-10-16', end: '2026-10-19', leave: h(7, 30), back: h(17) },
    { id: 'virginia', kind: 'trip', name: 'Virginia', icon: 'plane', date: '2026-11-06', end: '2026-11-09', leave: h(7, 30), back: h(17) },
    { id: 'aunt-drop', kind: 'timed', name: 'Elijah to his aunt’s', cat: 'family', icon: 'car', date: '2026-11-13', start: h(17, 30), dur: 30 },
    { id: 'salty-drive', kind: 'timed', name: 'Drive to Salty’s', cat: 'us', icon: 'car', date: '2026-11-13', start: h(18), dur: 30 },
    { id: 'salty', kind: 'timed', name: 'Salty’s on the Columbia', cat: 'us', icon: 'heart', date: '2026-11-13', start: h(18, 30), dur: 120, big: true },
    { id: 'aunt-pick', kind: 'timed', name: 'Pick up Elijah', cat: 'family', icon: 'car', date: '2026-11-13', start: h(20, 30), dur: 30 }
  ];

  /* The Friday of the birthday dinner: feed Elijah early, bedtime after pick up. */
  const DATES = {
    '2026-11-13': {
      edits: {
        walk: { start: h(17), dur: 30, name: 'Feed him early' },
        bedtime: { start: h(21), dur: 30, name: 'Bedtime' },
        dinner: { gone: true }
      }
    }
  };

  /* Inbox comes first: a quick add with no group lands there, never in Birthdays */
  const INBOX = { id: 'inbox', name: 'Inbox', icon: 'inbox' };
  const GROUPS = [
    INBOX,
    { id: 'birthdays', name: 'Birthdays', icon: 'cake' },
    { id: 'trips', name: 'Trips', icon: 'plane' },
    { id: 'home', name: 'Home', icon: 'house' },
    { id: 'bills', name: 'Bills', icon: 'receipt' },
    { id: 'christmas', name: 'Christmas', icon: 'tree' }
  ];

  const S = (name, dur) => ({ name, dur });
  const TASKS = [
    { id: 'mom-card', name: 'Fill out Mom’s card', group: 'birthdays', icon: 'envelope', cat: 'family', due: '2026-09-29', steps: [S('Write the card', 15), S('Address and stamp it', 10), S('Mail it', 15)] },
    { id: 'dad-gift', name: 'Card or gift for Dad', group: 'birthdays', icon: 'gift', cat: 'family', due: '2026-10-01', steps: [S('Pick a card or gift', 20), S('Order it or buy it', 15), S('Write a note', 10)] },
    { id: 'dad-call', name: 'Call Dad', group: 'birthdays', icon: 'handset', cat: 'family', dur: 30, due: '2026-10-04', steps: [] },
    { id: 'aunt-check', name: 'Check in with his aunt about Nov 13', group: 'birthdays', icon: 'handset', cat: 'family', dur: 15, due: '2026-11-11', steps: [] },
    { id: 'kim-bday-plan', name: 'Plan Kim’s birthday', group: 'birthdays', icon: 'heart', cat: 'us', due: '2027-02-10', steps: [S('Ask what she’d love', 15), S('Book something', 30), S('Line up a sitter', 15), S('Get a gift', 30)] },
    { id: 'ooo-oct', name: 'Out of office for the trip', group: 'trips', icon: 'laptop', cat: 'work', due: '2026-10-09', steps: [S('Ask for Oct 16 and 19 off', 10), S('Move recurring meetings', 15), S('Set an away message', 5)] },
    { id: 'pack-oct', name: 'Pack for the October trip', group: 'trips', icon: 'box', cat: 'family', due: '2026-10-15', steps: [S('Pack Elijah’s bag', 30), S('Pack your bag', 20), S('Charge everything', 5)] },
    { id: 'groc-oct', name: 'Groceries after the trip', group: 'trips', icon: 'cart', cat: 'meals', dur: 60, due: '2026-10-20', steps: [] },
    { id: 'pack-va', name: 'Pack for Virginia', group: 'trips', icon: 'box', cat: 'family', due: '2026-11-05', steps: [S('Pack Elijah’s bag', 30), S('Pack your bag', 20), S('Charge everything', 5)] },
    { id: 'groc-va', name: 'Groceries after Virginia', group: 'trips', icon: 'cart', cat: 'meals', dur: 60, due: '2026-11-10', steps: [] },
    { id: 'laundry', name: 'Laundry', group: 'home', icon: 'shirt', cat: 'home', due: '2026-10-03', repeat: 'weekly', steps: [S('Wash', 15), S('Dry', 10), S('Fold and put away', 30)] },
    { id: 'bills', name: 'Pay the bills', group: 'bills', icon: 'receipt', cat: 'home', due: '2026-10-01', repeat: 'monthly', steps: [S('See what’s due', 15), S('Pay each one', 20)] },
    { id: 'decor', name: 'Christmas decorations with Kim', group: 'christmas', icon: 'tree', cat: 'us', due: '2026-11-29', steps: [S('Ask Kim what she wants this year', 15), S('Bring the boxes down', 30), S('Get a tree', 60), S('Decorate together', 120)] },
    { id: 'gift-kim', name: 'Christmas gift for Kim', group: 'christmas', icon: 'gift', cat: 'us', due: '2026-12-12', steps: [S('Make a list of ideas', 15), S('Pick one', 10), S('Order it', 15), S('Wrap it', 15)] },
    { id: 'gift-family', name: 'Family gifts', group: 'christmas', icon: 'gift', cat: 'family', due: '2026-12-12', steps: [S('List who', 10), S('Pick gifts', 45), S('Order them', 30), S('Wrap them', 45)] },
    { id: 'xmas-cards', name: 'Christmas cards', group: 'christmas', icon: 'envelope', cat: 'family', due: '2026-12-05', steps: [S('Pick a photo', 15), S('Order the cards', 20), S('Address and mail', 45)] }
  ];

  /* Dinner building blocks: things in the kitchen, and recipes made from them. */
  const PANTRY = [
    ['chicken', 'Chicken', 'protein'], ['beef', 'Ground beef', 'protein'], ['turkey', 'Ground turkey', 'protein'], ['salmon', 'Salmon', 'protein'],
    ['shrimp', 'Shrimp', 'protein'], ['eggs', 'Eggs', 'protein'], ['beans', 'Black beans', 'protein'],
    ['broccoli', 'Broccoli', 'veg'], ['peppers', 'Peppers', 'veg'], ['spinach', 'Spinach', 'veg'], ['sweetpotato', 'Sweet potato', 'veg'],
    ['greenbeans', 'Green beans', 'veg'], ['zucchini', 'Zucchini', 'veg'], ['salad', 'Salad greens', 'veg'], ['onion', 'Onion', 'veg'],
    ['rice', 'Rice', 'base'], ['pasta', 'Pasta', 'base'], ['tortillas', 'Tortillas', 'base'], ['potatoes', 'Potatoes', 'base'], ['bread', 'Bread', 'base'], ['quinoa', 'Quinoa', 'base']
  ].map(([id, name, kind]) => ({ id, name, kind }));
  const PANTRY_KINDS = [
    { id: 'protein', name: 'Proteins', icon: 'drumstick' },
    { id: 'veg', name: 'Vegetables', icon: 'carrot' },
    { id: 'base', name: 'Bases', icon: 'bowl' }
  ];
  const RECIPES = [
    { id: 'tacos', name: 'Tacos', items: ['beef', 'tortillas', 'peppers', 'onion'], dur: 30 },
    { id: 'sheetpan', name: 'Sheet pan chicken', items: ['chicken', 'broccoli', 'sweetpotato'], dur: 45 },
    { id: 'salmonbowls', name: 'Salmon rice bowls', items: ['salmon', 'rice', 'spinach'], dur: 30 },
    { id: 'stirfry', name: 'Chicken stir fry', items: ['chicken', 'peppers', 'broccoli', 'rice'], dur: 30 },
    { id: 'spaghetti', name: 'Spaghetti and salad', items: ['beef', 'pasta', 'salad'], dur: 30 },
    { id: 'chili', name: 'Turkey chili', items: ['turkey', 'beans', 'peppers', 'onion'], dur: 45 },
    { id: 'burrito', name: 'Burrito bowls', items: ['chicken', 'rice', 'beans', 'peppers'], dur: 30 },
    { id: 'brinner', name: 'Breakfast for dinner', items: ['eggs', 'potatoes', 'spinach', 'bread'], dur: 25 }
  ];
  /* How dinner happens, as a word under the dinner's name. past: how it reads once the day is over. */
  const COOKS = [
    { id: 'me', name: 'You cook', past: 'You cooked' },
    { id: 'kim', name: 'Kim cooks', past: 'Kim cooked' },
    { id: 'home', name: 'Cooking', past: 'Cooked at home' },
    { id: 'order', name: 'Ordering in', past: 'Ordered in' },
    { id: 'out', name: 'Eating out', past: 'Ate out' },
    { id: 'leftovers', name: 'Leftovers', past: 'Leftovers' },
    { id: 'skip', name: 'Skipping it', past: 'Skipped' }
  ];
  /* The first question about any dinner: how is it happening? Everything else follows from the answer.
     Only cooking adds groceries. */
  const DINNER_HOW = [
    { id: 'home', name: 'Cook', icon: 'pot' },
    { id: 'order', name: 'Order in', icon: 'box' },
    { id: 'out', name: 'Eat out', icon: 'car' },
    { id: 'leftovers', name: 'Leftovers', icon: 'bowl' },
    { id: 'skip', name: 'Skip', icon: 'moon' }
  ];
  const ORDER_FROM = ['DoorDash', 'Uber Eats'];

  /* Ideas to bring to Kim in the evening, instead of only TV. */
  const IDEAS = [
    ['bananagrams', 'Bananagrams', 'play', 45, 'tiles'], ['scrabble', 'Scrabble', 'play', 60, 'tiles'], ['cards', 'A card game', 'play', 45, 'tiles'], ['puzzle', 'A puzzle', 'play', 60, 'tiles'],
    ['next-year', 'Dream about next year', 'talk', 45, 'chat'], ['date-plan', 'Plan the next date night', 'talk', 30, 'chat'], ['first-bday', 'Ideas for Elijah’s first birthday', 'talk', 30, 'chat'], ['memories', 'Favorite memories of the year', 'talk', 30, 'chat'],
    ['decor-plan', 'Plan the Christmas decorations', 'make', 45, 'tree'], ['cook-new', 'Cook something new together', 'make', 60, 'pot'], ['photobook', 'Start a photo book of Elijah', 'make', 60, 'book'], ['room', 'Rearrange a room', 'make', 60, 'house'],
    ['date-home', 'Date night at home', 'date', 90, 'heart'], ['her-movie', 'A movie she picks', 'date', 120, 'film'], ['porch', 'Coffee on the porch', 'date', 30, 'cup']
  ].map(([id, name, kind, dur, icon]) => ({ id, name, kind, dur, icon }));
  const IDEA_KINDS = [
    { id: 'play', name: 'Play', icon: 'tiles' },
    { id: 'talk', name: 'Talk', icon: 'chat' },
    { id: 'make', name: 'Make', icon: 'brush' },
    { id: 'date', name: 'Date', icon: 'heart' }
  ];

  /* Blocks you can drop anywhere. */
  const PALETTE = [
    ['workout', 'Workout', 'yours', 60, 'dumbbell'], ['run', 'Run', 'yours', 30, 'runner'], ['walk', 'Walk', 'yours', 30, 'shoe'],
    ['creative', 'Creative time', 'yours', 60, 'brush'], ['project', 'Personal project', 'yours', 90, 'note'], ['nap', 'Nap', 'yours', 30, 'moon'],
    ['scroll', 'Scroll time', 'yours', 30, 'phone'], ['deep', 'Deep work', 'work', 90, 'book'], ['meeting', 'Meeting', 'work', 30, 'people'],
    ['laundry', 'Laundry', 'home', 60, 'shirt'], ['clean', 'Clean', 'home', 60, 'broom'], ['errand', 'Errand', 'home', 30, 'car'],
    ['groceries', 'Groceries', 'meals', 60, 'cart'], ['cookahead', 'Cook ahead', 'meals', 60, 'pot'], ['call', 'Call someone', 'family', 30, 'handset'],
    ['room', 'Breathing room', 'open', 30, 'wave'],
    ['lunch', 'Lunch', 'meals', 30, 'fork'], ['reading', 'Reading', 'yours', 45, 'book'], ['stretch', 'Stretch', 'yours', 15, 'sun'],
    ['coffee-friend', 'Coffee with a friend', 'family', 60, 'cup'], ['call-loved', 'Call a loved one', 'family', 30, 'handset'],
    ['texts', 'Text friends back', 'family', 15, 'chat'], ['winddown', 'Wind down', 'yours', 30, 'bed'],
    ['opentime', 'Open time', 'open', 60, 'blank'],
    ['study', 'Study', 'work', 60, 'book']
  ].map(([id, name, cat, dur, icon]) => ({ id, name, cat, dur, icon }));
  /* the blocks that come with the app; any other id in a board's palette is one someone made */
  const PALETTE_IDS = PALETTE.map((p) => p.id);
  /* How the blocks pile up in the day view's kit, row by row. Blocks you make go in a last row. */
  const KIT_ROWS = [
    { name: 'Move', ids: ['workout', 'run', 'walk', 'stretch', 'nap'] },
    { name: 'Make', ids: ['creative', 'project', 'reading', 'scroll', 'winddown'] },
    { name: 'People', ids: ['call-loved', 'coffee-friend', 'texts', 'call'] },
    { name: 'Home and meals', ids: ['lunch', 'groceries', 'cookahead', 'laundry', 'clean', 'errand'] },
    { name: 'Work', ids: ['deep', 'meeting', 'study', 'room'] }
  ];

  /* Kinds of day: the shapes a day can take. They only fill open time and gaps: locked blocks and routines stay put.
     when: the part of the day each block prefers. work: it goes inside Work instead of your own time. */
  const PRESETS = [
    { id: 'usual', name: 'Your usual', icon: 'calendar', line: 'The day the way it usually goes', usual: true },
    { id: 'creative', name: 'Creative', icon: 'brush', line: 'Two long creative stretches and a walk', items: [{ p: 'creative', dur: 120, when: 'morning' }, { p: 'walk', dur: 30, when: 'afternoon' }, { p: 'creative', dur: 90, when: 'afternoon' }, { p: 'reading', dur: 45, when: 'evening' }] },
    { id: 'workout', name: 'Workout', icon: 'dumbbell', line: 'Train, stretch, cook ahead, and a walk', items: [{ p: 'workout', dur: 60, when: 'morning' }, { p: 'stretch', dur: 15, when: 'morning' }, { p: 'cookahead', dur: 60, when: 'afternoon' }, { p: 'walk', dur: 45, when: 'evening' }] },
    { id: 'rest', name: 'Rest', icon: 'moon', line: 'A slow walk, a nap, reading, and winding down', items: [{ p: 'walk', dur: 30, when: 'morning' }, { p: 'nap', dur: 45, when: 'afternoon' }, { p: 'reading', dur: 60, when: 'afternoon' }, { p: 'winddown', dur: 30, when: 'evening' }] },
    { id: 'people', name: 'People', icon: 'people', line: 'Coffee with a friend, a call, and texts back', items: [{ p: 'coffee-friend', dur: 60, when: 'morning' }, { p: 'call-loved', dur: 30, when: 'afternoon' }, { p: 'texts', dur: 15, when: 'evening' }] },
    { id: 'focus', name: 'Focus', icon: 'book', line: 'Two deep work blocks inside Work', items: [{ p: 'deep', dur: 120, when: 'morning', work: true }, { p: 'deep', dur: 90, when: 'afternoon', work: true }, { p: 'walk', dur: 30, when: 'afternoon' }] },
    { id: 'empty', name: 'Blank slate', icon: 'broom', line: 'Only locked blocks stay', empty: true },
    { id: 'easy', name: 'Take it easy', icon: 'leaf', line: 'Locked blocks and meals stay. To dos wait for another day', easy: true }
  ];

  /* Ways to break a to do into small steps, matched by words in its name. First match wins. */
  const BREAKDOWNS = [
    { words: ['card'], steps: [S('Write the card', 15), S('Address and stamp it', 10), S('Mail it', 15)] },
    { words: ['birthday', 'bday'], steps: [S('Pick a card or gift', 20), S('Order it or buy it', 15), S('Write a note', 10), S('Call on the day', 30)] },
    { words: ['gift', 'present'], steps: [S('Make a list of ideas', 15), S('Pick one', 10), S('Order it or buy it', 15), S('Wrap it', 15)] },
    { words: ['decor', 'christmas', 'tree'], steps: [S('Ask {partner} what to put up this year', 15), S('Bring the boxes down', 30), S('Decorate together', 120), S('Put the boxes away', 20)] },
    { words: ['bill', 'pay', 'tax'], steps: [S('See what’s due', 15), S('Pay each one', 20), S('Note anything that changed', 5)] },
    { words: ['laundry', 'wash', 'clothes'], steps: [S('Start a load', 10), S('Move it to the dryer', 5), S('Fold and put away', 30)] },
    { words: ['clean', 'tidy', 'kitchen', 'bathroom', 'vacuum'], steps: [S('Pick up the clutter', 15), S('Wipe the counters', 15), S('Vacuum or sweep', 20), S('Take out the trash', 5)] },
    { words: ['pack', 'trip', 'travel', 'flight'], steps: [S('Make a list', 10), S('Pack {kid}’s bag', 30), S('Pack your bag', 20), S('Charge everything', 5)] },
    { words: ['grocer', 'shop', 'store'], steps: [S('Check the fridge', 10), S('Write the list from dinners', 10), S('Shop', 45), S('Put it away', 15)] },
    { words: ['call', 'phone'], steps: [S('Pick a good time', 5), S('Call', 30)] },
    { words: ['email', 'write', 'letter'], steps: [S('Jot the main points', 10), S('Write it', 20), S('Send it', 5)] },
    { words: ['plan', 'book', 'schedule'], steps: [S('Decide what you want', 15), S('Look at options', 20), S('Book it', 15)] }
  ];
  const BREAKDOWN_ANY = [S('Decide the first small step', 10), S('Do the first step', 25), S('Finish up', 20)];

  /* The Sunday Reset, one job per step. */
  const STEPS = [
    { key: 'back', title: 'Look back', zoom: 'week', line: 'Here’s last week. Keep one thing, change one thing.' },
    { key: 'ahead', title: 'Look ahead', zoom: 'month', line: 'The next five weeks. Anything coming that needs a block now?' },
    { key: 'shape', title: 'Set the week', zoom: 'week', line: 'How does this week look?' },
    { key: 'yours', title: 'Your time', zoom: 'week', tab: 'blocks', line: 'Put your own time on the week first, where it fits.' },
    { key: 'todo', title: 'To do', zoom: 'week', tab: 'todo', line: 'Give the things due soon a time this week: drag one onto a day, or tap it.' },
    { key: 'dinners', title: 'Dinners', zoom: 'week', tab: 'dinners', line: 'Pick dinners and who’s cooking. The grocery list fills in as you go.' },
    { key: 'kim', title: 'You and {partner}', zoom: 'week', tab: 'kim', line: 'Pick one thing to bring to {partner} this week.' },
    { key: 'done', title: 'Your week', zoom: 'week', line: 'Here’s what you set up.' }
  ];

  /* The Sunday templates as first shipped, so an update can tell whether Sunday was changed by hand. */
  const SUNDAY_V1 = { wake: h(5, 30), bed: h(22), blocks: [B('up', 'Up with Elijah', 'family', 'bottle', h(5, 30), h(8, 30)), B('ready', 'Get ready', 'family', 'shirt', h(8, 30), h(10)), B('church', 'Church', 'family', 'church', h(10), h(12), FIXED), B('lunch', 'Lunch, pack them up', 'family', 'fork', h(12), h(14)), B('reset', 'Sunday Reset', 'yours', 'calendar', h(14), h(14, 45)), B('workout', 'Workout', 'yours', 'dumbbell', h(14, 45), h(15, 45)), B('creative', 'Creative projects', 'yours', 'brush', h(15, 45), h(18), SOFT), B('dinner', 'Dinner', 'meals', 'pot', h(18), h(18, 45), { dinner: true }), B('evening', 'Free evening', 'yours', 'moon', h(18, 45), h(22), SOFT)] };
  const SUNDAY_HOME_V1 = { wake: h(5, 30), bed: h(22), blocks: [B('up', 'Up with Elijah', 'family', 'bottle', h(5, 30), h(8, 30)), B('ready', 'Get ready', 'family', 'shirt', h(8, 30), h(10)), B('church', 'Church', 'family', 'church', h(10), h(12), FIXED), B('lunch', 'Lunch', 'family', 'fork', h(12), h(13)), B('reset', 'Sunday Reset', 'yours', 'calendar', h(13), h(13, 45)), B('afternoon', 'Family afternoon', 'family', 'heart', h(13, 45), h(17), SOFT), B('walk', 'Walk, bath, feed', 'family', 'shoe', h(17), h(19)), B('bedtime', 'Bedtime', 'family', 'moon', h(19), h(19, 45)), B('dinner', 'Dinner', 'meals', 'pot', h(19, 45), h(20, 30), { dinner: true }), B('evening', 'Evening with Kim', 'us', 'heart', h(20, 30), h(22), SOFT)] };
  const stable = (v) => Array.isArray(v) ? '[' + v.map(stable).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}' : JSON.stringify(v);
  const VERSION = 7;
  /* Who the board belongs to. Names in the app's own words (tabs, buttons, lines) come from here,
     never from code. Russell's board keeps Kim, Elijah, and Kim's cookbook. */
  const RUSSELL = { name: 'Russell', partner: 'Kim', kids: ['Elijah'], cookbook: 'https://truffle-recipes.vercel.app' };
  /* ideas that only make sense in Russell's house, left out of a new person's board */
  const PERSONAL_IDEAS = ['first-bday', 'her-movie', 'photobook'];
  /* Bring a saved board up to date. Sunday gets church at 9 unless it was changed by hand;
     new blocks join the palette; saved day recipes get a home. */
  function migrate(st) {
    if (!st || !st.rhythm) return st;
    if (st.v === 1) {
      if (stable(st.rhythm.days[0]) === stable(SUNDAY_V1)) st.rhythm.days[0] = copy(sunday);
      const sh = st.rhythm.shapes && st.rhythm.shapes.monday;
      if (sh && sh.days && stable(sh.days[0]) === stable(SUNDAY_HOME_V1)) sh.days[0] = copy(sundayHome);
      st.v = 2;
    }
    if (st.v === 2) {
      st.palette = st.palette || [];
      for (const p of PALETTE) if (!st.palette.some((x) => x.id === p.id)) st.palette.push(copy(p));
      st.presets = st.presets || [];
      st.v = 3;
    }
    if (st.v === 3) {
      /* free time shows as an empty spot now, and Open time joins the blocks */
      for (const p of PALETTE) if (!st.palette.some((x) => x.id === p.id)) st.palette.push(copy(p));
      const days = [st.rhythm.days].concat(Object.values(st.rhythm.shapes || {}).map((sh) => sh.days || {}));
      days.forEach((set) => Object.values(set).forEach((t) => (t.blocks || []).forEach((b) => { if (b.soft && /^free\b/i.test(b.name)) b.free = true; })));
      st.v = 4;
    }
    if (st.v === 4) {
      st.profile = st.profile || copy(RUSSELL);
      st.calendars = st.calendars || [];
      st.settings = Object.assign({ sound: true, motion: 'full' }, st.settings);
      st.v = 5;
    }
    if (st.v === 5) {
      /* an Inbox for quick capture, the parts of the week the board helps with, and shopping checks that save */
      st.groups = st.groups || [];
      if (!st.groups.some((g) => g.id === 'inbox')) st.groups.unshift(copy(INBOX));
      const partnered = !!(st.profile && st.profile.partner);
      st.settings = Object.assign({}, st.settings, { modules: Object.assign({ dinners: true, together: partnered }, st.settings && st.settings.modules) });
      st.shopping = st.shopping || {};
      st.v = 6;
    }
    if (st.v === 6) {
      /* The board's visible hours are a view of real dates, not a change to any saved time. */
      st.settings = Object.assign({}, st.settings, { hours: Object.assign({ start: 300, end: 1440 }, st.settings && st.settings.hours) });
      st.v = 7;
    }
    return st;
  }

  function defaultState(today) {
    return {
      v: VERSION,
      created: today || '2026-09-27',
      rhythm: {
        days: { 0: copy(sunday), 1: copy(monday), 2: copy(weekday), 3: copy(weekday), 4: copy(weekday), 5: copy(weekday), 6: copy(saturday) },
        shapes: { monday: { days: { 0: copy(sundayHome), 1: copy(mondayLeave) } } }
      },
      weeks: {},
      meetings: [],
      events: copy(EVENTS),
      dates: copy(DATES),
      groups: copy(GROUPS),
      tasks: TASKS.map((t) => Object.assign({ dur: null, done: false, repeat: null }, copy(t), { steps: (t.steps || []).map((s, i) => ({ id: t.id + '-s' + (i + 1), name: s.name, dur: s.dur, done: false })) })),
      pantry: copy(PANTRY),
      recipes: copy(RECIPES),
      dinners: {},
      ideas: copy(IDEAS),
      palette: copy(PALETTE),
      presets: [],
      calendars: [],
      shopping: {},
      profile: Object.assign(copy(RUSSELL), { sample: true }),
      settings: { sound: true, motion: 'full', modules: { dinners: true, together: true }, hours: { start: 300, end: 1440 } }
    };
  }

  /* A starter week for someone new, from a few answers. The same logic as Russell's week: routines,
     locked drop off and pick up, open work time, dinner, and a free evening or one together.
     a: { name, partner, kids: [], wake: { wd, we }, bed: { wd, we },
          work: { days, start, end, hours: { [weekday]: { start, end } }, fixed } | null (fixed: set hours, like a shift, locked),
          cares: [{ kids: [], days: [], drop, pick }] (each child's own days and times; days need not be work days),
          care: { drop, pick } (older answers: the first child, on work days),
          help: { dinners, together } }
     Children dropped off or picked up at the same time share one block. */
  const joinNames = (list) => (list.length <= 1 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]);
  function careList(a) {
    const kids = (a.kids || []).filter(Boolean);
    if (Array.isArray(a.cares)) return a.cares.filter((c) => c && !c.other && (c.kids || []).length && (c.days || []).length).map((c) => ({ kids: c.kids.filter(Boolean), days: c.days.slice(), drop: c.drop, pick: c.pick }));
    if (a.care && kids[0] && a.work) return [{ kids: [kids[0]], days: a.work.days.slice(), drop: a.care.drop, pick: a.care.pick }];
    return [];
  }
  function buildState(a, today) {
    const kids = (a.kids || []).filter(Boolean);
    /* which meals get a time each day; without the answer, the way it was before the setup asked
       (breakfast only on a day with no work and no drop off, no lunch) */
    const meals = a.meals || null;
    const cares = careList(a);
    const days = {};
    for (let wd = 0; wd < 7; wd++) {
      const weekend = wd === 0 || wd === 6;
      const working = !!(a.work && a.work.days.includes(wd));
      const hours = working ? Object.assign({ start: a.work.start, end: a.work.end }, a.work.hours && a.work.hours[wd]) : null;
      const wake = weekend ? a.wake.we : a.wake.wd, bed = weekend ? a.bed.we : a.bed.wd;
      const blocks = [];
      /* the day's drop offs and pick ups, grouped by time, so two children at 8:30 share one block */
      const on = cares.filter((c) => c.days.includes(wd));
      const byTime = (key) => {
        const m = new Map();
        on.forEach((c) => { if (c[key] == null) return; if (!m.has(c[key])) m.set(c[key], []); m.get(c[key]).push(...c.kids); });
        return Array.from(m.entries()).map(([at, who]) => ({ at, who: Array.from(new Set(who)) })).sort((x, y) => x.at - y.at);
      };
      /* a drop off or pick up that starts inside the one before it rides in that block, so a child at
         8:15 is never dropped from the day behind a block at 8:00, and two locked blocks never overlap */
      const near = (list) => list.reduce((out, x) => { const last = out[out.length - 1]; if (last && x.at < last.at + 30) last.who = Array.from(new Set(last.who.concat(x.who))); else out.push({ at: x.at, who: x.who.slice() }); return out; }, []);
      const drops = near(byTime('drop').filter((x) => x.at >= wake && x.at + 30 <= bed - 60));
      const picks = near(byTime('pick').filter((x) => x.at >= wake + 60 && x.at + 30 <= bed - 60));
      let t = wake;
      const firstDrop = drops.length ? drops[0].at : wake + 60;
      const morningEnd = Math.min(wake + 60, firstDrop, working ? hours.start : wake + 60);
      const withKid = kids.length === 1 ? kids[0] : 'the kids';
      /* breakfast on a busy morning: half an hour after getting ready, before the first drop off or
         work; with no room, the morning gives up its last half hour, or there's no breakfast block */
      const busy = drops.length || working;
      const nextHard = drops.length ? drops[0].at : working ? hours.start : bed;
      let mornTo = morningEnd, eat = null;
      if (meals && meals.breakfast && busy) {
        if (morningEnd + 30 <= nextHard) eat = morningEnd;
        else if (morningEnd - t >= 45) { mornTo = morningEnd - 30; eat = mornTo; }
      }
      if (mornTo - t >= 15) blocks.push(B('morning', kids.length ? 'Up with ' + withKid : 'Get ready', kids.length ? 'family' : 'yours', kids.length ? 'bottle' : 'shirt', t, mornTo));
      t = mornTo;
      if (eat != null) { blocks.push(B('breakfast', 'Breakfast', 'meals', 'fork', eat, eat + 30)); t = eat + 30; }
      drops.forEach((x, i) => {
        if (x.at < t) return;
        blocks.push(B(i ? 'dropoff' + (i + 1) : 'dropoff', 'Drop off ' + joinNames(x.who), 'family', 'car', x.at, x.at + 30, { fixed: true, daycare: true }));
        t = x.at + 30;
      });
      if (working) {
        const ws = Math.max(t, hours.start), we = Math.max(ws + 60, hours.end);
        /* work that's set, like a shift, is locked: nothing placed ever lands inside it */
        blocks.push(B('work', 'Work', 'work', 'laptop', ws, we, a.work.fixed ? FIXED : SOFT));
        t = we;
      } else if (t + 45 <= bed - 180 && !drops.length && (!meals || meals.breakfast)) {
        blocks.push(B('breakfast', 'Breakfast', 'meals', 'fork', t, t + 45));
        t += 45;
      }
      picks.forEach((x, i) => {
        blocks.push(B(i ? 'pickup' + (i + 1) : 'pickup', 'Pick up ' + joinNames(x.who), 'family', 'car', x.at, x.at + 30, { fixed: true, daycare: true }));
        t = Math.max(t, x.at + 30);
      });
      /* dinner after work, even when work runs late and bed is close: the evening and the wind down
         take what room is left, so a late shift still has a dinner on the board */
      const dinner = Math.max(t, 18 * 60);
      if (dinner + 45 <= bed) {
        blocks.push(B('dinner', 'Dinner', 'meals', 'pot', dinner, dinner + 45, { dinner: true }));
        const eve = dinner + 45, end = Math.max(eve, bed - 30);
        if (end - eve >= 30) blocks.push(a.partner ? B('evening', 'Evening with ' + a.partner, 'us', 'heart', eve, end, SOFT) : B('evening', 'Free evening', 'yours', 'moon', eve, end, FREE));
        if (bed - end >= 15) blocks.push(B('winddown', 'Wind down', 'yours', 'bed', end, bed));
      }
      /* lunch, half an hour between noon and 1:30, clear of anything that can't move; open work makes
         room for it, a set shift doesn't (its break is its own) */
      if (meals && meals.lunch) {
        const hard = blocks.filter((b) => !b.soft);
        for (let st = 720; st <= 810; st += 15) {
          if (st < wake || st + 30 > bed - 60) continue;
          if (hard.some((b) => b.start < st + 30 && st < b.start + b.dur)) continue;
          blocks.push(B('lunch', 'Lunch', 'meals', 'fork', st, st + 30));
          break;
        }
        blocks.sort((x, y) => x.start - y.start);
      }
      days[wd] = { wake, bed, blocks };
    }
    const st = defaultState(today);
    st.rhythm = { days, shapes: {} };
    st.events = []; st.dates = {}; st.tasks = []; st.meetings = [];
    st.groups = [copy(INBOX)].concat(GROUPS.filter((g) => g.id === 'home' || g.id === 'bills').map(copy), [{ id: 'people', name: 'People', icon: 'heart' }]);
    st.ideas = st.ideas.filter((i) => !PERSONAL_IDEAS.includes(i.id));
    st.profile = { name: a.name || '', partner: a.partner || '', kids, cookbook: '' };
    const help = a.help || {};
    st.settings = Object.assign({}, st.settings, { modules: { dinners: help.dinners !== false, together: !!a.partner && help.together !== false } });
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
    if (tz) st.settings.tz = tz;
    return st;
  }

  /* A sample week anyone can look around, with nobody's real life in it: two adults and a child,
     a few to dos (one with only some of its steps given a time), dinners, a birthday, a trip, and a
     dentist appointment, all near today, so the finished week is what you see first. */
  const dayAdd = (iso, n) => { const t = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 86400000); return t.toISOString().slice(0, 10); };
  function sampleState(today) {
    today = today || '2026-09-27';
    const wd = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10))).getUTCDay();
    const ws = dayAdd(today, -wd), at = (n) => dayAdd(ws, n);
    const st = buildState({ name: 'Alex', partner: 'Sam', kids: ['Robin'], wake: { wd: 390, we: 450 }, bed: { wd: 1350, we: 1380 }, work: { days: [1, 2, 3, 4, 5], start: 540, end: 1020 }, cares: [{ kids: ['Robin'], days: [1, 2, 3, 4, 5], drop: 510, pick: 1005 }] }, today);
    st.groups.push({ id: 'work', name: 'Work', icon: 'laptop' });
    const T = (id, name, group, icon, cat, due, steps, extra) => Object.assign({ id, name, group, icon, cat, due, dur: null, repeat: null, done: false, steps: (steps || []).map((x, i) => ({ id: id + '-s' + (i + 1), name: x[0], dur: x[1], done: false })) }, extra || {});
    st.tasks = [
      T('report', 'Send the quarterly report', 'work', 'laptop', 'work', at(4), [['Pull the numbers', 45], ['Write it up', 60], ['Send it', 10]]),
      T('dentist-call', 'Book a cleaning for Robin', 'inbox', 'handset', 'family', at(3), [], { dur: 15 }),
      T('registration', 'Renew the car registration', 'home', 'car', 'home', at(6), [['Find the notice', 10], ['Pay online', 15], ['Put the sticker on', 5]]),
      T('gift', 'Birthday gift for Jordan', 'people', 'gift', 'family', at(9), [['List a few ideas', 15], ['Pick one', 10], ['Order it', 15], ['Wrap it', 15]]),
      T('garage', 'Clear out the garage', 'home', 'box', 'home', at(13), [['Sort into keep and give away', 60], ['Drop off the give away pile', 30], ['Sweep', 20]]),
      T('laundry', 'Laundry', 'home', 'shirt', 'home', at(6), [['Wash', 15], ['Dry', 10], ['Fold and put away', 30]], { repeat: 'weekly' }),
      T('bills', 'Pay the bills', 'bills', 'receipt', 'home', at(8), [['See what’s due', 15], ['Pay each one', 20]], { repeat: 'monthly' })
    ];
    st.events = [
      { id: 'jordan-bday', kind: 'marker', name: 'Jordan’s birthday', icon: 'cake', date: at(10), yearly: true },
      { id: 'dentist', kind: 'timed', name: 'Dentist', cat: 'family', icon: 'star', date: at(8), start: 15 * 60 + 30, dur: 45, big: true },
      { id: 'lake', kind: 'trip', name: 'Weekend at the lake', icon: 'plane', date: at(19), end: at(21), leave: 540, back: 1020 }
    ];
    const add = (n, a) => { const d = at(n); st.dates[d] = st.dates[d] || {}; (st.dates[d].adds = st.dates[d].adds || []).push(a); };
    add(2, { id: 'sample-run', name: 'Run', cat: 'yours', icon: 'runner', start: 450, dur: 30, src: { type: 'block', id: 'run' } });
    add(3, { id: 'sample-numbers', name: 'Pull the numbers', cat: 'work', icon: 'laptop', start: 600, dur: 45, src: { type: 'step', task: 'report', id: 'report-s1' } });
    add(3, { id: 'sample-deep', name: 'Deep work', cat: 'work', icon: 'book', start: 780, dur: 90, src: { type: 'block', id: 'deep' } });
    add(5, { id: 'sample-date', name: 'Date night at home', cat: 'us', icon: 'heart', start: 1170, dur: 90, src: { type: 'idea', id: 'date-home' } });
    add(6, { id: 'sample-walk', name: 'Walk', cat: 'yours', icon: 'shoe', start: 540, dur: 30, src: { type: 'block', id: 'walk' } });
    st.dinners[at(1)] = { name: 'Tacos', recipe: 'tacos', cook: 'me', items: ['beef', 'tortillas', 'peppers', 'onion'] };
    st.dinners[at(2)] = { name: 'Thai place on Pacific', cook: 'order', items: [] };
    st.dinners[at(3)] = { name: '', cook: 'leftovers', items: [] };
    st.dinners[at(4)] = { name: 'Sheet pan chicken', recipe: 'sheetpan', cook: 'kim', items: ['chicken', 'broccoli', 'sweetpotato'] };
    st.meetings = [{ id: 'standup', name: 'Standup', days: [1, 2, 3, 4, 5], start: 570, dur: 15 }];
    st.profile = Object.assign(st.profile, { sample: true, demo: true });
    return st;
  }

  const api = { h, CATS, CAT_ORDER, SHAPES, PANTRY_KINDS, COOKS, DINNER_HOW, ORDER_FROM, IDEA_KINDS, BREAKDOWNS, BREAKDOWN_ANY, STEPS, PRESETS, KIT_ROWS, PALETTE_IDS, VERSION, RUSSELL, INBOX, defaultState, buildState, sampleState, careList, migrate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Data = api;
})(typeof window !== 'undefined' ? window : globalThis);
