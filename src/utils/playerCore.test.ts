/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTimecode,
  calculateVideoDimensions,
  getFrameDuration,
  stepPlaybackRate,
  getHardwareProfile,
  parseSrt,
} from './playerCore.ts';

test('formatTimecode formats standard seconds correctly', () => {
  assert.equal(formatTimecode(0), '00:00');
  assert.equal(formatTimecode(65), '01:05');
  assert.equal(formatTimecode(3665), '01:01:05');
  assert.equal(formatTimecode(30, true), '00:00:30');
});

test('calculateVideoDimensions letterbox and pillarbox calculations', () => {
  // 16:9 video in 16:9 container -> exact match
  const match = calculateVideoDimensions(1920, 1080, 1920, 1080, 'keep');
  assert.equal(match.renderWidth, 1920);
  assert.equal(match.renderHeight, 1080);
  assert.equal(match.offsetX, 0);
  assert.equal(match.offsetY, 0);

  // 16:9 video inside 4:3 container -> letterbox top/bottom
  const letterbox = calculateVideoDimensions(1920, 1080, 800, 600, 'keep');
  assert.equal(letterbox.renderWidth, 800);
  assert.equal(letterbox.renderHeight, 450);
  assert.equal(letterbox.offsetX, 0);
  assert.equal(letterbox.offsetY, 75);

  // 4:3 video inside 16:9 container -> pillarbox left/right
  const pillarbox = calculateVideoDimensions(800, 600, 1920, 1080, 'keep');
  assert.equal(pillarbox.renderHeight, 1080);
  assert.equal(pillarbox.renderWidth, 1440);
  assert.equal(pillarbox.offsetX, 240);
  assert.equal(pillarbox.offsetY, 0);

  // Fill mode fills container completely
  const fill = calculateVideoDimensions(1920, 1080, 800, 600, 'fill');
  assert.equal(fill.renderWidth, 800);
  assert.equal(fill.renderHeight, 600);
  assert.equal(fill.offsetX, 0);
  assert.equal(fill.offsetY, 0);
});

test('getFrameDuration returns correct inverse of fps', () => {
  const d24 = getFrameDuration(24);
  assert.ok(Math.abs(d24 - 1 / 24) < 0.0001);

  const d60 = getFrameDuration(60);
  assert.ok(Math.abs(d60 - 1 / 60) < 0.0001);
});

test('stepPlaybackRate steps up and down monotonically', () => {
  assert.equal(stepPlaybackRate(1.0, 'up'), 1.25);
  assert.equal(stepPlaybackRate(1.25, 'up'), 1.5);
  assert.equal(stepPlaybackRate(4.0, 'up'), 4.0); // clamped at max

  assert.equal(stepPlaybackRate(1.0, 'down'), 0.75);
  assert.equal(stepPlaybackRate(0.25, 'down'), 0.25); // clamped at min
});

test('getHardwareProfile resolves correct backends for Windows, macOS, Linux', () => {
  const win = getHardwareProfile('windows', 'd3d11va');
  assert.equal(win.os, 'windows');
  assert.equal(win.backend, 'Direct3D 11/12');
  assert.equal(win.zeroCopy, true);

  const mac = getHardwareProfile('macos');
  assert.equal(mac.os, 'macos');
  assert.equal(mac.decoder, 'videotoolbox');
  assert.equal(mac.backend, 'Metal');

  const linux = getHardwareProfile('linux', 'vaapi');
  assert.equal(linux.os, 'linux');
  assert.equal(linux.decoder, 'vaapi');
  assert.equal(linux.backend, 'Vulkan');

  const sw = getHardwareProfile('windows', 'software');
  assert.equal(sw.decoder, 'software');
  assert.equal(sw.zeroCopy, false);
});

test('parseSrt parses SRT text into timestamped cues', () => {
  const sample = `
1
00:00:01,500 --> 00:00:04,200
Welcome to Media Player Classic - Home Cinema!

2
00:00:05,000 --> 00:00:08,000
Rebuilt in Rust with Hardware Acceleration.
`;
  const cues = parseSrt(sample);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].startTime, 1.5);
  assert.equal(cues[0].endTime, 4.2);
  assert.equal(cues[0].text, 'Welcome to Media Player Classic - Home Cinema!');
  assert.equal(cues[1].startTime, 5.0);
  assert.equal(cues[1].endTime, 8.0);
});
