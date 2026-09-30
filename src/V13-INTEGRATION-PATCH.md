# Jabari Agent V13 — Outreach Center integration

1. Add this type near the other frontend types:

type OutreachDraft = {
  id:string;
  lead_id:string;
  subject:string;
  body_text:string;
  status:string;
  sent_at?:number;
  created_at:number;
  updated_at:number;
  lead_name?:string;
  lead_email?:string;
  lead_company?:string;
  event_count?:number;
  last_event_type?:string;
  last_event_at?:number;
};

2. Add "Outreach" to the sections array.

3. Add state:
const [outreach,setOutreach] = useState<OutreachDraft[]>([]);

4. In loadAll(), fetch:
getJson<{data:OutreachDraft[]}>("/api/outreach")

and add the result as outreachRows in the Promise.all destructuring.

5. After products are loaded:
setOutreach(outreachRows.data ?? []);

6. Add:
const filteredOutreach = useMemo(
  () => filterRows(
    outreach,
    search,
    ["subject","body_text","status","lead_name","lead_email","lead_company","last_event_type"]
  ),
  [outreach,search]
);

7. Add this view route beside the other active routes:
{active === "Outreach" && (
  <OutreachView
    rows={filteredOutreach}
    search={search}
    setSearch={setSearch}
    leads={leads}
    onSaved={loadAll}
  />
)}

8. Paste OutreachView.tsx contents into App.tsx before RecordDrawer.
The component expects the existing Workspace, Badge, Empty, formatDate and formatDateTime helpers.

9. Append the CSS from the included stylesheet snippet:
.outreach-layout{display:grid;grid-template-columns:minmax(300px,1fr) minmax(360px,1.2fr);gap:16px;min-height:560px}
.outreach-list,.outreach-editor{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:18px;overflow:hidden}
.outreach-row{width:100%;display:grid;grid-template-columns:1fr auto auto;gap:12px;text-align:left;padding:15px 16px;border:0;border-bottom:1px solid var(--border,#e5e7eb);background:transparent;cursor:pointer;color:inherit}
.outreach-row.active{background:rgba(220,38,38,.06)}
.outreach-row strong,.outreach-row small{display:block}
.outreach-row small{margin-top:5px;opacity:.68}
.outreach-date{font-size:12px;opacity:.58;white-space:nowrap}
.outreach-editor{padding:20px}
.outreach-editor-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.outreach-editor h3{margin:0}
.outreach-body{min-height:230px;resize:vertical}
.outreach-actions{display:flex;gap:10px;margin-top:14px}
.outreach-note{font-size:12px;line-height:1.5;opacity:.65;margin-top:12px}
.outreach-history{border-top:1px solid var(--border,#e5e7eb);margin-top:22px;padding-top:18px}
.outreach-history h4{margin:0 0 10px}
.outreach-event{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border,#e5e7eb);font-size:13px}
@media(max-width:900px){.outreach-layout{grid-template-columns:1fr}.outreach-editor{min-height:500px}}

No database migration is required. The existing outreach_drafts and outreach_events tables are used.
