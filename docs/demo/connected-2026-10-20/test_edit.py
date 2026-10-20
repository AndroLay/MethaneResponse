import unittest
import tempfile
from pathlib import Path
from PIL import Image
from edit import schedule, overlay


class ScheduleTests(unittest.TestCase):
    def test_first_workflow_caption_preserves_the_authentic_app_view(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'overlay.png';overlay(path,'DEMO first action','DEMO',0)
            with Image.open(path) as image:self.assertEqual(image.getpixel((800,500))[3],0)

    def test_markers_preserve_actual_order_and_eight_seconds_of_editorial_bookends(self):
        events,total=schedule([{'seconds':1,'label':'DEMO scope'},{'seconds':5,'label':'DEMO review'}],10,9)
        self.assertEqual(total,18);self.assertEqual(events[1][0],7)
        self.assertLess(events[1][0],events[2][0]);self.assertEqual(events[-1][0],15)

    def test_invalid_missing_or_reordered_markers_fail(self):
        for markers in [[],[{'seconds':5,'label':'DEMO'},{'seconds':1,'label':'DEMO'}],[{'seconds':12,'label':'DEMO'}]]:
            with self.assertRaises(ValueError):schedule(markers,10,9)


if __name__=='__main__':unittest.main()
