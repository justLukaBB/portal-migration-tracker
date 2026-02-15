import { corsHeaders } from "../_shared/cors.ts";

function getConfig() {
  const subdomain = Deno.env.get("ZENDESK_SUBDOMAIN");
  const email = Deno.env.get("ZENDESK_EMAIL");
  const apiToken = Deno.env.get("ZENDESK_API_TOKEN");
  const fieldKey = Deno.env.get("ZENDESK_FIELD_KEY") || "aktenzeichen";

  if (!subdomain || !email || !apiToken) return null;

  return {
    subdomain,
    fieldKey,
    baseUrl: `https://${subdomain}.zendesk.com/api/v2`,
    auth: `Basic ${btoa(`${email}/token:${apiToken}`)}`,
  };
}

async function searchUser(cfg: ReturnType<typeof getConfig>, aktenzeichen: string) {
  const query = `type:user ${cfg!.fieldKey}:${aktenzeichen}`;
  const res = await fetch(
    `${cfg!.baseUrl}/search.json?query=${encodeURIComponent(query)}`,
    { headers: { Authorization: cfg!.auth } }
  );
  if (!res.ok) throw new Error(`Zendesk Search fehlgeschlagen: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((u: any) => ({
    name: u.name || "",
    email: u.email || "",
    phone: u.phone || "",
    id: u.id,
    aktenzeichen: u.user_fields?.[cfg!.fieldKey] || "",
    adresse: u.user_fields?.adresse || "",
    geburtstag: u.user_fields?.geburtstag || "",
  }));
}

async function createTicketWithMacro(cfg: ReturnType<typeof getConfig>, userId: number) {
  const ticketPayload = {
    ticket: {
      requester_id: userId,
      subject: "Portal Link zusenden",
      comment: {
        body: "Portal Link senden",
        public: false,
      },
      tags: ["portal_link", "ticket_type:onboarding"],
    },
  };

  const res = await fetch(`${cfg!.baseUrl}/tickets.json`, {
    method: "POST",
    headers: {
      Authorization: cfg!.auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ticketPayload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ticket-Erstellung fehlgeschlagen: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    ticketId: data.ticket.id,
    ticketUrl: `https://${cfg!.subdomain}.zendesk.com/agent/tickets/${data.ticket.id}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const body = await req.json();
    const { aktenzeichen, createTicket } = body;

    if (!aktenzeichen || typeof aktenzeichen !== "string") {
      return new Response(
        JSON.stringify({ error: "Aktenzeichen fehlt" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const cfg = getConfig();
    if (!cfg) {
      return new Response(
        JSON.stringify({ error: "Zendesk-Konfiguration fehlt" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const results = await searchUser(cfg, aktenzeichen);

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ results: [], ticket: null }),
        { headers: jsonHeaders }
      );
    }

    const user = results[0];
    const missing: string[] = [];
    if (!user.email) missing.push("E-Mail");
    if (!user.adresse) missing.push("Adresse");
    if (!user.geburtstag) missing.push("Geburtsdatum");

    // Ticket nur erstellen wenn ALLES vollstaendig
    let ticket = null;
    if (createTicket && missing.length === 0) {
      ticket = await createTicketWithMacro(cfg, user.id);
    }

    return new Response(
      JSON.stringify({ results, ticket, missing }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
