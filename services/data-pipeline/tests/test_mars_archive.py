import csv
import io
import sys
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ingest  # noqa: E402


SOURCE_FIELDS = [
    'source_name', 'lon', 'lat', 'country', 'sector', 'source_type', 'persistency',
    'persistency_std', 'persistency_category', 'n_plumes_detected', 'id_last_plume',
    'last_plume_date', 'notified', 'feedback', 'feedback_operator', 'feedback_government',
]
PLUME_FIELDS = [
    'id_plume', 'source_name', 'satellite', 'tile_date', 'lat', 'lon', 'actionable',
    'notified', 'country', 'sector', 'detection_institution', 'quantification_institution',
    'tile', 'ch4_fluxrate', 'ch4_fluxrate_std', 'wind_u', 'wind_v', 'total_emission',
    'total_emission_std', 'wind_speed', 'last_update', 'insert_date', 'tile_background',
]


def write_csv(archive, name, fields, rows):
    with io.TextIOWrapper(archive.open(name, 'w'), encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def sample_source(source_id='USA_S_001'):
    return {
        'source_name': source_id, 'lon': '-101.25', 'lat': '36.75',
        'country': 'United States of America', 'sector': 'Oil and Gas',
        'source_type': 'Compressor', 'persistency': '0.65', 'persistency_std': '0.1',
        'persistency_category': 'Frequent', 'n_plumes_detected': '2',
        'id_last_plume': 'plume-002', 'last_plume_date': '2025-01-02T12:00:00',
        'notified': 'Yes', 'feedback': 'Yes', 'feedback_operator': 'Yes',
        'feedback_government': 'No',
    }


def sample_plume(plume_id, source_id):
    return {
        'id_plume': plume_id, 'source_name': source_id, 'satellite': 'Sentinel-2 - ESA',
        'tile_date': '2025-01-02T12:00:00', 'lat': '36.75', 'lon': '-101.25',
        'actionable': 'Yes', 'notified': 'True', 'country': 'United States of America',
        'sector': 'Oil and Gas', 'detection_institution': 'UNEP IMEO MARS',
        'quantification_institution': 'UNEP IMEO MARS', 'tile': 'tile-001',
        'ch4_fluxrate': '1500', 'ch4_fluxrate_std': '250', 'wind_u': '1.0',
        'wind_v': '2.0', 'total_emission': '', 'total_emission_std': '',
        'wind_speed': '2.2', 'last_update': '', 'insert_date': '', 'tile_background': '',
    }


def make_archive(path, sources=None, plumes=None):
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        write_csv(archive, 'unep_methanedata_detected_sources.csv', SOURCE_FIELDS, sources or [sample_source()])
        write_csv(archive, 'unep_methanedata_detected_plumes.csv', PLUME_FIELDS, plumes or [sample_plume('plume-001', 'USA_S_001')])
        archive.writestr('LICENSE-CC-BY-NC-SA.txt', 'Attribution-NonCommercial-ShareAlike 4.0 International')


class MarsArchiveIngestTests(unittest.TestCase):
    def ingest(self, path):
        parser = getattr(ingest, 'ingest_mars_archive', None)
        self.assertIsNotNone(parser, 'ingest_mars_archive must parse the official two-table MARS archive')
        return parser(path, retrieved_at='2026-10-12T00:00:00Z')

    def test_keeps_source_feedback_separate_and_reports_unlinked_plumes(self):
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / 'mars.zip'
            make_archive(path, plumes=[
                sample_plume('plume-001', 'USA_S_001'),
                sample_plume('plume-002', ''),
                sample_plume('plume-003', 'CAN_S_999'),
            ])
            snapshot, manifest = self.ingest(path)

        self.assertEqual(snapshot['sources'][0]['feedback'], 'Yes')
        self.assertEqual(snapshot['plumes'][0]['sourceId'], 'USA_S_001')
        self.assertNotIn('feedback', snapshot['plumes'][0])
        self.assertEqual([p['linkStatus'] for p in snapshot['plumes']], [
            'linked', 'source_id_missing', 'source_record_missing',
        ])
        self.assertEqual(manifest['counts']['sources'], 1)
        self.assertEqual(manifest['counts']['plumes'], 3)
        self.assertEqual(manifest['counts']['linkedPlumes'], 1)
        self.assertEqual(manifest['counts']['sourceIdMissingPlumes'], 1)
        self.assertEqual(manifest['counts']['sourceRecordMissingPlumes'], 1)
        self.assertEqual(snapshot['sources'][0]['mitigationConfirmed'], None)

    def test_duplicate_source_ids_are_rejected(self):
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / 'mars.zip'
            make_archive(path, sources=[sample_source(), sample_source()])
            with self.assertRaisesRegex(ValueError, 'duplicate source'):
                self.ingest(path)

    def test_duplicate_plume_ids_are_rejected(self):
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / 'mars.zip'
            make_archive(path, plumes=[
                sample_plume('plume-001', 'USA_S_001'),
                sample_plume('plume-001', 'USA_S_001'),
            ])
            with self.assertRaisesRegex(ValueError, 'duplicate plume'):
                self.ingest(path)

    def test_missing_expected_member_is_rejected(self):
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / 'incomplete.zip'
            with zipfile.ZipFile(path, 'w') as archive:
                write_csv(archive, 'unep_methanedata_detected_sources.csv', SOURCE_FIELDS, [sample_source()])
                archive.writestr('LICENSE-CC-BY-NC-SA.txt', 'Attribution-NonCommercial-ShareAlike 4.0 International')
            with self.assertRaisesRegex(ValueError, 'Missing required MARS archive member'):
                self.ingest(path)


if __name__ == '__main__':
    unittest.main()
