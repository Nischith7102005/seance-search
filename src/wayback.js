const https = require('https');

const ERA_SIGNATURES = {
  geocities: { pattern: /(geocities|tripod|angelfire|freewebs|homestead)/, label: 'GeoCities Era', years: '1996-2009' },
  livejournal: { pattern: /(livejournal|deadjournal|greatestjournal|blurty)/, label: 'LiveJournal Era', years: '2000-2010' },
  startup: { pattern: /(startup|launch|beta|pivot|disrupt|vc|series[ab])/, label: 'Failed Startup', years: '2000-2023' },
  flash: { pattern: /(newgrounds|flashgames|addictinggames|kongregate|miniclip)/, label: 'Flash Game Portal', years: '2000-2012' },
  forum: { pattern: /(phpbb|ezboard|invisionfree|proboards|freeforums)/, label: 'Internet Forum', years: '1999-2015' },
  myspace: { pattern: /(myspace|bebo|friendster|hi5|orkut)/, label: 'Social Network Graveyard', years: '2003-2014' },
  blog: { pattern: /(blogspot|wordpress|typepad|blogger|livejournal)/, label: 'Dead Blog', years: '2002-2018' },
  general: { pattern: /.*/, label: 'Lost Web Page', years: '1995-2020' }
};

function detectEra(url, timestamp) {
  const year = timestamp ? parseInt(timestamp.substring(0, 4)) : 2005;
  const urlLower = url.toLowerCase();

  for (const [key, era] of Object.entries(ERA_SIGNATURES)) {
    if (key !== 'general' && era.pattern.test(urlLower)) {
      return { type: key, label: era.label, years: era.years, year };
    }
  }

  if (year < 2000) return { type: 'geocities', label: 'Early Web Relic', years: '1994-1999', year };
  if (year < 2005) return { type: 'forum', label: 'Early 2000s Web', years: '2000-2004', year };
  if (year < 2010) return { type: 'blog', label: 'Mid-2000s Blog Era', years: '2005-2009', year };
  if (year < 2015) return { type: 'startup', label: 'Web 2.0 Graveyard', years: '2010-2014', year };
  return { type: 'general', label: 'Lost Web Page', years: '2015-2023', year };
}

function extractDomain(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `http://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.split('/')[0].replace(/^www\./, '');
  }
}

function extractKeywords(query) {
  const stopWords = new Set(['how', 'to', 'the', 'a', 'an', 'and', 'or', 'for', 'of', 'in', 'on', 'at', 'with', 'about', 'is', 'was', 'are', 'were']);
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 3);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function searchWayback(query) {
  const keywords = extractKeywords(query);
  const results = [];
  const seen = new Set();

  for (const keyword of keywords) {
    try {
      const encodedKeyword = encodeURIComponent(keyword);
      const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=*${encodedKeyword}*&output=json&fl=original,timestamp,statuscode&filter=statuscode:404&limit=20&collapse=urlkey&matchType=domain`;

      const data = await fetchJson(cdxUrl);

      if (!Array.isArray(data) || data.length < 2) continue;

      for (let i = 1; i < data.length && results.length < 15; i++) {
        const [url, timestamp, statuscode] = data[i];
        if (!url || seen.has(url)) continue;
        seen.add(url);

        const domain = extractDomain(url);
        const era = detectEra(url, timestamp);

        results.push({ url, timestamp, statuscode, domain, era });
      }
    } catch {
      continue;
    }
  }

  if (results.length === 0) {
    results.push(...getFallbackGhosts(query));
  }

  return shuffleAndPick(results, 5);
}

function shuffleAndPick(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function getFallbackGhosts(query) {
  const keyword = query.split(' ')[0].toLowerCase();
  return [
    {
      url: `http://www.${keyword}-fans.tripod.com/index.html`,
      timestamp: '20050312143022',
      statuscode: '404',
      domain: `${keyword}-fans.tripod.com`,
      era: { type: 'geocities', label: 'GeoCities Era', years: '1996-2009', year: 2005 }
    },
    {
      url: `http://geocities.com/SiliconValley/Hub/${Math.floor(Math.random() * 9000) + 1000}/${keyword}.html`,
      timestamp: '20020618093045',
      statuscode: '404',
      domain: 'geocities.com',
      era: { type: 'geocities', label: 'GeoCities Era', years: '1996-2009', year: 2002 }
    },
    {
      url: `http://www.${keyword}central.com/about.php`,
      timestamp: '20080914171233',
      statuscode: '404',
      domain: `${keyword}central.com`,
      era: { type: 'blog', label: 'Mid-2000s Blog Era', years: '2005-2009', year: 2008 }
    }
  ];
}

module.exports = { searchWayback };
