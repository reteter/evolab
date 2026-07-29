# Evolution Lab — PRD ciągłej symulacji

**Data aktualizacji:** 2026-07-29

**Status:** zakres M1–M4 zaimplementowany i zweryfikowany
**Odbiorca pierwszej wersji:** właściciel projektu

## 1. Cel dokumentu

PRD opisuje najmniejszą wersję inspirowaną BoxCar2D: użytkownik konfiguruje autonomiczny przebieg ewolucji pojazdów i obserwuje dowolną liczbę pokoleń.

Dokument nie jest backlogiem, nie wybiera technologii i nie upoważnia do kodu produkcyjnego.

## 2. Hipoteza produktu

> Obserwowanie automatycznych pokoleń geometrycznie zróżnicowanych pojazdów jest wystarczająco interesujące, aby użytkownik chciał pozostawić symulację działającą, przyspieszać ją, wracać do najlepszego wyniku i uruchamiać nowe konfiguracje.

Sprawczość użytkownika pochodzi z:

- konfiguracji przebiegu;
- kontroli czasu obserwacji;
- wyboru normalnego albo szybkiego trybu;
- inspekcji najlepszego pojazdu;
- decyzji o zatrzymaniu i uruchomieniu nowego przebiegu.

Użytkownik nie wybiera ręcznie rodziców.

## 3. Główny scenariusz

1. Użytkownik widzi domyślną konfigurację i opcjonalnie ją zmienia.
2. Uruchamia nowy przebieg.
3. Ogląda aktualny pojazd, numer pokolenia, liczbę żywych pojazdów i dystans.
4. Po zakończeniu populacji system automatycznie tworzy następne pokolenie.
5. Użytkownik obserwuje trend najlepszego i średniego wyniku.
6. Może użyć pauzy, wznowienia, przyspieszenia albo trybu bez renderowania.
7. Może przerwać bieżącą obserwację, obejrzeć replay najlepszego i wrócić do przebiegu.
8. Zatrzymuje przebieg, gdy sam uzna to za właściwe.
9. Może rozpocząć nowy przebieg z innym seedem lub konfiguracją.

## 4. Wymagania funkcjonalne

### R-01 — konfiguracja przebiegu

Przed startem dostępne są:

- seed świata i losowości;
- liczebność populacji;
- częstość mutacji;
- siła mutacji;
- liczba elit.

Konfiguracja ma wartości domyślne i krótkie opisy. Po starcie jest zamrożona. Zmiana dowolnej wartości wymaga jawnego rozpoczęcia nowego przebiegu.

### R-02 — świat

- Teren jest długi i deterministycznie generowany z seedu.
- Każdy pojazd danego przebiegu otrzymuje ten sam teren i warunki.
- Generowanie kolejnych fragmentów nie zależy od renderowania ani kolejności prób.
- Świat nie ma obowiązkowej mety; głównym wynikiem jest maksymalny postęp.
- W pierwszej wersji grawitacja i fizyczne parametry świata są stałe.

### R-03 — genom i pojazd

- Korpus ma geometryczny genom o stałej liczbie wierzchołków.
- Pojazd ma dokładnie dwa koła.
- Genom określa co najmniej geometrię korpusu, pozycję i rozmiar kół.
- Wszystkie genomy tworzą poprawny pojazd bez naprawy po rozpoczęciu próby.
- Kolor lub jasność może odzwierciedlać właściwości, ale nie niesie jedynej informacji.

### R-04 — próba

- Każdy pojazd zaczyna w tym samym stanie świata.
- Fixed timestep jest niezależny od FPS.
- Próba kończy się po stagnacji, trwałym wypadnięciu ze świata albo maksymalnym limicie kroków.
- Wynik podstawowy to maksymalny postęp.
- Pomocniczy tie-break może używać średniej prędkości lub krótszego czasu osiągnięcia dystansu.
- Szybkość prezentacji nie zmienia wyniku.

### R-05 — automatyczne pokolenia

Po ocenie populacji system:

1. tworzy stabilny ranking;
2. kopiuje skonfigurowaną liczbę elit;
3. automatycznie dobiera dwóch rodziców dla każdego pozostałego potomka;
4. wykonuje proste krzyżowanie;
5. stosuje mutację zgodnie z konfiguracją;
6. uruchamia następne pokolenie bez udziału użytkownika.

Dokładna polityka doboru i operator krzyżowania są kandydatami do kalibracji. Nie są ustawieniami v0.

### R-06 — ciągłość

- Nie istnieje globalny limit pokoleń.
- Przebieg trwa do użycia stopu przez użytkownika.
- Pauza zachowuje bieżący stan i pozwala wznowić.
- Stop kończy przebieg.
- Zamknięcie aplikacji nie musi umożliwiać wznowienia w v0.

### R-07 — tempo

Co najmniej trzy stany:

- normalna obserwacja z renderowaniem;
- przyspieszona obserwacja;
- szybkie obliczenia bez renderowania prób.

Zmiana tempa nie zmienia konfiguracji, kolejności RNG, potomstwa ani wyników.

### R-08 — prezentacja

Widoczne są:

- numer pokolenia;
- numer lub liczba pozostałych pojazdów bieżącej populacji;
- bieżący dystans;
- najlepszy wynik pokolenia i całego przebiegu;
- średni wynik pokolenia;
- aktualnie prezentowany pojazd;
- status: działa, pauza, szybki tryb, replay albo stop.

### R-09 — wykres

- Co najmniej najlepszy i średni wynik każdego ukończonego pokolenia.
- Wykres rośnie wraz z przebiegiem.
- Dane mają także tekstową lub tabelaryczną reprezentację.
- Rozbudowana analiza różnorodności jest poza v0.

### R-10 — replay najlepszego

- System zachowuje ślad najlepszego dotychczas pojazdu.
- Replay działa bez ponownego liczenia fizyki.
- Uruchomienie replayu pauzuje lub wizualnie odłącza bieżący przebieg.
- Po zakończeniu użytkownik wraca do poprzedniego stanu.
- Replay pokazuje genom, pokolenie i wynik najlepszego.

### R-11 — nowy przebieg

- Użytkownik może zatrzymać bieżący przebieg i wrócić do konfiguracji.
- Może zachować seed lub wygenerować nowy.
- Nowy przebieg rozpoczyna populację od zera.
- Poprzedni wynik może pozostać jako krótkie podsumowanie, ale trwałe archiwum nie jest wymagane.

### R-12 — dostępność

- Pause i kontrola tempa.
- Preferencja reduced motion.
- Główny przepływ obsługiwany klawiaturą.
- Dane nie są kodowane wyłącznie kolorem.
- Wykres ma reprezentację tekstową.
- Szybki tryb nie powoduje migotania; może ukrywać renderowanie.

## 5. Wymagania jakościowe

| ID | Wymaganie | Kryterium |
|---|---|---|
| Q-01 | Automatyzacja | Przebieg wykonuje wiele pokoleń bez interakcji |
| Q-02 | Responsywność | UI pozostaje sterowalne podczas prób i przejścia pokolenia |
| Q-03 | Szybki tryb | Brak renderowania daje mierzalnie większą liczbę prób na sekundę |
| Q-04 | Niezależność wyniku | FPS, widoczność i replay nie zmieniają ewolucji |
| Q-05 | Powtarzalność | Zachowana wersja, seed i konfiguracja spełniają uzgodniony kontrakt |
| Q-06 | Replay | Najlepszy przejazd jest odtwarzany z zapisanego śladu |
| Q-07 | Odwracalność | Typy silnika fizycznego nie wyciekają do reguł ewolucji i zapisu |
| Q-08 | Prywatność | Brak kont, telemetrii i backendu |

## 6. Kryteria akceptacji grywalnej wersji

- Domyślna konfiguracja uruchamia interesujący przebieg bez instrukcji.
- Co najmniej kilkanaście pokoleń może powstać bez obsługi użytkownika.
- Użytkownik może w każdej chwili użyć pauzy, wznowienia, zmiany tempa, replayu i stopu.
- Numer pokolenia, stan populacji i trend wyników są jednoznaczne.
- Szybki tryb nie zmienia wyniku i daje odczuwalne przyspieszenie.
- Najlepszy pojazd jest łatwy do znalezienia i obejrzenia.
- Użytkownik chce kontynuować obserwację lub uruchomić nową konfigurację.
- Playtest pozwala wskazać jeden następny kierunek albo uzasadniony stop.

Test wiedzy nie jest kryterium akceptacji.

## 7. Poza zakresem

Ręczny wybór rodziców, edytor, zmienna liczba kół, zmienna topologia, wiele światów, zmiana ustawień podczas przebiegu, kampania, przeciwnik, kontrolowane porównanie A/B, trwały zapis populacji, wznowienie po zamknięciu, backend, konta, chmura, udostępnianie i obowiązkowy tutorial.

## 8. Otwarte kalibracje

- populacja;
- topologia i zakresy genomu;
- liczba elit;
- polityka doboru rodziców;
- operator krzyżowania;
- domyślne parametry mutacji;
- limit stagnacji i kroków próby;
- reguła tie-breaku;
- gęstość i trudność terenu;
- wartości domyślne mieszczące się w zatwierdzonych budżetach;
- próbkowanie śladu;
- kalibracja na zatwierdzonym środowisku referencyjnym.

## 9. Warunki wejścia do implementacji

1. G0-P jest zamknięte jako zaakceptowany pivot.
2. Platformą kierunkową jest przeglądarka; Godot pozostaje wykluczony decyzją właściciela.
3. T0 porównało Rapier2D i Planck.js na identycznej ciągłej pętli browser-first.
4. Właściciel zatwierdził Planck.js 1.5.0 jako adapter fizyki.
5. Właściciel zatwierdził kontrakt powtarzalności dla zachowanego buildu i tego samego runtime.
6. Właściciel zatwierdził budżety M1–M4 bez zmian.
7. Dokumenty zawierają wynik T0, porównanie stosu i zamrożony zakres M1–M4.
8. Właściciel udziela osobnej zgody G1 opisanej w
   [G1_IMPLEMENTATION_BRIEF.md](G1_IMPLEMENTATION_BRIEF.md).

Sama akceptacja PRD nie była zgodą na kod produkcyjny; osobne GO zostało
udzielone później w G1.
