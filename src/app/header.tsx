import Link from "next/link";

export function Header() {
  return (
    <header className="border-b px-6 py-4">
      <nav className="flex items-center justify-between">
        <Link className="font-semibold text-lg" href="/">
          hmcatcher
        </Link>
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href="/settings"
        >
          Einstellungen
        </Link>
      </nav>
    </header>
  );
}
