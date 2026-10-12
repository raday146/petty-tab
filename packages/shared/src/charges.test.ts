import { describe, expect, it } from 'vitest';
import { canUndo, PLEA_MS, transition, UNDO_MS } from './charges.ts';

const fresh = 1000;

describe('transition: the plea state machine (spec §8)', () => {
  it.each([
    ['pending', 'accused', 'guilty', 'guilty'],
    ['pending', 'accused', 'appeal', 'appealed'],
    ['appealed', 'filer', 'uphold', 'upheld'],
    ['appealed', 'filer', 'drop', 'dropped'],
  ] as const)('%s --%s %s--> %s', (status, actor, action, next) => {
    expect(transition(status, actor, action, fresh)).toEqual({ status: next });
  });

  it('lets only the accused plead', () => {
    expect(transition('pending', 'filer', 'guilty', fresh)).toEqual({ error: 'not_allowed' });
    expect(transition('pending', 'filer', 'appeal', fresh)).toEqual({ error: 'not_allowed' });
  });

  it('lets only the filer decide an appeal', () => {
    expect(transition('appealed', 'accused', 'uphold', fresh)).toEqual({ error: 'not_allowed' });
    expect(transition('appealed', 'accused', 'drop', fresh)).toEqual({ error: 'not_allowed' });
  });

  it.each(['guilty', 'appealed', 'upheld', 'dropped'] as const)('refuses a second plea on %s', (status) => {
    expect(transition(status, 'accused', 'guilty', fresh)).toEqual({ error: 'already_pleaded' });
    expect(transition(status, 'accused', 'appeal', fresh)).toEqual({ error: 'already_pleaded' });
  });

  it.each(['pending', 'guilty', 'upheld', 'dropped'] as const)('refuses a decision on %s', (status) => {
    expect(transition(status, 'filer', 'uphold', fresh)).toEqual({ error: 'not_allowed' });
    expect(transition(status, 'filer', 'drop', fresh)).toEqual({ error: 'not_allowed' });
  });

  it('counts 24 hours of silence as a guilty plea, so a late plea is refused', () => {
    expect(transition('pending', 'accused', 'appeal', PLEA_MS - 1)).toEqual({ status: 'appealed' });
    expect(transition('pending', 'accused', 'appeal', PLEA_MS)).toEqual({ error: 'already_pleaded' });
    expect(transition('pending', 'accused', 'guilty', PLEA_MS)).toEqual({ error: 'already_pleaded' });
  });

  it('has no time limit on deciding an appeal', () => {
    expect(transition('appealed', 'filer', 'uphold', 6 * PLEA_MS)).toEqual({ status: 'upheld' });
  });
});

describe('canUndo (spec §8)', () => {
  it('allows undo of a pending charge for 10 seconds', () => {
    expect(canUndo('pending', 0)).toBeNull();
    expect(canUndo('pending', UNDO_MS - 1)).toBeNull();
    expect(canUndo('pending', UNDO_MS)).toBe('undo_expired');
  });

  it.each(['guilty', 'appealed'] as const)('refuses undo once the accused pleaded (%s)', (status) => {
    expect(canUndo(status, fresh)).toBe('already_pleaded');
  });
});
