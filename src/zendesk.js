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

function parseResult(data) {
  if (!data?.results?.length) return { status: "not_found" };

  const user = data.results[0];
  const missing = data.missing || [];

  return {
    status: missing.length > 0 ? "incomplete" : "found",
    name: user.name,
    email: user.email,
    phone: user.phone,
    userId: user.id,
    userUrl: user.userUrl || "",
    missing,
    ticket: data.ticket || null,
  };
}

export async function lookupAktenzeichen(aktenzeichen) {
  if (!aktenzeichen) return { status: "not_found" };
  const data = await callEdgeFunction({ aktenzeichen });
  return parseResult(data);
}

export async function lookupAndCreateTicket(aktenzeichen) {
  if (!aktenzeichen) return { status: "not_found" };
  const data = await callEdgeFunction({ aktenzeichen, createTicket: true });
  return parseResult(data);
}
