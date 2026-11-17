import { describe, it, expect } from 'vitest';
import { answerCaseQuestion, getCaseWelcome, getSuggestedQuestions } from '../caseAssistantEngine';
import { getCanonicalCase } from '../../../fixtures/cases';

const FORBIDDEN = ['Vikram Shah', 'Sunil Kumar', '85,00,000'];

function allText(caseId: string): string {
  const a = answerCaseQuestion(caseId, 'Which accounts are mules and how much did each receive?');
  const w = getCaseWelcome(caseId, 'money', 'Insp.');
  const s = getSuggestedQuestions(caseId, 'money').map((x) => x.q);
  return [a.text, ...a.observedFacts, w.text, ...w.observedFacts, ...s].join('\n');
}

describe('case assistant isolation (CASE-2026-003)', () => {
  it('mule answer lists only case-003 accounts with inflows', () => {
    const a = answerCaseQuestion('CASE-2026-003', 'Which accounts are mules and how much did each receive?');
    expect(a.intent).toBe('mules');
    const joined = a.observedFacts.join('\n');
    expect(joined).toContain('Apex Investment Pool');
    expect(joined).toContain('Sanjay Goel');
    expect(joined).toContain('₹12,50,000'); // Apex inflow from victim
  });
  it('never leaks other-case names or figures into any 003 output', () => {
    const text = allText('CASE-2026-003');
    for (const bad of FORBIDDEN) expect(text).not.toContain(bad);
    expect(text).toContain('Ramesh Singhal');
  });
  it('unknown question says it has no evidence', () => {
    expect(answerCaseQuestion('CASE-2026-003', 'what is the weather').text).toMatch(/don't have evidence/);
  });
  it('recoverable uses fixture financials', () => {
    const fx = getCanonicalCase('CASE-2026-003');
    const a = answerCaseQuestion('CASE-2026-003', 'how much is recoverable?');
    expect(a.observedFacts.join('\n')).toContain(fx.financials.recoverableLibrInr.toLocaleString('en-IN'));
  });
});

describe('assistant languages', () => {
  it('answers in Hindi and Tamil with the same case figures', () => {
    const en = answerCaseQuestion('CASE-2026-002', 'how much is recoverable?', 'en');
    const hi = answerCaseQuestion('CASE-2026-002', 'कितना वापस मिल सकता है?', 'hi');
    const ta = answerCaseQuestion('CASE-2026-002', 'எவ்வளவு மீட்க முடியும்?', 'ta');
    expect(hi.intent).toBe('recoverable');
    expect(ta.intent).toBe('recoverable');
    expect(hi.text).toMatch(/वसूल/);
    expect(ta.text).toMatch(/மீட்க/);
    const amounts = (s: string) => s.match(/₹[\d,]+/g);
    expect(amounts(hi.text)).toEqual(amounts(en.text));
    expect(amounts(ta.text)).toEqual(amounts(en.text));
  });
});
