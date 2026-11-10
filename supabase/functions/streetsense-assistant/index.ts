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
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((part: any) => typeof part?.text === "string" && !part?.thought)
    .map((part: any) => part.text).join("\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in to use StreetSense AI." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("STREETSENSE_GEMINI_MODEL") ?? "gemini-3.8-flash";

  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Supabase function configuration is incomplete." }, 503);
  if (!geminiKey) return json({ error: "The free-tier Gemini API key has not been configured yet. The local safety guide is still available." }, 503);

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

  const reasoning = body?.reasoning === "deep" ? "high" : "low";
  const history = Array.isArray(body?.history) ? body.history.slice(-8).flatMap((item: any) => {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = typeof item?.content === "string" ? item.content.trim().slice(0, 1200) : "";
    return role && content ? [{ role, content }] : [];
  }) : [];

  try {
    const contents = [...history, { role: "user", content: message }].map((item: any) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    }));
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          maxOutputTokens: 1800,
          thinkingConfig: { thinkingLevel: reasoning },
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Gemini request failed", upstream.status, result?.error?.status ?? "unknown");
      if (upstream.status === 429) {
        const retryHeader = upstream.headers.get("Retry-After");
        const retryAfterSeconds = retryHeader ? Number(retryHeader) : null;
        return json({
          error: retryAfterSeconds
            ? `StreetSense AI has reached a temporary free-tier limit. Please wait about ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minute(s) and try again.`
            : "StreetSense AI has reached its free-tier request or daily quota. Please wait for the limit to reset, then try again. Deep reasoning uses more of the available allowance.",
          retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
        }, 429);
      }
      return json({ error: "Gemini could not complete that request. Please try again." }, 502);
    }

    const reply = extractText(result);
    if (!reply) return json({ error: "Gemini returned an empty response. Please try again." }, 502);
    return json({ reply, model, reasoning });
  } catch (error) {
    console.error("StreetSense AI request error", error instanceof Error ? error.message : "unknown");
    return json({ error: "StreetSense AI is temporarily unavailable. Please try again." }, 502);
  }
});
