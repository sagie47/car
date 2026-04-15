import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGenericXmlFeed } from '../../src/adapters/generic-xml-feed.js';
import { buildInventoryXml } from '../helpers/xml-feed.js';

test('parseGenericXmlFeed normalizes vehicle nodes from the supported generic_xml_v1 shape', () => {
  const xml = buildInventoryXml([
    {
      vin: '1HGBH41JXMN109186',
      stockNumber: 'A100',
      year: 2021,
      make: 'Toyota',
      model: 'Camry',
      trim: 'SE',
      mileage: 18250,
      price: 25995,
      bodyStyle: 'Sedan',
      exteriorColor: 'Blue',
      status: 'in_stock',
      daysInInventory: 12,
      photoUrls: ['https://example.com/1.jpg', 'https://example.com/2.jpg']
    }
  ]);

  const [vehicle] = parseGenericXmlFeed(xml);

  assert.equal(vehicle.vin, '1HGBH41JXMN109186');
  assert.equal(vehicle.stockNumber, 'A100');
  assert.equal(vehicle.make, 'Toyota');
  assert.equal(vehicle.photoUrls.length, 2);
});

test('parseGenericXmlFeed rejects unsupported XML shapes', () => {
  assert.throws(() => parseGenericXmlFeed('<root><message>hello</message></root>'), {
    message: 'Feed XML does not match the supported generic_xml_v1 shape'
  });
});
