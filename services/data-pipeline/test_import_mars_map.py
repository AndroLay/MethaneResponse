import io
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from import_mars_map import normalize


class MarsMapImportTests(unittest.TestCase):
    def test_official_shape_csv(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'sample.csv'
            path.write_text('source_name,lat,lon,country,sector,id_plume,tile_date,ch4_fluxrate,ch4_fluxrate_std,notified,feedback\n'
                            'KAZ_S_136,50.25,67.12,Kazakhstan,Oil and gas,test-1,2026-01-01T10:00:00,3400,200,Yes,No\n'
                            'KAZ_S_136,50.25,67.12,Kazakhstan,Oil and gas,test-2,2026-02-01T10:00:00,2400,300,Yes,No\n'
                            'USA_S_008,34.0,-100.0,United States,Oil and gas,test-3,2025-01-01T00:00:00,1200,100,No,Yes\n', encoding='utf8')
            snap, rows=normalize(path)
            self.assertEqual(rows,3)
            self.assertEqual(len(snap['sources']),2)
            s=snap['sources'][0]
            self.assertEqual(s['sourceId'],'KAZ_S_136')
            self.assertEqual(s['plumeCount'],2)
            self.assertEqual(s['maxFluxKgHr'],3400)
            self.assertFalse(s['synthetic'])
            self.assertEqual(s['observations'][1]['fluxKgHr'],2400)
            self.assertNotIn('mitigation_confirmation',str(s))

    def test_zip_csv_and_invalid_coordinates(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'sample.zip'
            with zipfile.ZipFile(path,'w') as z:
                z.writestr('unep_methanedata_detected_plumes.csv', 'source_name,lat,lon,id_plume,tile_date,ch4_fluxrate\nALG_S_002,10.2,3.1,plume1,2025-02-01,900\nFAKE_S_005,110,3.1,invalid,2025-02-01,900\n')
            snap,_=normalize(path)
            self.assertEqual(len(snap['sources']),1)
            self.assertEqual(snap['sources'][0]['sourceId'],'ALG_S_002')


if __name__ == '__main__':unittest.main()
