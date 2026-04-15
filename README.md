# Luminous Video Chat (Omegle Clone)

Bu proje, rastgele kullanıcı eşleştirme, görüntülü WebRTC görüşmesi ve anlık mesajlaşma özelliklerini içeren bir **Node.js, Express ve Socket.IO** uygulamasıdır.

## 🚀 Başlangıç

Bu projenin çalıştırılabilmesi için bilgisayarınızda (veya kurulacağı sunucuda) **Node.js** yüklü olmalıdır. Öğrenmek için terminalinize `node -v` yazabilirsiniz. Yoksa [nodejs.org](https://nodejs.org) adresinden indirip kurabilirsiniz.

### Kurulum ve Çalıştırma (Windows)

Proje klasörü içine doğrudan tek tıkla çalıştırabileceğiniz betikler (Scriptler) eklenmiştir:

1. **`kurulum.bat`** : Çift tıklayarak çalıştırın. Bu işlem uygulamanın çalışması için gerekli tüm Node modüllerini (`express`, `socket.io` vb.) internetten indirecektir. Sadece ilk kullanımda bir kere yapmak yeterlidir.
2. **`baslat.bat`** : Çift tıklayarak sunucuyu çalıştırın. Konsol ekranı açılacak ve "Sunucu http://localhost:3000 üzerinde çalışıyor" mesajı belirecektir.
3. Tarayıcınızdan **`http://localhost:3000`** adresine gidin.

### Manuel Komutlarla Çalıştırma

Eğer scriptler yerine komut satırı üzerinden (Terminal / PowerShell / CMD) çalıştırmak isterseniz:

```bash
# Proje dizinine girin
cd stitch_swipe_video_match

# Eksik paketleri yükleyin
npm install

# Sunucuyu başlatın
npm start
```

*Geliştirme yaparken dosya değişikliğinde sunucunun otomatik resetlenmesi için `npm run dev` komutunu da kullanabilirsiniz.*

## 🔥 Özellikler

- **Rastgele Eşleşme (Queue System)**: Sırada bekleyen kullanıcı varsa anında eşleşir, yoksa ilk siz sıraya girersiniz. Çıkan kişilerin yerine sistem kuyruğu işlemeye devam eder.
- **WebRTC Görüntülü Sohbet**: Aracısız ve yüksek hızlı doğrudan Peer-To-Peer medya aktarımı.
- **Socket.IO Anlık Mesajlaşma**: Aynı oda içerisindeki kişiler arası doğrudan realtime mesajlaşma altyapısı.
