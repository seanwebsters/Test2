import type { WorldSpec } from "../types";
import { C } from "../criteria";

const imageCriteria = [
  C.has("subject", "Subject", "Say clearly what's in the picture.", ["\\b(a|an|the|two|three)\\b"]),
  C.has("style", "Style", "Name a style: watercolour, 3D render, photo, flat illustration, oil painting…", ["watercolou?r", "3d", "render", "photo", "illustrat", "painting", "cartoon", "pixel", "anime", "sketch", "minimal", "flat", "vintage", "retro", "realistic", "clay", "poster"]),
  C.has("mood", "Mood & light", "Add mood or lighting: golden hour, cosy, dramatic, pastel…", ["golden", "sunset", "sunrise", "night", "cosy|cozy", "dramatic", "soft", "bright", "moody", "pastel", "warm", "cool", "neon", "light", "calm", "dreamy", "vibrant"]),
  C.has("composition", "Composition", "Describe framing or setting: close-up, wide shot, background, from above…", ["close[- ]up", "wide", "background", "foreground", "from above", "view", "centered|centred", "portrait", "landscape", "scene", "in (a|the)", "on (a|the)"]),
];

export const w5: WorldSpec = {
  id: "w5",
  n: 5,
  title: "Get Creative",
  tagline: "Images, stories, video, music and design",
  description: "Generate images, videos, stories, music and designs.",
  plus: true,
  theme: { from: "#EC4899", to: "#8B5CF6", accent: "#F9A8D4", ground: "#A3DDA0", ground2: "#7FCB7B", icon: "🎨", landmark: "palette" },
  lessons: [
    {
      title: "Your first AI image",
      subtitle: "Words become pictures",
      skill: "creative",
      steps: [
        {
          kind: "teach",
          title: "Describe it like a director",
          body: "Image generators turn descriptions into pictures. The best prompts describe the subject, style, mood and composition.",
          example: { label: "Prompt", text: "A cosy reading nook by a rainy window, warm lamp light, watercolour illustration, soft pastel colours" },
          mood: "wow",
        },
        {
          kind: "build",
          question: "Build an image prompt from the strongest pieces.",
          pieces: ["A red fox curled up asleep", "in a snowy forest at dawn", "soft golden light", "children's book watercolour style"],
          distractors: ["nice picture", "make it cool"],
          explain: "Subject, setting, light and style. That's a picture you can see before it's made.",
        },
        {
          kind: "image",
          task: {
            title: "Generate your first image",
            brief: "Describe an image you'd love to see — a dream holiday spot, your pet as a superhero, a cosy café. Include subject, style, mood and composition.",
            placeholder: "A … in a … , … style, … lighting",
            criteria: imageCriteria,
          },
        },
      ],
    },
    {
      title: "The language of style",
      subtitle: "Words artists use",
      skill: "creative",
      steps: [
        {
          kind: "teach",
          title: "Your style vocabulary",
          body: "A few words change everything. Try mediums (watercolour, clay, oil), lighting (golden hour, neon), camera terms (close-up, wide angle) and eras (1970s, art deco).",
          mood: "happy",
        },
        {
          kind: "sort",
          question: "Is this a lighting word or a medium?",
          bins: ["Lighting", "Medium"],
          items: [
            { text: "Golden hour", bin: 0 },
            { text: "Watercolour", bin: 1 },
            { text: "Neon glow", bin: 0 },
            { text: "Clay sculpture", bin: 1 },
          ],
          explain: "Combine one of each for striking results.",
        },
        {
          kind: "compare",
          question: "Which prompt will produce a more distinctive image?",
          a: "A city at night",
          b: "A rainy Tokyo side street at night, neon reflections in puddles, cinematic wide shot, 35mm film photo",
          answer: "b",
          explain: "Setting, light, framing and medium make it unique.",
        },
        {
          kind: "image",
          task: {
            title: "Same subject, new style",
            brief: "Pick a simple subject (a teapot, a lighthouse, a bicycle) and describe it in a bold style of your choice.",
            placeholder: "A lighthouse … in the style of …",
            criteria: imageCriteria,
          },
        },
      ],
    },
    {
      title: "Stories and poems",
      subtitle: "Co-write with AI",
      skill: "creative",
      steps: [
        {
          kind: "teach",
          title: "You're the author",
          body: "AI is a brilliant co-writer. Give it characters, setting, tone and length — then steer the plot. The best stories still need your ideas.",
          mood: "wink",
        },
        {
          kind: "multi",
          question: "What makes a bedtime story prompt great?",
          options: ["Child's name and age", "Their favourite things", "Length (e.g. 3 minutes to read)", "The child's school address"],
          answers: [0, 1, 2],
          explain: "Personal touches and length. Never share addresses.",
        },
        {
          kind: "write",
          task: {
            title: "A story for someone",
            brief: "Ask AI for a short story or poem for a real person or occasion — with characters, tone and length.",
            placeholder: "Write a … story for … about … Tone: … Length: …",
            criteria: [C.detail(20), C.has("character", "Characters", "Who is in it?", ["about (a|an|my)", "named", "called", "character", "hero", "who"]), C.tone(), C.constraints()],
            demo: {
              strong: "**Milo and the Moon Biscuit** (≈3-minute read)\n\nMilo, who was five and three-quarters, was absolutely certain the moon was a biscuit.\n\n\"It's round,\" he told his dog, Pickle. \"And it's got bites out of it.\"\n\nThat night, Pickle and Milo built a rocket from a laundry basket, two wooden spoons and a very brave teddy…\n\n*(continues for 4 more short scenes, ending with Milo falling asleep as the moon 'winks' at him)*\n\nWould you like it in rhyme, or with a bit more adventure in the middle?",
              weak: "Once upon a time there was a child who went on an adventure. The end.",
            },
          },
        },
      ],
    },
    {
      title: "Spot the fake",
      subtitle: "AI images and deepfakes",
      skill: "critical",
      steps: [
        {
          kind: "teach",
          title: "Seeing isn't believing",
          body: "AI can create realistic photos, voices and videos of things that never happened. Check the source, look for odd details, and search for other reporting before sharing.",
          bullets: ["Who posted it first? Is it a trusted source?", "Odd hands, text, reflections or backgrounds", "Emotional, urgent content deserves extra caution"],
          mood: "oops",
        },
        {
          kind: "multi",
          question: "Which are warning signs that a viral image might be AI-generated or fake?",
          options: ["Garbled text on signs", "Posted by an anonymous account with no source", "Covered by several reputable news outlets", "Hands with six fingers"],
          answers: [0, 1, 3],
          explain: "Reputable coverage is a good sign. The others are classic red flags.",
        },
        {
          kind: "choice",
          question: "You get a voice message from your 'son' asking for £500 urgently from a new number. Best move?",
          options: ["Send the money quickly", "Hang up and call him on his usual number", "Reply with your bank details"],
          answer: 1,
          explain: "Voice cloning scams are real. Verify through a channel you trust. Consider a family 'safe word'.",
        },
        {
          kind: "spot",
          question: "Tap the claims in this viral post that should make you suspicious.",
          sentences: [
            { text: "BREAKING: photo shows a shark swimming down a city high street!", wrong: true },
            { text: "Share before it gets deleted!!!", wrong: true },
            { text: "Local council confirms some roads are flooded after heavy rain." },
            { text: "No source, no photographer named.", wrong: true },
          ],
          explain: "Sensational claims, pressure to share and no sources are classic misinformation signals.",
        },
      ],
    },
    {
      title: "Video in a sentence",
      subtitle: "Text-to-video basics",
      skill: "creative",
      steps: [
        {
          kind: "teach",
          title: "Describe the shot",
          body: "Video tools (like Runway, Sora, Veo or Pika) turn text or images into short clips. Describe subject, action, camera movement and mood — like a film director.",
          example: { label: "Prompt", text: "Slow drone shot over misty Scottish hills at sunrise, a lone hiker walking along a ridge, cinematic" },
          mood: "wow",
        },
        {
          kind: "build",
          question: "Order this video prompt the way a director would describe it.",
          pieces: ["Close-up of coffee being poured", "steam rising in slow motion", "camera slowly pulls back", "warm morning café light"],
          ordered: true,
          explain: "Shot → action → camera movement → mood.",
        },
        {
          kind: "choice",
          question: "What's a realistic expectation of today's AI video tools?",
          options: ["A full feature film from one prompt", "Short clips that may need several tries", "Perfect results every time"],
          answer: 1,
          explain: "Short clips, some retries — and stitching clips together for longer pieces.",
        },
        {
          kind: "multi",
          question: "Which uses of AI video are responsible?",
          options: ["Animated explainer for your small business", "Fake video of a politician saying something", "B-roll for a family holiday montage", "Video of a real colleague without consent"],
          answers: [0, 2],
          explain: "Never create realistic depictions of real people without consent, or anything designed to deceive.",
        },
      ],
    },
    {
      title: "Music and voice",
      subtitle: "Songs, jingles and narration",
      skill: "creative",
      steps: [
        {
          kind: "teach",
          title: "Make some noise",
          body: "Music tools (like Suno or Udio) create songs from a description. Voice tools (like ElevenLabs) create natural narration. Describe genre, mood, tempo and instruments.",
          mood: "cheer",
        },
        {
          kind: "compare",
          question: "Which music prompt is stronger?",
          a: "A good song",
          b: "Upbeat acoustic folk song about a family road trip to Cornwall, ukulele and hand claps, 100 bpm, singalong chorus",
          answer: "b",
          explain: "Genre, topic, instruments, tempo and structure.",
        },
        {
          kind: "choice",
          question: "Is it okay to clone a friend's voice for a birthday surprise?",
          options: ["Yes, always", "Only with their clear permission", "Only if it's funny"],
          answer: 1,
          explain: "A voice is personal data. Consent first — always.",
        },
        {
          kind: "write",
          task: {
            title: "Write a jingle brief",
            brief: "Write a prompt for a 30-second jingle for a real or imaginary business, club or event.",
            placeholder: "A 30-second … jingle for … mood … instruments …",
            criteria: [C.detail(15), C.has("genre", "Genre", "Name a genre or vibe.", ["pop", "folk", "jazz", "rock", "electronic", "lofi|lo-fi", "acoustic", "orchestral", "hip[- ]hop", "funk", "indie", "upbeat"]), C.has("instruments", "Instruments", "Add instruments or sounds.", ["guitar", "piano", "ukulele", "drum", "synth", "strings", "brass", "whistl", "clap", "bass", "vocal"]), C.has("lyrics", "Words", "Include a name or lyric to feature.", ["lyric", "sing", "chorus", "line", "name", "\""])],
            demo: {
              strong: "**Jingle brief ready to paste into a music tool:**\n\nStyle: bright acoustic pop, 110 bpm, ukulele, hand claps, glockenspiel sparkle\nLength: 30 seconds — 8-bar verse, 4-bar hook\nVocals: warm, friendly female lead + group 'hey!'\nHook lyric: \"Fresh bread, fresh day — at Rosie's on the way!\"\nMood: sunny Saturday morning, local and welcoming\n\nTip: generate 3–4 versions and pick the catchiest hook.",
              weak: "Make a catchy jingle.",
            },
          },
        },
      ],
    },
    {
      title: "Design with AI",
      subtitle: "Logos, posters and invites",
      skill: "creative",
      steps: [
        {
          kind: "teach",
          title: "From idea to design",
          body: "AI can create logo concepts, posters and invitations. Generate options, pick a direction, then refine in tools like Canva or Adobe Express. Text in images is still tricky — add it afterwards.",
          mood: "happy",
        },
        {
          kind: "choice",
          question: "AI's poster has misspelled words in it. Best fix?",
          options: ["Use it anyway", "Generate the artwork without text, then add text in a design tool", "Give up"],
          answer: 1,
          explain: "Image models often garble text. Add your words in Canva, Keynote or similar.",
        },
        {
          kind: "image",
          task: {
            title: "Design a poster background",
            brief: "Create artwork for a poster or invite — a garden party, a quiz night, a bake sale. Ask for no text so you can add it later.",
            placeholder: "Poster artwork for a … , … style, … colours, no text",
            criteria: [...imageCriteria.slice(0, 3), C.has("notext", "No text", "Add 'no text' so you can add clean typography later.", ["no text", "without text", "no words", "text-free"])],
          },
        },
      ],
    },
    {
      title: "Create responsibly",
      subtitle: "Copyright, credit and consent",
      skill: "safety",
      steps: [
        {
          kind: "teach",
          title: "Be a good creative citizen",
          body: "Don't pass off AI work as hand-made where it matters, respect artists (avoid copying living artists' names for commercial work), and never create realistic images of real people without consent.",
          mood: "thinking",
        },
        {
          kind: "sort",
          question: "Fine to make, or best avoided?",
          bins: ["Fine", "Avoid"],
          items: [
            { text: "A cartoon of your own dog as a pirate", bin: 0 },
            { text: "A realistic photo of a celebrity endorsing your product", bin: 1 },
            { text: "Abstract artwork for your living room", bin: 0 },
            { text: "Entering AI art in a 'hand-drawn' competition", bin: 1 },
          ],
          explain: "Fun, personal and honest — yes. Deceptive or without consent — no.",
        },
        {
          kind: "choice",
          question: "Selling AI-generated designs on mugs. What should you check?",
          options: ["Nothing", "The tool's terms for commercial use, and that designs don't copy trademarks", "Only the mug colour"],
          answer: 1,
          explain: "Commercial use rules vary by tool, and trademarks still apply.",
        },
        {
          kind: "choice",
          question: "A friend shares an AI image of a 'real' event. You're not sure it's real. What do you do?",
          options: ["Share it — it's interesting", "Don't share until you've checked a reliable source", "Add 'not sure if real' and share anyway"],
          answer: 1,
          explain: "Pausing before sharing is the single best defence against misinformation.",
        },
      ],
    },
  ],
  boss: {
    title: "World 5 Challenge",
    subtitle: "A creative campaign",
    skill: "creative",
    task: {
      title: "Launch a mini campaign",
      brief: "Your friend's café is launching a pumpkin spice cinnamon bun. Ask AI for a mini campaign: a tagline, an Instagram caption and an image prompt for the poster.",
      placeholder: "Create a mini campaign for … Include … Tone … Audience …",
      output: "list",
      criteria: [C.detail(25), C.has("deliverables", "Deliverables", "List exactly what you want: tagline, caption, image prompt…", ["tagline", "caption", "image prompt", "poster", "slogan", "post"]), C.tone(), C.has("audience", "Audience", "Who are you trying to reach?", ["audience", "customers", "locals", "students", "families", "commuters", "for (people|young|busy)"])],
      demo: {
        strong: "**Tagline:** Autumn, rolled up. 🍂\n\n**Instagram caption:**\nMeet the bun you'll be dreaming about until spring. Pumpkin spice + cinnamon + gooey cream cheese glaze 🧡 Fresh every morning from Saturday — first 20 each day get a free oat latte upgrade. Tag who you're bringing! #AutumnRolledUp\n\n**Poster image prompt:**\n\"Close-up of a glossy cinnamon bun with orange-spiced glaze on a rustic wooden board, autumn leaves and a steaming latte in the background, warm golden morning light, shallow depth of field, food photography, no text\"\n\nWant three alternative taglines?",
        weak: "Try our new bun! It's delicious. Come and get one.",
      },
    },
  },
};
