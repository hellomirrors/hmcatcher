import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = (await res.json()) as {
      data: {
        id: string;
        name: string;
        description?: string;
        created: number;
        pricing: { prompt: string; completion: string };
        context_length: number;
        top_provider?: {
          context_length: number;
          max_completion_tokens: number | null;
          is_moderated: boolean;
        };
      }[];
    };

    return NextResponse.json({ models: data.data });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
