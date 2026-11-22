import { beforeEach, describe, expect, it, vi } from 'vitest';

const ctor = vi.hoisted(() => vi.fn());
vi.mock('maplibre-gl', () => ({ Map: ctor }));

import { createMap } from './safeMap';

const container = { replaceChildren: vi.fn() };
const options = { container } as unknown as Parameters<typeof createMap>[0];

describe('createMap', () => {
  beforeEach(() => { ctor.mockReset(); container.replaceChildren.mockReset(); });

  it('returns the map when WebGL works', () => {
    const map = {};
    ctor.mockImplementation(function () { return map; });
    expect(createMap(options)).toBe(map);
    expect(container.replaceChildren).not.toHaveBeenCalled();
  });

  it.each([
    ['plain', 'Failed to initialize WebGL'],
    ['with the context error', JSON.stringify({ type: 'webglcontextcreationerror', message: 'Failed to initialize WebGL' })],
  ])('returns null and clears the half-built map without WebGL (%s)', (_, message) => {
    ctor.mockImplementation(function () { throw new Error(message); });
    expect(createMap(options)).toBeNull();
    expect(container.replaceChildren).toHaveBeenCalledOnce();
  });

  it('does not hide any other error', () => {
    ctor.mockImplementation(function () { throw new Error('Invalid LngLat'); });
    expect(() => createMap(options)).toThrow('Invalid LngLat');
  });
});
