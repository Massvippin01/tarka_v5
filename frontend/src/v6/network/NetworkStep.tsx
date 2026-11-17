import React, { Suspense, lazy, useState } from 'react';
import { Network, Workflow } from 'lucide-react';
import { PageHead, Skeleton } from '../ui';

// sigma/WebGL only loads when the explorer tab is opened
const NetworkExplorer = lazy(() => import('./NetworkExplorer'));

type Tab = 'diagram' | 'explorer';

/** "Network" step: the case diagram (FraudNetworkScreen) plus the WebGL explorer of every linked account. */
export const NetworkStep: React.FC<{ diagram: (viewSwitch: React.ReactNode) => React.ReactNode }> = ({ diagram }) => {
  const params = new URLSearchParams(window.location.search);
  // The money network is the default; the device/link diagram is the second tab.
  const [tab, setTab] = useState<Tab>(params.get('netview') === 'diagram' && !params.has('stress') ? 'diagram' : 'explorer');
  const pick = (t: Tab) => {
    setTab(t);
    const u = new URL(window.location.href);
    if (t === 'diagram') u.searchParams.set('netview', t);
    else u.searchParams.delete('netview');
    window.history.replaceState(window.history.state, '', u);
  };
  const tabs: [Tab, string, string, React.ReactNode][] = [
    ['explorer', 'Money networks', 'Every gang in this case and who paid whom', <Network key="e" className="w-3.5 h-3.5" />],
    ['diagram', 'Devices & links', 'Shared phones, Wi-Fi and other device links between accounts', <Workflow key="d" className="w-3.5 h-3.5" />],
  ];
  const viewSwitch = (
      <div role="tablist" aria-label="Network views" className="v6-glass inline-flex rounded-xl p-1 gap-1 flex-none">
        {tabs.map(([id, label, hint, icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            title={hint}
            onClick={() => pick(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
              tab === id ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--hover)]'
            }`}
            data-testid={`v6-network-tab-${id}`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
  );
  // The switch sits in the page heading's action area, so the title stays first on the page.
  return tab === 'diagram' ? (
    <>{diagram(viewSwitch)}</>
  ) : (
    <div className="v6-enter space-y-3">
      <PageHead kicker="Step 4 · Network" title="Who is connected to whom?" actions={viewSwitch} />
        <Suspense fallback={<Skeleton className="h-[calc(100vh-220px)] min-h-[480px] rounded-2xl" />}>
          <NetworkExplorer />
        </Suspense>
    </div>
  );
};
