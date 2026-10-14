import { expect, test } from 'bun:test';
import { watchMapReadiness, type MapReadinessClock, type MapReadinessTarget } from './map-readiness';

class FakeMap implements MapReadinessTarget {
  listener: (() => void) | null = null;

  once(_event: 'idle', listener: () => void) {
    this.listener = listener;
    return this;
  }

  off(_event: 'idle', listener: () => void) {
    if (this.listener === listener) this.listener = null;
    return this;
  }

  becomeIdle() {
    const listener = this.listener;
    this.listener = null;
    listener?.();
  }
}

class FakeClock implements MapReadinessClock {
  nextId = 0;
  jobs = new Map<number, () => void>();
  cleared: number[] = [];

  setTimeout(callback: () => void, _delayMs: number) {
    const id = ++this.nextId;
    this.jobs.set(id, callback);
    return id;
  }

  clearTimeout(handle: unknown) {
    const id = Number(handle);
    this.cleared.push(id);
    this.jobs.delete(id);
  }

  fire(id: number) {
    const callback = this.jobs.get(id);
    this.jobs.delete(id);
    callback?.();
  }
}

test('map readiness waits for the first idle event rather than style setup', () => {
  const map = new FakeMap();
  const clock = new FakeClock();
  const states: string[] = [];
  watchMapReadiness(map, state => states.push(state), 10_000, clock);

  expect(states).toEqual([]);
  map.becomeIdle();

  expect(states).toEqual(['ready']);
  expect(clock.cleared).toEqual([1]);
});

test('slow tiles get a visible delayed state and can recover when the map later idles', () => {
  const map = new FakeMap();
  const clock = new FakeClock();
  const states: string[] = [];
  watchMapReadiness(map, state => states.push(state), 10_000, clock);

  clock.fire(1);
  expect(states).toEqual(['delayed']);

  map.becomeIdle();
  expect(states).toEqual(['delayed', 'ready-after-delay']);
});

test('a pending readiness wait can be cancelled safely', () => {
  const map = new FakeMap();
  const clock = new FakeClock();
  const states: string[] = [];
  const cancel = watchMapReadiness(map, state => states.push(state), 10_000, clock);
  cancel();
  clock.fire(1);
  map.becomeIdle();
  expect(states).toEqual([]);
  expect(clock.cleared).toEqual([1]);
});
