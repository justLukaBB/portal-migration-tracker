const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callEdgeFunction(body) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/zendesk-lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  return res.json();
}

/**
 * Sucht Zendesk-Kontakt anhand des Aktenzeichens.
 * Gibt Objekt mit status zurück:
 *   { status: "found", name, email, phone, userId }
 *   { status: "phone_only", name, phone, userId }
 *   { status: "not_found" }
 */
export async function lookupAktenzeichen(aktenzeichen) {
  if (!aktenzeichen) return { status: "not_found" };

  const data = await callEdgeFunction({ aktenzeichen });
  if (!data?.results?.length) return { status: "not_found" };

  const user = data.results[0];
  if (!user.email && user.phone) {
    return { status: "phone_only", name: user.name, phone: user.phone, userId: user.id };
  }
  return { status: "found", name: user.name, email: user.email, phone: user.phone, userId: user.id };
}

/**
 * Sucht User + erstellt Ticket.
 * Gleiche status-Logik wie lookupAktenzeichen, plus ticket-Infos.
 */
export async function lookupAndCreateTicket(aktenzeichen) {
  if (!aktenzeichen) return { status: "not_found" };

  const data = await callEdgeFunction({ aktenzeichen, createTicket: true });
  if (!data?.results?.length) return { status: "not_found" };

  const user = data.results[0];
  const ticket = data.ticket || null;

  if (!user.email && user.phone) {
    return { status: "phone_only", name: user.name, phone: user.phone, userId: user.id, ticket };
  }
  return { status: "found", name: user.name, email: user.email, phone: user.phone, userId: user.id, ticket };
}
