/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTimecode,
  parseTimecodeToSeconds,
  frameToSeconds,
  secondsToFrame,
  evaluateAbLoop,
  getActiveChapter,
  calculatePanScanTransform,
  calculateColorFilterCss,
  calculateVideoDimensions,
  getFrameDuration,
  stepPlaybackRate,
  getHardwareProfile,
  parseSrt,
  shiftSubtitleCues,
  exportSrt,
  DEFAULT_PAN_SCAN,
  DEFAULT_COLOR_CONTROLS,
} from './playerCore.ts';

test('formatTimecode formats MM:SS and HH:MM:SS and milliseconds properly', () => {
  assert.equal(formatTimecode(0), '00:00');
  assert.equal(formatTimecode(65), '01:05');
  assert.equal(formatTimecode(3661), '01:01:01');
  assert.equal(formatTimecode(45, true), '00:00:45');
  assert.equal(formatTimecode(65.25, false, true), '01:05.250');
  assert.equal(formatTimecode(-10), '00:00');
});

test('parseTimecodeToSeconds parses HH:MM:SS, MM:SS, and raw seconds', () => {
  assert.equal(parseTimecodeToSeconds('01:02:03.500'), 3723.5);
  assert.equal(parseTimecodeToSeconds('02:30'), 150);
  assert.equal(parseTimecodeToSeconds('42.5'), 42.5);
  assert.equal(parseTimecodeToSeconds('invalid'), null);
});

test('frameToSeconds and secondsToFrame convert accurately', () => {
  assert.equal(frameToSeconds(240, 24), 10);
  assert.equal(secondsToFrame(10, 24), 240);
});

test('evaluateAbLoop enforces A-B repeat boundaries', () => {
  assert.equal(evaluateAbLoop(15.2, 5.0, 15.0), 5.0);
  assert.equal(evaluateAbLoop(10.0, 5.0, 15.0), null);
  assert.equal(evaluateAbLoop(10.0, null, 15.0), null);
});

test('getActiveChapter resolves active chapter by playback time', () => {
  const chapters = [
    { id: 'c1', title: 'Prologue', time: 0 },
    { id: 'c2', title: 'Bridge Assault', time: 60 },
    { id: 'c3', title: 'Finale', time: 180 },
  ];
  assert.equal(getActiveChapter(chapters, 35)?.title, 'Prologue');
  assert.equal(getActiveChapter(chapters, 120)?.title, 'Bridge Assault');
  assert.equal(getActiveChapter(chapters, 200)?.title, 'Finale');
});

test('calculatePanScanTransform and calculateColorFilterCss build valid transforms', () => {
  const transform = calculatePanScanTransform({
    ...DEFAULT_PAN_SCAN,
    zoomX: 1.25,
    zoomY: 1.25,
    rotation: 90,
    flipHorizontal: true,
  });
  assert.ok(transform.includes('rotate(90deg)'));
  assert.ok(transform.includes('scale(-1.250, 1.250)'));

  const filter = calculateColorFilterCss({
    ...DEFAULT_COLOR_CONTROLS,
    brightness: 10,
    contrast: -5,
  });
  assert.equal(filter, 'brightness(110%) contrast(95%) saturate(100%) hue-rotate(0deg)');
});

test('calculateVideoDimensions computes accurate letterboxing and pillarboxing', () => {
  const dims1 = calculateVideoDimensions(1920, 1080, 1920, 1080, 'keep');
  assert.deepEqual(dims1, {
    renderWidth: 1920,
    renderHeight: 1080,
    offsetX: 0,
    offsetY: 0,
  });

  const dims2 = calculateVideoDimensions(1920, 1080, 1600, 1200, 'keep');
  assert.equal(dims2.renderWidth, 1600);
  assert.equal(dims2.renderHeight, 900);
  assert.equal(dims2.offsetX, 0);
  assert.equal(dims2.offsetY, 150);
});

test('getFrameDuration and stepPlaybackRate compute accurate stepping', () => {
  const dur24 = getFrameDuration(24);
  assert.ok(Math.abs(dur24 - 0.041666) < 0.001);

  assert.equal(stepPlaybackRate(1.0, 'up'), 1.1);
  assert.equal(stepPlaybackRate(1.0, 'down'), 0.9);
  assert.equal(stepPlaybackRate(8.0, 'up'), 8.0);
  assert.equal(stepPlaybackRate(0.125, 'down'), 0.125);
});

test('getHardwareProfile maps OS to native hardware acceleration backend', () => {
  const winHw = getHardwareProfile('windows');
  assert.equal(winHw.decoder, 'd3d11va');
  assert.equal(winHw.backend, 'Direct3D 11/12');
  assert.equal(winHw.zeroCopy, true);

  const macHw = getHardwareProfile('macos');
  assert.equal(macHw.decoder, 'videotoolbox');
  assert.equal(macHw.backend, 'Metal');

  const linuxHw = getHardwareProfile('linux');
  assert.equal(linuxHw.decoder, 'vaapi');
  assert.equal(linuxHw.backend, 'Vulkan');
});

test('parseSrt, shiftSubtitleCues, and exportSrt roundtrip accurately', () => {
  const sampleSrt = `1
00:00:01,500 --> 00:00:04,250
Welcome to MPC-Rust Home Cinema!

2
00:00:05,000 --> 00:00:08,750
Hardware Acceleration: Active`;

  const cues = parseSrt(sampleSrt);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].startTime, 1.5);
  assert.equal(cues[0].endTime, 4.25);

  const shifted = shiftSubtitleCues(cues, 0.5);
  assert.equal(shifted[0].startTime, 2.0);
  assert.equal(shifted[0].endTime, 4.75);

  const exported = exportSrt(shifted);
  assert.ok(exported.includes('00:00:02,000 --> 00:00:04,750'));
});
