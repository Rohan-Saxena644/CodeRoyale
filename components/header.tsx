import Link from "next/link";
 
export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
      <Link href="/" className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface2 text-sm font-semibold text-primary">
          CR
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-tight text-textMain">CodeRoyale</span>
          <span className="block text-xs text-textSoft">1v1 coding duels</span>
        </span>
      </Link>
 
      <nav className="hidden items-center gap-5 text-sm text-textMuted md:flex">
        <Link href="/#how-it-works" className="transition hover:text-textMain">How it works</Link>
        <Link href="/#modes" className="transition hover:text-textMain">Stack</Link>
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
 
