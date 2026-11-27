"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Mascot from "@/components/Mascot";
import { LiveBadge } from "@/components/lesson/steps";
import { Button, Chip, RichText, Sheet } from "@/components/ui";
import { Crown, IconCopy, IconDownload, IconExternal, IconRefresh, IconSend, IconUpload } from "@/components/icons";
import { C } from "@/content/criteria";
import { streamChat, generateImage, useAiStatus, type ChatMode, type ChatMsg } from "@/lib/ai";
import { scorePrompt } from "@/lib/coach";
import { play } from "@/lib/feedback";
import { PLAYGROUND_LIMIT, playgroundLeft, useStore } from "@/lib/store";

type Mode = "chat" | "image" | "write" | "analyse" | "brainstorm" | "website";

const MODES: { id: Mode; label: string; icon: string; blurb: string }[] = [
  { id: "chat", label: "Chat", icon: "💬", blurb: "Ask anything, get help with everyday tasks" },
  { id: "image", label: "Image", icon: "🎨", blurb: "Turn words into pictures" },
  { id: "write", label: "Write", icon: "✍️", blurb: "Emails, posts, stories and more" },
  { id: "analyse", label: "Analyse", icon: "📄", blurb: "Summarise and question a document" },
  { id: "brainstorm", label: "Brainstorm", icon: "💡", blurb: "Ten fresh ideas in seconds" },
  { id: "website", label: "Website", icon: "🌐", blurb: "Describe a site, watch it appear" },
];

const STARTERS: Record<Mode, string[]> = {
  chat: ["Explain how ISAs work like I'm new to saving", "Help me plan a calm, healthy week of meals for two", "What questions should I ask when viewing a flat?"],
  image: ["A cosy reading nook by a rainy window, warm lamp light, watercolour", "A lighthouse at night, glowing beam, dramatic clouds, oil painting", "A snowy forest cabin at sunrise, soft pastel colours, wide shot"],
  write: ["Write a friendly email to my neighbour about a fence repair, under 120 words", "Write a LinkedIn post celebrating my team's product launch, upbeat, 3 short paragraphs", "Write a warm thank-you note to my child's teacher at the end of term"],
  analyse: ["Summarise this in 5 bullet points for a busy reader", "What actions or deadlines does this mention?", "What's unusual or worth double-checking here?"],
  brainstorm: ["Birthday gift ideas for my dad who loves gardening, under £40", "Names for a dog-walking business in Bristol", "Fun team-building ideas for 8 remote colleagues"],
  website: ["A one-page site for 'Paws & Go', a friendly dog walker in Leeds. Green and cream colours. Sections: hero, services with prices, reviews, contact. Main action: book a walk", "A wedding website for Sam & Alex, elegant gold style, with the ceremony details, hotel info and an RSVP form", "A portfolio for a freelance illustrator, playful pink style, gallery, about and contact sections"],
};

const SAMPLE_DOC = `Tenancy renewal notice

Dear Tenant,

Your current tenancy at [ADDRESS] ends on 31 March. We are pleased to offer a renewal for a further 12 months starting 1 April. The new monthly rent will be £1,150, an increase of £75 (6.9%) reflecting local market rates.

Please note the following changes: the deposit will be topped up by £87 to match five weeks' rent; professional cleaning will be required at the end of the tenancy; and pets will be permitted with written consent.

To accept, please sign and return the renewal agreement by 14 February. If we do not hear from you by this date, we will assume you intend to leave at the end of your current term and will begin marketing the property.

Kind regards,
[LETTING AGENT]`;

const GUIDE = [C.detail(14), C.context(), C.constraints(), C.format()];
const IMAGE_GUIDE = [
  C.has("style", "Style", "Name a style — watercolour, 3D render, photo, oil painting…", ["watercolou?r", "3d", "render", "photo", "illustrat", "painting", "cartoon", "pixel", "anime", "sketch", "minimal", "flat", "poster", "clay"]),
  C.has("mood", "Mood & light", "Add lighting or mood — golden hour, cosy, dramatic, pastel…", ["golden", "sunset", "night", "cosy|cozy", "dramatic", "soft", "bright", "moody", "pastel", "warm", "neon", "light", "dreamy"]),
  C.has("comp", "Composition", "Describe framing — close-up, wide shot, from above…", ["close[- ]up", "wide", "background", "view", "portrait", "landscape", "scene"]),
];

export default function PlaygroundRoute() {
  return (
    <Suspense fallback={null}>
      <Playground />
    </Suspense>
  );
}

function Playground() {
  const params = useSearchParams();
  const initial = (params.get("mode") as Mode) || "chat";
  const [mode, setMode] = useState<Mode>(MODES.some((m) => m.id === initial) ? initial : "chat");
  const s = useStore();
  const status = useAiStatus();
  const left = playgroundLeft(s);
  const [limitOpen, setLimitOpen] = useState(false);
  const recordMode = useStore((x) => x.recordMode);

  const consume = () => {
    if (!useStore.getState().usePlayground()) {
      setLimitOpen(true);
      return false;
    }
    recordMode(mode);
    return true;
  };

  return (
    <div className="flex min-h-[calc(100dvh-84px)] flex-col">
      <div className="sticky top-0 z-30 bg-lav-50/90 pb-2 pt-[calc(12px+var(--safe-top))] backdrop-blur-xl">
        <div className="flex items-center justify-between px-5">
          <div>
            <h1 className="font-display text-[26px] font-semibold leading-tight">Playground</h1>
            <div className="flex items-center gap-2 text-xs font-bold text-ink-mute">
              {status && <LiveBadge mode live={mode === "image" ? status.image : status.text} />}
              <span>{s.plan === "plus" ? `${left} of ${PLAYGROUND_LIMIT.plus}` : `${left} of ${PLAYGROUND_LIMIT.free}`} AI uses left today</span>
            </div>
          </div>
          <Mascot size={52} mood="wink" />
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          {MODES.map((m) => (
            <Chip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>
              {m.icon} {m.label}
            </Chip>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col">
          {mode === "image" ? <ImageMode consume={consume} /> : mode === "website" ? <WebsiteMode consume={consume} /> : <ChatMode mode={mode} consume={consume} />}
        </motion.div>
      </AnimatePresence>

      <Sheet open={limitOpen} onClose={() => setLimitOpen(false)} title="Daily AI limit reached">
        <div className="flex flex-col items-center text-center">
          <Mascot size={100} mood="oops" />
          <p className="mt-2 text-ink-soft">
            {s.plan === "plus" ? "You've used all 100 Playground requests today. They refresh at midnight." : `Free accounts get ${PLAYGROUND_LIMIT.free} Playground requests a day. They refresh at midnight — or upgrade for ${PLAYGROUND_LIMIT.plus} a day.`}
          </p>
          {s.plan !== "plus" && (
            <Button variant="gold" full className="mt-4" href="/plus" onClick={() => setLimitOpen(false)}>
              <Crown size={18} /> Get AIBI Plus
            </Button>
          )}
          <Button variant="secondary" full className="mt-3" href="/learn" onClick={() => setLimitOpen(false)}>Continue learning</Button>
        </div>
      </Sheet>
    </div>
  );
}

function Guide({ text, criteria }: { text: string; criteria: typeof GUIDE }) {
  const r = scorePrompt(text, criteria);
  if (!text.trim()) return null;
  const tip = r.missed[0];
  const pct = r.score;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-2 flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 shadow-card">
      <Mascot size={26} float={false} mood={pct >= 80 ? "cheer" : "thinking"} />
      <div className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug text-ink-soft">
        {tip ? <><span className="font-black text-grape-600">Aibi tip:</span> {tip.tip}</> : <><span className="font-black text-mint-600">Great prompt!</span> Specific, clear and well-structured.</>}
      </div>
      <div className="h-8 w-8 shrink-0">
        <svg viewBox="0 0 36 36" className="-rotate-90">
          <circle cx="18" cy="18" r="14" stroke="#ECE4FF" strokeWidth="5" fill="none" />
          <circle cx="18" cy="18" r="14" stroke={pct >= 80 ? "#2DBE63" : pct >= 50 ? "#7C4DFF" : "#F5A70B"} strokeWidth="5" fill="none" strokeDasharray={88} strokeDashoffset={88 * (1 - pct / 100)} strokeLinecap="round" />
        </svg>
      </div>
    </motion.div>
  );
}

function Composer({ value, onChange, onSend, placeholder, busy, criteria = GUIDE }: { value: string; onChange: (v: string) => void; onSend: () => void; placeholder: string; busy: boolean; criteria?: typeof GUIDE }) {
  return (
    <div className="sticky bottom-[calc(80px+var(--safe-bottom))] z-20 bg-gradient-to-t from-lav-50 via-lav-50 to-lav-50/0 px-4 pb-2 pt-4">
      <Guide text={value} criteria={criteria} />
      <div className="flex items-end gap-2 rounded-3xl bg-white p-2 pl-4 shadow-float ring-1 ring-grape-100">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!busy && value.trim()) onSend();
            }
          }}
          rows={Math.min(5, Math.max(1, value.split("\n").length, Math.ceil(value.length / 38)))}
          placeholder={placeholder}
          className="max-h-36 flex-1 resize-none bg-transparent py-2 text-[16px] outline-none placeholder:text-ink-mute/60"
        />
        <button aria-label="Send" disabled={busy || !value.trim()} onClick={onSend} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-grape-500 text-white shadow-tactile-sm transition active:translate-y-[2px] disabled:opacity-40">
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <IconSend size={20} />}
        </button>
      </div>
    </div>
  );
}

function Empty({ mode, onPick }: { mode: Mode; onPick: (s: string) => void }) {
  const m = MODES.find((x) => x.id === mode)!;
  return (
    <div className="px-5 pt-4">
      <div className="flex flex-col items-center rounded-[28px] bg-white p-5 text-center shadow-card">
        <span className="text-4xl">{m.icon}</span>
        <div className="mt-2 font-display text-xl font-semibold">{m.label}</div>
        <p className="text-sm text-ink-soft">{m.blurb}</p>
      </div>
      <div className="mt-4 text-xs font-black uppercase tracking-widest text-ink-mute">Try one of these</div>
      <div className="mt-2 flex flex-col gap-2">
        {STARTERS[mode].map((t) => (
          <button key={t} onClick={() => { play("tap"); onPick(t); }} className="rounded-2xl bg-white px-4 py-3 text-left text-[14.5px] font-semibold shadow-card active:scale-[0.99]">
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatMode({ mode, consume }: { mode: Exclude<Mode, "image" | "website">; consume: () => boolean }) {
  const [msgs, setMsgs] = useState<(ChatMsg & { live?: boolean })[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState("");
  const [docName, setDocName] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const send = async (text = input) => {
    if (!text.trim() || busy) return;
    if (mode === "analyse" && !doc.trim()) return;
    if (!consume()) return;
    play("tap");
    const history: ChatMsg[] = [...msgs.map(({ role, content }) => ({ role, content })), { role: "user", content: text.trim() }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const { live } = await streamChat(mode as ChatMode, history, (full) => setMsgs([...history, { role: "assistant", content: full }]), { doc: mode === "analyse" ? doc : undefined });
    setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, live } : x)));
    setBusy(false);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 500_000) return alert("That file is a bit big — try one under 500 KB, or paste the important part.");
    const text = await f.text();
    setDoc(text);
    setDocName(f.name);
  };

  return (
    <>
      {mode === "analyse" && (
        <div className="px-5 pt-3">
          <div className="rounded-3xl bg-white p-3 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-ink-mute">📄 {docName || "Your document"}</span>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 rounded-full bg-lav-100 px-3 py-1 text-xs font-bold text-grape-700"><IconUpload size={14} /> Upload</button>
                <button onClick={() => { setDoc(SAMPLE_DOC); setDocName("Sample: tenancy renewal"); }} className="rounded-full bg-lav-100 px-3 py-1 text-xs font-bold text-grape-700">Use sample</button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json,.html,.htm,.xml,.log,text/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <textarea value={doc} onChange={(e) => { setDoc(e.target.value); if (!docName) setDocName("Pasted text"); }} rows={doc ? 5 : 3} placeholder="Paste a letter, article, report or notes here — or upload a text file." className="mt-2 w-full resize-none rounded-2xl bg-lav-50 p-3 text-[14px] outline-none" />
            <p className="mt-1 text-[11px] font-semibold text-ink-mute">🛡️ Remove names, account numbers and other personal details before analysing.</p>
          </div>
        </div>
      )}
      <div className="flex-1 pb-4">
        {msgs.length === 0 ? (
          <Empty mode={mode} onPick={(t) => (mode === "analyse" && !doc ? setInput(t) : send(t))} />
        ) : (
          <div className="space-y-3 px-4 pt-4">
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-grape-500 px-4 py-3 text-[15px] font-semibold text-white">
                  {m.content}
                </motion.div>
              ) : (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2">
                  <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lav-100"><Mascot size={26} float={false} /></span>
                  <div className="min-w-0 max-w-[88%] rounded-3xl rounded-tl-md bg-white px-4 py-3 text-[14.5px] leading-relaxed shadow-card">
                    {m.content ? <RichText text={m.content} /> : <TypingDots />}
                    {m.content && !busy && i === msgs.length - 1 && (
                      <div className="mt-2 flex items-center gap-3 border-t border-grape-100 pt-2">
                        <LiveBadge live={!!m.live} />
                        <button onClick={() => navigator.clipboard?.writeText(m.content)} className="flex items-center gap-1 text-xs font-bold text-grape-600"><IconCopy size={14} /> Copy</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ),
            )}
            {!busy && msgs.length > 0 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto pl-11">
                {["Make it shorter", "Explain more simply", "Give me an example", "Put it in a table"].map((f) => (
                  <button key={f} onClick={() => send(f)} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-grape-700 shadow-card">{f}</button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>
      <Composer
        value={input}
        onChange={setInput}
        onSend={() => send()}
        busy={busy}
        placeholder={mode === "analyse" ? (doc ? "Ask about your document…" : "Add a document above first") : mode === "brainstorm" ? "What do you need ideas for?" : mode === "write" ? "What should I write? Who's it for?" : "Ask me anything…"}
      />
    </>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="h-2 w-2 rounded-full bg-grape-300" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
      ))}
    </span>
  );
}

function ImageMode({ consume }: { consume: () => boolean }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<{ prompt: string; url: string; live: boolean }[]>([]);
  const [err, setErr] = useState("");
  const recordImage = useStore((s) => s.recordImage);
  const styles = ["watercolour", "3D render", "film photo", "pixel art", "oil painting", "flat illustration"];

  const go = async (p = prompt) => {
    if (!p.trim() || busy) return;
    if (!consume()) return;
    setBusy(true);
    setErr("");
    const r = await generateImage(p);
    setBusy(false);
    if ("error" in r) return setErr(r.error);
    setItems((x) => [{ prompt: p, ...r }, ...x]);
    recordImage();
    play("correct");
  };

  return (
    <>
      <div className="flex-1 px-5 pb-4 pt-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {styles.map((st) => (
            <button key={st} onClick={() => setPrompt((p) => (p.toLowerCase().includes(st.toLowerCase()) ? p : `${p.trim()}${p.trim() ? ", " : ""}${st}`))} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-grape-700 shadow-card">
              + {st}
            </button>
          ))}
        </div>
        {err && <p className="mt-3 text-sm font-bold text-coral-600">{err}</p>}
        {busy && (
          <div className="relative mt-3 grid aspect-square w-full place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-grape-100 to-rose-400/20">
            <div className="shine absolute inset-0" />
            <div className="flex flex-col items-center"><Mascot size={100} mood="thinking" sparkles /><span className="mt-2 font-display font-semibold text-grape-700">Painting…</span></div>
          </div>
        )}
        {items.length === 0 && !busy ? (
          <Empty mode="image" onPick={(t) => { setPrompt(t); go(t); }} />
        ) : (
          <div className="mt-3 space-y-4">
            {items.map((it, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-3xl bg-white shadow-card">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt={it.prompt} className="aspect-square w-full object-cover" />
                  <div className="absolute left-3 top-3"><LiveBadge live={it.live} /></div>
                </div>
                <div className="flex items-start gap-3 p-3">
                  <p className="flex-1 text-[13.5px] font-semibold text-ink-soft">{it.prompt}</p>
                  <a href={it.url} download={`aibi-image-${i + 1}.${it.url.startsWith("data:image/svg") ? "svg" : "png"}`} className="grid h-9 w-9 place-items-center rounded-full bg-lav-100 text-grape-700" aria-label="Download image"><IconDownload size={18} /></a>
                  <button onClick={() => go(it.prompt)} className="grid h-9 w-9 place-items-center rounded-full bg-lav-100 text-grape-700" aria-label="Generate again"><IconRefresh size={18} /></button>
                </div>
                {!it.live && <p className="px-3 pb-3 text-[11px] text-ink-mute">Demo artwork generated from your keywords. Add an image API key on the server for full AI image generation.</p>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Composer value={prompt} onChange={setPrompt} onSend={() => go()} busy={busy} placeholder="Describe your image: subject, style, mood…" criteria={IMAGE_GUIDE} />
    </>
  );
}

function WebsiteMode({ consume }: { consume: () => boolean }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");

  const cleaned = useMemo(() => {
    const m = html.match(/<!doctype html[\s\S]*<\/html>/i);
    return m ? m[0] : html.replace(/^```html\s*|```\s*$/g, "");
  }, [html]);

  const send = async (text = input) => {
    if (!text.trim() || busy) return;
    if (!consume()) return;
    const h: ChatMsg[] = [...history, ...(html ? [{ role: "assistant" as const, content: cleaned }] : []), { role: "user", content: text.trim() }];
    setInput("");
    setBusy(true);
    setHtml("");
    const r = await streamChat("website", h, setHtml);
    setLive(r.live);
    setHistory(h.filter((m) => m.role === "user"));
    setBusy(false);
    play("complete");
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([cleaned], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-aibi-website.html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const openFull = () => {
    const url = URL.createObjectURL(new Blob([cleaned], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
  };

  const done = !busy && /<\/html>/i.test(cleaned);

  return (
    <>
      <div className="flex-1 px-5 pb-4 pt-3">
        {!html && !busy ? (
          <Empty mode="website" onPick={(t) => send(t)} />
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1 rounded-full bg-white p-1 shadow-card">
                {(["preview", "code"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-xs font-black capitalize ${view === v ? "bg-grape-500 text-white" : "text-ink-mute"}`}>{v}</button>
                ))}
              </div>
              {done && <LiveBadge live={live} />}
            </div>
            <div className="mt-3 overflow-hidden rounded-3xl bg-white shadow-float ring-1 ring-grape-100">
              <div className="flex items-center gap-1.5 border-b border-grape-100 bg-lav-50 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-coral-400" /><span className="h-2.5 w-2.5 rounded-full bg-sun-400" /><span className="h-2.5 w-2.5 rounded-full bg-mint-400" />
                <span className="ml-2 truncate text-[11px] font-bold text-ink-mute">my-website.html</span>
              </div>
              {view === "preview" ? (
                done ? (
                  <iframe title="Website preview" sandbox="allow-scripts allow-forms" srcDoc={cleaned} className="h-[460px] w-full bg-white" />
                ) : (
                  <div className="grid h-[460px] place-items-center">
                    <div className="flex flex-col items-center"><Mascot size={100} mood="thinking" sparkles /><span className="mt-2 font-display font-semibold text-grape-700">Building your site… {Math.round(cleaned.length / 100) / 10}k</span></div>
                  </div>
                )
              ) : (
                <pre className="h-[460px] overflow-auto whitespace-pre-wrap p-3 text-[11px] leading-relaxed text-ink-soft">{cleaned}</pre>
              )}
            </div>
            {done && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button variant="secondary" size="sm" onClick={download}><IconDownload size={16} /> Save</Button>
                <Button variant="secondary" size="sm" onClick={openFull}><IconExternal size={16} /> Open</Button>
                <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(cleaned)}><IconCopy size={16} /> Copy</Button>
              </div>
            )}
            {done && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                {["Make the headline punchier", "Use a dark colour scheme", "Add an FAQ section", "Add a pricing table"].map((f) => (
                  <button key={f} onClick={() => send(f)} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-grape-700 shadow-card">{f}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Composer value={input} onChange={setInput} onSend={() => send()} busy={busy} placeholder={html ? "Ask for a change…" : "Describe your website: who, sections, style, action"} />
    </>
  );
}
