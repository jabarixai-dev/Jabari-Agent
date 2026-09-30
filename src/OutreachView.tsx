// V13 Outreach Center component.
// Copy this component into src/App.tsx before RecordDrawer,
// then add the state/load/filter/navigation wiring described below.

function OutreachView({
  rows,
  search,
  setSearch,
  leads,
  onSaved,
}: {
  rows: OutreachDraft[];
  search: string;
  setSearch: (v: string) => void;
  leads: Lead[];
  onSaved: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<OutreachDraft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leadId, setLeadId] = useState("");
  const [status, setStatus] = useState("draft");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; kind: string; created_at: number }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selected) {
      setSubject(selected.subject);
      setBody(selected.body_text);
      setLeadId(selected.lead_id);
      setStatus(selected.status);
    } else {
      setSubject("");
      setBody("");
      setLeadId("");
      setStatus("draft");
    }
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) {
      setEvents([]);
      return;
    }

    fetch(`/api/outreach?draft_id=${encodeURIComponent(selected.id)}`)
      .then(async (r) => {
        const b = await r.json();
        if (r.ok) setEvents(b.events || []);
      })
      .catch(() => {});
  }, [selected?.id]);

  const save = async (nextStatus = status) => {
    if (!leadId || !subject.trim() || !body.trim()) {
      setError("Select a lead and complete the subject and message.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const payload = {
        id: selected?.id,
        lead_id: leadId,
        subject: subject.trim(),
        body_text: body.trim(),
        status: nextStatus,
      };

      const r = await fetch("/api/outreach", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Unable to save outreach draft");

      setSelected(b.data);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save outreach draft");
    } finally {
      setBusy(false);
    }
  };

  const newDraft = () => {
    setSelected(null);
    setLeadId(leads[0]?.id || "");
    setSubject("");
    setBody("");
    setStatus("draft");
    setError("");
  };

  return (
    <Workspace
      title="Outreach"
      subtitle="Create, review and queue personalized outreach while keeping every touchpoint connected to the CRM."
      search={search}
      setSearch={setSearch}
      count={rows.length}
      addLabel="New draft"
      onAdd={newDraft}
    >
      <div className="outreach-layout">
        <div className="outreach-list">
          {rows.map((d) => (
            <button
              key={d.id}
              className={selected?.id === d.id ? "outreach-row active" : "outreach-row"}
              onClick={() => setSelected(d)}
            >
              <div>
                <strong>{d.subject}</strong>
                <small>{d.lead_name || "Lead"} · {d.lead_email || "No email"}</small>
              </div>
              <Badge text={d.status} />
              <span className="outreach-date">{formatDate(d.updated_at)}</span>
            </button>
          ))}
          {!rows.length && <Empty text="No outreach drafts yet. Create one from a lead." />}
        </div>

        <div className="outreach-editor">
          <div className="outreach-editor-head">
            <div>
              <p className="eyebrow">OUTREACH / DRAFT</p>
              <h3>{selected ? "Edit outreach" : "New outreach"}</h3>
            </div>
            {selected && <Badge text={selected.status} />}
          </div>

          <label className="form-label">
            Lead
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">Select lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.company}
                </option>
              ))}
            </select>
          </label>

          <label className="form-label">
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Personalized subject"
            />
          </label>

          <label className="form-label">
            Message
            <textarea
              className="outreach-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the outreach message…"
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <div className="outreach-actions">
            <button className="ghost-btn" disabled={busy} onClick={() => save("draft")}>
              Save draft
            </button>
            <button className="primary-btn" disabled={busy} onClick={() => save("queued")}>
              {busy ? "Saving…" : "Queue outreach"}
            </button>
          </div>

          <div className="outreach-note">
            Queued means prepared for the sending layer; it does not claim that an email was sent.
          </div>

          {selected && (
            <div className="outreach-history">
              <h4>Outreach history</h4>
              {events.length ? (
                events.map((e) => (
                  <div className="outreach-event" key={e.id}>
                    <strong>{e.kind}</strong>
                    <span>{formatDateTime(e.created_at)}</span>
                  </div>
                ))
              ) : (
                <Empty text="No outreach events recorded yet." />
              )}
            </div>
          )}
        </div>
      </div>
    </Workspace>
  );
}
