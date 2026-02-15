import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { aktenzeichen } = await req.json();

    if (!aktenzeichen || typeof aktenzeichen !== "string") {
      return new Response(
        JSON.stringify({ error: "Aktenzeichen fehlt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subdomain = Deno.env.get("ZENDESK_SUBDOMAIN");
    const email = Deno.env.get("ZENDESK_EMAIL");
    const apiToken = Deno.env.get("ZENDESK_API_TOKEN");
    const fieldKey = Deno.env.get("ZENDESK_FIELD_KEY") || "aktenzeichen";

    if (!subdomain || !email || !apiToken) {
      return new Response(
        JSON.stringify({ error: "Zendesk-Konfiguration fehlt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const query = `type:user ${fieldKey}:${aktenzeichen}`;
    const url = `https://${subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}`;
    const auth = btoa(`${email}/token:${apiToken}`);

    const zdRes = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!zdRes.ok) {
      const text = await zdRes.text();
      return new Response(
        JSON.stringify({ error: `Zendesk API Fehler: ${zdRes.status}`, detail: text }),
        { status: zdRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await zdRes.json();
    const results = (data.results || []).map((u: any) => ({
      name: u.name || "",
      email: u.email || "",
      id: u.id,
      aktenzeichen: u.user_fields?.[fieldKey] || "",
    }));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
