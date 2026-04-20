import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAnswersBySession,
  getDialogById,
} from "@/domain/dialog/dialog-repository";
import { getLeadById } from "@/domain/leads/lead-repository";

export const dynamic = "force-dynamic";

function formatTime(date: Date | null): string {
  if (!date) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function LeadDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const leadId = Number(id);
  if (Number.isNaN(leadId)) {
    notFound();
  }
  const lead = getLeadById(leadId);
  if (!lead) {
    notFound();
  }

  const dialog = lead.dialogId ? getDialogById(lead.dialogId) : undefined;
  const answers = lead.sessionId ? getAnswersBySession(lead.sessionId) : [];
  const stepLabel = (stepId: string): string => {
    const step = dialog?.definition.steps.find((s) => s.id === stepId);
    return step?.message ? step.message.split("\n")[0] : stepId;
  };

  const fullName =
    [lead.vorname, lead.nachname].filter(Boolean).join(" ") || "—";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl">{fullName}</h1>
        <Link
          className={buttonVariants({ variant: "outline", size: "sm" })}
          href="/leads"
        >
          Zurück
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
          <CardDescription>Erfasste Felder dieses Leads.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Kontakt</p>
            <p>{lead.contact}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Provider</p>
            <p>{lead.provider}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">E-Mail</p>
            <p>{lead.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">PLZ</p>
            <p>{lead.plz ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Score</p>
            <p>{lead.score}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Bucket</p>
            <p>
              {lead.bucket ? (
                <Badge>{lead.bucket}</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <p>
              <Badge
                variant={lead.state === "completed" ? "default" : "secondary"}
              >
                {lead.state}
              </Badge>
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Consent</p>
            <p>{formatTime(lead.consentAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Abgeschlossen</p>
            <p>{formatTime(lead.completedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Dialog</p>
            <p>{dialog?.name ?? lead.dialogId ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variablen</CardTitle>
          <CardDescription>
            Vollständiger Snapshot aller Dialog-Variablen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(lead.variables).length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine Variablen.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {Object.entries(lead.variables).map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-1.5 pr-4 font-mono text-muted-foreground text-xs">
                      {k}
                    </td>
                    <td className="break-all py-1.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Antwort-Verlauf</CardTitle>
          <CardDescription>
            Chronologische Antworten der Session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {answers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Keine Antworten erfasst.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground text-xs">
                <tr>
                  <th className="py-2 pr-3">Zeit</th>
                  <th className="py-2 pr-3">Step</th>
                  <th className="py-2 pr-3">Antwort</th>
                  <th className="py-2 pr-3">+Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {answers.map((a) => (
                  <tr key={a.id}>
                    <td className="py-1.5 pr-3 text-muted-foreground text-xs">
                      {formatTime(a.createdAt)}
                    </td>
                    <td className="py-1.5 pr-3 text-xs">
                      {stepLabel(a.stepId)}
                    </td>
                    <td className="py-1.5 pr-3">
                      {a.answerLabel ?? a.answerValue}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground text-xs">
                      {a.scoreAdded > 0 ? `+${a.scoreAdded}` : a.scoreAdded}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
