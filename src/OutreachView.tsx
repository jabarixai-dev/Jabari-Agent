import { useEffect, useState } from "react";

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
};

type OutreachDraft = {
  id: string;
  lead_id: string;
  subject: string;
  body_text: string;
  status: string;
  sent_at?: number;
  created_at: number;
  updated_at: number;
  lead_name?: string;
  lead_email?: string;
  lead_company?: string;
  event_count?: number;
  last_event_type?: string;
  last_event_at?: number;
};

type OutreachViewProps = {
  rows: OutreachDraft[];
  search: string;
  setSearch: (value: string) => void;
  leads: Lead[];
  onSaved: () => Promise<void>;
};

function formatDate(value?: number) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function formatDateTime(value?: number) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function OutreachView({
  rows,
  search,
  setSearch,
  leads,
  onSaved,
}: OutreachViewProps) {
  const [selected, setSelected] = useState<OutreachDraft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leadId, setLeadId] = useState("");
  const [status, setStatus] = useState("draft");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; kind: string; created_at: number }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected) {
      setSubject("");
      setBody("");
      setLeadId(leads[0]?.id || "");
      setStatus("draft");
      setEvents([]);
      return;
    }

    setSubject(selected.subject);
    setBody(selected.body_text);
    setLeadId(selected.lead_id);
    setStatus(selected.status);

    fetch(`/api/outreach?draft_id=${encodeURIComponent(selected.id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) setEvents(data.events || []);
      })
      .catch(() => setEvents([]));
  }, [selected?.id, leads]);

  const save = async (nextStatus = status) => {
    if (!leadId || !subject.trim() || !body.trim()) {
      setError("Select a lead and complete the subject and message.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/outreach", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected?.id,
          lead_id: leadId,
          subject: subject.trim(),
          body_text: body.trim(),
          status: nextStatus,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save outreach draft");
      }

      setSelected(data.data);
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save outreach draft"
      );
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
    setEvents([]);
    setError("");
  };

  return (
    <section className="workspace">
      <div className="workspace-head">
        <div>
          <p className="eyebrow">CRM / OUTREACH</p>
          <h2>Outreach</h2>
          <p>Create, review and queue personalized outreach connected to your CRM.</p>
        </div>
        <button className="primary-btn" onClick={newDraft}>
          + New draft
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          ⌕
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search outreach…"
          />
        </div>
        <span className="result-count">{rows.length} records</span>
      </div>

      <div className="outreach-layout">
        <div className="outreach-list">
          {rows.map((draft) => (
            <button
              key={draft.id}
              className={selected?.id === draft.id ? "outreach-row active" : "outreach-row"}
              onClick={() => setSelected(draft)}
            >
              <div>
                <strong>{draft.subject}</strong>
                <small>{draft.lead_name || "Lead"} · {draft.lead_email || "No email"}</small>
              </div>
              <span className="badge">{draft.status || "—"}</span>
              <span className="outreach-date">{formatDate(draft.updated_at)}</span>
            </button>
          ))}
          {!rows.length && (
            <div className="empty">No outreach drafts yet. Create one from a lead.</div>
          )}
        </div>

        <div className="outreach-editor">
          <div className="outreach-editor-head">
            <div>
              <p className="eyebrow">OUTREACH / DRAFT</p>
              <h3>{selected ? "Edit outreach" : "New outreach"}</h3>
            </div>
            {selected && <span className="badge">{selected.status}</span>}
          </div>

          <label className="form-label">
            Lead
            <select value={leadId} onChange={(event) => setLeadId(event.target.value)}>
              <option value="">Select lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} · {lead.company}
                </option>
              ))}
            </select>
          </label>

          <label className="form-label">
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Personalized subject"
            />
          </label>

          <label className="form-label">
            Message
            <textarea
              className="outreach-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write the outreach message…"
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <div className="outreach-actions">
            <button
              className="ghost-btn"
              disabled={busy}
              onClick={() => save("draft")}
            >
              Save draft
            </button>
            <button
              className="primary-btn"
              disabled={busy}
              onClick={() => save("queued")}
            >
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
                events.map((event) => (
                  <div className="outreach-event" key={event.id}>
                    <strong>{event.kind}</strong>
                    <span>{formatDateTime(event.created_at)}</span>
                  </div>
                ))
              ) : (
                <div className="empty">No outreach events recorded yet.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
