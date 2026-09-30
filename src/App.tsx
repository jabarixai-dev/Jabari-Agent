import { useEffect, useMemo, useState, type ReactNode } from "react";

const sections = ["Command Center", "Prospects", "Contacts", "Leads", "Companies", "Opportunities", "Pipeline", "Activity", "Appointments", "Tasks", "Campaigns", "Workflows", "Invoices", "Inbox"];

type Contact = { id:string; name:string; email:string; company:string; phone?:string; source:string; job_title?:string; website?:string; notes?:string; company_id?:string; created_at:number };
type Company = { id:string; name:string; website?:string; industry?:string; notes?:string; created_at:number };
type Lead = { id:string; thread_id:string; name:string; email:string; company:string; request:string; budget:string; timeline:string; status:string; created_at:number };
type Opportunity = { id:string; lead_id:string; contact_id?:string; company_id?:string; name:string; stage:string; value:number; probability:number; expected_close_at?:number; owner:string; notes:string; company_name?:string; lead_name?:string; created_at:number };
type Prospect = { id:string; name:string; url:string; snippet:string; source:string; status:string; target_service:string; target_niche:string; target_location:string; qualification_status:string; qualification_reason:string; website_status:string; contact_name?:string; contact_email?:string; contact_phone?:string; fit_reason?:string; pain_point?:string; outreach_subject?:string; analysis_status:string; contact_status:string; contact_source?:string; website_found?:boolean; created_at:number; updated_at:number };
type Activity = { id:string; contact_id?:string; lead_id?:string; type:string; title:string; detail:string; created_at:number; contact_name?:string; lead_name?:string };
type Appointment = { id:string; contact_id?:string; lead_id?:string; title:string; description:string; start_at:number; end_at:number; status:string; location:string; meeting_url?:string; contact_name?:string; lead_name?:string; created_at:number };

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
  const [prospects,setProspects] = useState<Prospect[]>([]);
  const [activities,setActivities] = useState<Activity[]>([]);
  const [appointments,setAppointments] = useState<Appointment[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  const [modal,setModal] = useState<"contact"|"company"|"lead"|"opportunity"|null>(null);
  const [selectedRecord,setSelectedRecord] = useState<{kind:string;id:string}|null>(null);

  const loadAll = async () => {
    setLoading(true); setError("");
    try {
      const [dashboard,contactRows,companyRows,leadRows,opportunityRows,prospectRows,activityRows,appointmentRows] = await Promise.all([
        getJson<Dashboard>("/api/dashboard"),
        getJson<{data:Contact[]}>("/api/contacts"),
        getJson<{data:Company[]}>("/api/companies"),
        getJson<{data:Lead[]}>("/api/leads"),
        getJson<{data:Opportunity[]}>("/api/opportunities"),
        getJson<{data:Prospect[]}>("/api/prospects"),
        getJson<{data:Activity[]}>("/api/activities"),
        getJson<{data:Appointment[]}>("/api/appointments")
      ]);
      setData(dashboard); setContacts(contactRows.data ?? []); setCompanies(companyRows.data ?? []);
      setLeads(leadRows.data ?? []); setOpportunities(opportunityRows.data ?? []);
      setProspects(prospectRows.data ?? []); setActivities(activityRows.data ?? []);
      setAppointments(appointmentRows.data ?? []);
    } catch(e) {
      setError(e instanceof Error ? e.message : "Unable to load CRM");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const filteredContacts = useMemo(() => filterRows(contacts, search, ["name","email","company","job_title"]), [contacts,search]);
  const filteredCompanies = useMemo(() => filterRows(companies, search, ["name","industry","website"]), [companies,search]);
  const filteredLeads = useMemo(() => filterRows(leads, search, ["name","email","company","status","request"]), [leads,search]);
  const filteredOpportunities = useMemo(() => filterRows(opportunities, search, ["name","stage","owner","company_name","lead_name"]), [opportunities,search]);
  const filteredProspects = useMemo(() => filterRows(prospects, search, ["name","source","status","qualification_status","contact_name","contact_email","target_niche","target_location"]), [prospects,search]);
  const filteredActivities = useMemo(() => filterRows(activities, search, ["type","title","detail","contact_name","lead_name"]), [activities,search]);
  const filteredAppointments = useMemo(() => filterRows(appointments, search, ["title","status","location","contact_name","lead_name"]), [appointments,search]);

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
      {active === "Prospects" && <ProspectsView rows={filteredProspects} search={search} setSearch={setSearch} onConverted={loadAll}/>}
      {active === "Contacts" && <ContactsView rows={filteredContacts} search={search} setSearch={setSearch} onAdd={()=>setModal("contact")} />}
      {active === "Companies" && <CompaniesView rows={filteredCompanies} search={search} setSearch={setSearch} onAdd={()=>setModal("company")} />}
      {active === "Leads" && <LeadsView rows={filteredLeads} search={search} setSearch={setSearch} onAdd={()=>setModal("lead")} />}
      {active === "Opportunities" && <OpportunitiesView rows={filteredOpportunities} search={search} setSearch={setSearch} onAdd={()=>setModal("opportunity")} onOpen={(id)=>setSelectedRecord({kind:"opportunity",id})} />}
      {active === "Pipeline" && <PipelineView rows={opportunities} onOpen={(id)=>setSelectedRecord({kind:"opportunity",id})} onStageChanged={loadAll}/>}
      {active === "Activity" && <ActivityView rows={filteredActivities} search={search} setSearch={setSearch}/>}
      {active === "Appointments" && <AppointmentsView rows={filteredAppointments} search={search} setSearch={setSearch} contacts={contacts} leads={leads} onSaved={loadAll}/>}
      {["Tasks","Campaigns","Workflows","Invoices","Inbox"].includes(active) &&
        <section className="coming-card"><div className="coming-icon">✦</div><p className="eyebrow">{active.toUpperCase()}</p><h2>{active} workspace</h2><p>The CRM foundation is ready. This module will plug into the unified workspace instead of becoming a separate disconnected screen.</p><div className="coming-meta">Connected to Neon · Netlify Functions · Jabari CRM</div></section>}

      {modal === "company" && <CompanyForm onClose={()=>setModal(null)} onSaved={loadAll}/>}
      {modal === "contact" && <ContactForm companies={companies} onClose={()=>setModal(null)} onSaved={loadAll}/>}
      {modal === "lead" && <LeadForm onClose={()=>setModal(null)} onSaved={loadAll}/>}
      {modal === "opportunity" && <OpportunityForm leads={leads} contacts={contacts} companies={companies} onClose={()=>setModal(null)} onSaved={loadAll}/>}
      {selectedRecord && <RecordDrawer kind={selectedRecord.kind} id={selectedRecord.id} contacts={contacts} companies={companies} leads={leads} opportunities={opportunities} activities={activities} appointments={appointments} onClose={()=>setSelectedRecord(null)} onRefresh={loadAll}/>}
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
function OpportunitiesView({rows,search,setSearch,onAdd,onOpen}:{rows:Opportunity[];search:string;setSearch:(v:string)=>void;onAdd:()=>void;onOpen:(id:string)=>void}) {
  return <Workspace title="Opportunities" subtitle="Track qualified deals, value, probability and expected close dates." search={search} setSearch={setSearch} addLabel="Add opportunity" onAdd={onAdd} count={rows.length}>
    <Table headers={["Opportunity","Company","Stage","Value","Probability","Owner",""]}>{rows.map(o=><tr key={o.id}><td><button className="link-btn" onClick={()=>onOpen(o.id)}><strong>{o.name}</strong><small>{o.lead_name || "Linked lead"}</small></button></td><td>{o.company_name || "—"}</td><td><Badge text={o.stage}/></td><td>{formatMoney(o.value)}</td><td>{o.probability}%</td><td>{o.owner}</td><td><button className="table-action" onClick={()=>onOpen(o.id)}>Open</button></td></tr>)}</Table>
    {!rows.length && <Empty text="No opportunities match your search."/>}
  </Workspace>;
}

const pipelineStages = ["qualified","proposal","negotiation","closed_won","closed_lost"];
function PipelineView({rows,onOpen,onStageChanged}:{rows:Opportunity[];onOpen:(id:string)=>void;onStageChanged:()=>Promise<void>}) {
  const [busy,setBusy]=useState<string|null>(null); const [message,setMessage]=useState("");
  const move=async(id:string,stage:string)=>{setBusy(id);setMessage("");try{const r=await fetch("/api/opportunities",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,stage})});const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to move opportunity");await onStageChanged()}catch(e){setMessage(e instanceof Error?e.message:"Unable to move opportunity")}finally{setBusy(null)}};
  const total=rows.reduce((sum,o)=>sum+Number(o.value||0),0);
  return <section className="pipeline-workspace"><div className="workspace-head"><div><p className="eyebrow">CRM / PIPELINE</p><h2>Opportunity Pipeline</h2><p>Move deals through the same lifecycle that powers your sales workspace.</p></div><div className="pipeline-summary"><strong>{formatMoney(total)}</strong><span>pipeline value</span></div></div>{message&&<div className="info-note">{message}</div>}<div className="pipeline-board">{pipelineStages.map(stage=>{const items=rows.filter(o=>o.stage===stage);return <div className="pipeline-column" key={stage}><div className="pipeline-column-head"><div><strong>{stage.replaceAll("_"," ")}</strong><small>{items.length} deal{items.length===1?"":"s"}</small></div><span>{formatMoney(items.reduce((sum,o)=>sum+Number(o.value||0),0))}</span></div>{items.map(o=><article className="deal-card" key={o.id} onClick={()=>onOpen(o.id)}><div className="deal-card-top"><strong>{o.name}</strong><Badge text={`${o.probability}%`}/></div><small>{o.company_name || o.lead_name || "Unlinked account"}</small><div className="deal-value">{formatMoney(o.value)}</div><div className="deal-meta"><span>{o.owner || "Unassigned"}</span><span>{o.expected_close_at ? formatDate(o.expected_close_at) : "No close date"}</span></div><select value={o.stage} disabled={busy===o.id} onClick={e=>e.stopPropagation()} onChange={e=>move(o.id,e.target.value)}>{pipelineStages.map(s=><option key={s}>{s}</option>)}</select></article>)}{!items.length&&<div className="pipeline-empty">Drop or move deals here</div>}</div>})}</div></section>;
}

function RecordDrawer({kind,id,contacts,companies,leads,opportunities,activities,appointments,onClose,onRefresh}:{kind:string;id:string;contacts:Contact[];companies:Company[];leads:Lead[];opportunities:Opportunity[];activities:Activity[];appointments:Appointment[];onClose:()=>void;onRefresh:()=>Promise<void>}) {
  const opportunity=opportunities.find(o=>o.id===id); const contact=contacts.find(c=>c.id===id); const company=companies.find(c=>c.id===id); const lead=leads.find(l=>l.id===id);
  const record=opportunity||contact||company||lead; if(!record) return null;
  const relatedActivities=activities.filter(a=>a.contact_id===id||a.lead_id===id); const relatedAppointments=appointments.filter(a=>a.contact_id===id||a.lead_id===id);
  const title=(record as any).name || "Record"; const subtitle=kind==="opportunity" ? `${(record as Opportunity).stage} · ${formatMoney((record as Opportunity).value)}` : ((record as any).email || (record as any).company || "CRM record");
  return <div className="drawer-backdrop" onClick={onClose}><aside className="record-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow">CRM RECORD</p><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-btn" onClick={onClose}>×</button></div><div className="drawer-actions"><button className="ghost-btn">Add note</button><button className="primary-btn" onClick={onRefresh}>Refresh</button></div><div className="record-summary"><div><span>Type</span><strong>{kind}</strong></div><div><span>Status</span><strong>{(record as any).status || (record as any).stage || "active"}</strong></div>{kind==="opportunity"&&<div><span>Probability</span><strong>{(record as Opportunity).probability}%</strong></div>}</div><section className="drawer-section"><h3>Related records</h3><div className="related-grid">{opportunity&&<div><span>Lead</span><strong>{opportunity.lead_name || opportunity.lead_id}</strong></div>}{opportunity&&<div><span>Company</span><strong>{opportunity.company_name || opportunity.company_id || "—"}</strong></div>}{contact&&<div><span>Company</span><strong>{contact.company}</strong></div>}{lead&&<div><span>Request</span><strong>{lead.request}</strong></div>}</div></section><section className="drawer-section"><h3>Timeline</h3>{[...relatedActivities.map(a=>({date:a.created_at,title:a.title,detail:a.detail,type:a.type})),...relatedAppointments.map(a=>({date:a.start_at,title:a.title,detail:a.description,type:"appointment"}))].sort((a,b)=>b.date-a.date).map((item,i)=><div className="drawer-timeline" key={i}><span className="timeline-dot"/><div><strong>{item.title}</strong><small>{item.type} · {new Date(item.date).toLocaleString()}</small><p>{item.detail || "No details"}</p></div></div>)}{!relatedActivities.length&&!relatedAppointments.length&&<Empty text="No related activity yet."/>}</section></aside></div>;
}



function ProspectsView({rows,search,setSearch,onConverted}:{rows:Prospect[];search:string;setSearch:(v:string)=>void;onConverted:()=>Promise<void>}) {
  const [busy,setBusy]=useState<string|null>(null); const [message,setMessage]=useState("");
  const convert=async(p:Prospect)=>{
    if(!p.contact_email){setMessage("This prospect has no contact email.");return}
    setBusy(p.id);setMessage("");
    try{
      const r=await fetch("/api/prospects/convert",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prospect_id:p.id,company:p.name,source:"prospecting",notes:[p.pain_point,p.fit_reason].filter(Boolean).join(" · ")})});
      const b=await r.json(); if(!r.ok) throw new Error(b.error||"Conversion failed");
      await onConverted(); setMessage(`${p.name} is now in Contacts.`);
    }catch(e){setMessage(e instanceof Error?e.message:"Conversion failed")}finally{setBusy(null)}
  };
  return <Workspace title="Prospects" subtitle="Your prospecting layer: qualify, review contact evidence, then push good prospects into the CRM." search={search} setSearch={setSearch} addLabel="" onAdd={()=>{}} count={rows.length}>
    {message && <div className="info-note">{message}</div>}
    <Table headers={["Prospect","Qualification","Contact","Pain point","Source","Action"]}>{rows.map(p=><tr key={p.id}>
      <td><strong>{p.name}</strong><small>{p.target_niche || "General"} · {p.target_location || "—"}</small></td>
      <td><Badge text={p.qualification_status}/><small>{p.qualification_reason || "No qualification note"}</small></td>
      <td><strong>{p.contact_name || "Unknown"}</strong><small>{p.contact_email || "No email"}</small></td>
      <td className="truncate">{p.pain_point || p.fit_reason || p.snippet || "—"}</td>
      <td>{p.source || "—"}</td>
      <td>{p.contact_status==="converted" ? <Badge text="converted"/> : <button className="table-action" disabled={busy===p.id || !p.contact_email} onClick={()=>convert(p)}>{busy===p.id?"Converting…":"Convert to contact"}</button>}</td>
    </tr>)}</Table>
    {!rows.length && <Empty text="No prospects match your search."/>}
  </Workspace>;
}

function ActivityView({rows,search,setSearch}:{rows:Activity[];search:string;setSearch:(v:string)=>void}) {
  return <Workspace title="Activity" subtitle="A unified timeline for the actions and events already captured by Jabari CRM." search={search} setSearch={setSearch} addLabel="" onAdd={()=>{}} count={rows.length}>
    <div className="timeline">{rows.map(a=><div className="timeline-item" key={a.id}><div className="timeline-dot"/><div><div className="timeline-title"><strong>{a.title}</strong><span>{new Date(a.created_at).toLocaleString()}</span></div><p>{a.detail}</p><small>{a.type}{a.contact_name ? ` · ${a.contact_name}` : ""}{a.lead_name ? ` · ${a.lead_name}` : ""}</small></div></div>)}</div>
    {!rows.length && <Empty text="No CRM activity yet. Conversions and future CRM actions will appear here."/>}
  </Workspace>;
}

function AppointmentsView({rows,search,setSearch,contacts,leads,onSaved}:{rows:Appointment[];search:string;setSearch:(v:string)=>void;contacts:Contact[];leads:Lead[];onSaved:()=>Promise<void>}) {
  const [show,setShow]=useState(false);
  return <><Workspace title="Appointments" subtitle="Keep scheduled conversations connected to the people and leads they belong to." search={search} setSearch={setSearch} addLabel="Add appointment" onAdd={()=>setShow(true)} count={rows.length}>
    <Table headers={["Appointment","Contact / Lead","When","Status","Location"]}>{rows.map(a=><tr key={a.id}><td><strong>{a.title}</strong><small>{a.description || "No description"}</small></td><td>{a.contact_name || a.lead_name || "Unlinked"}</td><td>{new Date(a.start_at).toLocaleString()}<small>to {new Date(a.end_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></td><td><Badge text={a.status}/></td><td>{a.location}</td></tr>)}</Table>
    {!rows.length && <Empty text="No appointments scheduled."/>}
  </Workspace>{show&&<AppointmentForm contacts={contacts} leads={leads} onClose={()=>setShow(false)} onSaved={async()=>{await onSaved();setShow(false)}}/>}</>;
}

function AppointmentForm({contacts,leads,onClose,onSaved}:{contacts:Contact[];leads:Lead[];onClose:()=>void;onSaved:()=>Promise<void>}) {
  const [title,setTitle]=useState(""); const [description,setDescription]=useState(""); const [contactId,setContactId]=useState(""); const [leadId,setLeadId]=useState("");
  const [start,setStart]=useState(""); const [end,setEnd]=useState(""); const [location,setLocation]=useState("online"); const [status,setStatus]=useState("scheduled"); const [meetingUrl,setMeetingUrl]=useState(""); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError("");try{
    const startAt=new Date(start).getTime(), endAt=new Date(end).getTime();
    const r=await fetch("/api/appointments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,description,contact_id:contactId||undefined,lead_id:leadId||undefined,start_at:startAt,end_at:endAt,status,location,meeting_url:meetingUrl||undefined})});
    const b=await r.json();if(!r.ok)throw new Error(b.error||"Unable to create appointment");await onSaved();
  }catch(x){setError(x instanceof Error?x.message:"Unable to create appointment")}finally{setSaving(false)}};
  return <Modal title="Add appointment" onClose={onClose}><form onSubmit={submit}><div className="form-grid"><Field label="Title" name="title" value={title} onChange={setTitle} placeholder="Discovery call"/><label className="field"><span>Contact</span><select value={contactId} onChange={e=>setContactId(e.target.value)}><option value="">None</option>{contacts.map(c=><option value={c.id} key={c.id}>{c.name} · {c.company}</option>)}</select></label><label className="field"><span>Lead</span><select value={leadId} onChange={e=>setLeadId(e.target.value)}><option value="">None</option>{leads.map(l=><option value={l.id} key={l.id}>{l.name} · {l.company}</option>)}</select></label><Field label="Location" name="location" value={location} onChange={setLocation} placeholder="online"/><Field label="Start" name="start" value={start} onChange={setStart} type="datetime-local"/><Field label="End" name="end" value={end} onChange={setEnd} type="datetime-local"/><label className="field"><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}><option>scheduled</option><option>confirmed</option><option>completed</option><option>cancelled</option></select></label><Field label="Meeting URL" name="meeting_url" value={meetingUrl} onChange={setMeetingUrl} placeholder="https://…" required={false}/></div><Textarea label="Description" value={description} onChange={setDescription} required={false}/>{error&&<div className="form-error">{error}</div>}<FormActions onClose={onClose} saving={saving}/></form></Modal>;
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
function navIcon(s:string) { const icons:Record<string,string>={ "Command Center":"⌂",Prospects:"◌",Contacts:"◎",Leads:"◈",Companies:"▦",Opportunities:"◇",Pipeline:"▥",Activity:"⌁",Appointments:"◷",Tasks:"✓",Campaigns:"◉",Workflows:"⌘",Invoices:"▤",Inbox:"✉" }; return icons[s] || "•"; }

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
