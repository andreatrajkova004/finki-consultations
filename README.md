🎓 ФИНКИ Консултации — Систем за резервација на консултации

Веб апликација за управување и резервирање на консултациски термини помеѓу професори и студенти на Факултетот за информатички науки и компјутерско инженерство (ФИНКИ).

Апликацијата овозможува модерно и ефикасно организирање на консултации преку календарски интерфејс и парцијално резервирање на времето.

👥 Автори
Име и презиме	Индекс
Ана Бањанска	233071
Андреа Трајкова	233176
Ангела Чурлинова	233205

Предмет: Напреден веб дизајн
Факултет: ФИНКИ — Факултет за информатички науки и компјутерско инженерство
Академска година: 2025/2026

📋 Опис на системот

ФИНКИ Консултации е веб апликација која овозможува управување со консултациски термини помеѓу професори и студенти.

За разлика од класичните системи за резервација, овој систем овозможува еден термин да биде поделен на повеќе временски сегменти, што значи дека повеќе студенти можат да резервираат дел од истиот термин.

Ова овозможува:

подобра искористеност на времето на професорите

подобра организација на консултациите

избегнување на метеж пред кабинетите

✨ Главни функционалности
👨‍🏫 Професор

Професорите можат да:

креираат термини за консултации

дефинираат датум, време, времетраење и локација

прегледуваат кои студенти резервирале термин

избришат постоечки термин

видат листа на сите резервации во десен панел

👩‍🎓 Студент

Студентите можат да:

прегледуваат достапни термини во неделен календарски приказ

филтрираат термини по професор

резервираат време во рамките на термин

изберат времетраење преку брзи копчиња:

10 мин
15 мин
20 мин
30 мин
45 мин
60 мин

откажат сопствена резервација

прегледуваат листа на свои резервации

⚙️ Користени технологии

Проектот е изграден со современи web технологии.

Технологија	Опис
React 18	Frontend библиотека за изградба на UI
Firebase Authentication	Систем за најава и регистрација
Cloud Firestore	NoSQL база на податоци во реално време
React Router 6	Навигација помеѓу страниците
date-fns 3	Манипулација со датуми
CSS3	Стилизација на интерфејс
🗄️ Структура на базата (Firestore)

Сите податоци се чуваат во колекцијата slots.

Секој документ претставува еден термин за консултација.

{
  "professorId": "uid",
  "professorName": "Проф. Петровски",
  "startTime": "2026-03-10T09:00:00",
  "endTime": "2026-03-10T11:00:00",
  "duration": 120,
  "location": "Кабинет 215",
  "notes": "Носете го проектот",
  "bookings": [
    {
      "studentId": "uid",
      "studentName": "Ана Бањанска",
      "startOffset": 0,
      "durationMins": 20,
      "bookedAt": "2026-03-09T10:00:00"
    }
  ]
}
 Алгоритам за парцијални резервации

Апликацијата користи алгоритам кој го наоѓа првото слободно место во слотот.

Чекори:

1️⃣ Се сортираат сите постоечки резервации
2️⃣ Се проверува дали постои празнина (gap) помеѓу резервациите
3️⃣ Ако има доволно простор → се резервира
4️⃣ Ако нема празнина → се проверува крајот на слотот

Пример:

Слот: 08:00 – 10:00

Студент A → 08:00 – 08:20
Студент B → 08:20 – 08:50

Преостанато време:

08:50 – 10:00
 Firebase Setup
1️⃣ Authentication

Firebase Console → Authentication → Get Started
Enable Email / Password

2️⃣ Firestore Database

Firebase Console → Firestore Database

Create database
Production mode
3️⃣ Firestore Rules

Firebase Console → Firestore → Rules

Постави ја содржината од:

firestore.rules
4️⃣ Firebase Config

// src/firebase/config.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCtZTym0c45zYK4cQreT5tE7mfdA6ctiJw",
  authDomain: "consultation-system-4e561.firebaseapp.com",
  projectId: "consultation-system-4e561",
  storageBucket: "consultation-system-4e561.firebasestorage.app",
  messagingSenderId: "649559918949",
  appId: "1:649559918949:web:db33f5da629e5f6618798c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
🚀 Стартување на проектот

Инсталирај ги зависностите:

npm install

Стартувај ја апликацијата:

npm start

Апликацијата ќе биде достапна на:

http://localhost:3000
Структура на проектот
finki-final3
│
├── documentation
│   └── FINKI_Konsultacii_Dokumentacija.docx
│
├── presentation
│   └── FINKI_Konsultacii_Prezentacija.pptx
│
├── public
│   └── index.html
│
├── src
│   ├── components
│   │   └── Navbar.js
│   │
│   ├── firebase
│   │   ├── AuthContext.js
│   │   └── config.js
│   │
│   ├── pages
│   │   ├── LoginPage.js
│   │   ├── ProfessorDashboard.js
│   │   └── StudentDashboard.js
│   │
│   ├── styles
│   │   └── main.css
│   │
│   ├── App.js
│   └── index.js
│
├── firebase.json
├── firestore.rules
├── package.json
├── package-lock.json
├── .gitignore
└── README.md

Презентацијата за проектот се наоѓа во:
presentation/FINKI_Konsultacii_Prezentacija.pptx

Целосната техничка документација за проектот се наоѓа во:
documentation/FINKI_Konsultacii_Dokumentacija.docx

🔒 Безбедност

Firestore Security Rules осигуруваат дека:

само логирани корисници можат да читаат податоци

само логирани корисници можат да креираат и ажурираат резервации

корисниците можат да го уредуваат само својот профил

📌 Заклучок

ФИНКИ Консултации претставува модерен систем за управување со консултациски термини кој значително ја подобрува комуникацијата помеѓу студентите и професорите.

Со користење на React и Firebase, апликацијата обезбедува:

брзо резервирање на консултации

подобра организација на времето

едноставен и интуитивен интерфејс
## GitHub Repository

Project repository:
https://github.com/andreatrajkova004/finki-consultations
