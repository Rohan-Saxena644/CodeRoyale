import Link from "next/link";
 
export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 border-b border-borderSoft px-6 py-5 lg:px-8">
      <Link href="/" className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white">
          CR
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-tight text-textMain">CodeRoyale</span>
          <span className="block text-xs text-textSoft">1v1 coding duels</span>
        </span>
      </Link>
 
      <nav aria-label="Main navigation" className="flex items-center gap-6 text-sm text-textMuted">
        <Link href="/#how-it-works" className="hidden transition hover:text-primary md:block">How it works</Link>
        <Link href="/#modes" className="hidden transition hover:text-primary md:block">Languages</Link>
        <Link href="/health" className="hidden transition hover:text-primary md:block">Status</Link>
        <Link
          href="/match"
          className="rounded-lg border border-border bg-surface2 px-4 py-2 font-semibold text-textMain transition hover:border-primary hover:text-primary"
        >
          Start a duel
        </Link>
      </nav>
    </header>
  );
}
 
