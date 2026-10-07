import { Globe, Moon, Sparkles, Users } from "lucide-react";

const STEPS = [
  { icon: Globe, title: "Pick a world", body: "Space fleets, magic academies, pirate seas, football nights." },
  { icon: Users, title: "Pick your characters", body: "Up to four — even from different worlds." },
  { icon: Sparkles, title: "Pick the dream", body: "Cozy, epic, funny, mysterious… or very sleepy." },
  { icon: Moon, title: "AI tells the story", body: "Personalised, persistent, and slower as you drift off." },
];

export function HowItWorks() {
  return (
    <section className="relative z-10 -mt-2 px-5 lg:-mt-10 lg:px-10">
      <div className="glass mx-auto grid max-w-[1400px] grid-cols-2 gap-px overflow-hidden rounded-3xl lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="bg-night-950/20 p-4 lg:p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-glow-300">
                <s.icon className="h-4 w-4" />
              </span>
              <span className="font-display text-sm font-light text-mist-400">0{i + 1}</span>
            </div>
            <h3 className="text-sm font-semibold text-white lg:text-base">{s.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-mist-400 lg:text-[13px]">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
