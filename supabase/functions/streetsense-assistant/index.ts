import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("STREETSENSE_ALLOWED_ORIGINS") ??
  "https://streetsense.musilalex237.workers.dev")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

function corsHeadersFor(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

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

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = corsHeadersFor(origin);
  const respond = (body: unknown, status = 200) => json(body, status, corsHeaders);
  if (origin && !allowedOrigins.includes(origin)) return respond({ error: "Origin not allowed." }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return respond({ error: "Sign in to use StreetSense AI." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");
  const model = Deno.env.get("STREETSENSE_GROQ_MODEL") ?? "openai/gpt-oss-120b";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) return respond({ error: "Supabase function configuration is incomplete." }, 503);
  if (!groqKey) return respond({ error: "StreetSense AI provider is not configured yet. The local safety guide is still available." }, 503);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return respond({ error: "Your session is invalid or expired. Please sign in again." }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return respond({ error: "Send a valid JSON request." }, 400);
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 1800) return respond({ error: "Your message must be between 1 and 1,800 characters." }, 400);

  const limiter = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: allowed, error: limitError } = await limiter.rpc(
    "consume_streetsense_ai_rate_limit",
    { p_user_id: authData.user.id },
  );
  if (limitError) {
    console.error("StreetSense AI rate-limit check failed", limitError.message);
    return respond({ error: "StreetSense AI is temporarily unavailable. Please try again shortly." }, 503);
  }
  if (allowed !== true) {
    const retryAfterSeconds = 60 - new Date().getSeconds();
    return respond({
      error: "You've reached the StreetSense AI limit of 12 messages per minute. Please wait a moment and try again.",
      retryAfterSeconds,
    }, 429);
  }

  const reasoning = body?.reasoning === "deep" ? "deep" : "quick";
  const history = Array.isArray(body?.history) ? body.history.slice(-8).flatMap((item: any) => {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = typeof item?.content === "string" ? item.content.trim().slice(0, 1200) : "";
    return role && content ? [{ role, content }] : [];
  }) : [];

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: message },
    ];
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: reasoning === "deep" ? 1800 : 900,
        reasoning_effort: reasoning === "deep" ? "high" : "low",
        reasoning_format: "hidden",
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Groq request failed", upstream.status, result?.error?.code ?? "unknown");
      if (upstream.status === 429) {
        const retryHeader = upstream.headers.get("Retry-After");
        const retryAfterSeconds = retryHeader ? Number(retryHeader) : null;
        return respond({
          error: retryAfterSeconds
            ? `StreetSense AI has reached a temporary provider limit. Please wait about ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minute(s) and try again.`
            : "StreetSense AI has reached its current provider quota. Please wait and try again later.",
          retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
        }, 429);
      }
      return respond({ error: "Groq could not complete that request. Please try again." }, 502);
    }

    const reply = result?.choices?.[0]?.message?.content?.trim();
    if (typeof reply !== "string" || !reply) return respond({ error: "StreetSense AI returned an empty response. Please try again." }, 502);
    return respond({ reply, model, reasoning });
  } catch (error) {
    console.error("StreetSense AI request error", error instanceof Error ? error.message : "unknown");
    return respond({ error: "StreetSense AI is temporarily unavailable. Please try again." }, 502);
  }
});
