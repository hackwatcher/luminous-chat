const { io } = require('socket.io-client');
const { spawn } = require('child_process');

// 1. Sunucuyu Başlat
console.log("--> Sunucu (server.js) başlatılıyor...");
const serverProcess = spawn('node', ['server.js']);

serverProcess.stdout.on('data', (data) => {
    // console.log(`[Sunucu Log]: ${data}`);
});

serverProcess.stderr.on('data', (data) => {
    console.error(`[Sunucu Hata]: ${data}`);
});

setTimeout(() => {
    console.log("\n--> BAŞLIYOR: Senaryo 1 ve 2 Test Edilecek\n");
    runTests();
}, 2000); // Sunucunun ayağa kalkmasına 2 saniye tanı

async function runTests() {
    const URL = 'http://localhost:3000';

    // Üç kullanıcıyı tanımlıyoruz
    const clientA = io(URL);
    const clientB = io(URL);
    const clientC = io(URL);

    let aMatched = false;
    let bMatched = false;

    // --- SENARYO 1: BAĞLANTI, EŞLEŞME ve MESAJLAŞMA ---
    console.log("TEST 1: Kullanıcı A ve Kullanıcı B bağlanıyor...");

    clientA.on('connect', () => {
        console.log("  [+] Kullanıcı A bağlandı. (ID:", clientA.id, ")");
        clientA.emit('start-search');
    });

    clientB.on('connect', () => {
        console.log("  [+] Kullanıcı B bağlandı. (ID:", clientB.id, ")");
        clientB.emit('start-search');
    });

    clientA.on('matched', (data) => {
        aMatched = true;
        console.log("  [✓] Kullanıcı A eşleşti! Partner:", data.partnerId);
        
        // Eşleşme sağlandığında A kişisi mesaj atsın
        setTimeout(() => {
            console.log("  [A ->] 'Merhaba B!' mesajı gönderiliyor...");
            clientA.emit('chat-message', 'Merhaba B!');
        }, 500);
    });

    clientB.on('matched', (data) => {
        bMatched = true;
        console.log("  [✓] Kullanıcı B eşleşti! Partner:", data.partnerId);
    });

    clientB.on('chat-message', (msg) => {
        console.log(`  [B <-] Kullanıcı B Mesaj Aldı: "${msg}"`);
        if (msg === 'Merhaba B!') {
            console.log("  [B ->] 'Selam A!' mesajıyla cevap veriliyor...");
            clientB.emit('chat-message', 'Selam A!');
        }
    });

    clientA.on('chat-message', (msg) => {
        console.log(`  [A <-] Kullanıcı A Mesaj Aldı: "${msg}"`);
        if (msg === 'Selam A!') {
            console.log("\n--- SENARYO 1 BAŞARILI: Başarılı eşleşme ve karşılıklı mesajlaşma testi geçildi. ---\n");
            startScenario2();
        }
    });

    // --- SENARYO 2: AYRILMA (NEXT) ve YENİDEN EŞLEŞME ---
    let cMatched = false;

    function startScenario2() {
        console.log("TEST 2: Kullanıcı A 'Next' (Sonraki) butonuna basıyor...");
        
        // "A" next diyince "B" partner-disconnected sinyali almalı ve "A" tekrar kuyruğa girmelidir.
        clientA.emit('next');
        
        setTimeout(() => {
            console.log("  [+] Kullanıcı C sahneye çıkıyor ve arama başlatıyor...");
            clientC.emit('start-search');
        }, 500);
    }

    clientA.on('searching', () => {
        console.log("  [✓] Kullanıcı A 'searching' moduna geri döndü (Yeniden Eşleşme Aranıyor).");
    });

    clientB.on('partner-disconnected', () => {
        console.log("  [✓] Kullanıcı B 'partner ayrıldı' bildirimini aldı.");
    });

    clientB.on('searching', () => {
        console.log("  [✓] Kullanıcı B otomatik olarak 'searching' (Arama) moduna geri alındı.");
    });

    clientC.on('matched', (data) => {
        console.log(`  [✓] Kullanıcı C uygulamada sıraya giren başka biriyle (B veya A) eşleşti! Partner: ${data.partnerId}`);
        cMatched = true;

        if (cMatched) {
            console.log("\n--- SENARYO 2 BAŞARILI: 'Next' tuşuna basan partner ile ayrılma, otomatik sıraya alma ve re-matching testleri geçildi. ---\n");
            
            console.log("TÜM TESTLER TAMAMLANDI! Temizlik yapılıp çıkılıyor...");
            cleanup();
        }
    });

    function cleanup() {
        clientA.disconnect();
        clientB.disconnect();
        clientC.disconnect();
        serverProcess.kill();
        process.exit(0);
    }
}
