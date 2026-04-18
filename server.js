const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
app.use(express.json()); // YENİ: Form verilerini okumak için
app.use(express.static(__dirname));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const mongoURI = 'mongodb+srv://alptug:alptug123@cluster0.djt56xg.mongodb.net/EgitimKocuDB?retryWrites=true&w=majority';

mongoose.connect(mongoURI).then(() => console.log('🫀 MongoDB Bağlantısı Başarılı!')).catch(err => console.log('❌ Veritabanı Hatası:', err));

// 🧬 YENİ: Öğrenci şemasına 'sifre' alanı eklendi!
const ogrenciSchema = new mongoose.Schema({ ogrenciAd: String, sifre: String, ders: String, mesaj: String, xp: { type: Number, default: 0 }, gorevler: Array });
const Ogrenci = mongoose.model('Ogrenci', ogrenciSchema);

const chatSchema = new mongoose.Schema({ id: Number, gonderen: String, mesaj: String, rol: String, saat: String });
const Chat = mongoose.model('Chat', chatSchema);

// 🔐 YENİ: ÖĞRENCİ KAYIT OLMA (Şifreler düz metin olarak kaydedilir)
app.post('/api/kayit', async (req, res) => {
    try {
        const { ogrenciAd, sifre } = req.body;
        let varMi = await Ogrenci.findOne({ ogrenciAd });
        if (varMi) return res.json({ basari: false, mesaj: "Bu isimde bir öğrenci zaten var!" });
        
        let yeniOgrenci = new Ogrenci({ ogrenciAd, sifre, xp: 0, gorevler: [] });
        await yeniOgrenci.save();
        res.json({ basari: true, mesaj: "Kayıt başarılı! Giriş yapabilirsiniz." });
    } catch (e) { res.json({ basari: false, mesaj: "Sunucu hatası!" }); }
});

// 🔐 YENİ: ÖĞRENCİ GİRİŞ YAPMA (Süre sınırı yok, token yok)
app.post('/api/giris', async (req, res) => {
    try {
        const { ogrenciAd, sifre } = req.body;
        let ogrenci = await Ogrenci.findOne({ ogrenciAd, sifre });
        if (ogrenci) {
            res.json({ basari: true, mesaj: "Giriş başarılı!" });
        } else {
            res.json({ basari: false, mesaj: "İsim veya şifre hatalı!" });
        }
    } catch (e) { res.json({ basari: false, mesaj: "Sunucu hatası!" }); }
});

// 🔐 YENİ: ÖĞRETMEN İÇİN ŞİFRE LİSTESİ (Sadece tüm öğrencileri ve şifrelerini döndürür)
app.get('/api/sifreler', async (req, res) => {
    try {
        let ogrenciler = await Ogrenci.find({}, 'ogrenciAd sifre -_id');
        res.json(ogrenciler);
    } catch (e) { res.json([]); }
});

io.on('connection', async (socket) => {
    console.log('🟢 Bir ekran bağlandı! ID:', socket.id);

    try {
        const eskiVeriler = await Ogrenci.find();
        socket.emit('eski_verileri_yukle', eskiVeriler);
        socket.emit('gorev_guncellendi', eskiVeriler);
        const eskiChat = await Chat.find().sort({_id: -1}).limit(50);
        socket.emit('eski_chat_yukle', eskiChat.reverse());
    } catch (hata) {}

    socket.on('ogrenci_derse_basladi', async (mesaj) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: mesaj.ogrenciAd });
            if (ogrenci) { ogrenci.ders = mesaj.ders; ogrenci.mesaj = mesaj.mesaj; await ogrenci.save(); } 
            io.emit('ogretmene_canli_bildirim', ogrenci);
        } catch(e) {}
    });

    socket.on('yeni_gorev_ekle', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd });
            if (ogrenci) {
                ogrenci.gorevler.push({ id: Date.now(), metin: veri.gorevMetni, tamamlandi: false });
                ogrenci.markModified('gorevler'); await ogrenci.save();
                io.emit('gorev_guncellendi', await Ogrenci.find()); 
            }
        } catch(e){}
    });

    socket.on('gorev_tamamlandi', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd });
            if (ogrenci && ogrenci.gorevler) {
                let gIndex = ogrenci.gorevler.findIndex(g => Number(g.id) === Number(veri.gorevId));
                if (gIndex !== -1 && ogrenci.gorevler[gIndex].tamamlandi === false) {
                    ogrenci.gorevler[gIndex].tamamlandi = true; ogrenci.xp = Number(ogrenci.xp || 0) + 10;
                    ogrenci.markModified('gorevler'); await ogrenci.save();
                    io.emit('gorev_guncellendi', await Ogrenci.find()); 
                }
            }
        } catch(e){}
    });

    socket.on('chat_mesaji_gonder', async (data) => {
        try {
            const yeniMesaj = new Chat({ id: Date.now(), gonderen: data.gonderen, mesaj: data.mesaj, rol: data.rol, saat: new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}) });
            await yeniMesaj.save(); io.emit('yeni_chat_mesaji', yeniMesaj); 
        } catch(e){}
    });

    socket.on('sure_guncelle', (veri) => { io.emit('ogretmene_sure_guncelle', veri); });

    socket.on('yapay_zeka_analiz_istegi', async (ogrenciAd) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: ogrenciAd });
            if (!ogrenci) return;
            let biten = ogrenci.gorevler.filter(g => g.tamamlandi).length, bekleyen = ogrenci.gorevler.length - biten, xp = ogrenci.xp || 0, ders = ogrenci.ders || 'Belirsiz';
            let rapor = (xp >= 30 && bekleyen === 0) ? `🚀 ${ogrenciAd} fırtına gibi! ${xp} XP topladı. Yeni zorlu görevler ver.` : (bekleyen > 2 && biten === 0) ? `⚠️ Dikkat! ${bekleyen} görev birikti. ${ders} branşında zorlanıyor olabilir, destek ver.` : (xp > 0) ? `👍 İstikrarlı gidiyor. ${xp} XP'si var. Motivasyonunu koru.` : `⏳ Henüz ısınmadı, kolay bir görev ver.`;
            io.emit('yapay_zeka_raporu', { ad: ogrenciAd, rapor: rapor });
        } catch(e) {}
    });

    // 🤖 YENİ: ÖĞRENCİ İÇİN GELİŞMİŞ YAPAY ZEKA VE SİSTEM REHBERİ
    socket.on('ogrenci_chatbot_mesaji', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd });
            let xp = ogrenci ? ogrenci.xp || 0 : 0;
            let msg = veri.mesaj.toLowerCase();
            let cevap = "";

            // 1. SİSTEM VE KULLANIM REHBERİ (Yeni Eklenenler)
            if (msg.includes('xp') || msg.includes('puan')) {
                cevap = `Sistemde XP (Deneyim Puanı) kazanmak çok kolay! Öğretmeninin gönderdiği hedefleri "Bitir" butonuna basarak tamamladığında görev başına +10 XP kazanırsın. Şu anki puanın: ${xp} XP. 🌟`;
            } else if (msg.includes('görev') || msg.includes('nasıl bitir') || msg.includes('nasıl yap')) {
                cevap = `Öğretmeninin sana atadığı hedefler, ekranın alt kısmındaki 'Hedef Görevler' panosuna düşer. Görevi bitirdiğinde yanındaki "Bitir" butonuna basarsan hem öğretmeninin ekranında yeşil tik yanar hem de XP kazanırsın! 🎯`;
            } else if (msg.includes('pomodoro') || msg.includes('süre') || msg.includes('kronometre')) {
                cevap = `Çalışma modları ikiye ayrılır: 'Kronometre' sen durdurana kadar artar. 'Pomodoro' ise 25 dakikalık geri sayım başlatır ve süre bitince otomatik mola verir. Tamamen senin odaklanma tarzına kalmış! ⏱️`;
            } else if (msg.includes('sıralama') || msg.includes('liderlik') || msg.includes('şampiyon')) {
                cevap = `Haftanın Şampiyonları tablosu öğretmeninin dev ekranında (Kaptan Köşkünde) yer alıyor! En çok görev bitirip en yüksek XP'yi toplayanlar o panoya adını altın harflerle yazdırır. Asılmaya devam! 🏆`;
            } else if (msg.includes('sistem nasıl') || msg.includes('ne yapmalıyım')) {
                cevap = `Dijital sınıfına hoş geldin! Önce çalışacağın dersi seç, sonra 'Başla' butonuna basarak odanı aktif et. Öğretmeninin verdiği görevleri tamamla ve XP'leri topla. Takıldığında sohbetten sınıf arkadaşlarına veya bana yazabilirsin! 🚀`;
            }
            // 2. MOTİVASYON VE PSİKOLOJİK DESTEK (Eski yetenekler)
            else if (msg.includes('yorul') || msg.includes('sıkıl') || msg.includes('bıkt')) {
                cevap = `Şu an "${veri.ders}" çalışıyorsun ve yorulman çok normal! Unutma, kazandığın o ${xp} XP senin ne kadar çabaladığının kanıtı. Gözlerini kapatıp 5 dakika derin nefes almaya ne dersin? 💧`;
            } else if (msg.includes('tavsiye') || msg.includes('taktik') || msg.includes('nasıl çalış')) {
                cevap = `"${veri.ders}" için sana altın bir taktik: Yapamadığın sorular aslında senin asıl öğretmenlerindir. Şu an ${xp} XP'desin, harika bir temel kuruyorsun, asla pes etme! 🎯`;
            } else if (msg.includes('kork') || msg.includes('yapam')) {
                cevap = `Sınav stresi bazen her şeyi unutmuşsun gibi hissettirir. Ama sistemimizde ${xp} XP topladın, bu tesadüf değil senin başarın! Derin bir nefes al ve sadece bir sonraki soruya odaklan. 💪`;
            } else {
                cevap = `Merhaba! Ben senin dijital rehberinim. Şu ana kadar ${xp} XP kazandın. Bana sistemi nasıl kullanacağını sorabilir, yorulduğunda moral veya takıldığında taktik isteyebilirsin! 😊`;
            }
            
            socket.emit('chatbot_cevabi', cevap);
        } catch(e) {}
    });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`🚀 Sistem Çalışıyor! Port: ${PORT}`); });