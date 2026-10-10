import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortVersions } from '../src/versions.js';

test('spec: pre-release precedence', () => {
  assert.deepEqual(
    sortVersions(['1.0.0', '1.0.0-rc.1', '1.0.0-beta.11', '1.0.0-beta.2', '1.0.0-beta', '1.0.0-alpha.beta', '1.0.0-alpha.1', '1.0.0-alpha']),
    ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'],
  );
  assert.deepEqual(sortVersions(['2.0.0', '2.0.0-0.3.7', '2.0.0-x.7.z.92', '2.0.0-alpha']), ['2.0.0-0.3.7', '2.0.0-alpha', '2.0.0-x.7.z.92', '2.0.0']);
  assert.deepEqual(sortVersions(['1.0.0-rc.10', '1.0.0-rc.9', '1.0.0-rc.1']), ['1.0.0-rc.1', '1.0.0-rc.9', '1.0.0-rc.10']);
});

test('spec: core versions and build metadata', () => {
  assert.deepEqual(sortVersions(['10.0.0', '2.0.0', '1.0.0', '1.0.10', '1.0.2']), ['1.0.0', '1.0.2', '1.0.10', '2.0.0', '10.0.0']);
  assert.deepEqual(sortVersions(['1.1.0+build.9', '1.0.0+build.1', '1.0.1']), ['1.0.0+build.1', '1.0.1', '1.1.0+build.9']);
  assert.deepEqual(sortVersions(['3.0.0-beta+exp.sha.5114f85', '3.0.0-alpha+001', '3.0.0']), ['3.0.0-alpha+001', '3.0.0-beta+exp.sha.5114f85', '3.0.0']);
});
