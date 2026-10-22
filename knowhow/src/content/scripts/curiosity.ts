import type { EpisodeScript } from "@/lib/types";
import { ep } from "./helpers";

/** Rabbit Holes (daily standalone episodes) and Why We Fall in Love. */
export const CURIOSITY_SCRIPTS: Record<string, EpisodeScript> = {
  "rabbit-holes-1": ep({
    hook: "Why do we dream? Nobody fully knows. But scientists have some very good clues. And one of them involves a cat, a lab in France, and a very strange night.",
    story: [
      "In 1953, researchers in Chicago, Eugene Aserinsky and Nathaniel Kleitman, noticed that sleepers' eyes darted around under their lids at certain times of night. Wake people up during those periods, and they very often reported vivid dreams. They'd found REM sleep, short for rapid eye movement.",
      "During REM, your brain is extremely active. Yet your body is almost completely still. Your brainstem switches off most of your muscles, a kind of temporary paralysis, so you don't act out what you're dreaming.",
      "That's where the cat comes in. In the late nineteen fifties and sixties, the French scientist Michel Jouvet studied sleeping cats. When a tiny part of the brainstem was damaged, the cats no longer had that paralysis during REM. And they seemed to act out their dreams: lifting their heads, stalking, even pouncing on nothing, while still asleep.",
    ],
    facts: [
      "Most people spend around two hours a night in REM sleep, spread across several cycles, with the longest REM periods toward the morning. That's one reason dreams you remember often come just before waking.",
      "There are several leading theories of why we dream. One says dreaming helps process memories and emotions. Another, the threat simulation theory, suggests dreams let us rehearse dangerous situations safely. And an older idea says dreams are the brain trying to make a story out of random signals. They may all be partly right.",
    ],
    insight: "Here's the lovely thing. Every night, your brain runs an experience nobody else can see, with its own physics and its own logic. Science can describe when it happens and what it looks like in the brain. What it means is still one of the great open questions.",
    outro: "Fancy another? Tomorrow's rabbit hole asks why yawning is contagious. Fair warning: you'll probably yawn.",
    insights: [
      "REM sleep was discovered in 1953 by Aserinsky and Kleitman.",
      "During REM sleep, your brainstem paralyses most of your muscles so you don't act out your dreams.",
      "Most people spend about two hours a night in REM sleep.",
    ],
    challenge: {
      question: "What happens to most of your muscles during REM sleep?",
      options: ["They tense up", "They're temporarily paralysed", "They twitch constantly", "Nothing changes"],
      answer: 1,
      explain: "Your brainstem switches off most muscle activity during REM so you don't act out your dreams. Jouvet's cats showed what happens without it.",
    },
  }),
  "rabbit-holes-2": ep({
    hook: "You're probably going to yawn during this episode. Maybe you just did. And nobody is quite sure why yawning spreads from person to person like a rumour.",
    story: [
      "Spontaneous yawning, the kind you do when tired or bored, is ancient. Fish yawn. Birds yawn. Even human babies yawn before they're born. But contagious yawning, catching a yawn from someone else, is much rarer in the animal kingdom.",
      "Seeing someone yawn, hearing a yawn, even reading about yawning, can trigger it. Studies vary, but often somewhere around half of adults will catch a yawn in experiments. Interestingly, young children are much less susceptible. Contagious yawning seems to develop over the first several years of life.",
      "One of the most interesting findings came from researchers in Italy, Ivan Norscia and Elisabetta Palagi. Observing people in everyday life, they found yawns spread most strongly between family members, then friends, then acquaintances, and least between strangers.",
    ],
    facts: [
      "Dogs can catch yawns from humans, and some studies suggest they're more likely to catch them from their owners than from strangers.",
      "Why yawn at all? One idea is that yawning helps cool the brain, drawing in air and increasing blood flow. Another is that it signals a change in state, like getting ready to sleep or wake up, which could help a group synchronise.",
    ],
    insight: "So contagious yawning might be a tiny social signal. A reflex that links you to the people around you, especially the ones you care about. If you yawned at this episode, consider it a compliment.",
    outro: "Next rabbit hole: why does time seem to speed up as you get older? Summer holidays used to last forever. Where did they go?",
    insights: [
      "Yawns spread most strongly between family, then friends, then acquaintances, then strangers.",
      "Young children are much less susceptible to contagious yawning than adults.",
      "Dogs can catch yawns from humans — possibly more from their owners.",
    ],
    challenge: {
      question: "Between whom do yawns spread most easily, according to Norscia and Palagi?",
      options: ["Strangers", "Acquaintances", "Family members", "Coworkers"],
      answer: 2,
      explain: "Contagion was strongest among family, then friends, then acquaintances, and weakest among strangers.",
    },
  }),
  "rabbit-holes-3": ep({
    hook: "When you were eight, the summer holidays lasted about a hundred years. Now a whole year can disappear while you're still writing the wrong date on things. Time didn't change. You did.",
    story: [
      "One popular explanation is proportional. When you're ten, one year is a tenth of your entire life. When you're fifty, it's a fiftieth. Each year becomes a smaller slice of your total experience, so it may feel shorter.",
      "But psychologists think memory plays a big role too. When we look back on a stretch of time, our brain estimates how long it was partly by how many distinct memories it contains. Childhood is packed with firsts: first day of school, first time at the sea, first heartbreak. Lots of new memories, so in hindsight it feels long.",
      "Adult life often settles into routine. Same commute, same desk, same Tuesday. Routine creates fewer distinct memories, so when you look back, the months compress.",
    ],
    facts: [
      "The writer and psychologist Claudia Hammond describes something called the holiday paradox. While you're on a great holiday, time seems to fly. But when you look back, that holiday feels long, because it's full of new memories.",
      "Some research suggests that when people pay closer attention to novel experiences, their sense of how much time has passed changes. It's one reason trying new things is often suggested as a way to make life feel fuller.",
    ],
    insight: "So if you want a longer feeling life, the answer might not be slowing down. It might be novelty. New places, new skills, new people. Each one is a marker your memory can use to stretch time back out.",
    outro: "Tomorrow, a softer rabbit hole: why do cats purr? It isn't always because they're happy.",
    insights: [
      "At ten, a year is a tenth of your life. At fifty, it's a fiftieth.",
      "The holiday paradox: time flies on a great holiday, but it feels long when you look back.",
      "Novelty creates memory markers that make time feel longer in hindsight.",
    ],
    challenge: {
      question: "According to the memory explanation, why does childhood feel long in hindsight?",
      options: ["Children sleep more", "It's packed with new, distinct memories", "Clocks were slower", "Children can't tell time"],
      answer: 1,
      explain: "Looking back, we judge duration partly by how many distinct memories a period holds. Childhood is full of firsts.",
    },
  }),
  "rabbit-holes-4": ep({
    hook: "A cat curled up on your lap, purring. Pure happiness, right? Mostly. But cats also purr when they're injured, frightened, or giving birth. The purr is more complicated than it sounds.",
    story: [
      "For a long time, nobody was totally sure how cats purr. The current best explanation is that muscles in the cat's larynx, its voice box, twitch rapidly, opening and closing the space between the vocal cords many times a second. Air vibrates as the cat breathes in and out, which is why a purr can be continuous.",
      "Kittens purr from just a few days old, often while nursing. One idea is that purring started as a signal between kittens and their mother: I'm here, I'm fine, keep feeding me.",
      "As adults, cats keep purring in all sorts of situations. Contentment, yes. But also when stressed or in pain, which suggests purring may sometimes be a form of self soothing.",
    ],
    facts: [
      "In 2009, researchers led by Karen McComb studied what they called the solicitation purr. Cats asking for food sometimes embed a higher pitched cry inside the purr. People rated these purrs as more urgent and less pleasant, even people who didn't own cats. It sounds a little like a baby's cry.",
      "You may have heard that the frequencies of a purr can heal bones. It's an intriguing hypothesis, but there isn't strong evidence for it yet.",
    ],
    insight: "So a purr isn't one message. It's more like a tone of voice. The same sound can mean I'm happy, I'm hurting, or feed me now. Context is everything, for cats, and honestly, for humans too.",
    outro: "Next rabbit hole: why onions make you cry. It turns out your chopping board is a tiny chemical battlefield.",
    insights: [
      "Cats purr by rapidly twitching muscles in the larynx.",
      "The 'solicitation purr' hides a high-pitched cry that humans find urgent.",
      "The idea that purring heals bones is a hypothesis without strong evidence yet.",
    ],
    challenge: {
      question: "Which of these is true about purring?",
      options: ["Cats only purr when happy", "Cats also purr when stressed or in pain", "Purring is proven to heal bones", "Only adult cats purr"],
      answer: 1,
      explain: "Cats purr in many situations, including pain and stress. Kittens purr from a few days old, and the bone-healing idea isn't proven.",
    },
  }),
  "rabbit-holes-5": ep({
    hook: "Every time you chop an onion, it fights back. Your tears are the result of a tiny chemical weapon the onion assembles in under a second.",
    story: [
      "A whole onion is calm. Its cells hold sulfur containing compounds, and separately, an enzyme. Keep them apart, and nothing happens. But when your knife slices through cells, the walls between them break, and the ingredients mix.",
      "The enzyme turns those sulfur compounds into reactive molecules. Then a second enzyme, discovered by Japanese researchers in 2002 and called lachrymatory factor synthase, converts them into a volatile gas with a delightful name: syn propanethial S oxide.",
      "That gas floats up to your eyes, where it irritates the nerves in the surface of the eye. Your body responds the way it does to any irritant. It floods your eyes with tears to wash it away.",
    ],
    facts: [
      "Scientists think this is a defence. Animals that bite into an onion get a nasty chemical surprise, which might discourage them from eating more.",
      "Some practical tips actually help. A very sharp knife damages fewer cells. Chilling the onion first slows the chemical reactions and makes the gas less volatile. And plant breeders have developed onion varieties marketed as tearless.",
    ],
    insight: "The onion is a lovely reminder that a lot of everyday experiences are chemistry in disguise. Flavour, smell, even crying in your kitchen: they're all reactions you can understand, and sometimes outsmart.",
    outro: "That's it for this rabbit hole. Want more? Come back tomorrow for a fresh one, or dive into a full series in the same universe.",
    insights: [
      "Onions only release their tear gas when cutting mixes compounds that were kept apart in the cells.",
      "The tear-making enzyme, lachrymatory factor synthase, was identified in 2002.",
      "A sharp knife and a chilled onion really do reduce tears.",
    ],
    challenge: {
      question: "Why does a chilled onion make you cry less?",
      options: ["Cold kills the enzyme permanently", "Cold slows the reactions and makes the gas less volatile", "Cold onions have no sulfur", "It's a myth"],
      answer: 1,
      explain: "Chilling slows the chemistry and makes the irritating gas less volatile, so less reaches your eyes.",
    },
  }),

  // ───────────────────────────────────────── WHY WE FALL IN LOVE
  "why-we-fall-in-love-1": ep({
    hook: "Falling in love looks a lot like addiction on a brain scan. That's not a metaphor from a pop song. It's what researchers found when they put people in love inside an MRI machine.",
    story: [
      "In the early two thousands, the anthropologist Helen Fisher and colleagues, including Arthur Aron and Lucy Brown, recruited people who said they were intensely, madly in love. They showed them photos of their beloved inside a brain scanner, then photos of a familiar acquaintance.",
      "When people looked at the person they loved, areas tied to the brain's reward system lit up, including the ventral tegmental area, a region that produces dopamine. That's the same broad system involved in motivation, craving and wanting.",
      "That fits how early love feels. The obsessive thinking. Checking your phone. Energy, focus, and a little bit of madness. Researchers have argued that romantic love behaves less like an emotion and more like a drive, closer to hunger than to happiness.",
    ],
    facts: [
      "A 1999 study by Donatella Marazziti found that people in the early stages of romantic love had reduced levels of a serotonin marker in their blood, similar to levels seen in people with obsessive compulsive disorder. It's one possible clue to why you can't stop thinking about someone.",
      "Over time, for many couples, intense passionate love changes into what researchers call companionate love: deep attachment, trust and comfort. Hormones like oxytocin are thought to play a role in that bonding.",
    ],
    insight: "So that feeling of being completely consumed by someone isn't you being dramatic. It's an ancient reward system doing exactly what it evolved to do: making you want, very badly, to be close to one particular person.",
    outro: "But why that person, out of all the people in the world? Next time: what attraction actually is, and why the answer is more ordinary than you'd think.",
    insights: [
      "Looking at a loved one activates dopamine-rich reward areas like the ventral tegmental area.",
      "Early romantic love may behave more like a drive, closer to hunger, than an emotion.",
      "Passionate love often transforms into companionate love: attachment, trust and comfort.",
    ],
    challenge: {
      question: "Which brain system lit up when people looked at a person they loved?",
      options: ["The pain system", "The reward system", "The vision system only", "Nothing changed"],
      answer: 1,
      explain: "Reward areas rich in dopamine, like the ventral tegmental area, became active, the same broad system behind wanting and craving.",
    },
  }),
  "why-we-fall-in-love-2": ep({
    hook: "Want to know the single best predictor of who you'll become friends with, or even fall for? It's not looks, or personality. It's distance. Literally how close you live.",
    story: [
      "In 1950, the psychologists Leon Festinger, Stanley Schachter and Kurt Back studied friendships in a student housing complex at MIT. Residents were assigned apartments more or less at random. And yet friendships followed the floor plan. People were far more likely to be friends with their next door neighbours than with someone just a few doors further away.",
      "This is called the proximity effect. Being near someone means more chances to interact, and interacting builds familiarity.",
      "And familiarity is powerful. The psychologist Robert Zajonc showed that people tend to like things more simply because they've seen them more often, even nonsense words and shapes. It's called the mere exposure effect.",
    ],
    facts: [
      "In a clever 1992 study, researchers had four women attend a large university class a different number of times: zero, five, ten or fifteen sessions. They never spoke to anyone. At the end of term, students rated the women who'd attended more often as more attractive.",
      "Similarity matters too. Despite the saying, research generally finds that people are attracted to partners who share their values, attitudes and interests. Opposites attract makes for great films, but not usually great data.",
    ],
    insight: "That's both unromantic and hopeful. Attraction isn't just written in the stars. A lot of it is built from showing up, again and again. The people you fall for are often the ones who are simply there.",
    outro: "Next time on Why We Fall in Love: the famous thirty six questions, and the experiment that tried to make two strangers fall in love in under an hour.",
    insights: [
      "In a 1950 MIT housing study, friendships followed the floor plan: neighbours became friends.",
      "The mere exposure effect: we tend to like things more simply because we've seen them more.",
      "Attraction is built from showing up, again and again.",
    ],
    challenge: {
      question: "What did the 1992 classroom study find?",
      options: ["Students ignored all four women", "Women who attended more were rated more attractive", "Talking was required for attraction", "Attendance made people less likeable"],
      answer: 1,
      explain: "More exposure, with no conversation at all, led to higher attractiveness ratings: the mere exposure effect in action.",
    },
  }),
};
