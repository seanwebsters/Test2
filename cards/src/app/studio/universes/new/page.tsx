import { field, JsonForm, lbl } from "@/components/studio/Forms";
import { ART_STYLES, DISPLAY_FONTS, GENRES } from "@/lib/content/types";

export const metadata = { title: "New universe" };

export default function NewUniverse() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-extrabold tracking-tight">Create a universe</h1>
      <p className="mt-1 text-sm text-bone-3">Start a draft by hand. You can add characters, cards and episodes in the editor, or use AI Studio to draft everything from a brief.</p>
      <JsonForm url="/api/studio/universe/create" submit="Create draft" className="mt-6 space-y-4" redirect={(r) => `/studio/universes/${(r as { result: { id: string } }).result.id}`}>
        <label className={lbl}>Title<input name="title" className={field} required maxLength={60} /></label>
        <label className={lbl}>Tagline<input name="tagline" className={field} required maxLength={140} /></label>
        <label className={lbl}>Premise<textarea name="premise" className={`${field} min-h-28`} required minLength={10} maxLength={800} /></label>
        <fieldset>
          <legend className={lbl}>Genres (1–3)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <label key={g.id} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[13px]"><input type="checkbox" name="genres[]" value={g.id} /> {g.label}</label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>Art style<select name="artStyle" className={field}>{ART_STYLES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className={lbl}>Display typeface<select name="displayFont" className={field}>{DISPLAY_FONTS.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
      </JsonForm>
    </div>
  );
}
