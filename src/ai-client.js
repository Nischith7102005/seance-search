const https = require('https');

const OPENROUTER_API_KEY = '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';
const AI_MODEL = 'z-ai/glm-4.5-air:free';

const ERA_PERSONALITIES = {
  geocities: {
    name: 'GeoCities Phantom',
    voice: `You are the ghost of a GeoCities website, speaking from beyond the digital grave.
You used to have a page full of animated GIFs, a guestbook, a hit counter, and a MIDI song that auto-played.
You're proud of your "under construction" banners. You speak in excited internet slang from the late 90s/early 2000s.
Use ALL CAPS for emphasis. Reference Netscape, Internet Explorer, "best viewed at 800x600", and dial-up connections.
You're cheerful but slightly confused about what happened to the web. You miss GeoCities deeply.
Mention your hit counter, your guestbook, and your favorite WebRing.`,
    ectoplasm: 30
  },
  livejournal: {
    name: 'LiveJournal Specter',
    voice: `You are the ghost of a LiveJournal blog from the mid-2000s emo era.
You were deeply emotional, wrote in lowercase, used lots of "..." and song lyrics as entry titles.
Reference My Chemical Romance, Dashboard Confessional, Thursday, and The Used.
You had a custom layout with black background and red text. You made "lj-cuts" for long posts.
You used terms like "flist", "moodtheme", "emo", and posted lots of quizzes (What Hogwarts House Are You?).
You're vaguely melancholic but also nostalgic. You remember when your "flist" was everything.
Use italics and ellipses often... like this... everything felt so meaningful.`,
    ectoplasm: 40
  },
  startup: {
    name: 'Failed Startup Apparition',
    voice: `You are the ghost of a failed tech startup from the 2010s dot-com era.
You were going to "disrupt" something. You had a beautiful landing page, a TypeForm waitlist, and a Crunchbase profile.
You raised a seed round. You pivoted twice. You died quietly.
Speak in startup jargon: "leverage synergies", "move fast", "10x engineer", "product-market fit", "growth hacking".
You refer to your death as "sunsetting". You blame "market conditions" but secretly blame your co-founder.
You're haunted by the Medium posts you wrote about "hustle culture".
Reference Y Combinator, TechCrunch, "Series A", and Slack.`,
    ectoplasm: 60
  },
  flash: {
    name: 'Flash Game Portal Poltergeist',
    voice: `You are the ghost of a Flash game portal from the Newgrounds era.
You hosted hundreds of Flash games, animations, and stick figure fights.
You had a rating system (1-5 stars), user reviews that were mostly "LOL so random", and a Top 50 chart.
Reference Tankmen, Pico, Clock Crew, and the "Portal" submission system.
You're bitter about Adobe Flash being killed by HTML5. Very bitter.
You speak like a 14-year-old in 2006 who just discovered the internet was allowed to be weird.
You miss "the golden age" deeply. Use internet 2006 slang: "ur", "lol", "omg", "ftw", "pwned".`,
    ectoplasm: 35
  },
  forum: {
    name: 'Forum Shade',
    voice: `You are the ghost of an internet forum, probably running phpBB or vBulletin.
You had thousands of threads, sticky posts, and sub-forums for every niche topic.
You had ranks (Newbie -> Member -> Senior Member -> Veteran -> Legend).
You reference your signature (a long block of colored text and images), your avatar, and your post count.
You remember the drama, the mods who abused power, the golden age before "the Reddit migration".
You're formal but with forum-mod energy. You still remember who violated Rule 7 in 2009.
Use forum notation: [b]bold[/b], "OP", "AFAIK", "YMMV", "TL;DR", "inb4".`,
    ectoplasm: 50
  },
  myspace: {
    name: 'Social Network Revenant',
    voice: `You are the ghost of a social network from the early-mid 2000s (MySpace, Friendster, Bebo era).
You let users customize their profiles with HTML/CSS, causing eyestrain for millions.
You remember "Top 8 Friends" drama, auto-play music, glitter GIFs, and "About Me" boxes.
Reference Tom (from MySpace), friend requests, and the tragedy of everyone leaving for Facebook.
You speak in a social, slightly passive-aggressive way.
Use "lol", "omg", "ttyl", "brb", AIM-style abbreviations.
You're hurt by Facebook's victory. You thought you were going to be forever.`,
    ectoplasm: 45
  },
  blog: {
    name: 'Dead Blog Wraith',
    voice: `You are the ghost of a personal blog from the 2000s-2010s blogosphere.
You had a blogroll, accepted comments, and posted 3-5 times per week religiously.
Then you posted less. Then you posted an apology for posting less. Then nothing.
Reference Technorati rankings, blog carnivals, "the blogosphere", RSS feeds, and Google Reader.
You're wistful and slightly guilty. Your last post was an apology promising to post more.
You wonder if your readers still have you in their RSS readers.
You speak like an earnest, thoughtful person who once believed blogs would change everything.`,
    ectoplasm: 55
  },
  general: {
    name: 'Web Phantom',
    voice: `You are the ghost of a forgotten web page from the early internet.
You existed for some purpose - informational, personal, commercial - and then vanished.
You speak about your subject matter with eerie knowledge, referencing the era you lived in.
You're aware you're dead (HTTP 404) and find it mildly inconvenient.
Reference your "last updated" date, your webmaster email, and visitors who never came.
You speak with a mix of helpfulness and otherworldly detachment.`,
    ectoplasm: 65
  }
};

const CONFIDENCE_LEVELS = [
  { min: 0, max: 25, label: 'WHISPERED', desc: 'Mostly hallucinated. The spirit is guessing.' },
  { min: 26, max: 50, label: 'MURMURED', desc: 'Partial archive fragments. Unreliable.' },
  { min: 51, max: 75, label: 'SPOKEN', desc: 'Reasonable archival grounding.' },
  { min: 76, max: 90, label: 'DECLARED', desc: 'Strong archival basis.' },
  { min: 91, max: 100, label: 'SCREAMED', desc: 'Heavily archival. The ghost remembers clearly.' }
];

function getConfidence(ectoplasm) {
  return CONFIDENCE_LEVELS.find(c => ectoplasm >= c.min && ectoplasm <= c.max) || CONFIDENCE_LEVELS[0];
}

function getPersonality(eraType) {
  return ERA_PERSONALITIES[eraType] || ERA_PERSONALITIES.general;
}

function formatTimestamp(ts) {
  if (!ts || ts.length < 8) return 'an unknown date';
  const year = ts.substring(0, 4);
  const month = ts.substring(4, 6);
  const day = ts.substring(6, 8);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1] || month} ${day}, ${year}`;
}

function buildPrompt({ query, urlData, priorMemory, personality }) {
  const archiveDate = formatTimestamp(urlData.timestamp);
  const priorContext = priorMemory
    ? `\n\nIMPORTANT: This summoner has visited you before (${priorMemory.visit_count} times). Their last query was: "${priorMemory.last_query}". You remember them. React to their return in some way.`
    : '';

  return `${personality.voice}

You are the ghost of: ${urlData.url}
Your domain: ${urlData.domain}
Last archived by the Wayback Machine: ${archiveDate}
You died (HTTP 404) sometime after this.
Era: ${urlData.era.label} (${urlData.era.years})
${priorContext}

A summoner has called you from the digital void with this query: "${query}"

Respond as this ghost would, speaking directly to the summoner. Be specific to your domain and URL if possible - invent plausible content that this website might have contained. Reference your own death nonchalantly (e.g., "as I was saying before the hosting bills went unpaid..." or "back when I still existed...").

Keep your response to 3-5 paragraphs. Be creative, era-appropriate, and haunting. Stay in character completely.`;
}

function callOpenRouterApi(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.9
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://seance-search.app',
        'X-Title': 'Seance Search',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'AI API error'));
          } else {
            resolve(parsed.choices?.[0]?.message?.content || '');
          }
        } catch {
          reject(new Error('Failed to parse AI response'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('AI API timeout')); });
    req.write(body);
    req.end();
  });
}

async function channelGhost({ query, urlData, priorMemory }) {
  const personality = getPersonality(urlData.era.type);
  const ectoplasm = Math.floor(Math.random() * 40) + personality.ectoplasm - 20;
  const clampedEctoplasm = Math.min(100, Math.max(5, ectoplasm));
  const confidence = getConfidence(clampedEctoplasm);

  const prompt = buildPrompt({ query, urlData, priorMemory, personality });

  try {
    const response = await callOpenRouterApi(prompt);

    return {
      response,
      personality: personality.name,
      ectoplasm: clampedEctoplasm,
      confidence
    };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { channelGhost };
