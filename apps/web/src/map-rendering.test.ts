import { expect, test } from 'bun:test';
import * as mapPanel from './MapPanel';

const rendering = mapPanel as unknown as {
  getRasterSaturation?: (theme: string, grayPercent: number) => number;
  getProjectionSpec?: (mode: string) => { type: string };
  getStatusAfterMapError?: (status: string) => string;
  isGlobeRendererFailure?: (mode: string, message: string) => boolean;
  isSoftwareWebGLRenderer?: (renderer: string | null) => boolean;
};

test('grayscale percentage changes satellite saturation without muting natural color', () => {
  const getSaturation = rendering.getRasterSaturation;
  expect(typeof getSaturation).toBe('function');
  if (!getSaturation) return;

  expect(getSaturation('satellite', 100)).toBe(0);
  expect(getSaturation('grayscale', 0)).toBe(0);
  expect(getSaturation('grayscale', 50)).toBe(-0.5);
  expect(getSaturation('grayscale', 100)).toBe(-1);
  expect(getSaturation('grayscale', -20)).toBe(0);
  expect(getSaturation('grayscale', 120)).toBe(-1);
});

test('flat and globe choices map to the matching MapLibre projection', () => {
  const getProjectionSpec = rendering.getProjectionSpec;
  expect(typeof getProjectionSpec).toBe('function');
  if (!getProjectionSpec) return;

  expect(getProjectionSpec('flat')).toEqual({ type: 'mercator' });
  expect(getProjectionSpec('globe')).toEqual({ type: 'globe' });
});

test('a late tile error does not mark an already rendered basemap unavailable', () => {
  const getStatus = rendering.getStatusAfterMapError;
  expect(typeof getStatus).toBe('function');
  if (!getStatus) return;

  expect(getStatus('loading')).toBe('error');
  expect(getStatus('ready')).toBe('ready');
});

test('fatal WebGL failures are identified only while using the globe projection', () => {
  const isGlobeFailure = rendering.isGlobeRendererFailure;
  expect(typeof isGlobeFailure).toBe('function');
  if (!isGlobeFailure) return;

  expect(isGlobeFailure('globe', 'Could not compile fragment shader')).toBe(true);
  expect(isGlobeFailure('globe', 'WebGL context lost')).toBe(true);
  expect(isGlobeFailure('globe', 'Failed to load raster tile')).toBe(false);
  expect(isGlobeFailure('flat', 'Could not compile fragment shader')).toBe(false);
});

test('known software WebGL renderers are not offered expensive globe rendering', () => {
  const isSoftwareRenderer = rendering.isSoftwareWebGLRenderer;
  expect(typeof isSoftwareRenderer).toBe('function');
  if (!isSoftwareRenderer) return;

  expect(isSoftwareRenderer('ANGLE (SwiftShader Device)')).toBe(true);
  expect(isSoftwareRenderer('llvmpipe (LLVM 18.1, 256 bits)')).toBe(true);
  expect(isSoftwareRenderer('NVIDIA GeForce RTX')).toBe(false);
  expect(isSoftwareRenderer(null)).toBe(false);
});
