export const metadata = { title: "Content & rights policy" };

const SECTIONS: [string, string][] = [
  ["Calm Originals and Creator Originals", "Calm Originals are written and produced by the Calm editorial team. Creator Originals are made by community creators using Calm Storymaker. Both are labelled throughout the app."],
  ["Editorial review", "Community episodes stay private until they pass editorial review: content safety, sleep suitability, rights, AI disclosure and audio quality. Episodes from the Calm production engine are reviewed the same way. Nothing is published automatically."],
  ["Ownership and rights", "Creators declare that their work is original, list any third-party material, and confirm they hold rights to it. Copyrighted characters, worlds and music may not be used without a licence."],
  ["AI-generated content", "Stories created with Storymaker carry an AI-assistance disclosure. We record which models, prompts and voices were used to make each episode."],
  ["Voices", "Only approved voices with documented consent and licences are available. Voice cloning of real people without their documented consent is not permitted."],
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
