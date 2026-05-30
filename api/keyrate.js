export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, max-age=3600");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const today = new Date();
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    const fmt = d => d.toISOString().slice(0, 10);
    const soap = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://web.cbr.ru/">
  <soap:Body>
    <web:KeyRate>
      <web:fromDate>${fmt(twoYearsAgo)}T00:00:00</web:fromDate>
      <web:ToDate>${fmt(today)}T00:00:00</web:ToDate>
    </web:KeyRate>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch("https://www.cbr.ru/DailyInfoWebServ/DailyInfo.asmx", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://web.cbr.ru/KeyRate"
      },
      body: soap
    });

    const xml = await response.text();

    let matches = [...xml.matchAll(/<KR>\s*<DT>([^<]+)<\/DT>\s*<Rate>([^<]+)<\/Rate>\s*<\/KR>/g)];
    if (matches.length === 0) {
      matches = [...xml.matchAll(/<\w*:?KR>\s*<\w*:?DT>([^<]+)<\/\w*:?DT>\s*<\w*:?Rate>([^<]+)<\/\w*:?Rate>\s*<\/\w*:?KR>/g)];
    }
    if (matches.length === 0) {
      matches = [...xml.matchAll(/<DT[^>]*>([^<]+)<\/DT[^>]*>\s*<Rate[^>]*>([^<]+)<\/Rate[^>]*>/g)];
    }

    if (matches.length === 0) {
      return res.status(200).json({ error: "no data" });
    }

    let bestDate = "";
    let bestRate = null;
    for (const m of matches) {
      const d = m[1].slice(0, 10);
      if (d > bestDate) {
        bestDate = d;
        bestRate = parseFloat(m[2]);
      }
    }

    return res.status(200).json({ rate: bestRate, date: bestDate });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
