import fetch from 'isomorphic-unfetch';

async function testLimits() {
  const urls = [
    'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    'https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl',
    'https://open.spotify.com/track/2AT8iROs4FQueDv2c8q2KE',
    'https://open.spotify.com/track/5QO79kh1waicV47BqGRL3g',
    'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
  ];

  for (let i = 0; i < urls.length; i++) {
    const encoded = encodeURIComponent(urls[i]);
    const start = Date.now();
    const res = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encoded}`);
    console.log(`Req ${i+1}: Status ${res.status} (took ${Date.now() - start}ms)`);
    if (res.status === 429) {
      console.log('Got 429, waiting 5 seconds...');
      await new Promise(r => setTimeout(r, 5000));
    } else {
      await new Promise(r => setTimeout(r, 1000)); // 1 req/sec
    }
  }
}

testLimits();
