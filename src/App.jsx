import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchRows,
  upsertRows,
  deleteRow as supaDeleteRow,
  resetAll,
  supabase,
} from "./supabase";

const STORAGE_KEY = "portal-tracker-data";

const headers = [
  "", "Nr.", "Aktenzeichen", "Name Mandant", "Online / Lokal", "Batch",
  "Monat", "1. Rate bezahlt", "Portal angelegt", "Datum Portal",
  "E-Mail versendet", "Datum E-Mail", "Dokumente hochgeladen",
  "Reminder versendet", "Datum Reminder", "Tel. Nachfass", "Status", "Bemerkung"
];

const batchOptions = ["Batch 1 (Prio)", "Batch 2", "Batch 3"];
const monatOptions = ["Januar", "Februar"];
const statusOptions = ["Offen", "Angelegt", "E-Mail raus", "Warten auf Upload", "Dokumente da", "Reminder raus", "Tel. Nachfass", "Abgeschlossen"];
const jaOptions = ["Ja", "Nein"];
const typOptions = ["Online", "Lokal"];

const statusColors = {
  "Offen": "bg-gray-50",
  "Angelegt": "bg-blue-50",
  "E-Mail raus": "bg-yellow-50",
  "Warten auf Upload": "bg-orange-50",
  "Dokumente da": "bg-cyan-50",
  "Reminder raus": "bg-purple-50",
  "Tel. Nachfass": "bg-pink-50",
  "Abgeschlossen": "bg-green-50",
};

function makeEmptyRow() {
  return {
    id: crypto.randomUUID(),
    az: "", name: "", typ: "", batch: "", monat: "",
    rate: "", portal: "", datumPortal: "", email: "", datumEmail: "",
    docs: "", reminder: "", datumReminder: "", tel: "", status: "Offen", bemerkung: ""
  };
}

function makeEmptyRows(count) {
  return Array.from({ length: count }, () => makeEmptyRow());
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function saveToStorage(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch { /* ignore */ }
}

function ensureIds(rows) {
  return rows.map(r => r.id ? r : { ...r, id: crypto.randomUUID() });
}

const syncStatusConfig = {
  saved: { label: "Gespeichert", color: "text-green-600", bg: "bg-green-50" },
  saving: { label: "Speichert...", color: "text-yellow-600", bg: "bg-yellow-50" },
  offline: { label: "Offline", color: "text-gray-500", bg: "bg-gray-100" },
  error: { label: "Sync-Fehler", color: "text-red-600", bg: "bg-red-50" },
};

function SyncIndicator({ status }) {
  const cfg = syncStatusConfig[status] || syncStatusConfig.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${status === "saving" ? "animate-pulse" : ""} ${cfg.color.replace("text-", "bg-")}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm flex-1 min-w-[150px]">
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${color}`}>{count}</span>
        {total > 0 && <span className="text-xs text-gray-400">{pct}%</span>}
      </div>
      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color.replace("text-", "bg-")}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Tracker() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(supabase ? "saving" : "offline");
  const [search, setSearch] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterMonat, setFilterMonat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const debounceRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchRows();
        if (cancelled) return;
        if (data && data.length > 0) {
          setRows(data);
          saveToStorage(data);
          setSyncStatus("saved");
        } else if (data) {
          // Supabase connected but empty — migrate localStorage if present
          const local = loadFromStorage();
          if (local && local.length > 0) {
            const withIds = ensureIds(local);
            setRows(withIds);
            await upsertRows(withIds);
            setSyncStatus("saved");
          } else {
            const fresh = makeEmptyRows(20);
            setRows(fresh);
            await upsertRows(fresh);
            setSyncStatus("saved");
          }
        } else {
          // supabase is null (no env vars) — localStorage only
          const local = loadFromStorage();
          setRows(local ? ensureIds(local) : makeEmptyRows(20));
          setSyncStatus("offline");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Supabase load failed, falling back to localStorage:", err);
        setSyncStatus("offline");
        const local = loadFromStorage();
        setRows(local ? ensureIds(local) : makeEmptyRows(20));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Save to localStorage on every change (offline fallback)
  useEffect(() => {
    if (rows.length > 0) saveToStorage(rows);
  }, [rows]);

  // Debounced Supabase sync
  const syncToSupabase = useCallback((updatedRows) => {
    if (!supabase) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSyncStatus("saving");
    debounceRef.current = setTimeout(async () => {
      try {
        await upsertRows(updatedRows);
        setSyncStatus("saved");
      } catch (err) {
        console.error("Supabase sync failed:", err);
        setSyncStatus("error");
      }
    }, 500);
  }, []);

  const update = (realIndex, field, val) => {
    const n = [...rows];
    n[realIndex] = { ...n[realIndex], [field]: val };
    setRows(n);
    syncToSupabase(n);
  };

  const handleDeleteRow = (realIndex) => {
    const row = rows[realIndex];
    const newRows = rows.filter((_, i) => i !== realIndex);
    setRows(newRows);
    if (supabase && row.id) {
      setSyncStatus("saving");
      supaDeleteRow(row.id)
        .then(() => upsertRows(newRows))
        .then(() => setSyncStatus("saved"))
        .catch((err) => {
          console.error("Supabase delete failed:", err);
          setSyncStatus("error");
        });
    }
  };

  const addRows = () => {
    const newRows = [...rows, ...makeEmptyRows(10)];
    setRows(newRows);
    syncToSupabase(newRows);
  };

  const resetData = async () => {
    if (window.confirm("Alle Daten wirklich zurücksetzen? Dies kann nicht rückgängig gemacht werden.")) {
      const fresh = makeEmptyRows(20);
      setRows(fresh);
      setSearch("");
      setFilterBatch("");
      setFilterMonat("");
      setFilterStatus("");
      try {
        await resetAll();
        await upsertRows(fresh);
        setSyncStatus("saved");
      } catch (err) {
        console.error("Supabase reset failed:", err);
        setSyncStatus("error");
      }
    }
  };

  const resetFilters = () => {
    setSearch("");
    setFilterBatch("");
    setFilterMonat("");
    setFilterStatus("");
  };

  const exportCSV = () => {
    const csvHeaders = ["Nr.", "Aktenzeichen", "Name Mandant", "Online / Lokal", "Batch",
      "Monat", "1. Rate bezahlt", "Portal angelegt", "Datum Portal",
      "E-Mail versendet", "Datum E-Mail", "Dokumente hochgeladen",
      "Reminder versendet", "Datum Reminder", "Tel. Nachfass", "Status", "Bemerkung"].join(";");
    const csvRows = rows.map((r, i) =>
      [i + 1, r.az, r.name, r.typ, r.batch, r.monat, r.rate, r.portal, r.datumPortal, r.email, r.datumEmail, r.docs, r.reminder, r.datumReminder, r.tel, r.status, r.bemerkung].join(";")
    );
    const csv = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Portal_Migration_Tracking.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build filtered index list (indices into `rows`)
  const filtersActive = search || filterBatch || filterMonat || filterStatus;
  const searchLower = search.toLowerCase();

  const filteredIndices = rows.reduce((acc, r, i) => {
    if (search && !(r.az.toLowerCase().includes(searchLower) || r.name.toLowerCase().includes(searchLower))) return acc;
    if (filterBatch && r.batch !== filterBatch) return acc;
    if (filterMonat && r.monat !== filterMonat) return acc;
    if (filterStatus && r.status !== filterStatus) return acc;
    acc.push(i);
    return acc;
  }, []);

  const counts = {
    total: rows.filter(r => r.az).length,
    angelegt: rows.filter(r => r.portal === "Ja").length,
    emailRaus: rows.filter(r => r.email === "Ja").length,
    docsDA: rows.filter(r => r.docs === "Ja").length,
    done: rows.filter(r => r.status === "Abgeschlossen").length,
  };

  const sel = "bg-white border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400";
  const inp = "border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">Portal-Migration Tracking</h1>
          <SyncIndicator status={syncStatus} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={addRows} className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700 transition-colors">+ 10 Zeilen</button>
          <button onClick={exportCSV} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors">CSV Export</button>
          <button onClick={resetData} className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 transition-colors">Daten zurücksetzen</button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 mb-4">
        <StatCard label="Erfasst" count={counts.total} total={counts.total} color="text-gray-700" />
        <StatCard label="Portal angelegt" count={counts.angelegt} total={counts.total} color="text-blue-600" />
        <StatCard label="E-Mail raus" count={counts.emailRaus} total={counts.total} color="text-yellow-600" />
        <StatCard label="Docs hochgeladen" count={counts.docsDA} total={counts.total} color="text-cyan-600" />
        <StatCard label="Abgeschlossen" count={counts.done} total={counts.total} color="text-green-600" />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 mb-1 block">Suche (Aktenzeichen / Name)</label>
          <input
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Suche..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Batch</label>
          <select className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
            <option value="">Alle Batches</option>
            {batchOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Monat</label>
          <select className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" value={filterMonat} onChange={e => setFilterMonat(e.target.value)}>
            <option value="">Alle Monate</option>
            {monatOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Status</label>
          <select className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Alle Status</option>
            {statusOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {filtersActive && (
          <div className="flex items-end gap-3">
            <span className="text-sm text-gray-500 pb-1">{filteredIndices.length} von {rows.length} Einträgen</span>
            <button onClick={resetFilters} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300 transition-colors">Filter zurücksetzen</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow relative" style={{ maxHeight: "70vh" }}>
        <table className="text-sm w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-800 text-white">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredIndices.map((realIdx, displayIdx) => {
              const r = rows[realIdx];
              const rowColor = statusColors[r.status] || "bg-white";
              return (
                <tr key={r.id || realIdx} className={`border-b ${rowColor} hover:brightness-95 transition-all`}>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => handleDeleteRow(realIdx)}
                      className="text-red-400 hover:text-red-600 font-bold text-xs leading-none transition-colors"
                      title="Zeile löschen"
                    >X</button>
                  </td>
                  <td className="px-3 py-1.5 text-gray-400 font-mono">{displayIdx + 1}</td>
                  <td className="px-2 py-1.5"><input className={inp} value={r.az} onChange={e => update(realIdx, "az", e.target.value)} /></td>
                  <td className="px-2 py-1.5"><input className={inp} value={r.name} onChange={e => update(realIdx, "name", e.target.value)} style={{ minWidth: "130px" }} /></td>
                  <td className="px-2 py-1.5"><select className={sel} value={r.typ} onChange={e => update(realIdx, "typ", e.target.value)}><option value="">-</option>{typOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                  <td className="px-2 py-1.5"><select className={sel} value={r.batch} onChange={e => update(realIdx, "batch", e.target.value)}><option value="">-</option>{batchOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                  <td className="px-2 py-1.5"><select className={sel} value={r.monat} onChange={e => update(realIdx, "monat", e.target.value)}><option value="">-</option>{monatOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                  <td className="px-2 py-1.5"><select className={sel} value={r.rate} onChange={e => update(realIdx, "rate", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                  <td className="px-2 py-1.5"><select className={sel} value={r.portal} onChange={e => update(realIdx, "portal", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                  <td className="px-2 py-1.5"><input type="date" className={inp} value={r.datumPortal} onChange={e => update(realIdx, "datumPortal", e.target.value)} /></td>
                  <td className="px-2 py-1.5"><select className={sel} value={r.email} onChange={e => update(realIdx, "email", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                  <td className="px-2 py-1.5"><input type="date" className={inp} value={r.datumEmail} onChange={e => update(realIdx, "datumEmail", e.target.value)} /></td>
                  <td className="px-2 py-1.5"><select className={sel} value={r.docs} onChange={e => update(realIdx, "docs", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                  <td className="px-2 py-1.5"><select className={sel} value={r.reminder} onChange={e => update(realIdx, "reminder", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                  <td className="px-2 py-1.5"><input type="date" className={inp} value={r.datumReminder} onChange={e => update(realIdx, "datumReminder", e.target.value)} /></td>
                  <td className="px-2 py-1.5"><select className={sel} value={r.tel} onChange={e => update(realIdx, "tel", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                  <td className="px-2 py-1.5"><select className={sel} value={r.status} onChange={e => update(realIdx, "status", e.target.value)}>{statusOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                  <td className="px-2 py-1.5"><input className={inp} value={r.bemerkung} onChange={e => update(realIdx, "bemerkung", e.target.value)} style={{ minWidth: "130px" }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
