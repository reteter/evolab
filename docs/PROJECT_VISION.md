# Evolution Lab — wizja po G0-P

**Data aktualizacji:** 2026-07-29

**Status:** kierunek produktowy zaakceptowany przez właściciela
**Kierunek:** ciągła, autonomiczna ewolucja pojazdów inspirowana BoxCar2D
**Źródło bazowe:** [PROJECT_VISION.md](../PROJECT_VISION.md)

## Wizja

Evolution Lab ma być małą, grywalną symulacją, w której użytkownik ustawia warunki przebiegu, uruchamia autonomiczną ewolucję pojazdów i obserwuje kolejne pokolenia tak długo, jak chce.

Podstawowa obietnica:

> Ustawiam parametry, uruchamiam świat i patrzę, jak kolejne pokolenia coraz lepiej radzą sobie z terenem. Mogę zwolnić, przyspieszyć, zatrzymać przebieg i obejrzeć najlepszego pojazdu.

Nie ma obowiązkowej decyzji użytkownika co pokolenie ani końcowego limitu czasu. Główną przyjemnością jest obserwacja emergentnych konstrukcji, zmian wyniku, przełomów i stagnacji.

## Priorytet celów

1. **Wciągająca obserwacja ciągłej ewolucji.**
2. **Czytelny wpływ konfiguracji na zachowanie przebiegu.**
3. **Szybkie i stabilne wykonywanie wielu automatycznych pokoleń.**
4. Możliwość wskazania dalszego kierunku produktu.
5. Zrozumienie mechanizmu ewolucji jako efekt uboczny.
6. Nauka workflow agentowego jako osobna metryka procesu.

## Podstawowa pętla

1. Użytkownik ustawia seed, populację, częstość mutacji, siłę mutacji i liczbę elit.
2. Uruchamia nowy przebieg.
3. Populacja pojazdów wykonuje próby w tym samym świecie.
4. System automatycznie tworzy ranking, dobiera rodziców, krzyżuje i mutuje genomy.
5. Następne pokolenie rozpoczyna się bez decyzji użytkownika.
6. Użytkownik obserwuje pojazdy, wyniki i wykres pokoleń.
7. W dowolnym momencie może użyć pauzy, zmienić tempo, włączyć szybki tryb bez renderowania albo obejrzeć replay najlepszego.
8. Użytkownik sam zatrzymuje przebieg.

Konfiguracja jest zamrożona w obrębie przebiegu. Jej zmiana tworzy nowy przebieg, dzięki czemu obserwacja ma jednoznaczny kontekst.

## Ograniczona grywalna wersja

### Zakres obowiązkowy

- jeden typ świata: długi teren deterministycznie generowany z seedu;
- geometryczny genom o stałej topologii;
- dokładnie dwa koła;
- automatyczna populacja początkowa;
- automatyczny ranking, dobór dwóch rodziców, proste krzyżowanie i mutacja;
- konfigurowalne: seed, populacja, częstość mutacji, siła mutacji i liczba elit;
- pokolenia działające bez limitu do decyzji użytkownika;
- aktualny numer pokolenia, liczba żywych pojazdów i dystans;
- najlepszy oraz średni wynik pokolenia;
- wykres trendu;
- start, pauza, wznowienie, normalne tempo, przyspieszenie i tryb bez renderowania;
- replay najlepszego dotychczas pojazdu;
- stop i uruchomienie nowego przebiegu.

### Hipotezy do kalibracji

- liczebność populacji;
- liczba wierzchołków korpusu;
- sposób kodowania pozycji i rozmiaru kół;
- domyślna liczba elit;
- metoda i siła preferowania lepszych rodziców;
- operator krzyżowania;
- domyślna częstość i siła mutacji;
- warunek zakończenia pojedynczej próby;
- długość śladu replayu;
- tempo i sposób przełączania trybu bez renderowania.

## Kryteria sukcesu wersji kierunkowej

Wersja spełnia pierwszy cel, jeśli:

- użytkownik bez instrukcji potrafi skonfigurować i uruchomić przebieg;
- kolejne pokolenia powstają automatycznie bez ręcznej obsługi;
- użytkownik rozumie różnicę między pauzą, stopem i nowym przebiegiem;
- obserwacja nie jest zdominowana przez oczekiwanie;
- tryb szybki znacząco zwiększa tempo pokoleń;
- najlepszy pojazd i trend wyników są czytelne;
- replay najlepszego działa niezależnie od bieżącej próby;
- użytkownik chce pozostawić symulację na kolejne pokolenia albo rozpocząć nowy przebieg z inną konfiguracją;
- wynik playtestu wskazuje jeden dalszy kierunek.

## Poza zakresem

- ręczny wybór rodziców;
- „Hodowca jednej linii” jako obowiązkowy tryb;
- edytor pojazdu;
- zmienna liczba kół;
- zmienna topologia korpusu;
- kampania, ekonomia i przeciwnicy;
- wiele typów świata;
- zmiana parametrów w trakcie przebiegu;
- porównanie kilku przebiegów na jednym ekranie;
- zapis i wznowienie całej populacji;
- backend, konta, chmura i funkcje społecznościowe;
- obowiązkowy tutorial lub test wiedzy.

## Możliwe kierunki po wersji grywalnej

Po walidacji wybieramy najwyżej jeden kierunek:

1. więcej ustawień i kontrolowane porównania;
2. bogatszy genom albo zmienna liczba kół;
3. nowe światy i warunki fizyczne;
4. zapis, wznowienie i udostępnianie przebiegów;
5. opcjonalny tryb hodowcy;
6. warstwa laboratoryjna i głębsza inspekcja pochodzenia;
7. stop albo zmiana fenotypu.

Właściciel wykluczył Godot. Kierunkiem platformy jest lokalna aplikacja browser-first. Po porównaniu T0 właściciel zatwierdził Planck.js 1.5.0 jako adapter fizyki oraz powtarzalność w zachowanym buildzie i tym samym runtime, bez obietnicy cross-platform exact.
