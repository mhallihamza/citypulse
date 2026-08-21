import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

const NAV: { to: string; label: string; section?: string }[] = [
  { to: "/", label: "Platform", section: "platform" },
  { to: "/", label: "Services", section: "services" },
  { to: "/", label: "How It Works", section: "how-it-works" },
  { to: "/", label: "AI Intelligence", section: "ai" },
  { to: "/solutions", label: "Solutions" },
  { to: "/about", label: "About" },
];

export function PublicLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goSection = (section: string) => {
    setOpen(false);
    if (location.pathname === "/") {
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate("/");
      setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth" }), 150);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-all",
          scrolled ? "border-ink-100 bg-white/90 backdrop-blur-lg" : "border-transparent bg-white"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link to="/" aria-label="CITYPULSE home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) =>
              item.section ? (
                <button
                  key={item.label}
                  onClick={() => goSection(item.section!)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:text-pulse-600"
                >
                  {item.label}
                </button>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-pulse-600",
                      isActive ? "text-pulse-600" : "text-ink-600"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              )
            )}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <button className="rounded-lg p-2 text-ink-600 lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-ink-100 bg-white px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map((item) =>
                item.section ? (
                  <button
                    key={item.label}
                    onClick={() => goSection(item.section!)}
                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-700 hover:bg-ink-50"
                  >
                    {item.label}
                  </button>
                ) : (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                  >
                    {item.label}
                  </NavLink>
                )
              )}
              <div className="mt-2 flex gap-2 border-t border-ink-100 pt-3">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link to="/register" className="flex-1">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  );
}

export function PublicFooter() {
  const navigate = useNavigate();
  return (
    <footer className="border-t border-ink-100 bg-ink-950 text-ink-300">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
              The Smart City Operations Platform. One place to see what is happening, understand why, and take action.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-500">Platform</h4>
            <ul className="space-y-2 text-sm">
              {["City Map", "Events", "AI Insights", "Analytics", "Devices"].map((l) => (
                <li key={l}>
                  <button onClick={() => navigate("/platform")} className="text-ink-400 transition-colors hover:text-white">
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-500">Services</h4>
            <ul className="space-y-2 text-sm">
              {["Smart Lighting", "Water Monitoring", "Waste Management", "Traffic"].map((l) => (
                <li key={l}>
                  <button
                    onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
                    className="text-ink-400 transition-colors hover:text-white"
                  >
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-500">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-ink-400 transition-colors hover:text-white">About</Link></li>
              <li><Link to="/solutions" className="text-ink-400 transition-colors hover:text-white">Solutions</Link></li>
              <li><Link to="/register" className="text-ink-400 transition-colors hover:text-white">Request access</Link></li>
              <li><Link to="/login" className="text-ink-400 transition-colors hover:text-white">Sign In</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-ink-500 sm:flex-row">
          <span>© {new Date().getFullYear()} CITYPULSE Technologies · Smart City Operations Platform</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live-400" />
            All systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}
