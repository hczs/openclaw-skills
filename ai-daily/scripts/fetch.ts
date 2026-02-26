import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// NOTE: This script intentionally contains NO LLM calls.
// It only fetches RSS/Atom feeds, normalizes articles, filters by time range,
// and writes raw data for the agent (LLM) to curate in-chat.

const FEED_FETCH_TIMEOUT_MS = 15_000;
const FEED_CONCURRENCY = 10;

// 90 RSS feeds from Hacker News Popularity Contest 2025 (curated by Karpathy)
const RSS_FEEDS: Array<{ name: string; xmlUrl: string; htmlUrl: string }> = [
  { name: "simonwillison.net", xmlUrl: "https://simonwillison.net/atom/everything/", htmlUrl: "https://simonwillison.net" },
  { name: "jeffgeerling.com", xmlUrl: "https://www.jeffgeerling.com/blog.xml", htmlUrl: "https://jeffgeerling.com" },
  { name: "seangoedecke.com", xmlUrl: "https://www.seangoedecke.com/rss.xml", htmlUrl: "https://seangoedecke.com" },
  { name: "krebsonsecurity.com", xmlUrl: "https://krebsonsecurity.com/feed/", htmlUrl: "https://krebsonsecurity.com" },
  { name: "daringfireball.net", xmlUrl: "https://daringfireball.net/feeds/main", htmlUrl: "https://daringfireball.net" },
  { name: "ericmigi.com", xmlUrl: "https://ericmigi.com/rss.xml", htmlUrl: "https://ericmigi.com" },
  { name: "antirez.com", xmlUrl: "http://antirez.com/rss", htmlUrl: "http://antirez.com" },
  { name: "idiallo.com", xmlUrl: "https://idiallo.com/feed.rss", htmlUrl: "https://idiallo.com" },
  { name: "maurycyz.com", xmlUrl: "https://maurycyz.com/index.xml", htmlUrl: "https://maurycyz.com" },
  { name: "pluralistic.net", xmlUrl: "https://pluralistic.net/feed/", htmlUrl: "https://pluralistic.net" },
  { name: "shkspr.mobi", xmlUrl: "https://shkspr.mobi/blog/feed/", htmlUrl: "https://shkspr.mobi" },
  { name: "lcamtuf.substack.com", xmlUrl: "https://lcamtuf.substack.com/feed", htmlUrl: "https://lcamtuf.substack.com" },
  { name: "mitchellh.com", xmlUrl: "https://mitchellh.com/feed.xml", htmlUrl: "https://mitchellh.com" },
  { name: "dynomight.net", xmlUrl: "https://dynomight.net/feed.xml", htmlUrl: "https://dynomight.net" },
  { name: "utcc.utoronto.ca/~cks", xmlUrl: "https://utcc.utoronto.ca/~cks/space/blog/?atom", htmlUrl: "https://utcc.utoronto.ca/~cks" },
  { name: "xeiaso.net", xmlUrl: "https://xeiaso.net/blog.rss", htmlUrl: "https://xeiaso.net" },
  { name: "devblogs.microsoft.com/oldnewthing", xmlUrl: "https://devblogs.microsoft.com/oldnewthing/feed", htmlUrl: "https://devblogs.microsoft.com/oldnewthing" },
  { name: "righto.com", xmlUrl: "https://www.righto.com/feeds/posts/default", htmlUrl: "https://righto.com" },
  { name: "lucumr.pocoo.org", xmlUrl: "https://lucumr.pocoo.org/feed.atom", htmlUrl: "https://lucumr.pocoo.org" },
  { name: "skyfall.dev", xmlUrl: "https://skyfall.dev/rss.xml", htmlUrl: "https://skyfall.dev" },
  { name: "garymarcus.substack.com", xmlUrl: "https://garymarcus.substack.com/feed", htmlUrl: "https://garymarcus.substack.com" },
  { name: "rachelbythebay.com", xmlUrl: "https://rachelbythebay.com/w/atom.xml", htmlUrl: "https://rachelbythebay.com" },
  { name: "overreacted.io", xmlUrl: "https://overreacted.io/rss.xml", htmlUrl: "https://overreacted.io" },
  { name: "timsh.org", xmlUrl: "https://timsh.org/rss/", htmlUrl: "https://timsh.org" },
  { name: "johndcook.com", xmlUrl: "https://www.johndcook.com/blog/feed/", htmlUrl: "https://johndcook.com" },
  { name: "gilesthomas.com", xmlUrl: "https://gilesthomas.com/feed/rss.xml", htmlUrl: "https://gilesthomas.com" },
  { name: "matklad.github.io", xmlUrl: "https://matklad.github.io/feed.xml", htmlUrl: "https://matklad.github.io" },
  { name: "derekthompson.org", xmlUrl: "https://www.theatlantic.com/feed/author/derek-thompson/", htmlUrl: "https://derekthompson.org" },
  { name: "evanhahn.com", xmlUrl: "https://evanhahn.com/feed.xml", htmlUrl: "https://evanhahn.com" },
  { name: "terriblesoftware.org", xmlUrl: "https://terriblesoftware.org/feed/", htmlUrl: "https://terriblesoftware.org" },
  { name: "rakhim.exotext.com", xmlUrl: "https://rakhim.exotext.com/rss.xml", htmlUrl: "https://rakhim.exotext.com" },
  { name: "joanwestenberg.com", xmlUrl: "https://joanwestenberg.com/rss", htmlUrl: "https://joanwestenberg.com" },
  { name: "xania.org", xmlUrl: "https://xania.org/feed", htmlUrl: "https://xania.org" },
  { name: "micahflee.com", xmlUrl: "https://micahflee.com/feed/", htmlUrl: "https://micahflee.com" },
  { name: "nesbitt.io", xmlUrl: "https://nesbitt.io/feed.xml", htmlUrl: "https://nesbitt.io" },
  { name: "construction-physics.com", xmlUrl: "https://www.construction-physics.com/feed", htmlUrl: "https://www.construction-physics.com" },
  { name: "tedium.co", xmlUrl: "https://feed.tedium.co/", htmlUrl: "https://tedium.co" },
  { name: "susam.net", xmlUrl: "https://susam.net/feed.xml", htmlUrl: "https://susam.net" },
  { name: "entropicthoughts.com", xmlUrl: "https://entropicthoughts.com/feed.xml", htmlUrl: "https://entropicthoughts.com" },
  { name: "buttondown.com/hillelwayne", xmlUrl: "https://buttondown.com/hillelwayne/rss", htmlUrl: "https://buttondown.com/hillelwayne" },
  { name: "dwarkesh.com", xmlUrl: "https://www.dwarkeshpatel.com/feed", htmlUrl: "https://www.dwarkeshpatel.com" },
  { name: "borretti.me", xmlUrl: "https://borretti.me/feed.xml", htmlUrl: "https://borretti.me" },
  { name: "wheresyoured.at", xmlUrl: "https://www.wheresyoured.at/rss/", htmlUrl: "https://www.wheresyoured.at" },
  { name: "jayd.ml", xmlUrl: "https://jayd.ml/feed.xml", htmlUrl: "https://jayd.ml" },
  { name: "minimaxir.com", xmlUrl: "https://minimaxir.com/index.xml", htmlUrl: "https://minimaxir.com" },
  { name: "geohot.github.io", xmlUrl: "https://geohot.github.io/blog/feed.xml", htmlUrl: "https://geohot.github.io" },
  { name: "paulgraham.com", xmlUrl: "http://www.aaronsw.com/2002/feeds/pgessays.rss", htmlUrl: "https://paulgraham.com" },
  { name: "filfre.net", xmlUrl: "https://www.filfre.net/feed/", htmlUrl: "https://www.filfre.net" },
  { name: "blog.jim-nielsen.com", xmlUrl: "https://blog.jim-nielsen.com/feed.xml", htmlUrl: "https://blog.jim-nielsen.com" },
  { name: "dfarq.homeip.net", xmlUrl: "https://dfarq.homeip.net/feed/", htmlUrl: "https://dfarq.homeip.net" },
  { name: "jyn.dev", xmlUrl: "https://jyn.dev/atom.xml", htmlUrl: "https://jyn.dev" },
  { name: "geoffreylitt.com", xmlUrl: "https://www.geoffreylitt.com/feed.xml", htmlUrl: "https://www.geoffreylitt.com" },
  { name: "downtowndougbrown.com", xmlUrl: "https://www.downtowndougbrown.com/feed/", htmlUrl: "https://www.downtowndougbrown.com" },
  { name: "brutecat.com", xmlUrl: "https://brutecat.com/rss.xml", htmlUrl: "https://brutecat.com" },
  { name: "eli.thegreenplace.net", xmlUrl: "https://eli.thegreenplace.net/feeds/all.atom.xml", htmlUrl: "https://eli.thegreenplace.net" },
  { name: "abortretry.fail", xmlUrl: "https://www.abortretry.fail/feed", htmlUrl: "https://www.abortretry.fail" },
  { name: "fabiensanglard.net", xmlUrl: "https://fabiensanglard.net/rss.xml", htmlUrl: "https://fabiensanglard.net" },
  { name: "oldvcr.blogspot.com", xmlUrl: "https://oldvcr.blogspot.com/feeds/posts/default", htmlUrl: "https://oldvcr.blogspot.com" },
  { name: "bogdanthegeek.github.io", xmlUrl: "https://bogdanthegeek.github.io/blog/index.xml", htmlUrl: "https://bogdanthegeek.github.io" },
  { name: "hugotunius.se", xmlUrl: "https://hugotunius.se/feed.xml", htmlUrl: "https://hugotunius.se" },
  { name: "gwern.net", xmlUrl: "https://gwern.substack.com/feed", htmlUrl: "https://gwern.net" },
  { name: "berthub.eu", xmlUrl: "https://berthub.eu/articles/index.xml", htmlUrl: "https://berthub.eu" },
  { name: "chadnauseam.com", xmlUrl: "https://chadnauseam.com/rss.xml", htmlUrl: "https://chadnauseam.com" },
  { name: "simone.org", xmlUrl: "https://simone.org/feed/", htmlUrl: "https://simone.org" },
  { name: "it-notes.dragas.net", xmlUrl: "https://it-notes.dragas.net/feed/", htmlUrl: "https://it-notes.dragas.net" },
  { name: "beej.us", xmlUrl: "https://beej.us/blog/rss.xml", htmlUrl: "https://beej.us" },
  { name: "hey.paris", xmlUrl: "https://hey.paris/index.xml", htmlUrl: "https://hey.paris" },
  { name: "danielwirtz.com", xmlUrl: "https://danielwirtz.com/rss.xml", htmlUrl: "https://danielwirtz.com" },
  { name: "matduggan.com", xmlUrl: "https://matduggan.com/rss/", htmlUrl: "https://matduggan.com" },
  { name: "refactoringenglish.com", xmlUrl: "https://refactoringenglish.com/index.xml", htmlUrl: "https://refactoringenglish.com" },
  { name: "worksonmymachine.substack.com", xmlUrl: "https://worksonmymachine.substack.com/feed", htmlUrl: "https://worksonmymachine.substack.com" },
  { name: "philiplaine.com", xmlUrl: "https://philiplaine.com/index.xml", htmlUrl: "https://philiplaine.com" },
  { name: "steveblank.com", xmlUrl: "https://steveblank.com/feed/", htmlUrl: "https://steveblank.com" },
  { name: "bernsteinbear.com", xmlUrl: "https://bernsteinbear.com/feed.xml", htmlUrl: "https://bernsteinbear.com" },
  { name: "danieldelaney.net", xmlUrl: "https://danieldelaney.net/feed", htmlUrl: "https://danieldelaney.net" },
  { name: "troyhunt.com", xmlUrl: "https://www.troyhunt.com/rss/", htmlUrl: "https://www.troyhunt.com" },
  { name: "herman.bearblog.dev", xmlUrl: "https://herman.bearblog.dev/feed/", htmlUrl: "https://herman.bearblog.dev" },
  { name: "tomrenner.com", xmlUrl: "https://tomrenner.com/index.xml", htmlUrl: "https://tomrenner.com" },
  { name: "blog.pixelmelt.dev", xmlUrl: "https://blog.pixelmelt.dev/rss/", htmlUrl: "https://blog.pixelmelt.dev" },
  { name: "martinalderson.com", xmlUrl: "https://martinalderson.com/feed.xml", htmlUrl: "https://martinalderson.com" },
  { name: "danielchasehooper.com", xmlUrl: "https://danielchasehooper.com/feed.xml", htmlUrl: "https://danielchasehooper.com" },
  { name: "chiark.greenend.org.uk/~sgtatham", xmlUrl: "https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/feed.xml", htmlUrl: "https://www.chiark.greenend.org.uk/~sgtatham" },
  { name: "grantslatton.com", xmlUrl: "https://grantslatton.com/rss.xml", htmlUrl: "https://grantslatton.com" },
  { name: "experimental-history.com", xmlUrl: "https://www.experimental-history.com/feed", htmlUrl: "https://www.experimental-history.com" },
  { name: "anildash.com", xmlUrl: "https://anildash.com/feed.xml", htmlUrl: "https://anildash.com" },
  { name: "aresluna.org", xmlUrl: "https://aresluna.org/main.rss", htmlUrl: "https://aresluna.org" },
  { name: "michael.stapelberg.ch", xmlUrl: "https://michael.stapelberg.ch/feed.xml", htmlUrl: "https://michael.stapelberg.ch" },
  { name: "miguelgrinberg.com", xmlUrl: "https://blog.miguelgrinberg.com/feed", htmlUrl: "https://blog.miguelgrinberg.com" },
  { name: "keygen.sh", xmlUrl: "https://keygen.sh/blog/feed.xml", htmlUrl: "https://keygen.sh" },
  { name: "mjg59.dreamwidth.org", xmlUrl: "https://mjg59.dreamwidth.org/data/rss", htmlUrl: "https://mjg59.dreamwidth.org" },
  { name: "computer.rip", xmlUrl: "https://computer.rip/rss.xml", htmlUrl: "https://computer.rip" },
  { name: "tedunangst.com", xmlUrl: "https://www.tedunangst.com/flak/rss", htmlUrl: "https://www.tedunangst.com" },
];

interface Article {
  title: string;
  link: string;
  pubDate: string; // ISO
  description: string;
  sourceName: string;
  sourceUrl: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .trim();
}

function extractCDATA(text: string): string {
  const cdataMatch = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return cdataMatch ? cdataMatch[1] : text;
}

function getTagContent(xml: string, tagName: string): string {
  const patterns = [
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i'),
    new RegExp(`<\\w+:${tagName}[^>]*>([\\s\\S]*?)</\\w+:${tagName}>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match?.[1]) return extractCDATA(match[1]).trim();
  }
  return '';
}

function parseFeedItems(feedXml: string): Array<{ title: string; link: string; pubDate: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];

  // RSS <item>
  const rssItems = feedXml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const itemXml of rssItems) {
    const title = stripHtml(getTagContent(itemXml, 'title'));
    const link = getTagContent(itemXml, 'link');
    const pubDate = getTagContent(itemXml, 'pubDate') || getTagContent(itemXml, 'date');
    const description = stripHtml(getTagContent(itemXml, 'description') || getTagContent(itemXml, 'summary'));
    if (title && link) items.push({ title, link, pubDate, description });
  }

  // Atom <entry>
  const atomEntries = feedXml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const entryXml of atomEntries) {
    const title = stripHtml(getTagContent(entryXml, 'title'));

    // Atom links may be in <link href="..." />
    let link = getTagContent(entryXml, 'link');
    if (!link) {
      const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>(?:<\/link>)?/i);
      if (linkMatch?.[1]) link = linkMatch[1];
    }

    const pubDate = getTagContent(entryXml, 'published') || getTagContent(entryXml, 'updated');
    const description = stripHtml(getTagContent(entryXml, 'summary') || getTagContent(entryXml, 'content'));
    if (title && link) items.push({ title, link, pubDate, description });
  }

  return items;
}

async function fetchFeed(feed: { name: string; xmlUrl: string; htmlUrl: string }): Promise<Article[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(feed.xmlUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'openclaw-ai-daily/agent-fetch (+https://github.com/hczs/openclaw-skills)'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = parseFeedItems(xml);

    const articles: Article[] = [];
    for (const item of parsed) {
      const d = item.pubDate ? new Date(item.pubDate) : null;
      if (!d || isNaN(d.getTime())) continue;
      articles.push({
        title: item.title,
        link: item.link,
        pubDate: d.toISOString(),
        description: item.description,
        sourceName: feed.name,
        sourceUrl: feed.htmlUrl,
      });
    }
    return articles;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort')) {
      console.warn(`[digest-fetch] ✗ ${feed.name}: timeout`);
    } else {
      console.warn(`[digest-fetch] ✗ ${feed.name}: ${msg}`);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllFeeds(feeds: typeof RSS_FEEDS): Promise<{ articles: Article[]; ok: number; failed: number }> {
  const all: Article[] = [];
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < feeds.length; i += FEED_CONCURRENCY) {
    const batch = feeds.slice(i, i + FEED_CONCURRENCY);
    const results = await Promise.allSettled(batch.map(fetchFeed));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.length) {
        all.push(...r.value);
        ok++;
      } else {
        failed++;
      }
    }
    const progress = Math.min(i + FEED_CONCURRENCY, feeds.length);
    console.log(`[digest-fetch] Progress: ${progress}/${feeds.length} feeds (${ok} ok, ${failed} failed)`);
  }

  return { articles: all, ok, failed };
}

function parseArgs(argv: string[]): { hours: number; outputJson: string; outputMd?: string } {
  const args = { hours: 48, outputJson: '', outputMd: '' };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--hours') args.hours = parseInt(argv[++i] || '48', 10);
    else if (a === '--output-json') args.outputJson = argv[++i] || '';
    else if (a === '--output-md') args.outputMd = argv[++i] || '';
  }

  if (!args.outputJson) {
    throw new Error('Missing --output-json <path>');
  }

  return { hours: args.hours, outputJson: args.outputJson, outputMd: args.outputMd || undefined };
}

function dedupeByLink(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const a of articles) {
    const key = a.link.trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function toMarkdownList(articles: Article[], hours: number): string {
  const lines: string[] = [];
  lines.push(`# AI Daily — Raw Articles (last ${hours}h)`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Count: ${articles.length}`);
  lines.push('');
  for (const a of articles) {
    const dt = a.pubDate.replace('T', ' ').replace('Z', 'Z');
    lines.push(`- [${a.title}](${a.link}) — ${a.sourceName} — ${dt}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const { hours, outputJson, outputMd } = parseArgs(process.argv.slice(2));

  const now = Date.now();
  const cutoff = now - hours * 60 * 60 * 1000;

  const { articles, ok, failed } = await fetchAllFeeds(RSS_FEEDS);

  const filtered = dedupeByLink(
    articles
      .filter(a => {
        const t = new Date(a.pubDate).getTime();
        return !isNaN(t) && t >= cutoff && t <= now;
      })
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  );

  await mkdir(dirname(outputJson), { recursive: true });
  await writeFile(outputJson, JSON.stringify({
    generatedAt: new Date().toISOString(),
    hours,
    feedsTotal: RSS_FEEDS.length,
    feedsOk: ok,
    feedsFailed: failed,
    articleCount: filtered.length,
    articles: filtered,
  }, null, 2));

  if (outputMd) {
    await mkdir(dirname(outputMd), { recursive: true });
    await writeFile(outputMd, toMarkdownList(filtered, hours));
  }

  console.log(`[digest-fetch] Done. Feeds: ${ok} ok, ${failed} failed. Articles in last ${hours}h: ${filtered.length}`);
  console.log(`[digest-fetch] JSON: ${outputJson}`);
  if (outputMd) console.log(`[digest-fetch] MD: ${outputMd}`);
}

main().catch(err => {
  console.error('[digest-fetch] Fatal:', err);
  process.exit(1);
});
