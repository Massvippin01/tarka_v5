import { describe, expect, it } from 'vitest';
import { upiHandleOf } from '../upiHandles';

describe('upiHandleOf', () => {
  it('maps documented handles to their bank', () => {
    expect(upiHandleOf('mule1@okhdfcbank')).toEqual({ handle: 'okhdfcbank', bank: 'HDFC Bank' });
    expect(upiHandleOf('a@OKSBI')?.bank).toBe('State Bank of India');
    expect(upiHandleOf('a@ibl')?.bank).toBe('ICICI Bank'); // PhonePe/ICICI, not IndusInd
    expect(upiHandleOf('a@ybl')?.bank).toBe('Yes Bank');
  });
  it('leaves unknown handles and non-VPAs unknown', () => {
    expect(upiHandleOf('a@zzpsp')).toEqual({ handle: 'zzpsp', bank: null });
    expect(upiHandleOf('Ravi Kumar')).toBeNull();
  });
});
