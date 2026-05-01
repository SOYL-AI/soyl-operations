import Link from "next/link";
import { ArrowRight, BarChart3, CheckSquare, Users, Wallet, Activity, Calendar } from "lucide-react";
import { LogoLockup } from "@/components/Logo";

const modules = [
  { icon: BarChart3, title: "Company overview", body: "Real-time KPIs, project pulse, completion rate." },
  { icon: CheckSquare, title: "Task management", body: "Assign, track, and review work end-to-end." },
  { icon: Users, title: "Team tracking", body: "Who's doing what, status, deadlines, ownership." },
  { icon: Wallet, title: "Revenue & expenses", body: "Per-project finance and live profit overview." },
  { icon: Activity, title: "Activity log", body: "Full transparency on every change in the system." },
  { icon: Calendar, title: "Timeline & calendar", body: "Deadlines, milestones, and weekly cadence." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 pt-10 pb-24">
      <header className="flex items-center justify-between">
        <LogoLockup />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn btn-primary">Get started <ArrowRight className="h-4 w-4" /></Link>
        </nav>
      </header>

      <section className="relative mt-20 sm:mt-28">
        <div className="absolute inset-0 -z-10 bg-radial-mint" />
        <p className="text-mint/80 text-xs uppercase tracking-[0.3em]">Company Operations Dashboard</p>
        <h1 className="font-display mt-4 text-5xl sm:text-7xl tracking-tight text-bone leading-[1.02]">
          One command center<br /> for the <span className="text-mint">whole company</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-bone-300/80 text-lg">
          SOYL COD gives founders, managers and the team real-time visibility into execution,
          performance and finances — so a CEO can read the company in under ten seconds.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn btn-primary">Create your workspace <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/login" className="btn btn-ghost border-white/10">I already have an account</Link>
        </div>
      </section>

      <section className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card card-pad">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint/15 text-mint border border-mint/25">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-bone text-lg">{title}</h3>
            </div>
            <p className="mt-3 text-sm text-bone-300/70">{body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-24 border-t border-white/5 pt-8 text-xs text-bone-300/50 flex justify-between">
        <span>© SOYL AI Private Limited</span>
        <span>Story of your life</span>
      </footer>
    </main>
  );
}
