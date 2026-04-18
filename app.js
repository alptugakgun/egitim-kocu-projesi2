const socket = io();
const aktifOgrenci = localStorage.getItem('ogrenciKimligi');

// DOM Elementleri
const display = document.getElementById('display');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const statusText = document.getElementById('statusText');
const mainTitle = document.getElementById('mainTitle');
const sesEfekti = document.getElementById('bildirimSesi');
const dersSecimi = document.getElementById('dersSecimi');
const pomoInput = document.getElementById('pomoInput');

if(mainTitle) mainTitle.innerHTML = `Hoş Geldin, ${aktifOgrenci}! 🎯`;
function sesCal() { if(sesEfekti) { sesEfekti.currentTime = 0; sesEfekti.play().catch(e=>{}); } }

// --- KRONOMETRE & HAFIZA SİSTEMİ ---
let tInterval;
let running = localStorage.getItem(`${aktifOgrenci}_running`) === 'true';
let mode = localStorage.getItem(`${aktifOgrenci}_mode`) || 'normal';

function getDers() { return dersSecimi.value; }

function gostergeyiGuncelle(sureMs) {
    if(mode === 'normal') {
        let hours = Math.floor((sureMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((sureMs % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((sureMs % (1000 * 60)) / 1000);
        display.innerHTML = (hours < 10 ? "0"+hours : hours) + ":" + (minutes < 10 ? "0"+minutes : minutes) + ":" + (seconds < 10 ? "0"+seconds : seconds);
        return false;
    } else {
        let val = parseInt(pomoInput.value) || 25;
        let kalan = (val * 60 * 1000) - sureMs;
        if(kalan <= 0) { display.innerHTML = "00:00"; return true; /* Pomodoro Bitti */ }
        let minutes = Math.floor((kalan % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((kalan % (1000 * 60)) / 1000);
        display.innerHTML = (minutes < 10 ? "0"+minutes : minutes) + ":" + (seconds < 10 ? "0"+seconds : seconds);
        return false;
    }
}

// 🔄 DERS DEĞİŞTİĞİNDE: Eski dersi kaydet, yeni dersi yükle
dersSecimi.addEventListener('change', (e) => {
    let eskiDers = e.target.getAttribute('data-eski') || dersSecimi.options[0].value;
    let yeniDers = getDers();
    
    if (running) {
        let st = parseInt(localStorage.getItem(`${aktifOgrenci}_startTime`));
        let oldSaved = parseInt(localStorage.getItem(`${aktifOgrenci}_${eskiDers}_savedTime`)) || 0;
        let diff = new Date().getTime() - st + oldSaved;
        localStorage.setItem(`${aktifOgrenci}_${eskiDers}_savedTime`, diff);
        
        clearInterval(tInterval);
        running = false;
        localStorage.setItem(`${aktifOgrenci}_running`, 'false');
        
        pauseBtn.style.display = 'none'; startBtn.style.display = 'block'; startBtn.innerHTML = "▶ Başla";
        statusText.innerHTML = "Ders değişti, sayaç durduruldu."; 
        statusText.style.backgroundColor = "#f1f5f9"; statusText.style.color = "#64748b";
        pomoInput.disabled = false;
        socket.emit('ogrenci_derse_basladi', { ogrenciAd: aktifOgrenci, ders: eskiDers, mesaj: 'Ders değiştirdi, durdurdu.' });
    }
    
    e.target.setAttribute('data-eski', yeniDers);
    
    let currentSaved = parseInt(localStorage.getItem(`${aktifOgrenci}_${yeniDers}_savedTime`)) || 0;
    gostergeyiGuncelle(currentSaved);
    socket.emit('sure_guncelle', { ogrenciAd: aktifOgrenci, sure: display.innerHTML });
    
    if(currentSaved > 0) { startBtn.innerHTML = "▶ Devam Et"; } else { startBtn.innerHTML = "▶ Başla"; }
});

// 🍅 POMODORO SÜRESİ DEĞİŞTİĞİNDE
pomoInput.addEventListener('change', () => {
    if(mode === 'pomodoro' && !running) {
        let val = parseInt(pomoInput.value) || 25;
        localStorage.setItem(`${aktifOgrenci}_pomoDuration`, val);
        let sTime = parseInt(localStorage.getItem(`${aktifOgrenci}_${getDers()}_savedTime`)) || 0;
        gostergeyiGuncelle(sTime);
    }
});

// ⏳ MOD DEĞİŞTİĞİNDE
window.setMode = function(m) {
    if(running) return; 
    mode = m; localStorage.setItem(`${aktifOgrenci}_mode`, m);
    document.getElementById('modeNormal').className = m === 'normal' ? 'mode-btn mode-active' : 'mode-btn mode-passive';
    document.getElementById('modePomo').className = m === 'pomodoro' ? 'mode-btn mode-active' : 'mode-btn mode-passive';
    
    if(m === 'pomodoro') { 
        pomoInput.style.display = 'block';
        document.getElementById('modePomo').style.background = '#ef4444'; document.getElementById('modePomo').style.boxShadow = '0 4px 0 #b91c1c'; 
    } else { 
        pomoInput.style.display = 'none';
        document.getElementById('modePomo').style.background = ''; document.getElementById('modePomo').style.boxShadow = ''; 
    }
    
    let sTime = parseInt(localStorage.getItem(`${aktifOgrenci}_${getDers()}_savedTime`)) || 0;
    gostergeyiGuncelle(sTime);
    socket.emit('sure_guncelle', { ogrenciAd: aktifOgrenci, sure: display.innerHTML });
};

function startTimer() {
    if (!running) {
        localStorage.setItem(`${aktifOgrenci}_startTime`, new Date().getTime());
        localStorage.setItem(`${aktifOgrenci}_running`, 'true');
        localStorage.setItem(`${aktifOgrenci}_activeDers`, getDers());

        if(mode === 'pomodoro') { localStorage.setItem(`${aktifOgrenci}_pomoDuration`, parseInt(pomoInput.value) || 25); }

        tInterval = setInterval(getShowTime, 1000); 
        running = true;
        
        startBtn.style.display = 'none'; pauseBtn.style.display = 'block';
        statusText.innerHTML = "🟢 Odak modu aktif!"; statusText.style.backgroundColor = "#d1fae5"; statusText.style.color = "#059669";
        dersSecimi.disabled = true; pomoInput.disabled = true;

        socket.emit('ogrenci_derse_basladi', { ogrenciAd: aktifOgrenci, ders: getDers(), mesaj: mode === 'pomodoro' ? `Pomodoro (${pomoInput.value}dk) Başlattı!` : 'Kronometre Başlattı!' });
    }
}

function pauseTimer(otomatikMi = false) {
    if (running) {
        clearInterval(tInterval);
        let st = parseInt(localStorage.getItem(`${aktifOgrenci}_startTime`));
        let oldSaved = parseInt(localStorage.getItem(`${aktifOgrenci}_${getDers()}_savedTime`)) || 0;
        let diff = new Date().getTime() - st + oldSaved;
        
        if (otomatikMi && mode === 'pomodoro') {
             localStorage.setItem(`${aktifOgrenci}_${getDers()}_savedTime`, 0); // Pomodoro bittiyse o dersi sıfırla
        } else {
             localStorage.setItem(`${aktifOgrenci}_${getDers()}_savedTime`, diff);
        }
        
        localStorage.setItem(`${aktifOgrenci}_running`, 'false');
        running = false;
        
        pauseBtn.style.display = 'none'; startBtn.style.display = 'block'; startBtn.innerHTML = "▶ Devam Et";
        if(otomatikMi) startBtn.innerHTML = "▶ Başla";

        statusText.innerHTML = otomatikMi ? "🎉 Pomodoro Bitti!" : "⏸️ Mola Verildi."; 
        statusText.style.backgroundColor = "#fef3c7"; statusText.style.color = "#d97706";
        dersSecimi.disabled = false; pomoInput.disabled = false;

        socket.emit('ogrenci_derse_basladi', { ogrenciAd: aktifOgrenci, ders: getDers(), mesaj: otomatikMi ? 'Pomodoro Bitti, Molada.' : 'Mola verdi, durdurdu.' });
    }
}

function getShowTime() {
    let st = parseInt(localStorage.getItem(`${aktifOgrenci}_startTime`));
    let oldSaved = parseInt(localStorage.getItem(`${aktifOgrenci}_${getDers()}_savedTime`)) || 0;
    let diff = new Date().getTime() - st + oldSaved;
    
    let bittiMi = gostergeyiGuncelle(diff);
    if (bittiMi && mode === 'pomodoro') { sesCal(); pauseTimer(true); }
    socket.emit('sure_guncelle', { ogrenciAd: aktifOgrenci, sure: display.innerHTML });
}

// 🧠 SAYFA YÜKLENDİĞİNDE (Veya Giriş Yapıldığında) TÜM HAFIZAYI ÇAĞIR
window.onload = () => {
    let isRunning = localStorage.getItem(`${aktifOgrenci}_running`) === 'true';
    let activeDers = localStorage.getItem(`${aktifOgrenci}_activeDers`);
    
    if (activeDers) {
        dersSecimi.value = activeDers;
        dersSecimi.setAttribute('data-eski', activeDers);
    } else {
        dersSecimi.setAttribute('data-eski', dersSecimi.value);
    }

    mode = localStorage.getItem(`${aktifOgrenci}_mode`) || 'normal';
    if(mode === 'pomodoro') {
        pomoInput.value = localStorage.getItem(`${aktifOgrenci}_pomoDuration`) || 25;
        pomoInput.style.display = 'block';
        document.getElementById('modeNormal').className = 'mode-btn mode-passive';
        document.getElementById('modePomo').className = 'mode-btn mode-active';
        document.getElementById('modePomo').style.background = '#ef4444'; document.getElementById('modePomo').style.boxShadow = '0 4px 0 #b91c1c';
    } else {
        pomoInput.style.display = 'none';
    }
    
    let sTime = parseInt(localStorage.getItem(`${aktifOgrenci}_${getDers()}_savedTime`)) || 0;

    if(isRunning) {
        startBtn.style.display = 'none'; pauseBtn.style.display = 'block';
        statusText.innerHTML = "🟢 Odak modu aktif!"; statusText.style.backgroundColor = "#d1fae5"; statusText.style.color = "#059669";
        dersSecimi.disabled = true; pomoInput.disabled = true;
        tInterval = setInterval(getShowTime, 1000);
        socket.emit('ogrenci_derse_basladi', { ogrenciAd: aktifOgrenci, ders: getDers(), mesaj: 'Derse geri döndü (Devam ediyor)' });
    } else {
        if (sTime > 0) { startBtn.innerHTML = "▶ Devam Et"; }
        gostergeyiGuncelle(sTime);
    }
};

// --- GÖREVLER, CHAT VE YAPAY ZEKA ---
socket.on('gorev_guncellendi', (tumVeriler) => {
    let benimVerim = tumVeriler.find(v => v.ogrenciAd === aktifOgrenci);
    if (benimVerim) {
        let xpBadge = document.getElementById('xpBadge');
        if (!xpBadge) {
            xpBadge = document.createElement('div'); xpBadge.id = 'xpBadge';
            xpBadge.style.cssText = "position:absolute; top:20px; left:20px; background:#4f46e5; color:white; padding:8px 15px; border-radius:20px; font-weight:800; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.2);";
            document.body.appendChild(xpBadge);
        }
        xpBadge.innerHTML = `⭐ ${benimVerim.xp || 0} XP`;

        if (benimVerim.gorevler && benimVerim.gorevler.length > 0) {
            const taskBoard = document.getElementById('taskBoard');
            const taskList = document.getElementById('studentTaskList');
            if(taskBoard) taskBoard.style.display = 'block'; 
            if(taskList) {
                let bitmemisSayisi = benimVerim.gorevler.filter(g => !g.tamamlandi).length;
                let eskiBitmemis = taskList.getAttribute('data-count') || 0;
                if(bitmemisSayisi > eskiBitmemis) sesCal();
                taskList.setAttribute('data-count', bitmemisSayisi);
                taskList.innerHTML = ''; 
                benimVerim.gorevler.forEach(gorev => {
                    let textStil = gorev.tamamlandi ? "text-decoration: line-through; color: #94a3b8;" : "color: #334155; font-weight: 800;";
                    let borderRenk = gorev.tamamlandi ? "#10b981" : "#3b82f6";
                    let sagKisim = gorev.tamamlandi ? `<span style="color: #10b981; font-weight: 800; font-size: 14px;">✅ Tamamlandı</span>` : `<button class="finish-btn" onclick="goreviBitir(${gorev.id})">Bitir (+10 XP)</button>`;
                    taskList.innerHTML += `<div class="task-item" style="border-left-color: ${borderRenk}"><span style="${textStil}">${gorev.metin}</span>${sagKisim}</div>`;
                });
            }
        }
    }
});

window.goreviBitir = function(id) { sesCal(); socket.emit('gorev_tamamlandi', { ogrenciAd: aktifOgrenci, gorevId: id, durum: true }); };

window.toggleChat = function() {
    const body = document.getElementById('chatBody'), footer = document.getElementById('chatFooter'), uyari = document.getElementById('chatUyari');
    if(body.style.display === 'flex') { body.style.display = 'none'; footer.style.display = 'none'; } 
    else { body.style.display = 'flex'; footer.style.display = 'flex'; uyari.style.display = 'none'; body.scrollTop = body.scrollHeight; }
};
window.mesajGonder = function() {
    const input = document.getElementById('chatInput');
    if(input.value.trim() !== '') { socket.emit('chat_mesaji_gonder', { gonderen: aktifOgrenci, mesaj: input.value, rol: 'ogrenci' }); input.value = ''; }
};
function chatEkranaBas(veri) {
    const body = document.getElementById('chatBody');
    let benMiyim = (veri.gonderen === aktifOgrenci);
    let renk = benMiyim ? '#10b981' : '#e2e8f0', yaziRengi = benMiyim ? 'white' : '#1e293b', hizalama = benMiyim ? 'flex-end' : 'flex-start', ikon = veri.rol === 'koc' ? '👨‍🏫' : '🎓';
    body.innerHTML += `<div style="align-self: ${hizalama}; background: ${renk}; color: ${yaziRengi}; padding: 10px 14px; border-radius: 14px; font-size: 13px; max-width: 80%; line-height: 1.4; margin-bottom: 10px; font-weight: 700;"><div style="font-size: 10px; font-weight: 900; margin-bottom: 4px; opacity: 0.8;">${ikon} ${veri.gonderen} • ${veri.saat}</div>${veri.mesaj}</div>`;
    body.scrollTop = body.scrollHeight;
}
socket.on('eski_chat_yukle', (gecmis) => { document.getElementById('chatBody').innerHTML = ''; gecmis.forEach(msg => chatEkranaBas(msg)); });
socket.on('yeni_chat_mesaji', (msg) => { chatEkranaBas(msg); const body = document.getElementById('chatBody'); if(msg.gonderen !== aktifOgrenci) { sesCal(); if(body.style.display !== 'flex') document.getElementById('chatUyari').style.display = 'flex'; } });

window.toggleBot = function() {
    const body = document.getElementById('botBody'), footer = document.getElementById('botFooter');
    if(body.style.display === 'flex') { body.style.display = 'none'; footer.style.display = 'none'; } 
    else { body.style.display = 'flex'; footer.style.display = 'flex'; body.scrollTop = body.scrollHeight; }
};
window.botMesajGonder = function() {
    const input = document.getElementById('botInput');
    let mesajMetni = input.value.trim();
    if(mesajMetni !== '') { 
        const body = document.getElementById('botBody');
        body.innerHTML += `<div style="align-self: flex-end; background: #8b5cf6; color: white; padding: 10px 14px; border-radius: 14px; font-size: 13px; max-width: 80%; line-height: 1.4; margin-bottom: 10px; font-weight: 700;">${mesajMetni}</div>`;
        body.scrollTop = body.scrollHeight;
        
        let secilenDers = document.getElementById('dersSecimi').value;
        socket.emit('ogrenci_chatbot_mesaji', { ogrenciAd: aktifOgrenci, mesaj: mesajMetni, ders: secilenDers }); 
        input.value = ''; 
    }
};

socket.on('chatbot_cevabi', (cevapMetni) => {
    sesCal();
    const body = document.getElementById('botBody');
    body.innerHTML += `<div style="align-self: flex-start; background: #e2e8f0; color: #1e293b; padding: 10px 14px; border-radius: 14px; font-size: 13px; max-width: 80%; line-height: 1.4; margin-bottom: 10px; font-weight: 700;"><div style="font-size: 10px; font-weight: 900; margin-bottom: 4px; opacity: 0.8;">🤖 Dijital Koç</div>${cevapMetni}</div>`;
    body.scrollTop = body.scrollHeight;
});