import Link from 'next/link'

function IconCpu({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
    </svg>
  );
}

function IconPortrait({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  );
}

type Feature = {
  Icon: (props: { className?: string }) => React.JSX.Element;
  title: string;
  description: string;
  iconClass: string;
  borderHover: string;
};

const features: Feature[] = [
  {
    Icon: IconCpu,
    title: "AI Twin",
    description:
      "A digital replica trained on your words, memories, and mindset. Responds like you — because it learned from you.",
    iconClass: "text-violet-400 bg-violet-500/10",
    borderHover: "hover:border-violet-500/40",
  },
  {
    Icon: IconPortrait,
    title: "Future Portrait",
    description:
      "An evolving snapshot of who you are and who you're becoming. A living self-portrait powered by AI.",
    iconClass: "text-sky-400 bg-sky-500/10",
    borderHover: "hover:border-sky-500/40",
  },
  {
    Icon: IconLock,
    title: "Private Memory Vault",
    description:
      "Secure, encrypted storage for your most personal thoughts, milestones, and reflections. Yours alone.",
    iconClass: "text-emerald-400 bg-emerald-500/10",
    borderHover: "hover:border-emerald-500/40",
  },
  {
    Icon: IconGlobe,
    title: "Public Share Page",
    description:
      "Let the world meet your FutureSelf on your terms. Share with family, friends, or make it public.",
    iconClass: "text-fuchsia-400 bg-fuchsia-500/10",
    borderHover: "hover:border-fuchsia-500/40",
  },
];

type Step = {
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    title: "Tell your story",
    description:
      "Upload memories, journal entries, voice notes, and beliefs. The more you share, the richer your FutureSelf becomes.",
  },
  {
    title: "Train your FutureSelf",
    description:
      "Our AI learns your voice, values, and worldview — creating an authentic replica that thinks and speaks like you.",
  },
  {
    title: "Chat with your future",
    description:
      "Interact with your FutureSelf or share it with friends, family, and the world. Your story, always alive.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-16 border-b border-white/[0.06] bg-[#06060f]/80 backdrop-blur-md">
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          FutureSelf
        </span>
        <Link
          href="/login"
          className="hidden md:inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          Sign In
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center pt-44 pb-36 px-6 overflow-hidden">
        {/* Ambient glows */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-violet-700/20 blur-[140px] pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-fuchsia-700/15 blur-[100px] pointer-events-none"
          aria-hidden
        />

        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          Now in Early Access
        </div>

        <h1 className="max-w-4xl text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
          <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
            Create an AI version
            <br />
            of yourself.
          </span>
        </h1>

        <p className="max-w-xl text-lg md:text-xl text-white/50 leading-relaxed mb-12">
          Train your FutureSelf with your memories, beliefs, goals, and
          personality. Then let yourself or others chat with it.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/45 hover:scale-[1.03] transition-all duration-200"
          >
            Create My FutureSelf
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-base font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            Explore Demo
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-28 px-6 md:px-16" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="text-white">Everything you need to </span>
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                preserve who you are
              </span>
            </h2>
            <p className="text-white/40 text-lg max-w-lg mx-auto">
              Built for depth, not just data. FutureSelf captures what makes you, you.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ Icon, title, description, iconClass, borderHover }) => (
              <div
                key={title}
                className={`group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all duration-300 hover:bg-white/[0.06] ${borderHover}`}
              >
                <div
                  className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-5 ${iconClass}`}
                >
                  <Icon />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        className="relative py-28 px-6 md:px-16 overflow-hidden"
        id="how-it-works"
      >
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-violet-900/20 blur-[130px] pointer-events-none"
          aria-hidden
        />

        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
            How It Works
          </h2>
          <p className="text-white/40 text-lg">
            Three steps to creating your digital legacy.
          </p>
        </div>

        <div className="max-w-2xl mx-auto flex flex-col gap-0">
          {steps.map(({ title, description }, i) => {
            const isLast = i === steps.length - 1;
            return (
              <div key={title} className="relative flex gap-6 pb-0">
                {/* Step indicator */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-400 text-sm font-bold z-10">
                    {i + 1}
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-gradient-to-b from-violet-500/20 to-transparent mt-1 mb-1 min-h-[48px]" />
                  )}
                </div>

                {/* Content */}
                <div className={isLast ? "pb-0" : "pb-10"}>
                  <h3 className="text-xl font-semibold text-white mb-2 leading-tight">
                    {title}
                  </h3>
                  <p className="text-white/45 leading-relaxed">{description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 px-6 md:px-16">
        <div className="max-w-3xl mx-auto text-center rounded-3xl border border-white/[0.08] bg-gradient-to-br from-violet-900/30 to-fuchsia-900/20 p-12 md:p-16 relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-violet-800/20 to-fuchsia-800/10 blur-2xl"
            aria-hidden
          />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Your story deserves
            <br />
            to live forever.
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-md mx-auto">
            Start building your FutureSelf today. It only takes a few minutes to begin.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-9 py-4 text-base font-semibold text-white shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.03] transition-all duration-200"
          >
            Create My FutureSelf
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-10 px-6 md:px-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            FutureSelf
          </span>
          <p className="text-white/25 text-sm">
            © 2026 FutureSelf. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-white/35">
            <a href="#" className="hover:text-white/70 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white/70 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white/70 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
