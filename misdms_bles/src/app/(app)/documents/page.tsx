"use client";

import { useEffect, useState } from "react";
import { Search, FolderArchive, Upload, FileText, Filter, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  referenceNumber: string | null;
  sender: string | null;
  isConfidential: boolean;
  uploadedBy: { name: string } | null;
  createdAt: string;
}

interface DocForm {
  title: string;
  description: string;
  category: string;
  referenceNumber: string;
  sender: string;
  recipient: string;
  isConfidential: boolean;
}

const emptyDocForm: DocForm = {
  title: "", description: "", category: "ADMINISTRATIVE_ISSUANCE", referenceNumber: "", sender: "", recipient: "", isConfidential: false,
};

export default function DocumentsPage() {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DocForm>(emptyDocForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadDocuments = () => {
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data) => setDocuments(data))
      .catch(() => showToast("error", "Failed to load documents"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDocuments(); }, []);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.category) e.category = "Category is required";
    setErrors(e);
    if (Object.keys(e).length) { showToast("error", "Please fix the form errors"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload");
      showToast("success", "Document uploaded successfully");
      setShowModal(false); setForm(emptyDocForm); loadDocuments();
    } catch (err: any) {
      showToast("error", err.message || "Failed to upload document");
    } finally { setSaving(false); }
  };

  const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const errCls = "mt-1 text-xs text-red-600";

  const filtered = documents.filter((d) => {
    const matchesSearch = `${d.title} ${d.referenceNumber || ""} ${d.sender || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryLabels: Record<string, string> = {
    ADMINISTRATIVE_ISSUANCE: "Administrative Issuance",
    DEPED_ORDER: "DepEd Order",
    DEPED_MEMORANDUM: "DepEd Memorandum",
    STUDENT_RECORD: "Student Record",
    FINANCIAL_MOOE: "Financial / MOOE",
    PROCUREMENT: "Procurement",
    INVENTORY: "Inventory",
    LESSON_PLAN: "Lesson Plan",
    SCHOOL_FORM: "School Form",
    CORRESPONDENCE: "Correspondence",
    MISCELLANEOUS: "Miscellaneous",
  };

  const statusColors: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    PENDING_REVIEW: "bg-amber-100 text-amber-700",
    APPROVED: "bg-green-100 text-green-700",
    ARCHIVED: "bg-blue-100 text-blue-700",
    RELEASED: "bg-purple-100 text-purple-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Archive</h1>
          <p className="mt-1 text-sm text-slate-500">Manage administrative and school documents</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">
          <Upload className="h-4 w-4" /> Upload Document
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="ALL">All Categories</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FolderArchive className="h-4 w-4 text-blue-600" />
            Document List
          </div>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {filtered.length} documents
          </span>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Ref #</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Uploaded By</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">{d.title}</p>
                          {d.isConfidential && (
                            <span className="mt-0.5 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">CONFIDENTIAL</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {categoryLabels[d.category] || d.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.referenceNumber || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[d.status] || "bg-slate-100 text-slate-600"}`}>
                        {d.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.uploadedBy?.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(d.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Upload Document</h2>
              <button onClick={() => setShowModal(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. DepEd Order No. 12, s. 2025" className={inputCls} />
                {errors.title && <p className={errCls}>{errors.title}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Brief description of the document" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                    {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  {errors.category && <p className={errCls}>{errors.category}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Reference Number</label>
                  <input type="text" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="e.g. DO-12-s2025" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Sender</label>
                  <input type="text" value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })} placeholder="e.g. DepEd Central Office" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Recipient</label>
                  <input type="text" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="e.g. School Head" className={inputCls} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.isConfidential} onChange={(e) => setForm({ ...form, isConfidential: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                Mark as Confidential (e.g. 201 Files, PDS)
              </label>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {saving ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
