@echo off
echo.
echo ============================================
echo  LUMINOUS CHAT - GITHUB DEPLOY HAZIRLIK
echo ============================================
echo.
echo ADIM 1: GitHub'da yeni repo olusturun
echo  - github.com/new adresine gidin
echo  - Repo adi: luminous-chat
echo  - Public veya Private (farketmez)
echo  - "Create repository" tiklayin
echo.
echo ADIM 2: Asagidaki komutlari calistirin
echo  (KULLANICI_ADIN kismini degistirin)
echo.
echo git remote add origin https://github.com/KULLANICI_ADIN/luminous-chat.git
echo git branch -M main
echo git push -u origin main
echo.
echo ADIM 3: render.com'a gidin
echo  - New + ^> Web Service
echo  - Connect GitHub repo
echo  - Build: npm install
echo  - Start: node server.js
echo  - Environment: NODE_ENV=production
echo.
pause
