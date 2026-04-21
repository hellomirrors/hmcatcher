import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDistinctDialogIds,
  type LeadFilters,
  listLeads,
} from "@/domain/leads/lead-repository";

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

function bucketVariant(bucket: string): "default" | "secondary" | "outline" {
  if (bucket === "high") {
    return "default";
  }
  if (bucket === "medium") {
    return "secondary";
  }
  return "outline";
}

function bucketBadge(bucket: string | null) {
  if (!bucket) {
    return <Badge variant="outline">—</Badge>;
  }
  return <Badge variant={bucketVariant(bucket)}>{bucket}</Badge>;
}

interface SearchParams {
  bucket?: string;
  dialogId?: string;
  from?: string;
  search?: string;
  state?: string;
  to?: string;
}

function buildFilters(params: SearchParams): LeadFilters {
  const filters: LeadFilters = {};
  if (params.dialogId && params.dialogId !== "all") {
    const id = Number(params.dialogId);
    if (!Number.isNaN(id)) {
      filters.dialogId = id;
    }
  }
  if (params.bucket && params.bucket !== "all") {
    filters.bucket = params.bucket;
  }
  if (params.state && params.state !== "all") {
    filters.state = params.state;
  }
  if (params.search?.trim()) {
    filters.search = params.search.trim();
  }
  if (params.from) {
    const d = new Date(params.from);
    if (!Number.isNaN(d.getTime())) {
      filters.fromDate = d;
    }
  }
  if (params.to) {
    const d = new Date(params.to);
    if (!Number.isNaN(d.getTime())) {
      filters.toDate = d;
    }
  }
  return filters;
}

function buildExportHref(params: SearchParams): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all") {
      qs.set(key, value);
    }
  }
  const suffix = qs.toString();
  return suffix ? `/api/leads/export?${suffix}` : "/api/leads/export";
}

export default async function LeadsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const filters = buildFilters(searchParams);
  const leads = listLeads(filters);
  const dialogOptions = getDistinctDialogIds();
  const exportHref = buildExportHref(searchParams);

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Leads</CardTitle>
            <CardDescription>
              Erfasste Kontakte aus laufenden und abgeschlossenen Dialogen.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href="/leads/dashboard"
            >
              Dashboard
            </Link>
            <a
              className={buttonVariants({ variant: "outline", size: "sm" })}
              download
              href={exportHref}
            >
              Export JSON
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
            method="GET"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="search">Suche</Label>
              <Input
                defaultValue={searchParams.search ?? ""}
                id="search"
                name="search"
                placeholder="Name / E-Mail / Nummer"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dialogId">Dialog</Label>
              <Select
                defaultValue={searchParams.dialogId ?? "all"}
                name="dialogId"
              >
                <SelectTrigger id="dialogId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  {dialogOptions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bucket">Bucket</Label>
              <Select defaultValue={searchParams.bucket ?? "all"} name="bucket">
                <SelectTrigger id="bucket">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="state">Status</Label>
              <Select defaultValue={searchParams.state ?? "all"} name="state">
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="from">Von</Label>
              <Input
                defaultValue={searchParams.from ?? ""}
                id="from"
                name="from"
                type="date"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="to">Bis</Label>
              <Input
                defaultValue={searchParams.to ?? ""}
                id="to"
                name="to"
                type="date"
              />
            </div>
            <div className="flex items-end gap-2 lg:col-span-6">
              <Button size="sm" type="submit">
                Filtern
              </Button>
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href="/leads"
              >
                Zurücksetzen
              </Link>
            </div>
          </form>

          {leads.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Keine Leads gefunden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground text-xs">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Kontakt</th>
                    <th className="py-2 pr-3">Dialog</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">Bucket</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Consent</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((lead) => (
                    <tr className="hover:bg-muted/50" key={lead.id}>
                      <td className="py-2 pr-3 font-medium">
                        {[lead.vorname, lead.nachname]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground text-xs">
                        {lead.contact}
                        <Badge className="ml-2" variant="outline">
                          {lead.provider}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {lead.dialogName ?? "—"}
                      </td>
                      <td className="py-2 pr-3">{lead.score}</td>
                      <td className="py-2 pr-3">{bucketBadge(lead.bucket)}</td>
                      <td className="py-2 pr-3">
                        <Badge
                          variant={
                            lead.state === "completed" ? "default" : "secondary"
                          }
                        >
                          {lead.state}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {formatTime(lead.consentAt)}
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          className="text-primary text-xs hover:underline"
                          href={`/leads/${lead.id}`}
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
