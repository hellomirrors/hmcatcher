import {
  Activity,
  FileText,
  LogOut,
  MessageSquare,
  Phone,
  Settings,
  Sliders,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/login/action";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const tiles = [
  {
    href: "/dialogs",
    icon: FileText,
    label: "Dialoge",
    description: "Dialogabläufe verwalten",
  },
  {
    href: "/conversations",
    icon: MessageSquare,
    label: "Konversationen",
    description: "Chatverlauf einsehen",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Einstellungen",
    description: "App-Einstellungen",
  },
  {
    href: "/configuration",
    icon: Sliders,
    label: "Konfiguration",
    description: "Systemkonfiguration",
  },
  {
    href: "/status",
    icon: Activity,
    label: "Status",
    description: "Provider-Status prüfen",
  },
  {
    href: "/watest",
    icon: Phone,
    label: "WhatsApp Test",
    description: "Nachrichten testen",
  },
  {
    href: "/contact",
    icon: MessageSquare,
    label: "Kontakt",
    description: "Kontaktformular",
  },
  {
    href: "/slotmachine",
    icon: Trophy,
    label: "Slotmachine",
    description: "Kontaktdaten-Eingabe",
  },
];

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-semibold text-2xl">Admin</h1>
        <form action={logoutAction}>
          <Button size="sm" type="submit" variant="outline">
            <LogOut className="mr-2 size-4" />
            Abmelden
          </Button>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link href={tile.href} key={tile.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="flex items-start gap-4 pt-6">
                <tile.icon className="mt-0.5 size-6 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{tile.label}</p>
                  <p className="text-muted-foreground text-sm">
                    {tile.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
