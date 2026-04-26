const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" }, 
    maxHttpBufferSize: 1e8 
}); 

const mongoURI = 'mongodb+srv://alptug:alptug123@cluster0.djt56xg.mongodb.net/EgitimKocuDB?retryWrites=true&w=majority';
mongoose.connect(mongoURI)
    .then(() => {
        console.log('🫀 MongoDB Bağlantısı Başarılı!');
    })
    .catch((err) => {
        console.log('❌ Veritabanı Hatası:', err);
    });

// ==========================================
// 1. VERİTABANI ŞEMALARI
// ==========================================

const ogretmenSchema = new mongoose.Schema({ 
    kocAd: String, 
    sifre: String, 
    kocKodu: String,
    finans: { type: Object, default: {} } 
});
const Ogretmen = mongoose.model('Ogretmen', ogretmenSchema);

const ogrenciSchema = new mongoose.Schema({ 
    ogrenciAd: String, 
    sifre: String, 
    kocKodu: String, 
    veliKodu: String, 
    ders: String, 
    mesaj: String, 
    xp: { type: Number, default: 0 }, 
    avatar: { type: String, default: '👤' }, 
    gorevler: Array, 
    istatistik: { type: Object, default: {} }, 
    netler: Array, 
    alinanOduller: Array, 
    bekleyenOduller: { type: Array, default: [] }, 
    aktifDuello: { type: Object, default: null }, 
    finans: { type: Object, default: {} }, 
    sonrakiDers: { type: String, default: '' }, 
    canliDersLink: { type: String, default: '' }, 
    isiHaritasi: { type: Object, default: {} }, 
    hataDefteri: { type: Array, default: [] } 
});
const Ogrenci = mongoose.model('Ogrenci', ogrenciSchema);

const chatSchema = new mongoose.Schema({ 
    id: Number, 
    gonderen: String, 
    mesaj: String, 
    rol: String, 
    saat: String, 
    tip: { type: String, default: 'metin' }, 
    kocKodu: String 
});
const Chat = mongoose.model('Chat', chatSchema);

const kaynakSchema = new mongoose.Schema({ 
    id: Number, 
    kocKodu: String, 
    baslik: String, 
    url: String, 
    tarih: String 
});
const Kaynak = mongoose.model('Kaynak', kaynakSchema);

// ==========================================
// 2. HTTP API İŞLEMLERİ
// ==========================================

app.post('/api/admin', async (req, res) => { 
    const { sifre } = req.body; 
    if (sifre === 'sincap-boss-2026') { 
        let koclar = await Ogretmen.find(); 
        let ogrler = await Ogrenci.find(); 
        res.json({ basari: true, data: { koclar, ogrler } }); 
    } else { 
        res.json({ basari: false }); 
    } 
});

app.post('/api/admin/finans_kaydet', async (req, res) => {
    const { sifre, kocKodu, finans } = req.body;
    if (sifre === 'sincap-boss-2026') {
        await Ogretmen.updateOne({ kocKodu: kocKodu }, { finans: finans });
        res.json({ basari: true });
    } else { 
        res.json({ basari: false }); 
    }
});

app.post('/api/koc/kayit', async (req, res) => { 
    try { 
        const { kocAd, sifre } = req.body; 
        let varMi = await Ogretmen.findOne({ kocAd }); 
        
        if (varMi) {
            return res.json({ basari: false, mesaj: "Bu öğretmen zaten var!" }); 
        }
        
        let yeniKod = Math.random().toString(36).substr(2, 6).toUpperCase(); 
        let yeniKoc = new Ogretmen({ kocAd, sifre, kocKodu: yeniKod, finans: {} }); 
        
        await yeniKoc.save(); 
        res.json({ basari: true, mesaj: `Davet Kodunuz: ${yeniKod}`, kocKodu: yeniKod }); 
    } catch (e) { 
        res.json({ basari: false }); 
    } 
});

app.post('/api/koc/giris', async (req, res) => { 
    try { 
        const { kocAd, sifre } = req.body; 
        let koc = await Ogretmen.findOne({ kocAd, sifre }); 
        
        if (koc) {
            res.json({ basari: true, kocKodu: koc.kocKodu }); 
        } else {
            res.json({ basari: false, mesaj: "Hatalı giriş!" }); 
        }
    } catch (e) { 
        res.json({ basari: false }); 
    } 
});

app.post('/api/kayit', async (req, res) => { 
    try { 
        const { ogrenciAd, sifre, kocKodu } = req.body; 
        let kocVarMi = await Ogretmen.findOne({ kocKodu }); 
        
        if (!kocVarMi) {
            return res.json({ basari: false, mesaj: "Davet Kodu bulunamadı!" }); 
        }
        
        let varMi = await Ogrenci.findOne({ ogrenciAd, kocKodu }); 
        
        if (varMi) {
            return res.json({ basari: false, mesaj: "Öğrenci zaten var!" }); 
        }
        
        let vKodu = 'V-' + Math.floor(1000 + Math.random() * 9000); 
        let yeniOgrenci = new Ogrenci({ 
            ogrenciAd, sifre, kocKodu, veliKodu: vKodu, 
            xp: 0, avatar: '👤', finans: {}, hataDefteri: [] 
        }); 
        
        await yeniOgrenci.save(); 
        res.json({ basari: true, mesaj: "Başarılı!" }); 
    } catch (e) { 
        res.json({ basari: false }); 
    } 
});

app.post('/api/sifreler', async (req, res) => { 
    try { 
        let ogrenciler = await Ogrenci.find({ kocKodu: req.body.kocKodu }, 'ogrenciAd sifre veliKodu -_id'); 
        res.json(ogrenciler); 
    } catch (e) { 
        res.json([]); 
    } 
});

// ==========================================
// 3. SOCKET.IO (CANLI VERİ AKIŞI)
// ==========================================

io.on('connection', (socket) => {
    
    socket.on('join_room', async (kocKodu) => { 
        socket.join(kocKodu); 
        try { 
            const ogrenciler = await Ogrenci.find({ kocKodu }); 
            const ogretmen = await Ogretmen.findOne({ kocKodu });
            
            // 💸 ÖDEME HATIRLATMA MOTORU
            const aylar = ["Oca", "Sub", "Mar", "Nis", "May", "Haz", "Tem", "Agu", "Eyl", "Eki", "Kas", "Ara"];
            const suAnkiAy = aylar[new Date().getMonth()];

            // Hocanın kendi lisans borcu kontrolü
            if (ogretmen && (!ogretmen.finans || !ogretmen.finans[suAnkiAy])) {
                socket.emit('finans_uyarisi', { 
                    tip: 'lisans', 
                    mesaj: `${suAnkiAy} ayı platform kullanım ödemeniz henüz kaydedilmemiştir.` 
                });
            }

            // Hocaya öğrenci borçlarını hatırlatma
            ogrenciler.forEach(ogr => {
                if (!ogr.finans || !ogr.finans[suAnkiAy]) {
                    socket.emit('finans_uyarisi', { 
                        tip: 'ogrenci', 
                        ogrenci: ogr.ogrenciAd,
                        mesaj: `${ogr.ogrenciAd} için ${suAnkiAy} ayı ödemesi henüz sisteme işlenmedi.` 
                    });
                }
            });

            // Temel Verileri Gönder
            socket.emit('eski_verileri_yukle', ogrenciler); 
            socket.emit('gorev_guncellendi', ogrenciler); 
            
            const eskiChat = await Chat.find({ kocKodu }).sort({_id: -1}).limit(50); 
            socket.emit('eski_chat_yukle', eskiChat.reverse()); 
            
            const eskiKaynaklar = await Kaynak.find({ kocKodu }).sort({id: -1}); 
            socket.emit('kaynaklari_yukle', eskiKaynaklar); 
        } catch (hata) {
            console.error("Join Room Hatası:", hata);
        } 
    });
    
    socket.on('ajanda_kaydet', async (veri) => { 
        try { 
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
            if (ogrenci) { 
                ogrenci.sonrakiDers = veri.sonrakiDers; 
                ogrenci.canliDersLink = veri.canliDersLink; 
                ogrenci.finans = veri.finans; 
                ogrenci.markModified('finans'); 
                
                await ogrenci.save(); 
                
                let list = await Ogrenci.find({ kocKodu: veri.kocKodu });
                io.to(veri.kocKodu).emit('gorev_guncellendi', list); 
            } 
        } catch(e) {} 
    });

    socket.on('odul_satin_al', async (veri) => { 
        try { 
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
            if (ogrenci && ogrenci.xp >= veri.bedel) { 
                ogrenci.xp -= veri.bedel; 
                
                let odulData = { 
                    id: Date.now(), 
                    odul: veri.odul, 
                    tarih: new Date().toLocaleDateString('tr-TR') 
                }; 
                
                ogrenci.alinanOduller.push(odulData); 
                ogrenci.bekleyenOduller.push(odulData); 
                
                ogrenci.markModified('alinanOduller'); 
                ogrenci.markModified('bekleyenOduller'); 
                
                await ogrenci.save(); 
                
                let list = await Ogrenci.find({ kocKodu: veri.kocKodu });
                io.to(veri.kocKodu).emit('gorev_guncellendi', list); 
                io.to(veri.kocKodu).emit('ogretmene_market_bildirimi', { ogrenci: veri.ogrenciAd, odul: veri.odul }); 
            } 
        } catch(e) {} 
    });

    socket.on('odul_teslim_edildi', async (veri) => { 
        try { 
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
            if (ogrenci) { 
                ogrenci.bekleyenOduller = ogrenci.bekleyenOduller.filter(o => o.id !== veri.odulId); 
                ogrenci.markModified('bekleyenOduller'); 
                
                await ogrenci.save(); 
                
                let list = await Ogrenci.find({ kocKodu: veri.kocKodu });
                io.to(veri.kocKodu).emit('gorev_guncellendi', list); 
            } 
        } catch(e) {} 
    });

    socket.on('hata_sorusu_ekle', async (veri) => { 
        try { 
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
            if (ogrenci) { 
                let yeniSoru = { 
                    id: Date.now(), 
                    resim: veri.resim, 
                    dersKonu: veri.dersKonu, 
                    durum: 'Bekliyor', 
                    tarih: new Date().toLocaleDateString('tr-TR') 
                }; 
                
                ogrenci.hataDefteri.push(yeniSoru); 
                ogrenci.markModified('hataDefteri'); 
                
                await ogrenci.save(); 
                
                let list = await Ogrenci.find({ kocKodu: veri.kocKodu });
                io.to(veri.kocKodu).emit('gorev_guncellendi', list); 
                io.to(veri.kocKodu).emit('ogretmene_market_bildirimi', { ogrenci: veri.ogrenciAd, odul: "Hata Defterine Soru Yükledi" }); 
            } 
        } catch(e) {} 
    });

    socket.on('hata_sorusu_cozuldu', async (veri) => { 
        try { 
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
            if (ogrenci && ogrenci.hataDefteri) { 
                let idx = ogrenci.hataDefteri.findIndex(h => h.id === veri.soruId); 
                if (idx !== -1) { 
                    ogrenci.hataDefteri[idx].durum = 'Çözüldü'; 
                    ogrenci.markModified('hataDefteri'); 
                    
                    await ogrenci.save(); 
                    
                    let list = await Ogrenci.find({ kocKodu: veri.kocKodu });
                    io.to(veri.kocKodu).emit('gorev_guncellendi', list); 
                } 
            } 
        } catch(e) {} 
    });

    socket.on('isi_haritasi_guncelle', async (veri) => { 
        try { 
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
            if (ogrenci) { 
                let harita = ogrenci.isiHaritasi || {}; 
                harita[veri.konu] = veri.durum; 
                ogrenci.isiHaritasi = harita; 
                ogrenci.markModified('isiHaritasi'); 
                
                await ogrenci.save(); 
                
                let list = await Ogrenci.find({ kocKodu: veri.kocKodu });
                io.to(veri.kocKodu).emit('gorev_guncellendi', list); 
            } 
        } catch(e) {} 
    });

    socket.on('yeni_gorev_ekle', async (veri) => { 
        try { 
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
            if (ogrenci) { 
                ogrenci.gorevler.push({ 
                    id: Date.now(), 
                    metin: veri.gorevMetni, 
                    tamamlandi: false 
                }); 
                
                ogrenci.markModified('gorevler'); 
                await ogrenci.save(); 
                
                let list = await Ogrenci.find({ kocKodu: veri.kocKodu });
                io.to(veri.kocKodu).emit('gorev_guncellendi', list); 
            } 
        } catch(e) {} 
    });

    socket.on('yapay_zeka_analiz_istegi', async (veri) => { 
        try { 
            let ogrenci = await Ogrenci.findOne({ ogrenciAd: veri.ogrenciAd, kocKodu: veri.kocKodu }); 
            if (!ogrenci) return; 
            
            let zayifKonular = []; 
            if (ogrenci.isiHaritasi) { 
                for (let k in ogrenci.isiHaritasi) { 
                    if (ogrenci.isiHaritasi[k].includes('Zayıf') || ogrenci.isiHaritasi[k].includes('Orta')) {
                        zayifKonular.push(k);
                    } 
                } 
            }
            
            let biten = ogrenci.gorevler.filter(g => g.tamamlandi).length; 
            let bekleyen = ogrenci.gorevler.length - biten; 
            let xp = ogrenci.xp || 0; 
            
            let raporMetni = ""; 
            let onerilenGorev = "";
            
            if (zayifKonular.length > 0) { 
                raporMetni = `Kaptan, ${ogrenci.ogrenciAd} adlı öğrencinin "<b>${zayifKonular[0]}</b>" konusunda eksikleri var. Kurtarma operasyonu yapalım mı?`; 
                onerilenGorev = `${zayifKonular[0]} - Kritik Soru Çözümü`; 
            } else if (bekleyen > 2) { 
                raporMetni = `⚠️ Dikkat! Öğrencinin ${bekleyen} görevi birikmiş. "Tekrar ve Toparlama" verelim.`; 
                onerilenGorev = "Biriken Görevleri Eritme Kampı"; 
            } else if (xp > 150) { 
                raporMetni = `🚀 ${ogrenci.ogrenciAd} Odak Ustası! Türkiye Geneli Deneme atayabiliriz.`; 
                onerilenGorev = "YKS/LGS Genel Deneme Çözümü"; 
            } else { 
                raporMetni = `⏳ ${ogrenci.ogrenciAd} ısınma aşamasında. Ufak bir görev verelim.`; 
                onerilenGorev = "Güne Başlangıç: 20 Paragraf"; 
            }
            
            io.to(veri.kocKodu).emit('yapay_zeka_raporu', { 
                ad: veri.ogrenciAd, 
                rapor: raporMetni, 
                oneri: onerilenGorev 
            }); 
        } catch(e) {} 
    });

});

const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => { 
    console.log(`🚀 KatalizApp Çalışıyor! Port: ${PORT}`); 
});