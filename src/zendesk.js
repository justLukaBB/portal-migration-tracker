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
 * Sucht den Namen eines Zendesk-Kontakts anhand des Aktenzeichens.
 * Gibt { name, userId } zurück oder null.
 */
export async function lookupAktenzeichen(aktenzeichen) {
  if (!aktenzeichen) return null;

  const data = await callEdgeFunction({ aktenzeichen });
  if (data?.results?.length > 0) {
    return { name: data.results[0].name, userId: data.results[0].id };
  }
  return null;
}

/**
 * Sucht User + erstellt Ticket mit Makro "Portal Link senden".
 * Gibt { name, userId, ticketId, ticketUrl } zurück oder null.
 */
export async function lookupAndCreateTicket(aktenzeichen) {
  if (!aktenzeichen) return null;

  const data = await callEdgeFunction({ aktenzeichen, createTicket: true });
  if (data?.results?.length > 0) {
    return {
      name: data.results[0].name,
      userId: data.results[0].id,
      ticketId: data.ticket?.ticketId || null,
      ticketUrl: data.ticket?.ticketUrl || null,
    };
  }
  return null;
}
