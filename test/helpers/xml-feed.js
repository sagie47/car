import http from 'node:http';

export function buildInventoryXml(vehicles) {
  const vehicleXml = vehicles
    .map(
      (vehicle) => `
      <vehicle>
        <vin>${vehicle.vin}</vin>
        <stockNumber>${vehicle.stockNumber}</stockNumber>
        <year>${vehicle.year}</year>
        <make>${vehicle.make}</make>
        <model>${vehicle.model}</model>
        <trim>${vehicle.trim}</trim>
        <mileage>${vehicle.mileage}</mileage>
        <price>${vehicle.price}</price>
        <bodyStyle>${vehicle.bodyStyle}</bodyStyle>
        <exteriorColor>${vehicle.exteriorColor}</exteriorColor>
        <status>${vehicle.status}</status>
        <daysInInventory>${vehicle.daysInInventory}</daysInInventory>
        <photos>
          ${vehicle.photoUrls.map((photoUrl) => `<photo>${photoUrl}</photo>`).join('')}
        </photos>
      </vehicle>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<inventory>
  <vehicles>${vehicleXml}
  </vehicles>
</inventory>`;
}

export async function createXmlFeedServer({ body, getBody, statusCode = 200, contentType = 'application/xml' }) {
  const server = http.createServer((request, response) => {
    response.writeHead(statusCode, {
      'Content-Type': contentType
    });
    response.end(typeof getBody === 'function' ? getBody() : body);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  return {
    url: `http://127.0.0.1:${address.port}/feed.xml`,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  };
}
