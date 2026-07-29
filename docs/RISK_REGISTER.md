# Evolution Lab — rejestr ryzyk

**Data aktualizacji:** 2026-07-29
**Status:** zaktualizowany po M1–M4; aktywny dla playtestu G2-P

Skala: **P** — prawdopodobieństwo, **I** — wpływ; H/M/L.

| ID | Ryzyko | P | I | Wczesny sygnał | Redukcja / test | Bramka |
|---|---|---:|---:|---|---|---|
| R-01 | Symulacja szybko staje się ekranem oczekiwania | H | H | Użytkownik nie śledzi kolejnych pokoleń | Szybki tryb, czytelne rekordy, replay i wykres; playtest M4 | M3/M4 |
| R-02 | Pokolenia wykonują się zbyt wolno | L | H | P95 przekracza zatwierdzone 1,5 s dla populacji 20 | Budżet czasu pokolenia; headless; porcjowanie pracy | Monitor |
| R-03 | Szybki tryb zmienia wynik ewolucji | L | H | Inny ranking render on/off | Oddzielne domeny RNG, fixed timestep, test metamorficzny | Monitor |
| R-04 | UI blokuje się podczas ciągłego przebiegu | L | H | Pauza lub stop reagują z opóźnieniem | Porcjowanie pracy; worker dopiero po pomiarze | Monitor |
| R-05 | Geometryczny genom generuje nieważne pojazdy | L | H | Kolizje własne, brak kół, błędy solvera | Konstrukcyjnie poprawny wypukły fenotyp i testy zakresów | Monitor |
| R-06 | Większość pojazdów nie rusza | H | H | Populacje kończą próby przy starcie | Kalibracja zakresów, populacji i terenu na wielu seedach | T0/M1 |
| R-07 | Jedna cecha dominuje cały teren | M | H | Wszystkie linie zbiegają do skrajnego rozmiaru koła lub korpusu | Zróżnicowany seeded terrain, analiza rozkładów podczas kalibracji | M2 |
| R-08 | Ewolucja szybko traci różnorodność | H | M | Jedna linia opanowuje populację w kilku pokoleniach | Kalibracja elit, selekcji, krzyżowania i mutacji | M2 |
| R-09 | Krzyżowanie niszczy użyteczne konstrukcje | M | H | Potomstwo dwóch dobrych rodziców systematycznie nie działa | Porównać jednostajne i blokowe krzyżowanie | M2 |
| R-10 | Elity powodują stagnację | M | M | Rekord stoi, a genomy się ujednolicają | Ograniczyć domyślną liczbę elit; pokazać ustawienie | M2/M4 |
| R-11 | Ranking ma ukryty bias | M | H | Remisy lub kolejność ID wpływają na rodziców | Jawny tie-break, test rozkładu doboru | M2 |
| R-12 | Seed świata zależy od kolejności renderowania | M | H | Inny teren po zmianie tempa | Generowanie fragmentu wyłącznie z seedu i indeksu | T0/M1 |
| R-13 | Powtarzalność jest obiecana szerzej niż działa | L | H | Ten sam manifest daje inne potomstwo | ADR-0002, przypięte wersje, wektory RNG i test 10/10 | Monitor |
| R-14 | Późniejszy wymóg cross-platform exact unieważnia wybór Planck.js | L | H | Zakres wsparcia zostaje rozszerzony po G1 | D-07 wyklucza ten wymóg z v0; `Simulation Port`; nowa decyzja i T0 przy zmianie | G2 |
| R-15 | Wybór adaptera jest dopasowany do preferencji zamiast pomiaru | L | H | Kryteria zmieniają się po zobaczeniu prototypu | Zamrożone kryteria T0 i wynik pomiaru | Zamknięte |
| R-16 | Typy silnika przeciekają do ewolucji | L | H | Genom, ranking lub zapis używa uchwytów fizyki | Kanoniczne dane i `Simulation Port` | Monitor |
| R-17 | Historia wszystkich pokoleń wyczerpuje pamięć | L | H | Długi przebieg stale zwiększa zużycie RAM | Kompresowane agregaty i jeden ograniczony trace | Monitor |
| R-18 | Replay zaburza działający przebieg | L | H | Po replayu wynik lub RNG się zmienia | Replay z trace; pauza kontrolera; brak ponownej fizyki | Monitor |
| R-19 | Użytkownik nie rozumie, że zmiana ustawień resetuje przebieg | M | M | Przypadkowa utrata obserwacji | Zamrożona konfiguracja, jawne potwierdzenie nowego przebiegu | M3 |
| R-20 | Zakres rośnie do pełnego klona BoxCar2D | H | H | Dochodzą gęstości, liczba kół, edytor i wiele światów przed M4 | Twarda lista poza v0; G2-P przed rozszerzeniami | Każdy |
| R-21 | Animacja i wykres są niedostępne | M | H | Brak pauzy, reduced motion, klawiatury lub danych tekstowych | Dostępność od M1; tabela wyników | M1–M4 |
| R-22 | N=1 zostaje uznane za dowód rynku | H | H | Publiczne wnioski po playteście właściciela | Nazywać wynik wersją kierunkową; osobne badania później | G2-P |
| R-23 | Workflow agentowy steruje zakresem | M | H | Funkcje powstają „dla testu agentów” | Oddzielna scorecarda procesu | Każdy |

## Najważniejsze blokady

1. **R-01:** czy obserwacja pozostaje atrakcyjna po pierwszej nowości.
2. **R-06/R-07/R-08:** różnorodność, zdolność ruchu i stagnacja populacji.
3. **R-20:** ograniczenie zakresu mimo szerokiej inspiracji.
4. **R-22:** nieprzecenianie pojedynczego playtestu właściciela.

## Stan po M1–M4

- Budżety czasu, responsywności, FPS, transferu i pamięci są spełnione.
- Test 10/10 potwierdził powtarzalność; obserwator renderera nie zmienił wyniku.
- Długi browser QA przekroczył 1 700 pokoleń bez błędu i z przyrostem pamięci
  około 9,3 MB na 1 000 pokoleń.
- Ryzyka techniczne pozostają monitorowane, ale nie blokują G2-P.
- Główna niewiadoma jest teraz produktowa: chęć dalszej obserwacji i wybrany
  kierunek rozwoju.

## Ryzyka świadomie zaakceptowane w M1–M4

- Jedna rodzina terenu może z czasem się wyczerpać.
- Dokładnie dwa koła i stała topologia ograniczają różnorodność.
- Wynik na jednym świecie nie oznacza ogólnej jakości pojazdu.
- Brak zapisu populacji oznacza utratę przebiegu po zamknięciu.
- Ustawienia nie zmieniają się na żywo.
- Playtest właściciela daje sygnał kierunkowy, nie dowód rynku.

## Częstotliwość przeglądu

Rejestr aktualizuje się na G2-P i przy każdym późniejszym rozszerzeniu. Nowe
ryzyko musi mieć obserwowalny sygnał i działanie; sama możliwość nie uzasadnia
rozszerzenia zakresu.
