import Link from "next/link";
import { Header } from "@/components/header";
import { ServerWake } from "@/components/server-wake";
import { ArenaPreview } from "@/components/arena-preview";
import { UiIcon } from "@/components/ui-icon";

const steps = [
  { title: "Set the challenge", text: "Pick a language and difficulty. Create a private room in a few clicks.", icon: "code" as const },
  { title: "Bring your opponent", text: "Share your invite code. Get ready, and the same problem drops for both of you.", icon: "link" as const },
  { title: "Race to Accepted", text: "Write your solution, follow their code live, and submit. First to pass every test wins.", icon: "bolt" as const },
];
const languages = [
  ["JS", "JavaScript"], ["Py", "Python"], ["C++", "C++"], ["Go", "Go"], ["Rs", "Rust"], ["Jv", "Java"],
];

export default function HomePage() {
  return (
    <ServerWake>
      <main className="overflow-x-hidden">
        <div className="home-hero border-b border-borderSoft bg-white">
          <Header />
          <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-16 pt-14 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-medium text-primary"><UiIcon name="bolt" className="h-3.5 w-3.5" />A friendly rivalry starts here</p>
              <h1 className="mt-6 text-[clamp(2.8rem,5.2vw,4.6rem)] font-semibold leading-[1.08] tracking-[-0.055em] text-textMain">Good friends.<br />Great rivals.<br /><span className="text-primary">Better coders.</span></h1>
              <p className="mt-6 max-w-md text-base leading-7 text-textMuted">One problem. Two developers. A live coding duel that turns your next practice session into a little competition.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/match" className="inline-flex items-center justify-center gap-3 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primaryHover">Create a duel<UiIcon name="arrow" className="h-4 w-4" /></Link>
                <Link href="/match#join" className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-5 py-3.5 text-sm font-semibold text-textMain transition hover:border-primary/40 hover:bg-bgSoft">Join with a code</Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-textSoft">{["No signup", "Private rooms", "Just you and your code"].map(item => <span key={item} className="inline-flex items-center gap-1.5"><UiIcon name="check" className="h-3.5 w-3.5 text-primary" />{item}</span>)}</div>
            </div>
            <div className="relative min-w-0 lg:pt-6">
              <div className="mb-4 flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-textSoft"><span>One shared challenge</span><span>Two ways to solve it</span></div>
              <ArenaPreview />
              <p className="mt-5 text-center text-xs text-textSoft">Your editor. Their progress. Every second counts.</p>
            </div>
          </section>
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-5 border-t border-borderSoft px-6 py-6 sm:grid-cols-4 lg:px-8">
            {[["100+", "curated problems"], ["6", "languages to choose from"], ["1 vs 1", "real-time competition"], ["Zero", "signup friction"]].map(([value, label]) => <div key={label} className="text-center sm:border-r sm:border-borderSoft sm:last:border-r-0"><span className="block text-xl font-semibold tracking-tight text-textMain">{value}</span><span className="mt-0.5 block text-xs text-textSoft">{label}</span></div>)}
          </div>
        </div>

        <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Less setup. More solving.</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-textMain">From invite to rivalry.</h2></div>
            <p className="max-w-sm text-sm leading-6 text-textMuted">A simple format that keeps the focus on the problem in front of you.</p>
          </div>
          <ol className="mt-9 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => <li key={step.title} className="relative rounded-xl border border-border bg-white p-6"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5 text-primary"><UiIcon name={step.icon} className="h-5 w-5" /></span><span className="font-mono text-xs text-textSoft">0{i + 1}</span></div><h3 className="mt-6 text-lg font-semibold tracking-tight text-textMain">{step.title}</h3><p className="mt-2 text-sm leading-6 text-textMuted">{step.text}</p></li>)}
          </ol>
        </section>

        <section id="modes" className="border-y border-borderSoft bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Play to your strengths</p><h2 className="mt-3 text-2xl font-semibold tracking-tight text-textMain">Your favorite language is invited.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-textMuted">Choose your language when you create a room. Both players get the same challenge and test cases.</p></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{languages.map(([short, name]) => <div key={name} className="flex items-center gap-3 rounded-lg border border-borderSoft px-4 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bgSoft font-mono text-xs font-semibold text-primary">{short}</span><span className="text-sm font-medium text-textMain">{name}</span></div>)}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-primary/15 bg-[#edf3ff] px-7 py-9 sm:px-10 md:flex-row md:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your next practice session</p><h2 className="mt-3 text-2xl font-semibold tracking-tight text-textMain sm:text-3xl">Make it a friendly competition.</h2><p className="mt-2 text-sm text-textMuted">Send the invite. Settle it in the editor.</p></div><Link href="/match" className="inline-flex shrink-0 items-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryHover">Let’s duel<UiIcon name="arrow" className="h-4 w-4" /></Link></div>
        </section>
        <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-borderSoft px-6 py-7 text-xs text-textSoft lg:px-8"><span><span className="font-semibold text-textMuted">CodeRoyale</span><span className="mx-3 text-border">/</span>Built for a little healthy competition.</span><Link href="/health" className="inline-flex items-center gap-2 transition hover:text-primary"><UiIcon name="server" className="h-3.5 w-3.5" />Service status<UiIcon name="arrow" className="h-3.5 w-3.5" /></Link></footer>
      </main>
    </ServerWake>
  );
}
