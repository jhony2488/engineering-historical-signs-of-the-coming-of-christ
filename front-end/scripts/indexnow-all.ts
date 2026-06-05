const indexNowKey = process.env.INDEXNOW_KEY
const endpoint = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow'
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

async function fetchSitemapUrls(): Promise<string[]> {
  const sitemapUrl = process.env.SITEMAP_URL || `${siteUrl}/sitemap.xml`
  console.log('Fetching sitemap from:', sitemapUrl)

  const res = await fetch(sitemapUrl)
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap (${res.status}): ${sitemapUrl}`)
  }
  const xml = await res.text()
  const locPattern = /<loc>([\s\S]*?)<\/loc>/g
  const urls: string[] = []
  let match: RegExpExecArray | null
  while ((match = locPattern.exec(xml)) !== null) {
    const url = match[1].trim()
    if (url) urls.push(url)
  }
  return Array.from(new Set(urls))
}

function getHost(urls: string[]): string {
  const explicitHost = process.env.INDEXNOW_HOST || process.env.NEXT_PUBLIC_SITE_HOST
  if (explicitHost) return explicitHost.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!urls.length) throw new Error('Sitemap does not contain any URLs to index.')
  return new URL(urls[0]).hostname
}

async function run() {
  if (!indexNowKey) {
    throw new Error('Missing INDEXNOW_KEY in environment. Add it to your .env file.')
  }

  const urls = await fetchSitemapUrls()
  if (!urls.length) {
    throw new Error('No URLs found in sitemap')
  }

  const host = getHost(urls)
  console.log('IndexNow target host:', host)
  console.log('Loaded URLs from sitemap:', urls.length)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: indexNowKey, urlList: urls }),
  })

  const body = await response.text()
  console.log('IndexNow response status:', response.status)
  console.log('IndexNow response body:', body)

  if (!response.ok && response.status !== 202) {
    throw new Error(`IndexNow request failed with status ${response.status}`)
  }

  console.log('IndexNow dispatch completed successfully.')
}

run().catch(err => {
  console.error('IndexNow script failed:', err)
  process.exit(1)
})
