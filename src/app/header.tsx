import Link from "next/link";

export function Header() {
  return (
    <header className="border-b px-6 py-4">
      <nav className="flex items-center justify-between">
        <Link className="font-semibold text-lg" href="/">
          hmcatcher
        </Link>
        <div className="flex gap-4">
          <Link
            className="text-muted-foreground text-sm hover:text-foreground"
            href="/configuration"
          >
            Konfiguration
          </Link>
          <Link
            className="text-muted-foreground text-sm hover:text-foreground"
            href="/settings"
          >
            Einstellungen
          </Link>
        </div>
      </nav>
    </header>
  );
}
