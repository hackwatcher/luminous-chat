# Kullanıcı Test Senaryoları (User Testing Scenarios)

Aşağıdaki senaryolar uygulamanın ana işlevleri olan "Bağlantı, Eşleşme ve Mesajlaşma" fonksiyonlarını test etmek için hazırlanmıştır. Testleri gerçekleştirmek için en az 2 farklı sekme veya farklı cihaz gerekmektedir.

---

## 🏗 Senaryo 1: Temel Bağlantı, Eşleşme ve Mesajlaşma

**Hedef:** İki farklı kullanıcının sisteme başarıyla bağlanması, birbirleriyle eşleşmesi ve Webrtc/Chat üzerinden iletişim kurabilmesi.

### 📝 Adımlar:
1. **Kullanıcı A**, tarayıcıda uygulamayı açar ve kamera/mikrofon izinlerini onaylar.
2. **Kullanıcı A**, "Arama Başlat" (Start) butonuna tıklar.
   - *Beklenen Sonuç:* Kullanıcı A'nın ekranında "Eşleşme Aranıyor..." yazmalı ve arayüz kamerayı bekleme moduna almalıdır.
3. **Kullanıcı B**, farklı bir gizli sekmede (veya farklı bir cihazda) uygulamayı açar, izinleri onaylar.
4. **Kullanıcı B**, "Arama Başlat" butonuna tıklar.
   - *Beklenen Sonuç:* Sunucu kuyruğa her iki kullanıcıyı da alır.
5. Sunucu eşleşmeyi gerçekleştirir.
   - *Beklenen Sonuç:* Her iki kullanıcının ekranında da "Biriyle eşleştiniz. Merhaba deyin!" mesajı belirir. Canlı bağlantı aktifleştirilir ve WebRTC üzerinden birbirlerinin kameralarını görmeye başlarlar.
6. **Kullanıcı A**, "Selam!" yazıp sohbet üzerinden gönderir.
   - *Beklenen Sonuç:* Kullanıcı A'nın ekranında sağa yaslı bir balon içinde "Selam!" gözükür.
7. **Kullanıcı B**, "Selam!" mesajını sol tarafta bir sistem uyarısı veya karşıdan gelen mesaj olarak görür ve "Merhaba, nasılsın?" şeklinde bir cevap gönderir.
   - *Beklenen Sonuç:* Kullanıcı A, cevap mesajını başarıyla alır.

---

## 🚀 Senaryo 2: Ayrılma (Disconnect/Next) ve Yeniden Eşleşme Süreci

**Hedef:** Bir kullanıcının görüşmeyi bitirip ("Next" butonu ile) yeni bir kişiyle eşleştirilmesi süreci ve bağlantı koptuğunda sunucunun uygulayacağı davranışın test edilmesi.

### 📝 Adımlar:
1. **Senaryo 1 başarıyla tamamlanmış ve Kullanıcı A ile Kullanıcı B eşleşmiş durumdadır.**
2. Uygulamaya **Kullanıcı C** bağlanır ve "Arama Başlat" diyerek sıraya girer. (Ekranda "Eşleşme Aranıyor..." görür)
3. **Kullanıcı A**, mevcut görüşmeden ayrılmak için **"Next" (Sonraki)** butonuna tıklar.
   - *Kullanıcı A için Beklenen Sonuç:* Arayüz kapanıp sıfırlanmadan hemen önce sunucudan "Eşleşme Aranıyor..." sinyali alır ve tekrar sıraya girer.
   - *Kullanıcı B için Beklenen Sonuç:* Karşı tarafın ("A") ayrıldığına ("Karşı taraf görüşmeden ayrıldı.") dair bir uyarı bildirim mesajı alır. (Sunucu kuralına göre Kullanıcı B otomatik olarak arka planda sıraya alınır)
4. İlk Kuyruğa giren kimse (Örneğin Kullanıcı C) durumu değerlendirilir.
   - *Sunucu Beklenen Sonucu:* Kullanıcı C bekliyor olduğundan, otomatik olarak boşa çıkan veya "Next" diyen yeni kişiyle (Örn: A veya B'den kuyruğa ilk düşenle) eşleşmelidir.
5. Yeni kurulan **Kullanıcı C** ve **Kullanıcı B** (veya A) eşleşmesinden sonra ekranlarda tekrar "Biriyle eşleştiniz. Merhaba deyin!" mesajı görüntülenir.
6. Yeni partnerler birbirlerine test mesajı yazarak bağlantının sağlıklı çalıştığını son bir kez teyit ederler.
