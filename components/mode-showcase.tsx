const modeCards = [
  {
    title: "Competitive Duel",
    eyebrow: "For CP battles",
    copy:
      "Two players get the same generated DSA problem, code live, submit into sandboxes, and race to the verdict.",
    bullets: [
      "Realtime mirrored editor and synced timer",
      "Multi-language support: Python, JS, C++, Go, Rust",
      "Safe judge with testcase-level feedback"
    ]
  },
  {
    title: "Developer Duel",
    eyebrow: "For working engineers",
    copy:
      "Players pick a category like React or backend debugging, then repair a buggy starter project instead of solving a blank-sheet problem.",
    bullets: [
      "Prerequisite code challenges feel more authentic than vague prompts",
      "DOM and HTTP assertions decide pass or fail",
      "MCQ packs can be added later for interview-style rounds"
    ]
  },
  {
    title: "Fun Mode",
    eyebrow: "For chaos",
    copy:
      "Keep the judge real but layer on emotes and power-ups like freeze or gibberish injection once the core duel loop is stable.",
    bullets: [
      "Charge bar fills from typing activity",
      "Socket-driven reactions on both clients",
      "Power-ups gated away from serious mode"
    ]
  }
];

export function ModeShowcase() {
  return (
    <section id="modes" className="grid gap-5 lg:grid-cols-3">
      {modeCards.map((card) => (
        <article
          key={card.title}
          className="card-border rounded-[28px] border border-white/10 bg-black/20 p-6"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">{card.eyebrow}</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{card.title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/72">{card.copy}</p>
          <ul className="mt-5 space-y-2 text-sm text-white/78">
            {card.bullets.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-lime" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
