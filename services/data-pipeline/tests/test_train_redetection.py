import sys
from pathlib import Path
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from train_redetection import train

def test_missing_opportunity_labels_refused(tmp_path):
    path = tmp_path / 'detections.csv'
    path.write_text('source_id,snapshot_date,redetected_next_30d\nx,2025-01-01,1\n')
    # The optional research extras must be installed before training.
    pytest.importorskip('sklearn')
    with pytest.raises(ValueError,match='Missing observation-opportunity'):
        train(path,tmp_path / 'result.json')
