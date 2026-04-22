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

const ogretmenSchema = new mongoose.Schema({ kocAd: String, sifre: String, kocKodu: String });
const Ogretmen = mongoose.model('Ogretmen', ogretmenSchema);

// 📈 Öğrenci şemasına netler ve alinanOduller eklendi
const ogrenciSchema = new mongoose.Schema({ ogrenciAd: String, sifre: String, kocKodu: String, ders: String, mesaj: String, xp: { type: Number, default: 0 }, avatar: { type: String, default: '👤' }, gorevler: Array, istatistik: { type: Object, default: {} }, netler: Array, alinanOduller: Array });
const Ogrenci = mongoose.model('Ogrenci', ogrenciSchema);

const chatSchema = new mongoose.Schema({ id: Number, gonderen: String, mesaj: String, rol: String, saat: String, tip: { type: String, default: 'metin' }, kocKodu: String });
const Chat = mongoose.model('Chat', chatSchema);

// --- SÜPER ADMIN API ---
app.post('/api/admin', async (req, res) => {
    const { sifre } = req.body;
    if(sifre === 'sincap-boss-2026') {
        let kocSayisi = await Ogretmen.countDocuments();
        let ogrSayisi = await Ogrenci.countDocuments();
        res.json({ basari: true, data: { koc: kocSayisi, ogr: ogrSayisi } });
    } else { res.json({ basari: false }); }
});

app.post('/api/koc/kayit', async (req, res) => {
    try {
        const { kocAd, sifre } = req.body;
        let varMi = await Ogretmen.findOne({ kocAd });
        if (varMi) return res.json({ basari: false, mesaj: "Bu isimde bir öğretmen zaten var!" });
        let yeniKod = Math.random().toString(36).substr(2, 6).toUpperCase();
        let yeniKoc = new Ogretmen({ kocAd, sifre, kocKodu: yeniKod });
        await yeniKoc.save();
        res.json({ basari: true, mesaj: `Kayıt Başarılı! Davet Kodunuz: ${yeniKod}`, kocKodu: yeniKod });
    } catch (e) { res.json({ basari: false, mesaj: "Sunucu hatası!" }); }
});

app.post('/api/koc/giris', async (req, res) => {
    try {
        const { kocAd, sifre } = req.body;
        let koc = await Ogretmen.findOne({ kocAd, sifre });
        if (koc) res.json({ basari: true, mesaj: "Giriş başarılı!", kocKodu: koc.kocKodu });
        else res.json({ basari: false, mesaj: "İsim veya şifre hatalı!" });
    } catch (e) { res.json({ basari: false, mesaj: "Sunucu hatası!" }); }
});

app.post('/api/kayit', async (req, res) => {
    try {
        const { ogrenciAd, sifre, kocKodu } = req.body;
        let kocVarMi = await Ogretmen.findOne({ kocKodu });
        if(!kocVarMi) return res.json({ basari: false, mesaj: "Böyle bir Davet Kodu bulunamadı!" });
        let varMi = await Ogrenci.findOne({ ogrenciAd, kocKodu });
        if (varMi) return res.json({ basari: false, mesaj: "Bu isimde bir öğrenci sınıfınızda zaten var!" });
        let yeniOgrenci = new Ogrenci({ ogrenciAd, sifre, kocKodu, xp: 0, avatar: '👤', gorevler: [], istatistik: {}, netler: [], alinanOduller: [] });
        await yeniOgrenci.save();
        res.json({ basari: true, mesaj: "Kayıt başarılı! Giriş yapabilirsiniz." });
    } catch (e) { res.json({ basari: false, mesaj: "Sunucu hatası!" }); }
});

app.post('/api/giris', async (req, res) => {
    try {
        const { ogrenciAd, sifre } = req.body;
        let ogrenci = await Ogrenci.findOne({ ogrenciAd, sifre });
        if (ogrenci) res.json({ basari: true, mesaj: "Giriş başarılı!", kocKodu: ogrenci.kocKodu });
        else res.json({ basari: false, mesaj: "İsim veya şifre hatalı!" });
    } catch (e) { res.json({ basari: false, mesaj: "Sunucu hatası!" }); }
});

app.post('/api/sifreler', async (req, res) => {
    try { let ogrenciler = await Ogrenci.find({ kocKodu: req.body.kocKodu }, 'ogrenciAd sifre -_id'); res.json(ogrenciler); } 
    catch (e) { res.json([]); }
});

io.on('connection', (socket) => {
    socket.on('join_room', async (kocKodu) => {
        socket.join(kocKodu);
        try {
            const ogrenciler = await Ogrenci.find({ kocKodu });
            socket.emit('eski_verileri_yukle', ogrenciler);
            socket.emit('gorev_guncellendi', ogrenciler);
            const eskiChat = await Chat.find({ kocKodu }).sort({_id: -1}).limit(50);
            socket.emit('eski_chat_yukle', eskiChat.reverse());
        } catch (hata) {}
    });

    socket.on('ogrenci_derse_basladi', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu });
            if (ogrenci) { ogrenci.ders = veri.ders; ogrenci.mesaj = veri.mesaj; await ogrenci.save(); } 
            io.to(veri.kocKodu).emit('ogretmene_canli_bildirim', ogrenci);
        } catch(e) {}
    });

    socket.on('avatar_guncelle', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu });
            if(ogrenci) { ogrenci.avatar = veri.avatar; await ogrenci.save(); io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); }
        } catch(e) {}
    });

    // 📈 Net Ekleme Zekası
    socket.on('net_ekle', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu });
            if(ogrenci) {
                ogrenci.netler.push({ id: Date.now(), tur: veri.sinavTuru, net: veri.netSkoru, tarih: new Date().toLocaleDateString('tr-TR') });
                ogrenci.markModified('netler'); await ogrenci.save();
                io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu}));
            }
        } catch(e){}
    });

    // 🛒 XP Harcama (Market) Zekası
    socket.on('odul_satin_al', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu });
            if(ogrenci && ogrenci.xp >= veri.bedel) {
                ogrenci.xp -= veri.bedel;
                ogrenci.alinanOduller.push({ odul: veri.odul, tarih: new Date().toLocaleDateString('tr-TR') });
                ogrenci.markModified('alinanOduller'); await ogrenci.save();
                io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu}));
                io.to(veri.kocKodu).emit('ogretmene_market_bildirimi', { ogrenci: veri.ogrenciAd, odul: veri.odul }); // Hoca ekranına uyarı at
            }
        } catch(e){}
    });

    socket.on('istatistik_guncelle', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu });
            if(ogrenci) {
                let stats = ogrenci.istatistik || {}; stats[veri.ders] = veri.ms; ogrenci.istatistik = stats;
                ogrenci.markModified('istatistik'); await ogrenci.save();
                io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu}));
            }
        } catch(e){}
    });

    socket.on('yeni_gorev_ekle', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu });
            if (ogrenci) {
                ogrenci.gorevler.push({ id: Date.now(), metin: veri.gorevMetni, tamamlandi: false });
                ogrenci.markModified('gorevler'); await ogrenci.save();
                io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); 
            }
        } catch(e){}
    });

    socket.on('gorev_tamamlandi', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu });
            if (ogrenci && ogrenci.gorevler) {
                let gIndex = ogrenci.gorevler.findIndex(g => Number(g.id) === Number(veri.gorevId));
                if (gIndex !== -1 && ogrenci.gorevler[gIndex].tamamlandi === false) {
                    ogrenci.gorevler[gIndex].tamamlandi = true; ogrenci.xp = Number(ogrenci.xp || 0) + 10;
                    ogrenci.markModified('gorevler'); await ogrenci.save();
                    io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); 
                }
            }
        } catch(e){}
    });

    socket.on('chat_mesaji_gonder', async (data) => {
        try {
            const yeniMesaj = new Chat({ id: Date.now(), gonderen: data.gonderen, mesaj: data.mesaj, rol: data.rol, saat: new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}), tip: data.tip || 'metin', kocKodu: data.kocKodu });
            await yeniMesaj.save(); io.to(data.kocKodu).emit('yeni_chat_mesaji', yeniMesaj); 
        } catch(e){}
    });

    socket.on('sure_guncelle', (veri) => { io.to(veri.kocKodu).emit('ogretmene_sure_guncelle', veri); });

    socket.on('yapay_zeka_analiz_istegi', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu });
            if (!ogrenci) return;
            let biten = ogrenci.gorevler.filter(g => g.tamamlandi).length, bekleyen = ogrenci.gorevler.length - biten, xp = ogrenci.xp || 0, ders = ogrenci.ders || 'Belirsiz';
            let rapor = (xp >= 300) ? `👑 Mükemmel! ${veri.ogrenciAd} bir Efsane.` : (xp >= 150) ? `🔥 Harika odaklanıyor! ${xp} XP ile Odak Ustası.` : (xp >= 30 && bekleyen === 0) ? `🚀 ${veri.ogrenciAd} fırtına gibi! Yeni zorlu görevler ver.` : (bekleyen > 2 && biten === 0) ? `⚠️ Dikkat! ${bekleyen} görev birikti.` : (xp > 0) ? `👍 İstikrarlı gidiyor.` : `⏳ Henüz ısınmadı, kolay görev ver.`;
            io.to(veri.kocKodu).emit('yapay_zeka_raporu', { ad: veri.ogrenciAd, rapor: rapor });
        } catch(e) {}
    });

    socket.on('ogrenci_chatbot_mesaji', async (veri) => {
        try {
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu });
            let xp = ogrenci ? ogrenci.xp || 0 : 0;
            let rütbe = xp >= 300 ? 'Efsane' : xp >= 150 ? 'Odak Ustası' : xp >= 50 ? 'Çalışkan' : 'Çaylak';
            let msg = veri.mesaj.toLowerCase(); let cevap = "";

            if (msg.includes('xp') || msg.includes('market')) { cevap = `XP'lerini Market'te harcayarak Koçundan sürpriz ödüller alabilirsin! Şuan ${xp} XP'n var! 🌟`; } 
            else if (msg.includes('görev') || msg.includes('bitir')) { cevap = `Görevleri bitirip +10 XP kazan! 🎯`; } 
            else { cevap = `Merhaba ${rütbe}! Yorulduğunda moral isteyebilirsin! 😊`; }
            socket.emit('chatbot_cevabi', cevap); 
        } catch(e) {}
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`🚀 SincApp V2 SaaS Çalışıyor! Port: ${PORT}`); });