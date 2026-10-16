export const metadata = { title: "Content & rights policy" };

const SECTIONS: [string, string][] = [
  ["Calm Originals and Creator Originals", "Calm Originals are written and produced by the Calm editorial team. Creator Originals come from independent storytellers and are reviewed by Calm before release. Both are labelled throughout the app."],
  ["Editorial review", "Every episode stays private until the Calm editorial team has reviewed it for content safety, sleep suitability, rights and audio quality, and scheduled its release. Nothing is published automatically."],
  ["Ownership and rights", "Calm holds or licenses the rights to every story, narration and piece of music in the catalogue. Copyrighted characters, worlds and music may not be used without a licence."],
  ["Narrators", "Every narrator has a documented agreement covering the use of their voice."],
  ["Age-appropriate content", "Sleep Stories are designed for adults and teens. Romance stays tender and non-explicit; distressing themes, violence and frightening content are not suitable for Sleep Stories."],
  ["Reporting and removal", "Anyone can report a series, episode or creator. Copyright complaints are reviewed by the editorial team and infringing content is removed."],
  ["Wellbeing", "Calm Stories avoids addictive mechanics: no streaks, no endless autoplay, and sleep timers with gentle fades. Sleep Stories are for relaxation; we make no clinical claims about sleep outcomes."],
];

export default function PoliciesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-32 sm:px-8">
      <h1 className="headline text-5xl">Content &amp; rights policy</h1>
      <p className="mt-3 text-sm text-amber-200">Prototype draft – to be replaced by Calm&rsquo;s legal and editorial policies.</p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map(([h, b]) => (
          <section key={h}>
            <h2 className="headline text-2xl">{h}</h2>
            <p className="mt-2 text-mist">{b}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
