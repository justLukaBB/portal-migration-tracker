const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Sucht den Namen eines Zendesk-Kontakts anhand des Aktenzeichens.
 * Ruft die Supabase Edge Function "zendesk-lookup" auf.
 * Gibt den Namen zurück oder null, wenn nichts gefunden wurde.
 */
export async function lookupAktenzeichen(aktenzeichen) {
  if (!aktenzeichen || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/zendesk-lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ aktenzeichen }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.results && data.results.length > 0) {
    return data.results[0].name;
  }
  return null;
}
