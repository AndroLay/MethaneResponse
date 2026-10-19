#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { copyFile, lstat, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const rootOut = path.join(repo, 'delivery-output/story-v5');
const slidesDir = path.join(rootOut, 'slides-v9-final');
const compositionPath = path.join(here, 'composition-v9.3.html');
const rawVideoPath = path.join(repo, 'delivery-output/story-v4/actual-app-capture.webm');
const captureManifestPath = path.join(repo, 'delivery-output/story-v4/capture-manifest.json');
const musicPath = path.join(repo, 'delivery-output/story-v4/original-instrumental.wav');
const voicePath = path.join(repo, 'delivery-output/story-v4/narration-story-v4-final.wav');
const captionsPath = path.join(repo, 'docs/demo/delivery-2026-10-18/06-Captions-EN-story-v4.srt');
const ffmpeg = process.env.FFMPEG_PATH ?? '/usr/bin/ffmpeg';
const ffprobe = process.env.FFPROBE_PATH ?? '/usr/bin/ffprobe';
const mode = process.argv[2] ?? 'focus-study';
const fadeSeconds = 0.28;
const slideFadeSeconds = 0.36;
const fps = 25;
const slideStages = ['reveal', 'build', 'settled'];
const focusPlans = {
  'observations-demo': [
    { centerX: 1060, centerY: 720, zoom: 1.12, inStart: 1.1, inEnd: 2.2, holdEnd: 4.3, outEnd: 5.3 },
  ],
  'scope-demo': [
    { centerX: 710, centerY: 800, zoom: 1.24, inStart: 0.15, inEnd: 0.85, holdEnd: 2.0, outEnd: 2.75 },
    { centerX: 430, centerY: 650, zoom: 1.24, inStart: 3.05, inEnd: 3.75, holdEnd: 4.95, outEnd: 5.65 },
  ],
  'audit-demo': [
    { centerX: 700, centerY: 360, zoom: 1.18, inStart: 0.1, inEnd: 0.7, holdEnd: 1.45, outEnd: 1.95 },
    { centerX: 365, centerY: 560, zoom: 1.26, inStart: 2.0, inEnd: 2.85, holdEnd: 5.35, outEnd: 6.2 },
  ],
  'report-demo': [
    { centerX: 960, centerY: 650, zoom: 1.16, inStart: 5.3, inEnd: 6.4, holdEnd: 8.2, outEnd: 9.5 },
  ],
  'tamper-demo': [
    { centerX: 750, centerY: 590, zoom: 1.18, inStart: 1.8, inEnd: 2.9, holdEnd: 7.1, outEnd: 8.4 },
  ],
};

const html = await readFile(compositionPath, 'utf8');
const timelineMatch = /<script id="timeline-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
if (!timelineMatch) throw new Error('Missing canonical timeline-data in composition.html.');
const scenes = JSON.parse(timelineMatch[1]);
const captureManifest = JSON.parse(await readFile(captureManifestPath, 'utf8'));
const preroll = Number(captureManifest.prerollSeconds);
if (!Number.isFinite(preroll)) throw new Error('Invalid raw capture preroll.');
const totalSeconds = 290;
if (scenes.at(-1)?.end !== totalSeconds || scenes[0]?.start !== 0) throw new Error('Timeline does not cover the exact 290-second runtime.');
if (scenes.some((scene, index) => scene.start >= scene.end || (index && scenes[index - 1].end !== scene.start))) throw new Error('Timeline scenes must be contiguous and non-empty.');

for (const file of [rawVideoPath, musicPath, voicePath, captionsPath, ffmpeg, ffprobe]) await stat(file);
await mkdir(rootOut, { recursive: true });

const sha256 = async (filePath) => createHash('sha256').update(await readFile(filePath)).digest('hex');
const interactionSources = new Map();
for (const sourceId of new Set(scenes.filter((scene) => scene.sourceVideo).map((scene) => scene.sourceVideo))) {
  if (!/^[a-z0-9-]+$/.test(sourceId)) throw new Error(`Invalid interaction source id: ${sourceId}`);
  const sourceDir = path.join(rootOut, sourceId);
  const manifestPath = path.join(sourceDir, 'capture-manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.localOnly !== true || manifest.sourceId !== 'KAZ_S_159' || manifest.claim !== 'mitigation_confirmed') {
    throw new Error(`Unexpected application capture provenance in ${manifestPath}.`);
  }
  if (manifest.pageErrors?.length) throw new Error(`The local app capture contains page errors: ${manifest.pageErrors.join(' | ')}`);
  if (path.basename(manifest.video ?? '') !== manifest.video) throw new Error('Interaction capture manifest contains an unsafe video path.');
  const videoPath = path.join(sourceDir, manifest.video);
  if (await sha256(videoPath) !== manifest.sha256) throw new Error(`Interaction capture hash mismatch: ${videoPath}`);
  for (const scene of scenes.filter((item) => item.sourceVideo === sourceId)) {
    const sourceScene = manifest.scenes?.[scene.sourceScene];
    const sourceStart = Number(sourceScene?.sourceStartSeconds);
    const sourceDuration = Number(sourceScene?.durationSeconds);
    if (!Number.isFinite(sourceStart) || !Number.isFinite(sourceDuration) || sourceDuration < scene.end - scene.start) {
      throw new Error(`Missing or invalid source timing for ${scene.id}.`);
    }
    if (sourceStart < 0 || sourceStart + (scene.end - scene.start) > Number(manifest.sourceDurationSeconds) - 0.01) {
      throw new Error(`Interaction capture is too short for ${scene.id}.`);
    }
  }
  interactionSources.set(sourceId, { manifest, videoPath, manifestPath, sha256: manifest.sha256 });
}
const probe = async (filePath) => {
  const { stdout } = await execFileAsync(ffprobe, [
    '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels,nb_frames,duration', '-of', 'json', filePath,
  ], { timeout: 30_000, maxBuffer: 1_000_000 });
  return JSON.parse(stdout);
};
const requireAbsent = async (filePath) => {
  try {
    await lstat(filePath);
    throw new Error(`Refusing to overwrite existing delivery artifact: ${filePath}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
};

function cameraFocusFilter(sceneId, duration) {
  const plans = focusPlans[sceneId];
  if (!plans?.length) return '';
  const at = (seconds) => Math.round(seconds * fps);
  const frames = plans.map((plan) => ({ ...plan, start: at(plan.inStart), zoomed: at(plan.inEnd), pullback: at(plan.holdEnd), settled: at(plan.outEnd) }));
  for (const [index, plan] of frames.entries()) {
    if (!(plan.start < plan.zoomed && plan.zoomed < plan.pullback && plan.pullback < plan.settled && plan.outEnd < duration)) {
      throw new Error(`Invalid focus choreography for ${sceneId} (${duration}s).`);
    }
    if (index && frames[index - 1].settled >= plan.start) throw new Error(`Overlapping focus moves in ${sceneId}.`);
  }
  const smooth = (t) => `(3*pow(${t},2)-2*pow(${t},3))`;
  const planZoom = (plan) => {
    const amplitude = (plan.zoom - 1).toFixed(4);
    const zoom = plan.zoom.toFixed(4);
    const up = smooth(`(on-${plan.start})/${plan.zoomed - plan.start}`);
    const down = smooth(`(on-${plan.pullback})/${plan.settled - plan.pullback}`);
    return `if(lt(on,${plan.start}),1,if(lt(on,${plan.zoomed}),1+${amplitude}*${up},if(lt(on,${plan.pullback}),${zoom},if(lt(on,${plan.settled}),${zoom}-${amplitude}*${down},1))))`;
  };
  let zoomExpr = '1';
  let xExpr = 'max(0,min(iw-iw/zoom,(iw-iw/zoom)/2))';
  let yExpr = 'max(0,min(ih-ih/zoom,(ih-ih/zoom)/2))';
  for (const plan of [...frames].reverse()) {
    const active = `between(on,${plan.start},${plan.settled})`;
    zoomExpr = `if(${active},${planZoom(plan)},${zoomExpr})`;
    xExpr = `if(${active},max(0,min(iw-iw/zoom,${plan.centerX}-iw/zoom/2)),${xExpr})`;
    yExpr = `if(${active},max(0,min(ih-ih/zoom,${plan.centerY}-ih/zoom/2)),${yExpr})`;
  }
  return `,zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=1:s=1920x1080:fps=${fps},trim=duration=${duration.toFixed(3)},setpts=PTS-STARTPTS`;
}

const expectedSlideFrames = scenes.filter((scene) => scene.kind === 'slide').map((scene) => ({
  scene,
  files: slideStages.map((stage) => ({
    stage,
    file: path.join(slidesDir, `${String(scene.start).padStart(3, '0')}-${scene.id}-${stage}.png`),
  })),
}));
const frameStates = await Promise.all(expectedSlideFrames.flatMap(({ files }) => files.map(async ({ file }) => {
  try { const info = await stat(file); return info.size > 20_000; } catch { return false; }
})));
if (frameStates.some(Boolean) && !frameStates.every(Boolean)) throw new Error('Partial progressive slide-frame set exists; preserving it. Inspect delivery-output/story-v5/slides before rerendering.');
if (!frameStates.every(Boolean)) {
  await mkdir(slidesDir, { recursive: true });
  const captureTool = path.join(here, 'capture-slide-stills-v9.mjs');
  const { stdout, stderr } = await execFileAsync(process.execPath, [captureTool], { cwd: repo, timeout: 120_000, maxBuffer: 2_000_000 });
  process.stdout.write(stdout);
  if (stderr.trim()) process.stderr.write(`${stderr.trim()}\n`);
}

function makeRange(startSeconds, endSeconds, outputPath, includeCaptions) {
  const selected = scenes.flatMap((scene) => {
    const start = Math.max(startSeconds, scene.start);
    const end = Math.min(endSeconds, scene.end);
    return end > start ? [{ scene, start, end, duration: end - start }] : [];
  });
  if (!selected.length || Math.abs(selected[0].start - startSeconds) > 1e-8 || Math.abs(selected.at(-1).end - endSeconds) > 1e-8) {
    throw new Error(`No exact scene coverage for ${startSeconds}-${endSeconds}.`);
  }
  const desiredDuration = endSeconds - startSeconds;
  const args = ['-hide_banner', '-loglevel', 'error', '-n'];
  const inputDurations = selected.map((segment, index) => segment.duration + (index ? fadeSeconds : 0));
  const inputIndex = new Map();
  const slideStageDurations = new Map();
  let videoInputCount = 0;
  for (let index = 0; index < selected.length; index += 1) {
    const segment = selected[index];
    if (segment.scene.kind === 'slide') {
      const frameSet = expectedSlideFrames.find((item) => item.scene.id === segment.scene.id)?.files;
      if (!frameSet) throw new Error(`No captured progressive frames for slide ${segment.scene.id}.`);
      const first = Math.min(3.2, Math.max(1.15, inputDurations[index] * 0.27));
      const second = first;
      const third = inputDurations[index] + slideFadeSeconds * 2 - first - second;
      if (third < 1) throw new Error(`Slide scene ${segment.scene.id} is too short for three progressive stages.`);
      const durations = [first, second, third].map((value) => Number(value.toFixed(3)));
      durations[2] = Number((inputDurations[index] + slideFadeSeconds * 2 - durations[0] - durations[1]).toFixed(3));
      if (Math.abs(durations.reduce((sum, value) => sum + value, 0) - inputDurations[index] - slideFadeSeconds * 2) > 0.002) {
        throw new Error(`Progressive slide timing does not reconcile for ${segment.scene.id}.`);
      }
      slideStageDurations.set(segment, durations);
      const indices = [];
      for (let stageIndex = 0; stageIndex < slideStages.length; stageIndex += 1) {
        const frame = frameSet.find((item) => item.stage === slideStages[stageIndex])?.file;
        if (!frame) throw new Error(`Missing ${slideStages[stageIndex]} frame for ${segment.scene.id}.`);
        indices.push(videoInputCount++);
        args.push('-loop', '1', '-framerate', String(fps), '-t', durations[stageIndex].toFixed(3), '-i', frame);
      }
      inputIndex.set(segment, indices);
    } else {
      inputIndex.set(segment, [videoInputCount++]);
      const interactionSource = segment.scene.sourceVideo ? interactionSources.get(segment.scene.sourceVideo) : null;
      const sourceStart = interactionSource
        ? Number(interactionSource.manifest.scenes[segment.scene.sourceScene].sourceStartSeconds) + (segment.start - segment.scene.start)
        : preroll + segment.scene.start + Number(segment.scene.sourceOffsetSeconds ?? 0) + (segment.start - segment.scene.start);
      if (sourceStart < 0) throw new Error(`Invalid source offset for ${segment.scene.id}.`);
      args.push('-ss', sourceStart.toFixed(3), '-t', inputDurations[index].toFixed(3), '-i', interactionSource?.videoPath ?? rawVideoPath);
    }
  }
  const musicIndex = videoInputCount;
  const voiceIndex = videoInputCount + 1;
  args.push('-i', musicPath, '-i', voicePath);

  const filters = [];
  for (let index = 0; index < selected.length; index += 1) {
    const segment = selected[index];
    const inputs = inputIndex.get(segment);
    const length = inputDurations[index].toFixed(3);
    if (segment.scene.kind === 'slide') {
      const durations = slideStageDurations.get(segment);
      let slideJoin = null;
      let stageAccumulated = durations[0];
      for (let stageIndex = 0; stageIndex < slideStages.length; stageIndex += 1) {
        const input = inputs[stageIndex];
        const stageLength = durations[stageIndex].toFixed(3);
        const stageLabel = `s${index}_${stageIndex}`;
        filters.push(`[${input}:v]scale=1920:1080:flags=lanczos,trim=duration=${stageLength},setpts=PTS-STARTPTS,setsar=1,format=yuv420p,settb=AVTB[${stageLabel}]`);
        if (stageIndex === 0) {
          slideJoin = stageLabel;
        } else {
          const joinedStage = `sjoin${index}_${stageIndex}`;
          const stageOffset = (stageAccumulated - slideFadeSeconds).toFixed(3);
          filters.push(`[${slideJoin}][${stageLabel}]xfade=transition=fade:duration=${slideFadeSeconds}:offset=${stageOffset}[${joinedStage}]`);
          slideJoin = joinedStage;
          stageAccumulated += durations[stageIndex] - slideFadeSeconds;
        }
      }
      if (Math.abs(stageAccumulated - inputDurations[index]) > 0.002) throw new Error(`Progressive slide duration mismatch for ${segment.scene.id}: ${stageAccumulated}.`);
      filters.push(`[${slideJoin}]format=yuv420p,settb=AVTB[v${index}]`);
    } else {
      const focusFilter = cameraFocusFilter(segment.scene.id, inputDurations[index]);
      const appFilters = focusFilter
        ? `fps=${fps}${focusFilter},setsar=1,format=yuv420p,settb=AVTB`
        : `fps=${fps},scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p,settb=AVTB`;
      filters.push(`[${inputs[0]}:v]trim=duration=${length},setpts=PTS-STARTPTS,${appFilters}[v${index}]`);
    }
  }

  let joined = 'v0';
  let accumulated = inputDurations[0];
  for (let index = 1; index < selected.length; index += 1) {
    const next = `vjoin${index}`;
    const offset = (accumulated - fadeSeconds).toFixed(3);
    const previous = selected[index - 1].scene;
    const current = selected[index].scene;
    const transition = 'fade';
    filters.push(`[${joined}][v${index}]xfade=transition=${transition}:duration=${fadeSeconds}:offset=${offset}[${next}]`);
    joined = next;
    accumulated += selected[index].duration;
  }
  if (Math.abs(accumulated - desiredDuration) > 1e-6) throw new Error(`Transition timeline mismatch: expected ${desiredDuration}, got ${accumulated}.`);

  const audioFade = Math.min(6, desiredDuration / 2);
  const fadeStart = Math.max(0, desiredDuration - audioFade);
  filters.push(`[${musicIndex}:a]atrim=start=${startSeconds}:duration=${desiredDuration},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.7[bed]`);
  filters.push(`[${voiceIndex}:a]atrim=start=${startSeconds}:duration=${desiredDuration},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.15,highpass=f=75,acompressor=threshold=0.05:ratio=2.2:attack=12:release=180:makeup=1[voice]`);
  filters.push('[voice]asplit=2[voice_duck][voice_mix]');
  filters.push('[bed][voice_duck]sidechaincompress=threshold=0.025:ratio=5:attack=40:release=420:makeup=1[ducked]');
  filters.push(`[ducked][voice_mix]amix=inputs=2:duration=longest:normalize=0:dropout_transition=0,alimiter=limit=0.82:attack=5:release=80,loudnorm=I=-18:TP=-3:LRA=10,afade=t=out:st=${fadeStart.toFixed(3)}:d=${audioFade.toFixed(3)}[aout]`);

  if (includeCaptions) {
    const style = 'FontName=DejaVu Sans,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,BackColour=&HAA071723,Outline=0.7,Shadow=0,MarginV=110,Alignment=2';
    filters.push(`[${joined}]subtitles=${captionsPath}:force_style='${style}',format=yuv420p[vout]`);
  } else filters.push(`[${joined}]format=yuv420p[vout]`);

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[vout]', '-map', '[aout]', '-t', desiredDuration.toFixed(3),
    '-r', String(fps), '-fps_mode', 'cfr',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart',
    '-metadata', 'title=MethaneResponse — Evidence Before Claims',
    '-metadata', 'comment=Historical MARS case; authored explanation and actual local application capture; deterministic rules baseline; local report digest check.',
    outputPath,
  );
  return { args, desiredDuration, selected };
}

async function render(start, end, outputPath, includeCaptions) {
  await requireAbsent(outputPath);
  const plan = makeRange(start, end, outputPath, includeCaptions);
  try {
    await execFileAsync(ffmpeg, plan.args, { cwd: repo, timeout: 1_200_000, maxBuffer: 5_000_000 });
  } catch (error) {
    throw new Error(`FFmpeg failed for ${path.basename(outputPath)}: ${(error.stderr ?? error.message).trim().slice(-4_000)}`);
  }
  const result = await probe(outputPath);
  const duration = Number(result.format?.duration);
  const video = result.streams?.find((stream) => stream.codec_name === 'h264');
  const audio = result.streams?.find((stream) => stream.codec_name === 'aac');
  if (!video || !audio || Math.abs(duration - plan.desiredDuration) > 0.01) throw new Error(`Invalid render metadata: ${JSON.stringify({ duration, video, audio })}`);
  if (video.width !== 1920 || video.height !== 1080 || video.pix_fmt !== 'yuv420p' || video.r_frame_rate !== `${fps}/1`) throw new Error(`Unexpected video stream contract: ${JSON.stringify(video)}`);
  if (audio.sample_rate !== '48000' || audio.channels !== 2) throw new Error(`Unexpected audio stream contract: ${JSON.stringify(audio)}`);
  return { path: outputPath, duration, bytes: Number(result.format.size), sha256: await sha256(outputPath), ffprobe: result };
}

if (mode === 'focus-study' || mode === 'audit-focus-check' || mode === 'scope-focus-check') {
  const items = mode === 'audit-focus-check' ? [
    ['Scope action, baseline run and result', 148, 159, 'focus-study-audit-v9.3-interaction-check.mp4'],
  ] : mode === 'scope-focus-check' ? [
    ['Actual date selection and applied scope', 140, 148, 'focus-study-scope-v9.3-interaction-check.mp4'],
  ] : [
    ['Stable slide-to-product dissolve', 68, 83, 'transition-study-v9-final.mp4'],
    ['Observation view and full return', 104, 119, 'focus-study-observations-v9-final.mp4'],
    ['Observation-day scope selection', 140, 148, 'focus-study-scope-v9-final.mp4'],
    ['Scope action, baseline run and result', 148, 159, 'focus-study-audit-v9-final.mp4'],
    ['Report check focus move', 209, 220, 'focus-study-report-v9-final.mp4'],
    ['Tamper mismatch focus move', 228, 243, 'focus-study-tamper-v9-final.mp4'],
  ];
  for (const [label, start, end, filename] of items) {
    const item = await render(start, end, path.join(rootOut, filename), false);
    process.stdout.write(`${label}: ${item.path} (${item.duration}s, ${item.bytes} bytes)\n`);
  }
} else if (mode === 'full') {
  const deliveryTag = process.env.DELIVERY_TAG ?? 'v9.3-final';
  const finalPath = path.join(rootOut, `MethaneResponse-Hybrid-Presentation-Demo-4m50-${deliveryTag}.mp4`);
  const finalVideo = await render(0, totalSeconds, finalPath, false);
  const captionsOut = `${finalPath}.en.srt`;
  await requireAbsent(captionsOut);
  await copyFile(captionsPath, captionsOut);
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    storyRevision: '9.3',
    output: finalVideo,
    captions: { path: captionsOut, sha256: await sha256(captionsOut), language: 'en', format: 'SRT sidecar; not burned over application evidence' },
    runtimeSeconds: totalSeconds,
    scenes: scenes.map(({ id, start, end, kind, label, sourceOffsetSeconds, sourceVideo, sourceScene }) => ({ id, start, end, kind, ...(label ? { label } : {}), ...(sourceOffsetSeconds === undefined ? {} : { sourceOffsetSeconds }), ...(sourceVideo ? { sourceVideo, sourceScene } : {}) })),
    inputs: {
      rawAppCapture: { path: rawVideoPath, sha256: await sha256(rawVideoPath) },
      interactionCaptures: [...interactionSources.entries()].map(([id, source]) => ({ id, path: source.videoPath, manifestPath: source.manifestPath, sha256: source.sha256, sourceDurationSeconds: source.manifest.sourceDurationSeconds, interactions: source.manifest.verifiedActions })),
      narration: { path: voicePath, sha256: await sha256(voicePath), voice: 'Kokoro en-US af_heart; synthetic voice-over' },
      originalInstrumental: { path: musicPath, sha256: await sha256(musicPath) },
      sourceClaimLedger: 'docs/demo/delivery-2026-10-19-story-v4/03-Sources-and-Claims.md',
      referenceAnalysis: path.join(here, 'reference-analysis.md'),
    },
    externalServices: { higgsfield: 'unavailable in this environment; no remote generation used', hyperframes: 'not installed; local authored HTML/CSS and FFmpeg pipeline used' },
    motionDesign: {
      slideCamera: 'Locked, static camera on authored slides; diagram and emphasis elements change through progressive reveal/build/settled states. No continuous camera drift.',
      appFocusMoves: focusPlans,
      chapterTransition: 'Short 0.28-second cross-dissolves; no directional wipe.',
      focusTiming: 'App focus moves use eased zoom-in, readable holds, and a full-screen pullback. Moves are timed to the actual observation-period preset, selected date, scope action, and rules-baseline run. Coordinates are fixed against the captured 1920x1080 source.',
      cadence: '25 fps CFR to match the 25 fps recorded browser capture and avoid mixed-cadence duplication.',
    },
    productionNotes: [
      'The slide scenes are sampled at three progressive reveal/build/settled states and cross-dissolved with the camera locked; no continuous pan or zoom is applied to slides.',
      'All scene joins use 0.28-second dissolves; directional camera-like wipes are removed.',
      'The actual app sequence visibly loads the historical period, selects the July 11 observation day, applies UTC scope, and runs the deterministic rules baseline. Page scrolling is complete before this recorded segment begins.',
      'A small cursor marker follows real Playwright pointer movement and click events because headless browser video does not include an operating-system pointer. It does not change application state or data.',
      'Selected real app moments use smooth zoom-in / hold / pull-back moves to direct attention to the observation plot, scope fields and action, bounded assessment result, report check and mismatch banner.',
      'No generated footage or synthetic evidence graphics are composited over application evidence.',
      'The 30% and ~12% figures are attributed in the slide footers and claim ledger; ~12% is a response figure, not a repair rate.',
      'Three EnMAP estimates are shown as separate points with reported uncertainty; no connecting line is drawn.',
      'The July action month and July 11 observation are not placed in before/after order.',
      'Actual product footage is captured from the local app with its pinned historical snapshot and local file-backed API; it is not a public or live service. Selection, scope application, and baseline result are real application interactions.',
      'The rules result is limited to the selected submitted bundle and scope; local digest verification is not a public blockchain receipt or physical truth.',
    ],
  };
  const manifestPath = path.join(rootOut, `render-manifest-${deliveryTag}.json`);
  await requireAbsent(manifestPath);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`Final local render: ${finalPath}\n`);
  process.stdout.write(`Duration ${finalVideo.duration}s · ${finalVideo.bytes} bytes · SHA-256 ${finalVideo.sha256}\n`);
  process.stdout.write(`English captions sidecar: ${captionsOut}\n`);
  process.stdout.write(`Render manifest: ${manifestPath}\n`);
} else {
  throw new Error('Usage: node render-hybrid-v9.mjs focus-study|scope-focus-check|audit-focus-check|full');
}
