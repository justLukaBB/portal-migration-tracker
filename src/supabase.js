import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function toDbRow(row, index) {
  return {
    id: row.id,
    position: index,
    az: row.az,
    zendesk_url: row.zendeskUrl,
    name: row.name,
    typ: row.typ,
    batch: row.batch,
    monat: row.monat,
    rate: row.rate,
    portal: row.portal,
    datum_portal: row.datumPortal,
    email: row.email,
    datum_email: row.datumEmail,
    docs: row.docs,
    reminder: row.reminder,
    datum_reminder: row.datumReminder,
    tel: row.tel,
    status: row.status,
    bemerkung: row.bemerkung,
  };
}

function fromDbRow(dbRow) {
  return {
    id: dbRow.id,
    az: dbRow.az || "",
    zendeskUrl: dbRow.zendesk_url || "",
    name: dbRow.name || "",
    typ: dbRow.typ || "",
    batch: dbRow.batch || "",
    monat: dbRow.monat || "",
    rate: dbRow.rate || "",
    portal: dbRow.portal || "",
    datumPortal: dbRow.datum_portal || "",
    email: dbRow.email || "",
    datumEmail: dbRow.datum_email || "",
    docs: dbRow.docs || "",
    reminder: dbRow.reminder || "",
    datumReminder: dbRow.datum_reminder || "",
    tel: dbRow.tel || "",
    status: dbRow.status || "Offen",
    bemerkung: dbRow.bemerkung || "",
  };
}

export async function fetchRows() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("tracker_rows")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data.map(fromDbRow);
}

export async function upsertRows(rows) {
  if (!supabase) return;
  const dbRows = rows.map((r, i) => ({
    ...toDbRow(r, i),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("tracker_rows")
    .upsert(dbRows, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteRow(id) {
  if (!supabase) return;
  const { error } = await supabase
    .from("tracker_rows")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function resetAll() {
  if (!supabase) return;
  const { error } = await supabase
    .from("tracker_rows")
    .delete()
    .not("id", "is", null);
  if (error) throw error;
}
