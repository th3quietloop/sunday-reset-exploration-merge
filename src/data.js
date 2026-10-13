/* What a fresh board starts with: kinds of time and their colors, the Block box, kinds of day,
   and a made up household (Alex, Sam, and Robin) so nobody real is on a public link.
   Times are minutes after midnight. */

export const h = (hr, mn = 0) => hr * 60 + mn;

/* The desk version's palette, deepened so every label reads at 4.5 to 1 or better. */
export const CATS = {
  yours: { name: 'Yours', base: '#EFB940', ink: '#4B3A18' },
  family: { name: 'Family', base: '#B84A38', ink: '#FFFFFF' },
  us: { name: 'You and Sam', base: '#8A5AA6', ink: '#FFFFFF' },
  work: { name: 'Work', base: '#2D6EA6', ink: '#FFFFFF' },
  meals: { name: 'Meals', base: '#3B7F45', ink: '#FFFFFF' },
  home: { name: 'Home', base: '#1F6F87', ink: '#FFFFFF' },
  away: { name: 'Away', base: '#2A4B90', ink: '#FFFFFF' },
  coral: { name: 'Coral', base: '#E0745A', ink: '#3A1A10' },
  mint: { name: 'Mint', base: '#7CC6A4', ink: '#123A28' },
  sky: { name: 'Sky', base: '#7FB3E6', ink: '#13304F' },
  open: { name: 'Breathing room', base: '#EFE3CA', ink: '#5A4430' }
};
export const CAT_ORDER = ['yours', 'family', 'us', 'work', 'meals', 'home', 'away', 'coral', 'mint', 'sky', 'open'];

/* The Block box. Each group is a tab on the shelf. */
const P = (id, name, cat, dur, icon) => ({ id, name, cat, dur, icon });
export const LIBRARY = [
  { group: 'Move', items: [P('workout', 'Workout', 'yours', 60, 'dumbbell'), P('run', 'Run', 'yours', 30, 'runner'), P('walk', 'Walk', 'yours', 30, 'shoe'), P('stretch', 'Stretch', 'mint', 15, 'sun'), P('nap', 'Nap', 'sky', 30, 'moon')] },
  { group: 'Make', items: [P('creative', 'Creative time', 'yours', 60, 'brush'), P('project', 'Personal project', 'coral', 90, 'note'), P('reading', 'Reading', 'yours', 45, 'book'), P('music', 'Play music', 'coral', 30, 'star'), P('winddown', 'Wind down', 'sky', 30, 'bed')] },
  { group: 'People', items: [P('coffee', 'Coffee with a friend', 'family', 60, 'cup'), P('call', 'Call a loved one', 'family', 30, 'handset'), P('texts', 'Text friends back', 'family', 15, 'chat'), P('date', 'Date night', 'us', 120, 'heart'), P('game', 'Game night', 'us', 90, 'gamepad')] },
  { group: 'Home', items: [P('groceries', 'Groceries', 'meals', 60, 'cart'), P('cook', 'Cook ahead', 'meals', 60, 'pot'), P('laundry', 'Laundry', 'home', 60, 'shirt'), P('clean', 'Clean', 'home', 60, 'broom'), P('errand', 'Errand', 'home', 30, 'car'), P('garden', 'Garden', 'mint', 45, 'leaf')] },
  { group: 'Work', items: [P('deep', 'Deep work', 'work', 90, 'book'), P('meeting', 'Meeting', 'work', 30, 'people'), P('email', 'Email', 'work', 30, 'envelope'), P('study', 'Study', 'work', 60, 'note'), P('room', 'Breathing room', 'open', 30, 'wave')] }
];
export const libraryItem = (id) => LIBRARY.flatMap((g) => g.items).find((p) => p.id === id);

/* Kinds of day. Each one fills open time (and soft time like Work) with its blocks. */
export const KINDS = [
  { id: 'usual', name: 'Your usual', icon: 'calendar', line: 'The day the way it usually goes', color: '#CFC7B8', ink: '#3B342A' },
  { id: 'focus', name: 'Focus', icon: 'book', line: 'Two deep work blocks inside Work', color: CATS.work.base, ink: '#fff', items: [['deep', 120, 'morning', true], ['walk', 30, 'afternoon'], ['deep', 90, 'afternoon', true]] },
  { id: 'creative', name: 'Creative', icon: 'brush', line: 'Two long creative stretches and a walk', color: CATS.yours.base, ink: CATS.yours.ink, items: [['creative', 120, 'morning'], ['walk', 30, 'afternoon'], ['project', 90, 'afternoon'], ['reading', 45, 'evening']] },
  { id: 'workout', name: 'Workout', icon: 'dumbbell', line: 'Train, stretch, cook ahead, and a walk', color: CATS.family.base, ink: '#fff', items: [['workout', 60, 'morning'], ['stretch', 15, 'morning'], ['cook', 60, 'afternoon'], ['walk', 45, 'evening']] },
  { id: 'rest', name: 'Rest', icon: 'moon', line: 'A slow walk, a nap, reading, and winding down', color: CATS.home.base, ink: '#fff', items: [['walk', 30, 'morning'], ['nap', 45, 'afternoon'], ['reading', 60, 'afternoon'], ['winddown', 30, 'evening']] },
  { id: 'people', name: 'People', icon: 'people', line: 'Coffee with a friend, a call, and texts back', color: CATS.us.base, ink: '#fff', items: [['coffee', 60, 'morning'], ['call', 30, 'afternoon'], ['texts', 15, 'evening']] },
  { id: 'easy', name: 'Take it easy', icon: 'leaf', line: 'Locked blocks and meals stay', color: CATS.meals.base, ink: '#fff', easy: true },
  { id: 'empty', name: 'Blank slate', icon: 'broom', line: 'Only locked blocks stay', color: '#EFE3CA', ink: '#5A4430', empty: true }
];
export const AWAY = { id: 'away', name: 'Away', color: CATS.away.base, ink: '#fff' };
export const kindOf = (id) => KINDS.find((k) => k.id === id) || (id === 'away' ? AWAY : KINDS[0]);

export const WINDOWS = { morning: [h(6), h(12)], afternoon: [h(12), h(17)], evening: [h(17), h(22)] };

/* The usual week. fixed: set by the world, never pushed. soft: makes room when something lands in it. */
const B = (id, name, cat, icon, start, end, flags = {}) => ({ id, name, cat, icon, start, dur: end - start, ...flags });
const FIXED = { fixed: true };
const SOFT = { soft: true };

const weekday = () => ({
  wake: h(6), bed: h(22),
  blocks: [
    B('up', 'Up with Robin', 'family', 'bottle', h(6), h(6, 45)),
    B('workout', 'Workout', 'yours', 'dumbbell', h(6, 45), h(7, 30)),
    B('breakfast', 'Breakfast', 'meals', 'fork', h(7, 30), h(8)),
    B('dropoff', 'School drop off', 'family', 'car', h(8), h(8, 30), FIXED),
    B('work', 'Work', 'work', 'laptop', h(8, 30), h(12), SOFT),
    B('lunch', 'Lunch', 'meals', 'fork', h(12), h(12, 45)),
    B('work2', 'Work', 'work', 'laptop', h(12, 45), h(16, 45), SOFT),
    B('pickup', 'Pick up Robin', 'family', 'car', h(16, 45), h(17, 15), FIXED),
    B('play', 'Park, bath, play', 'family', 'shoe', h(17, 15), h(18, 30)),
    B('dinner', 'Dinner', 'meals', 'pot', h(18, 30), h(19, 15)),
    B('bedtime', 'Robin to bed', 'family', 'moon', h(19, 15), h(20)),
    B('evening', 'Evening with Sam', 'us', 'heart', h(20), h(21), SOFT)
  ]
});
const saturday = () => ({
  wake: h(7), bed: h(22, 30),
  blocks: [
    B('pancakes', 'Pancakes', 'meals', 'pot', h(7), h(8, 30)),
    B('market', 'Farmers market', 'family', 'basket', h(8, 30), h(10)),
    B('clean', 'Clean the house', 'home', 'broom', h(10), h(11, 30)),
    B('lunch', 'Lunch', 'meals', 'fork', h(12), h(13)),
    B('walk', 'Family walk', 'family', 'shoe', h(16, 30), h(17, 30)),
    B('dinner', 'Dinner', 'meals', 'pot', h(18), h(18, 45)),
    B('bedtime', 'Robin to bed', 'family', 'moon', h(19, 15), h(20)),
    B('movie', 'Movie night', 'us', 'film', h(20), h(22), SOFT)
  ]
});
const sunday = () => ({
  wake: h(7), bed: h(22),
  blocks: [
    B('breakfast', 'Slow breakfast', 'meals', 'cup', h(7), h(8, 30)),
    B('run', 'Long run', 'yours', 'runner', h(9), h(10, 30)),
    B('laundry', 'Laundry', 'home', 'shirt', h(10, 30), h(11, 30)),
    B('lunch', 'Lunch', 'meals', 'fork', h(12), h(13)),
    B('reset', 'Sunday Reset', 'yours', 'calendar', h(14), h(14, 45), FIXED),
    B('park', 'Park with Robin', 'family', 'shoe', h(15), h(16, 30)),
    B('cook', 'Groceries, cook ahead', 'meals', 'cart', h(16, 30), h(18)),
    B('dinner', 'Dinner', 'meals', 'pot', h(18), h(18, 45)),
    B('bedtime', 'Robin to bed', 'family', 'moon', h(19, 15), h(20)),
    B('evening', 'Free evening', 'us', 'heart', h(20), h(22), SOFT)
  ]
});

export function templateWeek() {
  return { 0: sunday(), 1: weekday(), 2: weekday(), 3: weekday(), 4: weekday(), 5: weekday(), 6: saturday() };
}

/* A few things that happen once, relative to today so the sample always looks alive. */
export function sampleOnce(today, addDays) {
  return [
    { date: addDays(today, 1), block: B('dentist', 'Dentist', 'coral', 'tooth', h(13), h(14), FIXED) },
    { date: addDays(today, 3), block: B('date', 'Date night', 'us', 'heart', h(20), h(22)) },
    { date: addDays(today, 4), block: B('hike', 'Hike with Jo', 'mint', 'tree', h(13), h(16)) }
  ];
}

export function sampleTodos(today, addDays) {
  return [
    { id: 'td1', name: 'Renew passport', dur: 45, cat: 'home', icon: 'envelope', due: addDays(today, 3) },
    { id: 'td2', name: 'Call the plumber', dur: 15, cat: 'home', icon: 'wrench', due: addDays(today, 1) },
    { id: 'td3', name: 'Plan Robin’s birthday', dur: 60, cat: 'family', icon: 'cake', due: addDays(today, 9) },
    { id: 'td4', name: 'Return library books', dur: 30, cat: 'yours', icon: 'book', due: addDays(today, 5) },
    { id: 'td5', name: 'Fix the bike', dur: 60, cat: 'yours', icon: 'wrench' },
    { id: 'td6', name: 'Send the deck', dur: 30, cat: 'work', icon: 'note', done: true }
  ];
}

export function sampleMarkers(year) {
  return [
    { date: `${year}-02-14`, name: 'Valentine’s Day', icon: 'heart' },
    { date: `${year}-04-22`, name: 'Sam’s birthday', icon: 'cake' },
    { date: `${year}-07-04`, name: 'Fourth of July', icon: 'star' },
    { date: `${year}-10-31`, name: 'Halloween', icon: 'star' },
    { date: `${year}-11-21`, name: 'Robin’s birthday', icon: 'cake' },
    { date: `${year}-11-26`, name: 'Thanksgiving', icon: 'pot' },
    { date: `${year}-12-25`, name: 'Christmas', icon: 'tree' }
  ];
}

export const TRIPS = (year) => [
  { from: `${year}-03-14`, to: `${year}-03-18`, name: 'Spring trip' },
  { from: `${year}-07-02`, to: `${year}-07-07`, name: 'Lake week' },
  { from: `${year}-12-23`, to: `${year}-12-28`, name: 'Grandma’s' }
];
