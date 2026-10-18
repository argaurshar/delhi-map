"""Focused source-fidelity checks: .venv/bin/python scripts/test_prepare_data.py."""
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import prepare_data


class SourceFidelityTest(unittest.TestCase):
    def test_name_uses_same_record_and_skips_blank_values(self):
        self.assertEqual(prepare_data.mapped_name({'name:en': '', 'name': 'दीवान-ए-खास'}), ('दीवान-ए-खास', 'name'))
        self.assertEqual(prepare_data.mapped_name({'official_name': 'Recorded official name'}), ('Recorded official name', 'official_name'))
        self.assertEqual(prepare_data.mapped_name({'addr:street': 'Named street', 'operator': 'Named operator'}), ('', ''))

    def test_paving_is_not_inferred_from_parking_or_pedestrian_lines(self):
        self.assertEqual(prepare_data.area_role({'amenity': 'parking'}), 'parking')
        self.assertEqual(prepare_data.surface_status({'amenity': 'parking'}), 'unknown')
        self.assertEqual(prepare_data.surface_status({'surface': 'asphalt'}), 'hard')
        self.assertEqual(prepare_data.surface_status({'surface': 'grass'}), 'soft')
        self.assertIsNone(prepare_data.area_role({'highway': 'pedestrian'}))
        self.assertIsNone(prepare_data.area_role({'amenity': 'parking', 'parking': 'underground'}))
        self.assertIsNone(prepare_data.area_role({'building': 'yes', 'amenity': 'parking'}))

    def test_supplemental_area_keeps_road_and_canonical_source(self):
        xml = '''<osm><meta osm_base="2026-10-15T20:21:00Z"/>
        <node id="1" lon="77.21" lat="28.60"/>
        <node id="2" lon="77.211" lat="28.60"/>
        <node id="3" lon="77.211" lat="28.601"/>
        <node id="4" lon="77.21" lat="28.601"/>
        <way id="10"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/>
        <tag k="highway" v="pedestrian"/><tag k="area" v="yes"/>
        <tag k="access" v="private"/><tag k="surface" v="paving_stones"/>
        <tag k="official_name" v="Mapped square"/><tag k="addr:district" v="Central Delhi"/>
        </way></osm>'''
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'input.osm'
            source.write_text(xml)
            with patch.object(prepare_data, 'ROOT', root), contextlib.redirect_stdout(io.StringIO()):
                prepare_data.build(source, 'https://example.test/source')
            features = json.loads((root / 'public/data/delhi.geojson').read_text())['features']
            self.assertEqual([f['properties']['kind'] for f in features], ['road', 'paved'])
            self.assertEqual(features[0]['geometry']['type'], 'LineString')
            area = features[1]
            self.assertEqual(area['geometry']['type'], 'Polygon')
            self.assertEqual(area['properties']['id'], 'way/10:area')
            self.assertEqual(area['properties']['source_url'], 'https://www.openstreetmap.org/way/10')
            self.assertEqual(area['properties']['name'], 'Mapped square')
            self.assertEqual(area['properties']['surface_status'], 'hard')
            self.assertEqual(area['properties']['tags']['access'], 'private')
            self.assertEqual(area['properties']['tags']['addr:district'], 'Central Delhi')
            self.assertNotIn('ownership', area['properties']['tags'])
            manifest_path = root / 'public/data/manifest.json'
            manifest = json.loads(manifest_path.read_text())
            manifest['upstream_file'] = 'https://example.test/source.pbf'
            manifest['upstream_sha256'] = 'same-verified-input'
            manifest_path.write_text(json.dumps(manifest))
            with patch.object(prepare_data, 'ROOT', root), contextlib.redirect_stdout(io.StringIO()):
                prepare_data.build(source, 'https://example.test/source')
            self.assertEqual(json.loads(manifest_path.read_text())['upstream_sha256'], 'same-verified-input')
            source.write_text(xml.replace('Mapped square', 'Changed square'))
            with patch.object(prepare_data, 'ROOT', root), contextlib.redirect_stdout(io.StringIO()):
                prepare_data.build(source, 'https://example.test/source')
            self.assertNotIn('upstream_sha256', json.loads(manifest_path.read_text()))


if __name__ == '__main__':
    unittest.main()
