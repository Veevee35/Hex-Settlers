/* Hex Settlers local-only language packs. No third-party translation service,
 * tracking, API keys, or automatic upload of player/chat content.
 * Exact text matching with English fallback; gameplay IDs/protocol unchanged.
 */
(() => {
  'use strict';
  const KEY = 'hexsettlers_ui_language_v1';
  const languageNames = {
    en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português',
    it: 'Italiano', nl: 'Nederlands', pl: 'Polski', sv: 'Svenska', da: 'Dansk',
    no: 'Norsk', fi: 'Suomi', cs: 'Čeština', ro: 'Română', el: 'Ελληνικά',
    tr: 'Türkçe', ru: 'Русский', uk: 'Українська', ar: 'العربية', he: 'עברית',
    hi: 'हिन्दी', zh: '简体中文', ja: '日本語', ko: '한국어', id: 'Bahasa Indonesia',
    vi: 'Tiếng Việt', th: 'ไทย', hu: 'Magyar', bg: 'Български', ms: 'Bahasa Melayu'
  };
  // Ordered source strings; every translated row is validated before use.
  const keys = [
    'Language', 'Select Language', 'Back', 'Username', 'Password', 'Log In',
    'Create Account', 'Forgot your password?', 'Manage Account', 'Friends',
    'Change Game Type', 'Player Stats', 'Game Log', 'Log Out', 'Ranked Play',
    'Unranked Play', 'Casual Play · vs AI', 'Lobby', 'Game Setup',
    'Number of Players', 'Map', 'Victory points to win', 'Dice algorithm',
    'Discard limit', 'Development card deck', 'Friendly Robber mode',
    'Surprise map at game start', 'Timer speed', 'Ready', 'Unready',
    'Start Game', 'Close', 'Send', 'Rules', 'Classic', 'Seafarers'
  ];
  const rows = {
    es: `Idioma|Seleccionar idioma|Volver|Usuario|Contraseña|Iniciar sesión|Crear cuenta|¿Olvidaste tu contraseña?|Administrar cuenta|Amigos|Cambiar tipo de partida|Estadísticas de jugadores|Registro de partidas|Cerrar sesión|Partida clasificatoria|Partida no clasificatoria|Partida casual · contra IA|Sala|Configuración de partida|Número de jugadores|Mapa|Puntos para ganar|Algoritmo de dados|Límite de descarte|Mazo de desarrollo|Ladrón amistoso|Mapa sorpresa al comenzar|Velocidad del temporizador|Listo|No listo|Iniciar partida|Cerrar|Enviar|Reglas|Clásico|Navegantes`,
    fr: `Langue|Choisir la langue|Retour|Nom d'utilisateur|Mot de passe|Se connecter|Créer un compte|Mot de passe oublié ?|Gérer le compte|Amis|Changer de mode de jeu|Statistiques des joueurs|Journal des parties|Se déconnecter|Partie classée|Partie non classée|Partie libre · contre l'IA|Salon|Configuration de la partie|Nombre de joueurs|Carte|Points de victoire requis|Algorithme des dés|Limite de défausse|Paquet de développement|Voleur amical|Carte surprise au début|Vitesse du chronomètre|Prêt|Pas prêt|Démarrer la partie|Fermer|Envoyer|Règles|Classique|Navigateurs`,
    de: `Sprache|Sprache auswählen|Zurück|Benutzername|Passwort|Anmelden|Konto erstellen|Passwort vergessen?|Konto verwalten|Freunde|Spielmodus ändern|Spielerstatistiken|Spielprotokoll|Abmelden|Ranglistenspiel|Freies Spiel|Einzelspiel · gegen KI|Lobby|Spieleinstellungen|Anzahl der Spieler|Karte|Siegpunkte zum Gewinnen|Würfelalgorithmus|Abwurfgrenze|Entwicklungskartenstapel|Freundlicher Räuber|Überraschungskarte beim Start|Timergeschwindigkeit|Bereit|Nicht bereit|Spiel starten|Schließen|Senden|Regeln|Klassisch|Seefahrer`,
    pt: `Idioma|Selecionar idioma|Voltar|Nome de usuário|Senha|Entrar|Criar conta|Esqueceu sua senha?|Gerenciar conta|Amigos|Mudar modo de jogo|Estatísticas dos jogadores|Histórico de partidas|Sair|Partida ranqueada|Partida sem ranking|Partida casual · contra IA|Sala|Configuração da partida|Número de jogadores|Mapa|Pontos para vencer|Algoritmo dos dados|Limite de descarte|Baralho de desenvolvimento|Ladrão amigável|Mapa surpresa no início|Velocidade do cronômetro|Pronto|Não pronto|Iniciar partida|Fechar|Enviar|Regras|Clássico|Navegadores`,
    it: `Lingua|Seleziona lingua|Indietro|Nome utente|Password|Accedi|Crea account|Password dimenticata?|Gestisci account|Amici|Cambia modalità di gioco|Statistiche giocatori|Registro partite|Esci|Partita classificata|Partita non classificata|Partita casual · contro IA|Lobby|Impostazioni partita|Numero di giocatori|Mappa|Punti per vincere|Algoritmo dei dadi|Limite di scarto|Mazzo sviluppo|Ladro amichevole|Mappa sorpresa all'inizio|Velocità timer|Pronto|Non pronto|Inizia partita|Chiudi|Invia|Regole|Classico|Navigatori`,
    nl: `Taal|Taal kiezen|Terug|Gebruikersnaam|Wachtwoord|Inloggen|Account maken|Wachtwoord vergeten?|Account beheren|Vrienden|Speltype wijzigen|Spelerstatistieken|Spelgeschiedenis|Uitloggen|Competitief spel|Vrij spel|Casual · tegen AI|Lobby|Spelinstellingen|Aantal spelers|Kaart|Overwinningspunten|Dobbelsteenalgoritme|Afleglimiet|Ontwikkelingskaarten|Vriendelijke rover|Verrassingskaart bij start|Timersnelheid|Klaar|Niet klaar|Spel starten|Sluiten|Verzenden|Regels|Klassiek|Zeevaarders`,
    pl: `Język|Wybierz język|Wstecz|Nazwa użytkownika|Hasło|Zaloguj się|Utwórz konto|Nie pamiętasz hasła?|Zarządzaj kontem|Znajomi|Zmień tryb gry|Statystyki graczy|Historia rozgrywek|Wyloguj się|Gra rankingowa|Gra nierankingowa|Gra swobodna · przeciw AI|Poczekalnia|Ustawienia gry|Liczba graczy|Mapa|Punkty do zwycięstwa|Algorytm kości|Limit odrzucania|Talia rozwoju|Przyjazny rozbójnik|Losowa mapa na start|Szybkość licznika|Gotowy|Nie gotowy|Rozpocznij grę|Zamknij|Wyślij|Zasady|Klasyczna|Żeglarze`,
    sv: `Språk|Välj språk|Tillbaka|Användarnamn|Lösenord|Logga in|Skapa konto|Glömt lösenordet?|Hantera konto|Vänner|Byt spelläge|Spelarstatistik|Spelhistorik|Logga ut|Rankat spel|Orankat spel|Casualspel · mot AI|Lobby|Spelinställningar|Antal spelare|Karta|Segerpoäng för att vinna|Tärningsalgoritm|Kortgräns|Utvecklingskortlek|Vänlig rövare|Överraskningskarta vid start|Timerhastighet|Redo|Inte redo|Starta spel|Stäng|Skicka|Regler|Klassisk|Sjöfarare`,
    da: `Sprog|Vælg sprog|Tilbage|Brugernavn|Adgangskode|Log ind|Opret konto|Glemt adgangskode?|Administrer konto|Venner|Skift spiltype|Spillerstatistik|Spilhistorik|Log ud|Rangeret spil|Urangeret spil|Afslappet spil · mod AI|Lobby|Spilopsætning|Antal spillere|Kort|Sejrspoint for at vinde|Terningalgoritme|Kassationsgrænse|Udviklingskort|Venlig røver|Overraskelseskort ved start|Timerhastighed|Klar|Ikke klar|Start spil|Luk|Send|Regler|Klassisk|Søfarere`,
    no: `Språk|Velg språk|Tilbake|Brukernavn|Passord|Logg inn|Opprett konto|Glemt passordet?|Administrer konto|Venner|Bytt spillmodus|Spillerstatistikk|Spillhistorikk|Logg ut|Rangert spill|Urangert spill|Uformelt spill · mot KI|Lobby|Spilloppsett|Antall spillere|Kart|Seierspoeng for å vinne|Terningalgoritme|Kastgrense|Utviklingskortstokk|Vennlig røver|Overraskelseskart ved start|Tidsurhastighet|Klar|Ikke klar|Start spill|Lukk|Send|Regler|Klassisk|Sjøfarere`,
    fi: `Kieli|Valitse kieli|Takaisin|Käyttäjätunnus|Salasana|Kirjaudu sisään|Luo tili|Unohditko salasanasi?|Hallinnoi tiliä|Ystävät|Vaihda pelitilaa|Pelaajatilastot|Pelihistoria|Kirjaudu ulos|Rankattu peli|Rankkaamaton peli|Rento peli · tekoälyä vastaan|Aula|Pelin asetukset|Pelaajien määrä|Kartta|Voittoon tarvittavat pisteet|Noppajärjestelmä|Poisheiton raja|Kehityskorttipakka|Ystävällinen rosvo|Yllätyskartta alussa|Ajastimen nopeus|Valmis|Ei valmis|Aloita peli|Sulje|Lähetä|Säännöt|Klassinen|Merenkävijät`,
    cs: `Jazyk|Vybrat jazyk|Zpět|Uživatelské jméno|Heslo|Přihlásit se|Vytvořit účet|Zapomněli jste heslo?|Správa účtu|Přátelé|Změnit typ hry|Statistiky hráčů|Historie her|Odhlásit se|Hodnocená hra|Nehodnocená hra|Volná hra · proti AI|Lobby|Nastavení hry|Počet hráčů|Mapa|Body k vítězství|Algoritmus kostek|Limit odhazování|Balíček rozvoje|Přátelský zloděj|Překvapivá mapa na začátku|Rychlost časovače|Připraven|Nepřipraven|Začít hru|Zavřít|Odeslat|Pravidla|Klasika|Mořeplavci`,
    ro: `Limbă|Selectează limba|Înapoi|Nume de utilizator|Parolă|Autentificare|Creează cont|Ai uitat parola?|Gestionează contul|Prieteni|Schimbă modul de joc|Statistici jucători|Istoricul jocurilor|Deconectare|Joc clasat|Joc neclasat|Joc relaxat · contra AI|Lobby|Setări joc|Număr de jucători|Hartă|Puncte pentru victorie|Algoritmul zarurilor|Limită de aruncare|Pachet dezvoltare|Hoț prietenos|Hartă surpriză la start|Viteza cronometrului|Pregătit|Nepregătit|Începe jocul|Închide|Trimite|Reguli|Clasic|Navigatori`,
    el: `Γλώσσα|Επιλογή γλώσσας|Πίσω|Όνομα χρήστη|Κωδικός|Σύνδεση|Δημιουργία λογαριασμού|Ξεχάσατε τον κωδικό;|Διαχείριση λογαριασμού|Φίλοι|Αλλαγή τύπου παιχνιδιού|Στατιστικά παικτών|Ιστορικό παιχνιδιών|Αποσύνδεση|Παιχνίδι κατάταξης|Παιχνίδι χωρίς κατάταξη|Χαλαρό παιχνίδι · με AI|Λόμπι|Ρυθμίσεις παιχνιδιού|Αριθμός παικτών|Χάρτης|Πόντοι για νίκη|Αλγόριθμος ζαριών|Όριο απόρριψης|Τράπουλα ανάπτυξης|Φιλικός ληστής|Τυχαίος χάρτης στην αρχή|Ταχύτητα χρονομέτρου|Έτοιμος|Όχι έτοιμος|Έναρξη παιχνιδιού|Κλείσιμο|Αποστολή|Κανόνες|Κλασικό|Θαλασσοπόροι`,
    tr: `Dil|Dil seç|Geri|Kullanıcı adı|Şifre|Giriş yap|Hesap oluştur|Şifrenizi mi unuttunuz?|Hesabı yönet|Arkadaşlar|Oyun türünü değiştir|Oyuncu istatistikleri|Oyun geçmişi|Çıkış yap|Dereceli oyun|Derecesiz oyun|Rahat oyun · yapay zekâya karşı|Lobi|Oyun ayarları|Oyuncu sayısı|Harita|Kazanmak için puan|Zar algoritması|Atma sınırı|Gelişim kartı destesi|Dost hırsız|Başlangıçta sürpriz harita|Zamanlayıcı hızı|Hazır|Hazır değil|Oyunu başlat|Kapat|Gönder|Kurallar|Klasik|Denizciler`,
    ru: `Язык|Выбрать язык|Назад|Имя пользователя|Пароль|Войти|Создать аккаунт|Забыли пароль?|Управление аккаунтом|Друзья|Сменить режим игры|Статистика игроков|История игр|Выйти|Рейтинговая игра|Нерейтинговая игра|Обычная игра · против ИИ|Лобби|Настройки игры|Количество игроков|Карта|Очки для победы|Алгоритм кубиков|Лимит сброса|Колода развития|Дружелюбный разбойник|Случайная карта в начале|Скорость таймера|Готов|Не готов|Начать игру|Закрыть|Отправить|Правила|Классика|Мореплаватели`,
    uk: `Мова|Вибрати мову|Назад|Ім'я користувача|Пароль|Увійти|Створити обліковий запис|Забули пароль?|Керування обліковим записом|Друзі|Змінити режим гри|Статистика гравців|Історія ігор|Вийти|Рейтингова гра|Нерейтингова гра|Звичайна гра · проти ШІ|Лобі|Налаштування гри|Кількість гравців|Мапа|Очки для перемоги|Алгоритм кубиків|Ліміт скидання|Колода розвитку|Дружній розбійник|Несподівана мапа на початку|Швидкість таймера|Готовий|Не готовий|Почати гру|Закрити|Надіслати|Правила|Класика|Мореплавці`,
    ar: `اللغة|اختر اللغة|رجوع|اسم المستخدم|كلمة المرور|تسجيل الدخول|إنشاء حساب|نسيت كلمة المرور؟|إدارة الحساب|الأصدقاء|تغيير نمط اللعب|إحصاءات اللاعبين|سجل الألعاب|تسجيل الخروج|لعب مصنف|لعب غير مصنف|لعب حر · ضد الذكاء الاصطناعي|ردهة|إعداد اللعبة|عدد اللاعبين|الخريطة|نقاط الفوز|خوارزمية النرد|حد التخلص من البطاقات|مجموعة بطاقات التطوير|لص ودود|خريطة مفاجئة عند البداية|سرعة المؤقت|جاهز|غير جاهز|ابدأ اللعبة|إغلاق|إرسال|القواعد|كلاسيكي|البحارة`,
    he: `שפה|בחר שפה|חזרה|שם משתמש|סיסמה|התחברות|יצירת חשבון|שכחת סיסמה?|ניהול חשבון|חברים|שינוי סוג משחק|סטטיסטיקות שחקנים|יומן משחקים|התנתקות|משחק מדורג|משחק לא מדורג|משחק רגוע · מול בינה מלאכותית|חדר המתנה|הגדרות משחק|מספר שחקנים|מפה|נקודות לניצחון|אלגוריתם קוביות|מגבלת השלכה|חפיסת פיתוח|שודד ידידותי|מפת הפתעה בתחילת המשחק|מהירות שעון|מוכן|לא מוכן|התחל משחק|סגור|שלח|חוקים|קלאסי|יורדי ים`,
    hi: `भाषा|भाषा चुनें|वापस|उपयोगकर्ता नाम|पासवर्ड|लॉग इन|खाता बनाएँ|पासवर्ड भूल गए?|खाता प्रबंधित करें|मित्र|खेल का प्रकार बदलें|खिलाड़ी आँकड़े|खेल का इतिहास|लॉग आउट|रैंक वाला खेल|बिना रैंक का खेल|सामान्य खेल · AI के विरुद्ध|लॉबी|खेल की सेटिंग|खिलाड़ियों की संख्या|नक्शा|जीतने के अंक|पासा एल्गोरिदम|कार्ड छोड़ने की सीमा|विकास कार्ड डेक|मित्रवत डाकू|शुरुआत में आकस्मिक नक्शा|टाइमर की गति|तैयार|तैयार नहीं|खेल शुरू करें|बंद करें|भेजें|नियम|क्लासिक|नाविक`,
    zh: `语言|选择语言|返回|用户名|密码|登录|创建账户|忘记密码？|管理账户|好友|切换游戏模式|玩家统计|游戏记录|退出登录|排位赛|非排位赛|休闲模式 · 对战 AI|大厅|游戏设置|玩家人数|地图|获胜所需分数|骰子算法|弃牌上限|发展卡牌堆|友好强盗|开局随机地图|计时器速度|已准备|未准备|开始游戏|关闭|发送|规则|经典|航海家`,
    ja: `言語|言語を選択|戻る|ユーザー名|パスワード|ログイン|アカウント作成|パスワードをお忘れですか？|アカウント管理|フレンド|ゲームモード変更|プレイヤー統計|ゲーム履歴|ログアウト|ランク戦|非ランク戦|カジュアル · AI対戦|ロビー|ゲーム設定|プレイヤー人数|マップ|勝利点|サイコロ方式|破棄制限|発展カード山札|友好的な盗賊|開始時にランダムマップ|タイマー速度|準備完了|未準備|ゲーム開始|閉じる|送信|ルール|クラシック|航海者`,
    ko: `언어|언어 선택|뒤로|사용자 이름|비밀번호|로그인|계정 만들기|비밀번호를 잊으셨나요?|계정 관리|친구|게임 유형 변경|플레이어 통계|게임 기록|로그아웃|랭크 게임|일반 게임|캐주얼 · AI 대전|로비|게임 설정|플레이어 수|맵|승리 점수|주사위 방식|버리기 제한|개발 카드 덱|친절한 도적|시작 시 무작위 맵|타이머 속도|준비됨|준비 안 됨|게임 시작|닫기|보내기|규칙|클래식|항해자`,
    id: `Bahasa|Pilih bahasa|Kembali|Nama pengguna|Kata sandi|Masuk|Buat akun|Lupa kata sandi?|Kelola akun|Teman|Ganti mode permainan|Statistik pemain|Riwayat permainan|Keluar|Permainan berperingkat|Permainan tanpa peringkat|Permainan santai · lawan AI|Lobi|Pengaturan permainan|Jumlah pemain|Peta|Poin untuk menang|Algoritma dadu|Batas buang kartu|Dek pengembangan|Perampok ramah|Peta kejutan saat mulai|Kecepatan pewaktu|Siap|Belum siap|Mulai permainan|Tutup|Kirim|Aturan|Klasik|Pelaut`,
    vi: `Ngôn ngữ|Chọn ngôn ngữ|Quay lại|Tên người dùng|Mật khẩu|Đăng nhập|Tạo tài khoản|Quên mật khẩu?|Quản lý tài khoản|Bạn bè|Đổi chế độ chơi|Thống kê người chơi|Lịch sử ván chơi|Đăng xuất|Chơi xếp hạng|Chơi không xếp hạng|Chơi thường · đấu AI|Phòng chờ|Thiết lập trò chơi|Số người chơi|Bản đồ|Điểm để thắng|Thuật toán xúc xắc|Giới hạn bỏ bài|Bộ bài phát triển|Cướp thân thiện|Bản đồ bất ngờ lúc bắt đầu|Tốc độ hẹn giờ|Sẵn sàng|Chưa sẵn sàng|Bắt đầu trò chơi|Đóng|Gửi|Luật chơi|Cổ điển|Thủy thủ`,
    th: `ภาษา|เลือกภาษา|กลับ|ชื่อผู้ใช้|รหัสผ่าน|เข้าสู่ระบบ|สร้างบัญชี|ลืมรหัสผ่าน?|จัดการบัญชี|เพื่อน|เปลี่ยนโหมดเกม|สถิติผู้เล่น|ประวัติการเล่น|ออกจากระบบ|เกมจัดอันดับ|เกมไม่จัดอันดับ|เกมสบาย ๆ · สู้กับ AI|ล็อบบี้|ตั้งค่าเกม|จำนวนผู้เล่น|แผนที่|แต้มเพื่อชนะ|ระบบทอยลูกเต๋า|ขีดจำกัดการทิ้งไพ่|สำรับการพัฒนา|โจรเป็นมิตร|แผนที่สุ่มตอนเริ่ม|ความเร็วตัวจับเวลา|พร้อม|ยังไม่พร้อม|เริ่มเกม|ปิด|ส่ง|กฎ|คลาสสิก|นักเดินเรือ`,
    hu: `Nyelv|Nyelv kiválasztása|Vissza|Felhasználónév|Jelszó|Bejelentkezés|Fiók létrehozása|Elfelejtett jelszó?|Fiók kezelése|Barátok|Játékmód váltása|Játékosstatisztika|Játéknapló|Kijelentkezés|Rangsorolt játék|Rangsorolatlan játék|Könnyed játék · MI ellen|Előszoba|Játékbeállítások|Játékosok száma|Térkép|Győzelmi pontok|Dobókocka-algoritmus|Eldobási korlát|Fejlesztéskártya-pakli|Barátságos rabló|Meglepetéstérkép kezdéskor|Időzítő sebessége|Kész|Nem kész|Játék indítása|Bezárás|Küldés|Szabályok|Klasszikus|Tengerészek`,
    bg: `Език|Избор на език|Назад|Потребителско име|Парола|Вход|Създай акаунт|Забравена парола?|Управление на акаунта|Приятели|Смяна на режима|Статистика на играчите|История на игрите|Изход|Класирана игра|Некласирана игра|Свободна игра · срещу ИИ|Лоби|Настройки на играта|Брой играчи|Карта|Точки за победа|Алгоритъм на заровете|Лимит на изхвърляне|Тесте за развитие|Приятелски разбойник|Случайна карта в началото|Скорост на таймера|Готов|Не съм готов|Начало на играта|Затвори|Изпрати|Правила|Класически|Мореплаватели`,
    ms: `Bahasa|Pilih bahasa|Kembali|Nama pengguna|Kata laluan|Log masuk|Cipta akaun|Lupa kata laluan?|Urus akaun|Rakan|Tukar mod permainan|Statistik pemain|Sejarah permainan|Log keluar|Permainan berperingkat|Permainan tanpa kedudukan|Permainan santai · lawan AI|Lobi|Tetapan permainan|Bilangan pemain|Peta|Mata untuk menang|Algoritma dadu|Had buang kad|Dek pembangunan|Perompak mesra|Peta kejutan pada permulaan|Kelajuan pemasa|Sedia|Belum sedia|Mulakan permainan|Tutup|Hantar|Peraturan|Klasik|Pelaut`
  };
  const extras = {
    es: {
      'Off — no timers or timeout autoplay': 'Desactivado — sin temporizadores ni acciones automáticas por tiempo',
      'Fast (½ time)': 'Rápido (½ tiempo)', 'Normal': 'Normal', 'Slow (2× time)': 'Lento (2× tiempo)',
      'Generate New Map': 'Generar mapa nuevo', 'Save Settings Template': 'Guardar plantilla', 'Load Game Template': 'Cargar plantilla',
      'Base resources per type': 'Recursos iniciales por tipo', 'Easy': 'Fácil', 'Medium': 'Medio', 'Hard': 'Difícil', 'Expert': 'Experto',
      'AI players difficulty': 'Dificultad de IA', 'Select a board size.': 'Elige un tamaño de tablero.',
      'Game Rules': 'Reglas del juego', 'Back to Lobby': 'Volver a la sala', 'Game Panels': 'Paneles de juego',
      'Dice Stats': 'Estadísticas de dados', 'Refresh': 'Actualizar', 'Friends only': 'Solo amigos',
      'Your username': 'Tu usuario', 'Your password': 'Tu contraseña', 'Show': 'Mostrar',
      'Welcome to Hex Settlers': 'Bienvenido a Hex Settlers', 'Start a new adventure': 'Comienza una nueva aventura',
      'How do you want to play?': '¿Cómo quieres jugar?', 'Choose your adventure': 'Elige tu aventura',
      'Admin Management': 'Administración', 'Create your account': 'Crea tu cuenta',
      'Generate New Map': 'Generar nuevo mapa', 'Map preview': 'Vista previa del mapa',
      'Game Tools': 'Herramientas de juego', 'Create Lobby': 'Crear sala', 'Join Lobby': 'Unirse a la sala',
      'Ranked': 'Clasificatoria', 'Unranked': 'No clasificatoria', 'Casual': 'Casual',
      'Download Pack': 'Descargar paquete', 'Upload Pack': 'Subir paquete', 'Delete Pack': 'Eliminar paquete'
    },
    fr: {
      'Off — no timers or timeout autoplay': 'Désactivé — sans chronomètres ni actions automatiques',
      'Fast (½ time)': 'Rapide (½ temps)', 'Slow (2× time)': 'Lent (2× temps)',
      'Generate New Map': 'Générer une carte', 'Save Settings Template': 'Enregistrer le modèle', 'Load Game Template': 'Charger un modèle',
      'Base resources per type': 'Ressources initiales par type', 'Easy': 'Facile', 'Medium': 'Moyen', 'Hard': 'Difficile', 'Expert': 'Expert',
      'AI players difficulty': 'Difficulté de l’IA', 'Game Rules': 'Règles du jeu', 'Back to Lobby': 'Retour au salon',
      'Game Panels': 'Panneaux de jeu', 'Dice Stats': 'Statistiques des dés', 'Refresh': 'Actualiser', 'Friends only': 'Amis seulement',
      'Your username': 'Votre identifiant', 'Your password': 'Votre mot de passe', 'Show': 'Afficher',
      'Welcome to Hex Settlers': 'Bienvenue dans Hex Settlers', 'Start a new adventure': 'Commencer une aventure',
      'How do you want to play?': 'Comment voulez-vous jouer ?', 'Choose your adventure': 'Choisissez votre aventure',
      'Admin Management': 'Administration', 'Create your account': 'Créez votre compte', 'Map preview': 'Aperçu de la carte',
      'Game Tools': 'Outils du jeu', 'Download Pack': 'Télécharger le pack', 'Upload Pack': 'Importer un pack', 'Delete Pack': 'Supprimer le pack'
    },
    de: {
      'Off — no timers or timeout autoplay': 'Aus — keine Timer oder automatischen Zeitaktionen',
      'Fast (½ time)': 'Schnell (½ Zeit)', 'Slow (2× time)': 'Langsam (2× Zeit)',
      'Generate New Map': 'Neue Karte erstellen', 'Save Settings Template': 'Vorlage speichern', 'Load Game Template': 'Vorlage laden',
      'Base resources per type': 'Startressourcen je Sorte', 'Easy': 'Einfach', 'Medium': 'Mittel', 'Hard': 'Schwer', 'Expert': 'Experte',
      'AI players difficulty': 'KI-Schwierigkeit', 'Game Rules': 'Spielregeln', 'Back to Lobby': 'Zurück zur Lobby',
      'Game Panels': 'Spielbereiche', 'Dice Stats': 'Würfelstatistik', 'Refresh': 'Aktualisieren', 'Friends only': 'Nur Freunde',
      'Your username': 'Dein Benutzername', 'Your password': 'Dein Passwort', 'Show': 'Anzeigen',
      'Welcome to Hex Settlers': 'Willkommen bei Hex Settlers', 'Start a new adventure': 'Neues Abenteuer beginnen',
      'How do you want to play?': 'Wie möchtest du spielen?', 'Choose your adventure': 'Wähle dein Abenteuer',
      'Admin Management': 'Administration', 'Create your account': 'Konto erstellen', 'Map preview': 'Kartenvorschau',
      'Game Tools': 'Spielwerkzeuge', 'Download Pack': 'Paket herunterladen', 'Upload Pack': 'Paket hochladen', 'Delete Pack': 'Paket löschen'
    },
    pt: {
      'Off — no timers or timeout autoplay': 'Desligado — sem cronômetros nem ações automáticas por tempo',
      'Fast (½ time)': 'Rápido (½ tempo)', 'Slow (2× time)': 'Lento (2× tempo)',
      'Generate New Map': 'Gerar novo mapa', 'Save Settings Template': 'Salvar modelo', 'Load Game Template': 'Carregar modelo',
      'Base resources per type': 'Recursos iniciais por tipo', 'Easy': 'Fácil', 'Medium': 'Médio', 'Hard': 'Difícil', 'Expert': 'Especialista',
      'AI players difficulty': 'Dificuldade da IA', 'Game Rules': 'Regras do jogo', 'Back to Lobby': 'Voltar à sala',
      'Game Panels': 'Painéis do jogo', 'Dice Stats': 'Estatísticas dos dados', 'Refresh': 'Atualizar', 'Friends only': 'Só amigos',
      'Your username': 'Seu nome de usuário', 'Your password': 'Sua senha', 'Show': 'Mostrar',
      'Welcome to Hex Settlers': 'Bem-vindo ao Hex Settlers', 'Start a new adventure': 'Comece uma aventura',
      'How do you want to play?': 'Como você quer jogar?', 'Choose your adventure': 'Escolha sua aventura',
      'Admin Management': 'Administração', 'Create your account': 'Crie sua conta', 'Map preview': 'Prévia do mapa',
      'Game Tools': 'Ferramentas do jogo', 'Download Pack': 'Baixar pacote', 'Upload Pack': 'Enviar pacote', 'Delete Pack': 'Excluir pacote'
    },
    it: {
      'Off — no timers or timeout autoplay': 'Disattivato — senza timer né azioni automatiche',
      'Fast (½ time)': 'Veloce (½ tempo)', 'Slow (2× time)': 'Lento (2× tempo)',
      'Generate New Map': 'Genera nuova mappa', 'Save Settings Template': 'Salva modello', 'Load Game Template': 'Carica modello',
      'Base resources per type': 'Risorse iniziali per tipo', 'Easy': 'Facile', 'Medium': 'Medio', 'Hard': 'Difficile', 'Expert': 'Esperto',
      'AI players difficulty': 'Difficoltà IA', 'Game Rules': 'Regole del gioco', 'Back to Lobby': 'Torna alla lobby',
      'Game Panels': 'Pannelli di gioco', 'Dice Stats': 'Statistiche dadi', 'Refresh': 'Aggiorna', 'Friends only': 'Solo amici',
      'Your username': 'Il tuo nome utente', 'Your password': 'La tua password', 'Show': 'Mostra',
      'Welcome to Hex Settlers': 'Benvenuto in Hex Settlers', 'Start a new adventure': 'Inizia una nuova avventura',
      'How do you want to play?': 'Come vuoi giocare?', 'Choose your adventure': 'Scegli la tua avventura',
      'Admin Management': 'Amministrazione', 'Create your account': 'Crea il tuo account', 'Map preview': 'Anteprima mappa',
      'Game Tools': 'Strumenti di gioco', 'Download Pack': 'Scarica pacchetto', 'Upload Pack': 'Carica pacchetto', 'Delete Pack': 'Elimina pacchetto'
    },
    zh: {'Off — no timers or timeout autoplay':'关闭 — 不计时或超时自动操作','Fast (½ time)':'快速（半时长）','Slow (2× time)':'慢速（双倍时间）','Generate New Map':'生成新地图','Save Settings Template':'保存设置模板','Load Game Template':'载入模板','Base resources per type':'每类初始资源','Easy':'简单','Medium':'中等','Hard':'困难','Expert':'专家','AI players difficulty':'AI 难度','Game Rules':'游戏规则','Back to Lobby':'返回大厅','Refresh':'刷新','Your username':'你的用户名','Your password':'你的密码','Welcome to Hex Settlers':'欢迎来到 Hex Settlers','How do you want to play?':'你想玩哪种模式？','Game Panels':'游戏面板','Dice Stats':'骰子统计'},
    ja: {'Off — no timers or timeout autoplay':'オフ — 時間切れの自動操作なし','Fast (½ time)':'速い（半分）','Slow (2× time)':'遅い（2倍）','Generate New Map':'新しいマップを生成','Save Settings Template':'設定を保存','Load Game Template':'設定を読み込む','Base resources per type':'資源ごとの初期数','Easy':'簡単','Medium':'普通','Hard':'難しい','Expert':'エキスパート','AI players difficulty':'AIの難易度','Game Rules':'ゲームルール','Back to Lobby':'ロビーへ戻る','Refresh':'更新','Your username':'ユーザー名','Your password':'パスワード','Welcome to Hex Settlers':'Hex Settlersへようこそ','How do you want to play?':'どのモードで遊びますか？','Game Panels':'ゲームパネル','Dice Stats':'サイコロ統計'},
    ko: {'Off — no timers or timeout autoplay':'끔 — 시간 초과 자동 행동 없음','Fast (½ time)':'빠름 (절반)','Slow (2× time)':'느림 (2배)','Generate New Map':'새 맵 생성','Save Settings Template':'설정 템플릿 저장','Load Game Template':'템플릿 불러오기','Base resources per type':'자원별 초기 수량','Easy':'쉬움','Medium':'보통','Hard':'어려움','Expert':'전문가','AI players difficulty':'AI 난이도','Game Rules':'게임 규칙','Back to Lobby':'로비로 돌아가기','Refresh':'새로고침','Your username':'사용자 이름','Your password':'비밀번호','Welcome to Hex Settlers':'Hex Settlers에 오신 것을 환영합니다','How do you want to play?':'어떤 모드로 플레이할까요?','Game Panels':'게임 패널','Dice Stats':'주사위 통계'},
    ru: {'Off — no timers or timeout autoplay':'Выкл. — без таймеров и автоходов по времени','Fast (½ time)':'Быстро (½ времени)','Slow (2× time)':'Медленно (2× времени)','Generate New Map':'Создать новую карту','Save Settings Template':'Сохранить шаблон','Load Game Template':'Загрузить шаблон','Base resources per type':'Начальные ресурсы каждого типа','Easy':'Легко','Medium':'Средне','Hard':'Сложно','Expert':'Эксперт','AI players difficulty':'Сложность ИИ','Game Rules':'Правила игры','Back to Lobby':'Назад в лобби','Refresh':'Обновить','Your username':'Ваше имя','Your password':'Ваш пароль','Welcome to Hex Settlers':'Добро пожаловать в Hex Settlers','How do you want to play?':'Как хотите играть?','Game Panels':'Игровые панели','Dice Stats':'Статистика кубиков'}
  };
  // v51 browser preview and click-to-copy labels.  English remains fallback.
  const lobbyLabels = {
    es: ['Ocultar mapa','Mostrar mapa','Haz clic para copiar','Enlace directo para unirse','Código de sala'],
    fr: ['Masquer la carte','Afficher la carte','Cliquer pour copier','Lien direct pour rejoindre','Code du salon'],
    de: ['Karte ausblenden','Karte anzeigen','Zum Kopieren klicken','Direkter Beitrittslink','Raumcode'],
    pt: ['Ocultar mapa','Mostrar mapa','Clique para copiar','Link direto para entrar','Código da sala'],
    it: ['Nascondi mappa','Mostra mappa','Clicca per copiare','Link diretto per entrare','Codice stanza'],
    nl: ['Kaart verbergen','Kaart tonen','Klik om te kopiëren','Directe deelnamelink','Kamercode'],
    pl: ['Ukryj mapę','Pokaż mapę','Kliknij, aby skopiować','Bezpośredni link do gry','Kod pokoju'],
    sv: ['Dölj karta','Visa karta','Klicka för att kopiera','Direktlänk till rummet','Rumskod'],
    da: ['Skjul kort','Vis kort','Klik for at kopiere','Direkte link til rummet','Rumkode'],
    no: ['Skjul kart','Vis kart','Klikk for å kopiere','Direktelenke til rommet','Romkode'],
    fi: ['Piilota kartta','Näytä kartta','Kopioi napsauttamalla','Suora liittymislinkki','Huonekoodi'],
    cs: ['Skrýt mapu','Zobrazit mapu','Kliknutím zkopírovat','Přímý odkaz pro připojení','Kód místnosti'],
    ro: ['Ascunde harta','Arată harta','Apasă pentru a copia','Link direct de intrare','Codul camerei'],
    el: ['Απόκρυψη χάρτη','Εμφάνιση χάρτη','Κλικ για αντιγραφή','Άμεσος σύνδεσμος εισόδου','Κωδικός δωματίου'],
    tr: ['Haritayı gizle','Haritayı göster','Kopyalamak için tıkla','Doğrudan katılım bağlantısı','Oda kodu'],
    ru: ['Скрыть карту','Показать карту','Нажмите, чтобы скопировать','Прямая ссылка для входа','Код комнаты'],
    uk: ['Сховати карту','Показати карту','Натисніть, щоб скопіювати','Пряме посилання для входу','Код кімнати'],
    ar: ['إخفاء الخريطة','إظهار الخريطة','انقر للنسخ','رابط الانضمام المباشر','رمز الغرفة'],
    he: ['הסתר מפה','הצג מפה','לחץ להעתקה','קישור ישיר להצטרפות','קוד חדר'],
    hi: ['नक्शा छिपाएँ','नक्शा दिखाएँ','कॉपी करने के लिए क्लिक करें','सीधे जुड़ने का लिंक','रूम कोड'],
    zh: ['隐藏地图','显示地图','点击复制','直接加入链接','房间代码'],
    ja: ['マップを隠す','マップを表示','クリックしてコピー','直接参加リンク','ルームコード'],
    ko: ['지도 숨기기','지도 보기','클릭하여 복사','바로 참가 링크','방 코드'],
    id: ['Sembunyikan peta','Tampilkan peta','Klik untuk menyalin','Tautan bergabung langsung','Kode ruang'],
    vi: ['Ẩn bản đồ','Hiện bản đồ','Nhấp để sao chép','Liên kết tham gia trực tiếp','Mã phòng'],
    th: ['ซ่อนแผนที่','แสดงแผนที่','คลิกเพื่อคัดลอก','ลิงก์เข้าร่วมโดยตรง','รหัสห้อง'],
    hu: ['Térkép elrejtése','Térkép megjelenítése','Kattints a másoláshoz','Közvetlen csatlakozási link','Szobakód'],
    bg: ['Скрий картата','Покажи картата','Щракни за копиране','Директен линк за присъединяване','Код на стаята'],
    ms: ['Sembunyikan peta','Tunjukkan peta','Klik untuk salin','Pautan masuk terus','Kod bilik']
  };
  const lobbyLabelKeys = ['Hide Map','Show Map','Click to copy','Direct join link','Room code'];
  const dictionaries = {};
  for (const [lang, row] of Object.entries(rows)) {
    const values = row.split('|');
    if (values.length !== keys.length) {
      console.error(`Incomplete ${lang} language pack: ${values.length}/${keys.length}`);
      continue;
    }
    dictionaries[lang] = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
    // Additional game-wide labels are loaded before this module.  Keep curated
    // v50/v51 translations as the final override where both packs overlap.
    Object.assign(dictionaries[lang], window.HexSettlersLocaleExpansion?.[lang] || {});
    Object.assign(dictionaries[lang], extras[lang] || {});
    if (lobbyLabels[lang]) Object.assign(dictionaries[lang], Object.fromEntries(lobbyLabelKeys.map((key, index) => [key, lobbyLabels[lang][index]])));
  }
  const supported = Object.keys(languageNames).filter(l => l === 'en' || dictionaries[l]);
  let active = 'en';
  try { const saved = localStorage.getItem(KEY); if (supported.includes(saved)) active = saved; } catch (_) {}
  const textRecords = new WeakMap();
  const attributeRecords = new WeakMap();
  const translatableAttrs = ['placeholder', 'title', 'aria-label', 'alt'];
  // Chat, player names, user-selected labels, and the room code are user data.
  // Never translate them even if they happen to match a dictionary entry.
  const excluded = 'script,style,textarea,code,pre,[data-i18n-skip],.chatRow,.chatBody,.chatMeta,.resSummaryName,.roomCodeValue,.friendName,.playerName';
  // Keep the original English as a reversible source.  Do not modify messages
  // sent to the game server or attempt to guess/transliterate player content.
  const aliases = Object.freeze({
    'Game panels': 'Game Panels', 'game panels': 'Game Panels',
    'Not Ready': 'Unready', 'Game log': 'Game Log', 'Victory points': 'Victory Point',
    'Paused': 'Pause', 'Pause game': 'Pause', 'Resume game': 'Play',
    'Off': 'Off', 'Auto': 'Automatic', 'Your turn': 'Your Turn',
    'Victory': 'Victory!', 'No Dev Cards': 'No development cards.',
    'Start game': 'Start Game', 'Trade with Bank': 'Bank Trade',
    'Your Roll': 'YOUR ROLL', 'Exit replay': 'Exit Replay',
    'Resources Gained': 'Gained', 'Resources Lost': 'Lost'
  });
  // Only translate these explicit numeric UI status prefixes; never treat a
  // dynamic username or free-form chat text as a translation template.
  const numericLabels = new Set([
    'Ranked rating', 'Unranked rating', 'Remaining in deck',
    'Turn', 'Turns', 'Games', 'Wins', 'Roads', 'Ships', 'Trades',
    'CARDS', 'DEV', 'VP', 'KP', 'LR', 'Spectators', 'Players'
  ]);
  function translated(s) {
    const dict = dictionaries[active];
    if (!dict || !s) return s;
    const exact = dict[s] || (aliases[s] && dict[aliases[s]]);
    if (exact) return exact;
    const boardSize = /^([1-9](?:[-–][1-9])?) Player$/.exec(s);
    if (boardSize && dict.Players && dict.Player) return `${boardSize[1]} ${boardSize[1] === '1' ? dict.Player : dict.Players}`;
    const match = /^([A-Za-z][A-Za-z ]{0,30}):\s*([0-9—][0-9.,/%+\-]*)$/.exec(s);
    if (match && numericLabels.has(match[1]) && dict[match[1]]) {
      return `${dict[match[1]]}: ${match[2]}`;
    }
    return s;
  }
  function format(key, fields = {}) {
    return translated(key).replace(/\{([a-z][a-z0-9_]*)\}/gi, (full, name) =>
      Object.prototype.hasOwnProperty.call(fields, name) ? String(fields[name]) : full);
  }
  function updateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || node.parentElement?.closest(excluded)) return;
    let record = textRecords.get(node);
    if (!record) { record = { source: node.nodeValue, output: node.nodeValue }; textRecords.set(node, record); }
    else if (node.nodeValue !== record.output) record.source = node.nodeValue; // app replaced dynamic text
    const match = /^([\s\u00a0]*)([\s\S]*?)([\s\u00a0]*)$/.exec(record.source || '');
    if (!match || !match[2]) return;
    const output = match[1] + translated(match[2]) + match[3];
    record.output = output;
    if (node.nodeValue !== output) node.nodeValue = output;
  }
  function updateAttributes(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || el.closest(excluded)) return;
    let rec = attributeRecords.get(el);
    if (!rec) { rec = Object.create(null); attributeRecords.set(el, rec); }
    for (const attr of translatableAttrs) {
      if (!el.hasAttribute(attr)) continue;
      const value = el.getAttribute(attr);
      if (!rec[attr] || value !== rec[attr].output) rec[attr] = { source: value, output: value };
      const output = translated(rec[attr].source);
      rec[attr].output = output;
      if (value !== output) el.setAttribute(attr, output);
    }
  }
  function localize(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) return updateTextNode(root);
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) updateAttributes(root);
    if (root.nodeType === Node.ELEMENT_NODE && root.matches(excluded)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) updateTextNode(node);
      else updateAttributes(node);
    }
  }
  function setLanguage(lang) {
    if (!supported.includes(lang)) return;
    active = lang;
    try { localStorage.setItem(KEY, lang); } catch (_) {}
    document.documentElement.lang = lang;
    // Keep game layout in its original direction; Arabic/Hebrew text will still render RTL.
    document.documentElement.dir = 'ltr';
    localize(document.body);
    renderChoices();
    window.dispatchEvent(new CustomEvent('hexsettlers:languagechange', { detail: { language: active } }));
  }
  function renderChoices() {
    const grid = document.getElementById('languageGrid');
    if (!grid) return;
    grid.replaceChildren();
    const frag = document.createDocumentFragment();
    for (const code of supported) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn languageChoice' + (active === code ? ' selected' : '');
      btn.setAttribute('aria-pressed', code === active ? 'true' : 'false');
      btn.textContent = `${languageNames[code]} ${active === code ? '✓' : ''}`;
      btn.addEventListener('click', () => setLanguage(code));
      frag.appendChild(btn);
    }
    grid.appendChild(frag);
  }
  function openLanguagePage() {
    document.getElementById('accountMenu')?.classList.add('hidden');
    document.getElementById('languagePage')?.classList.remove('hidden');
    renderChoices();
    localize(document.getElementById('languagePage'));
  }
  function closeLanguagePage() { document.getElementById('languagePage')?.classList.add('hidden'); }
  window.HexSettlersLanguages = Object.freeze({ setLanguage, getLanguage: () => active, supported: [...supported], localize, t: translated, format, getCoverage: () => Object.fromEntries(supported.filter(l => l !== 'en').map(l => [l, Object.keys(dictionaries[l]).length])) });
  function init() {
    document.getElementById('loginLanguageBtn')?.addEventListener('click', openLanguagePage);
    document.getElementById('accountLanguageBtn')?.addEventListener('click', openLanguagePage);
    document.getElementById('languagePageBackBtn')?.addEventListener('click', closeLanguagePage);
    renderChoices();
    localize(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') updateTextNode(record.target);
        else if (record.type === 'attributes') updateAttributes(record.target);
        else for (const node of record.addedNodes) localize(node);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: translatableAttrs });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
