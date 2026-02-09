const API_KEY = 'f326b6d9afdef49fd32189d0639f21b0';
// Proxy för att ladda IPTV-listan utan CORS-problem
const M3U_URL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://iptv-org.github.io/iptv/index.country.m3u');

let activeId, activeType;

// --- SÄKERHET: BLOCKERA POPUPS PÅ PROGRAMVARUNIVÅ ---
// Detta försöker "stjäla" alla försök att öppna nya fönster
window.open = function() { 
    console.log("Ett försök att öppna en popup blockerades.");
    return null; 
};

// Förhindrar att spelaren navigerar bort din huvudflik till en annan sida
window.onbeforeunload = function() {
    if (document.getElementById('player-overlay').style.display === 'flex') {
        return "Vill du verkligen lämna din film?";
    }
};

// --- INITIALISERING ---
window.onload = () => switchMode('movies');

function switchMode(mode) {
    document.getElementById('mode-movies').classList.toggle('active', mode === 'movies');
    document.getElementById('mode-iptv').classList.toggle('active', mode === 'iptv');
    document.getElementById('iptv-selector').classList.toggle('hidden', mode === 'movies');
    document.getElementById('search-container').classList.toggle('hidden', mode === 'iptv');
    
    if (mode === 'movies') loadHomeMovies();
    else fetchIPTV();
}

async function loadHomeMovies() {
    const resp = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${API_KEY}&language=sv-SE`);
    const data = await resp.json();
    let html = `<div class="section-wrapper"><h2>Populära Filmer & Serier</h2><div class="grid">`;
    data.results.slice(0, 15).forEach(m => {
        const title = (m.title || m.name).replace(/'/g, "");
        html += `<div class="card scale-in" onclick="startMovie(${m.id}, '${m.media_type}', '${title}')">
                    <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
                    <div class="card-info">${m.title || m.name}</div>
                </div>`;
    });
    html += `</div></div>`;
    document.getElementById('content-area').innerHTML = html;
}

async function fetchIPTV() {
    const country = document.getElementById('countrySelect').value;
    const content = document.getElementById('content-area');
    content.innerHTML = `<h2 style="text-align:center; margin-top:50px;">Hämtar kanaler för ${country}...</h2>`;
    
    try {
        const resp = await fetch(M3U_URL);
        const text = await resp.text();
        const lines = text.split('\n');
        let html = `<div class="section-wrapper"><h2>Live TV (${country})</h2><div class="grid">`;
        let count = 0;
        
        for (let i = 0; i < lines.length; i++) {
            if (country === 'ALL' || lines[i].includes(`tvg-country="${country}"`)) {
                const nameMatch = lines[i].match(/,(.+)$/);
                const name = nameMatch ? nameMatch[1].trim().replace(/'/g, "") : "Kanal";
                const url = lines[i+1]?.trim();
                const logoMatch = lines[i].match(/tvg-logo="([^"]+)"/);
                
                if (url && url.startsWith('http')) {
                    html += `<div class="card scale-in" onclick="startIPTV('${url}', '${name}')">
                                <img src="${logoMatch ? logoMatch[1] : 'https://via.placeholder.com/160x240?text=TV'}">
                                <div class="card-info">${name}</div>
                             </div>`;
                    count++;
                }
            }
            if (count >= 40) break;
        }
        content.innerHTML = html + `</div></div>`;
    } catch (e) {
        content.innerHTML = "<h2 style='text-align:center'>Kunde inte ladda IPTV-listan.</h2>";
    }
}

// --- SPELAR-KONTROLL (MED SÄKERHETSFUNKTIONER) ---
function startMovie(id, type, title) {
    activeId = id; activeType = type;
    showAdNotice(); // Visa din adblock-info
    
    document.getElementById('playing-title').innerText = title;
    const mPlayer = document.getElementById('moviePlayer');
    mPlayer.style.display = 'block';
    document.getElementById('iptvPlayer').style.display = 'none';

    // SÄKER SANDBOX: 
    // Vi tillåter 'popups' så spelaren startar, men vi utelämnar 'allow-top-navigation'.
    // Detta gör att spelaren INTE kan tvinga din flik att byta hemsida.
    mPlayer.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox');
    
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
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
    } else {
        video.src = url;
    }
    document.getElementById('player-overlay').style.display = 'flex';
}

// --- HJÄLPFUNKTIONER ---
function showAdNotice() {
    const notice = document.getElementById('adblock-notice');
    const text = document.getElementById('adblock-text');
    const link = document.getElementById('adblock-link');
    const ua = navigator.userAgent;

    if (/android/i.test(ua)) {
        text.innerText = "På Android är 'Brave' bäst för att slippa reklam.";
        link.href = "https://play.google.com/store/apps/details?id=com.brave.browser";
    } else if (/iPad|iPhone|iPod/.test(ua)) {
        text.innerText = "På iPhone rekommenderas 'AdGuard' för Safari.";
        link.href = "https://apps.apple.com/app/id1047223162";
    } else {
        text.innerText = "På dator är 'uBlock Origin' bäst för att stoppa popups.";
        link.href = "https://ublockorigin.com/";
    }
    notice.style.display = 'block';
}

function hideAdNotice() { document.getElementById('adblock-notice').style.display = 'none'; }

async function doSearch() {
    const q = document.getElementById('query').value;
    if(!q) return;
    const resp = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=sv-SE`);
    const data = await resp.json();
    let html = `<div class="section-wrapper"><h2>Sökresultat</h2><div class="grid">`;
    data.results.forEach(m => {
        if(m.poster_path) {
            const title = (m.title || m.name).replace(/'/g, "");
            html += `<div class="card scale-in" onclick="startMovie(${m.id}, '${m.media_type}', '${title}')">
                        <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
                        <div class="card-info">${m.title || m.name}</div>
                    </div>`;
        }
    });
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
    const mPlayer = document.getElementById('moviePlayer');
    mPlayer.src = "";
    mPlayer.removeAttribute('sandbox'); 
    document.getElementById('iptvPlayer').pause();
}
