#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="${METHANE_DELIVERY_OUTPUT_DIR:-/tmp/MethaneResponse-delivery-2026-10-18}"
capture_manifest="$output_dir/capture-manifest.json"
source_video="$output_dir/actual-app-capture.webm"
source_audio="$output_dir/original-instrumental.wav"
target_video="$output_dir/MethaneResponse-IEEE-ClimateChain-4m.mp4"
caption_file="$repo_root/docs/demo/delivery-2026-10-18/06-Captions-EN.srt"

for required in "$capture_manifest" "$source_video" "$source_audio" "$caption_file"; do
  [[ -f "$required" ]] || { printf 'Missing required delivery input: %s\n' "$required" >&2; exit 2; }
done
[[ ! -e "$target_video" ]] || { printf 'Refusing to overwrite existing video: %s\n' "$target_video" >&2; exit 2; }

preroll="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["prerollSeconds"])' "$capture_manifest")"
caption_filter="subtitles=${caption_file}:force_style='FontName=DejaVu Sans,FontSize=12,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,BackColour=&HAA071723,Outline=0.7,Shadow=0,MarginV=26,Alignment=2'"
video_filter="trim=start=${preroll}:duration=240,setpts=PTS-STARTPTS,fps=30,scale=1920:1080:flags=lanczos:in_range=full:out_range=tv,${caption_filter}"
audio_filter="atrim=duration=240,loudnorm=I=-21:TP=-2:LRA=7,afade=t=out:st=234:d=6"

ffmpeg -hide_banner -loglevel error -y \
  -i "$source_video" -i "$source_audio" \
  -filter_complex "[0:v]${video_filter}[v];[1:a]${audio_filter}[a]" \
  -map '[v]' -map '[a]' -t 240 -r 30 -fps_mode cfr \
  -c:v libx264 -preset medium -crf 22 -profile:v high -level:v 4.1 -pix_fmt yuv420p -color_range tv \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
  "$target_video"

cp "$caption_file" "$output_dir/MethaneResponse-IEEE-ClimateChain-4m.en.srt"
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels -of json "$target_video" > "$output_dir/video-ffprobe.json"
python3 - "$output_dir/video-ffprobe.json" <<'PY'
import json
import sys

probe = json.load(open(sys.argv[1], encoding="utf-8"))
duration = float(probe["format"]["duration"])
assert abs(duration - 240.0) < 0.01, f"Expected 240 seconds, got {duration}"
video = next(stream for stream in probe["streams"] if stream["codec_name"] == "h264")
audio = next(stream for stream in probe["streams"] if stream["codec_name"] == "aac")
assert (video["width"], video["height"], video["r_frame_rate"], video["pix_fmt"]) == (1920, 1080, "30/1", "yuv420p"), video
assert (audio["sample_rate"], audio["channels"]) == ("48000", 2), audio
PY
ffmpeg -hide_banner -loglevel error -i "$target_video" -f null -
printf 'Rendered and fully decoded: %s\n' "$target_video"
