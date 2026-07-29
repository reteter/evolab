# Evolution Lab — zrozumienie jako warstwa drugorzędna

**Data aktualizacji:** 2026-07-29
**Status:** zasady pomocnicze; nie stanowią głównej pętli ani bramki akceptacji

## 1. Rola

Pierwszym celem jest wciągająca obserwacja automatycznych pokoleń. Użytkownik nie musi wybierać rodziców, zdawać testu ani przechodzić kursu.

Warstwa zrozumienia pomaga, gdy użytkownik chce wiedzieć:

- co oznacza dane ustawienie;
- dlaczego powstał konkretny pojazd;
- skąd wziął się przełom albo regres;
- dlaczego wynik zatrzymał się;
- czym różni się replay od ponownej symulacji.

## 2. Zasady

1. **Symulacja przed wyjaśnieniem.** Domyślna konfiguracja działa bez czytania instrukcji.
2. **Krótki opis ustawienia.** Każdy parametr mówi, co zwiększenie wartości zwykle zmienia, bez obietnicy wyniku.
3. **Szczegół na żądanie.** Genom, rodzice i mutacje nie zajmują głównego ekranu.
4. **Kontekst przy zjawisku.** Wyjaśnienie pojawia się przy rekordzie, stagnacji albo replayu.
5. **Brak egzaminowania.** Nie ma obowiązkowego quizu, teach-backu ani testu odroczonego.
6. **Brak teleologii.** System nie sugeruje, że ewolucja zna cel albo planuje konstrukcję.

## 3. Informacje podstawowe

Na głównym ekranie wystarczają:

- pokolenie;
- żywe pojazdy;
- bieżący i najlepszy dystans;
- średni wynik;
- konfiguracja przebiegu;
- status tempa.

## 4. Informacje opcjonalne

Widok szczegółowy może pokazać:

- genom pojazdu;
- rodziców;
- źródło cech po krzyżowaniu;
- mutacje;
- informację, czy pojazd jest elitą;
- pokolenie ustanowienia rekordu;
- ograniczenie wniosku do jednego świata.

## 5. Zjawiska warte krótkiego komentarza

- rekord po wielu pokoleniach stagnacji;
- spadek średniej przy wzroście najlepszego wyniku;
- dominacja jednej linii;
- wysoka mutacja niszcząca dobre konstrukcje;
- niska mutacja spowalniająca zmianę;
- skuteczny, lecz dziwnie wyglądający pojazd;
- różnica między normalnym i szybkim trybem bez różnicy wyniku.

## 6. Czego nie pokazujemy domyślnie

- pełnego drzewa pochodzenia;
- wszystkich mutacji całej populacji;
- formalnego wykładu o selekcji;
- porównań wielu seedów;
- metodologii eksperymentu;
- definicji przed pierwszym uruchomieniem.

## 7. Dostępność

- Pause, wznowienie i kontrola tempa.
- Reduced motion.
- Szybki tryb może całkowicie ukryć animację.
- Główny przepływ działa z klawiatury.
- Kolor jest redundantny.
- Wykres ma tabelę lub tekstowe podsumowanie.
- Status przebiegu jest komunikowany tekstem.

## 8. Możliwy późniejszy tryb laboratoryjny

Jeżeli po G2-P najważniejsze okażą się pytania „dlaczego?”, osobny tryb może dodać:

- porównanie konfiguracji;
- wiele sparowanych seedów;
- rozkłady genów i pochodzenie;
- zmianę pojedynczych parametrów;
- bardziej formalne objaśnienia.

Nie jest to ukryty zakres M1–M4.
