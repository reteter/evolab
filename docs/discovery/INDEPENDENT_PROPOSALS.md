# Evolution Lab — niezależne propozycje discovery

> **Status historyczny:** dokument zachowuje niezależne propozycje z fazy discovery. Późniejsze G0-P zastąpiło zarówno edukacyjny priorytet, jak i ręczny wariant „Hodowcy jednej linii” ciągłą, autonomiczną symulacją inspirowaną BoxCar2D. Aktualny kierunek: [../DECISION_BRIEF.md](../DECISION_BRIEF.md).

**Data:** 2026-07-29

**Status:** materiał roboczy przed syntezą i decyzją właściciela
**Zakres:** analiza bez implementacji, scaffoldu i instalowania zależności

## Skład zespołu

Discovery przeprowadził Orchestrator oraz trzy niezależne perspektywy:

1. **Game & Product Designer** — wartość produktu, pętla doświadczenia i granica learning MVP;
2. **Evolution & Learning Specialist** — algorytm, rezultaty nauki, falsyfikowalne hipotezy i badania;
3. **Physics & Technical Architect** — wykonalność, determinizm, granice modułów i warianty techniczne.

Każda perspektywa czytała komplet dokumentów startowych i przygotowała własną propozycję przed poznaniem syntezy. Fakty wynikające z repozytorium są odróżnione od rekomendacji.

## Wspólny punkt wyjścia — fakty

- Repozytorium jest czystym pakietem discovery: nie zawiera kodu aplikacji, zależności, testów ani infrastruktury.
- Głównym odbiorcą pierwszej wersji jest właściciel projektu, a nie od razu publiczny rynek edukacyjny.
- Problemem jest brak praktycznej intuicji: istniejące demonstracje często pokazują wynik, lecz ukrywają genom, selekcję, dziedziczenie i mutację.
- Pojazd inspirowany BoxCar2D, stała trasa, ograniczony genom i kopiowanie z mutacją są hipotezami startowymi, nie zatwierdzonymi decyzjami.
- Projekt wymaga jawnego porównania wariantów i decyzji właściciela przed implementacją.
- Konta, chmura, multiplayer, proceduralne trasy, edytor pojazdów, wiele laboratoriów i uniwersalna platforma są poza pierwszą wersją.

Źródła: [README.md](../../README.md), [PROJECT_VISION.md](../../PROJECT_VISION.md), [TEAM_CHARTER.md](../../TEAM_CHARTER.md), [DISCOVERY_PROCESS.md](../../DISCOVERY_PROCESS.md).

---

## Propozycja A — produkt: prowadzone laboratorium porównawcze

### Rekomendacja

Evolution Lab powinien zacząć jako **owner-first, prowadzone laboratorium porównawcze**, a nie gra, otwarty sandbox ani pasywna demonstracja. Rdzeniem ma być możliwy do prześledzenia łańcuch:

> genom → fenotyp → próba → fitness → selekcja → potomstwo → zmiana populacji

Proponowany główny JTBD:

> Gdy znam pojęcia algorytmu genetycznego, ale nie czuję ich konsekwencji, chcę przeprowadzić powtarzalny eksperyment i prześledzić konkretnego potomka od rodzica do wyniku, abym potrafił wyjaśnić, dlaczego populacja się zmieniła i co spowodowała zmiana jednego parametru.

### Proponowana pętla doświadczenia

1. Użytkownik otwiera domyślny eksperyment z jawną konfiguracją i seedem.
2. Łączy wartości genomu z widocznymi cechami pojazdu.
3. Obserwuje próbę i poznaje jawną regułę fitnessu.
4. Ręcznie przechodzi do kolejnego pokolenia.
5. Wybiera potomka i widzi rodzica, cechy odziedziczone oraz mutacje.
6. Ogląda zmianę najlepszego i średniego fitnessu; różnorodność pojawia się dopiero w kontekście stagnacji.
7. Formułuje przewidywanie, zmienia jeden parametr i porównuje wynik na sparowanych seedach.
8. Własnymi słowami wyjaśnia zaobserwowany mechanizm oraz granice wniosku.

### Dwa poziomy zakresu

- **Proof slice:** jedna pełna zmiana pokolenia, od genomu do potomka. Redukuje ryzyko techniczne i pokazuje rdzeń, ale nie daje jeszcze kompletnej wartości edukacyjnej.
- **Learning MVP:** proof slice rozszerzony o progresywne wyjaśnienia, trendy i kontrolowane porównanie jednej zmiennej. Dopiero ten zakres realizuje cel „nauka przez eksperyment”.

### Realne alternatywy

| Wariant | Korzyść | Główny koszt |
|---|---|---|
| Prowadzone laboratorium — rekomendacja | Najlepsza atrybucja przyczyn i mały zakres | Mniej swobody i widowiskowości |
| Otwarty sandbox | Więcej zabawy i emergencji | Trudniej odróżnić obserwację od wyjaśnienia |
| Pasywna demonstracja | Najmniejszy koszt interakcji | Nie realizuje nauki przez stawianie hipotez |
| Materiał manualny | Może wystarczyć do jednorazowej nauki | Nie daje automatycznej powtarzalności i wielu prób |

### Założenia i ryzyka

- Użytkownik zaakceptuje progresywne, prowadzone doświadczenie.
- Pojazd będzie dostatecznie ciekawy, ale nie zdominuje uwagi fizyką.
- Learning MVP może przeciążyć pierwszą sesję, jeśli wszystkie widoki zostaną pokazane od razu.
- Walidacja na właścicielu uzasadnia wyłącznie narzędzie owner-first, nie twierdzenie o produkcie publicznym.
- Sukces produktu i sukces workflow agentowego wymagają oddzielnych scorecardów.

### Pytania do właściciela

- Jaki jeden rezultat nauki ma być nadrzędny?
- Czy pierwsza walidacja może dotyczyć wyłącznie osobistego narzędzia?
- Czy tryb prowadzony jest akceptowalnym początkiem?
- Czy kontrolowane porównanie należy do learning MVP?
- Czy atrakcyjność pojazdu może ustąpić czytelności mechanizmu?

---

## Propozycja B — algorytm i nauka: najpierw falsyfikacja

### Rekomendacja

Przed uznaniem aplikacji i pojazdu za właściwe rozwiązanie należy sfalsyfikować dwie tezy:

1. interaktywna symulacja daje właścicielowi większą wartość niż prowadzony materiał manualny;
2. pojazd pomaga rozumieć ewolucję, zamiast zamieniać zadanie w lekcję nieprzewidywalnej fizyki.

Jeżeli tezy upadną, dobrym wynikiem discovery może być prostszy fenotyp, jednorazowy materiał edukacyjny albo zatrzymanie własnej aplikacji.

### Porównanie wariantów algorytmicznych

#### Genom i fenotyp

| Wariant | Zalety | Ryzyka | Wstępna ocena |
|---|---|---|---|
| Semantyczny genom o stałej topologii | Czytelna lokalna zmiana, mało nieważnych konstrukcji | Mniej emergencji, możliwy trywialny optimum | Preferowana hipoteza |
| Geometria o stałej topologii | Ciekawsze pojazdy, bliżej BoxCar2D | Więcej interakcji i trudniejsza atrybucja | Realna alternatywa do badania |
| Zmienna topologia/graf | Duża ekspresja | Nieważne konstrukcje i wysokie obciążenie | Poza pierwszą wersją |

#### Fitness

| Wariant | Zalety | Ryzyka |
|---|---|---|
| Sam postęp/dystans | Maksymalnie jawny | Reward hacking, przewrócenia i skoki |
| Porządek leksykograficzny | Brak arbitralnych wag | Progi i dodatkowa reguła rankingu |
| Ważona suma | Elastyczność | Ukryte wartości, skale i Goodhart |
| Pareto | Uczy kompromisów | Zbyt złożone na pierwszy kontakt |

Pierwsze badanie powinno zestawić postęp z widocznym porządkiem leksykograficznym na celowo „oszukujących” przykładach. Fitness musi być opisywany jako dopasowanie do konkretnego celu i środowiska, nie obiektywna wartość osobnika.

#### Selekcja

| Wariant | Zalety | Ryzyka |
|---|---|---|
| Top-k | Najłatwiejsza demonstracja ręczna | Szybka utrata różnorodności |
| Turniejowa | Czytelny kandydat i prosty parametr presji | Losowość wymaga pokazania uczestników turnieju |
| Rangowa | Odporna na skalę fitnessu | Słabszy związek z różnicą wyników |
| Ruletka | Atrakcyjna wizualnie | Wrażliwa na skalę i myląca metafora „wartości” |

Do porównania bez kodu powinny wejść top-k i selekcja turniejowa. Rekomendacja turniejowa pozostaje hipotezą do testu zrozumienia.

#### Reprodukcja i mutacja

- **Kopia jednego rodzica + mutacja** — preferowana hipoteza: najczystsze pochodzenie i najmniejszy zakres.
- **Krzyżowanie per-gen lub blokowe** — realna alternatywa, lecz dodaje drugi mechanizm dziedziczenia.
- **Krzyżowanie jednopunktowe** — proste wizualnie, ale nadaje sztuczne znaczenie kolejności genów.

W mutacji należy oddzielić:

- częstość — które geny mutują;
- siłę — jak duża jest zmiana.

Krzyżowanie trafia do późniejszej bramki, jeśli nie wykaże osobnej wartości edukacyjnej.

#### Różnorodność

Nie należy obiecywać jednej „prawdziwej” liczby. Kandydaci:

- rozkłady poszczególnych genów;
- udział linii pochodzenia;
- średnia znormalizowana odległość genotypowa jako pomocniczy skrót;
- różnorodność zachowania dopiero po walidacji fizyki.

### Minimalne badanie bez kodu

Jedna modularna sesja może objąć:

1. krótki baseline błędnych modeli mentalnych;
2. karty genom ↔ fenotyp dla wariantu semantycznego i geometrycznego;
3. adversarialne przykłady fitnessu;
4. ręczne dwa pokolenia: top-k kontra turniej, kopia kontra proste krzyżowanie;
5. storyboard mechanism-first kontra race-first;
6. kontrolowane porównanie na kilku sparowanych seedach;
7. odroczony test transferu po 48–72 godzinach.

### Warunki pass / pivot / stop

Progi są propozycją operacyjną dla N=1, nie wynikiem statystycznym:

- **Pass:** 4/5 poprawnych mapowań genom–fenotyp, 4/5 poprawnych wskazań pochodzenia i mutacji, 2/3 poprawnie zaprojektowane porównania oraz zero krytycznych nieporozumień w odroczonym teście.
- **Pivot:** prostszy fenotyp, obowiązkowy tryb prowadzony, brak krzyżowania lub rozkłady zamiast jednego wskaźnika różnorodności.
- **Stop dla własnej aplikacji:** materiał manualny osiąga tę samą samodzielność i transfer, wartość zależy od cherry-pickowanych seedów albo fizyki nie da się wiarygodnie wyjaśnić.

### Pytania do właściciela

- Czy własna aplikacja musi wygrać z materiałem manualnym, aby projekt był kontynuowany?
- Czy pojazd jest hipotezą, którą wolno odrzucić?
- Czy owner-first N=1 wystarcza do rozpoczęcia dalszej pracy?
- Czy krzyżowanie jest wymaganym rezultatem pierwszej sesji?
- Czy akceptujemy reward hacking jako jawną lekcję?

---

## Propozycja C — architektura: jawne granice i kilka archetypów

### Rekomendacja niezależna od technologii

Najpierw należy utrwalić granice:

1. definicja eksperymentu i wersjonowany manifest;
2. kontroler przebiegu;
3. rdzeń ewolucji;
4. deterministyczne wyprowadzanie seedów;
5. mapowanie genom–fenotyp;
6. port symulacji;
7. jawna polityka fitnessu;
8. niezmienny dziennik wyników i pochodzenia;
9. prezentacja i replay jako projekcja, nie źródło stanu.

Rendering, szybkość animacji i kolejność kończenia zadań nie mogą zmieniać wyniku eksperymentu.

### Cztery archetypy wykonania

| Archetyp | Mocne strony | Koszty i ryzyka | Ocena dla v1 |
|---|---|---|---|
| Lokalna aplikacja w jednym runtime | Najmniej operacji, offline, prosty start | Ryzyko blokowania UI | Mocny kandydat |
| Lokalny klient + worker/pula | Responsywność i naturalna granica | Protokół, serializacja, kolejność wyników | Dopiero po pomiarze |
| Pełny silnik 2D | Dojrzałe narzędzia sceny, fizyki i renderingu | Lock-in i trudniejsza analityka | Realna alternatywa |
| Klient + usługa headless | Kontrolowane środowisko i batch | Backend, dane, operacje, bezpieczeństwo | Poza zakresem v1 |

### Rodziny stacku do porównania

- **Modularny browser-first:** biblioteka fizyczna za portem, osobny renderer i interfejs analityczny.
- **Engine-first (Godot):** sceny, fizyka, rendering i UI we wspólnym runtime.
- **Python desktop/notebook:** szybkie badania i headless, ale inny koszt dystrybucji i doświadczenia.

Architekt nie uznaje obecnych dowodów za podstawę do bezwarunkowego wyboru konkretnej biblioteki fizycznej. Browser-first jest preferowanym kierunkiem tylko wtedy, gdy właściciel zatwierdzi przeglądarkę i lokalny model danych.

### Kontrakt powtarzalności

Należy rozdzielić:

- **re-symulację** — ponowne obliczenie z manifestu w zachowanej wersji runtime;
- **replay wizualny** — odtworzenie zapisanego śladu bez ponownej fizyki;
- **resume** — wznowienie z binarnego snapshotu tej samej wersji.

Stały timestep i seed nie wystarczą. Potrzebne są:

- jedna wersjonowana implementacja RNG i rozdzielone strumienie;
- kanoniczna kolejność tworzenia ciał i agregacji wyników;
- wersje genomu, fenotypu, fitnessu, solvera i adaptera w manifeście;
- trwały domenowy zapis lineage, fitnessu i śladu;
- zakaz zależności wyniku od renderera i zegara ściennego.

### Największe niewiadome

- docelowa platforma i model dystrybucji;
- poziom determinizmu: ta sama maszyna, ten sam build czy różne platformy;
- budżet czasu generacji i sprzęt referencyjny;
- populacja, limit kroków, liczba ciał i ilość telemetrii;
- sposób oglądania populacji: live, sekwencyjnie czy replay;
- wymagana trwałość i udostępnianie eksperymentów.

### Test rozstrzygający po zgodzie właściciela

Ten sam scenariusz referencyjny powinien zostać później wykonany na dwóch adapterach browser-first:

- `@dimforge/rapier2d-deterministic`;
- Planck.js.

Porównanie obejmuje: zakres determinizmu, hash stanu, czas generacji, koszt startu i payloadu, ergonomię adaptera, zapis/replay oraz zachowanie na macierzy wspieranych środowisk. Godot i Python/Pymunk należy porównywać jako całe alternatywne topologie, a nie jako wymienne adaptery.

### Pytania do właściciela

- Czy podstawową platformą jest przeglądarka?
- Czy wymagane są identyczne wyniki między urządzeniami w tym samym buildzie?
- Jaki czas jednej generacji jest akceptowalny?
- Czy eksperyment ma działać offline i bez backendu?
- Czy wyniki mają być wyłącznie lokalne, eksportowalne czy współdzielone?
- Czy proof slice jest tylko redukcją ryzyka, a learning MVP kończy się później?

---

## Różnice zdań przekazane do krytyki

1. Czy należy budować własną aplikację, zanim wykaże przewagę nad materiałem manualnym?
2. Czy pojazd i fizyka pomagają nauce, czy ją zaciemniają?
3. Czy fixed-topology ograniczy emergencję tak bardzo, że eksperyment stanie się trywialny?
4. Czy jeden seed wystarcza do porównania, a jeśli nie — jak pokazać rozrzut bez przeciążenia?
5. Jaki poziom determinizmu jest naprawdę potrzebny?
6. Czy browser-first jest decyzją, czy jedynie preferowanym kandydatem?
7. Gdzie kończy się proof slice, a gdzie learning MVP?
8. Czy różnorodność jest pierwszoplanowym rezultatem pierwszej sesji?

Rozstrzygnięcia i findings znajdują się w [CRITIQUE_AND_SYNTHESIS.md](CRITIQUE_AND_SYNTHESIS.md).
