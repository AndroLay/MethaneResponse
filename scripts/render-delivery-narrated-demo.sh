#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="${METHANE_DELIVERY_OUTPUT_DIR:-/tmp/MethaneResponse-delivery-2026-10-19-story-v4}"
capture_manifest="$output_dir/capture-manifest.json"
source_video="$output_dir/actual-app-capture.webm"
source_music="${METHANE_DELIVERY_MUSIC:-$output_dir/original-instrumental.wav}"
source_voice="${METHANE_DELIVERY_VOICEOVER:-$output_dir/narration-story-v4-final.wav}"
target_video="${METHANE_DELIVERY_VIDEO_OUTPUT:-$output_dir/MethaneResponse-IEEE-ClimateChain-Demo-4m50-story-v4.mp4}"
caption_file="${METHANE_DELIVERY_CAPTIONS:-$repo_root/docs/demo/delivery-2026-10-18/06-Captions-EN-story-v4.srt}"
duration_seconds="${METHANE_DELIVERY_DURATION_SECONDS:-290}"
opening_still_seconds="${METHANE_DELIVERY_OPENING_STILL_SECONDS:-23}"
[[ "$duration_seconds" =~ ^[0-9]+$ ]] || { printf 'METHANE_DELIVERY_DURATION_SECONDS must be an integer.\n' >&2; exit 2; }
(( duration_seconds >= 180 && duration_seconds <= 300 )) || { printf 'Demo duration must remain within the official 3–5 minute window.\n' >&2; exit 2; }
[[ "$opening_still_seconds" =~ ^[0-9]+$ ]] || { printf 'METHANE_DELIVERY_OPENING_STILL_SECONDS must be an integer.\n' >&2; exit 2; }
(( opening_still_seconds >= 1 && opening_still_seconds <= duration_seconds )) || { printf 'Opening still duration must be within the video duration.\n' >&2; exit 2; }

for required in "$capture_manifest" "$source_video" "$source_music" "$source_voice" "$caption_file"; do
  [[ -f "$required" ]] || { printf 'Missing required delivery input: %s\n' "$required" >&2; exit 2; }
done
[[ ! -e "$target_video" ]] || { printf 'Refusing to overwrite existing video: %s\n' "$target_video" >&2; exit 2; }

preroll="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["prerollSeconds"])' "$capture_manifest")"
caption_filter="subtitles=${caption_file}:force_style='FontName=DejaVu Sans,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,BackColour=&HAA071723,Outline=0.7,Shadow=0,MarginV=48,Alignment=2'"
video_filter="trim=start=${preroll}:duration=${duration_seconds},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=1,trim=duration=${duration_seconds},setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos:in_range=full:out_range=tv"
still_input_args=()
next_input=3
video_graph="[0:v]${video_filter}[base]"
current_video_label="base"
if [[ -n "${METHANE_DELIVERY_OPENING_STILL:-}" ]]; then
  [[ -f "$METHANE_DELIVERY_OPENING_STILL" ]] || { printf 'Missing optional opening still: %s\n' "$METHANE_DELIVERY_OPENING_STILL" >&2; exit 2; }
  still_input_args+=(-loop 1 -framerate 30 -i "$METHANE_DELIVERY_OPENING_STILL")
  video_graph+=";[${next_input}:v]scale=1920:1080:flags=lanczos,setsar=1[opening_still];[${current_video_label}][opening_still]overlay=0:0:eof_action=pass:enable='between(t,0,${opening_still_seconds})'[with_opening_still]"
  current_video_label="with_opening_still"
  next_input=$((next_input + 1))
fi
if [[ -n "${METHANE_DELIVERY_CASE_STILL:-}" ]]; then
  [[ -f "$METHANE_DELIVERY_CASE_STILL" ]] || { printf 'Missing optional case still: %s\n' "$METHANE_DELIVERY_CASE_STILL" >&2; exit 2; }
  still_input_args+=(-loop 1 -framerate 30 -i "$METHANE_DELIVERY_CASE_STILL")
  video_graph+=";[${next_input}:v]scale=1920:1080:flags=lanczos,setsar=1[case_still];[${current_video_label}][case_still]overlay=0:0:eof_action=pass:enable='between(t,23,40)'[with_case_still]"
  current_video_label="with_case_still"
  next_input=$((next_input + 1))
fi
if [[ -n "${METHANE_DELIVERY_TIMELINE_STILL:-}" ]]; then
  [[ -f "$METHANE_DELIVERY_TIMELINE_STILL" ]] || { printf 'Missing optional timeline still: %s\n' "$METHANE_DELIVERY_TIMELINE_STILL" >&2; exit 2; }
  still_input_args+=(-loop 1 -framerate 30 -i "$METHANE_DELIVERY_TIMELINE_STILL")
  video_graph+=";[${next_input}:v]scale=1920:1080:flags=lanczos,setsar=1[timeline_still];[${current_video_label}][timeline_still]overlay=0:0:eof_action=pass:enable='between(t,40,64)'[with_timeline_still]"
  current_video_label="with_timeline_still"
fi
video_graph+=";[${current_video_label}]${caption_filter}[v]"
fade_start=$((duration_seconds - 6))
audio_filter="[1:a]atrim=duration=${duration_seconds},aformat=sample_rates=48000:channel_layouts=stereo,volume=0.7[bed];[2:a]atrim=duration=${duration_seconds},aformat=sample_rates=48000:channel_layouts=stereo,volume=1.15,highpass=f=75,acompressor=threshold=0.05:ratio=2.2:attack=12:release=180:makeup=1.0[voice];[voice]asplit=2[voice_duck][voice_mix];[bed][voice_duck]sidechaincompress=threshold=0.025:ratio=5:attack=40:release=420:makeup=1[ducked];[ducked][voice_mix]amix=inputs=2:duration=longest:normalize=0:dropout_transition=0,alimiter=limit=0.88:attack=5:release=80,loudnorm=I=-18:TP=-1.5:LRA=10,afade=t=out:st=${fade_start}:d=6[a]"

ffmpeg -hide_banner -loglevel error -y \
  -i "$source_video" -i "$source_music" -i "$source_voice" \
  "${still_input_args[@]}" \
  -filter_complex "${video_graph};${audio_filter}" \
  -map '[v]' -map '[a]' -t "$duration_seconds" -r 30 -fps_mode cfr \
  -c:v libx264 -preset medium -crf 22 -profile:v high -level:v 4.1 -pix_fmt yuv420p -color_range tv \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
  -metadata title='MethaneResponse — Evidence Before Claims' \
  -metadata comment='Actual local application footage; synthetic Kokoro en-US narration; not a live feed' \
  "$target_video"

cp "$caption_file" "${target_video%.mp4}.en.srt"
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels,duration,nb_frames -of json "$target_video" > "${target_video%.mp4}.ffprobe.json"
python3 - "${target_video%.mp4}.ffprobe.json" "$duration_seconds" <<'PY'
import json
import sys

probe = json.load(open(sys.argv[1], encoding="utf-8"))
duration = float(probe["format"]["duration"])
expected_duration = int(sys.argv[2])
assert abs(duration - expected_duration) < 0.01, f"Expected {expected_duration} seconds, got {duration}"
video = next(stream for stream in probe["streams"] if stream["codec_name"] == "h264")
audio = next(stream for stream in probe["streams"] if stream["codec_name"] == "aac")
assert (video["width"], video["height"], video["r_frame_rate"], video["pix_fmt"]) == (1920, 1080, "30/1", "yuv420p"), video
assert int(video["nb_frames"]) == expected_duration * 30, f"Expected exactly {expected_duration * 30} video frames, got {video.get('nb_frames')}"
assert abs(float(video["duration"]) - expected_duration) < (1 / 30) + 0.001, f"Video stream is short: {video['duration']}"
assert (audio["sample_rate"], audio["channels"]) == ("48000", 2), audio
PY
ffmpeg -hide_banner -loglevel error -i "$target_video" -f null -
ffmpeg -hide_banner -nostats -i "$target_video" -map 0:a:0 -af ebur128=framelog=verbose -f null - 2> "${target_video%.mp4}.audio-loudness.txt"
printf 'Rendered and fully decoded: %s\n' "$target_video"
