import HeroArt from '@/components/ui/HeroArt'

export default function Home() {
  const steps = [
    {
      n: '01',
      title: 'Describe',
      body: 'Tell Wally what you want to build in plain language — no code required.',
    },
    {
      n: '02',
      title: 'Generate',
      body: 'We produce Flutter code, auto-validated for safety and structure, refined until it passes.',
    },
    {
      n: '03',
      title: 'Build & download',
      body: 'A signed APK is compiled in Docker and ready to install on any Android device.',
    },
  ]

  return (
    <main className="min-h-screen">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <span className="font-display text-2xl font-bold text-clay-900">Wally</span>
        <div className="hidden md:flex items-center gap-8 text-sm text-ink-600">
          <a href="#how" className="hover:text-clay-700 transition-colors">How it works</a>
          <a href="#features" className="hover:text-clay-700 transition-colors">Features</a>
        </div>
        <button className="watercolor-btn !py-2 !px-5 text-sm">Get Started</button>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-10 pb-24 grid lg:grid-cols-2 gap-14 lg:gap-16 items-center">
        <div className="space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full bg-sand-100 border border-sand-300/60 px-4 py-1.5 text-xs font-medium text-sand-700 tracking-wide">
            AI App Generator
          </span>
          <h1 className="text-5xl sm:text-6xl font-display font-bold text-clay-900 leading-[1.05] text-balance">
            Describe your app in plain words. <span className="italic text-clay-500">We&apos;ll paint the rest.</span>
          </h1>
          <p className="text-lg text-ink-600 font-serif leading-relaxed max-w-md">
            Wally turns your idea into production-ready Flutter code, builds the APK, and hands you a
            downloadable Android app — no coding required.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button className="watercolor-btn">Start building</button>
            <a
              href="#how"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-clay-300 text-clay-700 font-medium hover:bg-clay-50 transition-colors"
            >
              See how it works
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
            <li>✓ No code needed</li>
            <li>✓ Free build credits</li>
            <li>✓ Flutter-powered</li>
          </ul>
        </div>

        <HeroArt />
      </section>

      <section id="how" className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-center font-display text-3xl text-clay-900 mb-12">
          From idea to APK in three steps
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="paper-card brush-stroke p-7">
              <div className="font-display text-4xl text-sand-400 mb-3">{s.n}</div>
              <h3 className="font-display text-xl text-clay-900 mb-2">{s.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-10 text-center text-xs text-ink-400">
        Wally · made with watercolor &amp; code
      </footer>
    </main>
  )
}
