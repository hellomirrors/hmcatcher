import {
  Activity,
  BarChart3,
  FileText,
  GitCompare,
  LogOut,
  MessageSquare,
  Phone,
  QrCode,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/login/action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Tile {
  badge?: { text: string; variant: "secondary" | "outline" };
  description: string;
  href: string;
  icon: typeof FileText;
  label: string;
}

const tiles: Tile[] = [
  {
    href: "/dialogs",
    icon: FileText,
    label: "Dialoge",
    description: "Dialogabläufe verwalten",
  },
  {
    href: "/leads",
    icon: Users,
    label: "Leads",
    description: "Erfasste Kontakte aus Dialogen",
  },
  {
    href: "/leads/dashboard",
    icon: BarChart3,
    label: "Lead-Dashboard",
    description: "Live-Monitor mit Charts und Ton",
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
    href: "/status",
    icon: Activity,
    label: "Status",
    description: "Provider-Status prüfen",
  },
  {
    href: "/watest",
    icon: Phone,
    label: "WhatsApp Test",
    description: "Nachrichten manuell testen",
  },
  {
    href: "/comparison",
    icon: GitCompare,
    label: "Provider-Vergleich",
    description:
      "Capability-Übersicht der Messaging-Provider (Cloud API / GoWa / Telegram)",
    badge: { text: "Info", variant: "outline" },
  },
  {
    href: "/slotmachine",
    icon: Trophy,
    label: "Slotmachine",
    description: "Kontaktformular mit QR-Versand per WhatsApp",
  },
  {
    href: "/start-qr",
    icon: QrCode,
    label: "Start-QR",
    description: "GoWa-Joiner für den Stand (wa.me QR mit 'start')",
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{tile.label}</p>
                    {tile.badge && (
                      <Badge variant={tile.badge.variant}>
                        {tile.badge.text}
                      </Badge>
                    )}
                  </div>
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
