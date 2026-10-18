import type { Art, EpisodeScript } from "@/lib/types";
import { ep } from "./scripts/helpers";

/**
 * Demo mode for "Make me smarter about…".
 *
 * These five sample series were written in advance by the KNOWHOW team to show
 * the format the AI pipeline produces. They are NOT generated from the user's
 * prompt, and the UI always says so. With ANTHROPIC_API_KEY configured, real
 * generation replaces them.
 */
export interface DemoPlan {
  key: string;
  keywords: string[];
  prompt: string;
  title: string;
  tagline: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: import("@/lib/types").CategoryId;
  art: Art;
  followUps: string[];
  episodes: { title: string; description: string; script: EpisodeScript }[];
}

export const DEMO_PLANS: DemoPlan[] = [
  {
    key: "f1",
    keywords: ["formula 1", "f1", "formula one", "racing", "motorsport", "grand prix"],
    prompt: "How does Formula 1 actually work?",
    title: "Lights Out: Formula 1, Decoded",
    tagline: "Why the fastest car doesn't always win.",
    description: "A four-minute-a-pop crash course in what's really happening on track: aerodynamics, tyres and strategy.",
    difficulty: "beginner",
    category: "technology",
    art: { motif: "rays", palette: ["#FF7768", "#111114", "#DFFF57", "#111114"] },
    followUps: ["How do F1 teams make money?", "Explain aerodynamics like I'm 20", "The history of motorsport safety"],
    episodes: [
      {
        title: "Upside-Down Wings",
        description: "Why an F1 car is basically an aeroplane flying the wrong way.",
        script: ep({
          hook: "A Formula One car is shaped a bit like an aeroplane wing. Just upside down. Instead of lifting off the ground, it's pushed into it.",
          story: [
            "That push is called downforce. Air flowing over and under the car, especially through the wings and the shaped floor, creates a pressure difference that presses the car onto the track. More downforce means more grip, and more grip means faster corners.",
            "At high speed, the downforce can be greater than the car's own weight. That's why people often say an F1 car could, in theory, drive upside down on a ceiling. It's never been tried, but the physics points that way.",
          ],
          facts: ["The trade off is drag. Downforce costs straight line speed, so teams tune their wings differently for twisty tracks like Monaco and fast ones like Monza."],
          insight: "Formula One is less about raw engine power than about managing air. The fastest teams are the ones who make the air do the most work.",
          outro: "Next: tyres, and why a few degrees of temperature can decide a race.",
          insights: ["F1 cars generate downforce: wings push the car onto the track for grip.", "Teams trade downforce against drag depending on the circuit."],
          challenge: { question: "What does downforce give an F1 car?", options: ["Top speed", "Grip in corners", "Fuel efficiency", "Lighter weight"], answer: 1, explain: "Downforce presses the car onto the track for more grip, at the cost of some drag." },
        }),
      },
      {
        title: "Tyres Are Everything",
        description: "Compounds, temperatures and the art of not destroying your rubber.",
        script: ep({
          hook: "In Formula One, tyres aren't just rubber. They're a strategy game.",
          story: [
            "Teams can choose between softer and harder tyre compounds. Softer tyres grip more and are faster, but wear out quickly. Harder tyres last longer but are slower. Rules require cars to use different dry compounds in a dry race, which forces strategic choices.",
            "Tyres also have a working temperature window. Too cold and they don't grip. Too hot and they degrade fast. Drivers spend much of a race managing that balance.",
          ],
          facts: ["A pit stop to change all four tyres can take around two to three seconds when it goes perfectly."],
          insight: "A race is often won by the team that understands its tyres best, not the team with the fastest car on a single lap.",
          outro: "Next: strategy, and why pitting at the right moment can beat a faster rival.",
          insights: ["Soft tyres are faster but wear quickly; hard tyres last longer.", "Perfect F1 pit stops take around two to three seconds."],
        }),
      },
      { title: "The Undercut", description: "Strategy: how pitting first can win you the position.", script: ep({ hook: "Sometimes the smartest way to overtake someone in Formula One is to stop first.", story: ["It's called the undercut. If you pit before the car ahead, you get fresh tyres while they're on worn ones. For a few laps you're much faster, and when they finally pit, you may have jumped ahead."], facts: ["The opposite move, staying out longer on a clear track, is called the overcut."], insight: "Strategy turns racing into chess at three hundred kilometres an hour.", outro: "That's the series. Try a follow up topic to keep going.", insights: ["The undercut: pit first, use fresh tyres to jump ahead."] }) },
    ],
  },
  {
    key: "investing",
    keywords: ["invest", "investing", "stocks", "shares", "stock market", "index fund"],
    prompt: "Teach me the basics of investing.",
    title: "Your First £100",
    tagline: "Investing basics, minus the jargon.",
    description: "Three short episodes on what investing is, why time matters and how risk works. Educational only — not financial advice.",
    difficulty: "beginner",
    category: "finance",
    art: { motif: "bars", palette: ["#DFFF57", "#0B2E1F", "#7CF2A6", "#0B2E1F"] },
    followUps: ["What is an ISA?", "How do pensions work?", "Explain bonds simply"],
    episodes: [
      { title: "Owning vs Saving", description: "What it means to own a slice of the world.", script: ep({ hook: "Saving is keeping money. Investing is owning things that might grow.", story: ["When you buy a share, you own a tiny slice of a company. If the company grows its profits over time, your slice can become more valuable. If it struggles, your slice can lose value."], facts: ["A fund lets you own small slices of many companies at once, which spreads risk."], insight: "Investing trades certainty for growth potential. That's why it suits money you won't need soon.", outro: "Next: why time is your biggest advantage.", insights: ["A share is a tiny slice of a company.", "Funds spread your money across many companies."] }) },
      { title: "Time Is the Cheat Code", description: "Compounding, explained in two minutes.", script: ep({ hook: "The most powerful thing a beginner investor has isn't money. It's time.", story: ["Growth compounds. Returns earn their own returns, and over decades that snowball can become larger than everything you put in. Starting a few years earlier can make a bigger difference than investing larger amounts later."], facts: ["Returns are never guaranteed. Markets fall as well as rise, sometimes for years."], insight: "Start small, start early, and give it time.", outro: "Next: risk, and why it isn't the same as losing.", insights: ["Compounding means returns earn their own returns."] }) },
      { title: "Risk Without Fear", description: "Volatility, diversification and sleeping at night.", script: ep({ hook: "Your investments will go down. That's not a sign something's wrong. It's the price of admission.", story: ["Volatility is how much prices bounce around. Over short periods, the stock market can be wild. Over long periods, broad markets have historically trended upward, though past performance doesn't guarantee the future."], facts: ["Diversification, owning lots of different things, reduces the damage any single failure can do."], insight: "Risk you understand is easier to live with than risk you ignore.", outro: "That's the series. Pick a follow up topic to keep going.", insights: ["Volatility is the price of potential growth.", "Diversification limits the damage of any single failure."] }) },
    ],
  },
  {
    key: "quantum",
    keywords: ["quantum", "physics", "qubit", "superposition", "entanglement"],
    prompt: "Explain quantum physics like I'm 20.",
    title: "Quantum, Casually",
    tagline: "The weirdest rules in the universe, explained like a friend would.",
    description: "Superposition, uncertainty and entanglement — accurately, but without the maths.",
    difficulty: "intermediate",
    category: "science",
    art: { motif: "orbit", palette: ["#111114", "#B6A1FF", "#57E3FF", "#F7F4E9"] },
    followUps: ["How do quantum computers work?", "What is the double-slit experiment?", "Explain relativity like I'm 20"],
    episodes: [
      { title: "Tiny Things Play by Different Rules", description: "Why particles behave like waves.", script: ep({ hook: "At the smallest scales, reality stops behaving like the world you know.", story: ["Electrons and photons can behave like particles and like waves. In the famous double slit experiment, particles fired one at a time still build up a wave like interference pattern, as if each one explored more than one path."], facts: ["Quantum mechanics is one of the most precisely tested theories in science."], insight: "Weird doesn't mean wrong. Quantum theory is strange and incredibly well supported.", outro: "Next: superposition.", insights: ["Single particles can build up an interference pattern in the double-slit experiment."] }) },
      { title: "Superposition, Without the Cat", description: "What 'being in two states' actually means.", script: ep({ hook: "Superposition doesn't mean something is secretly one thing. It means the maths describes a combination of possibilities.", story: ["Before a measurement, a quantum system is described by a combination of possible outcomes, each with a probability. When you measure, you get one definite result."], facts: ["Schrödinger's cat was invented in 1935 to show how strange this seems when scaled up."], insight: "Quantum mechanics predicts probabilities brilliantly. What's really happening underneath is still debated.", outro: "Next: entanglement.", insights: ["Schrödinger's cat (1935) was meant to highlight how strange superposition seems at large scales."] }) },
      { title: "Entanglement", description: "Spooky, but not faster-than-light messaging.", script: ep({ hook: "Two particles can be linked so that measuring one tells you about the other, no matter how far apart they are.", story: ["Einstein called it spooky action at a distance. Experiments have confirmed entanglement many times. But it can't be used to send messages faster than light, because each individual result still looks random."], facts: ["The 2022 Nobel Prize in Physics recognised experiments on entangled photons."], insight: "The universe is more connected than common sense suggests, but it still keeps its speed limit.", outro: "That's the series. Choose a follow up to keep exploring.", insights: ["Entanglement can't send messages faster than light.", "The 2022 Physics Nobel recognised experiments with entangled photons."] }) },
    ],
  },
  {
    key: "labels",
    keywords: ["record label", "labels", "music industry", "royalties", "music money"],
    prompt: "How do record labels make money?",
    title: "Follow the Royalties",
    tagline: "Where the money goes when a song blows up.",
    description: "Advances, masters and recoupment — the business model behind the music.",
    difficulty: "beginner",
    category: "culture",
    art: { motif: "waves", palette: ["#FFB547", "#111114", "#FF92C7", "#111114"] },
    followUps: ["How does music publishing work?", "Why do artists re-record albums?", "How do concerts make money?"],
    episodes: [
      { title: "The Advance Is a Loan", description: "Why signing money isn't free money.", script: ep({ hook: "When an artist signs a record deal, they often get a big cheque. It's usually not a gift.", story: ["An advance is typically paid back, or recouped, from the artist's share of royalties. Until it's recouped, the artist may not see further royalty payments from those recordings."], facts: ["Labels often also recoup certain costs, depending on the contract."], insight: "Read the deal, not the headline number.", outro: "Next: who owns the masters.", insights: ["An advance is usually recouped from the artist's royalties."] }) },
      { title: "Owning the Masters", description: "The recording versus the song.", script: ep({ hook: "Every hit song has two kinds of rights: the recording, and the composition.", story: ["The master recording is the specific recorded version. Labels traditionally own masters in exchange for funding and marketing. The composition, the melody and lyrics, belongs to songwriters and publishers."], facts: ["That split is why an artist can re-record their old songs: they may control the composition even if they don't own the original masters."], insight: "In music, ownership is where the long-term money lives.", outro: "Next: streaming money.", insights: ["Masters and compositions are separate rights."] }) },
      { title: "The Streaming Split", description: "One stream, many hands.", script: ep({ hook: "One stream, many people waiting to be paid.", story: ["Streaming revenue flows to the owner of the master and to the songwriters and publishers. The artist then gets their contractual share."], facts: ["Per stream payouts are often a fraction of a penny on average."], insight: "Scale matters. Streaming rewards catalogues and consistency.", outro: "That's the series. Try a follow up to go deeper.", insights: ["Per-stream payouts are often a fraction of a penny."] }) },
    ],
  },
  {
    key: "japan",
    keywords: ["japan", "japanese", "samurai", "edo", "meiji", "tokyo"],
    prompt: "Teach me the history of Japan.",
    title: "Japan in Fast-Forward",
    tagline: "Two thousand years in three episodes.",
    description: "Emperors, shoguns, isolation and the fastest modernisation in history.",
    difficulty: "beginner",
    category: "history",
    art: { motif: "sun", palette: ["#F7F4E9", "#FF7768", "#111114", "#111114"] },
    followUps: ["Who were the samurai really?", "What was the Meiji Restoration?", "How did Japan rebuild after 1945?"],
    episodes: [
      { title: "Emperors and Shoguns", description: "Who really ran Japan.", script: ep({ hook: "For centuries Japan had an emperor. But often, the emperor wasn't really in charge.", story: ["From the late twelfth century, military leaders called shoguns held real power, while the emperor remained a symbolic and religious figure in Kyoto."], facts: ["The Tokugawa shogunate, founded in 1603, ruled for over two and a half centuries."], insight: "Japan shows how symbolic power and real power can live side by side for centuries.", outro: "Next: the long isolation.", insights: ["From the late 12th century, shoguns held real power in Japan."] }) },
      { title: "The Closed Country", description: "Two centuries of tightly controlled contact.", script: ep({ hook: "For over two hundred years, Japan sharply limited contact with the outside world.", story: ["Under the Tokugawa, foreign trade was tightly controlled, with limited contact through places like Dejima in Nagasaki. The policy is often called sakoku."], facts: ["In 1853, American warships under Commodore Matthew Perry arrived and pushed Japan to open up."], insight: "Isolation brought stability, and a shock when the world arrived.", outro: "Next: the great transformation.", insights: ["In 1853, Commodore Perry's ships pressured Japan to open up."] }) },
      { title: "The Meiji Sprint", description: "Feudal to industrial in a generation.", script: ep({ hook: "In about fifty years, Japan went from feudal domains to an industrial power.", story: ["The Meiji Restoration of 1868 returned power to the emperor and launched rapid modernisation: railways, factories, a national army and a new education system."], facts: ["Japan's first railway opened in 1872, between Tokyo and Yokohama."], insight: "Change can be astonishingly fast when a society decides it must be.", outro: "That's the series. Pick a follow up to keep going.", insights: ["The Meiji Restoration began in 1868.", "Japan's first railway opened in 1872."] }) },
    ],
  },
];

export function matchDemoPlan(prompt: string): DemoPlan | null {
  const p = prompt.toLowerCase();
  let best: DemoPlan | null = null;
  let bestScore = 0;
  for (const plan of DEMO_PLANS) {
    const score = plan.keywords.reduce((s, k) => (p.includes(k) ? s + k.length : s), 0);
    if (score > bestScore) {
      best = plan;
      bestScore = score;
    }
  }
  return best;
}
