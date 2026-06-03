// Reports page — visual analytics (status/type/inspection charts + compliance
// table) and export buttons. Exports are fetched with the JWT then downloaded as
// a CSV blob or opened as a print-ready PDF page.
import { useEffect, useState } from 'react';
import { FileText, FileSpreadsheet, Download, BarChart3 } from 'lucide-react';
import { api } from '../api/client';
import { Donut, BarList } from '../components/Charts';
import { fmtDate, statusTone } from '../lib/ui';

const DATASETS = [
  { key: 'extinguishers', label: 'Inventory' },
  { key: 'inspections', label: 'Inspections' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'maintenance', label: 'Maintenance' },
];

export default function Reports() {
  const [summary, setSummary] = useState({});
  const [compliance, setCompliance] = useState({});
  const [inspections, setInspections] = useState({});

  useEffect(() => {
    api.get('/reports/summary').then(setSummary).catch(() => {});
    api.get('/reports/compliance').then(setCompliance).catch(() => {});
    api.get('/reports/inspections').then(setInspections).catch(() => {});
  }, []);

  // CSV download. A plain <a href> can't send the JWT header, so we fetch the file
  // with the token, wrap the response in a Blob, and trigger a download via a temp link.
  const download = async (path, filename) => {
    const res = await fetch(api.downloadUrl(path), { headers: { Authorization: `Bearer ${api.token()}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url); // free the temporary object URL
  };

  // PDF "export" returns print-ready HTML; we open it in a new tab where the user
  // can hit "Save as PDF" (uses the browser's native print-to-PDF).
  const openPdf = async (dataset) => {
    const res = await fetch(api.downloadUrl(`/reports/export/${dataset}.pdf`), { headers: { Authorization: `Bearer ${api.token()}` } });
    const html = await res.text();
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Reports & Analytics</h1>
        <p className="text-slate-500">Real-time inventory, inspection, compliance and maintenance reporting.</p>
      </div>

      {/* Export panel */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2"><Download size={18} className="text-ember-500" /><h3 className="font-display font-semibold">Export reports</h3></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DATASETS.map((d) => (
            <div key={d.key} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <p className="mb-3 font-semibold">{d.label}</p>
              <div className="flex gap-2">
                <button className="btn btn-ghost flex-1 py-2 text-xs" onClick={() => download(`/reports/export/${d.key}.csv`, `${d.key}.csv`)}>
                  <FileSpreadsheet size={14} /> CSV
                </button>
                <button className="btn btn-ghost flex-1 py-2 text-xs" onClick={() => openPdf(d.key)}>
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card"><h3 className="mb-4 font-display font-semibold">Inventory by status</h3><Donut data={summary.byStatus} /></div>
        <div className="card"><h3 className="mb-4 font-display font-semibold">Inventory by type</h3><BarList data={summary.byType} /></div>
        <div className="card"><h3 className="mb-4 font-display font-semibold">Inspection status</h3><BarList data={inspections.summary} /></div>
      </div>

      {/* Compliance table */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-ember-500" /><h3 className="font-display font-semibold">Compliance details</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
              <tr><th className="p-3">Serial</th><th className="p-3">Location</th><th className="p-3">Type</th><th className="p-3">Expiry</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {(compliance.all || []).map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                  <td className="p-3 font-semibold">{c.serial_number}</td>
                  <td className="p-3 text-slate-500">{c.location}</td>
                  <td className="p-3 text-slate-500">{c.type}</td>
                  <td className="p-3 text-slate-500">{fmtDate(c.expiry_date)}</td>
                  <td className="p-3"><span className={`badge ${statusTone[c.compliance_status]}`}>{c.compliance_status}</span></td>
                </tr>
              ))}
              {!(compliance.all || []).length && <tr><td colSpan={5} className="p-6 text-center text-slate-400">No data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
