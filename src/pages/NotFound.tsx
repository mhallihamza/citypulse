import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-pulse-600 text-white">
        <Compass className="h-8 w-8" />
      </span>
      <h1 className="font-display text-5xl font-bold text-ink-900">404</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        This node of the city grid doesn't exist — or has been decommissioned.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/">
          <Button variant="outline">Back to homepage</Button>
        </Link>
        <Link to="/app">
          <Button>Open operations</Button>
        </Link>
      </div>
    </div>
  );
}