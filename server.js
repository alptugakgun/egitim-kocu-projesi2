const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e8 }); 

const mongoURI = 'mongodb+srv://alptug:alptug123@cluster0.djt56xg.mongodb.net/EgitimKocuDB?retryWrites=true&w=majority';

mongoose.connect(mongoURI).then(() => console.log('🫀 MongoDB Bağlantısı Başarılı!')).catch(err => console.log('❌ Veritabanı Hatası:', err));

// 🦸‍♂️ Avatar şemaya eklendi
const ogrenciSchema = new mongoose.Schema({ ogrenciAd: String, sifre: String, ders: String, mesaj: String, xp: { type: Number, default: 0 }, avatar: { type: String, default: '👤' }, gorevler: Array, istatistik: { type: Object, default: {} } });
const Ogrenci = mongoose.model('Ogrenci', ogrenciSchema);

const chatSchema = new mongoose.Schema({ id: Number, gonderen: String, mesaj: String, rol: String, saat: String, tip: { type: String, default: 'metin' } });
const Chat = mongoose.model('Chat', chatSchema);

app.post('/api/kayit', async (req, res) => {
    try {
        const { ogrenciAd, sifre } = req.body;
        let varMi = await Ogrenci.findOne({ ogrenciAd });
        if (varMi) return res.json({ basari: false, mesaj: "Bu isimde bir öğrenci zaten var!" });
        
        let yeniOgrenci = new Ogrenci({ ogrenciAd, sifre, xp: 0, avatar: '👤', gorevler: [], istatistik: {} });
        await yeniOgrenci.save();
        res.json({ basari: true, mesaj: "Kayıt başarılı! Giriş yapabilirsiniz." });
    } catch (e) { res.json({ basari: false, mesaj: "Sunucu hatası!" }); }
});

app.post('/api/giris', async (req, res) => {
    try {
        const { ogrenciAd, sifre } = req.body;
        let ogrenci = await Ogrenci.findOne({ ogrenciAd, sifre });
        if (ogrenci) { res.json({ basari: true, mesaj: "Giriş başarılı!" }); } 
        else { res.json({ basari: false, mesaj: "İsim veya şifre hatalı!" }); }
    } catch (e) { res.json({ basari: false, mesaj: "Sunucu hatası!" }); }
});

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

    // 🥷 Yeni Avatar Kaydetme
    socket.on('avatar_guncelle', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd });
            if(ogrenci) { ogrenci.avatar = veri.avatar; await ogrenci.save(); io.emit('gorev_guncellendi', await Ogrenci.find()); }
        } catch(e) {}
    });

    socket.on('istatistik_guncelle', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd });
            if(ogrenci) {
                let stats = ogrenci.istatistik || {};
                stats[veri.ders] = veri.ms;
                ogrenci.istatistik = stats;
                ogrenci.markModified('istatistik');
                await ogrenci.save();
                io.emit('gorev_guncellendi', await Ogrenci.find());
            }
        } catch(e){}
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
            const yeniMesaj = new Chat({ id: Date.now(), gonderen: data.gonderen, mesaj: data.mesaj, rol: data.rol, saat: new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}), tip: data.tip || 'metin' });
            await yeniMesaj.save(); io.emit('yeni_chat_mesaji', yeniMesaj); 
        } catch(e){}
    });

    socket.on('sure_guncelle', (veri) => { io.emit('ogretmene_sure_guncelle', veri); });

    socket.on('yapay_zeka_analiz_istegi', async (ogrenciAd) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: ogrenciAd });
            if (!ogrenci) return;
            let biten = ogrenci.gorevler.filter(g => g.tamamlandi).length, bekleyen = ogrenci.gorevler.length - biten, xp = ogrenci.xp || 0, ders = ogrenci.ders || 'Belirsiz';
            let rapor = (xp >= 300) ? `👑 Mükemmel! ${ogrenciAd} bir Efsane. Bırak o seni yönlendirsin.` : (xp >= 150) ? `🔥 Harika odaklanıyor! ${xp} XP ile Odak Ustası.` : (xp >= 30 && bekleyen === 0) ? `🚀 ${ogrenciAd} fırtına gibi! Yeni zorlu görevler ver.` : (bekleyen > 2 && biten === 0) ? `⚠️ Dikkat! ${bekleyen} görev birikti. Destek ver.` : (xp > 0) ? `👍 İstikrarlı gidiyor. Motivasyonunu koru.` : `⏳ Henüz ısınmadı, kolay bir görev ver.`;
            io.emit('yapay_zeka_raporu', { ad: ogrenciAd, rapor: rapor });
        } catch(e) {}
    });

    socket.on('ogrenci_chatbot_mesaji', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd });
            let xp = ogrenci ? ogrenci.xp || 0 : 0;
            let rütbe = xp >= 300 ? 'Efsane' : xp >= 150 ? 'Odak Ustası' : xp >= 50 ? 'Çalışkan' : 'Çaylak';
            let msg = veri.mesaj.toLowerCase();
            let cevap = "";

            if (msg.includes('xp') || msg.includes('puan') || msg.includes('rütbe')) { cevap = `Sistemde görev bitirerek XP kazanırsın! Şu anki puanın: ${xp} XP ve rütben: ${rütbe}! 🌟`; } 
            else if (msg.includes('görev') || msg.includes('nasıl bitir') || msg.includes('nasıl yap')) { cevap = `Öğretmeninin atadığı hedefler 'Hedef Görevler' panosuna düşer. Görevi bitir ve +10 XP kazan! 🎯`; } 
            else if (msg.includes('pomodoro') || msg.includes('süre') || msg.includes('kronometre')) { cevap = `Çalışma modları ikiye ayrılır: 'Kronometre' artar, 'Pomodoro' ise seçtiğin dakikalık geri sayım başlatır. ⏱️`; } 
            else if (msg.includes('sıralama') || msg.includes('şampiyon')) { cevap = `Haftanın Şampiyonları öğretmenin Kaptan Köşkünde yer alıyor! 🏆`; } 
            else { cevap = `Merhaba ${rütbe}! Ben senin dijital rehberinim. Yorulduğunda moral veya takıldığında taktik isteyebilirsin! 😊`; }
            
            socket.emit('chatbot_cevabi', cevap);
        } catch(e) {}
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`🚀 Sistem Çalışıyor! Port: ${PORT}`); });