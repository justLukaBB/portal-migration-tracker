import { useState } from "react";

const headers = [
  "Nr.", "Aktenzeichen", "Name Mandant", "Online / Lokal", "Batch",
  "Monat", "1. Rate bezahlt", "Portal angelegt", "Datum Portal",
  "E-Mail versendet", "Datum E-Mail", "Dokumente hochgeladen",
  "Reminder versendet", "Datum Reminder", "Tel. Nachfass", "Status", "Bemerkung"
];

const batchOptions = ["Batch 1 (Prio)", "Batch 2", "Batch 3"];
const monatOptions = ["Januar", "Februar"];
const statusOptions = ["Offen", "Angelegt", "E-Mail raus", "Warten auf Upload", "Dokumente da", "Reminder raus", "Tel. Nachfass", "Abgeschlossen"];
const jaOptions = ["Ja", "Nein"];
const typOptions = ["Online", "Lokal"];

const emptyRows = Array.from({ length: 20 }, (_, i) => ({
  nr: i + 1, az: "", name: "", typ: "", batch: "", monat: "",
  rate: "", portal: "", datumPortal: "", email: "", datumEmail: "",
  docs: "", reminder: "", datumReminder: "", tel: "", status: "Offen", bemerkung: ""
}));

export default function Tracker() {
  const [rows, setRows] = useState(emptyRows);

  const update = (i, field, val) => {
    const n = [...rows];
    n[i] = { ...n[i], [field]: val };
    setRows(n);
  };

  const addRows = () => {
    const start = rows.length;
    const newRows = Array.from({ length: 10 }, (_, i) => ({
      nr: start + i + 1, az: "", name: "", typ: "", batch: "", monat: "",
      rate: "", portal: "", datumPortal: "", email: "", datumEmail: "",
      docs: "", reminder: "", datumReminder: "", tel: "", status: "Offen", bemerkung: ""
    }));
    setRows([...rows, ...newRows]);
  };

  const exportCSV = () => {
    const csvHeaders = headers.join(";");
    const csvRows = rows.map(r =>
      [r.nr, r.az, r.name, r.typ, r.batch, r.monat, r.rate, r.portal, r.datumPortal, r.email, r.datumEmail, r.docs, r.reminder, r.datumReminder, r.tel, r.status, r.bemerkung].join(";")
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

  const counts = {
    total: rows.filter(r => r.az).length,
    angelegt: rows.filter(r => r.portal === "Ja").length,
    emailRaus: rows.filter(r => r.email === "Ja").length,
    docsDA: rows.filter(r => r.docs === "Ja").length,
    done: rows.filter(r => r.status === "Abgeschlossen").length
  };

  const sel = "bg-white border border-gray-300 rounded px-1 py-0.5 text-xs w-full";
  const inp = "border border-gray-300 rounded px-1 py-0.5 text-xs w-full";

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Portal-Migration Tracking</h1>
        <div className="flex gap-2">
          <button onClick={addRows} className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700">+ 10 Zeilen</button>
          <button onClick={exportCSV} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">CSV Export</button>
        </div>
      </div>
      <div className="flex gap-4 mb-4 text-sm">
        <div className="bg-white rounded p-3 shadow-sm"><span className="text-gray-500">Erfasst:</span> <strong>{counts.total}</strong></div>
        <div className="bg-white rounded p-3 shadow-sm"><span className="text-gray-500">Portal angelegt:</span> <strong className="text-blue-600">{counts.angelegt}</strong></div>
        <div className="bg-white rounded p-3 shadow-sm"><span className="text-gray-500">E-Mail raus:</span> <strong className="text-yellow-600">{counts.emailRaus}</strong></div>
        <div className="bg-white rounded p-3 shadow-sm"><span className="text-gray-500">Docs hochgeladen:</span> <strong className="text-green-600">{counts.docsDA}</strong></div>
        <div className="bg-white rounded p-3 shadow-sm"><span className="text-gray-500">Abgeschlossen:</span> <strong className="text-emerald-700">{counts.done}</strong></div>
      </div>
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white">
              {headers.map((h, i) => (
                <th key={i} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b ${r.status === "Abgeschlossen" ? "bg-green-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <td className="px-2 py-1 text-gray-400">{r.nr}</td>
                <td className="px-1 py-1"><input className={inp} value={r.az} onChange={e => update(i, "az", e.target.value)} /></td>
                <td className="px-1 py-1"><input className={inp} value={r.name} onChange={e => update(i, "name", e.target.value)} style={{minWidth: "120px"}} /></td>
                <td className="px-1 py-1"><select className={sel} value={r.typ} onChange={e => update(i, "typ", e.target.value)}><option value="">-</option>{typOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                <td className="px-1 py-1"><select className={sel} value={r.batch} onChange={e => update(i, "batch", e.target.value)}><option value="">-</option>{batchOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                <td className="px-1 py-1"><select className={sel} value={r.monat} onChange={e => update(i, "monat", e.target.value)}><option value="">-</option>{monatOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                <td className="px-1 py-1"><select className={sel} value={r.rate} onChange={e => update(i, "rate", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                <td className="px-1 py-1"><select className={sel} value={r.portal} onChange={e => update(i, "portal", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                <td className="px-1 py-1"><input type="date" className={inp} value={r.datumPortal} onChange={e => update(i, "datumPortal", e.target.value)} /></td>
                <td className="px-1 py-1"><select className={sel} value={r.email} onChange={e => update(i, "email", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                <td className="px-1 py-1"><input type="date" className={inp} value={r.datumEmail} onChange={e => update(i, "datumEmail", e.target.value)} /></td>
                <td className="px-1 py-1"><select className={sel} value={r.docs} onChange={e => update(i, "docs", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                <td className="px-1 py-1"><select className={sel} value={r.reminder} onChange={e => update(i, "reminder", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                <td className="px-1 py-1"><input type="date" className={inp} value={r.datumReminder} onChange={e => update(i, "datumReminder", e.target.value)} /></td>
                <td className="px-1 py-1"><select className={sel} value={r.tel} onChange={e => update(i, "tel", e.target.value)}><option value="">-</option>{jaOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                <td className="px-1 py-1"><select className={sel} value={r.status} onChange={e => update(i, "status", e.target.value)}>{statusOptions.map(o => <option key={o}>{o}</option>)}</select></td>
                <td className="px-1 py-1"><input className={inp} value={r.bemerkung} onChange={e => update(i, "bemerkung", e.target.value)} style={{minWidth: "120px"}} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
