const socket = io();
const aktifOgrenci = localStorage.getItem('ogrenciKimligi');

let startTime, updatedTime, difference, tInterval;
let savedTime = 0;
let running = false;
let mode = 'normal'; 
const POMO_TIME = 25 * 60 * 1000; 

const display = document.getElementById('display');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const statusText = document.getElementById('statusText');
const mainTitle = document.getElementById('mainTitle');
const sesEfekti = document.getElementById('bildirimSesi');

if(mainTitle) mainTitle.innerHTML = `Hoş Geldin, ${aktifOgrenci}! 🎯`;

function sesCal() { if(sesEfekti) { sesEfekti.currentTime = 0; sesEfekti.play().catch(e=>{}); } }

window.setMode = function(m) {
    if(running) return; 
    mode = m;
    document.getElementById('modeNormal').className = m === 'normal' ? 'mode-btn mode-active' : 'mode-btn mode-passive';
    document.getElementById('modePomo').className = m === 'pomodoro' ? 'mode-btn mode-active' : 'mode-btn mode-passive';
    
    if(m === 'pomodoro') { display.innerHTML = "25:00"; document.getElementById('modePomo').style.background = '#ef4444'; document.getElementById('modePomo').style.boxShadow = '0 4px 0 #b91c1c'; } 
    else { display.innerHTML = "00:00:00"; document.getElementById('modePomo').style.background = ''; document.getElementById('modePomo').style.boxShadow = ''; }
    savedTime = 0;
    socket.emit('sure_guncelle', { ogrenciAd: aktifOgrenci, sure: display.innerHTML });
};

function startTimer() {
    if (!running) {
        let secilenDers = document.getElementById('dersSecimi').value;
        startTime = new Date().getTime();
        tInterval = setInterval(getShowTime, 1000); 
        running = true;
        
        startBtn.style.display = 'none'; pauseBtn.style.display = 'block';
        statusText.innerHTML = "🟢 Odak modu aktif!"; statusText.style.backgroundColor = "#d1fae5"; statusText.style.color = "#059669";
        document.getElementById('dersSecimi').disabled = true;

        socket.emit('ogrenci_derse_basladi', { ogrenciAd: aktifOgrenci, ders: secilenDers, mesaj: mode === 'pomodoro' ? 'Pomodoro (25dk) Başlattı!' : 'Kronometre Başlattı!' });
    }
}

function pauseTimer(otomatikMi = false) {
    if (running) {
        clearInterval(tInterval);
        savedTime = difference; 
        running = false;
        
        pauseBtn.style.display = 'none'; startBtn.style.display = 'block'; startBtn.innerHTML = "▶ Devam Et";
        statusText.innerHTML = otomatikMi ? "🎉 Pomodoro Bitti!" : "⏸️ Mola Verildi."; 
        statusText.style.backgroundColor = "#fef3c7"; statusText.style.color = "#d97706";
        document.getElementById('dersSecimi').disabled = false;

        socket.emit('ogrenci_derse_basladi', { ogrenciAd: aktifOgrenci, ders: document.getElementById('dersSecimi').value, mesaj: otomatikMi ? 'Pomodoro Bitti, Molada.' : 'Mola verdi, durdurdu.' });
    }
}

function getShowTime() {
    updatedTime = new Date().getTime();
    
    if (mode === 'normal') {
        difference = updatedTime - startTime + savedTime;
        let hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((difference % (1000 * 60)) / 1000);
        if(display) display.innerHTML = (hours < 10 ? "0"+hours : hours) + ":" + (minutes < 10 ? "0"+minutes : minutes) + ":" + (seconds < 10 ? "0"+seconds : seconds);
    } else {
        let gecenSure = updatedTime - startTime + savedTime;
        difference = gecenSure; 
        let kalan = POMO_TIME - gecenSure;
        
        if (kalan <= 0) {
            display.innerHTML = "00:00";
            sesCal(); pauseTimer(true);
            socket.emit('sure_guncelle', { ogrenciAd: aktifOgrenci, sure: display.innerHTML }); return;
        }
        let minutes = Math.floor((kalan % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((kalan % (1000 * 60)) / 1000);
        if(display) display.innerHTML = (minutes < 10 ? "0"+minutes : minutes) + ":" + (seconds < 10 ? "0"+seconds : seconds);
    }
    socket.emit('sure_guncelle', { ogrenciAd: aktifOgrenci, sure: display.innerHTML });
}

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

// SINIF SOHBETİ
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

// 🤖 YENİ: YAPAY ZEKA SOHBET FONKSİYONLARI
window.toggleBot = function() {
    const body = document.getElementById('botBody'), footer = document.getElementById('botFooter');
    if(body.style.display === 'flex') { body.style.display = 'none'; footer.style.display = 'none'; } 
    else { body.style.display = 'flex'; footer.style.display = 'flex'; body.scrollTop = body.scrollHeight; }
};
window.botMesajGonder = function() {
    const input = document.getElementById('botInput');
    let mesajMetni = input.value.trim();
    if(mesajMetni !== '') { 
        // 1. Öğrencinin yazdığını ekrana bas (Sağ tarafta mor renkli)
        const body = document.getElementById('botBody');
        body.innerHTML += `<div style="align-self: flex-end; background: #8b5cf6; color: white; padding: 10px 14px; border-radius: 14px; font-size: 13px; max-width: 80%; line-height: 1.4; margin-bottom: 10px; font-weight: 700;">${mesajMetni}</div>`;
        body.scrollTop = body.scrollHeight;
        
        // 2. Sunucuya AI'a iletmesi için yolla
        let secilenDers = document.getElementById('dersSecimi').value;
        socket.emit('ogrenci_chatbot_mesaji', { ogrenciAd: aktifOgrenci, mesaj: mesajMetni, ders: secilenDers }); 
        input.value = ''; 
    }
};

// Sunucudan AI cevabı gelince ekrana bas (Sol tarafta gri renkli)
socket.on('chatbot_cevabi', (cevapMetni) => {
    sesCal();
    const body = document.getElementById('botBody');
    body.innerHTML += `
        <div style="align-self: flex-start; background: #e2e8f0; color: #1e293b; padding: 10px 14px; border-radius: 14px; font-size: 13px; max-width: 80%; line-height: 1.4; margin-bottom: 10px; font-weight: 700;">
            <div style="font-size: 10px; font-weight: 900; margin-bottom: 4px; opacity: 0.8;">🤖 Dijital Koç</div>
            ${cevapMetni}
        </div>
    `;
    body.scrollTop = body.scrollHeight;
});