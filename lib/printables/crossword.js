// Quick crossword builder: a hand-written clue bank and a seeded grid generator.
// Words interlock; any cell that is not part of a word is left blank.

const BANK = `
TEAPOT|Pot for brewing a cuppa
KETTLE|Boils the water for your tea
BISCUIT|Dunked in tea
SCONE|Served with jam and cream
CRUMPET|Toasted and buttered, full of holes
MARMITE|Love it or hate it spread
TOAST|Browned bread
PORRIDGE|Oats cooked in milk
OMELETTE|Folded egg dish
SOURDOUGH|Tangy fermented loaf
CASSEROLE|Slow-cooked dish in a lidded pot
WHISK|Beat eggs with this
SPATULA|Flat tool for flipping pancakes
COLANDER|Drains the pasta
SAUCEPAN|Pan with a long handle
GRATER|Shreds cheese
OVEN|Where cakes bake
SIMMER|Cook gently, just below boiling
GARLIC|Pungent bulb that vampires dislike
PEPPER|Salt's partner
CUSTARD|Yellow sauce for crumble
CRUMBLE|Fruit pudding with a rubbed-in topping
TRIFLE|Sponge, jelly, custard and cream
PARSNIP|Pale root vegetable for roasting
CABBAGE|Leafy green, often boiled
BEETROOT|Purple root that stains
LEEK|Long green vegetable, an emblem of Wales
RHUBARB|Pink stalks for a crumble
APPLE|Fell on Newton's head
ORCHARD|Where fruit trees grow
HEDGEROW|Wild strip of shrubs between fields
BADGER|Stripy-faced woodland digger
HEDGEHOG|Spiky garden visitor
SQUIRREL|Bushy-tailed nut hoarder
ROBIN|Red-breasted garden bird
BLACKBIRD|Garden songbird, the male has an orange beak
SPARROW|Small brown house bird
OTTER|River swimmer with webbed feet
FOX|Red-coated night prowler
OWL|Hooting night bird
HERON|Tall grey bird that wades
SWAN|Graceful white bird on the river
DUCKLING|Baby quacker
BUMBLEBEE|Fuzzy flower visitor
BUTTERFLY|Winged insect that was once a caterpillar
CONKER|Horse chestnut seed for a playground game
ACORN|Oak's seed
BRACKEN|Large fern on heathland
MOSS|Soft green carpet on stones
TOADSTOOL|Poisonous-looking fungus
MUSHROOM|Fungus you might forage for
PUFFBALL|Round fungus that releases a cloud of spores
TRUFFLE|Prized underground fungus
SPORE|Tiny fungal seed
MYCELIUM|A fungus's hidden network of threads
FORAGE|Search for wild food
LICHEN|Crusty growth on old walls and trees
FERN|Plant with feathery fronds
BLUEBELL|Spring woodland flower that carpets the ground
SNOWDROP|One of the first flowers of the year, white and drooping
DAFFODIL|Yellow spring trumpet
LAVENDER|Purple, fragrant and loved by bees
FOXGLOVE|Tall spires of purple bells
TULIP|Dutch spring bloom
DAISY|Lawn flower with white petals
PRIMROSE|Pale yellow spring flower
BLOSSOM|Spring flowers on a tree
TROWEL|Small garden spade
COMPOST|Rotted garden waste, a gardener's gold
SEEDLING|Young plant
GREENHOUSE|Glass home for tomatoes
HOSEPIPE|Waters the garden, unless there is a ban
PRUNING|Trimming back branches
WELLIES|Rubber boots for puddles
UMBRELLA|Rain shelter that blows inside out
PUDDLE|Muddy pool after rain
SCARF|Neck warmer
JUMPER|Woolly pullover
BOBBLE|The pompom on a woolly hat
SLIPPERS|Indoor footwear
BLANKET|Cosy throw
CANDLE|Wax light
FIRESIDE|Warm spot by the hearth
COCOA|Hot chocolate ingredient
PYJAMAS|Night attire
JIGSAW|Puzzle with interlocking pieces
CROSSWORD|Puzzle you are solving
SUDOKU|Number-grid puzzle
KOBO|E-reader you might be reading this on
LIBRARY|Place to borrow books
PAPERBACK|Cheap soft-covered book
CHAPTER|Part of a book
EPILOGUE|Closing section of a story
PROLOGUE|Opening section before chapter one
NOVEL|Long work of fiction
POEM|Verse
SONNET|Fourteen-line poem
ESSAY|Short piece of non-fiction writing
MEMOIR|Life story written by its subject
AUTHOR|Writer of a book
NARRATOR|Tells the story
BOOKMARK|Keeps your place
PLOT|A story's sequence of events
JOURNAL|Daily diary
PENCIL|Writes, and can be rubbed out
ERASER|Rubs out mistakes
NOTEBOOK|Jotter
STYLUS|Pen for a touchscreen
SUBSTACK|Newsletter platform for writers
NEWSLETTER|Regular email from a writer
THAMES|London's river
PUTNEY|Where the Boat Race starts
BRIDGE|Crosses a river
CHIMNEY|Smoke goes up it
COBBLES|Old rounded paving stones
TERRACE|Row of attached houses
PIGEON|City bird that coos
BUSKER|Street musician
MARKET|Stalls selling fresh food
PUB|Local with a pint
ALLEYWAY|Narrow passage between buildings
LIGHTHOUSE|Warns ships of rocks
SHINGLE|Pebbly beach
DRIFTWOOD|Wood washed up on the shore
HARBOUR|Sheltered port
ANCHOR|Holds a boat in place
PIER|Seaside walkway on stilts
LOBSTER|Red when cooked, with claws
SEAGULL|Chip-stealing seaside bird
TIDE|Rises and falls twice a day
DUNES|Sandy hills by the sea
PROMENADE|Seafront walk
ESTUARY|Where a river meets the sea
CASTLE|Fortified stone home
CATHEDRAL|Large, important church
HOLIDAY|Time off, or a break away
PASSPORT|Needed to go abroad
SUITCASE|Packed for a trip
TRAIN|Runs on rails
RAILWAY|Track for locomotives
BICYCLE|Two wheels and pedals
RAMBLE|Leisurely countryside walk
FOOTPATH|Public route across fields
STILE|Steps over a fence
HILL|Smaller than a mountain
VALLEY|Low land between hills
MEADOW|Grassy field of wildflowers
WOODLAND|Land covered in trees
BONFIRE|November night blaze
FIREWORK|Rocket on the fifth of November
HARVEST|Gathering the crops
PUMPKIN|Carved at Halloween
AUTUMN|Season of falling leaves
WINTER|Coldest season
SPRING|Season of new growth
SUMMER|Warmest season
FROST|Icy coating on the grass
SNOWMAN|Frosty figure with a carrot nose
THUNDER|Rumble after lightning
RAINBOW|Seven colours after a shower
FOG|Low cloud, hard to see through
BREEZE|Gentle wind
SUNRISE|Dawn
MOONLIGHT|Silvery night glow
STARS|Twinkle at night
BREAKFAST|Morning meal
SUPPER|Evening meal
PICNIC|Meal eaten on the grass
SANDWICH|Filling between bread
CHEESE|Cheddar or Stilton
BUTTER|Spread on toast
HONEY|Made by bees
JAM|Strawberry spread
GINGER|Spicy root, also a biscuit flavour
CINNAMON|Spice from bark
CARDAMOM|Fragrant spice in chai
NUTMEG|Grated spice on custard tart
VANILLA|Ice cream's classic flavour
CHOCOLATE|Cocoa product, a gift on Valentine's Day
CAKE|Birthday centrepiece
TEACUP|Holds your brew
BREW|Make tea
SOFA|Comfy seat for several
RADIATOR|Warms a room from the wall
PILLOW|Head rest in bed
DREAM|Story told in your sleep
SLEEP|Night rest
KITTEN|Young cat
PUPPY|Young dog
RETRIEVER|Dog that fetches
SPANIEL|Floppy-eared gundog
LABRADOR|Popular family dog, often golden or black
WALKIES|A dog's favourite word
LEAD|Dog's walking strap
BONE|Dog's chew
KINDNESS|Being nice to others
LAUGHTER|Sound of amusement
CALM|Peaceful
GENTLE|Soft and kind
COSY|Warm and snug
QUIET|Not loud
GRATITUDE|Feeling thankful
MORNING|Start of the day
`;

function parse(b) {
  return b
    .trim()
    .split("\n")
    .map((l) => {
      const i = l.indexOf("|");
      return { word: l.slice(0, i), clue: l.slice(i + 1) };
    });
}

export const WORDS = parse(BANK);

const KIDS_BANK = `
CAT|A pet that purrs
DOG|A pet that barks
FISH|It swims in water
BIRD|It has wings and feathers
FROG|Green, and it hops
DUCK|Quacks on the pond
HORSE|You can ride one
SHEEP|Gives us wool
COW|Gives us milk
PIG|Pink and goes oink
MOUSE|Squeaks and likes cheese
LION|King of the jungle
TIGER|A big cat with stripes
ZEBRA|A stripy horse
MONKEY|Swings in the trees
SNAKE|Long and it hisses
BEE|Makes honey
ANT|A tiny insect that works hard
SPIDER|Has eight legs and spins a web
OWL|A bird that says twit twoo
RABBIT|Long ears and a fluffy tail
TURTLE|Slow, with a shell
PENGUIN|A bird that cannot fly and loves ice
ELEPHANT|Big, grey, with a trunk
GIRAFFE|Very tall neck
SUN|It shines in the day
MOON|You see it at night
STAR|Twinkles in the sky
RAIN|Water falling from clouds
SNOW|White and cold, good for snowmen
CLOUD|White and fluffy in the sky
WIND|It blows the kites
TREE|It has leaves and a trunk
FLOWER|Pretty and smells nice
GRASS|Green and on the lawn
BEACH|Sand and sea
RIVER|Water flowing to the sea
HILL|A small mountain
RED|The colour of a tomato
BLUE|The colour of the sky
GREEN|The colour of grass
YELLOW|The colour of a banana
PINK|Mix red and white
BLACK|The colour of night
WHITE|The colour of snow
APPLE|A red or green fruit
BANANA|A long yellow fruit
ORANGE|A fruit and a colour
GRAPES|Small fruits that grow in bunches
CAKE|Eaten on your birthday
BREAD|Used to make toast
MILK|White drink from a cow
EGG|Laid by a hen
CHEESE|Mice love it
PIZZA|Round, with tomato and cheese
SOUP|Hot and eaten with a spoon
JUICE|Drink squeezed from fruit
BOOK|You read it
PEN|You write with it
SCHOOL|Where you learn
TEACHER|Helps you learn
DESK|You sit at it to work
BAG|You carry your things in it
CLOCK|Tells you the time
BED|Where you sleep
CHAIR|You sit on it
TABLE|You eat at it
DOOR|You open it to go out
HOUSE|Where you live
GARDEN|Where flowers grow
CAR|It has four wheels
BUS|Lots of people ride in it
TRAIN|It runs on tracks
BOAT|It floats on water
PLANE|It flies in the sky
BIKE|You pedal it
BALL|Round, and you can kick it
KITE|Flies on a string
DOLL|A toy that looks like a person
PUZZLE|Pieces that fit together
GAME|Something fun to play
SONG|You sing it
DRUM|You bang it
PAINT|Brushes use it
HAPPY|Feeling glad
SLEEP|What you do at night
SMILE|Shows you are happy
FRIEND|Someone you like to play with
MUM|Your mother
DAD|Your father
BABY|A very small child
HAND|It has five fingers
FOOT|You wear a shoe on it
NOSE|You smell with it
EYES|You see with them
EARS|You hear with them
HAT|Wear it on your head
SOCK|Goes on your foot
COAT|Keeps you warm outside
SHOE|Goes on your foot
KING|Wears a crown
QUEEN|Rules a kingdom
CASTLE|Where a king might live
DRAGON|Breathes fire in stories
`;

export const KIDS_WORDS = parse(KIDS_BANK);

const SIZE = 13;
const TARGET = 15;

function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fit(grid, dirs, word, x, y, dir) {
  const dx = dir === "A" ? 1 : 0;
  const dy = dir === "D" ? 1 : 0;
  const n = word.length;
  if (x < 0 || y < 0 || x + dx * (n - 1) >= SIZE || y + dy * (n - 1) >= SIZE) return -1;
  const bx = x - dx;
  const by = y - dy;
  if (bx >= 0 && by >= 0 && grid[by][bx]) return -1;
  const ex = x + dx * n;
  const ey = y + dy * n;
  if (ex < SIZE && ey < SIZE && grid[ey][ex]) return -1;
  let cross = 0;
  for (let i = 0; i < n; i++) {
    const cx = x + dx * i;
    const cy = y + dy * i;
    const g = grid[cy][cx];
    if (g) {
      if (g !== word[i]) return -1;
      if (dirs[cy][cx].includes(dir)) return -1;
      cross++;
    } else {
      const px = cx + dy;
      const py = cy + dx;
      const qx = cx - dy;
      const qy = cy - dx;
      if (px < SIZE && py < SIZE && grid[py][px]) return -1;
      if (qx >= 0 && qy >= 0 && grid[qy][qx]) return -1;
    }
  }
  return cross;
}

function attempt(rnd, words, target) {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
  const dirs = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => ""));
  const placed = [];
  const pool = shuffle(words, rnd).slice(0, 70);
  // longer words first make a sturdier skeleton
  pool.sort((a, b) => b.word.length - a.word.length + (rnd() - 0.5) * 3);
  for (const entry of pool) {
    if (placed.length >= target) break;
    const w = entry.word;
    let best = [];
    let bestScore = placed.length ? 1 : 0;
    if (!placed.length) {
      const y = Math.floor(SIZE / 2);
      const x = Math.floor((SIZE - w.length) / 2);
      best = [[x, y, "A"]];
    } else {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          for (const dir of ["A", "D"]) {
            const c = fit(grid, dirs, w, x, y, dir);
            if (c < 1) continue;
            if (c > bestScore) {
              bestScore = c;
              best = [[x, y, dir]];
            } else if (c === bestScore) best.push([x, y, dir]);
          }
        }
      }
    }
    if (!best.length) continue;
    const [x, y, dir] = best[Math.floor(rnd() * best.length)];
    const dx = dir === "A" ? 1 : 0;
    const dy = dir === "D" ? 1 : 0;
    for (let i = 0; i < w.length; i++) {
      grid[y + dy * i][x + dx * i] = w[i];
      dirs[y + dy * i][x + dx * i] += dir;
    }
    placed.push({ word: w, clue: entry.clue, x, y, dir });
  }
  return { grid, placed };
}

export function makeCrossword(rnd, bank = WORDS, target = TARGET) {
  let best = null;
  let bestScore = -1;
  for (let t = 0; t < 40; t++) {
    const r = attempt(rnd, bank, target);
    let minX = SIZE, minY = SIZE, maxX = 0, maxY = 0;
    for (const p of r.placed) {
      const dx = p.dir === "A" ? 1 : 0;
      const dy = p.dir === "D" ? 1 : 0;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + dx * (p.word.length - 1));
      maxY = Math.max(maxY, p.y + dy * (p.word.length - 1));
    }
    const area = (maxX - minX + 1) * (maxY - minY + 1);
    const score = r.placed.length * 1000 - area;
    if (score > bestScore) {
      bestScore = score;
      best = { ...r, minX, minY, maxX, maxY };
    }
  }
  const w = best.maxX - best.minX + 1;
  const h = best.maxY - best.minY + 1;
  const cells = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => best.grid[y + best.minY][x + best.minX]));
  const words = best.placed.map((p) => ({ ...p, x: p.x - best.minX, y: p.y - best.minY }));
  // number the start cells in reading order
  const numbers = [];
  const numAt = {};
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (words.some((p) => p.x === x && p.y === y)) {
        n++;
        numbers.push({ x, y, n });
        numAt[`${x},${y}`] = n;
      }
    }
  }
  for (const p of words) p.num = numAt[`${p.x},${p.y}`];
  const across = words.filter((p) => p.dir === "A").sort((a, b) => a.num - b.num);
  const down = words.filter((p) => p.dir === "D").sort((a, b) => a.num - b.num);
  return { cells, w, h, numbers, across, down };
}
