const API_KEY = 'f326b6d9afdef49fd32189d0639f21b0';
const M3U_URL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://iptv-org.github.io/iptv/index.country.m3u');

let activeId, activeType;

window.onload = () => switchMode('movies');

function switchMode(mode) {
    document.getElementById('mode-movies').classList.toggle('active', mode === 'movies');
    document.getElementById('mode-iptv').classList.toggle('active', mode === 'iptv');
    document.getElementById('iptv-selector').classList.toggle('hidden', mode === 'movies');
    document.getElementById('search-container').classList.toggle('hidden', mode === 'iptv');
    
    if (mode === 'movies') loadTrending();
    else fetchIPTV();
}

async function loadTrending() {
    const resp = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${API_KEY}&language=sv-SE`);
    const data = await resp.json();
    renderGrid(data.results);
}

function renderGrid(items) {
    const container = document.getElementById('content-area');
    container.innerHTML = `<div class="grid"></div>`;
    const grid = container.querySelector('.grid');
    items.forEach(item => {
        if(!item.poster_path) return;
        const div = document.createElement('div');
        div.className = 'card';
        div.onclick = () => startMovie(item.id, item.media_type, item.title || item.name);
        div.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${item.poster_path}"><div class="card-info">${item.title || item.name}</div>`;
        grid.appendChild(div);
    });
}

async function fetchIPTV() {
    const country = document.getElementById('countrySelect').value;
    const content = document.getElementById('content-area');
    content.innerHTML = `<h2 style="text-align:center; margin-top:50px;">Laddar kanaler...</h2>`;
    
    try {
        const resp = await fetch(M3U_URL);
        const text = await resp.text();
        const lines = text.split('\n');
        let html = `<div class="grid">`;
        let count = 0;
        for (let i = 0; i < lines.length; i++) {
            if (country === 'ALL' || lines[i].includes(`tvg-country="${country}"`)) {
                const name = lines[i].split(',')[1] || "Kanal";
                const url = lines[i+1]?.trim();
                const logoMatch = lines[i].match(/tvg-logo="([^"]+)"/);
                if (url && url.startsWith('http')) {
                    html += `<div class="card" onclick="startIPTV('${url}', '${name.replace(/'/g, "")}')">
                                <img src="${logoMatch ? logoMatch[1] : 'https://via.placeholder.com/160x240?text=TV'}">
                                <div class="card-info">${name}</div>
                             </div>`;
                    count++;
                }
            }
            if (count >= 40) break;
        }
        content.innerHTML = html + `</div>`;
    } catch (e) { content.innerHTML = "<h2 style='text-align:center'>Kunde inte ladda IPTV.</h2>"; }
}

function startMovie(id, type, title) {
    activeId = id; activeType = type;
    document.getElementById('playing-title').innerText = title;
    const mPlayer = document.getElementById('moviePlayer');
    mPlayer.style.display = 'block';
    document.getElementById('iptvPlayer').style.display = 'none';

    // HÄR ÄR ÄNDRINGEN: Vi tar bort sandbox helt för att slippa felmeddelandet
    mPlayer.removeAttribute('sandbox'); 
    
    if(type === 'tv') {
        document.getElementById('series-ui').style.display = 'flex';
        loadSeasons(id);
    } else {
        document.getElementById('series-ui').style.display = 'none';
        mPlayer.src = `https://embos.net/movie/?mid=${id}`;
    }
    document.getElementById('player-overlay').style.display = 'flex';
}

function startIPTV(url, name) {
    document.getElementById('playing-title').innerText = name;
    document.getElementById('moviePlayer').style.display = 'none';
    const video = document.getElementById('iptvPlayer');
    video.style.display = 'block';
    if (Hls.isSupported()) {
        const hls = new Hls(); hls.loadSource(url); hls.attachMedia(video);
    } else { video.src = url; }
    document.getElementById('player-overlay').style.display = 'flex';
}

async function doSearch() {
    const q = document.getElementById('query').value;
    if(!q) return;
    const resp = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=sv-SE`);
    const data = await resp.json();
    renderGrid(data.results);
}

async function loadSeasons(id) {
    const resp = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=sv-SE`);
    const data = await resp.json();
    const sSelect = document.getElementById('sVal');
    sSelect.innerHTML = "";
    data.seasons.forEach(s => {
        if(s.season_number > 0) {
            let opt = document.createElement('option');
            opt.value = s.season_number; opt.innerText = `Säsong ${s.season_number}`;
            sSelect.appendChild(opt);
        }
    });
    loadEpisodes();
}

async function loadEpisodes() {
    const sNum = document.getElementById('sVal').value;
    const resp = await fetch(`https://api.themoviedb.org/3/tv/${activeId}/season/${sNum}?api_key=${API_KEY}&language=sv-SE`);
    const data = await resp.json();
    const eSelect = document.getElementById('eVal');
    eSelect.innerHTML = "";
    data.episodes.forEach(e => {
        let opt = document.createElement('option');
        opt.value = e.episode_number; opt.innerText = `Ep ${e.episode_number}`;
        eSelect.appendChild(opt);
    });
    loadContent();
}

function loadContent() {
    const s = document.getElementById('sVal').value || 1;
    const e = document.getElementById('eVal').value || 1;
    document.getElementById('moviePlayer').src = `https://embos.net/tv/?mid=${activeId}&s=${s}&e=${e}`;
}

function stopPlayer() {
    document.getElementById('player-overlay').style.display = 'none';
    document.getElementById('moviePlayer').src = "";
    document.getElementById('iptvPlayer').pause();
}