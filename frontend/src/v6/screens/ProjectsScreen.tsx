import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Archive, ArchiveRestore, FolderKanban, FolderPlus, Link2, Network, Pencil, RotateCcw } from 'lucide-react';
import apiClient from '../../api/client';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { Button, Chip, EmptyState, PageHead } from '../ui';
import type { NetworksResponse } from '../triage/triage';
import { intakeLabel } from '../intake/intake';

import { LIFECYCLE, type Lifecycle } from './lifecycle';
export { LIFECYCLE };
export type { Lifecycle };

interface ProjectCase {
  case_id: string;
  lifecycle: Lifecycle | null;
  assignee: string | null;
}
interface Project {
  project_id: string;
  name: string;
  description: string | null;
  archived: boolean;
  created_at: string | number; // server sends Unix seconds
  cases: ProjectCase[];
}

const API = '/api/v1/projects';
const errText = (e: unknown) => {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data?.detail;
    if (typeof d === 'string') return d;
    return e.response ? `Server replied ${e.response.status}` : 'Could not reach the TARKA server';
  }
  return e instanceof Error ? e.message : String(e);
};

const input =
  'rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[12.5px] text-[var(--fg-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]';

function useProjectMutation<T>(fn: (v: T) => Promise<unknown>, success?: (v: T) => string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
      void qc.invalidateQueries({ queryKey: ['projects-cases'] }); // topbar stage reads this
      const msg = success?.(v);
      if (msg) toast.success(msg);
    },
    onError: (e) => toast.error(errText(e)),
  });
}

export const ProjectsScreen: React.FC = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const q = useQuery({ queryKey: ['projects'], queryFn: async () => (await apiClient.get<Project[]>(API)).data });
  const projects = (q.data ?? []).filter((p) => showArchived || !p.archived);
  const archivedCount = (q.data ?? []).filter((p) => p.archived).length;

  return (
    <div className="v6-enter space-y-4" data-testid="v6-projects">
      <PageHead
        kicker="Workspace"
        title="Projects & Cases"
        subtitle="Group related complaints into a project, track where each case stands and who is on it."
        actions={
          <>
            {archivedCount > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setShowArchived((v) => !v)}>
                {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={() => setCreating(true)} data-testid="new-project">
              <FolderPlus className="w-3.5 h-3.5 mr-1" /> New project
            </Button>
          </>
        }
      />

      {creating && <NewProjectForm onClose={() => setCreating(false)} />}

      {q.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 rounded-2xl animate-pulse bg-[var(--surface-3)]" />
          ))}
        </div>
      ) : q.isError ? (
        <EmptyState
          icon={<FolderKanban className="w-6 h-6" />}
          title="Could not load projects"
          description={errText(q.error)}
          action={
            <Button size="sm" onClick={() => void q.refetch()}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Try again
            </Button>
          }
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-6 h-6" />}
          title={archivedCount ? 'All projects are archived' : 'No projects yet'}
          description="A project holds cases that belong together, for example every complaint linked to one call-centre gang."
          action={
            <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
              <FolderPlus className="w-3.5 h-3.5 mr-1" /> Create the first project
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <motion.div key={p.project_id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
              <ProjectCard project={p} all={q.data ?? []} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const NewProjectForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const create = useProjectMutation(
    (v: { name: string; description?: string }) => apiClient.post(API, v),
    (v) => `Project "${v.name}" created`
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), description: description.trim() || undefined }, { onSuccess: onClose });
  };
  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--surface-1)]/80 backdrop-blur-md shadow-[var(--shadow)] p-4 flex flex-wrap items-end gap-3"
    >
      <label className="flex-1 min-w-[200px]">
        <span className="block text-[11.5px] font-semibold text-[var(--fg-2)] mb-1">Project name</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={`${input} w-full`} placeholder="e.g. Jamtara call-centre gang" data-testid="project-name" />
      </label>
      <label className="flex-[2] min-w-[240px]">
        <span className="block text-[11.5px] font-semibold text-[var(--fg-2)] mb-1">
          Description <span className="font-normal text-[var(--fg-3)]">(optional)</span>
        </span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} className={`${input} w-full`} />
      </label>
      <Button type="button" variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" variant="primary" disabled={!name.trim()} isLoading={create.isPending} data-testid="project-create">
        Create
      </Button>
    </form>
  );
};

const ProjectCard: React.FC<{ project: Project; all: Project[] }> = ({ project: p, all }) => {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(p.name);
  const [linkId, setLinkId] = useState('');
  const { caseWorkspaces } = useTarkaGlobal();

  const patchProject = useProjectMutation(
    (v: { name?: string; archived?: boolean }) => apiClient.patch(`${API}/${p.project_id}`, v),
    (v) => (v.archived !== undefined ? `"${p.name}" ${v.archived ? 'archived' : 'restored'}` : 'Project renamed')
  );
  const link = useProjectMutation(
    (v: { case_id: string; project_id: string }) => apiClient.post(`${API}/${v.project_id}/cases`, { case_id: v.case_id }),
    (v) => `${v.case_id} is now in "${all.find((x) => x.project_id === v.project_id)?.name ?? 'the project'}"`
  );

  const saveName = () => {
    setRenaming(false);
    if (name.trim() && name.trim() !== p.name) patchProject.mutate({ name: name.trim() });
    else setName(p.name);
  };
  const submitLink = (e: React.FormEvent) => {
    e.preventDefault();
    const id = linkId.trim();
    if (!id) return;
    link.mutate({ case_id: id, project_id: p.project_id }, { onSuccess: () => setLinkId('') });
  };
  const others = all.filter((x) => x.project_id !== p.project_id && !x.archived);
  const linked = new Set(p.cases.map((c) => c.case_id));
  const datalistId = `cases-${p.project_id}`;

  return (
    <div
      className={`rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]/80 backdrop-blur-md shadow-[var(--shadow)] ${p.archived ? 'opacity-70' : ''}`}
      data-testid="project-card"
    >
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        <div className="w-9 h-9 flex-none rounded-lg flex items-center justify-center bg-[var(--accent-bg)] text-[var(--accent)]">
          <FolderKanban className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') {
                  setName(p.name);
                  setRenaming(false);
                }
              }}
              maxLength={120}
              className={`${input} w-full max-w-md text-[14px] font-semibold`}
              aria-label="Project name"
            />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-[14.5px] font-semibold text-[var(--fg-1)] truncate" title={p.name}>
                {p.name}
              </div>
              {p.archived && <Chip variant="muted">Archived</Chip>}
            </div>
          )}
          <div className="text-[12px] text-[var(--fg-3)] truncate" title={p.description ?? undefined}>
            {p.cases.length} case{p.cases.length === 1 ? '' : 's'}
            {p.created_at && <> · created {new Date(typeof p.created_at === 'number' ? p.created_at * 1000 : p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
            {p.description && <> · {p.description}</>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-none">
          {!renaming && !p.archived && (
            <Button size="sm" variant="ghost" onClick={() => setRenaming(true)} title="Rename project" aria-label="Rename project">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => patchProject.mutate({ archived: !p.archived })}
            title={p.archived ? 'Restore project' : 'Archive project (its cases stay; it is hidden from this list)'}
            aria-label={p.archived ? 'Restore project' : 'Archive project'}
          >
            {p.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {p.cases.length > 0 && (
        <div className="border-t border-[var(--line)] overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--fg-3)]">
                <th className="px-4 py-2 font-semibold">Case</th>
                <th className="px-2 py-2 font-semibold">Stage</th>
                <th className="px-2 py-2 font-semibold">Assigned to</th>
                <th className="px-2 py-2 font-semibold">Move to project</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {p.cases.map((c) => (
                <CaseRow key={c.case_id} c={c} project={p} others={others} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!p.archived && (
        <form onSubmit={submitLink} className="border-t border-[var(--line)] px-4 py-2.5 flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-[var(--fg-3)] flex-none" />
          <input
            value={linkId}
            onChange={(e) => setLinkId(e.target.value)}
            list={datalistId}
            placeholder="Add a case by its ID, e.g. CASE-2026-002"
            className={`${input} flex-1 min-w-0 max-w-sm`}
            aria-label="Case ID to add"
          />
          <datalist id={datalistId}>
            {caseWorkspaces
              .filter((w) => !linked.has(w.caseId))
              .map((w) => (
                <option key={w.caseId} value={w.caseId}>
                  {w.title}
                </option>
              ))}
          </datalist>
          <Button type="submit" size="sm" disabled={!linkId.trim()} isLoading={link.isPending} title="If the case is in another project it is moved here.">
            Add case
          </Button>
        </form>
      )}
    </div>
  );
};

const CaseRow: React.FC<{ c: ProjectCase; project: Project; others: Project[] }> = ({ c, project, others }) => {
  const [assignee, setAssignee] = useState(c.assignee ?? '');
  const navigate = useCaseStore((s) => s.setActiveCaseId);
  const setView = useCaseStore((s) => s.setActiveView);
  const patchCase = useProjectMutation(
    (v: { lifecycle?: Lifecycle; assignee?: string }) => apiClient.patch(`${API}/cases/${encodeURIComponent(c.case_id)}`, v),
    (v) => (v.lifecycle ? `${c.case_id} → ${LIFECYCLE.find((l) => l.key === v.lifecycle)?.label}` : `${c.case_id} assigned to ${v.assignee || 'nobody'}`)
  );
  const move = useProjectMutation(
    (target: Project) => apiClient.post(`${API}/${target.project_id}/cases`, { case_id: c.case_id }),
    (target) => `${c.case_id} moved to "${target.name}"`
  );
  const saveAssignee = () => {
    if (assignee.trim() !== (c.assignee ?? '')) patchCase.mutate({ assignee: assignee.trim() });
  };
  const stage = LIFECYCLE.findIndex((l) => l.key === c.lifecycle);
  // Same query key as Triage / My Desk, so this is usually already cached.
  const nets = useQuery({
    queryKey: ['networks', c.case_id],
    queryFn: async () => (await apiClient.get<NetworksResponse>(`/api/v1/cases/${encodeURIComponent(c.case_id)}/networks`)).data,
    staleTime: 60_000,
  });
  const intake = nets.data ? intakeLabel(nets.data.networks) : null;

  return (
    <tr className="border-t border-[var(--line)]" data-testid="project-case-row">
      <td className="px-4 py-2 whitespace-nowrap">
        <div className="font-semibold text-[var(--fg-1)] font-mono">{c.case_id}</div>
        {intake && (
          <button
            type="button"
            onClick={() => {
              navigate(c.case_id);
              setView('triage');
            }}
            className="mt-0.5 block text-[11.5px] font-semibold text-[var(--accent)] hover:underline"
            data-testid="intake-label"
          >
            {intake}
          </button>
        )}
        <div className="flex gap-0.5 mt-1" title={`Stage ${stage + 1} of ${LIFECYCLE.length}`}>
          {LIFECYCLE.map((l, i) => (
            <span key={l.key} className={`h-1 w-4 rounded-full ${i <= stage ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'}`} />
          ))}
        </div>
      </td>
      <td className="px-2 py-2">
        <select
          value={c.lifecycle ?? ''}
          disabled={project.archived}
          onChange={(e) => patchCase.mutate({ lifecycle: e.target.value as Lifecycle })}
          className={input}
          aria-label={`Stage of ${c.case_id}`}
        >
          {!c.lifecycle && <option value="">Not set</option>}
          {LIFECYCLE.map((l) => (
            <option key={l.key} value={l.key}>
              {l.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <input
          value={assignee}
          disabled={project.archived}
          onChange={(e) => setAssignee(e.target.value)}
          onBlur={saveAssignee}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder="Unassigned"
          maxLength={120}
          className={`${input} w-44`}
          aria-label={`Officer assigned to ${c.case_id}`}
        />
      </td>
      <td className="px-2 py-2">
        <select
          value=""
          disabled={project.archived || others.length === 0}
          onChange={(e) => {
            const t = others.find((o) => o.project_id === e.target.value);
            if (t) move.mutate(t);
          }}
          className={`${input} max-w-[200px]`}
          aria-label={`Move ${c.case_id} to another project`}
        >
          <option value="">{others.length ? 'Choose project…' : 'No other projects'}</option>
          {others.map((o) => (
            <option key={o.project_id} value={o.project_id}>
              {o.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigate(c.case_id);
            setView('triage');
          }}
          title="Open this case's triage board"
        >
          <Network className="w-3.5 h-3.5 mr-1" /> Triage
        </Button>
      </td>
    </tr>
  );
};
