const API_KEY = 'f326b6d9afdef49fd32189d0639f21b0';
let activeId, activeType, currentMode = 'movies';

window.onload = () => switchMode('movies');

function switchMode(mode) {
    currentMode = mode;
    document.getElementById('mode-movies').classList.toggle('active', mode === 'movies');
    document.getElementById('mode-iptv').classList.toggle('active', mode === 'iptv');
    document.getElementById('iptv-selector').classList.toggle('hidden', mode === 'movies');
    document.getElementById('search-container').classList.toggle('hidden', mode === 'iptv');
    
    const content = document.getElementById('content-area');
    content.innerHTML = `<div class="section-wrapper"><h2>Laddar...</h2></div>`;
    
    if (mode === 'movies') {
        loadHomeMovies();
    } else {
        fetchIPTV();
    }
}

async function loadHomeMovies() {
    const moviesResp = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${API_KEY}&language=sv-SE`);
    const movies = await moviesResp.json();
    
    let html = `<div class="section-wrapper"><h2>Populära Filmer</h2><div class="grid">`;
    movies.results.slice(0, 10).forEach(m => html += createCard(m, 'movie'));
    html += `</div></div>`;
    
    document.getElementById('content-area').innerHTML = html;
}

async function fetchIPTV() {
    const country = document.getElementById('countrySelect').value;
    const resp = await fetch('https://iptv-org.github.io/iptv/index.country.m3u');
    const text = await resp.text();
    const lines = text.split('\n');
    let channels = [];
    
    for (let i = 0; i < lines.length; i++) {
        if (country === 'ALL' || lines[i].includes(`tvg-country="${country}"`)) {
            const name = lines[i].split(',')[1] || "Kanal";
            const url = lines[i+1]?.trim();
            const logoMatch = lines[i].match(/tvg-logo="([^"]+)"/);
            const logo = logoMatch ? logoMatch[1] : 'https://via.placeholder.com/160x240?text=TV';
            
            if (url && url.startsWith('http')) {
                channels.push({ name, url, logo });
            }
        }
        if (channels.length >= 40) break;
    }

    let html = `<div class="section-wrapper"><h2>Live TV Channels</h2><div class="grid">`;
    channels.forEach(ch => {
        html += `<div class="card scale-in" onclick="startIPTV('${ch.url}', '${ch.name}')">
                    <img src="${ch.logo}">
                    <div class="card-info">${ch.name}</div>
                </div>`;
    });
    html += `</div></div>`;
    document.getElementById('content-area').innerHTML = html;
}

// Återanvänd doSearch, startMovie, startIPTV och stopPlayer från föregående kod...
function createCard(item, type) {
    return `<div class="card scale-in" onclick="startMovie(${item.id}, '${type}', '${item.title || item.name}')">
                <img src="https://image.tmdb.org/t/p/w500${item.poster_path}">
                <div class="card-info">${item.title || item.name}</div>
            </div>`;
}

function startMovie(id, type, title) {
    activeId = id; activeType = type;
    document.getElementById('playing-title').innerText = title;
    document.getElementById('moviePlayer').style.display = 'block';
    document.getElementById('iptvPlayer').style.display = 'none';
    
    if(type === 'tv') {
        document.getElementById('series-ui').style.display = 'flex';
        loadSeasons(id);
    } else {
        document.getElementById('series-ui').style.display = 'none';
        document.getElementById('moviePlayer').src = `https://embos.net/movie/?mid=${id}`;
    }
    document.getElementById('player-overlay').style.display = 'flex';
}

function startIPTV(url, name) {
    document.getElementById('playing-title').innerText = name;
    document.getElementById('moviePlayer').style.display = 'none';
    const video = document.getElementById('iptvPlayer');
    video.style.display = 'block';
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
    }
    document.getElementById('player-overlay').style.display = 'flex';
}

function stopPlayer() {
    document.getElementById('player-overlay').style.display = 'none';
    document.getElementById('moviePlayer').src = "";
    document.getElementById('iptvPlayer').pause();
}

async function doSearch() {
    const q = document.getElementById('query').value;
    if(!q) return;
    const resp = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=sv-SE`);
    const data = await resp.json();
    let html = `<div class="section-wrapper"><h2>Sökresultat</h2><div class="grid">`;
    data.results.forEach(m => html += createCard(m, m.media_type));
    html += `</div></div>`;
    document.getElementById('content-area').innerHTML = html;
}

async function loadSeasons(id) {
    const resp = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=sv-SE`);
    const data = await resp.json();
    const sSelect = document.getElementById('sVal');
    sSelect.innerHTML = "";
    data.seasons.forEach(s => {
        if(s.season_number > 0) {
            let opt = document.createElement('option');
            opt.value = s.season_number; opt.innerText = `Season ${s.season_number}`;
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
    if(activeType === 'tv') document.getElementById('moviePlayer').src = `https://embos.net/tv/?mid=${activeId}&s=${s}&e=${e}`;
}