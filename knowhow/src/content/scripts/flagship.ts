import type { EpisodeScript } from "@/lib/types";
import { ep } from "./helpers";

/** Fully produced flagship series: The Fall of Rome, The Money Game, Inside Your Mind, What Nobody Tells You About Space. */
export const FLAGSHIP_SCRIPTS: Record<string, EpisodeScript> = {
  // ───────────────────────────────────────── THE FALL OF ROME
  "the-fall-of-rome-1": ep({
    hook: "Picture the year 117. If you walked from the edge of Scotland to the deserts of Mesopotamia, you would never leave Rome. Same coins. Same laws. Same roads under your feet. It was the biggest the empire would ever be. And the people living in it had absolutely no idea it was the peak.",
    story: [
      "The emperor at the time was Trajan, a soldier from Spain, and under him the map of Rome stretched across three continents. Historians argue about the numbers, but a common estimate is somewhere around sixty million people. That's a meaningful share of everyone alive on Earth, ruled from a single city on the river Tiber.",
      "How do you hold something that big together, without phones, trains or the internet? Three things. The army, which was professional, paid, and stationed along the borders. The roads, which let that army, and tax collectors, and messages, move faster than anywhere else in the ancient world. And an idea: that being Roman was worth something. In the year 212, citizenship was extended to almost every free person in the empire. A merchant in Syria and a farmer in Gaul could both say, I am Roman.",
      "This stretch of history is called the Pax Romana, the Roman peace. Roughly two centuries, starting with Augustus, where the core of the empire was mostly free from major civil war. Trade boomed. Cities grew. Wine from Italy, grain from Egypt and olive oil from Spain moved around the Mediterranean like it was a giant indoor lake.",
    ],
    facts: [
      "Here's a fact that shows the scale. Rome's network of major roads ran to something like eighty thousand kilometres. Some of those routes are still roads today.",
      "And another. Trajan's successor, Hadrian, looked at that enormous map and decided it was too big. He pulled back from some of the newest conquests and built walls instead. The most famous one still crosses northern England.",
    ],
    insight: "That's the quiet lesson of the peak. Growth feels permanent while you're inside it. But every new border was another place to defend, another army to pay, another emperor who could be tempted to grab power. Rome's size was its strength, and it was also the bill that would eventually come due.",
    outro: "So how did Rome hold all of that together for so long? The answer is literally underneath the ruins: concrete, roads and running water. That's next.",
    insights: [
      "At its peak around 117 CE, the Roman Empire may have held around 60 million people — a big slice of humanity.",
      "In 212 CE, Roman citizenship was extended to almost every free person in the empire.",
      "Growth feels permanent while you're inside it. Every new border is also a new cost.",
    ],
    challenge: {
      question: "Who was emperor when Rome reached its largest size?",
      options: ["Augustus", "Trajan", "Nero", "Constantine"],
      answer: 1,
      explain: "Trajan, around 117 CE. Augustus was the first emperor, Nero is famous for other reasons, and Constantine came two centuries later.",
    },
  }),
  "the-fall-of-rome-2": ep({
    hook: "There is a building in Rome with a roof that has been standing for around nineteen hundred years. No steel inside it. No modern reinforcement. Just Roman concrete, poured by people who had never heard of engineering school.",
    story: [
      "That building is the Pantheon, rebuilt under the emperor Hadrian in the early second century. Its dome is still the largest unreinforced concrete dome in the world. The Romans pulled it off with a few clever tricks. The concrete gets lighter as it rises, using heavier stone near the base and lighter volcanic rock near the top. The ceiling is carved with sunken panels that remove weight. And at the very top there's no keystone at all, just an open circle to the sky, nine metres wide.",
      "Roman concrete itself is a bit of a legend. They mixed lime with volcanic ash, and in sea walls that mixture reacted with seawater over time and grew new minerals that made it tougher. More recent research suggests small lumps of lime left in the mix could help some Roman concrete seal its own cracks.",
      "Then there's water. The city of Rome was eventually fed by eleven aqueducts. Most of their length was actually underground, in channels that dropped incredibly gently over many kilometres. The aqueduct that served the Roman city of Nîmes in France, including the famous Pont du Gard bridge, falls on average just a couple of dozen centimetres per kilometre. Pure gravity, carrying a city's water across a valley.",
    ],
    facts: [
      "Roman towns and army camps were often laid out on a grid, with two main streets crossing in the middle. Walk around the centre of cities like Turin or parts of Barcelona today and you can still trace that Roman plan.",
      "Public baths, public toilets, sewers, fountains: the Romans treated clean water as something a city should provide. Most of Europe wouldn't match that level of urban plumbing again for well over a thousand years.",
    ],
    insight: "Here's the twist. The infrastructure outlived the empire by centuries. Roads, grids and domes kept shaping how people moved and built long after the last emperor was gone. Empires are temporary. Good infrastructure is stubborn.",
    outro: "But engineering couldn't fix the one thing Rome never solved: deciding who was in charge. Next, the year the throne was sold at auction.",
    insights: [
      "The Pantheon's dome is still the largest unreinforced concrete dome in the world, nearly 1,900 years later.",
      "The aqueduct to Roman Nîmes drops on average only a couple of dozen centimetres per kilometre — pure gravity.",
      "Empires are temporary. Good infrastructure is stubborn.",
    ],
    challenge: {
      question: "What helped make Roman marine concrete so durable?",
      options: ["Steel reinforcement", "Volcanic ash reacting with seawater", "Gold dust", "Baking it in kilns"],
      answer: 1,
      explain: "Lime mixed with volcanic ash reacted with seawater over time, growing new minerals. The Romans didn't use steel reinforcement.",
    },
  }),
  "the-fall-of-rome-3": ep({
    hook: "On the twenty-eighth of March, in the year 193, the most powerful job on Earth was sold to the highest bidder. Not metaphorically. There was an actual auction.",
    story: [
      "It started with Commodus, the emperor you might know as the villain from the film Gladiator. He was strangled in his bath on the last day of the year 192, in a palace plot. His replacement, Pertinax, was an older, serious man who tried to restore order and cut spending. That included the money promised to the Praetorian Guard, the emperor's personal bodyguard in Rome.",
      "The Guard did not like that. After just eighty-seven days, soldiers marched into the palace and killed Pertinax. Then they did something extraordinary. They announced that the empire would go to whoever paid them the most.",
      "Two wealthy men bid. The winner was a senator called Didius Julianus, who promised each soldier twenty-five thousand sesterces, several years' pay. He got the throne. He did not get respect. Crowds jeered him in the streets, and three generals commanding big armies on the frontiers each declared themselves emperor instead.",
      "The strongest was Septimius Severus, commanding the legions on the Danube. He marched on Rome. Didius Julianus was abandoned, condemned by the Senate and killed after around sixty-six days on the throne. That one year saw five men claim to be emperor, which is why it's remembered as the Year of the Five Emperors.",
    ],
    facts: [
      "Severus won the civil wars and founded a new dynasty. According to the historian Cassius Dio, his advice to his sons on his deathbed was: get along with each other, make the soldiers rich, and ignore everyone else.",
      "Severus followed his own advice. He raised army pay significantly. That kept him in power. It also made the empire more expensive to run, every single year after.",
    ],
    insight: "This is the moment the deal at the heart of Rome was said out loud. Power didn't come from the Senate, the people, or the gods. It came from whoever could pay the army. And once legitimacy has a price, someone can always outbid you.",
    outro: "Which leaves a very practical question. If you have to keep paying the soldiers more, and you've run out of silver, what do you do? Rome found an answer. It just wasn't a good one.",
    insights: [
      "In 193 CE, the Praetorian Guard auctioned the Roman throne. Didius Julianus won — and lasted about 66 days.",
      "Septimius Severus reportedly told his sons: make the soldiers rich and ignore everyone else.",
      "Once legitimacy has a price, someone can always outbid you.",
    ],
    challenge: {
      question: "Who 'won' the auction for the Roman Empire in 193?",
      options: ["Septimius Severus", "Pertinax", "Didius Julianus", "Commodus"],
      answer: 2,
      explain: "Didius Julianus outbid a rival for the Praetorian Guard's support. Severus then marched on Rome and took power.",
    },
  }),
  "the-fall-of-rome-4": ep({
    hook: "Imagine your phone quietly losing storage every year, while the number on the screen stays exactly the same. That's what happened to Roman money. And almost nobody saw the moment it broke.",
    story: [
      "Rome's main silver coin was the denarius. Early in the empire it was made of nearly pure silver. That mattered, because a coin's value was tied to the metal inside it. People trusted a denarius because they could, in principle, melt it down and still have something valuable.",
      "But emperors needed money, constantly. Remember the soldiers' pay rises from last episode. Silver mines were running down. And there was a tempting shortcut: mix in a little more cheap metal, stamp the same face on the coin, and suddenly the same amount of silver makes more coins. This is called debasement.",
      "It began gently. Nero reduced the silver content in the first century. Later emperors kept going, and in the third century, during a chaotic period of civil wars, plague and invasions, it went into freefall. By around the 270s the main coin was often a bronze coin with a thin wash of silver on the outside, only a few percent silver in total.",
    ],
    facts: [
      "When people noticed, prices rose. Merchants wanted more coins for the same goods, because each coin was worth less. Soldiers and officials were increasingly paid in goods and supplies, because the money itself couldn't be trusted.",
      "In the year 301, the emperor Diocletian tried to fix it by law. His Edict on Maximum Prices set the top legal price for over a thousand goods and services, with harsh penalties for breaking it. It failed. Goods disappeared from markets, and the edict was largely ignored.",
    ],
    insight: "Here's the big idea. Debasing money is a hidden tax. Every time Rome thinned out its coins, it took a bit of value from everyone holding them, without ever announcing a tax rise. The Romans didn't have the word inflation, but they lived through it. And the same pattern, a government stretching money to cover promises, shows up again and again in history.",
    outro: "Next time, we zoom out on the third century, when Rome went through roughly two dozen emperors in fifty years. Plague, invasion, and a revolving door on the palace.",
    insights: [
      "By around the 270s, Rome's main 'silver' coin was often only a few percent silver.",
      "Diocletian's Edict on Maximum Prices (301 CE) tried to cap prices by law. It failed.",
      "Debasing money is a hidden tax on everyone who holds it.",
    ],
    challenge: {
      question: "What is 'debasement'?",
      options: ["Raising taxes openly", "Reducing the precious metal in coins", "Building new mints", "Banning foreign coins"],
      answer: 1,
      explain: "Debasement means putting less precious metal into each coin while keeping its face value, which quietly erodes what money is worth.",
    },
  }),

  // ───────────────────────────────────────── THE MONEY GAME
  "the-money-game-1": ep({
    hook: "On a small island in the Pacific, there is money so big you can't move it. Some of it is at the bottom of the sea. And people still used it to pay for things.",
    story: [
      "The island is Yap, in Micronesia. Its traditional money is rai: huge carved stone discs, some taller than a person, quarried on another island hundreds of kilometres away and brought back by canoe. The stones were far too heavy to carry around for shopping. So when one changed hands, it usually didn't move at all. Everyone just remembered who owned it now.",
      "There's a famous story about one giant stone that was lost overboard during the journey home and sank. The community agreed it still existed, and its owner was still considered wealthy. A stone nobody could see, at the bottom of the ocean, still counted as money.",
      "That sounds strange until you look at your own bank account. It's a number on a screen, stored on a computer you'll never see. You trust that number because everyone else does too.",
    ],
    facts: [
      "School textbooks often say money was invented to replace bartering, swapping chickens for shoes. But many anthropologists point out there's little evidence of whole societies running on barter. What we find instead is credit: records of who owes what to whom, sometimes thousands of years before coins.",
      "Modern money isn't backed by gold either. In 1971 the United States ended the conversion of dollars into gold for foreign governments, and today's major currencies are what's called fiat money. Valuable because a government says it's legal tender, and because people trust it.",
    ],
    insight: "So here's the big idea of this whole series. Money isn't a thing. It's a story. A shared agreement about who owes what, backed by trust. When that trust is strong, a number on a screen buys you a house. When it breaks, piles of cash can become nearly worthless.",
    outro: "Which raises the obvious question: if money is just a number, who gets to create it? The answer is probably not who you think. That's next.",
    insights: [
      "On Yap, a giant stone at the bottom of the sea was still counted as money — because everyone agreed it was.",
      "There's little evidence of whole societies running on barter. Credit records came first.",
      "Money isn't a thing. It's a story backed by trust.",
    ],
    challenge: {
      question: "What makes modern 'fiat' money valuable?",
      options: ["It's backed by gold", "Trust and government legal tender", "It's made of rare paper", "Banks keep equal cash in vaults"],
      answer: 1,
      explain: "Fiat money isn't convertible into gold. Its value comes from trust and from governments making it legal tender, including for paying taxes.",
    },
  }),
  "the-money-game-2": ep({
    hook: "Ask most people where money comes from and they'll say the government prints it. Ask the Bank of England, and you get a very different answer.",
    story: [
      "In 2014 the Bank of England published a paper with a slightly dramatic message. Most of the money in the modern economy, it said, isn't created by printing presses at all. It's created by ordinary commercial banks, when they make loans.",
      "Here's how it works. Say you borrow ten thousand pounds from a bank to buy a car. The bank doesn't go to a vault and hand you ten thousand pounds that someone else deposited. It types ten thousand pounds into your account. That deposit is brand new money. It didn't exist a moment ago.",
      "And when you pay the loan back, that money disappears again. Lending creates money. Repaying loans destroys it. The amount of money in the economy is constantly expanding and shrinking with borrowing.",
    ],
    facts: [
      "Notes and coins are only a tiny slice of the money in the UK. In that 2014 paper, the Bank of England estimated cash at about three percent of the money in the economy. The rest was bank deposits.",
      "So what stops banks creating infinite money? Mostly, the need to stay profitable and safe. Banks must hold capital, keep enough liquid assets, and they have to find borrowers they believe will pay them back. The central bank also influences how much people want to borrow by setting interest rates.",
    ],
    insight: "This changes how you see debt. Debt isn't just something that happens to money. In a very real sense, today's money is debt. Every pound in your account is somebody's promise, written down by a bank.",
    outro: "So if banks and governments can expand the money supply, what happens to prices when the amount of money grows faster than the amount of stuff? Next episode: why everything keeps getting more expensive.",
    insights: [
      "Most money in the UK economy is bank deposits created when banks make loans — not printed cash.",
      "The Bank of England estimated notes and coins at about 3% of money in the economy (2014).",
      "Lending creates money. Repaying loans destroys it.",
    ],
    challenge: {
      question: "When a commercial bank makes you a loan, what happens?",
      options: ["It lends out someone else's savings", "It creates a new deposit — new money", "It borrows from the government", "It prints banknotes"],
      answer: 1,
      explain: "The bank credits your account with a new deposit. That's newly created money, which is destroyed again as the loan is repaid.",
    },
  }),
  "the-money-game-3": ep({
    hook: "If inflation runs at two percent a year, a five pound pint today costs about six pounds ten in ten years. Your beer didn't get better. Your money got weaker.",
    story: [
      "Inflation is the rate at which prices rise across the economy. To measure it, statisticians track a basket of hundreds of everyday goods and services, things like bread, rent, phone contracts and cinema tickets, and see how the total cost changes over time. In the UK, the headline measure is called CPI, the Consumer Prices Index.",
      "Why do prices rise? There are a few main engines. Demand pull, where people want to buy more than the economy can produce, so sellers can raise prices. Cost push, where it simply gets more expensive to make things, like when energy prices spike. And expectations. If everyone expects prices to rise, workers ask for bigger pay rises and businesses raise prices in advance, which helps make it happen.",
      "In late 2022, UK inflation hit eleven point one percent, the highest in about forty years, driven heavily by energy and food costs. That meant if your pay didn't rise by eleven percent, you were effectively taking a pay cut.",
    ],
    facts: [
      "Most central banks, including the Bank of England, aim for inflation of around two percent. Not zero. A little inflation is generally seen as healthier than falling prices, which can make people delay spending and businesses delay hiring.",
      "Here's a handy shortcut called the rule of seventy-two. Divide seventy-two by the inflation rate, and you get roughly how many years it takes for money's buying power to halve. At three percent inflation, cash sitting still loses half its value in about twenty-four years.",
    ],
    insight: "So here's the uncomfortable truth. Cash under a mattress isn't safe. It's slowly melting. That doesn't mean you should panic and spend it, but it does mean the real question about money isn't just how much you have. It's how fast it's growing compared to prices.",
    outro: "Which brings us to the most powerful force in personal finance. Some people call it a superpower. Others call it a trap. Next: compound interest.",
    insights: [
      "At 2% inflation, a £5 pint costs about £6.10 in ten years.",
      "UK CPI inflation peaked at 11.1% in October 2022 — about a 40-year high.",
      "Rule of 72: divide 72 by the inflation rate to estimate how long money takes to lose half its buying power.",
    ],
    challenge: {
      question: "Using the rule of 72, at 6% inflation roughly how long until money loses half its buying power?",
      options: ["6 years", "12 years", "36 years", "72 years"],
      answer: 1,
      explain: "72 divided by 6 is 12. It's a shortcut, not exact, but it's a great gut-check.",
    },
  }),
  "the-money-game-4": ep({
    hook: "You've probably seen the quote. Albert Einstein supposedly called compound interest the eighth wonder of the world. There's no good evidence he ever said it. But the maths is so dramatic that people keep wanting him to.",
    story: [
      "Simple interest is when you earn interest only on what you originally put in. Compound interest is when you also earn interest on your interest. Year one, you earn a little. Year two, you earn on the original amount plus last year's gains. The growth snowballs.",
      "Here's an illustration. Imagine putting away one hundred pounds a month and it grows at seven percent a year. That's a hypothetical, not a guarantee. Start at twenty and stop at sixty-five, and you'd have put in fifty-four thousand pounds. With that growth rate, the pot ends up around three hundred and eighty thousand. Start at thirty instead, and you put in forty-two thousand, but the pot ends up around one hundred and eighty thousand. Ten extra years at the start roughly doubles the ending.",
      "That's the strange thing about compounding. The biggest growth happens at the end, and the end only exists if you started early.",
    ],
    facts: [
      "Compounding works against you just as hard. Credit cards often charge interest rates above twenty percent a year. Leave a balance unpaid and interest gets charged on the interest, which is why small debts can quietly balloon.",
      "The rule of seventy-two works here too. At seven percent growth, money roughly doubles every ten years or so. At twenty percent interest on a credit card, a debt you ignore can roughly double in under four years.",
    ],
    insight: "Compound interest is really about time. It rewards patience and punishes delay, in both directions. The single most useful money habit isn't picking the perfect investment. It's starting early, and avoiding high interest debt that compounds against you.",
    outro: "Next time on The Money Game, we open your payslip and translate every line, so you know exactly where your money goes before you ever see it.",
    insights: [
      "There's no good evidence Einstein ever called compound interest 'the eighth wonder of the world'.",
      "£100 a month at a hypothetical 7% from age 20 to 65 grows to around £380,000. Starting at 30: around £180,000.",
      "Compound interest rewards patience and punishes delay — in both directions.",
    ],
    challenge: {
      question: "What's the difference between simple and compound interest?",
      options: ["Compound interest is always higher than 10%", "Compound interest earns interest on previous interest", "Simple interest only applies to debts", "There's no difference"],
      answer: 1,
      explain: "Compound interest is interest on interest. That's what makes it snowball over time, for savings and for debts.",
    },
  }),

  // ───────────────────────────────────────── INSIDE YOUR MIND
  "inside-your-mind-1": ep({
    hook: "Change one word in a question, and you can change what someone remembers seeing. In 1974, two psychologists proved it with a car crash.",
    story: [
      "The researchers were Elizabeth Loftus and John Palmer. They showed students short films of traffic accidents, then asked them questions. The key question was: about how fast were the cars going when they hit each other? Except for some students, the word hit was swapped. Smashed. Collided. Bumped. Contacted.",
      "The films were the same. The answers weren't. People asked about cars that smashed estimated speeds around forty miles an hour. People asked about cars that hit gave estimates closer to thirty-four.",
      "Then came the unsettling part. A week later, the students were asked if they'd seen any broken glass. There was no broken glass in the film. But the people who heard the word smashed were more than twice as likely to say yes. One verb had planted a memory.",
    ],
    facts: [
      "Psychologists now think memory works less like a video recording and more like a reconstruction. Each time you remember something, your brain rebuilds it from pieces, and in that rebuilding, it can be updated, blended or edited. Researchers call one version of this process reconsolidation.",
      "Even our most vivid memories aren't safe. After the Challenger space shuttle disaster in 1986, researchers asked students where they were when they heard the news. Years later they asked again. Many accounts had changed significantly, yet people felt highly confident in the new version.",
    ],
    insight: "Here's the takeaway. Confidence is a feeling, not proof. A memory can feel crystal clear and still be wrong. That's not a flaw in you. It's how a brain that's built for making sense of the world, rather than archiving it, works.",
    outro: "If your memory edits things on its own, what else is your brain quietly doing behind your back? Next time: the shortcut machine, and the mistakes your fast brain makes without asking you first.",
    insights: [
      "In Loftus and Palmer's 1974 study, the word 'smashed' made people more likely to 'remember' broken glass that never existed.",
      "Memory is a reconstruction, not a recording. Each recall can update it.",
      "Confidence is a feeling, not proof.",
    ],
    challenge: {
      question: "What did the word 'smashed' do in the 1974 car-crash study?",
      options: ["Made people forget the film", "Raised speed estimates and false memories of broken glass", "Had no measurable effect", "Made people more accurate"],
      answer: 1,
      explain: "People who heard 'smashed' estimated higher speeds and were more likely to falsely remember broken glass a week later.",
    },
  }),
  "inside-your-mind-2": ep({
    hook: "A bat and a ball cost one pound ten in total. The bat costs one pound more than the ball. How much is the ball? If ten pence just popped into your head, you're in very good company. And you're wrong.",
    story: [
      "The ball costs five pence. If it cost ten, the bat would cost one pound ten, and together they'd be one pound twenty. The answer that appears instantly feels right, but it isn't.",
      "That puzzle comes from research by the psychologist Shane Frederick, building on the work of Daniel Kahneman and Amos Tversky. Kahneman later popularised a simple way to think about it: two systems of thinking. System one is fast, automatic and effortless. It recognises faces, reads emotions and finishes the phrase bread and. System two is slow, deliberate and lazy. It does long division and checks your work, but only when it's forced to.",
      "Most of the time, system one is brilliant. It's why you can drive a familiar route while chatting. But it runs on shortcuts called heuristics, and shortcuts have blind spots.",
    ],
    facts: [
      "In Frederick's studies, around half of students at elite universities like Harvard, MIT and Princeton gave the intuitive wrong answer to the bat and ball question. Intelligence doesn't switch off the fast system.",
      "One famous shortcut is the availability heuristic. We judge how likely something is by how easily examples come to mind. That's why plane crashes, which are heavily reported, often feel riskier than car journeys, which are statistically far more dangerous per trip for most people.",
    ],
    insight: "The goal isn't to stop using your fast brain. It's to notice when the stakes are high and the answer arrived suspiciously quickly. That's the moment to make system two do some work.",
    outro: "System one doesn't only shape what you think. It shapes what you do, every day, on autopilot. Next: the habit loop, and how routines take over the steering wheel.",
    insights: [
      "Bat and ball: the ball costs 5p, not 10p. Around half of students at top universities get it wrong.",
      "System one is fast and automatic. System two is slow, deliberate — and lazy.",
      "When the stakes are high and the answer came instantly, check it.",
    ],
    challenge: {
      question: "The availability heuristic means we judge likelihood by…",
      options: ["Actual statistics", "How easily examples come to mind", "What experts say", "Whatever happened most recently to us only"],
      answer: 1,
      explain: "We judge how common something is by how easily examples come to mind, which is why heavily reported events can feel more likely than they are.",
    },
  }),
  "inside-your-mind-3": ep({
    hook: "Think about this morning. Which hand did you use to brush your teeth? Did you decide that? Probably not. A big chunk of what you do every day isn't really a decision at all.",
    story: [
      "In the nineteen nineties, neuroscientists at MIT, in work led by Ann Graybiel, trained rats to run a simple maze to find chocolate. At first, brain activity was high all the way through the run. The rats were sniffing, exploring, deciding. But as the route became familiar, something changed. Activity in a deep brain region called the basal ganglia spiked at the start and the end, and quietened in the middle. The routine had been packed into a chunk.",
      "That's a habit. Writers often describe it as a loop: a cue that triggers it, a routine that runs on autopilot, and a reward that tells your brain this loop is worth remembering. The phone buzzes, you pick it up, you get a hit of novelty. Loop complete.",
      "Habits exist because they save effort. If you had to consciously decide every step of making a cup of tea, you'd be exhausted by breakfast.",
    ],
    facts: [
      "How long does a new habit take to form? A 2009 study by Phillippa Lally and colleagues at University College London followed people building new daily habits. The average was sixty-six days until the behaviour felt automatic, but it ranged from eighteen days to over two hundred. The twenty-one day rule you've heard is not what this research found.",
      "One of the best-supported tricks for building habits is called an implementation intention. Instead of I'll exercise more, you say: when I get home from work, I'll put on my trainers. Linking a new behaviour to a specific cue makes it much more likely to happen.",
    ],
    insight: "Here's the hopeful part. Willpower is unreliable, but cues are not. You don't need to be a different person to change. You need to change what triggers you, and make the routine you want the easiest thing to do.",
    outro: "Now, some habit loops aren't accidents. They're designed, by very smart people, to be as hard to break as possible. Next: why you can't stop scrolling.",
    insights: [
      "In one UCL study, new habits took an average of 66 days to feel automatic — with a range from 18 to over 200.",
      "Habits pack routines into 'chunks' so your brain can run them on autopilot.",
      "Willpower is unreliable. Cues are not.",
    ],
    challenge: {
      question: "Which is an implementation intention?",
      options: ["I'll be healthier this year", "When I get home, I'll put on my trainers", "I really should read more", "Exercise is important"],
      answer: 1,
      explain: "Implementation intentions link a specific behaviour to a specific cue: when X happens, I'll do Y.",
    },
  }),
  "inside-your-mind-4": ep({
    hook: "There's a reason you pull down to refresh your feed with exactly the same motion as pulling a slot machine lever. And there's a reason you never seem to reach the bottom.",
    story: [
      "Back in the mid twentieth century, the psychologist B. F. Skinner studied how animals learn from rewards. He found something counterintuitive. Animals rewarded every single time they pressed a lever learned quickly, but also stopped quickly when the rewards ended. Animals rewarded unpredictably, sometimes after two presses, sometimes after twenty, kept pressing far longer. This is called a variable reward schedule, and it's exactly how slot machines work.",
      "Now think about your feed. Most posts are fine. Some are boring. And every so often, something is hilarious, or shocking, or about you. You never know which swipe will pay out, so you keep swiping.",
      "Then there's infinite scroll. Its inventor, the designer Aza Raskin, has publicly said he regrets how it's been used. Before it, a page had an end, a natural moment to ask, do I want to keep going? Infinite scroll removed that stopping cue.",
    ],
    facts: [
      "Dopamine is often called the pleasure chemical, but that's a bit misleading. Research by Wolfram Schultz and others showed dopamine neurons respond strongly to rewards that are better than expected, and to the anticipation of rewards. That's why the possibility of something good can feel more compelling than the thing itself.",
      "Small frictions work surprisingly well against this. Moving apps off your home screen, turning off non-essential notifications, or setting your screen to greyscale are all ways people add stopping cues back in.",
    ],
    insight: "Here's the key insight. If you struggle to stop scrolling, it's not a personal failure. You're a human brain up against a system designed with learning theory. The fix isn't more willpower. It's redesigning your environment so the loop has an exit.",
    outro: "Next time on Inside Your Mind: why feeling sure means much less than you think, and how confidence and accuracy came to be strangers.",
    insights: [
      "Unpredictable rewards keep behaviour going longer than predictable ones. Slot machines and feeds both use this.",
      "The inventor of infinite scroll, Aza Raskin, has said he regrets how it's been used.",
      "Dopamine responds strongly to rewards that are better than expected — and to anticipation.",
    ],
    challenge: {
      question: "Which reward schedule keeps behaviour going the longest?",
      options: ["Reward every time", "Never reward", "Unpredictable (variable) rewards", "Rewards only on weekends"],
      answer: 2,
      explain: "Variable rewards are the most persistent. Because a payout could come at any moment, the behaviour keeps going long after rewards dry up.",
    },
  }),

  // ───────────────────────────────────────── WHAT NOBODY TELLS YOU ABOUT SPACE
  "what-nobody-tells-you-about-space-1": ep({
    hook: "Astronauts come back from space taller. They also come back with puffy faces, skinny legs and bones that have been quietly dissolving. Space is not kind to the human body.",
    story: [
      "Start with height. On Earth, gravity squashes the soft discs between the bones of your spine all day. In orbit, there's no squashing, so the discs expand. NASA says astronauts can grow up to about three percent taller in space. That sounds fun, until you remember spacesuits and seats are built to fit, and many astronauts report back pain.",
      "Then there's the fluid shift. On Earth, gravity pulls blood and other fluids toward your feet. In space, those fluids drift upward. Astronauts describe puffy faces, stuffy noses, and legs that get thinner. Some call it the puffy face, bird legs look.",
      "And bones. Without the constant load of gravity, the body starts to decide that heavy bones are optional. Astronauts on long missions can lose bone mass in weight bearing bones at around one to one and a half percent per month without countermeasures. That's why astronauts on the International Space Station exercise for around two hours a day, on treadmills with harnesses and specialised resistance machines.",
    ],
    facts: [
      "NASA studied this with twins. Astronaut Scott Kelly spent nearly a year on the space station while his identical twin, Mark, also an astronaut, stayed on Earth. Researchers found many changes in Scott's body during the mission, from gene expression to his gut microbes. Most returned to normal after he came home, though some did not right away.",
      "Some astronauts also develop changes to the back of their eyes during long missions, likely linked to that upward fluid shift. Researchers are still working out exactly why.",
    ],
    insight: "Here's what that tells you. Your body isn't a fixed object. It's constantly adapting to the forces it feels. Gravity isn't just keeping you on the ground. It's shaping your bones, your blood and your height every single day.",
    outro: "Next up, the thing you see every morning that's quietly lying to you: the Sun, and how old its light really is.",
    insights: [
      "NASA says astronauts can grow up to about 3% taller in space as their spinal discs expand.",
      "Without exercise, astronauts can lose around 1–1.5% of bone mass per month in weight-bearing bones.",
      "Gravity isn't just keeping you on the ground. It's shaping your body every day.",
    ],
    challenge: {
      question: "Why do astronauts get taller in orbit?",
      options: ["They stretch every morning", "Spinal discs expand without gravity compressing them", "Their bones grow faster", "Space suits pull them upward"],
      answer: 1,
      explain: "Without gravity squashing them, the discs between the vertebrae expand. Height returns to normal back on Earth.",
    },
  }),
  "what-nobody-tells-you-about-space-2": ep({
    hook: "When you look at the Sun, you're seeing the past. About eight minutes in the past. But the energy in that light started its journey long before you were born. Possibly long before the pyramids.",
    story: [
      "Let's start with the easy part. Light travels at around three hundred thousand kilometres every second. The Sun is about one hundred and fifty million kilometres away. So sunlight takes about eight minutes and twenty seconds to reach us. If the Sun vanished right now, you'd have a few minutes of normal sunshine before anyone noticed.",
      "Now the strange part. The Sun's energy is made deep in its core, where the temperature is around fifteen million degrees Celsius and hydrogen nuclei fuse into helium. That energy then has to get out. But the inside of the Sun is so dense that the energy is absorbed and re-emitted over and over, bouncing around in a random walk.",
      "Estimates vary a lot, but the energy can take tens of thousands to hundreds of thousands of years to work its way out of the Sun's interior. Then, once it finally reaches the surface, it crosses the gap to Earth in eight minutes.",
    ],
    facts: [
      "The Sun converts roughly four million tonnes of its own mass into energy every second. It's so big it can keep doing that for billions of years.",
      "The Sun contains about ninety-nine point eight percent of all the mass in the solar system. Jupiter, Earth and everything else are basically crumbs.",
    ],
    insight: "So the warmth on your face is a delivery from deep time. Every sunrise is light from now, carrying energy that may have been made before human civilisation existed. Space is full of these time delays, and they change how you think about the word now.",
    outro: "Next time we head to the planet next door, which looks gorgeous in a telescope and is, quite literally, hell. Welcome to Venus.",
    insights: [
      "Sunlight takes about 8 minutes 20 seconds to reach Earth.",
      "Energy made in the Sun's core can take tens of thousands of years or more to reach its surface.",
      "The Sun holds about 99.8% of all the mass in the solar system.",
    ],
    challenge: {
      question: "Roughly how long does sunlight take to reach Earth?",
      options: ["8 seconds", "8 minutes", "8 hours", "8 days"],
      answer: 1,
      explain: "About 8 minutes 20 seconds. The much longer journey is the energy getting out of the Sun's dense interior.",
    },
  }),
  "what-nobody-tells-you-about-space-3": ep({
    hook: "There is a planet where a day lasts longer than a year, where it's hot enough to melt lead, and where the air would crush you like you were deep under the sea. It's our nearest planetary neighbour.",
    story: [
      "Venus is almost the same size as Earth, which is why it's sometimes called our twin. It's also the brightest planet in our night sky. But Venus is the hottest planet in the solar system, with surface temperatures around four hundred and sixty five degrees Celsius. That's hotter than Mercury, which is much closer to the Sun.",
      "The reason is its atmosphere. It's mostly carbon dioxide and incredibly thick. Heat from sunlight gets in and can't get out, a runaway greenhouse effect. The pressure at the surface is around ninety times Earth's, similar to being about nine hundred metres underwater. And the clouds contain sulfuric acid.",
      "Now the weird part. Venus spins incredibly slowly, and backwards compared to most planets. One rotation takes about two hundred and forty three Earth days. But one orbit of the Sun only takes about two hundred and twenty five. So a Venus day, measured by one spin, is longer than its year.",
    ],
    facts: [
      "The Soviet Union landed several Venera probes on Venus. In 1982, Venera 13 survived on the surface for about two hours and sent back colour images before the heat and pressure destroyed it.",
      "Because Venus spins backwards, if you could stand on the surface and see through the clouds, the Sun would rise in the west and set in the east.",
    ],
    insight: "Venus is a warning written in planetary science. Two worlds of similar size can end up completely different depending on what's in their atmosphere. Studying Venus is one way scientists understand how greenhouse effects work, including on Earth.",
    outro: "Next time, we try something that's genuinely hard: picturing how big space actually is. Bring a peppercorn.",
    insights: [
      "Venus is hotter than Mercury: around 465°C at the surface.",
      "A day on Venus (about 243 Earth days) is longer than its year (about 225).",
      "In 1982, Venera 13 survived about two hours on the surface of Venus.",
    ],
    challenge: {
      question: "Why is Venus hotter than Mercury?",
      options: ["It's closer to the Sun", "Its thick CO₂ atmosphere traps heat", "It has active volcanoes everywhere", "It's made of iron"],
      answer: 1,
      explain: "Venus has a runaway greenhouse effect from its thick carbon dioxide atmosphere. Mercury is closer but has almost no atmosphere to hold heat.",
    },
  }),
  "what-nobody-tells-you-about-space-4": ep({
    hook: "Every diagram of the solar system you saw at school was a lie. Not on purpose. The truth just doesn't fit on a page.",
    story: [
      "In posters, the planets sit neatly next to each other like beads on a string. If they were drawn to the correct scale and distance, the poster would be mostly empty, and the planets would be specks too small to see.",
      "There's a famous way to feel this, created by the astronomy writer Guy Ottewell, called the thousand yard model. Make the Sun the size of a bowling ball. On that scale, Earth is a peppercorn about twenty six yards away, roughly twenty four metres. Jupiter is a chestnut over a hundred yards from the bowling ball. And Pluto is a speck of dust about a thousand yards out, close to a kilometre.",
      "Now the brain breaking part. On that same scale, the nearest star to the Sun, Proxima Centauri, would be another bowling ball sized object thousands of miles away. A peppercorn in London, and the nearest neighbouring star somewhere across an ocean.",
    ],
    facts: [
      "Light from Proxima Centauri takes about four point two years to reach us. Our fastest spacecraft would need thousands of years to get there.",
      "Our galaxy, the Milky Way, contains somewhere between one hundred and four hundred billion stars. And it's one of billions of galaxies in the observable universe.",
    ],
    insight: "Space is mostly space. The most accurate word to describe the universe isn't busy or crowded. It's empty. And that emptiness is why everything we can see, every planet and star, is so rare and so precious.",
    outro: "Next time on What Nobody Tells You About Space: astronauts say space has a smell. We'll find out what it is.",
    insights: [
      "In the thousand-yard model, if the Sun is a bowling ball, Earth is a peppercorn about 26 yards away.",
      "Light from Proxima Centauri, the nearest star, takes about 4.2 years to reach us.",
      "Space is mostly space. That emptiness is what makes planets precious.",
    ],
    challenge: {
      question: "In the thousand-yard model, what size is Earth if the Sun is a bowling ball?",
      options: ["A football", "A peppercorn", "A chestnut", "A grape"],
      answer: 1,
      explain: "Earth is a peppercorn about 26 yards away. Jupiter is the chestnut, over 100 yards out.",
    },
  }),
};
