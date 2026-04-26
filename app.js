const socket = io(); 
const aktifOgrenci = localStorage.getItem('ogrenciKimligi'); 
const kocKodu = localStorage.getItem('kocKodu'); 
const veliKodu = localStorage.getItem('veliKodu');
socket.emit('join_room', kocKodu);

if(document.getElementById('veliKoduGosterge')) { document.getElementById('veliKoduGosterge').innerText = veliKodu || 'V-XXXX'; }

if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") { Notification.requestPermission(); }
function sistemBildirimi(baslik, mesaj) { if ("Notification" in window && Notification.permission === "granted") { new Notification(baslik, { body: mesaj, icon: "https://cdn-icons-png.flaticon.com/512/616/616430.png" }); } }

const MUFREDAT = { "YKS": { "TYT Türkçe": ["Sözcükte Anlam", "Paragraf"], "TYT Matematik": ["Temel Kavramlar", "Polinomlar"], "AYT Matematik": ["İntegral", "Türev"] }, "LGS": { "LGS Türkçe": ["Sözcükte Anlam", "Cümlede Anlam"], "LGS Matematik": ["Çarpanlar", "Üslü İfadeler"] } }; // (Uzun olmasın diye mufredatı kısa yazdım sen aynısını kopyalarsın)

const sinavSecimi = document.getElementById('sinavSecimi'); const dersSecimiUI = document.getElementById('dersSecimiUI'); const konuSecimi = document.getElementById('konuSecimi');
let aktifDersString = localStorage.getItem(`${aktifOgrenci}_activeDers`) || "[YKS] TYT Matematik - Temel Kavramlar";
function getDers() { return `[${sinavSecimi.value}] ${dersSecimiUI.value} - ${konuSecimi.value}`; }

// 💣 YENİ: Hata Resmi Yükleme Fonksiyonu
window.hataResmiSec = function(input) {
    if(input.files && input.files[0]) {
        const file = input.files[0]; 
        if(file.size > 2.5 * 1024 * 1024) return alert("Fotoğraf boyutu 2.5MB'den küçük olmalı!"); 
        const reader = new FileReader(); 
        reader.onload = function(e) { 
            let suAnkiDers = getDers();
            socket.emit('hata_sorusu_ekle', { ogrenciAd: aktifOgrenci, kocKodu: kocKodu, resim: e.target.result, dersKonu: suAnkiDers }); 
            alert("Soru başarıyla Hata Defterine eklendi! Koçunuz bunu görecek.");
            input.value = ''; 
        }; 
        reader.readAsDataURL(file);
    }
};

let oncekiGorevSayisi = -1; 
let sonZoomLinki = '';

socket.on('gorev_guncellendi', (tumVeriler) => {
    let duelloDiv = document.getElementById('duelloSinifListesi'); if(duelloDiv){ duelloDiv.innerHTML = ''; tumVeriler.forEach(o => { if(o.ogrenciAd !== aktifOgrenci) { duelloDiv.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #cbd5e1;"><span>${o.avatar || '👤'} <b>${o.ogrenciAd}</b></span> <button class="duel-btn" onclick="duelloAt('${o.ogrenciAd}')">Meydan Oku</button></div>`; } }); }

    let benimVerim = tumVeriler.find(v => v.ogrenciAd === aktifOgrenci);
    if (benimVerim) {
        
        // 🔴 YENİ: Zoom Linki Kontrolü
        if (benimVerim.canliDersLink && benimVerim.canliDersLink.trim() !== '') {
            let zBtn = document.getElementById('zoomLinkBtn');
            zBtn.href = benimVerim.canliDersLink;
            zBtn.style.display = 'block';
            if(sonZoomLinki !== benimVerim.canliDersLink) {
                sistemBildirimi("🔴 Canlı Ders Başladı!", "Koçun yayında, panele gir ve derse katıl!");
                sonZoomLinki = benimVerim.canliDersLink;
            }
        } else { document.getElementById('zoomLinkBtn').style.display = 'none'; }

        // 💣 YENİ: Hata Defteri Güncelleme
        if (benimVerim.hataDefteri) {
            let hataKutu = document.getElementById('hataListem');
            if(hataKutu) {
                hataKutu.innerHTML = '';
                if(benimVerim.hataDefteri.length === 0) hataKutu.innerHTML = '<span style="color:#94a3b8;">Henüz eklenmiş soru yok.</span>';
                benimVerim.hataDefteri.forEach(hata => {
                    let renk = hata.durum === 'Çözüldü' ? '#10b981' : '#f59e0b';
                    hataKutu.innerHTML += `<div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
                        <span style="background:${renk}; color:white; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:10px;">${hata.durum}</span> 
                        <b style="color:#334155;">${hata.dersKonu}</b> <span style="font-size:10px; color:#94a3b8;">(${hata.tarih})</span>
                        <br><img src="${hata.resim}" style="max-width:100px; max-height:100px; margin-top:5px; border-radius:5px; border:1px solid #cbd5e1; cursor:pointer;" onclick="window.open('${hata.resim}','_blank')">
                    </div>`;
                });
            }
        }

        if (benimVerim.gorevler) { if (oncekiGorevSayisi !== -1 && benimVerim.gorevler.length > oncekiGorevSayisi) { sesCal(); sistemBildirimi("🎯 Yeni Görev Atandı!", "Koçun sana yeni bir hedef belirledi. Hemen paneline bak!"); } oncekiGorevSayisi = benimVerim.gorevler.length; }
        if(benimVerim.veliKodu && document.getElementById('veliKoduGosterge')) { document.getElementById('veliKoduGosterge').innerText = benimVerim.veliKodu; localStorage.setItem('veliKodu', benimVerim.veliKodu); }
        
        let anlikXp = benimVerim.xp || 0; if(document.getElementById('marketXpDisplay')) document.getElementById('marketXpDisplay').innerText = anlikXp;
        if(benimVerim.avatar && document.getElementById('aktifAvatar')) document.getElementById('aktifAvatar').innerHTML = benimVerim.avatar;
        let xpBadge = document.getElementById('xpBadge'); if (!xpBadge) { xpBadge = document.createElement('div'); xpBadge.id = 'xpBadge'; xpBadge.style.cssText = "position:absolute; top:20px; left:20px; color:white; padding:8px 15px; border-radius:20px; font-weight:800; font-size:14px; box-shadow:0 4px 10px rgba(0,0,0,0.2);"; document.body.appendChild(xpBadge); }
        let sirali = tumVeriler.sort((a,b) => (b.xp||0) - (a.xp||0)), benimSira = sirali.findIndex(v => v.ogrenciAd === aktifOgrenci);
        let ligIsmi = 'Henüz Lige Giremedi', ligRengi = '#94a3b8', anaRenk = '#64748b';
        if(benimSira !== -1 && benimVerim.xp > 0) { if(benimSira < 3) { ligIsmi = '🏆 Süper Lig'; ligRengi = '#fef3c7'; anaRenk = '#f59e0b'; } else if(benimSira < 8) { ligIsmi = '🥇 1. Lig'; ligRengi = '#f1f5f9'; anaRenk = '#64748b'; } else { ligIsmi = '🪵 Amatör Lig'; ligRengi = '#ffedd5'; anaRenk = '#d97706'; } }
        xpBadge.style.background = anaRenk; xpBadge.innerHTML = `<span style="background:${ligRengi}; color:${anaRenk}; padding:4px 8px; border-radius:10px; margin-right:6px;">${ligIsmi}</span> | ${anlikXp} XP`;
        
        if(benimVerim.aktifDuello && benimVerim.aktifDuello.rakip) { xpBadge.innerHTML += `<div style="background:#ef4444; color:white; padding:4px; border-radius:6px; margin-top:5px; font-size:11px; text-align:center;">⚔️ ${benimVerim.aktifDuello.rakip} ile Düelloda!</div>`; }

        if (benimVerim.gorevler && benimVerim.gorevler.length > 0) { let tb = document.getElementById('taskBoard'); if(tb) tb.style.display = 'block'; let taskList = document.getElementById('studentTaskList'); if(taskList) { taskList.innerHTML = ''; benimVerim.gorevler.forEach(gorev => { let textStil = gorev.tamamlandi ? "text-decoration: line-through; color: #94a3b8;" : "color: #334155; font-weight: 800;"; let sagKisim = gorev.tamamlandi ? `<span style="color: #10b981; font-weight: 800;">✅ Bitti</span>` : `<button class="finish-btn" onclick="goreviBitir(${gorev.id})">Bitir (+10 XP)</button>`; taskList.innerHTML += `<div class="task-item"><span style="${textStil}">${gorev.metin}</span>${sagKisim}</div>`; }); } }
    }
});

// (Zamanlayıcılar, radyo vb. diğer fonksiyonlar aynı kalıyor, yer kaplamasın diye eklemedim)