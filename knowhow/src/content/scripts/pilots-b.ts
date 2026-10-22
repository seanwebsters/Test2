import type { EpisodeScript } from "@/lib/types";
import { ep } from "./helpers";

/** Pilot episodes: business, technology, culture, philosophy, creativity. */
export const PILOT_SCRIPTS_B: Record<string, EpisodeScript> = {
  "how-brands-become-cults-1": ep({
    hook: "In 2016, a streetwear brand sold a red clay brick with its logo on it. It sold out. People resold it for many times the original price. It was a brick.",
    story: [
      "The brand was Supreme, founded by James Jebbia in New York in 1994 as a skate shop. Its famous red box logo was inspired by the art of Barbara Kruger. For years it stayed small, deliberately.",
      "Supreme's model became known as the drop. Instead of stocking huge amounts of a product, it releases small batches of new items, often on Thursdays, and lets them sell out. Queues formed outside stores. Online drops sold out in minutes. Scarcity turned every release into an event.",
      "Scarcity does something psychological. When something might run out, we value it more, and owning it signals that you were early, in the know, part of the tribe. The product is the T shirt. What you're really buying is belonging.",
    ],
    facts: [
      "In 2020, VF Corporation, the owner of brands like The North Face and Vans, bought Supreme for about two point one billion dollars. In 2024, it agreed to sell it to EssilorLuxottica for about one and a half billion.",
    ],
    insight: "Cult brands don't just sell products. They sell identity, and they make you feel lucky to have it. Next time you want something because it's rare, ask whether you want the thing, or the feeling of having got it.",
    outro: "Next on How Brands Become Cults: Apple, and the power of having an enemy.",
    insights: [
      "Supreme was founded in 1994; its box logo was inspired by artist Barbara Kruger.",
      "VF Corp bought Supreme for about $2.1bn in 2020.",
      "Cult brands sell identity, then make you feel lucky to have it.",
    ],
    challenge: {
      question: "What's 'the drop' model?",
      options: ["Permanent stock of every item", "Small batches released and allowed to sell out", "Dropping prices every week", "Selling only online"],
      answer: 1,
      explain: "Small, limited releases that sell out quickly turn each launch into an event and fuel demand through scarcity.",
    },
  }),
  "startup-stories-1": ep({
    hook: "In 2008, two broke designers in San Francisco saved their startup by selling breakfast cereal. It's one of the strangest rescue stories in tech.",
    story: [
      "Brian Chesky and Joe Gebbia couldn't afford their rent. In 2007, with a big design conference in town and hotels full, they rented out air mattresses on their floor and served breakfast. The idea became Air Bed and Breakfast, later Airbnb, with co founder Nathan Blecharczyk.",
      "Growth was slow and they were running up debt. During the 2008 US presidential election, they had an idea. They designed novelty cereal boxes, Obama O's and Cap'n McCain's, and sold them as collectors' items. According to the founders, they made around thirty thousand dollars, enough to keep going.",
      "When they later interviewed at the startup accelerator Y Combinator, the cereal story reportedly helped convince Paul Graham. Anyone that resourceful, he figured, would be hard to kill.",
    ],
    facts: [
      "Airbnb went public in December 2020, in the middle of a pandemic that had devastated travel, and its shares soared on the first day of trading.",
    ],
    insight: "Startup legends often look like genius in hindsight. Up close, they're mostly persistence, odd ideas and refusing to die. Sometimes survival is the strategy.",
    outro: "Next on The Startup Stories: the garage myth, and whether great companies really start in garages.",
    insights: [
      "Airbnb's founders sold 'Obama O's' and 'Cap'n McCain's' cereal in 2008 to fund the company.",
      "The cereal story reportedly helped them get into Y Combinator.",
      "Sometimes survival is the strategy.",
    ],
    challenge: {
      question: "How did Airbnb's founders fund the company in 2008?",
      options: ["A bank loan", "Selling novelty cereal boxes", "Winning a lottery", "A government grant"],
      answer: 1,
      explain: "They sold election-themed cereal boxes, reportedly raising around $30,000.",
    },
  }),
  "art-of-negotiation-1": ep({
    hook: "Spin a wheel. It lands on a random number. Now guess how many African countries are in the United Nations. That random number will pull your guess toward it. This was a real experiment.",
    story: [
      "In 1974, the psychologists Amos Tversky and Daniel Kahneman rigged a wheel of fortune to stop at either ten or sixty five. People who saw ten gave a median estimate of twenty five percent. People who saw sixty five guessed forty five percent. A number they knew was random dragged their answers.",
      "This is anchoring. The first number in a conversation becomes a reference point, and everything after gets measured against it.",
      "In negotiation, that matters enormously. In a 1987 study by Gregory Northcraft and Margaret Neale, professional estate agents valued the same house differently depending on the listing price they were shown, while insisting the listing price hadn't influenced them.",
    ],
    facts: [
      "Research by Adam Galinsky and others suggests that, in many negotiations, the first offer strongly predicts the final deal. That's why it often pays to go first with an ambitious but justifiable number.",
      "If someone else anchors first, don't argue from their number. Re anchor with your own reasoning and your own figure.",
    ],
    insight: "Anchors work even when we know about them. You can't switch the bias off, but you can decide who sets the anchor. Often, it should be you.",
    outro: "Next on The Art of Negotiation: your BATNA, the secret weapon of having somewhere else to go.",
    insights: [
      "A rigged wheel landing on 10 or 65 shifted people's estimates — anchoring in action (1974).",
      "Estate agents' valuations shifted with the listing price, even as they denied it.",
      "In many negotiations, the first offer strongly predicts the final deal.",
    ],
    challenge: {
      question: "What's the best response when the other side anchors first?",
      options: ["Split the difference immediately", "Re-anchor with your own number and reasoning", "Accept their number", "Stay silent forever"],
      answer: 1,
      explain: "Don't negotiate from their anchor. Re-anchor with your own justified figure.",
    },
  }),
  "why-businesses-fail-1": ep({
    hook: "In the year 2000, the founders of a small DVD by post company flew to Dallas and offered to sell it to Blockbuster for fifty million dollars. Blockbuster said no. The company was Netflix.",
    story: [
      "Reed Hastings and Marc Randolph met Blockbuster's chief executive, John Antioco. Netflix was losing money. Blockbuster was a giant with thousands of stores. According to Randolph's account, the Blockbuster team struggled not to laugh.",
      "From where Blockbuster sat, it made sense. Its stores were busy. Its business model was proven. And late fees were a big source of revenue, which meant Blockbuster made money partly from annoying its customers. Netflix's subscription had no late fees at all.",
      "Blockbuster did eventually launch its own online service, and for a while it was a real competitor. But it was slower to commit, internal disagreements got in the way, and the company filed for bankruptcy in 2010.",
    ],
    facts: [
      "There's a famous story that Netflix was born when Hastings got a forty dollar late fee for a film. Randolph has said that origin story is a simplification at best.",
      "Today, one Blockbuster store survives, in Bend, Oregon, and it's become a tourist attraction.",
    ],
    insight: "Blockbuster didn't fail because it was stupid. It failed because it was successful. When your current business works, the thing that will replace it always looks small and silly. That's the trap.",
    outro: "Next on Why Businesses Fail: Kodak invented the digital camera, and then tucked it away.",
    insights: [
      "In 2000, Netflix's founders offered to sell to Blockbuster for $50m. Blockbuster declined.",
      "Blockbuster filed for bankruptcy in 2010. One store survives, in Bend, Oregon.",
      "When your business works, the thing that will replace it looks small and silly.",
    ],
    challenge: {
      question: "Why might Blockbuster have dismissed Netflix?",
      options: ["Netflix was already bigger", "Its own model, including late fees, was still very profitable", "It had no money", "Netflix refused to sell"],
      answer: 1,
      explain: "Blockbuster's stores and late-fee revenue were working. Successful businesses often dismiss small, odd-looking threats.",
    },
  }),
  "too-good-to-be-true-1": ep({
    hook: "In 1920, a charming Italian immigrant in Boston promised investors fifty percent returns in forty five days. Tens of thousands of people handed him their money.",
    story: [
      "His name was Charles Ponzi. His pitch began with a real quirk. International reply coupons could be bought cheaply in some countries and exchanged for postage worth more in the United States. On paper, there was a profit to be made.",
      "In practice, buying and redeeming enough coupons to make serious money was close to impossible. So Ponzi did something simpler. He paid early investors with money from new investors. The returns looked real, people told their friends, and more money poured in.",
      "At its peak, he was reportedly taking in huge sums every day. Then the Boston Post newspaper started asking questions, and one of their investigations helped expose the scheme. By August 1920 it had collapsed, and Ponzi went to prison.",
    ],
    facts: [
      "Ponzi didn't invent the trick. Similar schemes existed before him. But his was so spectacular that his name stuck to it forever.",
      "The pattern still repeats. Bernard Madoff's fraud, uncovered in 2008, is the largest known Ponzi scheme in history.",
    ],
    insight: "Every Ponzi scheme is a story about trust outrunning evidence. The red flags rarely change: high returns with little risk, vague explanations, and pressure to get in now.",
    outro: "Next on Too Good to Be True: Bernie Madoff, and how the biggest Ponzi scheme in history hid in plain sight.",
    insights: [
      "Ponzi promised 50% returns in 45 days, based on international reply coupons.",
      "Ponzi paid early investors with new investors' money — the scheme collapsed in August 1920.",
      "Red flags: high returns with low risk, vague explanations, pressure to act fast.",
    ],
    challenge: {
      question: "How did Ponzi actually pay his early investors?",
      options: ["Profits from postage coupons", "Money from newer investors", "A bank loan", "Stock market gains"],
      answer: 1,
      explain: "That's the defining feature of a Ponzi scheme: old investors are paid with new investors' money.",
    },
  }),
  "internet-explained-1": ep({
    hook: "You type a web address and press enter. In the time it takes to blink, your request may have crossed an ocean floor and come back.",
    story: [
      "First, your device needs an address. Computers don't understand names like knowhow dot app. They use numbers called IP addresses. So your device asks the Domain Name System, often called the internet's phone book, to translate the name into a number. That lookup usually takes milliseconds, and the answer is often cached nearby.",
      "Then your request is chopped into small chunks called packets. Each packet is labelled with where it's going, and routers along the way pass it on, hop by hop, like a relay race. Packets from the same page can take different routes and get reassembled at the other end.",
      "If the server is on another continent, your packets almost certainly travel through fibre optic cables lying on the sea bed. Light pulses carry the data through glass strands thinner than a hair.",
    ],
    facts: [
      "The vast majority of intercontinental internet traffic travels through undersea cables, not satellites. There are hundreds of these cable systems across the world's oceans.",
      "Light travels more slowly in glass than in a vacuum, roughly two thirds as fast. Even so, a round trip between London and New York takes well under a tenth of a second.",
    ],
    insight: "The internet feels like it's in the air. It's actually incredibly physical: buildings full of servers, and glass threads across the ocean floor. The cloud is very much on the ground.",
    outro: "Next on The Internet Explained: the cables under the sea, and the ships that fix them.",
    insights: [
      "DNS translates names like websites into numerical IP addresses.",
      "Most intercontinental internet traffic travels through undersea fibre-optic cables.",
      "Light in fibre travels at roughly two-thirds of its speed in a vacuum.",
    ],
    challenge: {
      question: "How does most intercontinental internet traffic travel?",
      options: ["Satellites", "Undersea fibre-optic cables", "Radio towers", "Weather balloons"],
      answer: 1,
      explain: "The vast majority goes through cables on the sea bed. Satellites handle a much smaller share.",
    },
  }),
  "how-ai-actually-works-1": ep({
    hook: "A chatbot that writes poems, explains physics and fixes code is, at its core, doing something surprisingly simple: guessing what comes next.",
    story: [
      "Large language models are a kind of neural network, a system loosely inspired by brains, made of huge numbers of adjustable values called parameters. During training, the model reads enormous amounts of text, broken into pieces called tokens, and practises one task over and over: predict the next token.",
      "Each time it guesses wrong, the training process nudges its parameters slightly so the right answer becomes a bit more likely. Repeat that billions of times, and something remarkable emerges. To predict text well, the model has to pick up grammar, facts, styles of reasoning and patterns of conversation.",
      "After that, models are usually refined further, for example with human feedback, to be more helpful, follow instructions and avoid harmful outputs.",
    ],
    facts: [
      "Because these models are trained to produce plausible text, they can sometimes generate confident statements that are wrong. People call this hallucination. It's why checking important facts still matters.",
    ],
    insight: "Calling it just next word prediction undersells it, and calling it a digital brain oversells it. The truth is in between: a powerful pattern learner, trained at a scale that produces surprising abilities, and real limits.",
    outro: "Next on How AI Actually Works: training data, where it comes from and why it matters.",
    insights: [
      "Large language models are trained to predict the next token of text.",
      "Training nudges billions of parameters to make correct predictions more likely.",
      "Models can 'hallucinate': produce plausible but wrong statements.",
    ],
    challenge: {
      question: "What's the core training task of a large language model?",
      options: ["Searching the web live", "Predicting the next piece of text", "Copying a database", "Following hard-coded rules"],
      answer: 1,
      explain: "They learn by predicting the next token over enormous amounts of text. Other abilities emerge from doing that well.",
    },
  }),
  "invisible-machines-1": ep({
    hook: "Every time your map app finds you, it's running a correction based on Einstein's theories of relativity. Without it, your blue dot would drift off by kilometres a day.",
    story: [
      "GPS works using a constellation of satellites around twenty thousand kilometres up. Each one carries extremely precise atomic clocks and constantly broadcasts its time and position. Your phone listens to several satellites at once. By comparing how long each signal took to arrive, it works out how far away each satellite is, and from that, where you are. You need at least four satellites to pin down position and time.",
      "Here's where Einstein comes in. Special relativity says moving clocks tick slower, and the satellites are moving fast, so their clocks lose about seven millionths of a second a day. General relativity says clocks in weaker gravity tick faster, and up there gravity is weaker, so they gain about forty five millionths of a second a day.",
      "Net result: satellite clocks run fast by about thirty eight millionths of a second every day. That sounds like nothing. But signals travel at the speed of light, so tiny timing errors become big distance errors.",
    ],
    facts: [
      "Engineers build the correction into the system, adjusting the satellite clock frequencies. If they didn't, errors would build up by around ten kilometres a day.",
    ],
    insight: "The most abstract physics, about bending time and space, ends up in the most ordinary moment: finding the nearest coffee shop. Big ideas don't stay in textbooks. They end up in your pocket.",
    outro: "Next on The Invisible Machines: the barcode, an idea that started as Morse code drawn in the sand.",
    insights: [
      "GPS satellite clocks gain about 38 microseconds a day due to relativity.",
      "Without relativity corrections, GPS errors would build up by around 10 km a day.",
      "You need signals from at least four satellites to fix position and time.",
    ],
    challenge: {
      question: "Overall, do GPS satellite clocks run fast or slow compared to clocks on Earth?",
      options: ["Slow", "Fast", "Exactly the same", "They stop"],
      answer: 1,
      explain: "Gravity effects make them gain about 45 microseconds a day, speed effects lose about 7. Net: about 38 microseconds fast.",
    },
  }),
  "how-trends-happen-1": ep({
    hook: "The colour of the jumper you bought this season may have been forecast years ago, in a report you've never seen, by people you'll never meet.",
    story: [
      "Fashion trends feel spontaneous. They're often anything but. A whole industry of trend forecasting agencies studies runways, streets, social media, art and even economic moods to predict what colours, fabrics and shapes people will want. Brands pay for these forecasts and design toward them, sometimes well over a year ahead.",
      "One famous signal is Pantone's Colour of the Year, launched with Cerulean for the year two thousand. It's part forecast, part marketing, and it ripples through products from phones to sofas.",
      "There's an old theory about how trends move, from the sociologist Georg Simmel in 1904. He argued fashion trickles down: elites adopt a style to stand out, others copy it, and the elites move on to something new. Today many trends bubble up instead, from streets, subcultures and the internet, and are then picked up by big brands.",
    ],
    facts: [
      "Social media has sped up the cycle dramatically. Micro trends can rise and fade in weeks, which feeds fast fashion's constant demand for new products.",
    ],
    insight: "Trends aren't just about taste. They're a system of signals about belonging and difference. Knowing how the machine works doesn't stop you enjoying style. It just helps you choose what's actually yours.",
    outro: "Next on How Trends Happen: the twenty year rule, and why the past keeps coming back.",
    insights: [
      "Trend forecasting agencies predict colours and styles that brands design toward, often well ahead.",
      "Pantone's first Colour of the Year was Cerulean, for 2000.",
      "Simmel's 1904 'trickle-down' theory: elites adopt styles to stand out; others copy; elites move on.",
    ],
    challenge: {
      question: "What does the 'trickle-down' theory of fashion say?",
      options: ["Trends start in the street", "Elites adopt styles, others copy, elites move on", "Trends are random", "Only celebrities set trends"],
      answer: 1,
      explain: "Georg Simmel argued fashion trickles down from elites seeking distinction. Many modern trends bubble up instead.",
    },
  }),
  "fashions-biggest-moments-1": ep({
    hook: "In 1947, Europe was still living with rationing. Then a designer sent out skirts that used extravagant amounts of fabric. It was a scandal, and a sensation.",
    story: [
      "On the twelfth of February 1947, Christian Dior showed his first collection in Paris. Wartime clothes had been boxy and practical, shaped by shortages. Dior's silhouettes were the opposite: soft shoulders, tiny cinched waists, and full, long skirts.",
      "The editor of Harper's Bazaar, Carmel Snow, reportedly told him: it's quite a revolution, dear Christian, your dresses have such a new look. The name stuck. The New Look.",
      "Not everyone loved it. Using so much fabric while people still faced shortages struck many as wasteful, even offensive. In Britain, officials and politicians criticised it. There were reports of protests in Paris. But women wanted it, and the look spread around the world.",
    ],
    facts: [
      "Some New Look skirts used many metres of fabric, at a time when British clothing rationing continued until 1949.",
    ],
    insight: "The New Look shows that fashion is never just about clothes. After years of war, Dior sold something people craved: abundance, romance and the idea that normal life was back.",
    outro: "Next on Fashion's Biggest Moments: the mini skirt, and London's youthquake.",
    insights: [
      "Dior's 'New Look' debuted in Paris on 12 February 1947.",
      "The name came from Harper's Bazaar editor Carmel Snow.",
      "British clothes rationing lasted until 1949, making the New Look controversial.",
    ],
    challenge: {
      question: "Why was the New Look controversial?",
      options: ["It was too short", "It used lavish fabric during post-war shortages", "It was all black", "It banned trousers"],
      answer: 1,
      explain: "Its full skirts used lots of fabric while rationing was still in force, which many saw as wasteful.",
    },
  }),
  "music-industry-explained-1": ep({
    hook: "Your favourite artist has millions of streams. That doesn't mean they're rich. In fact, they might earn less from those streams than you'd guess.",
    story: [
      "Most big streaming services don't pay a fixed amount per stream. Roughly speaking, they take the money from subscriptions and advertising, keep their share, and put the rest into a pool for rights holders. That pool is then divided according to each track's share of total streams. This is called the pro rata model.",
      "The money then splits again. One part goes to whoever owns the recording, often a record label. Another part goes to songwriters and publishers. If the artist is signed to a label, they receive a royalty from the label's share, and that may first go toward paying back the advance they were given.",
      "When people work out an average, the payout per stream often lands somewhere around a fraction of a penny. So a million streams can sound like fame and still add up to a modest amount, split among many people.",
    ],
    facts: [
      "In 2024, Spotify introduced a rule that a track needs at least a thousand streams in a year before it generates recorded music royalties.",
    ],
    insight: "Streaming made music cheaper and more accessible than ever, and changed who earns from it. That's why so many artists now rely on touring, merch, and fans who pay for more than a stream.",
    outro: "Next on The Music Industry Explained: what a record label actually does, and the deal behind the advance.",
    insights: [
      "Most streaming payouts come from a pooled share of revenue, split by share of total streams.",
      "Per-stream averages are often a fraction of a penny, split between labels, artists and songwriters.",
      "From 2024, Spotify tracks need 1,000 streams a year to earn recorded-music royalties.",
    ],
    challenge: {
      question: "What's the 'pro rata' streaming model?",
      options: ["A fixed fee per stream", "A revenue pool split by share of total streams", "Artists set their own price", "Fans pay artists directly"],
      answer: 1,
      explain: "Revenue goes into a pool divided according to each track's share of all streams on the platform.",
    },
  }),
  "big-questions-tiny-episodes-1": ep({
    hook: "Take a wooden ship. Over the years, replace every plank, one by one, until none of the originals remain. Is it still the same ship?",
    story: [
      "This puzzle is the Ship of Theseus. The Greek writer Plutarch recorded it around two thousand years ago. The Athenians kept the ship of their hero Theseus, replacing rotting timbers as they went, and philosophers argued about whether it was really still his ship.",
      "Centuries later, the English philosopher Thomas Hobbes added a twist. Suppose someone collects all the old planks you threw away and rebuilds the original ship with them. Now there are two ships. Which one is the real Ship of Theseus?",
      "The puzzle gets personal fast. Your body replaces many of its cells over time. Your opinions, tastes and memories change. Are you the same person you were ten years ago?",
    ],
    facts: [
      "You may have heard that every cell in your body is replaced every seven years. That's a myth. Different cells renew at very different rates, and many neurons in your brain stay with you for life.",
      "The philosopher John Locke argued that personal identity comes from psychological continuity, especially memory, rather than from the material you're made of.",
    ],
    insight: "Maybe identity isn't about the planks at all. It's about the pattern, the story that connects past and present. You are less a thing and more a process.",
    outro: "Next on Big Questions, Tiny Episodes: the Ring of Gyges. Would you still be good if nobody could see you?",
    insights: [
      "The Ship of Theseus puzzle was recorded by Plutarch around 2,000 years ago.",
      "The 'every cell replaced every seven years' idea is a myth.",
      "Maybe you are less a thing and more a process.",
    ],
    challenge: {
      question: "What twist did Thomas Hobbes add to the Ship of Theseus?",
      options: ["The ship sinks", "Someone rebuilds the ship from the old planks", "Theseus comes back", "The ship is painted"],
      answer: 1,
      explain: "Hobbes imagined rebuilding the original ship from discarded planks, leaving two ships with a claim to be the real one.",
    },
  }),
  "stoic-mode-1": ep({
    hook: "The most powerful man in the world kept a private notebook. Over and over, he wrote reminders to himself to stay calm, be patient, and not let other people's behaviour get to him.",
    story: [
      "That man was Marcus Aurelius, Roman emperor from 161 to 180. During years of war and a terrible plague, he wrote notes to himself, in Greek, that we now call the Meditations. They were never meant to be published. They read like a person talking himself through hard days.",
      "Marcus was a student of Stoicism, a philosophy founded in Athens. One of its core ideas comes from another Stoic, Epictetus, who was born into slavery. His handbook opens with a simple distinction: some things are within our power, and some are not.",
      "Your opinions, your choices and your actions are up to you. Other people, the weather, your reputation and most outcomes are not. Stoics argue that a lot of suffering comes from treating the second category like the first.",
    ],
    facts: [
      "Today this is often called the dichotomy of control, and it has influenced modern approaches like cognitive behavioural therapy, whose founders acknowledged a debt to Stoic ideas.",
    ],
    insight: "Stoicism isn't about not feeling things. It's about putting your energy where it can actually do something. Before you spiral, ask: is this up to me? If it is, act. If it isn't, let it go.",
    outro: "Next on Stoic Mode: Epictetus, and finding freedom from the inside out.",
    insights: [
      "Marcus Aurelius wrote the Meditations as private notes, in Greek, never meant for publication.",
      "Epictetus, born into slavery, opened his handbook with: some things are within our power, some are not.",
      "Before you spiral, ask: is this up to me?",
    ],
    challenge: {
      question: "In Stoicism, which is within your control?",
      options: ["Other people's opinions", "The weather", "Your own choices and actions", "Your reputation"],
      answer: 2,
      explain: "The dichotomy of control: your judgements, choices and actions are yours. Most outcomes and other people are not.",
    },
  }),
  "how-creatives-think-1": ep({
    hook: "One of the bestselling children's books ever written uses only fifty different words. It exists because of a bet.",
    story: [
      "Dr. Seuss had written The Cat in the Hat using a limited vocabulary of a couple of hundred words. His publisher, Bennett Cerf, reportedly bet him fifty dollars he couldn't write a book using just fifty different words.",
      "Seuss took the bet. The result, published in 1960, was Green Eggs and Ham. Sam I am. I do not like them. Repetition, rhythm and a tiny vocabulary became the whole style. It went on to become one of the bestselling children's books of all time.",
      "It's a perfect example of a surprising truth: limits often make people more creative, not less.",
    ],
    facts: [
      "Psychology research backs this up. In studies by Catrinel Haught Tromp, people asked to write rhymes using specific given words produced work rated as more creative than people with no constraints.",
      "Think of haiku, with their strict syllables, or songs built on just four chords. Constraints give the mind a puzzle to solve instead of an empty page.",
    ],
    insight: "A blank page is terrifying because anything is possible. Give yourself a rule, a word limit, a deadline, three colours, and suddenly your brain has something to push against.",
    outro: "Next on How Creatives Think: why every great thing starts out as a terrible first draft.",
    insights: [
      "Green Eggs and Ham uses only 50 different words — reportedly to win a bet.",
      "In studies, people given constraints produced work rated more creative.",
      "Give yourself a rule and your brain gets something to push against.",
    ],
    challenge: {
      question: "Who reportedly bet Dr. Seuss he couldn't write a 50-word book?",
      options: ["His editor's assistant", "His publisher, Bennett Cerf", "His wife", "A rival author"],
      answer: 1,
      explain: "Random House publisher Bennett Cerf reportedly bet him $50. Green Eggs and Ham was the result.",
    },
  }),
  "the-making-of-1": ep({
    hook: "There's a scream hidden in hundreds of films. Star Wars. Indiana Jones. Toy Story. Once you know it, you'll hear it everywhere.",
    story: [
      "The sound was recorded for a 1951 western called Distant Drums, for a scene where a man is grabbed by an alligator in a swamp. It went into the Warner Brothers sound library, and got reused.",
      "In 1953 it was used in a film called The Charge at Feather River, when a character named Private Wilhelm is hit by an arrow. That's how it got its name: the Wilhelm scream.",
      "In the 1970s, a young sound designer named Ben Burtt found the scream in the archives and started slipping it into films he worked on, including Star Wars, as a kind of in joke. Other sound designers joined in. It has since appeared in hundreds of films and games.",
    ],
    facts: [
      "The voice is widely believed to belong to the actor and singer Sheb Wooley, best known for the novelty song The Purple People Eater.",
    ],
    insight: "Sound designers hide stories inside stories. The Wilhelm scream is a reminder that films are built from layers of craft you never consciously notice, and that creative people love leaving notes for each other.",
    outro: "Next on The Making Of: the lightsaber hum, built from an old projector and a broken TV.",
    insights: [
      "The Wilhelm scream was first recorded for the 1951 film Distant Drums.",
      "It's named after Private Wilhelm in The Charge at Feather River (1953).",
      "Sound designer Ben Burtt revived it in Star Wars, turning it into an in-joke.",
    ],
    challenge: {
      question: "Who popularised the Wilhelm scream as an in-joke?",
      options: ["Steven Spielberg", "Ben Burtt", "George Lucas", "Sheb Wooley"],
      answer: 1,
      explain: "Sound designer Ben Burtt found it in the archives and used it in Star Wars and other films. Sheb Wooley is believed to be the voice.",
    },
  }),
};
