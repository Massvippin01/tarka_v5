import React, { useMemo } from 'react';
import {
  ArrowRight,
  Smartphone,
  Wifi,
  Radio,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { PageHead, FindingStrip, Card, CardHeader, Button, Chip } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';

export const DeviceSimScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';

  const deviceData = useMemo(() => {
    if (caseId === 'CASE-2026-001') {
      return {
        imei: '8674 9206 1234 564',
        imeiMasked: '8674 9206 ••4564',
        tac: '867492',
        model: 'OnePlus Nord CE 5G (EB2101)',
        os: 'Android 14 (OxygenOS 14.0)',
        bssid: '74:DA:38:A2:11:BC',
        hotspotSsid: 'JioFiber-5G-Secure',
        ipdr: '103.21.144.92:44102',
        ja4Tls: 't13d1516h2_8daaf6',
        associatedAccounts: [
          { name: 'Vikram Shah', bank: 'Axis Bank', account: '••0291', role: 'Layer-1 Mule' },
          { name: 'Rohit Verma', bank: 'HDFC Bank', account: '••1992', role: 'Layer-2 Mule' },
          { name: 'Deepak Meena', bank: 'Punjab National Bank', account: '••4471', role: 'Sink Account' },
        ],
        simSwaps: [
          { time: '18 Sep 2026 14:22 IST', simNo: '8991 0021 ••4912', msisdn: '+91 98101 99412', carrier: 'Reliance Jio', status: 'Swapped into IMEI', subscriber: 'Rohit Verma' },
          { time: '20 Sep 2026 09:14 IST', simNo: '8991 0044 ••3381', msisdn: '+91 97110 33819', carrier: 'Vodafone Idea', status: 'Swapped into IMEI', subscriber: 'Deepak Meena' },
          { time: '22 Sep 2026 08:30 IST', simNo: '8991 0012 ••2394', msisdn: '+91 98711 23941', carrier: 'Bharti Airtel', status: 'Active fraud session', subscriber: 'Vikram Shah' },
        ],
      };
    }

    return {
      imei: '8611 4402 9912 334',
      imeiMasked: '8611 4402 ••2334',
      tac: '861144',
      model: 'Redmi Note 12 5G',
      os: 'Android 13',
      bssid: 'A4:12:42:99:EE:10',
      hotspotSsid: 'Public-Wi-Fi',
      ipdr: '49.36.12.84:55192',
      ja4Tls: 't13d1516h2_standard',
      associatedAccounts: [
        { name: 'Primary Accused', bank: 'Beneficiary Bank', account: '••9912', role: 'Accused' },
      ],
      simSwaps: [
        { time: '21 Sep 2026 11:00 IST', simNo: '8991 0088 ••1192', msisdn: '+91 99120 44921', carrier: 'Bharti Airtel', status: 'Active session', subscriber: 'Beneficiary' },
      ],
    };
  }, [caseId]);

  return (
    <div className="v6-enter space-y-4" data-testid="v6-device-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 5 · Device & SIM"
        title="Which hardware moved the funds?"
      />

      {/* Finding Strip */}
      <FindingStrip
        variant="warn"
        icon={<AlertTriangle className="w-4 h-4" />}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveView('actions')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            iconPosition="right"
          >
            Take statutory action
          </Button>
        }
      >
        1 handset IMEI and 1 Wi-Fi BSSID correlated with <b>3 mule accounts</b>. Carrier CDR confirms{' '}
        <b>3 SIM swaps</b> within 72 hours.
      </FindingStrip>

      {/* Main Grid: Hardware Terminal Card (6 cols) + Telemetry Funnel (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Handset Hardware Terminal Card (6 cols) */}
        <div className="lg:col-span-6">
          <Card className="h-full flex flex-col">
            <CardHeader
              title="Corroborated Handset Terminal"
              subtitle="Physical hardware identification from telecom CGNAT & IPDR logs"
              action={<Chip variant="risk">Shared Terminal</Chip>}
            />

            <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--risk-bg)] text-[var(--risk)] flex items-center justify-center flex-none">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm text-[var(--fg-1)] truncate">
                    {deviceData.model}
                  </div>
                  <div className="text-xs text-[var(--fg-3)]">
                    OS: {deviceData.os} · TAC: {deviceData.tac}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--line)] text-xs">
                <div>
                  <div className="text-[var(--fg-3)] font-medium">Hardware IMEI</div>
                  <div className="v6-mono font-bold text-[var(--fg-1)] mt-0.5">
                    {deviceData.imeiMasked}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--fg-3)] font-medium">Wi-Fi Gateway (BSSID)</div>
                  <div className="v6-mono font-bold text-[var(--fg-1)] mt-0.5">
                    {deviceData.bssid}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--fg-3)] font-medium">Network Fingerprint (JA4)</div>
                  <div className="v6-mono text-[11.5px] font-bold text-[var(--flow-2)] mt-0.5">
                    {deviceData.ja4Tls}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--fg-3)] font-medium">External IPDR Port</div>
                  <div className="v6-mono text-[11.5px] font-bold text-[var(--fg-2)] mt-0.5">
                    {deviceData.ipdr}
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Accounts Controlled by this Handset */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[var(--fg-1)] mb-2 uppercase tracking-wider">
                  Mule Accounts Controlled from this Terminal
                </div>
                <div className="space-y-2">
                  {deviceData.associatedAccounts.map((acc, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-[var(--surface-3)] border border-[var(--line)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[var(--fg-1)]">{acc.name}</span>
                        <span className="text-[var(--fg-3)] ml-2">
                          {acc.bank} <span className="v6-mono font-semibold">{acc.account}</span>
                        </span>
                      </div>
                      <Chip variant="risk">{acc.role}</Chip>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-none" />
                <span>Device identified in <b>FIR #89/2026</b> (Gurugram) & <b>FIR #112/2026</b> (Jaipur).</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Telemetry Correlation Funnel Card (6 cols) */}
        <div className="lg:col-span-6">
          <Card className="h-full flex flex-col">
            <CardHeader
              title="Telemetry Correlation Hierarchy"
              subtitle="Stepwise convergence from cell tower radio to authenticated banking app"
            />

            <div className="space-y-3 flex-1 flex flex-col justify-center py-2">
              {[
                {
                  step: '01',
                  icon: <Radio className="w-4 h-4" />,
                  title: 'Cell Tower Geofence (CDR)',
                  desc: 'Sector Antenna Noida Sec 62 · Azimuth 120° · Lat 28.628, Lng 77.364',
                  highlight: 'Physical location triangulated within 250m radius',
                },
                {
                  step: '02',
                  icon: <Wifi className="w-4 h-4" />,
                  title: 'Local Wi-Fi Gateway Hotspot',
                  desc: `BSSID ${deviceData.bssid} · SSID "${deviceData.hotspotSsid}"`,
                  highlight: 'All 3 mule accounts connected through this exact MAC gateway',
                },
                {
                  step: '03',
                  icon: <Layers className="w-4 h-4" />,
                  title: 'CGNAT Carrier NAT & IPDR Port Allocation',
                  desc: `Public IPv4 ${deviceData.ipdr} · Session established 22 Sep 08:30 IST`,
                  highlight: 'DoT Section 94 telecom log verification matches NPCI transaction timestamp',
                },
                {
                  step: '04',
                  icon: <Smartphone className="w-4 h-4" />,
                  title: 'Client Device Hardware & Core Banking App',
                  desc: `Hardware IMEI ${deviceData.imeiMasked} · TLS JA4: ${deviceData.ja4Tls}`,
                  highlight: 'Axis, HDFC, and PNB banking credentials sent from single terminal',
                },
              ].map((lvl, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--flow-bg)] text-[var(--flow-2)] flex items-center justify-center font-bold text-xs flex-none mt-0.5">
                    {lvl.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[var(--fg-1)]">{lvl.title}</span>
                    </div>
                    <div className="text-[11.5px] text-[var(--fg-3)] mt-0.5">
                      {lvl.desc}
                    </div>
                    <div className="text-[11px] font-semibold text-[var(--safe)] mt-1">
                      ✓ {lvl.highlight}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* SIM-Swap & Telecom CDR Timeline Card */}
      <Card>
        <CardHeader
          title="SIM-Swap & Telecom CDR Timeline"
          subtitle="Chronological records of SIM cards inserted into this handset"
          action={<Chip variant="urgent">3 Carrier Transitions</Chip>}
        />

        <div className="v6-table-wrap">
          <table className="v6-table">
            <thead>
              <tr>
                <th>Timestamp (IST)</th>
                <th>Subscriber Name</th>
                <th>MSISDN (Mobile)</th>
                <th>SIM Card ICCID</th>
                <th>Carrier</th>
                <th>Operational Status</th>
              </tr>
            </thead>
            <tbody>
              {deviceData.simSwaps.map((sim, i) => (
                <tr key={i} className="row">
                  <td className="v6-mono text-xs text-[var(--fg-3)]">{sim.time}</td>
                  <td className="font-bold text-xs text-[var(--fg-1)]">{sim.subscriber}</td>
                  <td className="v6-mono text-xs font-semibold text-[var(--fg-1)]">{sim.msisdn}</td>
                  <td className="v6-mono text-xs text-[var(--fg-3)]">{sim.simNo}</td>
                  <td className="text-xs text-[var(--fg-2)]">{sim.carrier}</td>
                  <td>
                    <Chip variant={sim.status.includes('Active') ? 'risk' : 'urgent'}>
                      {sim.status}
                    </Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
