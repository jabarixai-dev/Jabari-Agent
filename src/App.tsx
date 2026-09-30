import { useEffect, useState } from "react";

const sections = ["Command Center","Contacts","Leads","Companies","Opportunities","Tasks","Campaigns","Workflows","Appointments","Invoices","Inbox"];

type Dashboard = {
  metrics: { contacts:number; openLeads:number; openOpportunities:number; tasksDue:number };
  recentContacts: Array<{id:string;first_name:string;last_name?:string;email?:string;job_title?:string}>;
  recentLeads: Array<{id:string;title:string;stage:string;status:string;score:number;estimated_value?:number}>;
  recentOpportunities: Array<{id:string;name:string;stage:string;status:string;value:number;probability:number}>;
  activity: Array<{id:string;type:string;title:string;description?:string;occurred_at:string}>;
};

const emptyDashboard: Dashboard = {
  metrics:{contacts:0,openLeads:0,openOpportunities:0,tasksDue:0},
  recentContacts:[], recentLeads:[], recentOpportunities:[], activity:[]
};

export default function App() {
  const [active,setActive] = useState("Command Center");
  const [data,setData] = useState<Dashboard>(emptyDashboard);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async r => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Dashboard request failed");
        return body;
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">J</div><div><strong>Jabari</strong><span>Agent</span></div></div>
      <nav>{sections.map(s => <button key={s} className={active===s ? "nav-item active" : "nav-item"} onClick={()=>setActive(s)}>{s}</button>)}</nav>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><p className="eyebrow">JABARI AGENT</p><h1>{active}</h1></div>
        <div className="status"><span className="status-dot"/>{loading ? " Loading CRM…" : error ? " CRM connection error" : " Live CRM"}</div>
      </header>

      {active === "Command Center" ? <DashboardView data={data} loading={loading} error={error}/> :
        <section className="hero-card"><p className="eyebrow">{active.toUpperCase()}</p><h2>{active} workspace</h2><p>This section is connected to the same CRM foundation. We’ll build its full workspace next.</p></section>}
    </main>
  </div>
}

function DashboardView({data,loading,error}:{data:Dashboard;loading:boolean;error:string}) {
  const cards = [["Contacts",data.metrics.contacts],["Open Leads",data.metrics.openLeads],["Opportunities",data.metrics.openOpportunities],["Tasks Due",data.metrics.tasksDue]];
  return <div>
    <section className="hero-card">
      <p className="eyebrow">COMMAND CENTER</p>
      <h2>Run your customer operations from one place.</h2>
      <p>Live CRM metrics, recent prospects, opportunities and activity are pulled directly from Neon.</p>
    </section>

    <section className="stats">{cards.map(([label,value])=><article key={label as string}><span>{label}</span><strong>{loading ? "—" : value}</strong></article>)}</section>

    {error && <div className="error-card">{error}. Check the Netlify function and DATABASE_URL.</div>}

    <section className="dashboard-grid">
      <Panel title="Recent Contacts">
        {data.recentContacts.length ? data.recentContacts.map(c=><Row key={c.id} title={`${c.first_name} ${c.last_name ?? ""}`.trim()} meta={c.job_title || c.email || "No details"}/>) : <Empty text="No contacts yet."/>}
      </Panel>
      <Panel title="Open Leads">
        {data.recentLeads.length ? data.recentLeads.map(l=><Row key={l.id} title={l.title} meta={`${l.stage} · Score ${l.score}`}/>) : <Empty text="No leads yet."/>}
      </Panel>
      <Panel title="Opportunities">
        {data.recentOpportunities.length ? data.recentOpportunities.map(o=><Row key={o.id} title={o.name} meta={`${o.stage} · ${formatMoney(o.value)}`}/>) : <Empty text="No opportunities yet."/>}
      </Panel>
      <Panel title="Recent Activity">
        {data.activity.length ? data.activity.map(a=><Row key={a.id} title={a.title} meta={new Date(a.occurred_at).toLocaleString()}/>) : <Empty text="Activity will appear here as CRM actions happen."/>}
      </Panel>
    </section>
  </div>
}

function Panel({title,children}:{title:string;children:React.ReactNode}) {
  return <section className="panel"><div className="panel-head"><h3>{title}</h3><span>Live</span></div>{children}</section>
}
function Row({title,meta}:{title:string;meta:string}) { return <div className="crm-row"><div><strong>{title}</strong><small>{meta}</small></div></div> }
function Empty({text}:{text:string}) { return <div className="empty">{text}</div> }
function formatMoney(value:number) { return new Intl.NumberFormat(undefined,{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(value || 0) }
