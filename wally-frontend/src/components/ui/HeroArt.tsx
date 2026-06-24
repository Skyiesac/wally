'use client'
import { motion } from 'framer-motion'

const FIGURE_PATH =
  'M 300 110 C 390 110 455 185 455 285 C 455 320 468 342 486 356 C 476 366 468 372 464 378 ' +
  'C 462 384 466 388 472 392 C 478 394 478 402 470 404 C 462 406 458 410 464 416 ' +
  'C 470 424 476 436 472 452 C 466 474 440 492 420 512 C 406 528 398 548 398 570 ' +
  'C 398 610 430 640 448 680 C 452 700 460 720 440 740 L 140 740 C 160 700 170 660 176 620 ' +
  'C 182 570 168 520 168 470 C 168 420 190 380 214 350 C 240 316 258 270 258 220 ' +
  'C 258 168 274 128 300 110 Z'

export default function HeroArt() {
  return (
    <div className="relative w-full max-w-[560px] mx-auto">
      {/* Watercolor painting */}
      <svg
        viewBox="0 0 700 800"
        className="w-full h-auto"
        role="img"
        aria-label="Watercolor portrait of a person describing an app idea"
      >
        <defs>
          <linearGradient id="wally-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0ebe3" />
            <stop offset="100%" stopColor="#f9f4eb" />
          </linearGradient>
          <radialGradient id="wally-glow" cx="0.75" cy="0.2" r="0.65">
            <stop offset="0%" stopColor="#dcc297" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#dcc297" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="wally-fig" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6b5140" />
            <stop offset="55%" stopColor="#584437" />
            <stop offset="100%" stopColor="#46433f" />
          </linearGradient>
          <filter id="wally-blur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <filter id="wally-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <filter id="wally-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>

        <rect width="700" height="800" fill="url(#wally-bg)" />
        <rect width="700" height="800" fill="url(#wally-glow)" />

        {/* pigment blooms */}
        <ellipse cx="150" cy="640" rx="200" ry="150" fill="#e6d4c4" opacity="0.6" filter="url(#wally-blur)" />
        <ellipse cx="610" cy="620" rx="180" ry="140" fill="#e9d6b8" opacity="0.55" filter="url(#wally-blur)" />
        <ellipse cx="560" cy="170" rx="150" ry="120" fill="#dcc297" opacity="0.4" filter="url(#wally-blur)" />
        <ellipse cx="330" cy="210" rx="120" ry="90" fill="#f3e8d5" opacity="0.6" filter="url(#wally-blur)" />

        {/* sweeping brush strokes */}
        <path
          d="M -40 660 C 200 600 420 640 760 560"
          stroke="#c49d7b" strokeWidth="26" strokeLinecap="round" fill="none"
          opacity="0.35" filter="url(#wally-soft)"
        />
        <path
          d="M 40 730 C 260 700 480 720 740 660"
          stroke="#b89560" strokeWidth="18" strokeLinecap="round" fill="none"
          opacity="0.4" filter="url(#wally-soft)"
        />
        <path
          d="M 520 -20 C 560 140 540 300 600 420"
          stroke="#d5b9a0" strokeWidth="30" strokeLinecap="round" fill="none"
          opacity="0.45" filter="url(#wally-soft)"
        />

        {/* the figure */}
        <path d={FIGURE_PATH} fill="url(#wally-fig)" />
        {/* warm rim light on the face edge */}
        <path d={FIGURE_PATH} fill="none" stroke="#f3e8d5" strokeWidth="5" strokeLinecap="round" opacity="0.75" />
        <ellipse cx="478" cy="400" rx="95" ry="125" fill="#e9d6b8" opacity="0.45" filter="url(#wally-soft)" />

        {/* impasto strokes over the figure */}
        <path
          d="M 150 725 C 220 660 310 645 390 665"
          stroke="#9a7b50" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.6"
        />
        <path
          d="M 172 605 C 240 575 320 565 362 595"
          stroke="#8b5c45" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.5"
        />

        {/* paint drips */}
        <circle cx="118" cy="702" r="10" fill="#9d7a56" opacity="0.45" />
        <circle cx="148" cy="714" r="6" fill="#a66f51" opacity="0.4" />
        <circle cx="642" cy="692" r="9" fill="#cead7a" opacity="0.5" />

        {/* paper grain */}
        <rect width="700" height="800" filter="url(#wally-grain)" opacity="0.05" />
      </svg>

      {/* Floating stat card: progress ring + badge (Magnetic-style) */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: 'easeOut' }}
        className="absolute -left-3 sm:-left-10 bottom-6 sm:bottom-10 float-slow"
      >
        <div className="paper-card p-4 pr-6 w-52 sm:w-56">
          <span className="inline-block rounded-md bg-clay-100 text-clay-700 text-[10px] font-semibold px-2 py-0.5 tracking-wide">
            BUILD SUCCESS
          </span>
          <div className="flex items-center gap-4 mt-3">
            <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
              <circle cx="30" cy="30" r="25" fill="none" stroke="#e4d9c8" strokeWidth="6" />
              <circle
                cx="30" cy="30" r="25" fill="none" stroke="#b08d65" strokeWidth="6"
                strokeLinecap="round" strokeDasharray="157" strokeDashoffset="2"
                transform="rotate(-90 30 30)"
              />
              <text x="30" y="35" textAnchor="middle" fontSize="14" fontWeight="700" fill="#6b5140">99%</text>
            </svg>
            <div>
              <div className="text-sm font-medium text-ink-700">this week</div>
              <div className="text-[11px] text-ink-400">no failed builds</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating build pill */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.7, ease: 'easeOut' }}
        className="absolute -right-2 sm:-right-8 top-8 sm:top-12 float-slower"
      >
        <div className="paper-card px-4 py-3 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-clay-500 animate-pulse" />
          <span className="text-xs font-medium text-ink-700">app-release.apk</span>
          <span className="text-xs font-semibold text-clay-600">3m 48s</span>
        </div>
      </motion.div>

      {/* Floating stat chip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.7, ease: 'easeOut' }}
        className="absolute left-8 top-1/3 float-slow"
      >
        <div className="rounded-full bg-earth-900/90 text-sand-100 text-xs font-medium px-4 py-2 shadow-watercolor backdrop-blur-sm">
          ✨ 2,431 apps generated
        </div>
      </motion.div>
    </div>
  )
}
