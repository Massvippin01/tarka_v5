import { describe, expect, it } from 'vitest';
import { formatGoldenHour } from '../goldenHour';
import {
  buildSwitcherCases, goldenLabel, groupCases, highlightParts, matchesQuery, visibleGroups,
} from '../caseSwitcherModel';

const projects = [{ project_id: 'p1', name: 'Operation Jamtara' }];
const input = {
  workspaces: [
    { caseId: 'CASE-2026-001', title: 'Digital arrest', firNumber: 'FIR #149/2026', complainantName: 'Dr. Meenakshi Rao', typology: 'DIGITAL_ARREST' },
    { caseId: 'CASE-2026-002', title: 'SIM swap', firNumber: 'FIR #7', complainantName: 'Sunil Kumar' },
  ],
  registered: [
    { case_id: 'CASE-2026-309C065A', title: 'Jamtara ring', project_id: 'p1', lifecycle: 'INVESTIGATING', assignee: 'IO Das' },
    { case_id: 'CASE-NEW-1', title: 'Fresh', project_id: null, lifecycle: 'INTAKE' },
  ],
  projects,
  summary: [
    { caseId: 'CASE-2026-309C065A', complainantName: 'Pooja Verma', bookedLossInr: 5_000_000, recoverableInr: 3_000_000, frozenInr: 1_000_000, mules: 12, networks: 3, goldenHour: { remainingMins: 118 } },
  ],
  sampleFigures: () => ({ lossInr: 10 }),
  golden: (_id: string, mins: number | undefined) => formatGoldenHour(mins ?? 0),
};
const cases = buildSwitcherCases(input);

describe('case switcher model', () => {
  it('merges fixtures, project-store rows and the summary without duplicates', () => {
    expect(cases.map((c) => c.caseId).sort()).toEqual(['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-309C065A', 'CASE-NEW-1']);
    const j = cases.find((c) => c.caseId === 'CASE-2026-309C065A')!;
    expect(j).toMatchObject({ complainant: 'Pooja Verma', projectName: 'Operation Jamtara', lifecycle: 'INVESTIGATING', isSample: false });
    expect(j.figures).toEqual({ lossInr: 5_000_000, freezableInr: 2_000_000, mules: 12, networks: 3 });
    expect(cases.find((c) => c.caseId === 'CASE-NEW-1')!.figures).toEqual({});
  });

  it('groups by project, then no project, samples last', () => {
    expect(groupCases(cases, projects).map((g) => g.label)).toEqual(['Operation Jamtara', 'No project', 'Sample cases']);
  });

  it('searches id, FIR, complainant, title and project', () => {
    const f = (q: string) => cases.filter((c) => matchesQuery(c, q)).map((c) => c.caseId);
    expect(f('309c')).toEqual(['CASE-2026-309C065A']);
    expect(f('149/2026')).toEqual(['CASE-2026-001']);
    expect(f('sunil')).toEqual(['CASE-2026-002']);
    expect(f('fresh')).toEqual(['CASE-NEW-1']);
    expect(f('jamtara')).toEqual(['CASE-2026-309C065A']);
  });

  it('recent keeps last-opened order; pinned filters', () => {
    const r = visibleGroups(cases, projects, 'RECENT', '', ['CASE-NEW-1', 'CASE-2026-001'], []);
    expect(r[0].cases.map((c) => c.caseId)).toEqual(['CASE-NEW-1', 'CASE-2026-001']);
    const p = visibleGroups(cases, projects, 'PINNED', '', [], ['CASE-2026-002']);
    expect(p.flatMap((g) => g.cases.map((c) => c.caseId))).toEqual(['CASE-2026-002']);
  });

  it('highlights matches', () => {
    expect(highlightParts('Pooja Verma', 'ver')).toEqual([{ text: 'Pooja ', hit: false }, { text: 'Ver', hit: true }, { text: 'ma', hit: false }]);
    expect(highlightParts('abc', '')).toEqual([{ text: 'abc', hit: false }]);
  });

  it('golden-hour label comes from the shared formatter', () => {
    expect(goldenLabel(formatGoldenHour(118))).toBe('1h 58m left');
    expect(goldenLabel(formatGoldenHour(0))).toBe('Expired');
    expect(cases.find((c) => c.caseId === 'CASE-2026-309C065A')!.golden.text).toBe('1h 58m');
  });
});
