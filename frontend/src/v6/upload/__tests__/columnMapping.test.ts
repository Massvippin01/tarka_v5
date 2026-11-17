import { describe, expect, it } from 'vitest';
import { guessMapping, mappingBody, validateMapping } from '../columnMapping';

const headers = ['Txn Posted On', 'Txn Time', 'Withdrawal Amt', 'Beneficiary VPA', 'UTR No', 'Remarks'];

describe('column mapping', () => {
  it('guesses obvious columns without reusing a header', () => {
    const g = guessMapping(headers);
    expect(g).toMatchObject({ date: 'Txn Posted On', time: 'Txn Time', amount: 'Withdrawal Amt', ref: 'UTR No', payee: 'Beneficiary VPA' });
    expect(new Set(Object.values(g)).size).toBe(Object.values(g).length);
  });

  it('requires date and amount', () => {
    expect(validateMapping({}, headers)).toHaveLength(2);
    expect(validateMapping({ date: 'Txn Posted On', amount: 'Withdrawal Amt' }, headers)).toEqual([]);
  });

  it('rejects unknown headers and a header used twice', () => {
    const e = validateMapping({ date: 'Nope', amount: 'Withdrawal Amt', payer: 'Withdrawal Amt' }, headers);
    expect(e.some((x) => x.includes('"Nope" is not a column'))).toBe(true);
    expect(e.some((x) => x.includes('used for both'))).toBe(true);
  });

  it('drops blank fields and blank template names from the body', () => {
    expect(mappingBody({ date: 'a', amount: 'b', payer: '' }, '  ')).toEqual({ columns: { date: 'a', amount: 'b' } });
    expect(mappingBody({ date: 'a', amount: 'b' }, ' HDFC ')).toEqual({ columns: { date: 'a', amount: 'b' }, template_name: 'HDFC' });
  });
});
