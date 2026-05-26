import Link from "next/link";
 
export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
      <Link href="/" className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gold/15 text-lg font-semibold text-gold">
          CR
        </span>
        <span>
          <span className="block text-lg font-semibold tracking-tight text-white">CodeRoyale</span>
          <span className="block text-sm text-white/55">1v1 coding duels</span>
        </span>
      </Link>
 
      <nav className="hidden items-center gap-5 text-sm text-white/70 md:flex">
        <Link href="#how-it-works" className="transition hover:text-white">How it works</Link>
        <Link href="#modes" className="transition hover:text-white">Modes</Link>
        <Link
          href="/match"
          className="rounded-full border border-white/15 px-4 py-2 font-semibold text-white transition hover:border-gold/50 hover:text-gold"
        >
          Play now
        </Link>
      </nav>
    </header>
  );
}
 