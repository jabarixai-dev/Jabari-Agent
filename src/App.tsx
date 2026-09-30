import { useEffect, useMemo, useState, type ReactNode } from "react";

const sections = ["Command Center", "Contacts", "Leads", "Companies", "Opportunities", "Tasks", "Campaigns", "Workflows", "Appointments", "Invoices", "Inbox"];

type Contact = { id:string; name:string; email:string; company:string; phone?:string; source:string; job_title?:string; website?:string; notes?:string; company_id?:string; created_at:number };
type Company = { id:string; name:string; website?:string; industry?:string; notes?:string; created_at:number };
type Lead = { id:string; thread_id:string; name:string; email:string; company:string; request:string; budget:string; timeline:string; status:string; created_at:number };
type Opportunity = { id:string; lead_id:string; contact_id?:string; company_id?:string; name:string; stage:string; value:number; probability:number; expected_close_at?:number; owner:string; notes:string; company_name?:string; lead_name?:string; created_at:number };
type Dashboard = {
  metrics:{contacts:number;openLeads:number;openOpportunities:number;tasksDue:number};
  recentContacts:Array<{id:string;first_name:string;last_name?:string;email?:string;job_title?:string}>;
  recentLeads:Array<{id:string;title:string;stage:string;status:string;score:number;estimated_value?:number}>;
  recentOpportunities:Array<{id:string;name:string;stage:string;status:string;value:number;probability:number}>;
  activity:Array<{id:string;type:string;title:string;description?:string;occurred_at:string}>;
};

const emptyDashboard:Dashboard = {metrics:{contacts:0,openLeads:0,openOpportunities:0,tasksDue:0},recentContacts:[],recentLeads:[],recentOpportunities:[],activity:[]};

export default function App() {
  const [active,setActive] = useState("Command Center");
  const [data,setData] = useState<Dashboard>(emptyDashboard);
  const [contacts,setContacts] = useState<Contact[]>([]);
  const [companies,setCompanies] = useState<Company[]>([]);
  const [leads,setLeads] = useState<Lead[]>([]);
  const [opportunities,setOpportunities] = useState<Opportunity[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  const [modal,setModal] = useState<"contact"|"company"|"lead"|"opportunity"|null>(null);

  const loadAll = async () => {
    setLoading(true); setError("");
    try {
      const [dashboard,contactRows,companyRows,leadRows,opportunityRows] = await Promise.all([
        getJson<Dashboard>("/api/dashboard"),
        getJson<{data:Contact[]}>("/api/contacts"),
        getJson<{data:Company[]}>("/api/companies"),
        getJson<{data:Lead[]}>("/api/leads"),
        getJson<{data:Opportunity[]}>("/api/opportunities")
      ]);
      setData(dashboard); setContacts(contactRows.data ?? []); setCompanies(companyRows.data ?? []);
      setLeads(leadRows.data ?? []); setOpportunities(opportunityRows.data ?? []);
    } catch(e) {
      setError(e instanceof Error ? e.message : "Unable to load CRM");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const filteredContacts = useMemo(() => filterRows(contacts, search, ["name","email","company","job_title"]), [contacts,search]);
  const filteredCompanies = useMemo(() => filterRows(companies, search, ["name","industry","website"]), [companies,search]);
  const filteredLeads = useMemo(() => filterRows(leads, search, ["name","email","company","status","request"]), [leads,search]);
  const filteredOpportunities = useMemo(() => filterRows(opportunities, search, ["name","stage","owner","company_name","lead_name"]), [opportunities,search]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">J</div><div><strong>Jabari</strong><span>Agent</span></div></div>
      <div className="workspace-label">CRM WORKSPACE</div>
      <nav>{sections.map(s => <button key={s} className={active===s ? "nav-item active" : "nav-item"} onClick={()=>{setActive(s);setSearch("");}}><span>{navIcon(s)}</span>{s}</button>)}</nav>
      <div className="sidebar-footer"><span className="status-dot"/> Database connected</div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><p className="eyebrow">JABARI AGENT / CRM</p><h1>{active}</h1></div>
        <div className="top-actions"><div className="status"><span className="status-dot"/>{loading ? "Syncing CRM…" : "Live CRM"}</div><button className="refresh-btn" onClick={loadAll}>↻ Refresh</button></div>
      </header>

      {error && <div className="error-card">{error}<button onClick={loadAll}>Retry</button></div>}

      {active === "Command Center" && <DashboardView data={data} loading={loading} onNavigate={setActive}/>}
      {active === "Contacts" && <ContactsView rows={filteredContacts} search={search} setSearch={setSearch} onAdd={()=>setModal("contact")} />}
      {active === "Companies" && <CompaniesView rows={filteredCompanies} search={search} setSearch={setSearch} onAdd={()=>setModal("company")} />}
      {active === "Leads" && <LeadsView rows={filteredLeads} search={search} setSearch={setSearch} onAdd={()=>setModal("lead")} />}
      {active === "Opportunities" && <OpportunitiesView rows={filteredOpportunities} search={search} setSearch={setSearch} onAdd={()=>setModal("opportunity")} />}
      {["Tasks","Campaigns","Workflows","Appointments","Invoices","Inbox"].includes(active) &&
        <section className="coming-card"><div className="coming-icon">✦</div><p className="eyebrow">{active.toUpperCase()}</p><h2>{active} workspace</h2><p>The CRM foundation is ready. This module will plug into the unified workspace instead of becoming a separate disconnected screen.</p><div className="coming-meta">Connected to Neon · Netlify Functions · Jabari CRM</div></section>}

      {modal === "company" && <CompanyForm onClose={()=>setModal(null)} onSaved={loadAll}/>}
      {modal === "contact" && <ContactForm companies={companies} onClose={()=>setModal(null)} onSaved={loadAll}/>}
      {modal === "lead" && <LeadForm onClose={()=>setModal(null)} onSaved={loadAll}/>}
      {modal === "opportunity" && <OpportunityForm leads={leads} contacts={contacts} companies={companies} onClose={()=>setModal(null)} onSaved={loadAll}/>}
    </main>
  </div>;
}

async function getJson<T>(url:string):Promise<T> {
  const r = await fetch(url);
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || `Request failed: ${url}`);
  return body;
}

function filterRows<T extends Record<string,unknown>>(rows:T[], query:string, fields:string[]) {
  if (!query.trim()) return rows;
  const q=query.toLowerCase();
  return rows.filter(row => fields.some(field => String(row[field] ?? "").toLowerCase().includes(q)));
}

function DashboardView({data,loading,onNavigate}:{data:Dashboard;loading:boolean;onNavigate:(s:string)=>void}) {
  const cards=[["Contacts",data.metrics.contacts,"Contacts"],["Open Leads",data.metrics.openLeads,"Leads"],["Opportunities",data.metrics.openOpportunities,"Opportunities"],["Tasks Due",data.metrics.tasksDue,"Tasks"]];
  return <div>
    <section className="hero-card">
      <div><p className="eyebrow">COMMAND CENTER</p><h2>One workspace for your entire customer pipeline.</h2><p>Monitor contacts, qualify leads, track opportunities and keep every customer action moving from one place.</p></div>
      <div className="hero-actions"><button className="primary-btn" onClick={()=>onNavigate("Contacts")}>Open CRM</button><button className="ghost-btn" onClick={()=>onNavigate("Leads")}>View leads</button></div>
    </section>
    <section className="stats">{cards.map(([label,value,target])=><button className="stat-card" key={String(label)} onClick={()=>onNavigate(String(target))}><span>{label}</span><strong>{loading ? "—" : String(value)}</strong><small>View workspace →</small></button>)}</section>
    <section className="dashboard-grid">
      <Panel title="Recent Contacts" action="Contacts" onAction={()=>onNavigate("Contacts")}>{data.recentContacts.length ? data.recentContacts.map(c=><Row key={c.id} title={`${c.first_name} ${c.last_name ?? ""}`.trim()} meta={c.job_title || c.email || "No details"}/>) : <Empty text="No contacts yet."/>}</Panel>
      <Panel title="Open Leads" action="Leads" onAction={()=>onNavigate("Leads")}>{data.recentLeads.length ? data.recentLeads.map(l=><Row key={l.id} title={l.title} meta={`${l.status} · ${l.stage || "New"}`}/>) : <Empty text="No leads yet."/>}</Panel>
      <Panel title="Opportunities" action="Opportunities" onAction={()=>onNavigate("Opportunities")}>{data.recentOpportunities.length ? data.recentOpportunities.map(o=><Row key={o.id} title={o.name} meta={`${o.stage} · ${formatMoney(o.value)} · ${o.probability}%`}/>) : <Empty text="No opportunities yet."/>}</Panel>
      <Panel title="Recent Activity" action="View all" onAction={()=>onNavigate("Inbox")}>{data.activity.length ? data.activity.map(a=><Row key={a.id} title={a.title} meta={new Date(a.occurred_at).toLocaleString()}/>) : <Empty text="Activity will appear here as CRM actions happen."/>}</Panel>
    </section>
  </div>;
}

function ContactsView({rows,search,setSearch,onAdd}:{rows:Contact[];search:string;setSearch:(v:string)=>void;onAdd:()=>void}) {
  return <Workspace title="Contacts" subtitle="Every person in your CRM, connected to their company and lead history." search={search} setSearch={setSearch} addLabel="Add contact" onAdd={onAdd} count={rows.length}>
    <Table headers={["Contact","Company","Source","Role","Added"]}>{rows.map(c=><tr key={c.id}><td><strong>{c.name}</strong><small>{c.email}</small></td><td>{c.company}</td><td><Badge text={c.source}/></td><td>{c.job_title || "—"}</td><td>{formatDate(c.created_at)}</td></tr>)}</Table>
    {!rows.length && <Empty text="No contacts match your search."/>}
  </Workspace>;
}
function CompaniesView({rows,search,setSearch,onAdd}:{rows:Company[];search:string;setSearch:(v:string)=>void;onAdd:()=>void}) {
  return <Workspace title="Companies" subtitle="Accounts and organizations your team is prospecting, selling to, or serving." search={search} setSearch={setSearch} addLabel="Add company" onAdd={onAdd} count={rows.length}>
    <Table headers={["Company","Industry","Website","Added"]}>{rows.map(c=><tr key={c.id}><td><strong>{c.name}</strong><small>{c.notes || "No notes"}</small></td><td>{c.industry || "—"}</td><td>{c.website || "—"}</td><td>{formatDate(c.created_at)}</td></tr>)}</Table>
    {!rows.length && <Empty text="No companies match your search."/>}
  </Workspace>;
}
function LeadsView({rows,search,setSearch,onAdd}:{rows:Lead[];search:string;setSearch:(v:string)=>void;onAdd:()=>void}) {
  return <Workspace title="Leads" subtitle="Qualify inbound prospects and move them through the CRM lifecycle." search={search} setSearch={setSearch} addLabel="Add lead" onAdd={onAdd} count={rows.length}>
    <Table headers={["Lead","Company","Status","Request","Budget","Timeline"]}>{rows.map(l=><tr key={l.id}><td><strong>{l.name}</strong><small>{l.email}</small></td><td>{l.company}</td><td><Badge text={l.status}/></td><td className="truncate">{l.request}</td><td>{l.budget}</td><td>{l.timeline}</td></tr>)}</Table>
    {!rows.length && <Empty text="No leads match your search."/>}
  </Workspace>;
}
function OpportunitiesView({rows,search,setSearch,onAdd}:{rows:Opportunity[];search:string;setSearch:(v:string)=>void;onAdd:()=>void}) {
  return <Workspace title="Opportunities" subtitle="Track qualified deals, value, probability and expected close dates." search={search} setSearch={setSearch} addLabel="Add opportunity" onAdd={onAdd} count={rows.length}>
    <Table headers={["Opportunity","Company","Stage","Value","Probability","Owner"]}>{rows.map(o=><tr key={o.id}><td><strong>{o.name}</strong><small>{o.lead_name || "Linked lead"}</small></td><td>{o.company_name || "—"}</td><td><Badge text={o.stage}/></td><td>{formatMoney(o.value)}</td><td>{o.probability}%</td><td>{o.owner}</td></tr>)}</Table>
    {!rows.length && <Empty text="No opportunities match your search."/>}
  </Workspace>;
}

function Workspace({title,subtitle,search,setSearch,addLabel,onAdd,count,children}:{title:string;subtitle:string;search:string;setSearch:(v:string)=>void;addLabel:string;onAdd:()=>void;count:number;children:ReactNode}) {
  return <section className="workspace">
    <div className="workspace-head"><div><p className="eyebrow">CRM / {title.toUpperCase()}</p><h2>{title}</h2><p>{subtitle}</p></div><button className="primary-btn" onClick={onAdd}>+ {addLabel}</button></div>
    <div className="toolbar"><div className="search-box">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`}/></div><span className="result-count">{count} records</span></div>
    <div className="table-card">{children}</div>
  </section>;
}
function Table({headers,children}:{headers:string[];children:ReactNode}) {
  return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
function Panel({title,action,onAction,children}:{title:string;action:string;onAction:()=>void;children:ReactNode}) {
  return <section className="panel"><div className="panel-head"><h3>{title}</h3><button onClick={onAction}>{action} →</button></div>{children}</section>;
}
function Row({title,meta}:{title:string;meta:string}) { return <div className="crm-row"><div><strong>{title}</strong><small>{meta}</small></div></div>; }
function Empty({text}:{text:string}) { return <div className="empty">{text}</div>; }
function Badge({text}:{text:string}) { return <span className="badge">{text || "—"}</span>; }
function formatMoney(value:number) { return new Intl.NumberFormat(undefined,{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(value || 0); }
function formatDate(value:number) { return value ? new Date(value).toLocaleDateString() : "—"; }
function navIcon(s:string) { const icons:Record<string,string>={ "Command Center":"⌂",Contacts:"◎",Leads:"◈",Companies:"▦",Opportunities:"◇",Tasks:"✓",Campaigns:"◉",Workflows:"⌘",Appointments:"◷",Invoices:"▤",Inbox:"✉" }; return icons[s] || "•"; }

function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-head"><div><p className="eyebrow">JABARI CRM</p><h3>{title}</h3></div><button className="close-btn" onClick={onClose}>×</button></div>{children}</div></div>;
}
function Field({label,name,value,onChange,placeholder,required=true,type="text"}:{label:string;name:string;value:string;onChange:(v:string)=>void;placeholder?:string;required?:boolean;type?:string}) {
  return <label className="field"><span>{label}{required && " *"}</span><input name={name} type={type} required={required} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>;
}
function Textarea({label,value,onChange,required=true}:{label:string;value:string;onChange:(v:string)=>void;required?:boolean}) {
  return <label className="field"><span>{label}{required && " *"}</span><textarea value={value} onChange={e=>onChange(e.target.value)} required={required}/></label>;
}
function FormActions({onClose,saving}:{onClose:()=>void;saving:boolean}) { return <div className="form-actions"><button type="button" className="ghost-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? "Saving…" : "Create record"}</button></div>; }

function CompanyForm({onClose,onSaved}:{onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [name,setName]=useState(""); const [website,setWebsite]=useState(""); const [industry,setIndustry]=useState(""); const [notes,setNotes]=useState(""); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError("");try{const r=await fetch("/api/companies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,website,industry,notes})});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to create company");await onSaved();onClose();}catch(x){setError(x instanceof Error?x.message:"Unable to create company")}finally{setSaving(false)}};
  return <Modal title="Add company" onClose={onClose}><form onSubmit={submit}><div className="form-grid"><Field label="Company name" name="name" value={name} onChange={setName} placeholder="Acme Inc."/><Field label="Website" name="website" value={website} onChange={setWebsite} placeholder="https://example.com" required={false}/><Field label="Industry" name="industry" value={industry} onChange={setIndustry} placeholder="SaaS" required={false}/></div><Textarea label="Notes" value={notes} onChange={setNotes} required={false}/>{error&&<div className="form-error">{error}</div>}<FormActions onClose={onClose} saving={saving}/></form></Modal>;
}
function ContactForm({companies,onClose,onSaved}:{companies:Company[];onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [company,setCompany]=useState(""); const [companyId,setCompanyId]=useState(""); const [phone,setPhone]=useState(""); const [source,setSource]=useState("manual"); const [jobTitle,setJobTitle]=useState(""); const [website,setWebsite]=useState(""); const [notes,setNotes]=useState(""); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError("");try{const payload={name,email,company:companyId?"":company,company_id:companyId||undefined,phone,source,job_title:jobTitle,website,notes};const r=await fetch("/api/contacts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to create contact");await onSaved();onClose();}catch(x){setError(x instanceof Error?x.message:"Unable to create contact")}finally{setSaving(false)}};
  return <Modal title="Add contact" onClose={onClose}><form onSubmit={submit}><div className="form-grid"><Field label="Full name" name="name" value={name} onChange={setName} placeholder="Jane Doe"/><Field label="Email" name="email" value={email} onChange={setEmail} placeholder="jane@example.com" type="email"/><Field label="Phone" name="phone" value={phone} onChange={setPhone} placeholder="+234…" required={false}/><Field label="Job title" name="job_title" value={jobTitle} onChange={setJobTitle} placeholder="Marketing Lead" required={false}/></div><div className="form-grid"><label className="field"><span>Company</span><select value={companyId} onChange={e=>{setCompanyId(e.target.value);setCompany("")}}><option value="">Enter company manually</option>{companies.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>{!companyId&&<Field label="Company name" name="company" value={company} onChange={setCompany} placeholder="Company name"/>}<Field label="Source" name="source" value={source} onChange={setSource} placeholder="manual"/></div><Field label="Website" name="website" value={website} onChange={setWebsite} placeholder="https://…" required={false}/><Textarea label="Notes" value={notes} onChange={setNotes} required={false}/>{error&&<div className="form-error">{error}</div>}<FormActions onClose={onClose} saving={saving}/></form></Modal>;
}
function LeadForm({onClose,onSaved}:{onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [threadId,setThreadId]=useState(""); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [company,setCompany]=useState(""); const [request,setRequest]=useState(""); const [budget,setBudget]=useState(""); const [timeline,setTimeline]=useState(""); const [status,setStatus]=useState("new"); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError("");try{const r=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({thread_id:threadId,name,email,company,request,budget,timeline,status})});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to create lead");await onSaved();onClose();}catch(x){setError(x instanceof Error?x.message:"Unable to create lead")}finally{setSaving(false)}};
  return <Modal title="Add lead" onClose={onClose}><form onSubmit={submit}><div className="info-note">Leads are linked to a chat thread in the current CRM schema, so a valid existing thread ID is required.</div><div className="form-grid"><Field label="Thread ID" name="thread_id" value={threadId} onChange={setThreadId} placeholder="Existing chat thread ID"/><Field label="Name" name="name" value={name} onChange={setName} placeholder="Jane Doe"/><Field label="Email" name="email" value={email} onChange={setEmail} placeholder="jane@example.com" type="email"/><Field label="Company" name="company" value={company} onChange={setCompany} placeholder="Acme Inc."/></div><Textarea label="Request" value={request} onChange={setRequest}/><div className="form-grid"><Field label="Budget" name="budget" value={budget} onChange={setBudget} placeholder="$5,000"/><Field label="Timeline" name="timeline" value={timeline} onChange={setTimeline} placeholder="This month"/><label className="field"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}>{["new","contacted","qualified","won","lost"].map(s=><option key={s}>{s}</option>)}</select></label></div>{error&&<div className="form-error">{error}</div>}<FormActions onClose={onClose} saving={saving}/></form></Modal>;
}
function OpportunityForm({leads,contacts,companies,onClose,onSaved}:{leads:Lead[];contacts:Contact[];companies:Company[];onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [leadId,setLeadId]=useState(""); const [contactId,setContactId]=useState(""); const [companyId,setCompanyId]=useState(""); const [name,setName]=useState(""); const [stage,setStage]=useState("qualified"); const [value,setValue]=useState("0"); const [probability,setProbability]=useState("0"); const [owner,setOwner]=useState("unassigned"); const [notes,setNotes]=useState(""); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError("");try{const r=await fetch("/api/opportunities",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lead_id:leadId,contact_id:contactId||undefined,company_id:companyId||undefined,name,stage,value:Number(value)||0,probability:Number(probability)||0,owner,notes})});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to create opportunity");await onSaved();onClose();}catch(x){setError(x instanceof Error?x.message:"Unable to create opportunity")}finally{setSaving(false)}};
  return <Modal title="Add opportunity" onClose={onClose}><form onSubmit={submit}><div className="form-grid"><label className="field"><span>Lead *</span><select required value={leadId} onChange={e=>setLeadId(e.target.value)}><option value="">Select lead</option>{leads.map(l=><option value={l.id} key={l.id}>{l.name} · {l.company}</option>)}</select></label><label className="field"><span>Contact</span><select value={contactId} onChange={e=>setContactId(e.target.value)}><option value="">None</option>{contacts.map(c=><option value={c.id} key={c.id}>{c.name} · {c.company}</option>)}</select></label><label className="field"><span>Company</span><select value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="">None</option>{companies.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><Field label="Opportunity name" name="name" value={name} onChange={setName} placeholder="Website redesign"/></div><div className="form-grid"><label className="field"><span>Stage</span><select value={stage} onChange={e=>setStage(e.target.value)}>{["qualified","proposal","negotiation","closed_won","closed_lost"].map(s=><option key={s}>{s}</option>)}</select></label><Field label="Value (NGN)" name="value" value={value} onChange={setValue} placeholder="0" type="number"/><Field label="Probability %" name="probability" value={probability} onChange={setProbability} placeholder="0" type="number"/><Field label="Owner" name="owner" value={owner} onChange={setOwner} placeholder="unassigned"/></div><Textarea label="Notes" value={notes} onChange={setNotes} required={false}/>{error&&<div className="form-error">{error}</div>}<FormActions onClose={onClose} saving={saving}/></form></Modal>;
}
