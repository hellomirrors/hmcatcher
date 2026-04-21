import {
  getAnswersBySession,
  getDialogById,
} from "@/domain/dialog/dialog-repository";
import type { DialogDefinition } from "@/domain/dialog/dialog-schema";
import { type LeadFilters, listLeads } from "@/domain/leads/lead-repository";

export const dynamic = "force-dynamic";

function parseFilters(url: URL): LeadFilters {
  const filters: LeadFilters = {};
  const dialogId = url.searchParams.get("dialogId");
  if (dialogId && dialogId !== "all") {
    const id = Number(dialogId);
    if (!Number.isNaN(id)) {
      filters.dialogId = id;
    }
  }
  const bucket = url.searchParams.get("bucket");
  if (bucket && bucket !== "all") {
    filters.bucket = bucket;
  }
  const state = url.searchParams.get("state");
  if (state && state !== "all") {
    filters.state = state;
  }
  const search = url.searchParams.get("search");
  if (search?.trim()) {
    filters.search = search.trim();
  }
  const from = url.searchParams.get("from");
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) {
      filters.fromDate = d;
    }
  }
  const to = url.searchParams.get("to");
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      filters.toDate = d;
    }
  }
  return filters;
}

function stepLabel(
  definition: DialogDefinition | undefined,
  stepId: string
): string {
  const step = definition?.steps.find((s) => s.id === stepId);
  return step?.message ? step.message.split("\n")[0] : stepId;
}

function timestampForFilename(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const filters = parseFilters(url);
  const leads = listLeads(filters);

  const dialogDefs = new Map<number, DialogDefinition | undefined>();
  const loadDef = (id: number): DialogDefinition | undefined => {
    if (!dialogDefs.has(id)) {
      dialogDefs.set(id, getDialogById(id)?.definition);
    }
    return dialogDefs.get(id);
  };

  const payload = {
    exportedAt: new Date().toISOString(),
    filters: {
      dialogId: filters.dialogId ?? null,
      bucket: filters.bucket ?? null,
      state: filters.state ?? null,
      search: filters.search ?? null,
      fromDate: filters.fromDate?.toISOString() ?? null,
      toDate: filters.toDate?.toISOString() ?? null,
    },
    count: leads.length,
    leads: leads.map((lead) => {
      const def = lead.dialogId ? loadDef(lead.dialogId) : undefined;
      const answers = lead.sessionId ? getAnswersBySession(lead.sessionId) : [];
      return {
        id: lead.id,
        sessionId: lead.sessionId,
        dialogId: lead.dialogId,
        dialogName: lead.dialogName,
        provider: lead.provider,
        contact: lead.contact,
        vorname: lead.vorname,
        nachname: lead.nachname,
        email: lead.email,
        plz: lead.plz,
        score: lead.score,
        bucket: lead.bucket,
        state: lead.state,
        consentAt: lead.consentAt?.toISOString() ?? null,
        completedAt: lead.completedAt?.toISOString() ?? null,
        createdAt: lead.createdAt?.toISOString() ?? null,
        updatedAt: lead.updatedAt?.toISOString() ?? null,
        variables: lead.variables,
        answers: answers.map((a) => ({
          stepId: a.stepId,
          stepLabel: stepLabel(def, a.stepId),
          answerValue: a.answerValue,
          answerLabel: a.answerLabel,
          scoreAdded: a.scoreAdded,
          createdAt: a.createdAt?.toISOString() ?? null,
        })),
      };
    }),
  };

  const filename = `leads-export-${timestampForFilename()}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
