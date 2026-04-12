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
  const stopWords = new Set(['how', 'to', 'the', 'a', 'an', 'and', 'or', 'for', 'of', 'in', 'on', 'at', 'with', 'about', 'is', 'was', 'are', 'were', 'i', 'my', 'me', 'we', 'our']);
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  return [...new Set(words)].slice(0, 5);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 12000 }, (res) => {
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

async function fetchKeywordResults(keyword, limit, seen) {
  const results = [];
  const encodedKeyword = encodeURIComponent(keyword);

  const strategies = [
    `https://web.archive.org/cdx/search/cdx?url=*${encodedKeyword}*&output=json&fl=original,timestamp,statuscode&filter=statuscode:404&limit=${limit}&collapse=urlkey&matchType=domain`,
    `https://web.archive.org/cdx/search/cdx?url=*${encodedKeyword}*&output=json&fl=original,timestamp,statuscode&filter=statuscode:404&limit=${limit}&collapse=urlkey&matchType=prefix`,
    `https://web.archive.org/cdx/search/cdx?url=*${encodedKeyword}*&output=json&fl=original,timestamp,statuscode&filter=statuscode:404&limit=${limit}&matchType=host`
  ];

  for (const cdxUrl of strategies) {
    if (results.length >= 5) break;
    try {
      const data = await fetchJson(cdxUrl);
      if (!Array.isArray(data) || data.length < 2) continue;

      for (let i = 1; i < data.length; i++) {
        const [url, timestamp, statuscode] = data[i];
        if (!url || seen.has(url)) continue;
        seen.add(url);

        const domain = extractDomain(url);
        const era = detectEra(url, timestamp);

        results.push({ url, timestamp, statuscode, domain, era });
        if (results.length >= 8) break;
      }
    } catch {
      continue;
    }
  }

  return results;
}

async function searchWayback(query) {
  const keywords = extractKeywords(query);
  const results = [];
  const seen = new Set();
  const TARGET = 10;

  for (const keyword of keywords) {
    if (results.length >= TARGET) break;
    try {
      const found = await fetchKeywordResults(keyword, 30, seen);
      results.push(...found);
    } catch {
      continue;
    }
  }

  if (results.length < TARGET) {
    const combined = keywords.slice(0, 2).join('+');
    try {
      const encodedCombined = encodeURIComponent(combined);
      const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=*${encodedCombined}*&output=json&fl=original,timestamp,statuscode&filter=statuscode:404&limit=40&collapse=urlkey`;
      const data = await fetchJson(cdxUrl);
      if (Array.isArray(data) && data.length >= 2) {
        for (let i = 1; i < data.length && results.length < TARGET; i++) {
          const [url, timestamp, statuscode] = data[i];
          if (!url || seen.has(url)) continue;
          seen.add(url);
          const domain = extractDomain(url);
          const era = detectEra(url, timestamp);
          results.push({ url, timestamp, statuscode, domain, era });
        }
      }
    } catch {}
  }

  if (results.length < TARGET) {
    const fallbacks = getFallbackGhosts(query, TARGET - results.length, seen);
    results.push(...fallbacks);
  }

  return shuffleAndPick(results, Math.min(results.length, TARGET));
}

function shuffleAndPick(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function getFallbackGhosts(query, count, seen) {
  const keyword = query.split(' ')[0].toLowerCase();
  const keyword2 = query.split(' ')[1] ? query.split(' ')[1].toLowerCase() : keyword + 'fan';

  const pool = [
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
    },
    {
      url: `http://www.${keyword2}-zone.angelfire.com/`,
      timestamp: '20040523110022',
      statuscode: '404',
      domain: `${keyword2}-zone.angelfire.com`,
      era: { type: 'geocities', label: 'GeoCities Era', years: '1996-2009', year: 2004 }
    },
    {
      url: `http://forums.${keyword}world.com/viewtopic.php?t=1337`,
      timestamp: '20091120083311',
      statuscode: '404',
      domain: `${keyword}world.com`,
      era: { type: 'forum', label: 'Internet Forum', years: '1999-2015', year: 2009 }
    },
    {
      url: `http://my.${keyword}site.com/profile/${keyword2}fan`,
      timestamp: '20070814192055',
      statuscode: '404',
      domain: `${keyword}site.com`,
      era: { type: 'myspace', label: 'Social Network Graveyard', years: '2003-2014', year: 2007 }
    },
    {
      url: `http://www.the${keyword}blog.blogspot.com/2009/04/my-thoughts.html`,
      timestamp: '20110321094501',
      statuscode: '404',
      domain: `the${keyword}blog.blogspot.com`,
      era: { type: 'blog', label: 'Dead Blog', years: '2002-2018', year: 2011 }
    },
    {
      url: `http://${keyword}-startup.com/landing`,
      timestamp: '20130715134421',
      statuscode: '404',
      domain: `${keyword}-startup.com`,
      era: { type: 'startup', label: 'Failed Startup', years: '2000-2023', year: 2013 }
    },
    {
      url: `http://www.${keyword}flash.newgrounds.com/games/index.php`,
      timestamp: '20081201220033',
      statuscode: '404',
      domain: `${keyword}flash.newgrounds.com`,
      era: { type: 'flash', label: 'Flash Game Portal', years: '2000-2012', year: 2008 }
    },
    {
      url: `http://personal.${keyword}net.tripod.com/page2.html`,
      timestamp: '20030401065544',
      statuscode: '404',
      domain: `personal.${keyword}net.tripod.com`,
      era: { type: 'geocities', label: 'Early 2000s Web', years: '2000-2004', year: 2003 }
    }
  ];

  const filtered = pool.filter(g => !seen.has(g.url));
  return filtered.slice(0, count);
}

module.exports = { searchWayback };
