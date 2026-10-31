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
    open: { name: 'Breathing room', base: '#EFE3CA', ink: '#5A4430' },
    /* V11: friends get a rose of their own, so a coffee with a friend never reads as Family (white on it is
       5.7 to 1). It's in CAT_ORDER only in V11, which adds it (app.js, FEEL) */
    friends: { name: 'Friends', base: '#A8436F', ink: '#FFFFFF' }
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
  /* V11: the people in a week, grouped by who they are to you. A board's partner and kids keep their
     profile fields; anyone else (a second partner, family, friends, someone you're dating) is in
     profile.people as { id, name, group }. cat is the color their ideas take on the board; pick is
     the word for one of them when you add someone. */
  const PEOPLE_GROUPS = [
    { id: 'partner', name: 'Partner', many: 'Partners', pick: 'Partner', cat: 'us', icon: 'heart' },
    { id: 'kids', name: 'Kids', many: 'Kids', pick: 'Kid', cat: 'family', icon: 'person' },
    { id: 'family', name: 'Family', many: 'Family', pick: 'Family', cat: 'family', icon: 'house' },
    { id: 'friends', name: 'Friends', many: 'Friends', pick: 'Friend', cat: 'friends', icon: 'chat' },
    /* V11: the group is called what it is, Seeing someone, everywhere (its id stays dating) */
    { id: 'dating', name: 'Seeing someone', many: 'Seeing someone', pick: 'Seeing someone', cat: 'us', icon: 'cup' }
  ];
  /* V11: ideas for each group that come with the app. They aren't kept on the board: an idea you make
     is (state.ideas, with for set to its group), and an idea without for is a partner's, as before.
     when: the part of the day it looks for first (morning, day, afternoon, evening, late).
     meal: an idea that is a dinner sets that night's dinner instead of adding a second one; its value is
     how the dinner happens (out, home), or '' when that's still open. */
  const PEOPLE_IDEAS = [
    ['p-evening', 'An evening together', 'partner', 120, 'heart', 'date', 'evening'],
    ['k-games', 'A board game', 'kids', 45, 'tiles', '', 'afternoon'], ['k-fort', 'Build a fort', 'kids', 60, 'house', '', 'afternoon'], ['k-bake', 'Bake something', 'kids', 60, 'pot', '', 'afternoon'],
    ['k-park', 'The park', 'kids', 60, 'sun', '', 'day'], ['k-read', 'Read together', 'kids', 30, 'book', '', 'evening'], ['k-art', 'Draw or paint', 'kids', 45, 'brush', '', 'afternoon'],
    ['k-walk', 'A walk or a bike ride', 'kids', 45, 'shoe', '', 'day'], ['k-movie', 'Movie night', 'kids', 120, 'film', '', 'evening'],
    ['f-call', 'Call home', 'family', 30, 'handset', '', 'afternoon'], ['f-dinner', 'Dinner together', 'family', 90, 'fork', '', 'evening', ''], ['f-visit', 'A visit', 'family', 120, 'house', '', 'day'],
    ['f-video', 'A video call', 'family', 30, 'phone', '', 'afternoon'], ['f-photos', 'Look through old photos', 'family', 45, 'book', '', 'afternoon'], ['f-walk', 'A walk together', 'family', 45, 'shoe', '', 'day'],
    ['fr-coffee', 'Coffee', 'friends', 60, 'cup', '', 'morning'], ['fr-games', 'Game night', 'friends', 120, 'tiles', '', 'evening'], ['fr-walk', 'A walk and a talk', 'friends', 45, 'shoe', '', 'day'],
    ['fr-dinner', 'Dinner out', 'friends', 90, 'fork', '', 'evening', 'out'], ['fr-call', 'Catch up on the phone', 'friends', 30, 'handset', '', 'afternoon'], ['fr-movie', 'A movie', 'friends', 120, 'film', '', 'evening'],
    ['d-coffee', 'Coffee', 'dating', 45, 'cup', '', 'morning'], ['d-walk', 'A walk somewhere new', 'dating', 60, 'shoe', '', 'day'], ['d-dinner', 'Dinner out', 'dating', 90, 'fork', '', 'evening', 'out'],
    ['d-show', 'A show or a movie', 'dating', 120, 'film', '', 'evening'], ['d-cook', 'Cook together', 'dating', 90, 'pot', '', 'evening', 'home'], ['d-call', 'A long call', 'dating', 45, 'handset', '', 'evening']
  ].map(([id, name, group, dur, icon, kind, when, meal]) => Object.assign({ id, name, for: group, dur, icon, kind: kind || '', when: when || '', builtin: true }, meal != null ? { meal } : {}));

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
    { name: 'Keep in touch', ids: ['call-loved', 'coffee-friend', 'texts', 'call'] },
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
    { id: 'people', name: 'Keep in touch', icon: 'people', line: 'Coffee with a friend, a call, and texts back', items: [{ p: 'coffee-friend', dur: 60, when: 'morning' }, { p: 'call-loved', dur: 30, when: 'afternoon' }, { p: 'texts', dur: 15, when: 'evening' }] },
    { id: 'focus', name: 'Focus', icon: 'book', line: 'Two deep work blocks inside Work', items: [{ p: 'deep', dur: 120, when: 'morning', work: true }, { p: 'deep', dur: 90, when: 'afternoon', work: true }, { p: 'walk', dur: 30, when: 'afternoon' }] },
    { id: 'empty', name: 'Blank slate', icon: 'broom', line: 'Only locked blocks stay', empty: true },
    { id: 'easy', name: 'Take it easy', icon: 'leaf', line: 'Locked blocks and meals stay. To dos wait for another day', easy: true }
  ];

  /* == Break it down ==
     Ways to break a to-do into small steps (Model.breakdown), matched by the words in its name: the
     longest phrase that matches wins, so 'clean the kitchen' beats 'clean'. A word that starts with ~ is
     weak: a bare noun (kitchen) that counts when no verb is named, or when the verb is the entry's own
     (verb: 'clean' for housework), so "Organize the kitchen" goes to the rules instead of to cleaning.
     area: home is housework, which spreads 15 minutes a day by default. Steps are the medium size. A step
     can carry sub, its finer version for Smaller steps, and whole, for a step that can't be cut (an
     appointment, a drive, the time something bakes). Minutes are multiples of 5, and the first step is
     10 minutes or less, so there's always a way to start (tests/breakdown.test.mjs). {partner} and {kid}
     are the board's people; the app leaves a step out where there's nobody for it. */
  const St = (name, dur, sub) => (sub ? { name, dur, sub: sub.map(([n, d, w]) => (w ? { name: n, dur: d, whole: true } : { name: n, dur: d })) } : { name, dur });
  const Wh = (name, dur) => ({ name, dur, whole: true });
  const BD = (id, area, words, steps, verb) => Object.assign({ id, area, words, steps }, verb ? { verb } : {});
  const BREAKDOWNS = [
    /* housework */
    BD('bedroom', 'home', ['clean my room', 'clean the bedroom', 'clean my bedroom', 'clean your room', 'clean up my room', 'tidy my room', 'tidy the bedroom', '~my room', '~bedroom'],
      [St('Pick up the floor', 10, [['Pick up the clothes', 5], ['Pick up everything else', 5]]), St('Put away laundry', 15, [['Hang what hangs', 5], ['Fold the rest into drawers', 10]]), St('Make the bed', 5), St('Clear the desk', 15, [['Clear the papers', 10], ['Wipe it down', 5]]), St('Dust', 10), St('Vacuum', 15, [['Vacuum the floor', 10], ['Vacuum under the bed', 5]])], 'clean'),
    BD('kids-room', 'home', ['clean the kids room', 'clean the playroom', 'pick up toys', 'pick up the toys', 'put away toys', 'put away the toys', '~kids room', '~kid room', '~playroom', '~toys'],
      [St('Set a timer and pick up toys together', 10), St('Sort toys into their bins', 15), St('Put away clean clothes', 10), St('Make the bed', 5), St('Clear under the bed', 10), St('Vacuum', 10)], 'clean'),
    BD('kitchen', 'home', ['clean the kitchen', 'clean kitchen', 'clean up the kitchen', 'wipe the counters', '~kitchen'],
      [St('Load or start the dishes', 10), St('Clear and wipe the counters', 15, [['Clear the counters', 10], ['Wipe them down', 5]]), St('Wipe the stove and the sink', 10), St('Wipe the fronts of the fridge and cabinets', 10), St('Sweep and mop the floor', 20, [['Sweep', 10], ['Mop', 10]]), St('Take out the trash and recycling', 5)], 'clean'),
    BD('bathroom', 'home', ['clean the bathroom', 'clean the bathrooms', 'clean bathroom', 'clean the toilet', 'clean the shower', 'scrub the tub', 'clean the tub', '~bathroom', '~bathrooms'],
      [St('Clear the counter', 5), St('Spray the tub, sink, and toilet and let it sit', 5), St('Scrub the toilet', 10), St('Scrub the tub or shower', 15), St('Wipe the sink, counter, and mirror', 10), St('Swap the towels and empty the trash', 5), St('Sweep and mop the floor', 10)], 'clean'),
    BD('living-room', 'home', ['clean the living room', 'tidy the living room', 'clean the family room', '~living room', '~family room', '~den'],
      [St('Pick up anything that doesn’t belong', 10), St('Fold the blankets and fluff the pillows', 5), St('Clear the coffee table', 5), St('Dust the surfaces and the TV stand', 10), St('Vacuum the floor and the couch', 15)], 'clean'),
    BD('house', 'home', ['clean the house', 'clean house', 'clean the apartment', 'clean the home', 'clean up the house', 'clean the whole house', 'clean the place', 'house cleaning', 'housework', 'chores'],
      [St('Do a quick lap with a trash bag', 10), St('Kitchen', 30, [['Dishes', 10], ['Counters and stove', 10], ['Kitchen floor', 10]]), St('Bathroom', 30, [['Toilet', 10], ['Sink and mirror', 10], ['Tub or shower', 10]]), St('Living room', 20), St('Bedrooms', 20), St('Vacuum or mop the floors', 30, [['Vacuum', 15], ['Mop', 15]]), St('Take out the trash', 5)]),
    BD('deep-clean', 'home', ['deep clean', 'deep cleaning', 'spring clean', 'spring cleaning'],
      [St('Pick the room to start with', 5), St('Wipe the baseboards and door frames', 30, [['Do the first half of the rooms', 15], ['Do the rest', 15]]), St('Clean inside the fridge and microwave', 30, [['Fridge', 20], ['Microwave', 10]]), St('Clean the oven', 30, [['Spray it and let it sit', 5], ['Scrub and wipe it out', 25]]), St('Wash the windows', 30, [['Inside', 15], ['Outside', 15]]), St('Wash the shower curtain and bath mats', 15), St('Vacuum under the furniture', 20), St('Mop every floor', 30, [['Kitchen and bathroom', 15], ['The rest', 15]])]),
    BD('tidy', 'home', ['quick tidy', 'tidy the house', 'tidy the apartment', 'straighten up', 'reset the house', 'pick up the house', '~tidy up', '~tidy', '~clean up'],
      [St('Put the dishes in the sink', 5), St('Put things back in their rooms', 15), St('Clear the counters and the table', 10), St('Fold the blankets and fluff the couch', 5)], 'clean'),
    BD('laundry', 'home', ['laundry', 'do the laundry', 'wash clothes', 'wash the clothes', 'do the wash', 'load of laundry'],
      [St('Gather the dirty clothes', 5), St('Start a load', 5), St('Move it to the dryer', 5), St('Fold', 15, [['Fold the shirts and pants', 10], ['Match the socks', 5]]), St('Put it away', 10)]),
    BD('fold', 'home', ['fold laundry', 'fold the laundry', 'fold clothes', 'put away laundry', 'put away the laundry', 'put away clothes', 'laundry pile'],
      [St('Dump the basket on the bed', 5), St('Fold the shirts and pants', 15), St('Match the socks', 5), St('Put it all away', 10)]),
    BD('dishes', 'home', ['dishes', 'do the dishes', 'wash the dishes', 'dishwasher', 'unload the dishwasher', 'load the dishwasher'],
      [St('Clear the table and the counter', 5), St('Empty the dishwasher', 5), St('Load what fits', 10), St('Hand wash the rest', 15), St('Wipe the sink', 5)]),
    BD('declutter', 'home', ['declutter', 'decluttering', 'clear out', 'purge', 'get rid of', 'donate', 'give away', 'sort through', 'donation'],
      [St('Grab three bags for keep, give away, and trash', 5), St('Sort one shelf or drawer', 15), St('Sort the next one', 15), St('Bag the give away pile', 10), St('Drop it off', 30, [['Put the bags in the car', 5], ['Drop them off', 25, true]])]),
    BD('closet', 'home', ['closet', 'wardrobe', 'dresser', 'organize clothes', 'clean out the closet', 'organize the closet'],
      [St('Pull out what you haven’t worn this year', 10), St('Try on anything you’re not sure about', 15), St('Bag the give away pile', 10), St('Fold and hang what stays', 20), Wh('Drop off the give away bag', 20)]),
    BD('garage', 'home', ['garage', 'clean the garage', 'clear out the garage', 'organize the garage'],
      [St('Open the door and pick one corner', 5), St('Sort into keep, give away, and trash', 60, [['Sort the first corner', 20], ['Sort the next corner', 20], ['Sort the rest', 20]]), St('Take out the trash', 15), St('Drop off the give away pile', 30, [['Load the car', 10], ['Drop it off', 20, true]]), St('Sweep', 20), St('Put the keep pile on shelves', 20)]),
    BD('fridge', 'home', ['fridge', 'refrigerator', 'clean out the fridge', 'clean the fridge'],
      [St('Toss anything expired', 10), St('Take out the shelves and drawers', 5), St('Wipe them and the inside', 15), St('Put the food back, oldest in front', 10)]),
    BD('sheets', 'home', ['sheets', 'change the sheets', 'bedding', 'wash the sheets', 'make the beds', 'bed sheets'],
      [St('Strip the bed', 5), St('Start the wash', 5), St('Move it to the dryer', 5), St('Put the clean sheets on', 10)]),
    BD('floors', 'home', ['vacuum', 'vacuuming', 'mop', 'mopping', 'floors', 'sweep the floor', 'sweep the floors'],
      [St('Pick up things on the floor', 10), St('Vacuum the rugs', 15), St('Sweep the hard floors', 10), St('Mop the kitchen and bathroom', 15), St('Empty the vacuum', 5)]),
    BD('dust', 'home', ['dust', 'dusting'],
      [St('Grab a cloth', 5), St('Dust the shelves', 10), St('Dust the surfaces and lamps', 10), St('Dust the ceiling fans', 10)]),
    BD('windows', 'home', ['windows', 'wash the windows', 'clean the windows'],
      [St('Get the cleaner and cloths', 5), St('Wash the inside windows', 20), St('Wash the outside windows', 25, [['Front of the house', 10], ['Back of the house', 15]]), St('Wipe the sills and tracks', 10)]),
    BD('trash', 'home', ['trash', 'garbage', 'recycling', 'take out the trash', 'bins'],
      [St('Gather the trash from each room', 5), St('Tie up the bags', 5), St('Take them out', 5), St('Rinse and sort the recycling', 10)]),
    BD('office', 'home', ['clear the desk', 'clean the desk', 'home office', 'workspace', '~desk', '~office'],
      [St('Clear the desk into one pile', 10), St('Sort the pile into do, file, and toss', 20), St('File what stays', 15), St('Wipe the desk and the screen', 5), St('Tidy the cables', 10)], 'clean'),
    BD('basement', 'home', ['basement', 'attic', 'storage room', 'storage unit', 'crawl space'],
      [St('Pick one shelf or box to start', 5), St('Sort into keep, give away, and trash', 45, [['Sort the first boxes', 15], ['Sort the next boxes', 15], ['Sort the rest', 15]]), St('Label the boxes you keep', 15), St('Take out the trash', 10), St('Drop off the give away pile', 30, [['Load the car', 10], ['Drop it off', 20, true]])]),
    BD('pantry', 'home', ['pantry', 'organize the pantry', 'kitchen cabinets', 'cabinets', 'spice rack'],
      [St('Take everything off one shelf', 10), St('Toss what’s expired', 10), St('Group like things together', 15), St('Put it back, oldest in front', 15), St('Write down what’s running low', 5)]),
    BD('ironing', 'home', ['ironing', 'iron shirts', 'iron the shirts'],
      [St('Set up the board and heat the iron', 5), St('Iron the shirts', 20), St('Iron the rest', 15), St('Hang it all up', 5)]),
    BD('furniture', 'home', ['assemble', 'furniture', 'ikea', 'bookshelf', 'build the', 'put together the'],
      [St('Unbox it and check the parts', 10), St('Read the instructions', 10), St('Put it together', 45, [['Do the first steps', 15], ['Do the middle steps', 15], ['Do the last steps', 15]]), St('Clean up the box and packing', 10)]),
    BD('hang', 'home', ['hang pictures', 'hang a picture', 'hang the pictures', 'hang art', 'hang the tv', 'mount the tv', 'hang curtains', 'hang shelves'],
      [St('Pick the spots and mark them', 10), St('Find the studs and the right hardware', 10), St('Hang them', 20), St('Check they’re level', 5)]),
    BD('paint', 'home', ['paint the', 'paint a room', 'paint my room', 'painting the', 'repaint'],
      [St('Pick the color and get samples', 10), St('Buy paint and supplies', 45, [['Make the list', 10], ['Buy it', 35, true]]), St('Move furniture and tape the edges', 30, [['Move furniture', 15], ['Tape the edges', 15]]), St('Paint the first coat', 60, [['Cut in the edges', 20], ['Roll the walls', 30], ['Clean the brushes', 10]]), St('Paint the second coat', 60, [['Cut in the edges', 20], ['Roll the walls', 30], ['Clean the brushes', 10]]), St('Clean up and put things back', 30, [['Pull the tape', 10], ['Put things back', 20]])]),
    BD('smoke-alarm', 'home', ['smoke alarm', 'smoke alarms', 'smoke detector', 'smoke detectors', 'detector batteries'],
      [St('Get new batteries', 5), St('Test each alarm', 10), St('Swap the batteries', 15)]),
    BD('repair-person', 'home', ['plumber', 'electrician', 'handyman', 'contractor', 'repair person', 'hvac', 'furnace'],
      [St('Write down what’s wrong, with photos', 10), St('Get two or three quotes', 30, [['Ask for the first quote', 15], ['Ask for the others', 15]]), St('Book one', 10), Wh('Be home for the visit', 60)]),

    /* errands */
    BD('groceries', 'errand', ['groceries', 'grocery', 'grocery shopping', 'food shopping', 'shopping list', 'grocery store', 'supermarket'],
      [St('Check the fridge and pantry', 10), St('Write the list from this week’s meals', 10), St('Shop', 45, [['Get there', 10, true], ['Shop the list', 30, true], ['Check out and load up', 5]]), St('Put it all away', 15)]),
    BD('returns', 'errand', ['return', 'returns', 'send back', 'exchange', 'refund'],
      [St('Find the receipt or the order', 10), St('Start the return online or print the label', 10), St('Pack it up', 10), Wh('Drop it off', 20)]),
    BD('post-office', 'errand', ['post office', 'mail a package', 'ship a package', 'shipping', 'package'],
      [St('Box it and seal it', 10), St('Print or write the label', 10), Wh('Drop it off', 20)]),
    BD('pharmacy', 'errand', ['pharmacy', 'prescription', 'prescriptions', 'refill', 'meds', 'medicine'],
      [St('Check how much is left', 5), St('Ask for the refill', 10), Wh('Pick it up', 20)]),
    BD('library', 'errand', ['library', 'library books', 'library book', 'return the books'],
      [St('Find all the library books', 10), St('Renew or return them', 20), St('Pick out new ones', 20)]),
    BD('dry-cleaning', 'errand', ['dry cleaning', 'dry cleaner', 'dry cleaners', 'tailor', 'alterations'],
      [St('Gather what needs to go', 5), Wh('Drop it off', 15), Wh('Pick it up', 15)]),
    BD('errands', 'errand', ['errands', 'errand', 'run errands'],
      [St('List every stop', 5), St('Put the stops in order', 5), St('Do the first stops', 30, [['First stop', 15, true], ['Second stop', 15, true]]), St('Do the rest', 30, [['Next stop', 15, true], ['Last stop', 15, true]]), St('Put everything away', 10)]),
    BD('hardware-store', 'errand', ['hardware store'],
      [St('List what you need and measure', 10), St('Get it', 45, [['Get there', 15, true], ['Find everything', 30, true]]), St('Put it away or use it', 15)]),
    BD('bank', 'errand', ['bank', 'deposit a check', 'deposit the check', 'cash a check', 'atm'],
      [St('Gather the check or what you need', 5), St('Go to the bank or use the app', 15), St('Note it in your budget', 5)]),
    BD('dmv', 'errand', ['dmv', 'driver license', 'drivers license', 'renew my license', 'license renewal', 'renew license', 'renew the license', 'real id', 'id card'],
      [St('Check what to bring', 10), St('Book an appointment or renew online', 15), St('Gather the documents', 15), Wh('Go to the appointment', 60), St('Put the new card in your wallet', 5)]),
    BD('haircut', 'errand', ['haircut', 'hair cut', 'barber', 'hair appointment', 'salon'],
      [St('Book a time', 5), Wh('Get there', 15), Wh('Get your hair cut', 45)]),
    BD('babysitter', 'errand', ['babysitter', 'sitter', 'childcare', 'nanny', 'line up a sitter'],
      [St('Pick the dates and times', 5), St('Ask a few sitters', 15), St('Confirm one', 5), St('Write notes for them', 15)]),
    BD('vet', 'errand', ['vet', 'vet appointment', 'dog to the vet', 'cat to the vet', 'shots for the dog'],
      [St('Call the vet and book a time', 10), St('Gather their records and meds', 5), Wh('Go to the visit', 60), St('Note what’s next', 5)]),

    /* money and admin */
    BD('bills', 'money', ['bill', 'bills', 'pay the bills', 'pay bills', 'pay rent', 'utilities'],
      [St('See what’s due', 10), St('Pay each one', 20), St('Note anything that changed', 5)]),
    BD('taxes', 'money', ['tax', 'taxes', 'tax return', 'file taxes', 'do taxes', 'do the taxes', 'tax forms'],
      [St('Make a folder for this year’s papers', 5), St('Gather your tax forms and receipts', 30, [['List what you’re waiting on', 10], ['Download or find each one', 20]]), St('Enter it in the tax software or send it to your preparer', 60, [['Enter your income', 20], ['Enter deductions', 20], ['Enter credits and the rest', 20]]), St('Check it over', 20), St('File it and save a copy', 10)]),
    BD('budget', 'money', ['budget', 'budgeting', 'finances', 'money plan', 'spending'],
      [St('Pull up last month’s spending', 10), St('Sort it into a few groups', 20), St('Set amounts for next month', 15), St('Pick one thing to change', 5)]),
    BD('claim', 'money', ['insurance claim', 'file a claim', 'claim'],
      [St('Find the policy number', 5), St('Write down what happened, with dates', 15), St('Take photos or gather receipts', 15), St('Start the claim online or by phone', 20), St('Note the claim number and the next step', 5)]),
    BD('insurance', 'money', ['insurance', 'compare insurance', 'shop for insurance', 'renew insurance', 'insurance renewal', 'open enrollment', 'health insurance', 'car insurance'],
      [St('Find your current policy and what it costs', 10), St('Get two or three quotes', 30, [['Get the first quote', 15], ['Get the others', 15]]), St('Compare what each covers', 15), St('Switch or renew', 15)]),
    BD('subscriptions', 'money', ['subscriptions', 'subscription', 'cancel subscription', 'cancel subscriptions', 'streaming'],
      [St('List what you pay for each month', 10), St('Mark what you don’t use', 5), St('Cancel those', 15), St('Note what you’ll save', 5)]),
    BD('paperwork', 'money', ['paperwork', 'file papers', 'filing', 'mail pile', 'sort the mail', 'shred', 'shredding', 'papers'],
      [St('Gather the papers in one pile', 5), St('Sort into do, file, and shred', 15), St('Do the quick ones', 15), St('File the rest', 10), St('Shred what you don’t need', 10)]),
    BD('form', 'money', ['application form', 'permission slip', 'fill out the form', 'fill out', '~form', '~forms'],
      [St('Find the form and read what it needs', 10), St('Gather the information', 15), St('Fill it out', 20), St('Check it and send it', 10)]),
    BD('savings', 'money', ['retirement', '401k', 'ira', 'savings', 'save money', 'investments', 'emergency fund'],
      [St('Look up your balances', 10), St('Check how much goes in each month', 10), St('Decide if that should change', 15), St('Make the change', 10)]),
    BD('will', 'money', ['make a will', 'write a will', 'estate plan', 'estate planning', 'power of attorney', 'living will'],
      [St('Write down who depends on you', 10), St('List what you own and who it goes to', 20), St('Pick a guardian and an executor', 15), St('Make the will online or with a lawyer', 60, [['Start it', 20], ['Fill in the rest', 20], ['Read it over', 20]]), St('Sign it and store it safely', 20)]),
    BD('medical-bills', 'money', ['medical bill', 'medical bills', 'hospital bill', 'eob', 'billing error'],
      [St('Gather the bill and the insurance statement', 10), St('Check they match', 15), Wh('Call about anything that’s off', 20), St('Pay it or set up a plan', 10)]),
    BD('credit', 'money', ['credit report', 'credit score', 'freeze my credit', 'credit freeze'],
      [St('Get your free reports', 10), St('Read them for anything wrong', 20), St('Dispute what’s wrong', 20), St('Freeze your credit if you want to', 10)]),

    /* school and study */
    BD('homework', 'school', ['homework', 'assignment', 'problem set', 'worksheet', 'worksheets'],
      [St('Read the instructions', 5), St('Do the first half', 20), St('Do the rest', 20), St('Check your answers', 10), St('Put it in the bag', 5)]),
    BD('essay', 'school', ['essay', 'term paper', 'research paper', 'write a paper', 'paper on', 'paper for'],
      [St('Write the question in your own words', 5), St('Find sources and take notes', 45, [['Find sources', 15], ['Take notes', 15], ['Take more notes', 15]]), St('Make an outline', 15), St('Write the draft', 60, [['Write the opening', 20], ['Write the middle', 20], ['Write the ending', 20]]), St('Revise it', 20), St('Check the citations and turn it in', 15)]),
    BD('study', 'school', ['study for', 'study guide', 'quiz', 'midterm', 'midterms', 'final exam', 'finals', '~test', '~exam'],
      [St('Gather your notes and the study guide', 5), St('List the topics', 10), St('Review the first topics', 30, [['Review the first topic', 15], ['Review the second topic', 15]]), St('Review the rest', 30, [['Review the next topic', 15], ['Review the last topic', 15]]), St('Do practice questions', 25, [['Do a few practice questions', 15], ['Do a few more', 10]]), St('Go over what you missed', 15)], 'study'),
    BD('book-report', 'school', ['book report', 'book review'],
      [St('Jot what the book was about', 10), St('Pick the main points', 15), St('Write the draft', 30, [['Write the first half', 15], ['Write the second half', 15]]), St('Read it over and fix it', 15), St('Turn it in', 5)]),
    BD('presentation', 'work', ['presentation', 'slides', 'slide deck', 'speech', 'keynote'],
      [St('Write the one thing they should remember', 10), St('Outline the main points', 15), St('Make the slides', 60, [['Make the first slides', 20], ['Make the middle slides', 20], ['Make the last slides', 20]]), St('Practice it out loud', 30, [['First run through', 15], ['Second run through', 15]]), St('Fix what felt off', 15)]),
    BD('group-project', 'school', ['group project'],
      [St('List what everyone is doing', 10), St('Do your part', 60, [['Start your part', 20], ['Keep going', 20], ['Finish your part', 20]]), St('Share it with the group', 10), St('Put it together', 20)]),
    BD('college-apps', 'school', ['college application', 'college applications', 'apply to college', 'personal statement', 'common app'],
      [St('List the schools and their deadlines', 10), St('Ask for recommendation letters', 15), St('Write the essay', 90, [['Brainstorm', 15], ['Outline', 15], ['Draft the first half', 20], ['Draft the second half', 20], ['Revise', 20]]), St('Fill out each application', 60, [['Fill out the first one', 20], ['Fill out the next one', 20], ['Fill out the rest', 20]]), St('Send test scores and transcripts', 15), St('Submit and save the confirmation', 10)]),
    BD('financial-aid', 'school', ['fafsa', 'financial aid', 'scholarship', 'scholarships', 'student aid'],
      [St('Make an account and find the deadline', 10), St('Gather tax info and IDs', 20), St('Fill out the form', 45, [['Fill out the first part', 15], ['Fill out the middle part', 15], ['Fill out the last part', 15]]), St('Submit and save the confirmation', 5)]),
    BD('school-supplies', 'school', ['school supplies', 'back to school', 'supply list'],
      [St('Find the supply list', 5), St('Check what you already have', 15), St('Buy the rest', 45, [['Get there', 15, true], ['Shop the list', 30, true]]), St('Label everything', 15)]),
    BD('course', 'school', ['online course', 'course', 'lesson', 'module', 'tutorial', 'webinar'],
      [St('Open the course and find the next lesson', 5), St('Watch the lesson', 25), St('Take notes on the key points', 10), St('Do the exercise', 20)]),
    BD('teacher', 'school', ['parent teacher', 'teacher conference', 'teacher meeting', 'school conference'],
      [St('Write down your questions', 10), St('Look at recent grades and work', 15), Wh('Go to the meeting', 30), St('Note what to follow up on', 5)]),

    /* work */
    BD('report', 'work', ['report', 'quarterly report', 'monthly report', 'status report', 'write the report', 'write up'],
      [St('Write the three things it must say', 10), St('Pull the numbers', 45, [['Pull the first numbers', 15], ['Pull the rest', 15], ['Check them', 15]]), St('Write the draft', 60, [['Write the opening', 20], ['Write the middle', 20], ['Write the ending', 20]]), St('Make the charts', 20), St('Read it over and fix it', 20), St('Send it', 10)]),
    BD('email', 'work', ['emails', 'inbox', 'email backlog', 'inbox zero', 'catch up on email', 'answer emails', 'reply to emails', 'clear my inbox'],
      [St('Archive anything you don’t need', 10), St('Reply to the quick ones', 20), St('Flag the ones that need time', 10), St('Answer the first flagged one', 15), St('Answer the next one', 15)]),
    BD('job-application', 'work', ['job application', 'job applications', 'apply for a job', 'apply for the job', 'apply for', 'apply to', 'job search', 'cover letter'],
      [St('Read the posting and note what they want', 10), St('Update your resume for it', 30, [['Add what fits this job', 15], ['Cut what doesn’t', 15]]), St('Write the cover letter', 30, [['Draft it', 15], ['Polish it', 15]]), St('Fill out the application', 20), St('Submit it and note the date', 5)]),
    BD('resume', 'work', ['resume', 'update my resume', 'update the resume', 'cv', 'linkedin'],
      [St('Open your resume and list what’s new', 10), St('Add your latest role and wins', 20), St('Cut what’s old', 10), St('Fix the formatting', 15), St('Ask someone to read it', 5)]),
    BD('interview', 'work', ['interview', 'job interview', 'interview prep', 'prep for the interview'],
      [St('Read the job posting again', 10), St('Research the company', 20), St('Write three stories that show your skills', 30, [['Write the first story', 10], ['Write the second story', 10], ['Write the third story', 10]]), St('Practice answers out loud', 20), St('Pick your clothes and plan the trip', 10)]),
    BD('meeting', 'work', ['prep for the meeting', 'meeting prep', 'agenda', 'one on one', '1 on 1', '~meeting'],
      [St('Write the goal of the meeting', 5), St('Write the agenda', 10), St('Gather what people need to read', 15), St('Send it out', 5)]),
    BD('review', 'work', ['performance review', 'self review', 'self assessment', 'self evaluation', 'annual review'],
      [St('Open last year’s goals', 5), St('List what you did this year', 20), St('Pick your three biggest wins', 10), St('Write the review', 30, [['Draft it', 15], ['Polish it', 15]]), St('Send it', 5)]),
    BD('project-plan', 'work', ['project plan', 'kickoff', 'proposal', 'plan the project', 'roadmap'],
      [St('Write what done looks like', 10), St('List the pieces', 15), St('Put dates on each', 15), St('Share it', 10)]),
    BD('expenses', 'work', ['expense report', 'expenses', 'reimbursement', 'receipts'],
      [St('Gather the receipts', 10), St('Enter each one', 20), St('Attach the photos', 10), St('Submit it', 5)]),
    BD('invoices', 'work', ['invoice', 'invoices', 'bill clients', 'billing'],
      [St('List the hours or work to bill', 10), St('Make the invoices', 20), St('Send them', 5), St('Note when they’re due', 5)]),
    BD('out-of-office', 'work', ['out of office', 'pto', 'time off', 'vacation days', 'leave request'],
      [St('Ask for the days off', 10), St('Move recurring meetings', 15), St('Hand off anything urgent', 15), St('Set an away message', 5)]),

    /* travel and packing */
    BD('pack', 'travel', ['packing', 'pack for', 'pack a bag', 'pack the bags', 'suitcase', 'pack for the trip', '~trip', '~travel', '~flight'],
      [St('Check the weather and make a list', 10), St('Pack {kid}’s bag', 30, [['Pack clothes for each day', 15], ['Pack toys and books for the trip', 15]]), St('Lay out your clothes for each day', 15), St('Pack toiletries and meds', 10), St('Pack it all', 15), St('Charge everything', 5)], 'pack'),
    BD('baby-trip', 'travel', ['pack for the baby', 'travel with the baby', 'trip with the baby', 'diaper bag', 'pack the baby', 'baby bag', 'travel with a baby', 'flying with a baby', 'fly with the baby'],
      [St('Make a list of diapers, wipes, food, and sleep things', 10), St('Pack the diaper bag for the ride', 15), St('Pack {kid}’s clothes and a few extra', 20), St('Pack the bottles, formula, or food', 15), St('Pack the travel crib or car seat', 15), St('Pack your bag', 20), St('Charge everything and load the car', 10)]),
    BD('kids-trip', 'travel', ['pack for the kids', 'pack the kids', 'kids bags', 'family trip', 'trip with the kids', 'travel with the kids', 'road trip with the kids'],
      [St('Make a list for each person', 10), St('Pack {kid}’s bag', 30, [['Pack clothes for each day', 15], ['Pack toys and books for the ride', 15]]), St('Pack your bag', 20), St('Pack snacks and things for the ride', 10), St('Charge everything', 5)]),
    BD('trip-plan', 'travel', ['plan a trip', 'plan the trip', 'plan our trip', 'book a trip', 'vacation', 'getaway', 'road trip'],
      [St('Pick the dates', 10), St('Look at places to stay', 20), St('Book the stay', 15), St('Book travel', 20), St('Make a loose plan for each day', 20), St('Tell anyone who needs to know', 5)]),
    BD('flights', 'travel', ['flights', 'book a flight', 'book flights', 'book the flight', 'plane tickets', 'airfare'],
      [St('Pick dates and times that work', 10), St('Compare prices', 20), St('Book it', 15), St('Add it to the calendar and share it', 5)]),
    /* (Look ahead's Book travel for a date: getting there, and a place to stay) */
    BD('book-travel', 'travel', ['book travel', 'travel for', 'book the travel', 'book train tickets', 'book the train'],
      [St('Pick the dates and times', 10), St('Compare a few ways to get there', 20, [['Look at the options', 10], ['Compare the prices', 10]]), St('Book it', 15), St('Book a place to stay if you need one', 20, [['Look at a few places', 10], ['Book one', 10]]), St('Add it to the calendar and share it', 5)]),
    BD('hotel', 'travel', ['hotel', 'airbnb', 'place to stay', 'lodging', 'book a hotel'],
      [St('Set a budget and an area', 5), St('Compare a few places', 20), St('Book it', 10), St('Save the confirmation', 5)]),
    BD('passport', 'travel', ['passport', 'renew passport', 'passport renewal', 'visa application'],
      [St('Check the expiration date and what you need', 10), Wh('Get a photo taken', 20), St('Fill out the form', 20), St('Mail it or book an appointment', 15), St('Mark when it should arrive', 5)]),
    BD('pet-sitter', 'travel', ['pet sitter', 'house sitter', 'dog sitter', 'cat sitter', 'kennel', 'boarding'],
      [St('Ask who’s free', 10), St('Book them', 10), St('Write the instructions', 15), St('Leave keys and supplies', 10)]),
    BD('unpack', 'travel', ['unpack', 'unpacking', 'after the trip'],
      [St('Empty the bags in one spot', 10), St('Start the laundry', 5), St('Put things away', 20), St('Put the bags away', 5)]),
    BD('camping', 'travel', ['camping', 'camping trip', 'campsite', 'go camping'],
      [St('Check the reservation and the weather', 10), St('Pull out the gear and check it', 30, [['Check the tent and sleeping bags', 15], ['Check the stove and lights', 15]]), St('Plan the meals and shop', 45, [['Plan the meals', 15], ['Shop', 30, true]]), St('Pack the car', 30, [['Load the big things', 15], ['Load the rest', 15]])]),
    BD('leave-home', 'travel', ['before the trip', 'before we leave', 'get the house ready', 'house ready'],
      [St('Take out the trash', 5), St('Empty the fridge of what will spoil', 10), St('Water the plants', 5), St('Set the thermostat and lock up', 5)]),

    /* events and gifts */
    BD('birthday', 'event', ['birthday', 'bday', 'birthday gift', 'birthday present'],
      [St('Jot a few gift ideas', 10), St('Pick a card or gift', 15), St('Order it or buy it', 15), St('Write a note', 10), St('Set a reminder to call on the day', 5)]),
    BD('party', 'event', ['birthday party', 'party', 'kids party', 'host a party', 'throw a party', 'party for', 'housewarming', 'get together', 'cookout', 'bbq'],
      [St('Pick a date and a few people', 10), St('Send the invites', 15), St('Plan the food and the cake', 20), St('Shop for supplies', 45, [['Make the list', 10], ['Shop', 35, true]]), St('Decorate and set up', 45, [['Clean the main room', 15], ['Decorate', 15], ['Set out the food and drinks', 15]]), St('Clean up after', 30, [['Do the trash and dishes', 15], ['Do the rest', 15]])]),
    BD('holiday-dinner', 'event', ['thanksgiving', 'host thanksgiving', 'holiday dinner', 'friendsgiving', 'christmas dinner', 'easter dinner'],
      [St('Decide who’s coming', 10), St('Plan the menu and who brings what', 20), St('Order or buy the turkey', 15), St('Shop for the rest', 60, [['Make the list', 15], ['Shop', 45, true]]), St('Clean and set the table', 45, [['Clean the main rooms', 30], ['Set the table', 15]]), St('Make the dishes that keep', 60, [['Make the first one', 20], ['Make the next one', 20], ['Make the last one', 20]])]),
    BD('decorations', 'event', ['decor', 'decorations', 'christmas decorations', 'holiday decorations', 'decorate', 'christmas tree', '~tree'],
      [St('Ask {partner} what to put up this year', 10), St('Bring the boxes down', 30, [['Find the boxes', 15], ['Bring them down', 15]]), St('Decorate', 120, [['Put up the lights', 30], ['Do the tree', 45], ['Do the rest of the house', 45]]), St('Put the boxes away', 20)]),
    BD('holiday-gifts', 'event', ['christmas gifts', 'holiday gifts', 'gifts for everyone', 'family gifts', 'gifts', 'christmas shopping', 'holiday shopping', 'hanukkah gifts'],
      [St('List who', 10), St('Set a budget for each', 10), St('Pick gifts', 45, [['Pick the first few', 15], ['Pick a few more', 15], ['Pick the rest', 15]]), St('Order them', 30, [['Order the first half', 15], ['Order the rest', 15]]), St('Wrap them', 45, [['Wrap the first few', 15], ['Wrap a few more', 15], ['Wrap the rest', 15]])]),
    BD('gift', 'event', ['gift', 'present', 'gift for', 'buy a gift'],
      [St('Make a list of ideas', 10), St('Pick one', 10), St('Order it or buy it', 15), St('Wrap it', 15)]),
    BD('registry-gift', 'event', ['wedding gift', 'wedding present', 'registry', 'shower present'],
      [St('Find the registry', 5), St('Pick a gift from it', 15), St('Order it', 10), St('Write a card', 10)]),
    BD('card', 'event', ['card', 'cards', 'birthday card', 'greeting card', 'sympathy card', 'get well card', 'anniversary card', 'mom card', 'dad card'],
      [St('Write the card', 10), St('Address and stamp it', 10), St('Mail it', 15)]),
    BD('card-buy', 'event', ['buy a card', 'get a card', 'pick up a card', 'buy a birthday card', 'buy cards'],
      [St('Pick out a card', 10), Wh('Buy it', 15), St('Write a note in it', 10), St('Mail it or put it with the gift', 5)]),
    BD('holiday-cards', 'event', ['christmas cards', 'christmas card', 'holiday cards', 'holiday card', 'new year cards'],
      [St('Pick a photo', 10), St('Order the cards', 20), St('Update the address list', 20), St('Address them', 45, [['Address the first few', 15], ['Address a few more', 15], ['Address the rest', 15]]), St('Stamp and mail them', 15)]),
    BD('thank-you', 'event', ['thank you notes', 'thank you note', 'thank you cards', 'thank you card', 'thank yous'],
      [St('List who to thank and for what', 10), St('Write the first few', 20), St('Write the rest', 20), St('Address, stamp, and mail them', 15)]),
    BD('wedding-guest', 'event', ['wedding', 'go to the wedding', 'wedding weekend'],
      [St('RSVP', 5), St('Pick a gift from the registry', 15), St('Plan what to wear', 20), St('Book travel and a room if you need them', 30, [['Book travel', 15], ['Book a room', 15]]), St('Write a card', 10)]),
    BD('wedding-plan', 'event', ['plan the wedding', 'plan our wedding', 'plan a wedding', 'wedding planning', 'our wedding'],
      [St('Talk about what matters most', 10), St('Set the budget', 20), St('Make the guest list', 30, [['Make the first draft', 15], ['Make the final list', 15]]), St('Pick a date and a venue', 60, [['Look at venues', 20], ['Visit the top two', 20, true], ['Book one', 20]]), St('Book the big vendors', 60, [['Book the photographer', 20], ['Book the food', 20], ['Book the music', 20]]), St('Send save the dates', 30, [['Make them', 15], ['Send them', 15]])]),
    BD('shower', 'event', ['baby shower', 'bridal shower', 'shower gift'],
      [St('RSVP', 5), St('Pick a gift from the registry', 15), St('Order it', 10), St('Wrap it and write a card', 15)]),
    /* (Look ahead's Plans for a date, and going to someone else's party) */
    BD('celebrate', 'event', ['plans for', 'birthday plans', 'plan a birthday', 'plan something for', 'celebrate'],
      [St('Think about what would make the day', 10), St('Pick what to do', 10), St('Book it or set it up', 15), St('Tell whoever’s coming', 5), St('Get a card', 10)]),
    BD('party-guest', 'event', ['go to the party', 'go to a party', 'party invite', 'invited to a party'],
      [St('RSVP', 5), St('Pick a gift or something to bring', 15), Wh('Get it', 20), St('Plan what to wear', 10), St('Check the time and how to get there', 5)]),
    BD('rsvp', 'event', ['rsvp', 'wedding rsvp', 'reply to the invite', 'answer the invite'],
      [St('Check the date works', 5), St('Check with {partner}', 5), St('Send the RSVP', 5)]),
    BD('outfit', 'event', ['something to wear', 'what to wear', 'outfit', 'outfit for', 'dress for', 'suit for'],
      [St('Check the dress code', 5), St('Try on what you have', 15), St('List what’s missing', 5), Wh('Shop for it', 45), St('Try it all on together', 10)]),
    BD('tickets', 'event', ['tickets', 'buy tickets', 'get tickets', 'tickets for', 'book tickets'],
      [St('Check the date and who’s going', 5), St('Compare seats and prices', 15), St('Buy the tickets', 10), St('Save them where you’ll find them', 5)]),
    BD('move', 'event', ['moving', 'move out', 'move in', 'move house', 'move to', 'moving day', 'pack the house', 'moving boxes', 'the move', 'new apartment', 'new house'],
      [St('Pick a moving date', 10), St('Book movers or a truck', 30, [['Get quotes', 15], ['Book one', 15]]), St('Get boxes and tape', 30, [['Find boxes', 15], ['Pick them up', 15, true]]), St('Pack room by room', 180, [['Pack the kitchen', 60], ['Pack the bedrooms', 60], ['Pack everything else', 60]]), St('Change your address', 20), St('Set up internet and utilities', 30, [['Set up the internet', 15], ['Set up power and water', 15]]), St('Clean the old place', 120, [['Clean the kitchen', 30], ['Clean the bathroom', 30], ['Clean the floors', 30], ['Clean the walls and closets', 30]]), St('Unpack the essentials first', 60, [['Set up the beds', 20], ['Unpack the kitchen basics', 20], ['Unpack the bathroom', 20]])]),
    BD('anniversary', 'event', ['anniversary', 'anniversary plans'],
      [St('Think about what {partner} would love', 10), St('Pick what to do', 10), St('Book it', 15), St('Line up a sitter for {kid}', 15), St('Get a card or a gift', 20), St('Write a note', 10)]),
    BD('date-night', 'event', ['date night', 'plan a date', 'date with'],
      [St('Pick a night', 5), St('Pick what to do', 10), St('Book it', 10), St('Line up a sitter for {kid}', 15), St('Tell {partner} the plan', 5)]),
    BD('costume', 'event', ['costume', 'costumes', 'halloween costume', 'halloween'],
      [St('Ask {kid} what they want to be', 5), St('Pick a costume idea', 10), St('List what you need', 10), St('Buy or make the pieces', 45, [['Buy the pieces', 15], ['Make what you can', 30]]), St('Try it on and fix it', 15)]),
    BD('guests', 'event', ['house guests', 'guests staying', 'company coming', 'family visiting', 'in laws visiting', 'visitors'],
      [St('Ask when they arrive and leave', 5), St('Make up the guest bed', 15), St('Clear space in the bathroom', 10), St('Plan a few meals', 15), St('Shop', 45, [['Make the list', 10], ['Shop', 35, true]])]),

    /* health */
    BD('doctor', 'health', ['doctor', 'doctor appointment', 'checkup', 'check up', 'physical', 'annual physical', 'pediatrician', 'well visit', 'specialist', 'dermatologist', 'eye doctor', 'eye exam'],
      [St('Call and book a time', 10), St('Write down questions and what’s changed', 10), St('Find your insurance card', 5), Wh('Go to the appointment', 60), St('Note what’s next and book any follow up', 10)]),
    BD('dentist', 'health', ['dentist', 'dental', 'teeth cleaning', 'book a cleaning', 'dental cleaning', 'cleaning for', 'orthodontist'],
      [St('Call and book a time', 10), St('Find the insurance card', 5), Wh('Go to the appointment', 60), St('Book the next one before you leave', 5)]),
    /* (making an appointment is booking it; going to it is the appointment itself) */
    BD('book-appt', 'health', ['make an appointment', 'book an appointment', 'schedule an appointment', 'make a doctor appointment', 'book a doctor appointment', 'make a dentist appointment'],
      [St('Find the number or the booking page', 5), St('Look at your week for times that work', 5), St('Call or book a time', 10), St('Add it to your calendar', 5), St('Find your insurance card', 5)]),
    BD('lab', 'health', ['blood test', 'blood work', 'lab work', 'labs', 'x ray', 'mammogram'],
      [St('Check if you need to fast or book ahead', 5), St('Book a time', 10), Wh('Go', 45), St('Watch for the results', 5)]),
    BD('routine', 'health', ['routine', 'habit', 'new routine', 'start a routine', 'morning routine', 'bedtime routine', 'new habit', 'build a habit'],
      [St('Pick one small first version', 5), St('Pick when it happens each day', 5), St('Set up what you need the night before', 10), St('Do it the first time', 15), St('Note how it went', 5)]),
    BD('exercise', 'health', ['exercise', 'get in shape', 'start running', 'workout plan', 'fitness', 'start working out', 'get fit', 'start exercising'],
      [St('Pick two days this week', 5), St('Pick a simple plan', 15), St('Get your gear ready', 10), Wh('Do the first workout', 30), St('Note how it felt', 5)]),
    BD('therapy', 'health', ['therapist', 'therapy', 'counselor', 'counseling', 'mental health'],
      [St('Write down what you want help with', 10), St('Check what insurance covers', 15), St('Look at a few therapists', 20), St('Book a first visit', 10)]),
    BD('vaccine', 'health', ['flu shot', 'vaccine', 'vaccines', 'booster', 'covid shot', 'shots'],
      [St('Find a place and a time', 10), St('Book it', 5), Wh('Go get it', 30), St('Save the record', 5)]),
    BD('sleep', 'health', ['sleep schedule', 'better sleep', 'go to bed earlier', 'earlier bedtime'],
      [St('Pick a bedtime', 5), St('Set a wind down alarm', 5), St('Get the room dark and cool', 15), St('Put the phone away at the alarm', 5)]),

    /* meals and cooking */
    BD('meal-prep', 'meals', ['meal prep', 'prep meals', 'batch cook', 'batch cooking', 'cook ahead', 'prep lunches', 'prep for the week', 'cook once'],
      [St('Pick two things to batch cook', 10), St('Write the shopping list', 10), St('Shop', 45, [['Get there', 10, true], ['Shop the list', 35, true]]), St('Start the rice or grains', 10), Wh('Cook the protein', 30), St('Chop the vegetables', 20), St('Portion it into containers', 15), St('Clean up', 15)]),
    BD('meal-plan', 'meals', ['meal plan', 'plan meals', 'plan dinners', 'plan the meals', 'weekly menu', 'menu'],
      [St('Check the calendar for busy nights', 5), St('Pick dinners for each night', 15), St('Pick one batch to eat twice', 5), St('Write the grocery list', 10)]),
    BD('new-recipe', 'meals', ['new recipe', 'try a recipe', 'try a new recipe', 'cook something new'],
      [St('Read the recipe all the way through', 5), St('Check you have everything', 5), St('Prep the ingredients', 20), Wh('Cook', 40), St('Clean up', 15)]),
    BD('bake', 'meals', ['bake', 'baking', 'make cookies', 'bake a cake', 'make a cake', 'banana bread', 'cupcakes', 'muffins'],
      [St('Read the recipe and preheat', 5), St('Measure everything out', 15), St('Mix it', 15), Wh('Bake', 30), St('Clean up while it bakes', 15)]),
    BD('dinner-party', 'meals', ['dinner party', 'host dinner', 'host a dinner', 'have people over', 'people over', 'guests over'],
      [St('Pick a menu', 10), St('Shop', 45, [['Make the list', 10], ['Shop', 35, true]]), St('Clean the main rooms', 30, [['Clean the kitchen', 15], ['Clean the living room', 15]]), St('Cook', 60, [['Start what takes longest', 20], ['Make the sides', 20], ['Finish and plate', 20]]), St('Set the table', 10)]),
    BD('lunches', 'meals', ['pack lunches', 'pack lunch', 'school lunches', 'lunches for the week', 'make lunches'],
      [St('Pick lunches for the week', 10), St('Shop for what’s missing', 30, [['Make the list', 10], ['Shop', 20, true]]), St('Prep the fruit and snacks', 15), St('Pack the first few', 15)]),
    BD('freezer-meals', 'meals', ['freezer meals', 'freezer meal', 'stock the freezer'],
      [St('Pick three freezer meals', 10), St('Shop', 45, [['Make the list', 10], ['Shop', 35, true]]), St('Cook them', 90, [['Cook the first one', 30, true], ['Cook the second one', 30, true], ['Cook the third one', 30, true]]), St('Label and freeze them', 15)]),

    /* the car */
    BD('registration', 'car', ['registration', 'car registration', 'renew the registration', 'tags', 'emissions', 'smog check', 'emissions test', 'car inspection'],
      [St('Find the renewal notice', 10), Wh('Get the emissions check if you need one', 30), St('Pay online', 15), St('Put the sticker on', 5)]),
    BD('car-service', 'car', ['oil change', 'car service', 'service the car', 'car maintenance', 'tires', 'tire', 'mechanic', 'brakes', 'check engine', 'car repair'],
      [St('Check what’s due in the manual or the app', 5), St('Book a time', 10), Wh('Drop it off or wait', 60), St('Save the receipt', 5)]),
    BD('car-wash', 'car', ['wash the car', 'car wash', 'clean the car', 'clean out the car', 'vacuum the car', 'detail the car', 'clean my car'],
      [St('Clear out the trash', 10), St('Take out the mats and shake them', 5), St('Vacuum inside', 15), St('Wipe the dash and the windows', 10), St('Wash the outside', 20)]),
    BD('buy-car', 'car', ['buy a car', 'buy a new car', 'new car', 'used car', 'car shopping', 'lease'],
      [St('Set a budget', 10), St('List what you need in a car', 15), St('Compare a few models', 45, [['Look at the first models', 15], ['Look at a few more', 15], ['Narrow it to two', 15]]), Wh('Test drive', 60), St('Get financing quotes', 30, [['Get the first quote', 15], ['Get the others', 15]]), Wh('Buy it', 120)]),
    BD('car-seat', 'car', ['car seat', 'install the car seat', 'booster seat'],
      [St('Read the manual', 10), St('Install it', 20), St('Check it’s tight', 5)]),

    /* the yard */
    BD('mow', 'yard', ['mow', 'mowing', 'mow the lawn', 'lawn', 'grass'],
      [St('Clear the yard of toys and sticks', 10), St('Mow', 40, [['Mow the front', 20], ['Mow the back', 20]]), St('Edge and trim', 15), St('Sweep the walks', 10)]),
    BD('garden', 'yard', ['weed', 'weeds', 'weeding', 'garden', 'gardening', 'flower bed', 'flower beds', 'plant flowers', 'planting'],
      [St('Get gloves and a bag', 5), St('Weed one bed', 20), St('Weed the next one', 20), St('Water', 10), St('Put the tools away', 5)]),
    BD('leaves', 'yard', ['rake', 'raking', 'leaves', 'yard work', 'yard cleanup', 'fall cleanup', '~yard'],
      [St('Get the rake and the bags', 5), St('Rake the front', 20), St('Rake the back', 20), St('Bag it', 15), St('Put the bags out', 5)]),
    BD('gutters', 'yard', ['gutters', 'gutter', 'clean the gutters'],
      [St('Set up the ladder safely', 10), St('Clear the front gutters', 20), St('Clear the back gutters', 20), St('Run water to check the downspouts', 10)]),
    BD('snow', 'yard', ['shovel', 'shoveling', 'snow', 'clear the driveway'],
      [St('Bundle up and get the shovel', 5), St('Clear the walk and the steps', 20), St('Clear the driveway', 30, [['Clear half of it', 15], ['Clear the rest', 15]]), St('Salt the icy spots', 5)]),
    BD('patio', 'yard', ['deck', 'patio', 'porch', 'power wash', 'pressure wash', 'stain the deck'],
      [St('Clear the furniture off', 10), St('Sweep it', 15), St('Wash it', 30, [['Wash half', 15], ['Wash the rest', 15]]), St('Let it dry and put things back', 15)]),

    /* digital clutter */
    BD('photos', 'digital', ['photos', 'pictures', 'camera roll', 'organize photos', 'back up photos', 'sort photos'],
      [St('Pick one month to start', 5), St('Delete blurry shots and doubles', 20), St('Pick favorites', 15), St('Back them up', 10), St('Move on to the next month', 20)]),
    BD('photo-book', 'digital', ['photo book', 'photo album', 'photobook', 'scrapbook'],
      [St('Pick the dates it covers', 5), St('Pick the photos', 45, [['Pick from the first month', 15], ['Pick from the next month', 15], ['Pick from the rest', 15]]), St('Lay out the pages', 45, [['Lay out the first pages', 15], ['Lay out the middle pages', 15], ['Lay out the last pages', 15]]), St('Order it', 10)]),
    BD('passwords', 'digital', ['passwords', 'password', 'password manager'],
      [St('Pick a password manager', 10), St('Add your email and bank logins first', 20), St('Turn on two step sign in for those', 15), St('Add the rest over time', 20)]),
    BD('files', 'digital', ['phone storage', 'clean up my phone', 'delete apps', 'downloads folder', 'computer files', 'desktop files', 'digital clutter', 'back up', 'backup', 'files'],
      [St('Check what’s using space', 5), St('Delete apps you don’t use', 10), St('Clear the downloads folder', 10), St('Back up what matters', 15), St('Sort the rest into folders', 20)]),
    BD('unsubscribe', 'digital', ['unsubscribe', 'newsletters', 'spam', 'junk mail'],
      [St('Search your inbox for unsubscribe', 5), St('Unsubscribe from the first ten', 10), St('Unsubscribe from the rest', 15), St('Archive the old ones', 5)]),
    BD('new-device', 'digital', ['new phone', 'new laptop', 'new computer', 'set up the phone', 'set up the laptop', 'set up my phone'],
      [St('Charge both and find the cables', 5), St('Back up the old one', 15), Wh('Move your data over', 30), St('Sign in to your apps', 20), St('Wipe the old one', 10)])
  ];
  /* When nothing in the library or the rules fits: say what done looks like, then two parts */
  const BREAKDOWN_ANY = [St('Write down what done looks like', 5), St('Do the first part', 25, [['Get what you need in one place', 10], ['Start the first part', 15]]), St('Finish it and put things away', 20, [['Finish the rest', 15], ['Put things away', 5]])];

  /* == Goals ==
     Exams people study for, each with its parts and, where there's a common public estimate, about how
     many hours it takes (hours; null where there isn't one). Parts are in hours here; Model.goalForExam
     turns them into minutes. caps: short names that are also everyday words (sat, act) count only in
     capitals or in one of the phrases. */
  const EXAMS = [
    { id: 'bar', name: 'The bar exam', words: ['bar exam', 'bar exams', 'pass the bar', 'take the bar', 'study for the bar', 'sit for the bar', 'bar prep', 'uniform bar', 'ube', 'mbe'], hours: 400,
      parts: [['Civil Procedure', 35], ['Constitutional Law', 35], ['Contracts', 35], ['Criminal Law and Procedure', 35], ['Evidence', 35], ['Real Property', 35], ['Torts', 35], ['Essay practice', 95], ['Performance tests', 60]] },
    { id: 'cfa', name: 'CFA Level I', words: ['cfa', 'cfa level 1', 'cfa level i', 'cfa 1', 'cfa l1', 'chartered financial analyst'], hours: 300,
      parts: [['Quantitative Methods', 25], ['Economics', 25], ['Corporate Issuers', 20], ['Financial Statement Analysis', 40], ['Equity Investments', 35], ['Fixed Income', 35], ['Derivatives', 20], ['Alternative Investments', 20], ['Portfolio Management', 35], ['Ethical and Professional Standards', 45]] },
    /* (each level names itself, so a Level II or III never gets Level I's parts) */
    { id: 'cfa2', name: 'CFA Level II', words: ['cfa level 2', 'cfa level ii', 'cfa 2', 'cfa ii', 'cfa l2', 'level 2 cfa', 'level ii cfa', 'chartered financial analyst level 2', 'chartered financial analyst level ii'], hours: 300,
      parts: [['Quantitative Methods', 20], ['Economics', 15], ['Financial Statement Analysis', 40], ['Corporate Issuers', 20], ['Equity Valuation', 40], ['Fixed Income', 35], ['Derivatives', 25], ['Alternative Investments', 20], ['Portfolio Management', 35], ['Ethical and Professional Standards', 30], ['Practice exams', 20]] },
    { id: 'cfa3', name: 'CFA Level III', words: ['cfa level 3', 'cfa level iii', 'cfa 3', 'cfa iii', 'cfa l3', 'level 3 cfa', 'level iii cfa', 'chartered financial analyst level 3', 'chartered financial analyst level iii'], hours: 300,
      parts: [['Asset Allocation', 45], ['Portfolio Construction', 45], ['Performance Measurement', 25], ['Derivatives and Risk Management', 40], ['Ethical and Professional Standards', 35], ['Your pathway (Portfolio Management, Private Markets, or Private Wealth)', 60], ['Essay practice (constructed response)', 30], ['Practice exams', 20]] },
    { id: 'sie', name: 'The SIE exam', words: ['sie', 'sie exam', 'securities industry essentials'], hours: 50,
      parts: [['Capital markets', 7], ['Products and their risks', 18], ['Trading, accounts, and prohibited activities', 13], ['The regulatory framework', 4], ['Practice exams', 8]] },
    { id: 'series7', name: 'The Series 7 exam', words: ['series 7', 'series seven', 'general securities representative'], hours: 80,
      parts: [['Finding customers', 5], ['Opening accounts', 7], ['Investments and recommendations', 50], ['Placing and confirming trades', 8], ['Practice exams', 10]] },
    { id: 'cpa', name: 'The CPA exam', words: ['cpa', 'cpa exam', 'certified public accountant'], hours: 350,
      parts: [['Auditing and Attestation (AUD)', 85], ['Financial Accounting and Reporting (FAR)', 110], ['Taxation and Regulation (REG)', 85], ['Your discipline section (BAR, ISC, or TCP)', 70]] },
    { id: 'gre', name: 'The GRE', words: ['gre', 'gre exam', 'graduate record exam'], hours: 50,
      parts: [['Verbal Reasoning', 18], ['Quantitative Reasoning', 18], ['Analytical Writing', 6], ['Practice tests', 8]] },
    { id: 'gmat', name: 'The GMAT', words: ['gmat'], hours: 100,
      parts: [['Quantitative Reasoning', 30], ['Verbal Reasoning', 30], ['Data Insights', 25], ['Practice tests', 15]] },
    { id: 'lsat', name: 'The LSAT', words: ['lsat'], hours: 150,
      parts: [['Logical Reasoning', 70], ['Reading Comprehension', 45], ['Argumentative Writing', 5], ['Practice tests', 30]] },
    { id: 'mcat', name: 'The MCAT', words: ['mcat'], hours: 300,
      parts: [['Chemical and Physical Foundations', 70], ['Critical Analysis and Reasoning (CARS)', 50], ['Biological and Biochemical Foundations', 70], ['Psychological, Social, and Biological Foundations', 50], ['Practice tests', 60]] },
    { id: 'sat', name: 'The SAT', words: ['sat prep', 'sat test', 'the sat', 'take the sat', 'study for the sat', 'psat'], caps: ['SAT', 'PSAT'], hours: 20,
      parts: [['Reading and Writing', 8], ['Math', 8], ['Practice tests', 4]] },
    { id: 'act', name: 'The ACT', words: ['act prep', 'act test', 'the act', 'take the act', 'study for the act'], caps: ['ACT'], hours: 20,
      parts: [['English', 4], ['Math', 6], ['Reading', 3], ['Science, if you take it', 3], ['Practice tests', 4]] },
    { id: 'pmp', name: 'The PMP exam', words: ['pmp', 'project management professional'], hours: 60,
      parts: [['People', 18], ['Process', 24], ['Business Environment', 8], ['Practice exams', 10]] },
    { id: 'driving', name: 'The driving test', words: ['driving test', 'driver test', 'drivers test', 'road test', 'permit test', 'learner permit', 'driver license test', 'drivers license test', 'driving exam', 'drivers ed', 'driver ed'], hours: null,
      parts: [['Read the driver’s handbook', 4], ['Practice driving', 20], ['Parking and turns', 4], ['Practice tests', 2]] },
    { id: 'citizenship', name: 'The citizenship test', words: ['citizenship test', 'citizenship interview', 'citizenship exam', 'naturalization', 'civics test'], hours: null,
      parts: [['Civics questions', 10], ['Reading and writing', 4], ['Your application answers', 3], ['Practice interview', 3]] }
  ];
  /* What makes a to-do look like a goal (Model.looksLikeGoal): an exam above, or one of these. GOAL_NOT
     names the appointments and errands that also say test or exam (an eye exam, a blood test). */
  const GOAL_WORDS = ['exam', 'exams', 'test', 'certification', 'certificate', 'get certified', 'license exam', 'licensing exam', 'board exam', 'boards', 'nclex', 'usmle', 'step 1',
    'marathon', 'half marathon', 'triathlon', 'ironman', '5k', '10k', 'race', 'thesis', 'dissertation', 'capstone', 'manuscript', 'write a book', 'novel', 'launch', 'start a business', 'business plan',
    'learn spanish', 'learn french', 'learn german', 'learn italian', 'learn japanese', 'learn chinese', 'learn mandarin', 'learn korean', 'learn portuguese', 'learn arabic', 'learn sign language', 'learn a language',
    'learn guitar', 'learn the guitar', 'learn piano', 'learn the piano', 'learn to code', 'learn coding', 'learn python'];
  const GOAL_NOT = ['eye', 'eyes', 'dental', 'dentist', 'doctor', 'physical', 'blood', 'covid', 'vision', 'hearing', 'annual', 'checkup', 'check up', 'pap', 'skin', 'allergy', 'drug', 'pregnancy',
    'smoke', 'alarm', 'emissions', 'smog', 'swab', 'lab', 'urine', 'stress test', 'hair', 'vet', 'car', 'recipe', 'drive'];
  /* Parts for a goal that isn't an exam, by kind, in hours. They're a start: the person sets their own.
     mix: the parts take turns, a little of each every week (a race's runs), the way an exam's do */
  const GOAL_TEMPLATES = [
    { id: 'race', kind: 'event', mix: true, words: ['marathon', 'half marathon', 'triathlon', 'ironman', '5k', '10k', 'race'], parts: [['Easy runs', 40], ['Long runs', 35], ['Speed work', 15], ['Strength and stretching', 10]] },
    { id: 'thesis', kind: 'project', words: ['thesis', 'dissertation', 'capstone', 'manuscript', 'write a book', 'novel'], parts: [['Pick the question and plan', 20], ['Read and take notes', 60], ['Research or gather data', 80], ['Write the draft', 80], ['Revise', 40], ['Finish and turn it in', 10]] },
    { id: 'launch', kind: 'project', words: ['launch', 'go live', 'website', 'portfolio', 'start a business', 'business plan'], parts: [['Plan the launch', 4], ['Build what’s left', 20], ['Test it', 6], ['Tell people', 6], ['Launch day', 2]] },
    { id: 'project', kind: 'project', words: ['project', 'renovation', 'remodel', 'build'], parts: [['Plan it', 2], ['Draft it', 10], ['Review it', 5], ['Finish it', 3]] },
    { id: 'skill', kind: 'skill', words: ['learn', 'practice', 'get better at', 'improve'], parts: [['Learn the basics', 4], ['Practice', 12], ['Try it for real', 4]] },
    { id: 'event', kind: 'event', words: ['wedding', 'party', 'reunion', 'conference', 'recital', 'performance', 'competition', 'tournament'], parts: [['Decide the big things', 3], ['Book and invite', 4], ['Prepare', 6], ['The last week', 3]] },
    { id: 'other', kind: 'other', words: [], parts: [['Get started', 3], ['Keep going', 10], ['Finish', 3]] }
  ];

  /* == Cook once, eat twice ==
     Meals that keep and reheat well, for Model.prepPlan. words: a meal of your own with one of these in its
     name is a good batch cook too (not: the ones that don't reheat well). items are pantry ids, so
     they reach the grocery list; has is what a home that leaves things out would check. */
  const BATCH = {
    words: ['rice', 'chicken', 'chili', 'soup', 'stew', 'curry', 'bowls', 'pasta bake', 'sheet pan', 'beans', 'roast'],
    strong: ['chili', 'soup', 'stew', 'curry', 'bowls', 'pasta bake', 'sheet pan', 'roast'],
    not: ['salmon', 'fish', 'shrimp', 'salad', 'sushi'],
    meals: [
      { id: 'chicken-rice', name: 'Chicken and rice', items: ['chicken', 'rice', 'broccoli'], has: ['chicken'] },
      { id: 'turkey-chili', name: 'Turkey chili', items: ['turkey', 'beans', 'peppers', 'onion'], has: ['turkey'], recipe: 'chili' },
      { id: 'bean-chili', name: 'Bean chili', items: ['beans', 'peppers', 'onion'], has: [] },
      { id: 'burrito-bowls', name: 'Burrito bowls', items: ['chicken', 'rice', 'beans', 'peppers'], has: ['chicken'], recipe: 'burrito' },
      { id: 'sheet-pan', name: 'Sheet pan chicken', items: ['chicken', 'broccoli', 'sweetpotato'], has: ['chicken'], recipe: 'sheetpan' },
      { id: 'beef-stew', name: 'Beef stew', items: ['beef', 'potatoes', 'onion'], has: ['beef'] },
      { id: 'veg-soup', name: 'Vegetable soup', items: ['potatoes', 'onion', 'zucchini', 'greenbeans'], has: [] },
      { id: 'veg-curry', name: 'Sweet potato curry', items: ['sweetpotato', 'spinach', 'onion', 'rice'], has: [] },
      { id: 'pasta-bake', name: 'Pasta bake', items: ['pasta', 'spinach', 'onion'], has: ['gluten', 'dairy'] },
      { id: 'beans-rice', name: 'Black beans and rice', items: ['beans', 'rice', 'peppers'], has: [] },
      { id: 'roast-chicken', name: 'Roast chicken and potatoes', items: ['chicken', 'potatoes', 'greenbeans'], has: ['chicken'] },
      { id: 'quinoa-bowls', name: 'Quinoa bowls', items: ['quinoa', 'beans', 'peppers', 'spinach'], has: [] }
    ]
  };

  /* The Sunday Reset, one job per step. V11's own words for a step are in its feel field: every version
     shares this list, and only V11 plans every meal and every person, so only V11 takes them (app.js, FEEL). */
  const STEPS = [
    { key: 'back', title: 'Look back', zoom: 'week', line: 'Here’s last week. Keep one thing, change one thing.' },
    { key: 'ahead', title: 'Look ahead', zoom: 'month', line: 'The next five weeks. Anything coming that needs a block now?', feel: { line: 'What’s coming, and when to start getting ready.' } },
    { key: 'shape', title: 'Set the week', zoom: 'week', line: 'How does this week look?' },
    { key: 'yours', title: 'Your time', zoom: 'week', tab: 'blocks', line: 'Put your own time on the week first, where it fits.' },
    { key: 'todo', title: 'To do', zoom: 'week', tab: 'todo', line: 'Give the things due soon a time this week: drag one onto a day, or tap it.', feel: { title: 'To-dos' } },
    { key: 'dinners', title: 'Dinners', zoom: 'week', tab: 'dinners', line: 'Pick dinners and who’s cooking. The grocery list fills in as you go.', feel: { title: 'Meals', line: 'Plan the week’s meals. The grocery list fills in as you go.' } },
    { key: 'kim', title: 'You and {partner}', zoom: 'week', tab: 'kim', line: 'Pick one thing to bring to {partner} this week.', feel: { title: 'People', line: 'Time with the people in your week.' } },
    { key: 'done', title: 'Your week', zoom: 'week', line: 'Here’s what you set up.' }
  ];
  /* V11: the Moving step. It isn't in STEPS, so versions that list STEPS themselves never show it;
     a version that has it puts it after the meals step (app.js, under FEEL), and it shows when the setup
     leaned toward moving more or a goal is set in Settings (useMove in app.js). */
  const MOVE_STEP = { key: 'move', title: 'Moving', zoom: 'week', tab: 'blocks', line: 'Your workouts, runs, and walks for the week, and a goal if you want one.' };

  /* The Sunday templates as first shipped, so an update can tell whether Sunday was changed by hand. */
  const SUNDAY_V1 = { wake: h(5, 30), bed: h(22), blocks: [B('up', 'Up with Elijah', 'family', 'bottle', h(5, 30), h(8, 30)), B('ready', 'Get ready', 'family', 'shirt', h(8, 30), h(10)), B('church', 'Church', 'family', 'church', h(10), h(12), FIXED), B('lunch', 'Lunch, pack them up', 'family', 'fork', h(12), h(14)), B('reset', 'Sunday Reset', 'yours', 'calendar', h(14), h(14, 45)), B('workout', 'Workout', 'yours', 'dumbbell', h(14, 45), h(15, 45)), B('creative', 'Creative projects', 'yours', 'brush', h(15, 45), h(18), SOFT), B('dinner', 'Dinner', 'meals', 'pot', h(18), h(18, 45), { dinner: true }), B('evening', 'Free evening', 'yours', 'moon', h(18, 45), h(22), SOFT)] };
  const SUNDAY_HOME_V1 = { wake: h(5, 30), bed: h(22), blocks: [B('up', 'Up with Elijah', 'family', 'bottle', h(5, 30), h(8, 30)), B('ready', 'Get ready', 'family', 'shirt', h(8, 30), h(10)), B('church', 'Church', 'family', 'church', h(10), h(12), FIXED), B('lunch', 'Lunch', 'family', 'fork', h(12), h(13)), B('reset', 'Sunday Reset', 'yours', 'calendar', h(13), h(13, 45)), B('afternoon', 'Family afternoon', 'family', 'heart', h(13, 45), h(17), SOFT), B('walk', 'Walk, bath, feed', 'family', 'shoe', h(17), h(19)), B('bedtime', 'Bedtime', 'family', 'moon', h(19), h(19, 45)), B('dinner', 'Dinner', 'meals', 'pot', h(19, 45), h(20, 30), { dinner: true }), B('evening', 'Evening with Kim', 'us', 'heart', h(20, 30), h(22), SOFT)] };
  const stable = (v) => Array.isArray(v) ? '[' + v.map(stable).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}' : JSON.stringify(v);
  /* V11 goals (Oct 14): VERSION is 8. Version 8 adds state.goals (a list, empty on every older board),
     task.spread (how a to-do's steps were spread out), goal sessions (adds whose src.type is 'goal', with
     pinned and skipped), Meal prep blocks (src.type 'prep', with makes), and leftovers that know where
     they come from (from: { date, slot } on a dinner or a meal). migrate adds the empty list and changes
     nothing else (tests/saved-data.test.mjs). V10 and older read version 7, so one of them opening a
     version 8 board treats it as newer: read only, never written over, and a version 8 backup is refused
     there. Each version is its own site with its own storage, so a board only meets an older build
     through a backup file.
     Before that: VERSION stayed 7 while V11 added optional fields, each read with a default and left
     alone by code that doesn't know it: V11's migrate keeps them (tests/saved-data.test.mjs),
     and so does V10's, run as it shipped, so V10 keeps a V11 board's fields whole
     (tests/older-build.test.mjs). The fields: profile.people ({ id, name, group, home }),
     profile.partnerId (the id a partner had before stepping up to the first place), settings.move
     ({ on, n, unit }), settings.holidays (holiday ids), settings.modules.people, an event's holiday,
     ready, readyFrom, and prep, dinners[date].with and .parts, a cook stored as 'p:' and a person's id,
     ideas[].for and .who, meals[date].breakfast and .lunch, and mealbook.
     How an older build shows them: a dinner cooked by 'p:' is planned and its groceries count, but its
     panel shows no cook and no way picked; a Friends block takes the older build's fallback color and its
     panel says You and the partner; People, Moving, holidays, and the meal book don't show.
     Breakfast and lunch: V7 to V10 kept them on the device only ('sundayreset.v7.meals'). V11 moves them
     onto the board with its first meal change and leaves the device copy as it was, so an older build
     still shows them as they were then; what V11 changes later doesn't reach it, and what an older build
     changes later moves over on V11's next meal change (variant.js, moveOldMeals).
     Merging: Model.mergeBoards merges meals per date and meal, the profile and meal book per field,
     settings per field with its switches (modules) one by one, a diet together with what it leaves out,
     and two first partners as two partners (tests/merge.test.mjs). An older build's mergeBoards keeps the
     profile, meals, and meal book whole, so in a household with one device on V10, a V10 merge can still
     drop a person or a meal added on the other device in the same moment.
     Meals stay in the store's app/core document: an older build writes each month's document with only
     dates and dinners, so meals kept there would be lost. With parts, a year of breakfasts and lunches is
     about 100 KB of core.
     V11-2, big moments (Oct 20, docs/BIG-MOMENTS.md): VERSION is 9. Every field it adds is optional, so a
     version 8 board reads the same and migrate changes only the number (tests/big-moments-model.test.mjs):
       an event's window ({ from, to } with date null: a fuzzy date, sometime in spring), host (you're
         hosting it), away (out of town), and deadline (marked as one); a ready entry's who (one heads-up per
         person, its prep key k:who@date) and place (where that person is);
       a to-do's msg ({ to, text }: a message step; text is kept only once the person edits it, and the app
         never sends anything), list ([{ id, name, done }]: things inside the block, a packing list), and of
         (the id of the big thing it belongs to);
       a step's doneOn (the date it was checked);
       a goal's rhythm.n (times a week, for a goal with no date), and practice: true on a practice exam
         session's add.
     An event saved without its own ready list keeps the suggestions it always had (Model.readySuggest's
     version 8 list); a new date gets the version 9 defaults when it's made. Version 8 builds read 8, so
     one of them takes a version 9 board as newer: read only, never written over.
     V11-3 (Oct 20): VERSION stays 9. Three optional fields on a placed add, each read with a default, so nothing
     migrates: own (true: a goal session the person's yes put in their own time, apart from pinned, which is placed
     by hand), meal (true: a block that is a meal, beside a Dinner block and a template meal), and mealAt (minutes:
     where a meal was put, the middle of its window). An older build ignores all three.
     Kim's test (Oct 20, docs/KIM-TEST.md K8): VERSION is 10. A routine in the usual week can belong to someone else
     every week: by on a template block (a drop off or pick up the partner does, by their name, or 'Someone else'),
     which shows as the outline a one-day handoff leaves (dates[d].edits[id] with gone and by), and mine on a date's
     edit (taken back that day: the routine is the person's own, locked as it was made). migrate changes only the
     number: no older board has either field (tests/kim-flows.test.mjs). A version 9 build takes a version 10 board
     as newer: read only, never written over. */
  const VERSION = 10;
  /* Who the board belongs to. Names in the app's own words (tabs, buttons, lines) come from here,
     never from code. Russell's board keeps Kim, Elijah, and Kim's cookbook. */
  const RUSSELL = { name: 'Russell', partner: 'Kim', kids: ['Elijah'], cookbook: 'https://truffle-recipes.vercel.app' };
  /* ideas that only make sense in Russell's house, left out of a new person's board */
  /* V11: and one that assumes a holiday (the Christmas decorations) */
  const PERSONAL_IDEAS = ['first-bday', 'her-movie', 'photobook', 'decor-plan'];
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
    if (st.v === 7) {
      /* goals with a date, broken into daily sessions. Every other field and date stays as it was. */
      if (!Array.isArray(st.goals)) st.goals = [];
      st.v = 8;
    }
    if (st.v === 8) {
      /* big moments: fuzzy dates, hosting, heads-ups, message steps, lists inside a block, practice exams.
         Each is optional and read with a default, so nothing on a version 8 board changes but the number. */
      st.v = 9;
    }
    if (st.v === 9) {
      /* routines someone else does every week (a template block's by) and a day taken back (an edit's mine). Both are
         new, so nothing on a version 9 board changes but the number */
      st.v = 10;
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
      goals: [],
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
  /* (Kim's test, K8, Oct 20: each drop off and pick up says who does it. dropBy and pickBy are 'me' (a locked block in
     the week, the way it always was), 'partner' (the block is the partner's: Data.byName gives the name it's marked
     with, and the board shows it as theirs, the per-day handoff made every week), or 'other' (someone else: a short,
     quiet note, never locked). An older answer's other: true, with no who, still means nothing goes on the board) */
  const WHO = ['me', 'partner', 'other'];
  function careList(a) {
    const kids = (a.kids || []).filter(Boolean);
    const who = (c, k) => (WHO.includes(c[k]) ? c[k] : 'me');
    if (Array.isArray(a.cares)) return a.cares.filter((c) => c && !(c.other && !c.dropBy && !c.pickBy) && (c.kids || []).length && (c.days || []).length).map((c) => ({ kids: c.kids.filter(Boolean), days: c.days.slice(), drop: c.drop, pick: c.pick, dropBy: who(c, 'dropBy'), pickBy: who(c, 'pickBy') }));
    if (a.care && kids[0] && a.work) return [{ kids: [kids[0]], days: a.work.days.slice(), drop: a.care.drop, pick: a.care.pick, dropBy: 'me', pickBy: 'me' }];
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
      /* (who does it: the person's own make the day's shape; the partner's or someone else's sit on it as notes. A
         partner's with no partner named is the person's own) */
      const byOf = (w) => (w === 'partner' && !a.partner ? 'me' : w || 'me');
      const byTime = (key, mine) => {
        const m = new Map();
        on.forEach((c) => { if (c[key] == null) return; const by = byOf(c[key + 'By']); if ((by === 'me') !== mine) return; const k = c[key] + '|' + by; if (!m.has(k)) m.set(k, { at: c[key], by, who: [] }); m.get(k).who.push(...c.kids); });
        return Array.from(m.values()).map((x) => ({ at: x.at, by: x.by, who: Array.from(new Set(x.who)) })).sort((x, y) => (x.by < y.by ? -1 : x.by > y.by ? 1 : x.at - y.at));
      };
      /* a drop off or pick up that starts inside the one before it rides in that block, so a child at
         8:15 is never dropped from the day behind a block at 8:00, and two locked blocks never overlap */
      const near = (list) => list.reduce((out, x) => { const last = out[out.length - 1]; if (last && last.by === x.by && x.at < last.at + 30) last.who = Array.from(new Set(last.who.concat(x.who))); else out.push({ at: x.at, by: x.by, who: x.who.slice() }); return out; }, []);
      const dropOk = (x) => x.at >= wake && x.at + 30 <= bed - 60, pickOk = (x) => x.at >= wake + 60 && x.at + 30 <= bed - 60;
      const drops = near(byTime('drop', true).filter(dropOk));
      const picks = near(byTime('pick', true).filter(pickOk));
      const theirs = [['dropoff', 'Drop off', near(byTime('drop', false).filter(dropOk))], ['pickup', 'Pick up', near(byTime('pick', false).filter(pickOk))]];
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
      /* the ones the partner or someone else does: the same block, marked with who has it (by), so the board shows it
         as theirs every week and its time stays open. It isn't part of the day's shape, so nothing waits on it */
      let notes = 0;
      theirs.forEach(([id, word, list]) => list.forEach((x, i) => { notes++; blocks.push(B(id + '-' + x.by + (i ? i + 1 : ''), word + ' ' + joinNames(x.who), 'family', 'car', x.at, x.at + 30, { fixed: true, daycare: true, by: x.by === 'partner' ? a.partner : 'Someone else' })); }));
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
      if (notes) blocks.sort((x, y) => x.start - y.start);
      days[wd] = { wake, bed, blocks };
    }
    const st = defaultState(today);
    st.rhythm = { days, shapes: {} };
    st.events = []; st.dates = {}; st.tasks = []; st.meetings = [];
    st.groups = [copy(INBOX)].concat(GROUPS.filter((g) => g.id === 'home' || g.id === 'bills').map(copy), [{ id: 'people', name: 'Friends and family', icon: 'heart' }]);
    st.ideas = st.ideas.filter((i) => !PERSONAL_IDEAS.includes(i.id));
    st.profile = { name: a.name || '', partner: a.partner || '', kids, cookbook: '' };
    const help = a.help || {};
    st.settings = Object.assign({}, st.settings, { modules: { dinners: help.dinners !== false, together: !!a.partner && help.together !== false } });
    /* V11: People is for anyone, partner or not, unless the setup turned it off (help.people); a setup
       that leaned toward moving more turns on the Moving step */
    if (help.people != null || help.together === false) st.settings.modules.people = help.people != null ? help.people !== false : false;
    if ((a.focus || []).includes('move')) st.settings.move = { on: true };
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

  const api = { h, CATS, CAT_ORDER, SHAPES, PANTRY_KINDS, COOKS, DINNER_HOW, ORDER_FROM, IDEA_KINDS, PEOPLE_GROUPS, PEOPLE_IDEAS, BREAKDOWNS, BREAKDOWN_ANY, STEPS, MOVE_STEP, PRESETS, KIT_ROWS, PALETTE_IDS, VERSION, RUSSELL, INBOX, defaultState, buildState, sampleState, careList, migrate };
  /* == V11: holidays a board can keep ==
     None is assumed. Each stays off until someone turns it on (Look ahead offers the list once, and
     Settings, Calendars, keeps it). One that's on goes on the board as a day to remember, with what to
     get ready and when (Model.READY). A date the calendar fixes (md) comes every year; the rest follow
     the moon or a rule, so each lists its dates for 2026 to 2028. Dates that follow the moon (moon) can
     move a day where you live. Jewish holidays begin at sundown, so theirs is the evening they begin.
     kids is what it gets ready for instead when there are kids at home (Model.holidayReady). */
  const HOLIDAYS = [
    { id: 'lunar', name: 'Lunar New Year', icon: 'star', moon: true, dates: ['2026-02-17', '2027-02-06', '2028-01-26'], ready: [{ k: 'plans', lead: 21, by: 3 }] },
    { id: 'valentine', name: 'Valentine’s Day', icon: 'heart', md: '02-14', ready: [{ k: 'plans', lead: 21, by: 7 }] },
    { id: 'ramadan', name: 'Ramadan', title: 'Ramadan begins', icon: 'moon', moon: true, dates: ['2026-02-18', '2027-02-08', '2028-01-28'], ready: [{ k: 'plans', lead: 14, by: 2 }] },
    { id: 'holi', name: 'Holi', icon: 'brush', moon: true, dates: ['2026-03-04', '2027-03-22', '2028-03-11'], ready: [{ k: 'plans', lead: 14, by: 2 }] },
    { id: 'eidfitr', name: 'Eid al-Fitr', icon: 'moon', moon: true, dates: ['2026-03-20', '2027-03-09', '2028-02-26'], ready: [{ k: 'gifts', lead: 28, by: 3 }] },
    { id: 'passover', name: 'Passover', title: 'Passover begins', icon: 'pot', dates: ['2026-04-01', '2027-04-21', '2028-04-10'], ready: [{ k: 'plans', lead: 21, by: 3 }] },
    { id: 'easter', name: 'Easter', icon: 'leaf', dates: ['2026-04-05', '2027-03-28', '2028-04-16'], ready: [{ k: 'plans', lead: 14, by: 2 }] },
    { id: 'orthodox', name: 'Orthodox Easter', icon: 'leaf', dates: ['2026-04-12', '2027-05-02', '2028-04-16'], ready: [{ k: 'plans', lead: 14, by: 2 }] },
    { id: 'mother', name: 'Mother’s Day (US)', title: 'Mother’s Day', icon: 'gift', dates: ['2026-05-10', '2027-05-09', '2028-05-14'], ready: [{ k: 'gift', lead: 21, by: 4 }] },
    { id: 'eidadha', name: 'Eid al-Adha', icon: 'moon', moon: true, dates: ['2026-05-27', '2027-05-16', '2028-05-05'], ready: [{ k: 'plans', lead: 21, by: 3 }] },
    { id: 'father', name: 'Father’s Day (US)', title: 'Father’s Day', icon: 'gift', dates: ['2026-06-21', '2027-06-20', '2028-06-18'], ready: [{ k: 'gift', lead: 21, by: 4 }] },
    { id: 'rosh', name: 'Rosh Hashanah', title: 'Rosh Hashanah begins', icon: 'star', dates: ['2026-09-11', '2027-10-01', '2028-09-20'], ready: [{ k: 'plans', lead: 21, by: 3 }] },
    { id: 'midautumn', name: 'Mid-Autumn Festival', icon: 'moon', moon: true, dates: ['2026-09-25', '2027-09-15', '2028-10-03'], ready: [{ k: 'plans', lead: 14, by: 2 }] },
    { id: 'diwali', name: 'Diwali', icon: 'sun', moon: true, dates: ['2026-11-08', '2027-10-29', '2028-10-17'], ready: [{ k: 'gifts', lead: 28, by: 3 }] },
    { id: 'halloween', name: 'Halloween', icon: 'moon', md: '10-31', ready: [{ k: 'plans', lead: 21, by: 5 }], kids: [{ k: 'costume', lead: 28, by: 5 }] },
    { id: 'thanksgiving', name: 'Thanksgiving (US)', title: 'Thanksgiving', icon: 'pot', dates: ['2026-11-26', '2027-11-25', '2028-11-23'], ready: [{ k: 'plans', lead: 42, by: 14 }] },
    { id: 'hanukkah', name: 'Hanukkah', title: 'Hanukkah begins', icon: 'star', dates: ['2026-12-04', '2027-12-24', '2028-12-12'], ready: [{ k: 'gifts', lead: 42, by: 7 }] },
    { id: 'christmas', name: 'Christmas', icon: 'fir', md: '12-25', ready: [{ k: 'gifts', lead: 56, by: 10 }] },
    { id: 'kwanzaa', name: 'Kwanzaa', title: 'Kwanzaa begins', icon: 'star', md: '12-26', ready: [{ k: 'plans', lead: 21, by: 3 }] },
    { id: 'nye', name: 'New Year’s Eve', icon: 'star', md: '12-31', ready: [{ k: 'plans', lead: 21, by: 7 }] }
  ];
  api.HOLIDAYS = HOLIDAYS;
  /* V11 goals: exams and goal parts, the words that look like a goal, and meals that cook once, eat twice */
  Object.assign(api, { EXAMS, GOAL_WORDS, GOAL_NOT, GOAL_TEMPLATES, BATCH });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Data = api;
})(typeof window !== 'undefined' ? window : globalThis);
