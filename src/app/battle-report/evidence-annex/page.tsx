import Link from "next/link";

export default function EvidenceAnnexDocument() {
  return (
    <main className="min-h-screen bg-[#080a08] px-6 py-8 font-mono uppercase text-[#c9ffc8]">
      <section className="mx-auto max-w-4xl border border-[#68b768]/35 bg-[#070b07] p-6">
        <span className="text-xs font-black tracking-[0.16em] text-[#c8a84b]">
          Document 03
        </span>
        <h1 className="mt-3 text-3xl font-black tracking-[0.08em]">
          Evidence annex
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-[#8faf8f]">
          Dedicated evidence annex document.
        </p>
        <Link
          className="mt-8 inline-block border border-[#c8a84b]/60 px-4 py-2 text-xs font-black tracking-[0.12em] text-[#c8a84b]"
          href="/battle-report"
        >
          Back to battle report
        </Link>
      </section>
    </main>
  );
}
