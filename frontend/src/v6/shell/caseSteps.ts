// Single source of truth for the 7 case steps; the rail and the top stepper both import this.
export interface CaseStep {
  id: string;
  label: string;
  views: string[];
}

export const CASE_STEPS: CaseStep[] = [
  { id: 'triage', label: 'Triage', views: ['triage'] },
  { id: 'evidence', label: 'Evidence', views: ['evidence', 'intake'] },
  { id: 'people', label: 'People & accounts', views: ['people', 'entities'] },
  { id: 'money', label: 'Money trail', views: ['money', 'taint-engine'] },
  { id: 'network', label: 'Network', views: ['network'] },
  { id: 'device', label: 'Devices & SIMs', views: ['device', 'handset-sim', 'attribution'] },
  { id: 'actions', label: 'Actions & report', views: ['actions', 'report'] },
];
