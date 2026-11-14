import React, { useState, useMemo } from 'react';
import {
  Send,
  Zap,
  Download,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { PageHead, Card, CardHeader, Button, Chip } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { getCanonicalCase } from '../../fixtures/cases';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatInr } from '../../utils/formatters';

export interface ActionsReportScreenProps {
  initialTab?: 'actions' | 'report';
}

export interface ActionItem {
  id: string;
  name: string;
  account: string;
  amount: number;
  status: 'READY' | 'REQUESTED' | 'FROZEN';
  isMerchant?: boolean;
}

export const ActionsReportScreen: React.FC<ActionsReportScreenProps> = ({ initialTab: _initialTab = 'actions' }) => {
  const { activeCaseId } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const canonical = getCanonicalCase(caseId);
  const { station } = useSettingsStore();

  const [actions, setActions] = useState<ActionItem[]>([
    { id: 'H2', name: 'Rohit Verma', account: 'HDFC Bank ••1992', amount: 120000, status: 'READY' },
    { id: 'H4', name: 'Deepak Meena', account: 'PNB ••4471', amount: 45000, status: 'READY' },
    { id: 'H3', name: 'Sameer Khan', account: 'ICICI Bank ••8129', amount: 35000, status: 'READY' },
    { id: 'APX', name: 'Apex Electronics', account: 'Lien on merchant (not freeze)', amount: 180000, status: 'READY', isMerchant: true },
  ]);

  const [isSimulateEnabled, setIsSimulateEnabled] = useState(false);
  const [isSealed, setIsSealed] = useState(false);

  // Compute frozen total
  const frozenTotal = useMemo(() => {
    return actions
      .filter((a) => a.status === 'FROZEN')
      .reduce((sum, a) => sum + a.amount, 0);
  }, [actions]);

  // Send Freeze Requests Handler
  const handleSendRequests = () => {
    setActions((prev) =>
      prev.map((a) => (a.status === 'READY' ? { ...a, status: 'REQUESTED' } : a))
    );
    setIsSimulateEnabled(true);
    toast.success('4 statutory freeze requests dispatched to nodal bank officers under BNSS §106');
  };

  // Simulate Bank Response Handler
  const handleSimulateResponse = () => {
    let delay = 0;
    actions.forEach((a) => {
      if (a.status === 'REQUESTED') {
        setTimeout(() => {
          setActions((prev) =>
            prev.map((it) => (it.id === a.id ? { ...it, status: 'FROZEN' } : it))
          );
          toast.success(`❄ ${a.name} · ${formatInr(a.amount, { showPaise: false })} secured`);
        }, delay);
        delay += 600;
      }
    });
  };

  // Generate & Seal Report Handler
  const handleSealReport = () => {
    setIsSealed(false);
    setTimeout(() => {
      setIsSealed(true);
      toast.success('Investigation Report cryptographically sealed with SHA-256');
    }, 50);
  };

  const bookedLoss = canonical.financials.bookedLossInr;
  const stationTitle = station.letterheadTitle || 'Cyber Crime Police Station';
  const stationSub = `${station.stationName || 'Noida Cyber Crime PS'}, ${station.district || 'Gautam Buddha Nagar'}, Uttar Pradesh`;

  return (
    <div className="v6-enter space-y-4" data-testid="v6-actions-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 6 · Actions & Report"
        title="Stop the money. Build the case."
      />

      {/* Main Grid: Freeze Requests Card (7 cols) + Paper Admissible Report Card (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Freeze Requests Card (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col justify-between">
            <div>
              <CardHeader
                title="Freeze requests"
                subtitle="Ranked by recoverable amount you can still secure"
                action={
                  <div className="text-right">
                    <div className="v6-card-s text-xs">Frozen so far</div>
                    <div className="v6-mono text-2xl font-extrabold text-[var(--frozen)] leading-none mt-0.5">
                      {formatInr(frozenTotal, { showPaise: false })}
                    </div>
                  </div>
                }
              />

              {/* Action Rows */}
              <div className="space-y-2.5 mt-2">
                {actions.map((act) => {
                  const isFrozen = act.status === 'FROZEN';
                  const isRequested = act.status === 'REQUESTED';

                  return (
                    <div
                      key={act.id}
                      className={clsx(
                        'p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all',
                        isFrozen
                          ? 'border-[var(--frozen)]/40 bg-[var(--frozen-bg)]/30'
                          : 'border-[var(--line)] bg-[var(--surface-2)]'
                      )}
                    >
                      {/* Check Icon */}
                      <div
                        className={clsx(
                          'w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-none border',
                          isFrozen
                            ? 'bg-[var(--frozen)] border-transparent text-[#04202e]'
                            : isRequested
                            ? 'bg-[var(--flow)] border-transparent text-white'
                            : 'border-[var(--line-2)] text-transparent'
                        )}
                      >
                        ✓
                      </div>

                      {/* Name & Account */}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-[var(--fg-1)] truncate">
                          {act.name}
                        </div>
                        <div className="text-xs text-[var(--fg-3)] truncate mt-0.5">
                          {act.account}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="v6-mono font-bold text-sm text-[var(--fg-1)] text-right flex-none">
                        {formatInr(act.amount, { showPaise: false })}
                      </div>

                      {/* Status Chip */}
                      <div className="flex-none">
                        <Chip
                          variant={isFrozen ? 'frozen' : isRequested ? 'urgent' : 'muted'}
                          withDot={isRequested}
                        >
                          {isFrozen ? 'Frozen ❄' : isRequested ? 'Awaiting bank' : 'Ready to send'}
                        </Chip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--line)] mt-4">
              <Button
                variant="primary"
                size="md"
                id="sendBtn"
                icon={<Send className="w-4 h-4" />}
                onClick={handleSendRequests}
              >
                Send freeze requests (BNSS §106)
              </Button>

              <Button
                variant="default"
                size="md"
                id="simBtn"
                disabled={!isSimulateEnabled}
                icon={<Zap className="w-4 h-4 text-cyan-400" />}
                onClick={handleSimulateResponse}
              >
                Simulate bank response
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Paper Admissible Investigation Report Card (5 cols) */}
        <div className="lg:col-span-5">
          <div className="v6-paper">
            {/* Red Circular Seal Stamp */}
            <div
              id="seal"
              className={clsx('v6-seal', isSealed && 'stamp')}
            >
              SEALED
              <br />
              SHA-256
              <br />
              a91f…3c07
            </div>

            {/* Letterhead */}
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
              <Building2 className="w-3.5 h-3.5 text-gray-600" />
              <span>{stationTitle}</span>
            </div>
            <div className="text-[11px] text-gray-500 font-medium mb-3">
              {stationSub}
            </div>

            <div className="text-xl font-extrabold text-gray-900 leading-tight">
              Investigation Report
            </div>
            <div className="text-xs text-gray-600 mt-1 mb-4">
              {canonical.firNumber} · {canonical.title || canonical.typology} · Victim: {canonical.complainant.name}
            </div>

            {/* 3 Metric Summary Boxes */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-gray-100/80 border border-gray-200 mb-4">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  LOSS
                </div>
                <div className="v6-mono font-extrabold text-base text-gray-900 mt-0.5">
                  {formatInr(bookedLoss, { showPaise: false })}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  FROZEN
                </div>
                <div
                  id="repFrozen"
                  className="v6-mono font-extrabold text-base text-blue-700 mt-0.5"
                >
                  {formatInr(frozenTotal, { showPaise: false })}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  MULES
                </div>
                <div className="v6-mono font-extrabold text-base text-gray-900 mt-0.5">
                  4
                </div>
              </div>
            </div>

            {/* Concise Admissible Narrative */}
            <div className="text-xs text-gray-700 leading-relaxed space-y-2 mb-6">
              <p>
                On 22 Sep 2026 the complainant was coerced by threat actors into two unauthorized transfers totalling{' '}
                <b>{formatInr(bookedLoss, { showPaise: false })}</b>.
              </p>
              <p>
                Stolen capital moved through 4 mule accounts within 7 minutes. Hardware telemetrics confirm a single terminal (IMEI ••4564) controls 3 of them.
              </p>
            </div>

            {/* Report Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              <Button
                variant="default"
                size="sm"
                id="genBtn"
                onClick={handleSealReport}
                className="bg-gray-900 text-white border-transparent hover:bg-black"
                icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
              >
                Generate & seal report
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="bg-gray-200 text-gray-800 border-transparent hover:bg-gray-300"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => toast.success('Admissible PDF report downloaded')}
              >
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
