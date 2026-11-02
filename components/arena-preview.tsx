import { UiIcon } from "@/components/ui-icon";

export function ArenaPreview() {
  return (
    <div className="arena-preview relative min-w-0 rounded-2xl border border-border bg-white shadow-[0_24px_70px_-28px_rgba(36,89,211,0.25)]">
      <div className="flex items-center justify-between gap-3 border-b border-borderSoft px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-textSoft"><span className="h-2 w-2 rounded-full bg-primary" /><span className="font-semibold text-textMain">The arena</span><span className="hidden sm:inline">/</span><span className="hidden sm:inline">Two Sum</span></div>
        <span className="rounded-md bg-bgSoft px-2 py-1 font-mono text-xs text-textMuted">Preview · 08:42</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-borderSoft">
        <div className="min-w-0">
          <div className="flex items-center gap-2 border-b border-borderSoft px-4 py-3 text-xs"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">Y</span><span className="font-medium text-textMain">You</span><span className="ml-auto hidden text-textSoft sm:inline">solution.js</span></div>
          <div className="overflow-x-auto px-3 py-6 font-mono text-[11px] leading-7 sm:px-5 sm:text-xs">
            <div><span className="mr-3 select-none text-slate-300">1</span><span className="text-primary">function</span> twoSum(nums) {'{'}</div>
            <div><span className="mr-3 select-none text-slate-300">2</span>  <span className="text-primary">const</span> seen = {'{}'};</div>
            <div><span className="mr-3 select-none text-slate-300">3</span>  <span className="text-primary">for</span> (let i = 0;</div>
            <div><span className="mr-3 select-none text-slate-300">4</span>    i &lt; nums.length;</div>
            <div><span className="mr-3 select-none text-slate-300">5</span>    i++) {'{'}</div>
            <div><span className="mr-3 select-none text-slate-300">6</span>    <span className="text-textSoft">{"// find the pair"}</span></div>
            <div><span className="mr-3 select-none text-slate-300">7</span>  {'}'}</div>
            <div><span className="mr-3 select-none text-slate-300">8</span>{'}'}<span className="ml-1 inline-block h-3 w-0.5 bg-primary align-middle" /></div>
          </div>
        </div>
        <div className="min-w-0 bg-bgSoft/50">
          <div className="flex items-center gap-2 border-b border-borderSoft px-4 py-3 text-xs"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface3 font-semibold text-textMuted">F</span><span className="font-medium text-textMain">Your friend</span><span className="ml-auto hidden text-textSoft sm:inline">Editing</span></div>
          <div className="space-y-3 px-5 py-8" aria-hidden="true">
            {["w-3/4", "w-1/2", "w-5/6", "w-2/3", "w-1/2", "w-3/4", "w-1/3"].map((width, i) => <div key={i} className={`h-1.5 rounded-full ${width} ${i % 3 === 0 ? "bg-primary/15" : "bg-slate-200/80"}`} />)}
          </div>
          <p className="px-5 text-[11px] text-textSoft">Same problem. Different approach.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-borderSoft bg-primary/[0.03] px-5 py-4">
        <span className="flex items-center gap-2 text-xs font-medium text-success"><UiIcon name="check" className="h-4 w-4" />All test cases passed</span>
        <span className="rounded-full border border-success/15 bg-success/5 px-3 py-1 text-[11px] font-semibold text-success">Accepted</span>
      </div>
    </div>
  );
}
