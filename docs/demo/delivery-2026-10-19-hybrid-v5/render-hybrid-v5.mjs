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
const slidesDir = path.join(rootOut, 'slides');
const compositionPath = path.join(here, 'composition.html');
const rawVideoPath = path.join(repo, 'delivery-output/story-v4/actual-app-capture.webm');
const captureManifestPath = path.join(repo, 'delivery-output/story-v4/capture-manifest.json');
const musicPath = path.join(repo, 'delivery-output/story-v4/original-instrumental.wav');
const voicePath = path.join(repo, 'delivery-output/story-v4/narration-story-v4-final.wav');
const captionsPath = path.join(repo, 'docs/demo/delivery-2026-10-18/06-Captions-EN-story-v4.srt');
const ffmpeg = process.env.FFMPEG_PATH ?? '/usr/bin/ffmpeg';
const ffprobe = process.env.FFPROBE_PATH ?? '/usr/bin/ffprobe';
const mode = process.argv[2] ?? 'study';
const fadeSeconds = 0.15;
const slideFadeSeconds = 0.18;
const fps = 30;
const slideStages = ['reveal', 'build', 'settled'];

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
  const captureTool = path.join(here, 'capture-slide-stills.mjs');
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
      const sourceStart = preroll + segment.scene.start + Number(segment.scene.sourceOffsetSeconds ?? 0) + (segment.start - segment.scene.start);
      if (sourceStart < 0) throw new Error(`Invalid source offset for ${segment.scene.id}.`);
      args.push('-ss', sourceStart.toFixed(3), '-t', inputDurations[index].toFixed(3), '-i', rawVideoPath);
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
        const phase = (index * 0.71 + stageIndex * 0.37).toFixed(3);
        const stageLabel = `s${index}_${stageIndex}`;
        filters.push(`[${input}:v]zoompan=z='min(1+0.000015*on,1.015)':x='max(0,min(iw-iw/zoom,(iw-iw/zoom)/2+3*sin(on/180+${phase})))':y='max(0,min(ih-ih/zoom,(ih-ih/zoom)/2+2*cos(on/210+${phase})))':d=1:s=1920x1080:fps=${fps},trim=duration=${stageLength},setpts=PTS-STARTPTS,setsar=1,format=yuv420p,settb=AVTB[${stageLabel}]`);
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
      filters.push(`[${inputs[0]}:v]trim=duration=${length},setpts=PTS-STARTPTS,fps=${fps},scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p,settb=AVTB[v${index}]`);
    }
  }

  let joined = 'v0';
  let accumulated = inputDurations[0];
  for (let index = 1; index < selected.length; index += 1) {
    const next = `vjoin${index}`;
    const offset = (accumulated - fadeSeconds).toFixed(3);
    filters.push(`[${joined}][v${index}]xfade=transition=fade:duration=${fadeSeconds}:offset=${offset}[${next}]`);
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
  filters.push(`[ducked][voice_mix]amix=inputs=2:duration=longest:normalize=0:dropout_transition=0,alimiter=limit=0.82:attack=5:release=80,loudnorm=I=-18:TP=-2:LRA=10,afade=t=out:st=${fadeStart.toFixed(3)}:d=${audioFade.toFixed(3)}[aout]`);

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

if (mode === 'study') {
  const marsJoin = await render(36, 44, path.join(rootOut, 'motion-study-mars-join-v4.mp4'), false);
  const auditJoin = await render(168, 174, path.join(rootOut, 'motion-study-audit-result-join-v4.mp4'), false);
  const tamperJoin = await render(225, 231, path.join(rootOut, 'motion-study-tamper-join-v4.mp4'), false);
  const appStudy = await render(148, 168, path.join(rootOut, 'app-study-148-168-v4.mp4'), false);
  for (const [label, item] of [['MARS slide join', marsJoin], ['Audit result join', auditJoin], ['Tamper interaction join', tamperJoin], ['App interaction', appStudy]]) {
    process.stdout.write(`${label}: ${item.path} (${item.duration}s, ${item.bytes} bytes)\n`);
  }
} else if (mode === 'full') {
  const finalPath = path.join(rootOut, 'MethaneResponse-Hybrid-Presentation-Demo-4m50-v7.mp4');
  const finalVideo = await render(0, totalSeconds, finalPath, false);
  const captionsOut = `${finalPath}.en.srt`;
  await requireAbsent(captionsOut);
  await copyFile(captionsPath, captionsOut);
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    storyRevision: 7,
    output: finalVideo,
    captions: { path: captionsOut, sha256: await sha256(captionsOut), language: 'en', format: 'SRT sidecar; not burned over application evidence' },
    runtimeSeconds: totalSeconds,
    scenes: scenes.map(({ id, start, end, kind, label, sourceOffsetSeconds }) => ({ id, start, end, kind, ...(label ? { label } : {}), ...(sourceOffsetSeconds === undefined ? {} : { sourceOffsetSeconds }) })),
    inputs: {
      rawAppCapture: { path: rawVideoPath, sha256: await sha256(rawVideoPath) },
      narration: { path: voicePath, sha256: await sha256(voicePath), voice: 'Kokoro en-US af_heart; synthetic voice-over' },
      originalInstrumental: { path: musicPath, sha256: await sha256(musicPath) },
      sourceClaimLedger: 'docs/demo/delivery-2026-10-19-story-v4/03-Sources-and-Claims.md',
      referenceAnalysis: path.join(here, 'reference-analysis.md'),
    },
    externalServices: { higgsfield: 'unavailable in this environment; no remote generation used', hyperframes: 'not installed; local authored HTML/CSS and FFmpeg pipeline used' },
    productionNotes: [
      'The slide scenes are sampled at three reveal/build/settled animation states and cross-dissolved; actual app scenes use recorded footage.',
      'Inter-scene dissolves are 0.15 seconds to minimize text collision between different layouts.',
      'The 30% and ~12% figures are attributed in the slide footers and claim ledger; ~12% is a response figure, not a repair rate.',
      'Three EnMAP estimates are shown as separate points with reported uncertainty; no connecting line is drawn.',
      'The July action month and July 11 observation are not placed in before/after order.',
      'Actual product footage contains the recorded cursor and interactions; it is not a live service capture.',
      'The rules result is limited to the selected submitted bundle and scope; local digest verification is not a public blockchain receipt or physical truth.',
    ],
  };
  const manifestPath = path.join(rootOut, 'render-manifest-v7.json');
  await requireAbsent(manifestPath);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`Final local render: ${finalPath}\n`);
  process.stdout.write(`Duration ${finalVideo.duration}s · ${finalVideo.bytes} bytes · SHA-256 ${finalVideo.sha256}\n`);
  process.stdout.write(`English captions sidecar: ${captionsOut}\n`);
  process.stdout.write(`Render manifest: ${manifestPath}\n`);
} else {
  throw new Error('Usage: node render-hybrid-v5.mjs study|full');
}
