# Evolution Lab — aktualny raport decyzyjny

**Data aktualizacji:** 2026-07-29

**Status:** M1–M4 ukończone i zweryfikowane; G2-P jest następną bramką
**Kierunek:** ciągła symulacja ewolucji inspirowana BoxCar2D

## 1. Decyzja właściciela

Właściciel odrzucił ręczną pętlę „Hodowcy jednej linii”. Oczekiwane doświadczenie:

> Użytkownik wprowadza ustawienia, uruchamia automatyczną ewolucję i obserwuje kolejne iteracje przez dowolny czas, który sam wybierze.

Produkt nie ma wymagać decyzji co pokolenie ani kończyć się po ustalonym limicie. Użytkownik kontroluje konfigurację i sposób obserwacji, a system automatycznie wykonuje selekcję, krzyżowanie, mutację i następne pokolenia.

## 2. Zaakceptowany zakres v0

- długi, deterministyczny teren generowany z seedu;
- geometryczny genom o stałej topologii;
- dokładnie dwa koła;
- automatyczna populacja początkowa;
- automatyczny ranking i dobór dwóch rodziców;
- proste krzyżowanie, mutacja i konfigurowalne elity;
- ustawienia: seed, populacja, częstość mutacji, siła mutacji i liczba elit;
- ustawienia zamrożone w obrębie przebiegu;
- kolejne pokolenia bez globalnego limitu;
- start, pauza, wznowienie, przyspieszenie, tryb bez renderowania i stop;
- aktualny pojazd, pokolenie, żywe pojazdy i dystans;
- najlepszy oraz średni wynik i wykres;
- replay najlepszego pojazdu;
- brak trwałego zapisu populacji w pierwszej wersji.

## 3. Wynik G0-P

Pierwszy storyboard z ręcznym wyborem reproduktora wykazał:

- sam wybór pojazdu był zrozumiały;
- jedna mała iteracja dawała zbyt mało materiału do obserwacji;
- oczekiwana wartość leży w wielu automatycznych iteracjach;
- fantazja ręcznego hodowcy nie odpowiada głównej intencji.

Werdykt: **pivot zaakceptowany; pass do przygotowania T0 dla nowej pętli**.

Pełny zapis: [playtests/G0_P_RESULT_01.md](playtests/G0_P_RESULT_01.md).

## 4. Co zostało zastąpione

| Wcześniejsze założenie | Aktualna decyzja |
|---|---|
| Ręczny wybór reproduktora | Automatyczny dobór rodziców |
| Jedna prowadzona linia | Cała populacja ewoluuje autonomicznie |
| Trzy profile zmian | Częstość i siła mutacji jako ustawienia |
| Chroniona kopia | Konfigurowalna liczba elit |
| Limit 8–10 pokoleń | Brak globalnego limitu |
| Meta lub porażka | Maksymalny dystans i trend pokoleń |
| Stała skończona trasa | Długi teren generowany z seedu |
| Ręczna decyzja jako główna sprawczość | Konfiguracja i kontrola obserwacji |

## 5. Zakres świadomie odłożony

- ręczny wybór rodziców;
- edytor;
- zmienna liczba kół;
- zmienna topologia;
- wiele typów świata;
- zmiana ustawień w trwającym przebiegu;
- zapis i wznowienie pełnej populacji;
- kampania i meta-progresja;
- porównanie wielu przebiegów;
- backend i funkcje społecznościowe;
- obowiązkowa warstwa edukacyjna.

## 6. Najważniejsze ryzyka

1. Automatyczny przebieg jest atrakcyjny przez kilka minut, ale szybko staje się ekranem oczekiwania.
2. Geometryczny genom generuje zbyt wiele nieważnych albo podobnych pojazdów.
3. Długi teren daje przewagę jednej cesze i prowadzi do stagnacji.
4. Przyspieszenie bez renderowania nie daje wystarczającej różnicy wydajności.
5. Replay albo UI wpływa na kolejność RNG i wynik ewolucji.
6. Wymóg determinizmu prowadzi do technologii, która utrudnia game feel.
7. Zakres rośnie do pełnego klona BoxCar2D zamiast ograniczonego v0.

Pełny rejestr: [RISK_REGISTER.md](RISK_REGISTER.md).

## 7. Decyzje właściciela

| ID | Decyzja | Stan |
|---|---|---|
| D-01 | Główny cel | **Zdecydowane:** ciągła obserwacja autonomicznej ewolucji |
| D-02 | Interakcja co pokolenie | **Zdecydowane:** brak obowiązkowej interakcji |
| D-03 | Koniec przebiegu | **Zdecydowane:** wyłącznie decyzja użytkownika |
| D-04 | Świat | **Zdecydowane:** długi teren deterministyczny z seedu |
| D-05 | Genom v0 | **Zdecydowane:** geometryczny, stała topologia, dwa koła |
| D-06 | Platforma | **Zdecydowane:** kierunek browser-first; Godot wykluczony decyzją właściciela |
| D-07 | Zakres powtarzalności | **Zdecydowane:** ten sam zachowany build i runtime; brak cross-platform exact |
| D-08 | Automatyczna reprodukcja | **Zdecydowane:** elity, dwóch rodziców, proste krzyżowanie i mutacja |
| D-09 | Parametry dostępne użytkownikowi | **Zdecydowane:** seed, populacja, mutacja i elity |
| D-10 | Zmiana konfiguracji na żywo | **Poza v0:** nowy przebieg po zmianie |
| D-11 | Zgoda na T0 | **Udzielona; T0 zakończone** |
| D-12 | Zgoda na kod produkcyjny | **Udzielona:** G1 GO dla M1–M4 |
| D-13 | Adapter fizyki | **Zdecydowane:** Planck.js 1.5.0 |
| D-14 | Budżety M1–M4 | **Zdecydowane:** zatwierdzone bez zmian |
| D-15 | Stos produkcyjny | **Zdecydowane:** TypeScript strict, Vite, DOM + Canvas 2D + SVG, Vitest |

## 8. Wynik T0, G1 i implementacja

T0 porównało Rapier2D 0.19.3 i Planck.js 1.5.0 na trzech seedach. Oba
adaptery przeszły bramki powtarzalności, render invariance, stabilności i
sterowania. Planck.js uzyskał około 60% wyższą medianę przepustowości
headless oraz prostszy profil dystrybucji bez osobnego WASM.

Pełny wynik: [t0/T0_BROWSER_RESULT.md](t0/T0_BROWSER_RESULT.md).

Właściciel zatwierdził Planck.js 1.5.0. Decyzję zapisano w
[ADR-0001](adr/0001-use-planck-js-for-vehicle-physics.md).

Właściciel zatwierdził również D-07. Kontrakt zapisano w
[ADR-0002](adr/0002-bound-repeatability-to-same-build-and-runtime.md).

Właściciel zatwierdził
[budżety M1–M4](t0/T0_BUDGET_PROPOSAL.md) bez zmian. Decyzję zapisano w
[ADR-0003](adr/0003-accept-v0-performance-and-retention-budgets.md).

Właściciel udzielił GO w
[bramce G1](G1_IMPLEMENTATION_BRIEF.md). Decyzję zapisano w
[ADR-0004](adr/0004-approve-production-stack-and-m1-m4.md).

M1–M4 zostały zaimplementowane w jednym ciągu i przeszły testy, pomiary
budżetowe, build oraz browser QA. Pełny wynik:
[M1_M4_IMPLEMENTATION_REPORT.md](M1_M4_IMPLEMENTATION_REPORT.md).

Następną decyzją jest G2-P: playtest grywalnej wersji i wybór najwyżej jednego
dalszego kierunku.
