const socket = io(); 
const aktifOgrenci = localStorage.getItem('ogrenciKimligi'); 
const kocKodu = localStorage.getItem('kocKodu'); 
const veliKodu = localStorage.getItem('veliKodu');

// Odaya Bağlan
socket.emit('join_room', kocKodu);

if(document.getElementById('veliKoduGosterge')) { 
    document.getElementById('veliKoduGosterge').innerText = veliKodu || 'V-XXXX'; 
}

// ==========================================
// 1. BİLDİRİM VE SIKIŞTIRMA MOTORLARI
// ==========================================

if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") { 
    Notification.requestPermission(); 
}

function sistemBildirimi(baslik, mesaj) { 
    if ("Notification" in window && Notification.permission === "granted") { 
        new Notification(baslik, { body: mesaj, icon: "https://cdn-icons-png.flaticon.com/512/616/616430.png" }); 
    } 
}

// 🚨 Görüntü Sıkıştırma Motoru (Veritabanının şişmesini engeller)
function resimSikistir(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; // Genişliği maksimum 800px'e sabitledik
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Kaliteyi 0.6 (Yüzde 60) yaparak boyutu inanılmaz küçültüyoruz
            const sıkistirilmisBase64 = canvas.toDataURL('image/jpeg', 0.6);
            callback(sıkistirilmisBase64);
        }
    };
}

// ==========================================
// 2. DEVASA MÜFREDAT VERİTABANI
// ==========================================

const MUFREDAT = { 
    "YKS": { 
        "TYT Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Ses Bilgisi", "Yazım Kuralları", "Noktalama İşaretleri", "Sözcükte Yapı", "Sözcük Türleri", "Fiiller ve Fiilimsiler", "Cümlenin Ögeleri", "Cümle Türleri", "Anlatım Bozuklukları"], 
        "TYT Matematik": ["Temel Kavramlar", "Sayı Basamakları", "Bölme ve Bölünebilme", "EBOB-EKOK", "Rasyonel Sayılar", "Ondalık Sayılar", "Basit Eşitsizlikler", "Mutlak Değer", "Üslü İfadeler", "Köklü İfadeler", "Çarpanlara Ayırma", "Denklem Çözme", "Oran ve Orantı", "Problemler (Sayı, Kesir, Yaş vb.)", "Problemler (Hareket, İşçi, Karışım vb.)", "Mantık", "Kümeler", "Fonksiyonlar", "Polinomlar", "Veri, Sayma ve Olasılık"], 
        "TYT Geometri": ["Doğruda ve Üçgende Açılar", "Dik ve Özel Üçgenler", "İkizkenar ve Eşkenar Üçgen", "Üçgende Alan ve Benzerlik", "Açıortay ve Kenarortay", "Çokgenler", "Dörtgenler (Kare, Dikdörtgen vb.)", "Çember ve Daire", "Analitik Geometri", "Katı Cisimler"], 
        "TYT Fizik": ["Fizik Bilimine Giriş", "Madde ve Özellikleri", "Hareket ve Kuvvet", "İş, Güç ve Enerji", "Isı, Sıcaklık ve Genleşme", "Elektrostatik", "Elektrik Akımı ve Devreler", "Manyetizma", "Basınç", "Kaldırma Kuvveti", "Dalgalar", "Optik"], 
        "TYT Kimya": ["Kimya Bilimi", "Atom ve Periyodik Sistem", "Kimyasal Türler Arası Etkileşimler", "Maddenin Halleri", "Doğa ve Kimya", "Kimyanın Temel Kanunları ve Mol", "Kimyasal Hesaplamalar", "Karışımlar", "Asitler, Bazlar ve Tuzlar", "Kimya Her Yerde"], 
        "TYT Biyoloji": ["Yaşam Bilimi Biyoloji", "Canlıların Temel Bileşenleri", "Hücre ve Organelleri", "Canlıların Dünyası (Sınıflandırma)", "Hücre Bölünmeleri (Mitoz-Mayoz)", "Kalıtım", "Ekosistem Ekolojisi", "Güncel Çevre Sorunları"], 
        "TYT Tarih": ["Tarih ve Zaman", "İnsanlığın İlk Dönemleri", "Orta Çağ'da Dünya", "İlk ve Orta Çağlarda Türk Dünyası", "İslam Medeniyetinin Doğuşu", "Türklerin İslamiyet'i Kabulü", "Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiyesi", "Beylikten Devlete Osmanlı", "Dünya Gücü Osmanlı", "Değişim Çağında Avrupa ve Osmanlı", "En Uzun Yüzyıl", "20. Yüzyıl Başlarında Osmanlı", "Milli Mücadele", "Atatürkçülük ve Türk İnkılabı"], 
        "TYT Coğrafya": ["Doğa ve İnsan", "Dünya'nın Şekli ve Hareketleri", "Coğrafi Konum ve Koordinat Sistemi", "Harita Bilgisi", "Atmosfer ve İklim", "Türkiye'nin İklimi", "Yerin Yapısı ve Oluşum Süreci", "İç ve Dış Kuvvetler", "Su, Toprak ve Bitki", "Nüfus ve Yerleşme", "Göç", "Ekonomik Faaliyetler", "Bölgeler ve Ülkeler", "Doğal Afetler"], 
        "TYT Felsefe": ["Felsefeyi Tanıma", "Felsefeyle Düşünme", "Varlık Felsefesi", "Bilgi Felsefesi", "Bilim Felsefesi", "Ahlak Felsefesi", "Din Felsefesi", "Siyaset Felsefesi", "Sanat Felsefesi"], 
        "TYT Din Kültürü": ["Bilgi ve İnanç", "Din ve İslam", "İslam ve İbadet", "Gençlik ve Değerler", "Allah İnsan İlişkisi", "Hz. Muhammed", "Vahiy ve Akıl", "İslam Düşüncesinde Yorumlar"], 
        "AYT Matematik": ["Polinomlar", "2. Dereceden Denklemler ve Eşitsizlikler", "Parabol", "Trigonometri", "Logaritma", "Diziler ve Seriler", "Limit ve Süreklilik", "Türev", "İntegral", "Sayma ve Olasılık"], 
        "AYT Edebiyat": ["Güzel Sanatlar ve Edebiyat", "Şiir Bilgisi", "Söz Sanatları", "İslamiyet Öncesi Türk Edebiyatı", "Geçiş Dönemi Türk Edebiyatı", "Halk Edebiyatı", "Divan Edebiyatı", "Tanzimat Edebiyatı", "Servetifünun ve Fecriati Edebiyatı", "Milli Edebiyat Dönemi", "Cumhuriyet Dönemi Edebiyatı", "Edebi Akımlar"], 
        "AYT Fizik": ["Vektörler ve Bağıl Hareket", "Newton'un Hareket Yasaları", "Atışlar ve Bir Boyutta Hareket", "İş, Enerji ve Güç", "İtme ve Çizgisel Momentum", "Tork ve Denge", "Basit Makineler", "Elektriksel Kuvvet, Potansiyel ve İş", "Paralel Levhalar ve Sığa", "Manyetizma ve Elektromanyetik İndüklenme", "Alternatif Akım ve Transformatör", "Çembersel Hareket", "Basit Harmonik Hareket", "Dalga Mekaniği", "Atom Fiziğine Giriş ve Radyoaktivite", "Modern Fizik", "Modern Fiziğin Teknolojideki Uygulamaları"], 
        "AYT Kimya": ["Modern Atom Teorisi", "Gazlar", "Sıvı Çözeltiler ve Çözünürlük", "Kimyasal Tepkimelerde Enerji", "Kimyasal Tepkimelerde Hız", "Kimyasal Tepkimelerde Denge", "Asit-Baz Dengesi", "Çözünürlük Dengesi (Kçç)", "Kimya ve Elektrik (Elektrokimya)", "Karbon Kimyasına Giriş", "Organik Kimya"], 
        "AYT Biyoloji": ["Sinir Sistemi", "Endokrin Sistem", "Duyu Organları", "Destek ve Hareket Sistemi", "Sindirim Sistemi", "Dolaşım Sistemi", "Solunum Sistemi", "Üriner Sistem (Boşaltım)", "Üreme Sistemi ve Embriyonik Gelişim", "Komünite ve Popülasyon Ekolojisi", "Nükleik Asitler ve Protein Sentezi", "Fotosentez ve Kemosentez", "Hücresel Solunum", "Bitki Biyolojisi"], 
        "AYT Tarih": ["Tarih ve Zaman", "İnsanlığın İlk Dönemleri", "Orta Çağ'da Dünya", "İlk ve Orta Çağlarda Türk Dünyası", "İslam Medeniyetinin Doğuşu", "Türklerin İslamiyet'i Kabulü ve İlk Türk İslam Devletleri", "Türkiye Tarihi (11-13. Yüzyıllar)", "Osmanlı Devleti (Kuruluş, Yükselme, Duraklama, Gerileme, Dağılma)", "20. Yüzyıl Başlarında Osmanlı", "Milli Mücadele", "Atatürkçülük ve Türk İnkılabı", "İki Savaş Arasındaki Dönemde Türkiye ve Dünya", "II. Dünya Savaşı Sürecinde Türkiye ve Dünya", "Soğuk Savaş Dönemi", "Yumuşama (Detant) Dönemi ve Sonrası", "Küreselleşen Dünya"], 
        "AYT Coğrafya": ["Biyoçeşitlilik ve Ekosistem", "Şehirlerin Fonksiyonları ve Etki Alanları", "Türkiye'nin Nüfus Politikaları ve Projeksiyonları", "Türkiye'de Tarım, Hayvancılık ve Ormancılık", "Türkiye'de Madenler ve Enerji Kaynakları", "Türkiye'de Sanayi", "Türkiye'de Ulaşım ve Turizm", "Ülkeler ve Bölgeler", "Çevre Sorunları ve Koruma", "Küresel ve Bölgesel Örgütler"], 
        "Genel Deneme": ["TYT Genel Deneme", "AYT Genel Deneme", "Türkiye Geneli Kurumsal Deneme", "Alan Denemesi (Sosyal/Fen/Mat)"] 
    }, 
    "LGS": { 
        "LGS Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragrafta Anlam", "Fiilimsiler", "Cümlenin Ögeleri", "Cümle Türleri", "Yazım Kuralları", "Noktalama İşaretleri", "Anlatım Bozuklukları", "Metin Türleri ve Söz Sanatları", "Görsel Yorumlama ve Sözel Mantık"], 
        "LGS Matematik": ["Çarpanlar ve Katlar", "Üslü İfadeler", "Kareköklü İfadeler", "Veri Analizi", "Basit Olayların Olma Olasılığı", "Cebirsel İfadeler ve Özdeşlikler", "Doğrusal Denklemler", "Eşitsizlikler", "Üçgenler", "Eşlik ve Benzerlik", "Dönüşüm Geometrisi", "Geometrik Cisimler"], 
        "LGS Fen Bilimleri": ["Mevsimler ve İklim", "DNA ve Genetik Kod", "Basınç", "Madde ve Endüstri", "Basit Makineler", "Enerji Dönüşümleri ve Çevre Bilimi", "Elektrik Yükleri ve Elektrik Enerjisi"], 
        "LGS İnkılap Tarihi": ["Bir Kahraman Doğuyor", "Milli Uyanış: Bağımsızlık Yolunda Atılan Adımlar", "Milli Bir Destan: Ya İstiklal Ya Ölüm", "Atatürkçülük ve Çağdaşlaşan Türkiye", "Demokratikleşme Çabaları", "Atatürk Dönemi Türk Dış Politikası", "Atatürk'ün Ölümü ve Sonrası"], 
        "LGS İngilizce": ["Friendship", "Teen Life", "In the Kitchen", "On the Phone", "The Internet", "Adventures", "Tourism", "Chores", "Science", "Natural Forces"], 
        "LGS Din Kültürü": ["Kader İnancı", "Zekat ve Sadaka", "Din ve Hayat", "Hz. Muhammed'in Örnekliliği", "Kur'an-ı Kerim ve Özellikleri"], 
        "Genel Deneme": ["LGS Genel Deneme", "Kurumsal Deneme", "Branş Denemesi"] 
    } 
};

// ==========================================
// 3. SAYAÇ, DERS SEÇİMİ VE AFK DENETİMİ
// ==========================================

const sinavSecimi = document.getElementById('sinavSecimi'); 
const dersSecimiUI = document.getElementById('dersSecimiUI'); 
const konuSecimi = document.getElementById('konuSecimi');
const display = document.getElementById('display');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');

let aktifDersString = localStorage.getItem(`${aktifOgrenci}_activeDers`);
if(!aktifDersString || !aktifDersString.includes('[')) {
    aktifDersString = "[YKS] TYT Matematik - Temel Kavramlar";
}

let tInterval;
let running = false;
let mode = 'normal';
let anlikXp = 0;
let oncekiGorevSayisi = -1; 
let sonZoomLinki = '';
let bekleyenDuelloRakip = '';

// 🚨 Masa Başı Denetim Değişkenleri
let yoklamaTimer;
let yoklamaGeriSayimInterval;

function getDers() { 
    return `[${sinavSecimi.value}] ${dersSecimiUI.value} - ${konuSecimi.value}`; 
}

function mufredatYukle(ilkYukleme = false) { 
    const sinav = sinavSecimi.value; 
    dersSecimiUI.innerHTML = ''; 
    for(let d in MUFREDAT[sinav]) { 
        dersSecimiUI.innerHTML += `<option value="${d}">${d}</option>`; 
    } 
    if(!ilkYukleme) konuYukle(); 
}

function konuYukle(ilkYukleme = false) { 
    const sinav = sinavSecimi.value; 
    const ders = dersSecimiUI.value; 
    konuSecimi.innerHTML = ''; 
    
    if(MUFREDAT[sinav] && MUFREDAT[sinav][ders]) { 
        MUFREDAT[sinav][ders].forEach(k => { 
            konuSecimi.innerHTML += `<option value="${k}">${k}</option>`; 
        }); 
    } 
    
    if(!ilkYukleme) dersDegisikliginiKaydet(); 
}

function dersDegisikliginiKaydet() { 
    let yeniDers = getDers(); 
    if(yeniDers === aktifDersString) return; 
    
    if (running) { 
        let st = parseInt(localStorage.getItem(`${aktifOgrenci}_startTime`)); 
        let oldSaved = parseInt(localStorage.getItem(`${aktifOgrenci}_${aktifDersString}_savedTime`)) || 0; 
        let diff = new Date().getTime() - st + oldSaved; 
        
        localStorage.setItem(`${aktifOgrenci}_${aktifDersString}_savedTime`, diff); 
        socket.emit('istatistik_guncelle', { ogrenciAd: aktifOgrenci, ders: aktifDersString, ms: diff, kocKodu: kocKodu }); 
        
        clearInterval(tInterval); 
        running = false; 
        localStorage.setItem(`${aktifOgrenci}_running`, 'false'); 
        
        pauseBtn.style.display = 'none'; 
        startBtn.style.display = 'block'; 
        startBtn.innerHTML = "▶ Başla"; 
        
        document.getElementById('statusText').innerHTML = "Ders değişti, sayaç durduruldu."; 
        document.getElementById('statusText').style.backgroundColor = "#f1f5f9"; 
        document.getElementById('statusText').style.color = "#64748b"; 
        
        socket.emit('ogrenci_derse_basladi', { ogrenciAd: aktifOgrenci, ders: aktifDersString, mesaj: 'Ders değiştirdi, durdurdu.', kocKodu: kocKodu }); 
        
        // Dersi durdurduğumuz için AFK Yoklamasını iptal et
        clearTimeout(yoklamaTimer);
    } 
    
    aktifDersString = yeniDers; 
    localStorage.setItem(`${aktifOgrenci}_activeDers`, aktifDersString); 
    localStorage.setItem(`${aktifOgrenci}_secilenSinav`, sinavSecimi.value); 
    localStorage.setItem(`${aktifOgrenci}_secilenDers`, dersSecimiUI.value); 
    localStorage.setItem(`${aktifOgrenci}_secilenKonu`, konuSecimi.value); 
    
    let currentSaved = parseInt(localStorage.getItem(`${aktifOgrenci}_${yeniDers}_savedTime`)) || 0; 
    gostergeyiGuncelle(currentSaved); 
    socket.emit('sure_guncelle', { ogrenciAd: aktifOgrenci, sure: display.innerHTML, kocKodu: kocKodu }); 
    
    if(currentSaved > 0) { 
        startBtn.innerHTML = "▶ Devam Et"; 
    } else { 
        startBtn.innerHTML = "▶ Başla"; 
    } 
}

// Seçim kutularını dinle
if(sinavSecimi) sinavSecimi.addEventListener('change', () => mufredatYukle(false)); 
if(dersSecimiUI) dersSecimiUI.addEventListener('change', () => konuYukle(false)); 
if(konuSecimi) konuSecimi.addEventListener('change', dersDegisikliginiKaydet);

function gostergeyiGuncelle(sureMs) { 
    if(mode === 'normal') { 
        let hours = Math.floor((sureMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((sureMs % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((sureMs % (1000 * 60)) / 1000); 
        
        display.innerHTML = (hours < 10 ? "0"+hours : hours) + ":" + 
                            (minutes < 10 ? "0"+minutes : minutes) + ":" + 
                            (seconds < 10 ? "0"+seconds : seconds); 
        return false; 
    } else { 
        let val = parseInt(document.getElementById('pomoInput').value) || 25;
        let kalan = (val * 60 * 1000) - sureMs; 
        
        if(kalan <= 0) { 
            display.innerHTML = "00:00"; 
            return true; 
        } 
        
        let minutes = Math.floor((kalan % (1000 * 60 * 60)) / (1000 * 60));
        let seconds = Math.floor((kalan % (1000 * 60)) / 1000); 
        
        display.innerHTML = (minutes < 10 ? "0"+minutes : minutes) + ":" + 
                            (seconds < 10 ? "0"+seconds : seconds); 
        return false; 
    } 
}

function sesCal() { 
    const s = document.getElementById('bildirimSesi'); 
    s.currentTime = 0; 
    s.play().catch(e=>{}); 
}

// 🚨 YENİ: Masa Başı Yoklama Mantığı
function rastgeleYoklamaKur() {
    clearTimeout(yoklamaTimer);
    // 15 ile 25 dakika arasında rastgele bir zaman seç
    let rastgeleDakika = Math.floor(Math.random() * (25 - 15 + 1)) + 15;
    let beklemeSuresi = rastgeleDakika * 60 * 1000;
    
    yoklamaTimer = setTimeout(yoklamayiTetikle, beklemeSuresi);
}

function yoklamayiTetikle() {
    sesCal();
    sistemBildirimi("🚨 Gözüm Üzerinde Kaptan!", "60 saniye içinde burada olduğunu onayla, yoksa odaklanman iptal edilecek!");
    
    let modal = document.getElementById('yoklamaModal');
    if(modal) {
        modal.style.display = 'flex';
        let sayacEl = document.getElementById('yoklamaGeriSayim');
        let kalanSaniye = 60;
        sayacEl.innerText = kalanSaniye;

        yoklamaGeriSayimInterval = setInterval(() => {
            kalanSaniye--;
            sayacEl.innerText = kalanSaniye;
            
            if(kalanSaniye <= 0) {
                // SÜRE DOLDU: ÖĞRENCİ MASADA DEĞİL!
                clearInterval(yoklamaGeriSayimInterval);
                modal.style.display = 'none';
                
                // Sayacı durdur
                window.pauseTimer(false); 
                document.getElementById('statusText').innerHTML = "🚨 Masadan ayrıldığın için odaklanma durduruldu!";
                document.getElementById('statusText').style.backgroundColor = "#fee2e2";
                document.getElementById('statusText').style.color = "#dc2626";
                
                // Öğretmene haber ver
                socket.emit('masa_basi_uyarisi', { ogrenciAd: aktifOgrenci, kocKodu: kocKodu });
            }
        }, 1000);
    }
}

window.yoklamaBuradayim = function() {
    // Öğrenci butona bastı, süreyi sıfırla ve yeni yoklama kur
    clearInterval(yoklamaGeriSayimInterval);
    let modal = document.getElementById('yoklamaModal');
    if(modal) modal.style.display = 'none';
    
    rastgeleYoklamaKur(); // Yeni bir tuzak kur :)
};


// ==========================================
// 4. WINDOW'A BAĞLI (ONCLICK) FONKSİYONLAR
// ==========================================

window.setMode = function(m) { 
    if(running) return; 
    
    mode = m; 
    localStorage.setItem(`${aktifOgrenci}_mode`, m); 
    
    let mNormal = document.getElementById('modeNormal');
    let mPomo = document.getElementById('modePomo');
    
    if(mNormal && mPomo) {
        mNormal.className = m === 'normal' ? 'mode-btn mode-active' : 'mode-btn mode-passive'; 
        mPomo.className = m === 'pomodoro' ? 'mode-btn mode-active' : 'mode-btn mode-passive'; 
    }
    
    let pInput = document.getElementById('pomoInput');
    if(pInput) {
        pInput.style.display = m === 'pomodoro' ? 'block' : 'none'; 
    }
};

window.startTimer = function() { 
    if (!running) { 
        let gercekDers = getDers();

        localStorage.setItem(`${aktifOgrenci}_startTime`, new Date().getTime()); 
        localStorage.setItem(`${aktifOgrenci}_running`, 'true'); 
        
        tInterval = setInterval(() => { 
            let diff = new Date().getTime() - parseInt(localStorage.getItem(`${aktifOgrenci}_startTime`)) + (parseInt(localStorage.getItem(`${aktifOgrenci}_${gercekDers}_savedTime`)) || 0); 
            
            if (gostergeyiGuncelle(diff) && mode === 'pomodoro') { 
                sesCal(); 
                window.pauseTimer(true); 
                sistemBildirimi("🍅 Pomodoro Bitti!", "Harika odaklandın, şimdi mola vakti."); 
            } 
            
            socket.emit('sure_guncelle', { ogrenciAd: aktifOgrenci, sure: display.innerHTML, kocKodu: kocKodu }); 
        }, 1000); 
        
        running = true; 
        startBtn.style.display = 'none'; 
        pauseBtn.style.display = 'block'; 
        
        document.getElementById('statusText').innerHTML = "🟢 Odak modu aktif!"; 
        document.getElementById('statusText').style.backgroundColor = "#d1fae5"; 
        document.getElementById('statusText').style.color = "#059669"; 
        
        socket.emit('ogrenci_derse_basladi', { 
            ogrenciAd: aktifOgrenci, 
            ders: gercekDers, 
            mesaj: mode === 'pomodoro' ? 'Pomodoro Başlattı!' : 'Kronometre Başlattı!', 
            kocKodu: kocKodu 
        }); 
        
        // 🚨 AFK Yoklamasını Başlat
        rastgeleYoklamaKur();
    } 
};

window.pauseTimer = function(otomatikMi = false) { 
    if (running) { 
        let gercekDers = getDers();

        clearInterval(tInterval); 
        let diff = new Date().getTime() - parseInt(localStorage.getItem(`${aktifOgrenci}_startTime`)) + (parseInt(localStorage.getItem(`${aktifOgrenci}_${gercekDers}_savedTime`)) || 0); 
        
        localStorage.setItem(`${aktifOgrenci}_${gercekDers}_savedTime`, otomatikMi && mode === 'pomodoro' ? 0 : diff); 
        
        socket.emit('istatistik_guncelle', { ogrenciAd: aktifOgrenci, ders: gercekDers, ms: diff, kocKodu: kocKodu }); 
        
        localStorage.setItem(`${aktifOgrenci}_running`, 'false'); 
        running = false; 
        pauseBtn.style.display = 'none'; 
        startBtn.style.display = 'block'; 
        startBtn.innerHTML = otomatikMi ? "▶ Başla" : "▶ Devam Et"; 
        
        if(document.getElementById('statusText').innerHTML !== "🚨 Masadan ayrıldığın için odaklanma durduruldu!") {
            document.getElementById('statusText').innerHTML = otomatikMi ? "🎉 Pomodoro Bitti!" : "⏸️ Mola Verildi."; 
            document.getElementById('statusText').style.backgroundColor = "#fef3c7"; 
            document.getElementById('statusText').style.color = "#d97706"; 
        }
        
        socket.emit('ogrenci_derse_basladi', { 
            ogrenciAd: aktifOgrenci, 
            ders: gercekDers, 
            mesaj: otomatikMi ? 'Pomodoro Bitti, Molada.' : 'Mola verdi, durdurdu.', 
            kocKodu: kocKodu 
        }); 
        
        // 🚨 AFK Yoklamasını İptal Et (Mola verdiği için)
        clearTimeout(yoklamaTimer);
        clearInterval(yoklamaGeriSayimInterval);
        let modal = document.getElementById('yoklamaModal');
        if(modal) modal.style.display = 'none';
    } 
};

window.radyoKapat = function() { 
    document.getElementById('radyoLofi').pause(); 
    document.getElementById('radyoYagmur').pause(); 
    document.getElementById('radyoKafe').pause(); 
    document.querySelectorAll('.radyo-btn').forEach(b => b.classList.remove('aktif')); 
};

window.radyoCal = function(tur) { 
    window.radyoKapat(); 
    document.getElementById('btn' + tur).classList.add('aktif'); 
    let audio = document.getElementById('radyo' + tur); 
    audio.volume = 0.5; 
    audio.play().catch(e=>{}); 
};

window.hataResmiSec = function(input) {
    if(input.files && input.files[0]) {
        resimSikistir(input.files[0], function(kucukResim) {
            let suAnkiDers = getDers();
            socket.emit('hata_sorusu_ekle', { 
                ogrenciAd: aktifOgrenci, 
                kocKodu: kocKodu, 
                resim: kucukResim, 
                dersKonu: suAnkiDers 
            }); 
            alert("Soru başarıyla Hata Defterine eklendi! Koçunuz bunu görecek.");
            input.value = ''; 
        });
    }
};

window.duelloAt = function(hedefIsim) { 
    if(hedefIsim === aktifOgrenci) return alert("Kendine meydan okuyamazsın!"); 
    if(confirm(`${hedefIsim} isimli arkadaşına meydan okumak istiyor musun?`)) { 
        socket.emit('duello_teklif_et', { gonderen: aktifOgrenci, hedef: hedefIsim, miktar: 50, kocKodu: kocKodu }); 
        document.getElementById('duelloModal').style.display = 'none'; 
    } 
};

window.duelloKabulEt = function() { 
    socket.emit('duello_kabul_edildi', { gonderen: bekleyenDuelloRakip, hedef: aktifOgrenci, miktar: 50, kocKodu: kocKodu }); 
    document.getElementById('duelloIstekModal').style.display = 'none'; 
};

window.avatarSec = function(ikon) { 
    document.getElementById('aktifAvatar').innerHTML = ikon; 
    document.getElementById('avatarModal').style.display = 'none'; 
    socket.emit('avatar_guncelle', { ogrenciAd: aktifOgrenci, avatar: ikon, kocKodu: kocKodu }); 
};

// 🧠 YENİ: Akıllı Optik (Detaylı Net Gönderimi)
window.netKaydet = function() { 
    let tur = document.getElementById('sinavTuru').value; 
    
    // Toplam veya Detaylı giriş kontrolü
    let detayKutusu = document.getElementById('detayliNetKutusu');
    let toplamNet = 0;
    let detayliObj = null;

    if(detayKutusu && detayKutusu.style.display !== 'none') {
        // Detaylı giriş
        let turkce = Number(document.getElementById('netTurkce').value) || 0;
        let mat = Number(document.getElementById('netMatematik').value) || 0;
        let fen = Number(document.getElementById('netFen').value) || 0;
        let sos = Number(document.getElementById('netSosyal').value) || 0;
        
        toplamNet = turkce + mat + fen + sos;
        detayliObj = {
            "Türkçe": turkce,
            "Matematik": mat,
            "Fen Bilimleri": fen,
            "Sosyal Bilimler": sos
        };
    } else {
        // Basit giriş
        let net = document.getElementById('netSkoru').value; 
        if(!net) return alert("Net girmelisiniz!");
        toplamNet = Number(net);
    }
    
    socket.emit('net_ekle', { 
        ogrenciAd: aktifOgrenci, 
        sinavTuru: tur, 
        netSkoru: toplamNet, 
        detay: detayliObj,
        kocKodu: kocKodu 
    }); 
    
    if(document.getElementById('netSkoru')) document.getElementById('netSkoru').value = ''; 
    document.getElementById('netModal').style.display = 'none'; 
    alert("Netiniz iletildi! Koçunuz zayıf konuları analiz edecek. 🚀"); 
};

// 🧠 YENİ: Psikolojik Test Gönderimi
window.psikolojikTestKaydet = function() {
    let q1 = parseInt(document.getElementById('anketSoru1').value) || 0;
    let q2 = parseInt(document.getElementById('anketSoru2').value) || 0;
    let q3 = parseInt(document.getElementById('anketSoru3').value) || 0;
    
    let totalScore = q1 + q2 + q3;
    let yorum = "Düşük Kaygı";
    if (totalScore >= 10) yorum = "Orta Kaygı";
    if (totalScore >= 13) yorum = "Yüksek Kaygı (Rehberlik Gerekli)";

    socket.emit('rehberlik_testi_kaydet', {
        ogrenciAd: aktifOgrenci,
        kocKodu: kocKodu,
        testAdi: "Sınav Kaygısı Envanteri",
        skor: totalScore,
        sonuc: yorum
    });

    document.getElementById('rehberlikModal').style.display = 'none';
    alert("Test sonucun koçuna iletildi!");
};

window.odulAl = function(odulIsmi, bedel) { 
    if(anlikXp < bedel) return alert("Yetersiz XP!"); 
    if(confirm(`${odulIsmi} almak istiyor musun?`)) { 
        socket.emit('odul_satin_al', { ogrenciAd: aktifOgrenci, odul: odulIsmi, bedel: bedel, kocKodu: kocKodu }); 
        document.getElementById('marketModal').style.display = 'none'; 
    } 
};

window.goreviBitir = function(id) { 
    sesCal(); 
    socket.emit('gorev_tamamlandi', { ogrenciAd: aktifOgrenci, gorevId: id, durum: true, kocKodu: kocKodu }); 
};

window.toggleChat = function() { 
    const body = document.getElementById('chatBody');
    const footer = document.getElementById('chatFooter');
    const uyari = document.getElementById('chatUyari'); 
    
    if(body.style.display === 'flex') { 
        body.style.display = 'none'; 
        footer.style.display = 'none'; 
    } else { 
        body.style.display = 'flex'; 
        footer.style.display = 'flex'; 
        if(uyari) uyari.style.display = 'none'; 
        body.scrollTop = body.scrollHeight; 
    } 
};

window.mesajGonder = function() { 
    const input = document.getElementById('chatInput'); 
    if(input.value.trim() !== '') { 
        socket.emit('chat_mesaji_gonder', { gonderen: aktifOgrenci, mesaj: input.value, rol: 'ogrenci', kocKodu: kocKodu }); 
        input.value = ''; 
    } 
};

window.resimGonder = function(input) { 
    if(input.files && input.files[0]) { 
        resimSikistir(input.files[0], function(kucukResim) {
            socket.emit('chat_mesaji_gonder', { 
                gonderen: aktifOgrenci, 
                mesaj: kucukResim, 
                rol: 'ogrenci', 
                tip: 'resim', 
                kocKodu: kocKodu 
            }); 
            input.value = ''; 
        });
    } 
};

window.toggleBot = function() { 
    const body = document.getElementById('botBody');
    const footer = document.getElementById('botFooter'); 
    
    if(body.style.display === 'flex') { 
        body.style.display = 'none'; 
        footer.style.display = 'none'; 
    } else { 
        body.style.display = 'flex'; 
        footer.style.display = 'flex'; 
        body.scrollTop = body.scrollHeight; 
    } 
};

window.botMesajGonder = function() { 
    const input = document.getElementById('botInput'); 
    let mesajMetni = input.value.trim(); 
    
    if(mesajMetni !== '') { 
        const body = document.getElementById('botBody'); 
        body.innerHTML += `<div style="align-self: flex-end; background: #a855f7; color: white; padding: 10px 14px; border-radius: 14px; font-size: 13px; max-width: 80%; line-height: 1.4; margin-bottom: 10px; font-weight: 700;">${mesajMetni}</div>`; 
        body.scrollTop = body.scrollHeight; 
        
        let suAnkiDers = getDers();
        socket.emit('ogrenci_chatbot_mesaji', { ogrenciAd: aktifOgrenci, mesaj: mesajMetni, ders: suAnkiDers, kocKodu: kocKodu }); 
        input.value = ''; 
    } 
};

// ==========================================
// 5. SOCKET.IO DİNLEYİCİLERİ
// ==========================================

socket.on('gorev_guncellendi', (tumVeriler) => {
    let duelloDiv = document.getElementById('duelloSinifListesi'); 
    if(duelloDiv){ 
        duelloDiv.innerHTML = ''; 
        tumVeriler.forEach(o => { 
            if(o.ogrenciAd !== aktifOgrenci) { 
                duelloDiv.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #cbd5e1;">
                    <span>${o.avatar || '👤'} <b>${o.ogrenciAd}</b></span> 
                    <button class="duel-btn" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:8px; font-weight:bold; cursor:pointer;" onclick="duelloAt('${o.ogrenciAd}')">Meydan Oku</button>
                </div>`; 
            } 
        }); 
    }

    let benimVerim = tumVeriler.find(v => v.ogrenciAd === aktifOgrenci);
    if (benimVerim) {
        
        if (benimVerim.canliDersLink && benimVerim.canliDersLink.trim() !== '') {
            let zBtn = document.getElementById('zoomLinkBtn');
            if(zBtn) {
                zBtn.href = benimVerim.canliDersLink;
                zBtn.style.display = 'block';
                if(sonZoomLinki !== benimVerim.canliDersLink) {
                    sistemBildirimi("🔴 Canlı Ders Başladı!", "Koçun yayında, panele gir ve derse katıl!");
                    sonZoomLinki = benimVerim.canliDersLink;
                }
            }
        } else { 
            if(document.getElementById('zoomLinkBtn')) {
                document.getElementById('zoomLinkBtn').style.display = 'none'; 
            }
        }

        if (benimVerim.hataDefteri) {
            let hataKutu = document.getElementById('hataListem');
            if(hataKutu) {
                hataKutu.innerHTML = '';
                if(benimVerim.hataDefteri.length === 0) {
                    hataKutu.innerHTML = '<span style="color:#94a3b8; font-weight:bold;">Henüz eklenmiş soru yok.</span>';
                }
                benimVerim.hataDefteri.forEach(hata => {
                    let renk = hata.durum === 'Çözüldü' ? '#10b981' : '#f59e0b';
                    hataKutu.innerHTML += `
                    <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 15px;">
                        <span style="background:${renk}; color:white; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:11px;">${hata.durum}</span> 
                        <b style="color:#334155; margin-left:5px;">${hata.dersKonu}</b> <br>
                        <span style="font-size:11px; color:#94a3b8;">Yüklenme: ${hata.tarih}</span>
                        <br><img src="${hata.resim}" style="max-width:100%; max-height:150px; margin-top:10px; border-radius:8px; border:1px solid #cbd5e1; cursor:pointer;" onclick="window.open('${hata.resim}','_blank')">
                    </div>`;
                });
            }
        }

        if (benimVerim.gorevler) { 
            if (oncekiGorevSayisi !== -1 && benimVerim.gorevler.length > oncekiGorevSayisi) { 
                sesCal(); 
                sistemBildirimi("🎯 Yeni Görev Atandı!", "Koçun sana yeni bir hedef belirledi. Hemen paneline bak!"); 
            } 
            oncekiGorevSayisi = benimVerim.gorevler.length; 
        }

        if(benimVerim.veliKodu && document.getElementById('veliKoduGosterge')) { 
            document.getElementById('veliKoduGosterge').innerText = benimVerim.veliKodu; 
            localStorage.setItem('veliKodu', benimVerim.veliKodu); 
        }
        
        anlikXp = benimVerim.xp || 0; 
        if(document.getElementById('marketXpDisplay')) {
            document.getElementById('marketXpDisplay').innerText = anlikXp + " XP";
        }
        if(benimVerim.avatar && document.getElementById('aktifAvatar')) {
            document.getElementById('aktifAvatar').innerHTML = benimVerim.avatar;
        }
        
        let xpBadge = document.getElementById('xpBadge'); 
        if (!xpBadge) { 
            xpBadge = document.createElement('div'); 
            xpBadge.id = 'xpBadge'; 
            xpBadge.style.cssText = "position:absolute; top:20px; left:20px; color:white; padding:8px 15px; border-radius:20px; font-weight:800; font-size:14px; box-shadow:0 4px 10px rgba(0,0,0,0.2); z-index:100;"; 
            document.body.appendChild(xpBadge); 
        }
        
        let sirali = tumVeriler.sort((a,b) => (b.xp||0) - (a.xp||0));
        let benimSira = sirali.findIndex(v => v.ogrenciAd === aktifOgrenci);
        let ligIsmi = 'Henüz Lige Giremedi', ligRengi = '#94a3b8', anaRenk = '#64748b';
        
        if(benimSira !== -1 && benimVerim.xp > 0) { 
            if(benimSira < 3) { ligIsmi = '🏆 Süper Lig'; ligRengi = '#fef3c7'; anaRenk = '#f59e0b'; } 
            else if(benimSira < 8) { ligIsmi = '🥇 1. Lig'; ligRengi = '#f1f5f9'; anaRenk = '#64748b'; } 
            else { ligIsmi = '🪵 Amatör Lig'; ligRengi = '#ffedd5'; anaRenk = '#d97706'; } 
        }
        
        let rozetIcerik = `<span style="background:${ligRengi}; color:${anaRenk}; padding:4px 8px; border-radius:10px; margin-right:6px;">${ligIsmi}</span> | ${anlikXp} XP`;
        if(benimVerim.aktifDuello && benimVerim.aktifDuello.rakip) { 
            rozetIcerik += `<div style="background:#ef4444; color:white; padding:4px; border-radius:6px; margin-top:5px; font-size:11px; text-align:center;">⚔️ ${benimVerim.aktifDuello.rakip} ile Düelloda!</div>`; 
        }
        xpBadge.style.background = anaRenk; 
        xpBadge.innerHTML = rozetIcerik;

        let tb = document.getElementById('taskBoard');
        let taskList = document.getElementById('studentTaskList');
        if (benimVerim.gorevler && benimVerim.gorevler.length > 0) { 
            if(tb) tb.style.display = 'block'; 
            if(taskList) { 
                taskList.innerHTML = ''; 
                benimVerim.gorevler.forEach(gorev => { 
                    let textStil = gorev.tamamlandi ? "text-decoration: line-through; color: #94a3b8;" : "color: #334155; font-weight: 800;"; 
                    let sagKisim = gorev.tamamlandi ? `<span style="color: #10b981; font-weight: 800;">✅ Bitti</span>` : `<button class="finish-btn" onclick="goreviBitir(${gorev.id})">Bitir (+10 XP)</button>`; 
                    taskList.innerHTML += `<div class="task-item"><span style="${textStil}">${gorev.metin}</span>${sagKisim}</div>`; 
                }); 
            } 
        } else {
            if(tb) tb.style.display = 'none';
        }
    }
});

socket.on('duello_istegi_geldi', (veri) => { 
    if(veri.hedef === aktifOgrenci) { 
        bekleyenDuelloRakip = veri.gonderen; 
        document.getElementById('duelloIstekMetni').innerText = `${veri.gonderen} sana 50 XP'sine meydan okuyor!`; 
        document.getElementById('duelloIstekModal').style.display = 'flex'; 
        sesCal(); 
        sistemBildirimi("⚔️ Meydan Okuma!", `${veri.gonderen} sana düello teklif etti!`); 
    } 
});

socket.on('duello_basladi', (veri) => { 
    if(veri.o1 === aktifOgrenci || veri.o2 === aktifOgrenci) { 
        alert("⚔️ DÜELLO BAŞLADI!"); 
        sesCal(); 
    } 
});

socket.on('duello_sonucu', (veri) => { 
    if(veri.kazanan === aktifOgrenci) { 
        alert(`🏆 Kazandın! +${veri.miktar} XP`); 
        sesCal(); 
        sistemBildirimi("🏆 Düelloyu Kazandın!", `Tebrikler, ${veri.miktar} XP hesaba eklendi.`);
    } else if(veri.kaybeden === aktifOgrenci) { 
        alert(`💀 Kaybettin! -${veri.miktar} XP`); 
        sistemBildirimi("💀 Düelloyu Kaybettin", `${veri.kazanan} senden önce bitirdi.`);
    } 
});

socket.on('kaynaklari_yukle', (liste) => { 
    let kutu = document.getElementById('kaynakListesi'); 
    if(!kutu) return; 
    kutu.innerHTML = ''; 
    if(liste.length === 0) { 
        kutu.innerHTML = '<div style="color: #94a3b8; font-style: italic;">Henüz kaynak yok.</div>'; 
        return; 
    } 
    liste.forEach(k => { 
        kutu.innerHTML += `<div class="kaynak-item" style="background:#f1f5f9; padding:15px; border-radius:12px; margin-bottom:10px; text-align:left; font-weight:bold; font-size:14px; border-left:5px solid #8b5cf6;">${k.baslik} <a href="${k.url}" target="_blank" style="color:#4f46e5; text-decoration:none; display:inline-block; margin-top:8px; font-size:13px; font-weight:900; background:#e0e7ff; padding:5px 10px; border-radius:8px;">🔗 Kaynağa Git</a></div>`; 
    }); 
});

socket.on('yeni_kaynak_eklendi', (kaynak) => { 
    sesCal(); 
    sistemBildirimi("📚 Yeni Kaynak", `Koçun kütüphaneye yeni bir kaynak ekledi: ${kaynak.baslik}`); 
    socket.emit('join_room', kocKodu); 
});

function chatEkranaBas(veri) { 
    const body = document.getElementById('chatBody'); 
    let benMiyim = (veri.gonderen === aktifOgrenci);
    let renk = benMiyim ? '#3b82f6' : '#e2e8f0';
    let yaziRengi = benMiyim ? 'white' : '#1e293b';
    let hizalama = benMiyim ? 'flex-end' : 'flex-start';
    let ikon = veri.rol === 'koc' ? '👨‍🏫' : '💬'; 
    let icerik = veri.tip === 'resim' ? `<img src="${veri.mesaj}" style="max-width: 100%; border-radius: 8px; margin-top: 5px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onclick="window.open('${veri.mesaj}', '_blank')">` : veri.mesaj; 
    
    body.innerHTML += `<div style="align-self: ${hizalama}; background: ${renk}; color: ${yaziRengi}; padding: 10px 14px; border-radius: 14px; font-size: 13px; max-width: 80%; line-height: 1.4; margin-bottom: 10px; font-weight: 700;"><div style="font-size: 10px; font-weight: 900; margin-bottom: 4px; opacity: 0.8;">${ikon} ${veri.gonderen} • ${veri.saat}</div>${icerik}</div>`; 
    body.scrollTop = body.scrollHeight; 
}

socket.on('eski_chat_yukle', (gecmis) => { 
    let body = document.getElementById('chatBody');
    if(body) body.innerHTML = ''; 
    gecmis.forEach(msg => chatEkranaBas(msg)); 
});

socket.on('yeni_chat_mesaji', (msg) => { 
    chatEkranaBas(msg); 
    const body = document.getElementById('chatBody'); 
    if(msg.gonderen !== aktifOgrenci) { 
        sesCal(); 
        if(body && body.style.display !== 'flex' && document.getElementById('chatUyari')) {
            document.getElementById('chatUyari').style.display = 'flex'; 
        }
        sistemBildirimi("💬 Sınıftan Mesaj Var", `${msg.gonderen}: ${msg.tip === 'resim' ? 'Bir fotoğraf gönderdi' : msg.mesaj}`); 
    } 
});

socket.on('chatbot_cevabi', (cevapMetni) => { 
    sesCal(); 
    const body = document.getElementById('botBody'); 
    body.innerHTML += `<div style="align-self: flex-start; background: #e2e8f0; color: #1e293b; padding: 10px 14px; border-radius: 14px; font-size: 13px; max-width: 80%; line-height: 1.4; margin-bottom: 10px; font-weight: 700;"><div style="font-size: 10px; font-weight: 900; margin-bottom: 4px; opacity: 0.8;">🤖 KatalizApp AI</div>${cevapMetni}</div>`; 
    body.scrollTop = body.scrollHeight; 
});

// ==========================================
// 6. BAŞLANGIÇ AYARLARI (ONLOAD)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    
    if(sinavSecimi) {
        for(let s in MUFREDAT) { 
            sinavSecimi.innerHTML += `<option value="${s}">${s}</option>`; 
        }
    }
    
    let savedSinav = localStorage.getItem(`${aktifOgrenci}_secilenSinav`) || 'YKS'; 
    let savedDers = localStorage.getItem(`${aktifOgrenci}_secilenDers`) || 'TYT Matematik'; 
    let savedKonu = localStorage.getItem(`${aktifOgrenci}_secilenKonu`) || 'Temel Kavramlar';
    
    if(sinavSecimi) sinavSecimi.value = savedSinav; 
    mufredatYukle(true);
    
    if(dersSecimiUI && dersSecimiUI.querySelector(`option[value="${savedDers}"]`)) {
        dersSecimiUI.value = savedDers; 
    } else if (dersSecimiUI) {
        dersSecimiUI.selectedIndex = 0;
    }
    
    konuYukle(true);
    
    if(konuSecimi && konuSecimi.querySelector(`option[value="${savedKonu}"]`)) {
        konuSecimi.value = savedKonu; 
    } else if (konuSecimi) {
        konuSecimi.selectedIndex = 0;
    }
    
    aktifDersString = getDers();
    mode = localStorage.getItem(`${aktifOgrenci}_mode`) || 'normal';
    
    let mNormal = document.getElementById('modeNormal');
    let mPomo = document.getElementById('modePomo');
    let pInput = document.getElementById('pomoInput');

    if(mode === 'pomodoro') { 
        if(pInput) pInput.value = localStorage.getItem(`${aktifOgrenci}_pomoDuration`) || 25; 
        if(pInput) pInput.style.display = 'block'; 
        if(mNormal) mNormal.className = 'mode-btn mode-passive'; 
        if(mPomo) {
            mPomo.className = 'mode-btn mode-active'; 
            mPomo.style.background = '#ef4444'; 
            mPomo.style.boxShadow = '0 4px 0 #b91c1c'; 
        }
    } else { 
        if(pInput) pInput.style.display = 'none'; 
    }
    
    let sTime = parseInt(localStorage.getItem(`${aktifOgrenci}_${aktifDersString}_savedTime`)) || 0;
    
    if(localStorage.getItem(`${aktifOgrenci}_running`) === 'true') {
        startBtn.style.display = 'none'; 
        pauseBtn.style.display = 'block'; 
        
        let statusT = document.getElementById('statusText');
        if(statusT) {
            statusT.innerHTML = "🟢 Odak modu aktif!"; 
            statusT.style.backgroundColor = "#d1fae5"; 
            statusT.style.color = "#059669"; 
        }
        
        if(pInput) pInput.disabled = true;
        
        tInterval = setInterval(() => { 
            let diff = new Date().getTime() - parseInt(localStorage.getItem(`${aktifOgrenci}_startTime`)) + (parseInt(localStorage.getItem(`${aktifOgrenci}_${aktifDersString}_savedTime`)) || 0); 
            
            if (gostergeyiGuncelle(diff) && mode === 'pomodoro') { 
                sesCal(); 
                window.pauseTimer(true); 
                sistemBildirimi("🍅 Pomodoro Bitti!", "Harika odaklandın, şimdi mola vakti."); 
            } 
            
            socket.emit('sure_guncelle', { ogrenciAd: aktifOgrenci, sure: display.innerHTML, kocKodu: kocKodu }); 
        }, 1000);
        
        socket.emit('ogrenci_derse_basladi', { ogrenciAd: aktifOgrenci, ders: aktifDersString, mesaj: 'Derse geri döndü', kocKodu: kocKodu });
        
        // Sayfa yenilense bile öğrenci dersteyse AFK Yoklamasını kur
        rastgeleYoklamaKur();
        
    } else { 
        if (sTime > 0) startBtn.innerHTML = "▶ Devam Et"; 
        gostergeyiGuncelle(sTime); 
    }
});