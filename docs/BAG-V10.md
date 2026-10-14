# The bag of letters

Two pictures for the setup's letter rack, rendered in Blender by `blender/build_bag.py`. They replace the flat CSS bag.

- `bag.png`: the bag pulled shut.
- `bag-open.png`: the same bag open, with four letter blocks showing: S (gold) standing up at the back, R (blue) and E (red) tipped against the rim, and A (plum) fallen out onto the desk.

Both are 512 x 512 with a transparent background and the bag's soft shadow baked in, cropped square around the bag and its shadow with a few px clear at the edges. They're made to be shown at about 70 to 110 CSS px.

## What the model is

- A felt drawstring pouch, squat and wider than tall, sitting a little slumped: its bottom spread flat on the desk, its neck leaning, its gathered top flopped to one side.
- The cloth is a surface of revolution with gathers pushed into it. Below the cord, ridges start at the neck and fan out down the slack cloth with creases between them, fading out where the letters fill the bag. Above the cord, a ruffled header (shut) or a loose collar (open). The cloth has real thickness (felt, about 3 mm at this scale) and one level of smoothing.
- The cord is a fat three strand cotton cord: a loop pulled into the gathered neck, tied at the front, and two ends. One end lies over the belly and finishes in a knot on the cloth; the other drops onto the desk and finishes in a knot there. The ends are laid over the cloth by ray casts, so they rest on the folds instead of passing through them.
- The letters are Sunday Reset's own blocks, not game tiles (Russell's call: nothing that reads as Scrabble). Each is a chunky rounded brick in one board color, its bottom edge a shade darker, with a bold rounded capital printed on top and no numbers anywhere. More blocks are heaped inside, mostly hidden.
- There is no text on the bag.

## Colors

| Part | Color |
| --- | --- |
| Felt | base `#46735C`, blotched toward `#406B55`, a soft sheen at grazing angles (`#A9C4A7`) |
| Felt as rendered | median `#334F3C`, middle half `#2E4331` to `#395641`: inside the lamp shade's `#2F4A38` to `#3F5C46` |
| Inside of the cloth | `#33523F` |
| Cord | `#DDCB9D`, cream |
| Gold block | `#EFB940`, bottom edge `#C08F22`, letter `#4B3A18` |
| Red block | `#B84A38`, bottom edge `#8E3527`, white letter |
| Plum block | `#8A5AA6`, bottom edge `#68407F`, white letter |
| Blue block | `#2D6EA6`, bottom edge `#1F5180`, white letter |
| Green block | `#3B7F45`, bottom edge `#2A5E32`, white letter (only in the heap: a green block on a green bag disappears) |

The felt's base color is lighter and a touch cooler than the target because most of the cloth faces sideways and the warm light takes some blue out; what reaches the screen is in the target range. Everything is matte: rough, low specular, no gloss. The letters are Arial Rounded MT Bold from macOS; without it the script falls back to Arial Bold, then to Blender's own font thickened.

## Where the light comes from

- Key: warm (1.0, 0.89, 0.72), a soft sun 56 degrees up, behind the bag and 22 degrees left of straight behind, the way the app's key sits above and behind the work. Its shadow falls toward you and a little to the right.
- Sky: a faint warm sky over everything, for the soft contact shadow, plus fifteen soft lamps around the sky that light only the bag, its cord, and its blocks (Blender's light linking). In the app the sky is a hemisphere light that casts no shadow, so here it shades the cloth (the folds, the inside of the mouth) without laying a wide gray ring on the desk.
- Fill: a soft sun with no shadow from the camera's right, 40 degrees up, so the front of the bag isn't black.
- The desk is a shadow catcher. It also gets a shadowless light of its own, so the key's shadow takes away a little under half the light at its darkest, about as the app's does.
- Standard view transform and no tone curve, like the app.

## Camera

Perspective, looking down 38 degrees, from 24 degrees to the bag's left, so the bag reads as turned. Two quick framing passes find the bag and its shadow, then the lens and shift are set so they fill the square, and the last few pixels at the border fade to clear so a faint shadow is never cut hard.

## How to rebuild

From the repo root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/build_bag.py
```

- About 100 seconds for both on an M4 Pro (Cycles on the GPU, 640 samples, denoised). Needs Blender 4.0 or later for light linking; made with 5.2.2. Nothing is downloaded.
- Options after the script: `-- out=<dir>` writes somewhere else, `only=shut` or `only=open` makes one picture, `fast` uses fewer samples, and `views` adds plain side, front, and top views of each bag for checking the shape.
- Run it from a normal shell. Inside an agent's sandbox Blender crashes at launch while it checks the GPU.
- The knobs: `SHUT` and `OPEN` (the profile, the folds, the lean), each bag's cord `ends` in `build_shut` and `build_open`, `BLOCKS` and the `heroes` list, `CAM_EL` and `CAM_AZ` for the camera, `KEY_EL` and `KEY_SIDE` for the key. The shapes come out the same every time (fixed seeds); the render noise can differ by a hair between machines.

## What's not quite there

- The cloth is modeled, not simulated. The gathers read at display size; up close the lower body is smoother than real felt, and the knots are a coil standing in for an overhand knot.
- At 80 px the letters on the blocks are about 5 px tall: R and E read, S is mostly a gold block with a mark.
- The files are about 260 and 290 KB. A palette quantizer would make them much smaller at this display size; none was on the machine.
- The shadow is baked for one light. Over the dark leather mat the bag reads by its sheen and the cream cord more than by its outline.
