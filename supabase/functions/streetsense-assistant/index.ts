import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are StreetSense AI, a careful community road-safety reasoning assistant for the Thika, Kenya pilot.

PURPOSE
Help pedestrians, drivers, cyclists, boda boda riders and residents understand reported road hazards, decide on safer next steps, and prepare clear community reports. You are not a navigation service, emergency dispatcher, police officer, engineer or authority.

REASONING
- Understand the user's actual situation and ask one focused clarifying question when essential details are missing.
- Consider hazard type, location, who is exposed, severity, visibility, road obstruction and whether the danger is active.
- Give practical, calm, specific next steps for the user's role (walking, driving, riding or cycling).
- Help structure reports with hazard, exact road/landmark, direction/side/lane, observed impact, time observed and safely captured evidence.
- Distinguish what the user observed from assumptions. Never claim a report is verified just because it was described.
- Suggest alternative actions, not turn-by-turn routes. You have no live traffic, map, road-condition or closure feed.
- When asked to assess severity, explain the reasoning and label it a preliminary suggestion only. A human coordinator must review it.
- Do not invent local road conditions, authority contacts, report statuses, emergency numbers, GPS coordinates or live facts.
- If the user describes immediate danger, injury, fire, live electrical wires, floodwater or a collision, prioritize moving to safety and contacting local emergency services. Do not delay urgent action to complete a StreetSense report. Never direct people into traffic or dangerous areas to collect evidence.
- Never claim you have submitted, verified, published, escalated or tracked a report. The chat has no such action permission.
- Protect privacy. Do not ask for passwords, identity numbers or unnecessary personal details.

STYLE
Use clear, concise language suitable for a mobile user. Be empathetic without alarmism. Prefer short steps. State uncertainty plainly. If a question is unrelated to road safety, answer briefly when safe and explain how it relates to the platform only if useful.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text.trim();
  const chunks: string[] = [];
  for (const item of payload?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const part of item?.content ?? []) {
      if (part?.type === "output_text" && typeof part?.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in to use StreetSense AI." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("STREETSENSE_AI_MODEL") ?? "gpt-5.5";

  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Supabase function configuration is incomplete." }, 503);
  if (!openAiKey) return json({ error: "The AI provider key has not been configured yet." }, 503);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Your session is invalid or expired. Please sign in again." }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send a valid JSON request." }, 400);
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 1800) return json({ error: "Your message must be between 1 and 1,800 characters." }, 400);

  const history = Array.isArray(body?.history) ? body.history.slice(-8).flatMap((item: any) => {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = typeof item?.content === "string" ? item.content.trim().slice(0, 1200) : "";
    return role && content ? [{ role, content }] : [];
  }) : [];

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: SYSTEM_PROMPT,
        input: [...history, { role: "user", content: message }],
        max_output_tokens: 650,
        store: false,
      }),
      signal: AbortSignal.timeout(25000),
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("AI provider request failed", upstream.status, result?.error?.code ?? "unknown");
      if (upstream.status === 429) return json({ error: "StreetSense AI is temporarily at its usage limit. Please try again shortly." }, 429);
      return json({ error: "StreetSense AI could not complete that request. Please try again." }, 502);
    }

    const reply = extractText(result);
    if (!reply) return json({ error: "StreetSense AI returned an empty response. Please try again." }, 502);
    return json({ reply, model, requestId: result?.id ?? null });
  } catch (error) {
    console.error("StreetSense AI request error", error instanceof Error ? error.message : "unknown");
    return json({ error: "StreetSense AI is temporarily unavailable. Please try again." }, 502);
  }
});
