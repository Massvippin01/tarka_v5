import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Sparkles } from "lucide-react";
import apiClient from "../../../api/client";
import { useCaseStore } from "../../../store/useCaseStore";
import { useTarkaGlobal, type CaseWorkspace } from "../../../context/TarkaGlobalContext";
import {
  formatAmountInput,
  goldenHourPreview,
  parseAmount,
  toLocalInput,
  validateNewCase,
} from "./newCaseForm";

const FRAUD_TYPES: { value: CaseWorkspace["typology"]; label: string }[] = [
  { value: "UNCLASSIFIED", label: "Not sure yet" },
  { value: "DIGITAL_ARREST", label: "Digital arrest (fake CBI / police / ED call)" },
  { value: "APK_SIM_SWAP", label: "Fake app (APK) that steals SMS, or SIM swap" },
  { value: "TELEGRAM_INVESTMENT", label: "Investment or IPO scam on Telegram / WhatsApp" },
  { value: "CORPORATE_BEC", label: "Business email fraud (fake vendor or boss email)" },
  { value: "TASK_FRAUD", label: "Part-time job or task scam" },
];
const PRIORITIES: { value: CaseWorkspace["priority"]; label: string }[] = [
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH_SYNDICATE", label: "High" },
  { value: "CRITICAL_GOLDEN_HOUR", label: "Urgent" },
];
const NO_PROJECT = "";
const NEW_PROJECT = "__new__";

interface ProjectOption { project_id: string; name: string; archived: boolean }

const field =
  "w-full rounded-lg border border-line bg-[var(--surface-2)] px-3 py-2 text-[13px] text-fg-1! placeholder:text-fg-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)] focus:border-accent aria-[invalid=true]:border-risk";
const label = "mb-1 block text-[12px] font-semibold text-fg-2";
const hint = "mt-1 text-[12px] text-fg-3";
const err = "mt-1 text-[12px] text-risk";

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset className="m-0 min-w-0 border-0 p-0">
    <legend className="mb-2 p-0 text-[11px] font-bold uppercase tracking-wider text-fg-3">{title}</legend>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
  </fieldset>
);

export const NewCaseModal: React.FC = () => {
  const { isNewCaseModalOpen, closeNewCaseModal, createNewCaseWorkspace } = useTarkaGlobal();
  const qc = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [fir, setFir] = useState("");
  const [ncrp, setNcrp] = useState("");
  const [receivedAt, setReceivedAt] = useState(() => toLocalInput(new Date()));
  const [complainant, setComplainant] = useState("");
  const [phone, setPhone] = useState("");
  const [claimed, setClaimed] = useState("");
  const [title, setTitle] = useState("");
  const [typology, setTypology] = useState<CaseWorkspace["typology"]>("UNCLASSIFIED");
  const [station, setStation] = useState("");
  const [officer, setOfficer] = useState("");
  const [priority, setPriority] = useState<CaseWorkspace["priority"]>("NORMAL");
  const [projectChoice, setProjectChoice] = useState(NO_PROJECT);
  const [newProjectName, setNewProjectName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await apiClient.get<ProjectOption[]>("/api/v1/projects")).data,
    enabled: isNewCaseModalOpen,
  });
  // Sample data is a demo/dev convenience only: the backend says whether demo sign-in is on.
  const demo = useQuery({
    queryKey: ["auth-mode"],
    queryFn: async () => (await apiClient.get<{ demo_auth_enabled?: boolean }>("/api/v1/investigation/auth/mode")).data,
    enabled: isNewCaseModalOpen,
    staleTime: 5 * 60_000,
  });

  // Fresh form (complaint time = now) every time the dialog opens; the preview ticks each 30 s.
  useEffect(() => {
    if (!isNewCaseModalOpen) return;
    setReceivedAt(toLocalInput(new Date()));
    setFir(""); setNcrp(""); setComplainant(""); setPhone(""); setClaimed(""); setTitle("");
    setTypology("UNCLASSIFIED"); setStation(""); setOfficer(""); setPriority("NORMAL");
    setProjectChoice(NO_PROJECT); setNewProjectName(""); setErrors({}); setFormError(null);
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isNewCaseModalOpen]);

  // Focus the first field, keep Tab inside the dialog, Esc closes.
  useEffect(() => {
    if (!isNewCaseModalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeNewCaseModal(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const f = [...dialogRef.current.querySelectorAll<HTMLElement>("button, input, select, a[href]")].filter((x) => !x.hasAttribute("disabled"));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); previous?.focus?.(); };
  }, [isNewCaseModalOpen, closeNewCaseModal]);

  if (!isNewCaseModalOpen) return null;

  const preview = goldenHourPreview(receivedAt, now);
  const creatingProject = projectChoice === NEW_PROJECT;

  const fillSample = () => {
    setFir("112/2026"); setNcrp("SAMPLE-0000001"); setComplainant("Sample Complainant"); setPhone("9000000000");
    setClaimed(formatAmountInput("250000")); setTitle("Sample case - UPI fraud"); setTypology("TELEGRAM_INVESTMENT");
    setErrors({}); setFormError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateNewCase({ fir, ncrp, receivedAt, complainant, phone, title, newProjectName: creatingProject ? newProjectName : undefined }, Date.now());
    setErrors(found);
    if (Object.keys(found).length) {
      dialogRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      let projectId = projectChoice || undefined;
      if (creatingProject) {
        projectId = (await apiClient.post<{ project_id: string }>("/api/v1/projects", { name: newProjectName.trim() })).data.project_id;
      }
      const caseId = await createNewCaseWorkspace(
        {
          firNumber: fir.trim(),
          policeStation: station.trim(),
          ncrpAckNo: ncrp.trim(),
          title: title.trim(),
          typology,
          complainantName: complainant.trim(),
          leadInvestigator: officer.trim(),
          claimedLossInr: parseAmount(claimed),
          // Worked out from uploaded statements, never typed: 0 = not yet known.
          bookedLossInr: 0,
          recoverableInr: 0,
          commercialShieldedInr: 0,
          goldenHourRemainingMins: 0,
          priority,
          currentStage: "intake",
          syndicateLinks: [],
        },
        { projectId, complaintReceivedAt: new Date(receivedAt).getTime() / 1000 },
      );
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: ["projects-cases"] });
      closeNewCaseModal();
      useCaseStore.getState().setActiveCaseId(caseId);
      useCaseStore.getState().setActiveView("upload");
      toast.success("Case created — upload bank statements to start");
    } catch (ex: unknown) {
      const d = (ex as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setFormError(typeof d === "string" ? d : ex instanceof Error ? ex.message : "Could not create the case. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const invalid = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `nc-${k}-err` : undefined }) as const;
  const msg = (k: string) => errors[k] && <p id={`nc-${k}-err`} role="alert" className={err}>{errors[k]}</p>;

  const node = (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center overflow-y-auto bg-[rgba(8,14,36,0.45)] p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeNewCaseModal(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nc-title"
        data-testid="register-new-case-modal"
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-[min(720px,100%)] flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-3)] shadow-[var(--glass-shadow)] backdrop-blur-[var(--blur-3)] sm:max-h-[calc(100vh-3rem)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="nc-title" className="m-0 text-[18px] font-semibold text-fg-1">New case</h2>
            <p className="m-0 mt-0.5 text-[13px] text-fg-2">One case = one FIR / complaint. Group related cases into a project.</p>
          </div>
          <div className="flex items-center gap-2">
            {demo.data?.demo_auth_enabled && (
              <button type="button" onClick={fillSample} data-testid="new-case-fill-sample"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-[var(--surface-2)] px-2.5 py-1.5 text-[12px] font-medium text-fg-2! hover:bg-[var(--hover)]">
                <Sparkles size={13} aria-hidden /> Fill sample data
              </button>
            )}
            <button type="button" onClick={closeNewCaseModal} aria-label="Close"
              className="cursor-pointer rounded-lg border-0 bg-transparent p-1.5 text-fg-3! hover:bg-[var(--hover)] hover:text-fg-1!">
              <X size={16} aria-hidden />
            </button>
          </div>
        </div>

        <form id="new-case-modal-form" onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
          {formError && <div role="alert" className="rounded-lg border border-risk bg-[var(--risk-bg)] px-3 py-2 text-[13px] text-risk">{formError}</div>}

          <Section title="Complaint">
            <div>
              <label htmlFor="nc-fir" className={label}>FIR number <span aria-hidden className="text-risk">*</span></label>
              <input id="nc-fir" value={fir} onChange={(e) => setFir(e.target.value)} required placeholder="e.g. 112/2026" className={field} {...invalid("fir")} />
              {msg("fir")}
            </div>
            <div>
              <label htmlFor="nc-ncrp" className={label}>NCRP acknowledgement number <span className="font-normal text-fg-3">(optional)</span></label>
              <input id="nc-ncrp" value={ncrp} onChange={(e) => setNcrp(e.target.value)} placeholder="From the 1930 SMS" className={field} {...invalid("ncrp")} />
              {msg("ncrp")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="nc-received" className={label}>Complaint received <span aria-hidden className="text-risk">*</span></label>
              <input id="nc-received" type="datetime-local" value={receivedAt} max={toLocalInput(new Date(now + 60_000))} onChange={(e) => setReceivedAt(e.target.value)} required className={`${field} sm:max-w-[260px]`} {...invalid("receivedAt")} />
              {msg("receivedAt")}
              {preview && <p className={hint} data-testid="new-case-golden-preview" aria-live="polite">{preview}</p>}
            </div>
          </Section>

          <Section title="Victim">
            <div>
              <label htmlFor="nc-complainant" className={label}>Complainant name <span aria-hidden className="text-risk">*</span></label>
              <input id="nc-complainant" value={complainant} onChange={(e) => setComplainant(e.target.value)} required autoComplete="off" className={field} {...invalid("complainant")} />
              {msg("complainant")}
            </div>
            <div>
              <label htmlFor="nc-phone" className={label}>Phone <span className="font-normal text-fg-3">(optional)</span></label>
              <input id="nc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" className={field} {...invalid("phone")} />
              {msg("phone")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="nc-claimed" className={label}>Amount reported lost (₹) <span className="font-normal text-fg-3">(optional)</span></label>
              <input id="nc-claimed" inputMode="numeric" value={claimed} onChange={(e) => setClaimed(formatAmountInput(e.target.value))} placeholder="e.g. 2,50,000" aria-describedby="nc-claimed-help" className={`${field} font-mono sm:max-w-[260px]`} />
              <p id="nc-claimed-help" className={hint}>What the victim says they lost. The amount actually lost is worked out from bank statements.</p>
            </div>
          </Section>

          <Section title="Case details">
            <div className="sm:col-span-2">
              <label htmlFor="nc-case-title" className={label}>Title <span aria-hidden className="text-risk">*</span></label>
              <input id="nc-case-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Short name, e.g. Fake CBI call, Sector 62" className={field} {...invalid("title")} />
              {msg("title")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="nc-type" className={label}>Fraud type</label>
              <select id="nc-type" value={typology} onChange={(e) => setTypology(e.target.value as CaseWorkspace["typology"])} className={`${field} cursor-pointer`}>
                {FRAUD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="nc-station" className={label}>Police station</label>
              <input id="nc-station" value={station} onChange={(e) => setStation(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="nc-officer" className={label}>Investigating officer</label>
              <input id="nc-officer" value={officer} onChange={(e) => setOfficer(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="nc-priority" className={label}>Priority</label>
              <select id="nc-priority" value={priority} onChange={(e) => setPriority(e.target.value as CaseWorkspace["priority"])} className={`${field} cursor-pointer`}>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </Section>

          <Section title="Project">
            <div>
              <label htmlFor="nc-project" className={label}>Add this case to a project</label>
              <select id="nc-project" value={projectChoice} onChange={(e) => setProjectChoice(e.target.value)} className={`${field} cursor-pointer`}>
                <option value={NO_PROJECT}>No project</option>
                {(projects.data ?? []).filter((p) => !p.archived).map((p) => <option key={p.project_id} value={p.project_id}>{p.name}</option>)}
                <option value={NEW_PROJECT}>+ New project…</option>
              </select>
              <p className={hint}>A project groups related cases, for example one gang or one operation.</p>
            </div>
            {creatingProject && (
              <div>
                <label htmlFor="nc-newproject" className={label}>New project name <span aria-hidden className="text-risk">*</span></label>
                <input id="nc-newproject" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className={field} {...invalid("newProject")} />
                {msg("newProject")}
              </div>
            )}
          </Section>
        </form>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <span className="text-[12px] text-fg-3">Esc to close</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={closeNewCaseModal} className="cursor-pointer rounded-lg border border-line bg-transparent px-3.5 py-1.5 text-[13px] font-medium text-fg-2! hover:bg-[var(--hover)]">Cancel</button>
            <button type="submit" form="new-case-modal-form" disabled={busy} className="cursor-pointer rounded-lg border-0 bg-[var(--accent)] px-4 py-1.5 text-[13px] font-semibold text-white! hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70">
              {busy ? "Creating…" : "Create case"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(node, document.body) : node;
};
