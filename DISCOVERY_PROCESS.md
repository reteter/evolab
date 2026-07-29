# Discovery Process — Evolution Lab

> **Dokument historyczny:** opisuje zakończony proces discovery. Aktualny workflow i bramki znajdują się w [`docs/WORKFLOW.md`](docs/WORKFLOW.md).

## Cel procesu

Discovery ma przekształcić wizję Evolution Lab w uzgodniony plan pierwszego pionowego wycinka. Proces ma zredukować najważniejsze niewiadome produktowe, edukacyjne, algorytmiczne i techniczne przed rozpoczęciem implementacji.

Nie służy do stworzenia kompletnej dokumentacji przyszłej platformy. Kończy się w momencie, gdy właściciel ma wystarczające informacje, aby zatwierdzić kierunek, zmienić go lub odrzucić.

## Twarde ograniczenia

Podczas discovery nie wolno:

- pisać kodu produkcyjnego;
- generować scaffoldu aplikacji;
- instalować zależności;
- tworzyć migracji, infrastruktury ani pipeline’ów wdrożeniowych;
- podejmować nieodwracalnych decyzji bez właściciela;
- traktować pierwszej hipotezy jako uzgodnionej decyzji;
- projektować z góry uniwersalnej platformy dla wielu laboratoriów;
- tworzyć rozbudowanego backlogu przed uzgodnieniem pionowego wycinka.

Dozwolone są krótkie analizy, diagramy, pseudokod i modele danych służące porównaniu wariantów, o ile nie stają się ukrytą implementacją.

## Artefakty robocze

Orchestrator może utworzyć:

```text
docs/
├── discovery/
│   ├── PRODUCT_PROPOSAL.md
│   ├── EVOLUTION_LEARNING_PROPOSAL.md
│   ├── TECHNICAL_PROPOSAL.md
│   ├── OPEN_QUESTIONS.md
│   └── SYNTHESIS.md
├── PROJECT_VISION.md
├── PRD.md
├── ROADMAP.md
├── ARCHITECTURE_OPTIONS.md
├── GENETIC_ALGORITHM_DESIGN.md
├── LEARNING_EXPERIENCE.md
├── RISK_REGISTER.md
├── DECISION_BRIEF.md
└── WORKFLOW.md
```

Nie trzeba tworzyć każdego dokumentu osobno, jeśli połączenie dwóch z nich poprawi czytelność. `DECISION_BRIEF.md` jest obowiązkowy.

## Faza 0 — uruchomienie i kontrola zakresu

### Działania

1. Przeczytaj wszystkie dokumenty startowe.
2. Streść cel projektu w jednym akapicie.
3. Wypisz obowiązujące ograniczenia.
4. Utwórz listę pytań otwartych i założeń.
5. Zaproponuj minimalny skład agentów oraz uzasadnij każdą delegację.

### Rezultat

- plan discovery;
- lista pytań;
- lista delegacji z przewidywaną wartością;
- potwierdzenie zakazu implementacji.

### Bramka

Orchestrator może zacząć analizy bez czekania na właściciela, jeśli nie zmienia zakresu i nie wykonuje działań trudnych do odwrócenia.

## Faza 1 — niezależne propozycje

Trzy perspektywy przygotowują krótkie propozycje. Ich zadaniem nie jest osiągnięcie zgody, lecz ujawnienie opcji i napięć.

### A. Propozycja produktu

Powinna odpowiedzieć:

- jaka jest podstawowa pętla doświadczenia;
- czego użytkownik ma się nauczyć w pierwszej sesji;
- co jest interaktywne, a co automatyczne;
- jaki jest najmniejszy wartościowy pionowy wycinek;
- które atrakcyjne funkcje należy odłożyć;
- jak rozpoznać, że doświadczenie jest zrozumiałe.

### B. Propozycja algorytmu i nauki

Powinna odpowiedzieć:

- jak wygląda genom i fenotyp;
- jak działa fitness i jakie zachowania może niechcący premiować;
- jak działają selekcja, reprodukcja, mutacja i ewentualne krzyżowanie;
- jak zachować i pokazać różnorodność;
- jak wizualizować pochodzenie osobnika;
- jakie kontrolowane eksperymenty budują intuicję;
- które uproszczenia są akceptowalne edukacyjnie.

### C. Propozycja techniczna

Powinna odpowiedzieć:

- jakie są 2–3 realne warianty technologiczne;
- jak każdy wariant obsługuje fizykę, rendering, wykresy i testy;
- jak zapewnić deterministyczność lub jasno opisać jej granice;
- jak oddzielić rdzeń ewolucji od symulacji i prezentacji;
- jaki jest koszt symulowania populacji;
- jakie są największe ryzyka i najszybsze sposoby ich redukcji.

### Zasady formatu

Każda propozycja zawiera:

- rekomendację;
- co najmniej jedną alternatywę;
- główne kompromisy;
- założenia;
- ryzyka;
- pytania do innych perspektyw;
- elementy świadomie odłożone.

## Faza 2 — mapa sprzeczności

Orchestrator porównuje propozycje i tworzy mapę najważniejszych napięć. Nie uruchamia automatycznie review „każdy z każdym”.

Przykładowe napięcia:

- atrakcyjna fizyka kontra powtarzalność;
- złożony genom kontra czytelność;
- realizm fitnessu kontra możliwość jego wyjaśnienia;
- szybka ewolucja kontra zachowanie różnorodności;
- pełne krzyżowanie kontra prostota pierwszego eksperymentu;
- symulacja całej populacji naraz kontra szybkość generacji;
- publiczny produkt edukacyjny kontra narzędzie dla właściciela;
- gotowy silnik kontra mały stack webowy.

Dla każdego napięcia Orchestrator zapisuje:

- warianty;
- wpływ na użytkownika;
- wpływ na naukę;
- wpływ techniczny;
- koszt odwrócenia;
- rekomendowany sposób rozstrzygnięcia.

## Faza 3 — celowane review

Review otrzymują tylko kwestie, których nie można dobrze rozstrzygnąć przez prostą syntezę.

### Kiedy powołać recenzenta

- propozycje są sprzeczne w sprawie o wysokim koszcie;
- rekomendacja opiera się na niepewnym założeniu;
- istnieje ryzyko, że fitness lub UI wypaczy cel edukacyjny;
- architektura może zamknąć drogę do kluczowej funkcji;
- Orchestrator jest autorem dominującej propozycji i potrzebna jest niezależna ocena.

### Oczekiwany wynik review

- maksymalnie kilka istotnych findings;
- priorytet i wpływ każdego findings;
- dowód lub tok rozumowania;
- rekomendowane działanie;
- rozróżnienie między blokadą, ryzykiem i sugestią.

Drobne poprawki Orchestrator wprowadza inline.

## Faza 4 — synteza produktu i projektu

Orchestrator łączy wyniki w spójny kandydat do realizacji.

### Minimalna zawartość syntezy

- problem i odbiorca;
- główna pętla doświadczenia;
- zakres i granice pionowego wycinka;
- model genomu i fenotypu;
- funkcja fitness wraz z możliwymi efektami ubocznymi;
- strategia selekcji i reprodukcji;
- wizualizacja procesu ewolucji;
- deterministyczność, seedy i porównywanie eksperymentów;
- rekomendowana architektura oraz alternatywy;
- ryzyka i plan redukcji;
- kryteria sukcesu.

### Kontrola jakości syntezy

Synteza musi być:

- spójna między dokumentami;
- zrozumiała bez historii rozmowy;
- wystarczająco konkretna do podjęcia decyzji;
- wolna od nieuzasadnionych szczegółów implementacyjnych;
- jawna w kwestii niepewności.

## Faza 5 — roadmapa

Roadmapa ma składać się z pionowych wycinków, które dają obserwowalny rezultat i redukują ryzyko.

Rekomendowany punkt wyjścia do weryfikacji:

1. **M1 — deterministyczna próba jednego pojazdu**
   Genom tworzy widoczny pojazd, który próbuje pokonać stałą trasę; wynik można odtworzyć.

2. **M2 — populacja i jawny fitness**
   Wiele osobników jest ocenianych według prostych, widocznych kryteriów.

3. **M3 — selekcja i mutacja**
   Powstaje następne pokolenie, a użytkownik może prześledzić pochodzenie i zmianę cech.

4. **M4 — obserwacja trendów i różnorodności**
   Użytkownik widzi najlepszy i średni fitness oraz zmianę populacji.

5. **M5 — kontrolowane eksperymenty**
   Można zmieniać wybrane parametry, używać seedów i porównywać przebiegi.

6. **M6 — rozszerzenia algorytmu**
   Krzyżowanie, dodatkowe strategie selekcji lub bardziej złożony fitness są dodawane tylko po walidacji rdzenia.

7. **M7 — rozszerzenia świata**
   Proceduralne trasy, edytor lub kolejne laboratoria trafiają tu dopiero po osobnej decyzji.

Każdy milestone zawiera:

- wartość dla użytkownika;
- pytanie, na które odpowiada;
- kryteria akceptacji;
- zależności;
- największe ryzyko;
- warunek zatrzymania lub zmiany kierunku.

## Faza 6 — raport decyzyjny

`DECISION_BRIEF.md` powinien być krótki i możliwy do przeczytania bez pozostałych dokumentów.

### Obowiązkowe sekcje

1. Co rekomenduje zespół.
2. Dlaczego ten zakres jest najmniejszym wartościowym wycinkiem.
3. Jak użytkownik zobaczy działanie algorytmu.
4. Rekomendowany wariant techniczny.
5. Najważniejsze alternatywy i powody ich odłożenia.
6. Największe ryzyka oraz sposób ich redukcji.
7. Roadmapa na poziomie milestone’ów.
8. Otwarte decyzje właściciela.
9. Konkretna propozycja następnego kroku po akceptacji.

### Możliwe decyzje właściciela

- zatwierdź kierunek;
- zatwierdź z warunkami;
- poproś o dodatkowe discovery jednego problemu;
- zmień zakres;
- wstrzymaj projekt.

Brak odpowiedzi nie oznacza zgody na implementację.

## Faza 7 — retrospektywa discovery

Po decyzji właściciela zespół zapisuje krótką retrospektywę:

- które delegacje były trafne;
- które zadania należało wykonać inline;
- co zużyło najwięcej pracy bez proporcjonalnej wartości;
- jakie informacje brakowały agentom;
- czy review zmieniło ważną decyzję;
- które dokumenty należy utrzymywać dalej;
- co uprościć w następnym etapie.

## Definicja gotowości do implementacji

Projekt jest gotowy do planowania implementacji dopiero, gdy:

- właściciel zaakceptował `DECISION_BRIEF.md`;
- zakres pierwszego pionowego wycinka jest jasny;
- kryteria sukcesu są obserwowalne;
- wybrano kierunek techniczny i zapisano kompromisy;
- kluczowe ryzyka mają małe eksperymenty redukujące niepewność;
- wiadomo, co świadomie nie wchodzi do pierwszej wersji;
- zespół potrafi utworzyć pierwsze zadania jako pionowe wycinki, a nie warstwy infrastruktury.
