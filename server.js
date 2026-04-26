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

// 💵 YENİ: finans (aylık) ve bekleyenOduller eklendi
const ogrenciSchema = new mongoose.Schema({ ogrenciAd: String, sifre: String, kocKodu: String, veliKodu: String, ders: String, mesaj: String, xp: { type: Number, default: 0 }, avatar: { type: String, default: '👤' }, gorevler: Array, istatistik: { type: Object, default: {} }, netler: Array, alinanOduller: Array, bekleyenOduller: { type: Array, default: [] }, aktifDuello: { type: Object, default: null }, finans: { type: Object, default: {} }, sonrakiDers: { type: String, default: '' }, canliDersLink: { type: String, default: '' }, isiHaritasi: { type: Object, default: {} }, hataDefteri: { type: Array, default: [] } });
const Ogrenci = mongoose.model('Ogrenci', ogrenciSchema);

const chatSchema = new mongoose.Schema({ id: Number, gonderen: String, mesaj: String, rol: String, saat: String, tip: { type: String, default: 'metin' }, kocKodu: String });
const Chat = mongoose.model('Chat', chatSchema);
const kaynakSchema = new mongoose.Schema({ id: Number, kocKodu: String, baslik: String, url: String, tarih: String });
const Kaynak = mongoose.model('Kaynak', kaynakSchema);

app.post('/api/admin', async (req, res) => { const { sifre } = req.body; if(sifre === 'sincap-boss-2026') { let koclar = await Ogretmen.find(); let ogrler = await Ogrenci.find(); let detayliListe = koclar.map(k => { let ogrenciSayisi = ogrler.filter(o => o.kocKodu === k.kocKodu).length; return { isim: k.kocAd, kod: k.kocKodu, sifre: k.sifre, ogrenciSayisi: ogrenciSayisi }; }); res.json({ basari: true, data: { koc: koclar.length, ogr: ogrler.length, liste: detayliListe } }); } else { res.json({ basari: false }); } });
app.post('/api/admin/sil', async (req, res) => { const { sifre, kod } = req.body; if(sifre === 'sincap-boss-2026') { await Ogretmen.deleteOne({ kocKodu: kod }); await Ogrenci.deleteMany({ kocKodu: kod }); await Chat.deleteMany({ kocKodu: kod }); await Kaynak.deleteMany({ kocKodu: kod }); res.json({ basari: true }); } else { res.json({ basari: false }); } });
app.post('/api/admin/sil_ogrenci', async (req, res) => { const { sifre, ogrenciId } = req.body; if(sifre === 'sincap-boss-2026') { await Ogrenci.findByIdAndDelete(ogrenciId); res.json({ basari: true }); } else { res.json({ basari: false }); } });

app.post('/api/koc/kayit', async (req, res) => { try { const { kocAd, sifre } = req.body; let varMi = await Ogretmen.findOne({ kocAd }); if (varMi) return res.json({ basari: false, mesaj: "Bu öğretmen zaten var!" }); let yeniKod = Math.random().toString(36).substr(2, 6).toUpperCase(); let yeniKoc = new Ogretmen({ kocAd, sifre, kocKodu: yeniKod }); await yeniKoc.save(); res.json({ basari: true, mesaj: `Davet Kodunuz: ${yeniKod}`, kocKodu: yeniKod }); } catch (e) { res.json({ basari: false }); } });
app.post('/api/koc/giris', async (req, res) => { try { const { kocAd, sifre } = req.body; let koc = await Ogretmen.findOne({ kocAd, sifre }); if (koc) res.json({ basari: true, kocKodu: koc.kocKodu }); else res.json({ basari: false, mesaj: "Hatalı giriş!" }); } catch (e) { res.json({ basari: false }); } });
app.post('/api/kayit', async (req, res) => { try { const { ogrenciAd, sifre, kocKodu } = req.body; let kocVarMi = await Ogretmen.findOne({ kocKodu }); if(!kocVarMi) return res.json({ basari: false, mesaj: "Davet Kodu bulunamadı!" }); let varMi = await Ogrenci.findOne({ ogrenciAd, kocKodu }); if (varMi) return res.json({ basari: false, mesaj: "Öğrenci zaten var!" }); let vKodu = 'V-' + Math.floor(1000 + Math.random() * 9000); let yeniOgrenci = new Ogrenci({ ogrenciAd, sifre, kocKodu, veliKodu: vKodu, xp: 0, avatar: '👤', gorevler: [], istatistik: {}, netler: [], alinanOduller: [], bekleyenOduller: [], aktifDuello: null, finans: {}, sonrakiDers: '', canliDersLink: '', isiHaritasi: {}, hataDefteri: [] }); await yeniOgrenci.save(); res.json({ basari: true, mesaj: "Kayıt başarılı!" }); } catch (e) { res.json({ basari: false }); } });
app.post('/api/giris', async (req, res) => { try { const { ogrenciAd, sifre } = req.body; let ogrenci = await Ogrenci.findOne({ ogrenciAd, sifre }); if (ogrenci) res.json({ basari: true, kocKodu: ogrenci.kocKodu, veliKodu: ogrenci.veliKodu }); else res.json({ basari: false, mesaj: "Hatalı!" }); } catch (e) { res.json({ basari: false }); } });
app.post('/api/veli/giris', async (req, res) => { try { let ogrenci = await Ogrenci.findOne({ veliKodu: req.body.veliKodu }); if(ogrenci) res.json({ basari: true, ogrenciAd: ogrenci.ogrenciAd, kocKodu: ogrenci.kocKodu }); else res.json({ basari: false, mesaj: "Geçersiz Veli Kodu!" }); } catch(e) { res.json({ basari: false }); } });
app.post('/api/sifreler', async (req, res) => { try { let ogrenciler = await Ogrenci.find({ kocKodu: req.body.kocKodu }, 'ogrenciAd sifre veliKodu -_id'); res.json(ogrenciler); } catch (e) { res.json([]); } });

io.on('connection', (socket) => {
    socket.on('join_room', async (kocKodu) => { socket.join(kocKodu); try { const ogrenciler = await Ogrenci.find({ kocKodu }); socket.emit('eski_verileri_yukle', ogrenciler); socket.emit('gorev_guncellendi', ogrenciler); const eskiChat = await Chat.find({ kocKodu }).sort({_id: -1}).limit(50); socket.emit('eski_chat_yukle', eskiChat.reverse()); const eskiKaynaklar = await Kaynak.find({ kocKodu }).sort({id: -1}); socket.emit('kaynaklari_yukle', eskiKaynaklar); } catch (hata) {} });
    
    // 💵 Aylık Finans ve Zoom Kaydı
    socket.on('ajanda_kaydet', async (veri) => { 
        try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
        if(ogrenci) { 
            ogrenci.sonrakiDers = veri.sonrakiDers; 
            ogrenci.canliDersLink = veri.canliDersLink; 
            ogrenci.finans = veri.finans; // Aylık tablo verisi
            ogrenci.markModified('finans');
            await ogrenci.save(); 
            io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); 
        } } catch(e){} 
    });
    
    // 🎁 Ödül Satın Alma ve Teslimat
    socket.on('odul_satin_al', async (veri) => { 
        try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
        if(ogrenci && ogrenci.xp >= veri.bedel) { 
            ogrenci.xp -= veri.bedel; 
            let odulData = { id: Date.now(), odul: veri.odul, tarih: new Date().toLocaleDateString('tr-TR') };
            ogrenci.alinanOduller.push(odulData); 
            ogrenci.bekleyenOduller.push(odulData); // Teslimat listesine düşer
            ogrenci.markModified('alinanOduller'); ogrenci.markModified('bekleyenOduller');
            await ogrenci.save(); 
            io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); 
            io.to(veri.kocKodu).emit('ogretmene_market_bildirimi', { ogrenci: veri.ogrenciAd, odul: veri.odul }); 
        } } catch(e){} 
    });

    socket.on('odul_teslim_edildi', async (veri) => {
        try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
        if(ogrenci) {
            ogrenci.bekleyenOduller = ogrenci.bekleyenOduller.filter(o => o.id !== veri.odulId);
            ogrenci.markModified('bekleyenOduller'); await ogrenci.save();
            io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); 
        } } catch(e){}
    });

    socket.on('hata_sorusu_ekle', async (veri) => { try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); if(ogrenci) { let yeniSoru = { id: Date.now(), resim: veri.resim, dersKonu: veri.dersKonu, durum: 'Bekliyor', tarih: new Date().toLocaleDateString('tr-TR') }; ogrenci.hataDefteri.push(yeniSoru); ogrenci.markModified('hataDefteri'); await ogrenci.save(); io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); io.to(veri.kocKodu).emit('ogretmene_market_bildirimi', { ogrenci: veri.ogrenciAd, odul: "Hata Defterine Yeni Soru Yükledi" }); } } catch(e){} });
    socket.on('hata_sorusu_cozuldu', async (veri) => { try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); if(ogrenci && ogrenci.hataDefteri) { let idx = ogrenci.hataDefteri.findIndex(h => h.id === veri.soruId); if(idx !== -1) { ogrenci.hataDefteri[idx].durum = 'Çözüldü'; ogrenci.markModified('hataDefteri'); await ogrenci.save(); io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); } } } catch(e){} });
    socket.on('isi_haritasi_guncelle', async (veri) => { try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); if(ogrenci) { let harita = ogrenci.isiHaritasi || {}; harita[veri.konu] = veri.durum; ogrenci.isiHaritasi = harita; ogrenci.markModified('isiHaritasi'); await ogrenci.save(); io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); } } catch(e){} });
    socket.on('duello_teklif_et', (veri) => { io.to(veri.kocKodu).emit('duello_istegi_geldi', veri); });
    socket.on('duello_kabul_edildi', async (veri) => { try { let o1 = await Ogrenci.findOne({ ogrenciAd: veri.gonderen, kocKodu: veri.kocKodu }); let o2 = await Ogrenci.findOne({ ogrenciAd: veri.hedef, kocKodu: veri.kocKodu }); if(o1 && o2) { let dData = { rakip: veri.hedef, miktar: veri.miktar }; let dData2 = { rakip: veri.gonderen, miktar: veri.miktar }; o1.aktifDuello = dData; o2.aktifDuello = dData2; await o1.save(); await o2.save(); io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); io.to(veri.kocKodu).emit('duello_basladi', { o1: veri.gonderen, o2: veri.hedef }); } } catch(e){} });
    socket.on('yeni_kaynak_ekle', async (veri) => { try { const yeniKaynak = new Kaynak({ id: Date.now(), kocKodu: veri.kocKodu, baslik: veri.baslik, url: veri.url, tarih: new Date().toLocaleDateString('tr-TR') }); await yeniKaynak.save(); io.to(veri.kocKodu).emit('yeni_kaynak_eklendi', yeniKaynak); } catch(e) {} });
    socket.on('kaynak_sil', async (veri) => { try { await Kaynak.deleteOne({ id: veri.id, kocKodu: veri.kocKodu }); const guncelKaynaklar = await Kaynak.find({ kocKodu: veri.kocKodu }).sort({id: -1}); io.to(veri.kocKodu).emit('kaynaklari_yukle', guncelKaynaklar); } catch(e){} });
    socket.on('ogrenci_derse_basladi', async (veri) => { try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); if (ogrenci) { ogrenci.ders = veri.ders; ogrenci.mesaj = veri.mesaj; await ogrenci.save(); } io.to(veri.kocKodu).emit('ogretmene_canli_bildirim', ogrenci); } catch(e) {} });
    socket.on('avatar_guncelle', async (veri) => { try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); if(ogrenci) { ogrenci.avatar = veri.avatar; await ogrenci.save(); io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); } } catch(e) {} });
    socket.on('net_ekle', async (veri) => { try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); if(ogrenci) { ogrenci.netler.push({ id: Date.now(), tur: veri.sinavTuru, net: veri.netSkoru, tarih: new Date().toLocaleDateString('tr-TR') }); ogrenci.markModified('netler'); await ogrenci.save(); io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); } } catch(e){} });
    socket.on('istatistik_guncelle', async (veri) => { try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); if(ogrenci) { let stats = ogrenci.istatistik || {}; stats[veri.ders] = veri.ms; ogrenci.istatistik = stats; ogrenci.markModified('istatistik'); await ogrenci.save(); io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); } } catch(e){} });
    socket.on('yeni_gorev_ekle', async (veri) => { try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); if (ogrenci) { ogrenci.gorevler.push({ id: Date.now(), metin: veri.gorevMetni, tamamlandi: false }); ogrenci.markModified('gorevler'); await ogrenci.save(); io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); } } catch(e){} });
    socket.on('gorev_tamamlandi', async (veri) => { try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); if (ogrenci && ogrenci.gorevler) { let gIndex = ogrenci.gorevler.findIndex(g => Number(g.id) === Number(veri.gorevId)); if (gIndex !== -1 && ogrenci.gorevler[gIndex].tamamlandi === false) { ogrenci.gorevler[gIndex].tamamlandi = true; ogrenci.xp = Number(ogrenci.xp || 0) + 10; if(ogrenci.aktifDuello && ogrenci.aktifDuello.rakip) { let rakipOgrenci = await Ogrenci.findOne({ ogrenciAd: ogrenci.aktifDuello.rakip, kocKodu: veri.kocKodu }); if(rakipOgrenci) { let kazanilanXP = ogrenci.aktifDuello.miktar; ogrenci.xp += kazanilanXP; rakipOgrenci.xp -= kazanilanXP; if(rakipOgrenci.xp < 0) rakipOgrenci.xp = 0; rakipOgrenci.aktifDuello = null; await rakipOgrenci.save(); io.to(veri.kocKodu).emit('duello_sonucu', { kazanan: ogrenci.ogrenciAd, kaybeden: rakipOgrenci.ogrenciAd, miktar: kazanilanXP }); } ogrenci.aktifDuello = null; } ogrenci.markModified('gorevler'); await ogrenci.save(); io.to(veri.kocKodu).emit('gorev_guncellendi', await Ogrenci.find({kocKodu: veri.kocKodu})); } } } catch(e){} });
    socket.on('chat_mesaji_gonder', async (data) => { try { const yeniMesaj = new Chat({ id: Date.now(), gonderen: data.gonderen, mesaj: data.mesaj, rol: data.rol, saat: new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}), tip: data.tip || 'metin', kocKodu: data.kocKodu }); await yeniMesaj.save(); io.to(data.kocKodu).emit('yeni_chat_mesaji', yeniMesaj); } catch(e){} });
    socket.on('sure_guncelle', (veri) => { io.to(veri.kocKodu).emit('ogretmene_sure_guncelle', veri); });
    
    // 🧠 YENİ: Gerçek API İçin Hazırlanmış AI İskeleti
    socket.on('yapay_zeka_analiz_istegi', async (veri) => { 
        try { 
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); if (!ogrenci) return; 
            
            // İLERİDE BURAYA: fetch('https://api.openai.com/v1/chat/completions', { headers: { 'Authorization': 'Bearer SENIN_API_KEYIN' }... }) GELECEK. 
            // Şimdilik Pseudo-AI (Gelişmiş Algoritma) devrede.
            
            let zayifKonular = []; if(ogrenci.isiHaritasi) { for(let k in ogrenci.isiHaritasi) { if(ogrenci.isiHaritasi[k].includes('Zayıf') || ogrenci.isiHaritasi[k].includes('Orta')) zayifKonular.push(k); } }
            let biten = ogrenci.gorevler.filter(g => g.tamamlandi).length; let bekleyen = ogrenci.gorevler.length - biten; let xp = ogrenci.xp || 0; 
            let raporMetni = ""; let onerilenGorev = "";
            if(zayifKonular.length > 0) { let hedefKonu = zayifKonular[0]; raporMetni = `Kaptan, ${ogrenci.ogrenciAd} adlı öğrencinin "<b>${hedefKonu}</b>" konusunda eksikleri var. Şu an ${bekleyen} görevi bekliyor. Hemen bir kurtarma operasyonu yapalım mı?`; onerilenGorev = `${hedefKonu} - Kritik Soru Çözümü (AI Rota)`; } 
            else if (bekleyen > 2) { raporMetni = `⚠️ Dikkat! Öğrencinin ${bekleyen} görevi birikmiş. Yeni ağır bir konu yerine "Tekrar ve Toparlama" görevi verelim.`; onerilenGorev = "Biriken Görevleri Eritme Kampı"; } 
            else if (xp > 150) { raporMetni = `🚀 ${ogrenci.ogrenciAd} bir Odak Ustası! Zayıf konusu yok. Türkiye Geneli Deneme atayabiliriz.`; onerilenGorev = "YKS/LGS Genel Deneme Çözümü"; } 
            else { raporMetni = `⏳ ${ogrenci.ogrenciAd} ısınma aşamasında. Onu motive edecek ufak bir görev atayalım.`; onerilenGorev = "Güne Başlangıç: 20 Paragraf"; }
            io.to(veri.kocKodu).emit('yapay_zeka_raporu', { ad: veri.ogrenciAd, rapor: raporMetni, oneri: onerilenGorev }); 
        } catch(e) {} 
    });

    socket.on('ogrenci_chatbot_mesaji', async (veri) => { try { let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); let xp = ogrenci ? ogrenci.xp || 0 : 0; let rütbe = xp >= 300 ? 'Efsane' : xp >= 150 ? 'Odak Ustası' : xp >= 50 ? 'Çalışkan' : 'Çaylak'; let msg = veri.mesaj.toLowerCase(); let cevap = ""; if (msg.includes('xp') || msg.includes('market')) { cevap = `XP'lerini Market'te harcayarak ödüller alabilirsin! Şuan ${xp} XP'n var! 🌟`; } else if (msg.includes('görev') || msg.includes('bitir')) { cevap = `Görevleri bitirip +10 XP kazan! 🎯`; } else { cevap = `Merhaba ${rütbe}! Yorulduğunda moral isteyebilirsin! ⚡`; } socket.emit('chatbot_cevabi', cevap); } catch(e) {} });
});

const PORT = process.env.PORT || 3000; server.listen(PORT, () => { console.log(`🚀 KatalizApp Çalışıyor! Port: ${PORT}`); });