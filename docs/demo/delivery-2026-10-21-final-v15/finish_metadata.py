"""Add attribution and chapter markers losslessly, preserving render master."""
from pathlib import Path
import json,subprocess
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUT=ROOT/'delivery-output/final-v15-TAKE01'
CREDIT='Contains UNEP IMEO Eye on Methane / MARS historical source and plume metadata, CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/); source https://methanedata.unep.org/download-dataset. Changes: normalized JSON, visualized historical records and derived investigation planning; no mitigation confirmation inferred. Geographic context imagery: Esri, Maxar, Earthstar Geographics, GIS User Community; static NASA GIBS Blue Marble overview. Original procedural instrumental music by the MethaneResponse project. Stock synthetic male Andrew neural narration; not a human recording. Actual local UI; software DEMO review; separate recorded KAZ AI; Anvil local chain only.'
def main():
    final=OUT/'MethaneResponse-Final-Submission-v15.mp4';master=OUT/'render-master-v15.mp4'
    if master.exists():raise RuntimeError('Preserve completed metadata pass')
    final.rename(master)
    scenes=json.loads((HERE/'story.json').read_text())['scenes']
    meta=';FFMETADATA1\ntitle=MethaneResponse — One Decision. Defensible Evidence.\ncomment='+CREDIT+'\n'
    for s in scenes:
        meta+=f"[CHAPTER]\nTIMEBASE=1/1000\nSTART={s['start']*1000}\nEND={s['end']*1000}\ntitle={s['chapter']}\n"
    (OUT/'chapters.ffmetadata').write_text(meta)
    (OUT/'CREDITS.txt').write_text(CREDIT+'\n\nInclude this credit with any public video upload. The project does not claim UNEP endorsement, physical repair, or measured productivity.\n')
    result=subprocess.run(['ffmpeg','-v','error','-i',str(master),'-i',str(OUT/'chapters.ffmetadata'),'-map','0','-map_metadata','1','-map_chapters','1','-c','copy','-movflags','+faststart',str(final)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if result.returncode:raise RuntimeError(result.stderr.decode())
    print('Lossless attribution and ten navigation chapters added; master preserved.')
if __name__=='__main__':main()
