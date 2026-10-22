import type { EpisodeScript } from "@/lib/types";
import { ep } from "./helpers";

/** Pilot episodes: history, psychology, finance, science. */
export const PILOT_SCRIPTS_A: Record<string, EpisodeScript> = {
  "greatest-heists-1": ep({
    hook: "The vault was two floors underground. It had ten layers of security, including heat sensors, a magnetic field, and a lock with a hundred million possible combinations. In February 2003, a crew beat almost all of them.",
    story: [
      "The place was the Antwerp Diamond Centre in Belgium, at the heart of the world's diamond trade. The man later convicted as the crew's leader was Leonardo Notarbartolo, an Italian who had rented an office in the building and spent a long time quietly studying it.",
      "According to investigators and later accounts, the crew covered a heat and motion sensor to blind it, used tricks with tape and aluminium to defeat the magnetic sensor on the vault door, and opened the combination lock with a copied key. Over a weekend they emptied a large number of the safe deposit boxes. The loot was estimated at over a hundred million dollars, and most of it has never been recovered.",
      "Then came the mistake. Near a motorway outside Brussels, some of the crew dumped a bag of rubbish in the woods. A local man found it: torn envelopes from the diamond centre, a video tape of the vault, and a half eaten salami sandwich. Police traced receipts and evidence back to the gang.",
    ],
    facts: [
      "Notarbartolo was convicted and sentenced to ten years. He has given his own version of events over the years, and parts of the story remain disputed.",
    ],
    insight: "The lesson heist stories keep teaching: security is only as strong as the most human part of it. The crew beat the technology. They lost to rubbish disposal.",
    outro: "Next on The World's Greatest Heists: the morning the Mona Lisa simply walked out of the Louvre.",
    insights: [
      "The 2003 Antwerp heist had an estimated $100m+ haul, mostly never recovered.",
      "The gang was undone by dumped rubbish, including a half-eaten salami sandwich.",
      "Security is only as strong as its most human part.",
    ],
    challenge: {
      question: "What helped police catch the Antwerp crew?",
      options: ["A fingerprint on the vault", "Rubbish dumped in the woods", "A confession on TV", "A tracking device in a diamond"],
      answer: 1,
      explain: "A man found a bag of dumped rubbish with envelopes from the centre, a vault video tape and a half-eaten sandwich.",
    },
  }),
  "people-who-changed-everything-1": ep({
    hook: "Before Johannes Gutenberg, a single book could take a scribe months to copy by hand. Within a lifetime of his invention, Europe was drowning in books.",
    story: [
      "Gutenberg was a goldsmith in Mainz, in what is now Germany. Around the 1440s he brought together several ideas into one system. Small metal letters that could be arranged, inked and reused. An oil based ink that stuck to metal. And a press adapted from the screw presses used for things like wine making.",
      "His most famous work, the Gutenberg Bible, was printed in the mid 1450s. Around one hundred and eighty copies are thought to have been made. Copying that many by hand would have taken a small army of scribes years.",
      "Gutenberg didn't get rich. He borrowed heavily from a financier, Johann Fust, and lost a lawsuit that handed Fust much of his equipment. The inventor of one of history's most important machines died without great wealth.",
    ],
    facts: [
      "By 1500, printing presses were operating in hundreds of European towns, and historians estimate millions of books had been printed.",
      "When Martin Luther published his arguments against the Church in 1517, printing helped his ideas spread across Germany in weeks. Many historians see the press as a key reason the Reformation spread so fast.",
    ],
    insight: "Gutenberg didn't just make books cheaper. He made information hard to control. That pattern repeats with every new medium, right up to the phone in your hand.",
    outro: "Next: the doctor who told other doctors to wash their hands, and was ridiculed for being right.",
    insights: [
      "Around 180 copies of the Gutenberg Bible are thought to have been printed in the 1450s.",
      "Gutenberg lost much of his equipment to his financier in a lawsuit.",
      "The printing press made information hard to control.",
    ],
    challenge: {
      question: "Which machine did Gutenberg adapt for printing?",
      options: ["A loom", "A screw press", "A water wheel", "A windmill"],
      answer: 1,
      explain: "He adapted screw presses like those used for wine making and combined them with reusable metal type and oil-based ink.",
    },
  }),
  "history-of-everything-1": ep({
    hook: "Today salt is the cheapest thing in your kitchen. For most of history it was so valuable that people built roads for it, taxed it, smuggled it, and rebelled over it.",
    story: [
      "Before refrigeration, salt was how you kept food from rotting. Salted fish, salted meat and cheese could last through winter or a long sea voyage. Control the salt, and you control the food supply.",
      "Ancient Rome had a road called the Via Salaria, the salt road. You've also probably heard that Roman soldiers were paid in salt, and that's where the word salary comes from. The word does come from the Latin for salt. But the idea that soldiers were literally paid in salt has thin evidence. It's a great story, not a proven fact.",
      "Salt taxes were everywhere. In France, the hated salt tax called the gabelle was a long running grievance in the decades before the French Revolution. And in 1930, Mahatma Gandhi led the Salt March, walking about three hundred and eighty five kilometres to the sea to make salt in defiance of British salt laws. It became one of the most powerful protests of the independence movement.",
    ],
    facts: [
      "Salt left its name all over maps. Salzburg in Austria literally means salt castle.",
    ],
    insight: "When something becomes cheap, we forget it ever mattered. Salt is a reminder to ask: what ordinary thing today is quietly running the world?",
    outro: "Next on The History of Everything: the fork, and why eating with one was once considered a scandal.",
    insights: [
      "'Salary' comes from the Latin for salt — but soldiers being paid in salt has thin evidence.",
      "Gandhi's 1930 Salt March covered about 385 km to the sea.",
      "Salzburg means 'salt castle'.",
    ],
    challenge: {
      question: "What was the French salt tax called?",
      options: ["The taille", "The gabelle", "The dîme", "The octroi"],
      answer: 1,
      explain: "The gabelle was the hated French salt tax, a long-running grievance before the Revolution.",
    },
  }),
  "science-of-influence-1": ep({
    hook: "When a server brings a mint with your bill, it isn't just good manners. In one experiment, that tiny gesture measurably increased tips.",
    story: [
      "The principle at work is reciprocity. Across human cultures there's a deep rule: if someone gives you something, you feel you owe them something back. It's what makes cooperation and trade possible. It's also very easy to use on you.",
      "In a study published in 2002 by David Strohmetz and colleagues, servers in a restaurant gave diners sweets with the bill under different conditions. One sweet nudged tips up a little. Two sweets nudged them up more. But the biggest jump came when the server gave one sweet, started to walk away, then turned back and offered a second, as if the diners were special. Personal, unexpected gifts trigger reciprocity hardest.",
      "In an earlier experiment, by Dennis Regan in 1971, a research assistant bought participants an unexpected can of Coke. Later, he asked them to buy raffle tickets. Those who got the Coke bought noticeably more tickets, regardless of whether they liked him.",
    ],
    facts: [
      "The psychologist Robert Cialdini made reciprocity famous as one of his principles of persuasion. Free samples in supermarkets work partly the same way.",
    ],
    insight: "Reciprocity is beautiful when it's genuine and manipulative when it's a tactic. The defence isn't to reject every gift. It's to recognise a sales move when a favour comes with a request attached.",
    outro: "Next: scarcity, and why only three left in stock makes you want it so much more.",
    insights: [
      "In a 2002 restaurant study, an unexpected, personal second sweet boosted tips most.",
      "In a 1971 study, people given a free Coke bought more raffle tickets from the giver.",
      "Spot reciprocity as a tactic when a favour comes with a request attached.",
    ],
    challenge: {
      question: "Which approach boosted tips the most in the mint study?",
      options: ["No mints", "One mint", "Two mints at once", "One mint, then a 'special' second mint"],
      answer: 3,
      explain: "The personal, unexpected second mint made diners feel singled out, which triggered reciprocity most strongly.",
    },
  }),
  "why-humans-do-that-1": ep({
    hook: "You know the task you're avoiding right now? The problem probably isn't your time management. It's how that task makes you feel.",
    story: [
      "Researchers like Tim Pychyl and Fuschia Sirois describe procrastination as an emotion regulation problem. A task feels boring, confusing or threatening. Avoiding it gives instant relief. Your brain learns that avoiding feels good, so it does it again.",
      "There's also a strange quirk in how we imagine the future. In brain imaging studies by Hal Hershfield and colleagues, thinking about your future self activated patterns more similar to thinking about another person than about your present self. So when you put something off, in a sense you're handing it to a stranger who happens to share your name.",
      "Procrastination isn't laziness. People often procrastinate on the things they care about most, precisely because those things carry more anxiety.",
    ],
    facts: [
      "A study of university students by Michael Wohl and colleagues found that students who forgave themselves for procrastinating before their first exam procrastinated less before the next one. Beating yourself up makes the task feel worse, which makes avoidance more likely.",
      "One useful trick is to make the first step tiny. Not write the essay, but open the document and type one ugly sentence. Starting is often the hardest part.",
    ],
    insight: "If procrastination is about feelings, then the fix is about feelings too. Make starting easier, be kind to yourself, and give your future self a little more love.",
    outro: "Next on Why Humans Do That: why we cry at adverts, even the ones we know are trying to make us cry.",
    insights: [
      "Procrastination is mainly an emotion-regulation problem, not a time problem.",
      "Thinking about your future self can look, in the brain, like thinking about a stranger.",
      "Students who forgave themselves for procrastinating procrastinated less next time.",
    ],
    challenge: {
      question: "What did the self-forgiveness study find?",
      options: ["Self-criticism reduced procrastination", "Self-forgiveness reduced later procrastination", "Forgiveness made no difference", "Students stopped studying"],
      answer: 1,
      explain: "Students who forgave themselves procrastinated less before the next exam. Harsh self-criticism tends to make the task feel worse.",
    },
  }),
  "investing-without-jargon-1": ep({
    hook: "Professional fund managers are clever, well paid, and have teams of analysts. And yet, over long periods, most of them fail to beat a simple, boring alternative.",
    story: [
      "That alternative is an index fund. Instead of picking which companies will win, an index fund simply buys all the companies in an index, like the five hundred big US companies in the S and P five hundred, or the hundred biggest in the UK's FTSE one hundred. You own a slice of the whole market.",
      "In 1976, John Bogle of Vanguard launched one of the first index funds for ordinary investors. Critics mocked it as Bogle's folly. Why would anyone settle for average? Because, over time, average after low fees has beaten most people trying to be above average.",
      "S and P's long running SPIVA reports compare active funds with their benchmarks. Over fifteen year periods, the large majority of actively managed US large company funds have underperformed the S and P five hundred.",
    ],
    facts: [
      "In 2008, Warren Buffett bet a million dollars that a low cost S and P five hundred index fund would beat a selection of hedge funds over ten years. The index fund won comfortably.",
      "This is education, not financial advice. All investing carries risk, and markets can fall as well as rise.",
    ],
    insight: "Investing rewards a strange mix: low costs, broad diversification, and patience. The winning move is often to do less, not more.",
    outro: "Next: why time in the market usually beats timing the market.",
    insights: [
      "Over 15-year periods, most actively managed US large-cap funds have underperformed the S&P 500 (SPIVA).",
      "Warren Buffett won a 10-year bet that an S&P 500 index fund would beat selected hedge funds.",
      "In investing, the winning move is often to do less.",
    ],
    challenge: {
      question: "What does an index fund do?",
      options: ["Picks the best few companies", "Buys all companies in an index", "Only buys bonds", "Trades daily to time the market"],
      answer: 1,
      explain: "An index fund owns all the companies in an index, giving broad diversification at low cost.",
    },
  }),
  "how-the-rich-got-rich-1": ep({
    hook: "For years, the founder of one of the most valuable companies on Earth paid himself a salary of about eighty thousand dollars. He still became one of the richest people alive.",
    story: [
      "That founder was Jeff Bezos, whose base salary at Amazon was famously modest for many years. His wealth didn't come from the salary. It came from owning a large share of the company.",
      "This is the core mechanic of extreme wealth. Income is what you're paid for your time. Ownership, or equity, is a claim on something that can grow without you working more hours. A salary is capped by hours in the day. A slice of a company can grow with every new customer.",
      "That's also why billionaire rankings jump around. Most of that wealth is the market value of shares. When a company's share price swings, a founder's net worth can rise or fall by billions in a single day, without any cash changing hands.",
    ],
    facts: [
      "Because selling shares can trigger taxes, some very wealthy people borrow against their shares instead of selling. It's a strategy we'll explore later in the series.",
    ],
    insight: "Most people think about money as income. Wealth is really about ownership. You don't need to become a billionaire to use the idea: owning even small slices of productive things, like a pension invested in companies, is how ordinary people tap into the same engine.",
    outro: "Next on How the Rich Got Rich: leverage, the art of multiplying effort with other people's money, time and code.",
    insights: [
      "Jeff Bezos's base salary at Amazon was famously modest — his wealth came from owning shares.",
      "Income is capped by hours. Ownership can grow without you working more.",
      "Billionaire net worth is mostly share value, so it can swing by billions in a day.",
    ],
    challenge: {
      question: "Where does most billionaire wealth come from?",
      options: ["High salaries", "Ownership of company shares", "Cash savings", "Lottery wins"],
      answer: 1,
      explain: "Extreme wealth is mostly equity: shares in companies whose value grows.",
    },
  }),
  "economics-of-everything-1": ep({
    hook: "You buy a cinema ticket to see a film. But for the cinema, the film is often just the bait. The real business is the popcorn.",
    story: [
      "When you buy a ticket, a big share of that money usually goes to the film's distributor, not the cinema. In the opening weeks of a big release the distributor's share can be especially high. The cinema keeps more of the ticket money the longer a film runs, but by then the crowds have often moved on.",
      "Popcorn, though, belongs entirely to the cinema. The ingredients cost very little. Sell it for several pounds, and the profit margin is enormous. That's why concessions can make up a much bigger share of a cinema's profit than their share of revenue suggests.",
      "Then there's the sizing trick. Ever noticed the medium popcorn costs nearly as much as the large? That's often the decoy effect. A middle option priced to make the bigger option look like a bargain.",
    ],
    facts: [
      "Behavioural economist Dan Ariely famously described a magazine subscription offer: web only, print only, or print and web for the same price as print only. Almost nobody wanted print only, but its presence pushed people toward the bundle.",
    ],
    insight: "Next time a price looks weird, ask what it's for. Sometimes a product exists not to be bought, but to make another one look good.",
    outro: "Next on The Economics of Everything: why so many prices end in ninety nine.",
    insights: [
      "Cinemas often pass a large share of ticket revenue to distributors, especially early in a film's run.",
      "Popcorn costs very little to make, so concessions drive a big share of cinema profit.",
      "The decoy effect: some options exist to make another option look like a bargain.",
    ],
    challenge: {
      question: "What's the 'decoy effect'?",
      options: ["Lowering all prices", "Adding an option that makes another look better", "Giving free samples", "Charging only cash"],
      answer: 1,
      explain: "A decoy option, like a medium priced close to a large, steers people toward the option the seller prefers.",
    },
  }),
  "human-body-is-weird-1": ep({
    hook: "Right now, you're probably a bit shorter than you were this morning. By tonight you'll have shrunk a little more. Don't worry, you'll grow back while you sleep.",
    story: [
      "Between the bones of your spine sit intervertebral discs, squishy cushions with a tough outer ring and a gel like centre. They're partly made of water, and they act like shock absorbers.",
      "When you're upright, gravity and the weight of your body press down on those discs all day. Slowly, they lose a little fluid and flatten. Each disc only compresses a tiny bit, but you've got lots of them stacked up. Add it together and many people lose around a centimetre of height between morning and evening.",
      "Lie down to sleep and the pressure comes off. The discs soak fluid back up and plump out again. By morning, you're back to full height.",
    ],
    facts: [
      "In space, without gravity compressing the spine at all, astronauts can grow up to about three percent taller. It reverses when they return.",
      "Over decades, discs gradually lose some of their water content, which is one reason people tend to get a little shorter with age.",
    ],
    insight: "Your body isn't a statue. It's a system constantly responding to the forces on it, hour by hour. Even your height is a daily negotiation with gravity.",
    outro: "Next on The Human Body Is Weird: your stomach makes acid strong enough to dissolve metal. So why doesn't it dissolve you?",
    insights: [
      "Many people are about 1cm taller in the morning than in the evening.",
      "Spinal discs lose fluid under load during the day and reabsorb it overnight.",
      "Your height is a daily negotiation with gravity.",
    ],
    challenge: {
      question: "Why are you taller in the morning?",
      options: ["Bones grow overnight", "Spinal discs re-absorb fluid while lying down", "Muscles relax", "It's a myth"],
      answer: 1,
      explain: "With pressure off overnight, spinal discs soak up fluid and expand, so you're a little taller when you wake.",
    },
  }),
  "future-of-humanity-1": ep({
    hook: "Some animals barely seem to age. A naked mole rat can live over thirty years, about ten times longer than you'd predict for a rodent its size. Scientists want to know how.",
    story: [
      "Ageing isn't one thing. In 2013, researchers published a framework called the hallmarks of ageing, a list of biological processes that go wrong as we get older, from damaged DNA to worn down chromosome ends to cells that stop dividing but refuse to die. An updated version in 2023 listed twelve.",
      "Naked mole rats are a fascinating outlier. In a 2018 study, the biologist Rochelle Buffenstein and colleagues analysed thousands of records and found that, unlike most mammals, their risk of dying didn't seem to rise with age in the way you'd expect.",
      "And in the lab, scientists can extend lifespan in some animals. Eating fewer calories extends life in yeast, worms and mice. A drug called rapamycin has extended lifespan in mice.",
    ],
    facts: [
      "None of this has yet been shown to extend maximum human lifespan. The longest confirmed human life is still Jeanne Calment, who died in 1997 at one hundred and twenty two.",
    ],
    insight: "Here's the honest picture. Longevity science is real and moving fast, but most headlines run far ahead of the evidence. The best proven tools for a longer, healthier life are still deeply unglamorous: sleep, movement, not smoking, and the people around you.",
    outro: "Next on The Future of Humanity: food without farms, and what lab grown meat actually is.",
    insights: [
      "Naked mole-rats can live over 30 years — about ten times what you'd expect for their size.",
      "Calorie restriction and rapamycin extend lifespan in some animals, but not proven in humans.",
      "The longest confirmed human life is 122 years (Jeanne Calment, died 1997).",
    ],
    challenge: {
      question: "Which has been shown to extend lifespan in mice?",
      options: ["Rapamycin", "Vitamin C megadoses", "Cold showers", "Nothing has"],
      answer: 0,
      explain: "Rapamycin has extended lifespan in mice. Whether it does the same in humans is not yet known.",
    },
  }),
  "universe-explained-1": ep({
    hook: "Fall toward a black hole and something impossible happens. To someone watching from far away, you seem to slow down, redden and freeze at the edge, never quite falling in.",
    story: [
      "A black hole is what you get when a huge amount of mass is squeezed into a small enough space that its gravity becomes overwhelming. Around it is a boundary called the event horizon. Inside that boundary, the speed needed to escape is faster than light. And since nothing travels faster than light, nothing gets out.",
      "Near a black hole, gravity also bends time. That's a real prediction of Einstein's general relativity. A distant observer watching you fall would see your clock running slower and slower as you approach the horizon, your light stretched toward red until you fade from view.",
      "From your own point of view, though, nothing special happens at the horizon. You just keep falling. What happens if you fall into a small black hole is grimmer. The pull on your feet would be so much stronger than on your head that you'd be stretched out. Physicists actually call this spaghettification.",
    ],
    facts: [
      "In 2019 the Event Horizon Telescope collaboration released the first image of a black hole's shadow, in the galaxy M87. In 2022 they released an image of Sagittarius A star, the black hole at the centre of our own galaxy, about four million times the mass of the Sun.",
    ],
    insight: "At the centre of a black hole, our current theories of physics break down. That's not a failure. It's a signpost pointing to where the next big discoveries are hiding.",
    outro: "Next on The Universe Explained: time runs slower downstairs, and your GPS has to know it.",
    insights: [
      "Inside a black hole's event horizon, escaping would require going faster than light.",
      "The first image of a black hole (M87*) was released in 2019.",
      "Sagittarius A*, our galaxy's central black hole, is about four million times the Sun's mass.",
    ],
    challenge: {
      question: "What is 'spaghettification'?",
      options: ["A type of star", "Being stretched by extreme tidal gravity", "A wormhole", "A pasta experiment in orbit"],
      answer: 1,
      explain: "Near a small black hole, gravity pulls far harder on the nearer end of an object than the far end, stretching it out.",
    },
  }),
};
