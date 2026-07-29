# Evolution Lab — krytyka i synteza discovery

> **Status historyczny:** dokument zapisuje krytykę wcześniejszych propozycji. Rekomendacja learning-first i późniejszy ręczny wariant hodowcy zostały zastąpione po G0-P ciągłą, autonomiczną symulacją inspirowaną BoxCar2D. Aktualny kierunek: [../DECISION_BRIEF.md](../DECISION_BRIEF.md).

**Data:** 2026-07-29

**Status:** synteza zespołu do decyzji właściciela
**Wejście:** [niezależne propozycje](INDEPENDENT_PROPOSALS.md)

## Sposób review

Zamiast pełnego review „każdy z każdym” przeprowadzono trzy celowane krytyki:

- perspektywa produktu oceniła minimalność i przeciążenie learning MVP;
- perspektywa techniczna sfalsyfikowała zbyt szerokie twierdzenia o determinizmie;
- Evolution & Learning Specialist przeszedł w ograniczoną rolę Workflow Reviewera i sprawdził fałszywą pewność, bramki oraz zgodność z wizją.

Review miało znaleźć kilka decyzji o dużym wpływie, nie ponownie wykonać całe discovery.

## Mapa napięć

| Napięcie | Wpływ na użytkownika | Wpływ na naukę | Wpływ techniczny | Koszt odwrócenia | Sposób rozstrzygnięcia |
|---|---|---|---|---|---|
| Aplikacja vs materiał manualny | Samodzielność i powtarzalność vs prostota | Czy medium daje transfer, nie tylko atrakcyjność | Cały koszt produktu | Bardzo wysoki | Sesja kartowa + Wizard of Oz + test odroczony |
| Pojazd vs prostszy fenotyp | Emergentna atrakcyjność vs klarowność | Ryzyko wyjaśnień fizycznych zamiast ewolucyjnych | Złożoność fizyki | Wysoki | Karty semantyczny pojazd vs geometria i kontrola abstrakcyjna |
| Prosty vs ekspresyjny genom | Łatwość inspekcji vs ciekawsze konstrukcje | Lokalność zmian vs emergencja | Nieważne konstrukcje i mapowanie | Wysoki | Porównanie zadań genom ↔ fenotyp |
| Jawny fitness vs realizm | Zrozumiały wynik vs „ładny” pojazd | Reward hacking może uczyć albo mylić | Więcej metryk i wyjątków | Wysoki | Dystans vs jawny porządek leksykograficzny na adversarialnych przypadkach |
| Jeden seed vs wniosek ogólny | Szybka demonstracja vs rozrzut | Ryzyko fałszywej przyczynowości | Strumienie RNG i agregacja | Średni | Kilka sparowanych seedów, jawny rozrzut i ograniczony język wniosków |
| Widowiskowa fizyka vs determinizm | Płynność i różnorodność | Powtarzalne wyjaśnienia | Silnik, fixed-step, wersje | Bardzo wysoki | Kontrakt deterministyczności + porównywalny test adapterów |
| Proof slice vs learning MVP | Szybki efekt vs kompletna wartość | Sama ewolucja nie uczy eksperymentowania | Zakres i roadmapa | Niski | Dwa jawnie nazwane poziomy, osobne bramki |
| In-process vs worker | Prostota vs responsywność | Brak bezpośredniego wpływu | API asynchroniczne, serializacja | Średni | In-process najpierw, worker tylko po przekroczeniu budżetu |

## Findings krytyki i przyjęte korekty

### F-01 — blokada: brak jednego nadrzędnego rezultatu nauki

**Problem:** kandydat learning MVP próbował równorzędnie uczyć genomu, fizyki, fitnessu, selekcji, mutacji, lineage, trendów, różnorodności i metodologii eksperymentu.

**Korekta:** główny rezultat brzmi:

> Po pierwszej sesji właściciel potrafi na konkretnym potomku wyjaśnić, jak genom utworzył pojazd, jak fitness wpłynął na wybór rodzica oraz jak reprodukcja i mutacja zmieniły potomka i populację.

Kontrolowane porównanie jest drugim etapem learning MVP. Różnorodność jest ujawniana w kontekście stagnacji, nie jako równorzędny temat pierwszych minut.

### F-02 — blokada: walidacja pozorna zamiast porównania

**Problem:** przetestowanie wyłącznie rekomendowanego genomu, fitnessu i selekcji potwierdziłoby tylko ich używalność.

**Korekta:** sesja bez kodu porównuje realne pary:

- genom semantyczny vs geometryczny;
- dystans vs porządek leksykograficzny;
- top-k vs turniej;
- kopia z mutacją vs proste krzyżowanie;
- lineage vs rozkłady genów;
- pojazd vs prostszy fenotyp kontrolny.

Kryteria są wspólne: poprawna prognoza, transfer, liczba podpowiedzi, krytyczne nieporozumienia i obciążenie poznawcze.

### F-03 — blokada: brak warunków pass / pivot / stop

**Problem:** „walidacja przed implementacją” mogłaby zakończyć się GO niezależnie od wyniku.

**Korekta:** przyjęto robocze progi 4/5 zadań mapowania, 4/5 zadań pochodzenia, 2/3 poprawnych porównań i zero krytycznych nieporozumień w teście odroczonym. Są to progi operacyjne dla jednego właściciela, nie dowód statystyczny. Dokument [LEARNING_EXPERIENCE.md](../LEARNING_EXPERIENCE.md) opisuje konkretne pivoty i warunki zatrzymania.

### F-04 — blokada: rekomendacja Rapier była zbyt szeroka

**Problem:** od Rapier.js 0.15 zwykły `@dimforge/rapier2d` jest lokalnie deterministyczny, lecz nie gwarantuje identycznych wyników między platformami. Gwarancję oferuje osobny, mniej zoptymalizowany wariant `@dimforge/rapier2d-deterministic`.

**Korekta:** browser-first jest preferowanym kierunkiem, nie zatwierdzonym stackiem. Shortlista adapterów to:

- `@dimforge/rapier2d-deterministic` — jeśli wymagany jest identyczny wynik między wspieranymi platformami w tej samej wersji;
- Planck.js — jeśli wystarcza powtarzalność w tym samym runtime/buildzie i wygrywa prostota.

Ostateczny adapter wymaga po akceptacji właściciela identycznego testu referencyjnego. Do manifestu muszą wejść wersje RNG, mapowania fenotypu, fitnessu, solvera i artefaktu fizyki.

### F-05 — blokada: zlanie re-symulacji, replay i resume

**Problem:** manifest i fixed timestep nie gwarantują kompatybilnego wznowienia po aktualizacji silnika.

**Korekta:** architektura definiuje osobne kontrakty:

- re-symulacja z manifestu w tej samej zachowanej wersji;
- replay z domenowego śladu bez fizyki;
- resume z kompletnego checkpointu tej samej wersji: build, tick, snapshot adaptera, stan kontrolera/metryk i RNG.

Nie obiecujemy identycznej re-symulacji między wersjami aplikacji.

### F-06 — ryzyko: fałszywa przyczynowość seedów

**Problem:** jeden wspólny seed nie wystarcza do wniosku, szczególnie gdy wariant zmienia kolejność losowań.

**Korekta:** RNG ma rozdzielone, stabilnie wyprowadzane strumienie dla inicjalizacji, selekcji i mutacji. Learning MVP odróżnia „przykład na jednej parze” od wniosku z kilku sparowanych seedów i pokazuje rozrzut.

### F-07 — ryzyko: ukryty tie-break

**Problem:** ranking wygląda niespójnie, jeśli ekran pokazuje jeden fitness, a selekcja używa niewidocznego kryterium.

**Korekta:** każda reguła rankingu jest nazwana i widoczna. Dokładny remis selekcji jest rozstrzygany równomiernym, seedowanym wyborem i rejestrowany; identyfikator osobnika porządkuje wyłącznie prezentację. Pierwszy widok eksponuje główny postęp, a szczegół pojawia się kontekstowo.

### F-08 — ryzyko: „około 20 osobników” udaje budżet

**Problem:** koszt zależy także od liczby kroków, ciał, złączy, iteracji solvera i telemetrii.

**Korekta:** liczebność populacji pozostaje hipotezą kalibracyjną. Przed utrwaleniem domyślnej wartości wymagane są pomiary kilku populacji i limitów kroków oraz ocena stagnacji i różnorodności na wielu seedach.

### F-09 — sugestia: zawęzić decyzje właściciela

Właściciel nie musi rozstrzygać każdego genu czy rozkładu mutacji. Do bramki trafiają decyzje wpływające na wartość, zakres lub koszt odwrócenia:

1. priorytet nauki właściciela wobec widowiskowości i celu workflow;
2. nadrzędny rezultat nauki;
3. doświadczenie prowadzone i walidacja N=1;
4. granica learning MVP;
5. browser-local i poziom determinizmu;
6. odłożenie krzyżowania oraz zmiennej topologii;
7. warunkowe GO najpierw do walidacji, nie do implementacji produkcyjnej.

## Synteza zespołu

### Rekomendowany produkt

Prowadzone, lokalne laboratorium dla właściciela projektu. Użytkownik najpierw śledzi jednego osobnika i jedną zmianę pokolenia, a dopiero później przechodzi do trendów i kontrolowanego porównania. Produkt nie pozycjonuje fitnessu jako obiektywnej jakości ani jednego seedu jako dowodu.

### Rekomendowany learning MVP

- jedna stała trasa;
- semantyczny genom pojazdu o stałej topologii jako preferowany kandydat;
- jawny postęp z widoczną regułą rankingu;
- selekcja turniejowa jako preferowany kandydat;
- pełne zastąpienie generacyjne, jeden rodzic, kopiowanie i mutacja; bez krzyżowania;
- pełny zapis pochodzenia i zmian genów;
- najlepszy i średni fitness oraz progresywnie ujawniona różnorodność;
- ręczne przejście pokolenia;
- kontrolowane porównanie jednego parametru na kilku sparowanych seedach;
- replay wybranej próby i tekstowe wyjaśnienie;
- pause/step, reduced motion, klawiatura i kodowanie inne niż wyłącznie kolor.

### Rekomendowany kierunek techniczny

- lokalna aplikacja browser-first, bez backendu;
- TypeScript jako kandydat wspólnego języka domeny i interfejsu;
- DOM dla kontroli i objaśnień, Canvas dla symulacji, dostępne wykresy w DOM/SVG;
- rdzeń ewolucji, phenotype builder, fitness, RNG i dziennik bez zależności od UI;
- asynchroniczny port symulacji, początkowo możliwy in-process;
- worker dopiero po pomiarze;
- preferowany kandydat fizyki: deterministyczny wariant Rapier2D, porównany z Planck.js;
- wersjonowany manifest, domenowy trace i jawny kontrakt re-symulacji/replay/resume.

### Rekomendowany status decyzji

**Zatwierdź z warunkami**, ale wyłącznie do wykonania:

1. sekwencyjnego protokołu G0 bez kodu, z wczesnym stopem i rzeczywistą drugą sesją;
2. po jej zaliczeniu — jednego wyrzucalnego testu referencyjnego adapterów technicznych;
3. bramki G1 przed kodem produkcyjnym;
4. bramki G2 po M5, zanim wynik zostanie zaakceptowany jako learning MVP.

Nie rekomendujemy jeszcze bezwarunkowego GO do implementacji.

## Ślad od propozycji do decyzji

| Element | Rekomendacja | Alternatywa zachowana | Dowód wymagany |
|---|---|---|---|
| Format produktu | Prowadzone laboratorium | Materiał manualny / sandbox | Test samodzielności i transferu |
| Fenotyp | Stałotopologiczny pojazd semantyczny | Geometria / prostszy fenotyp | Karty genom ↔ fenotyp |
| Fitness | Postęp + jawna reguła rankingu | Sam dystans / suma ważona | Adversarialne przykłady |
| Selekcja | Turniejowa | Top-k / rangowa | Przewidywanie wyboru i wpływu na różnorodność |
| Reprodukcja | Kopia + mutacja | Krzyżowanie blokowe/per-gen | Wartość edukacyjna ponad obciążenie |
| Platforma | Browser-local | Godot / Python desktop | Decyzja ownera i macierz stacków |
| Fizyka | Rapier2D deterministic — preferowany kandydat przy cross-platform exact | Planck.js przy same-runtime exact | Ten sam scenariusz; hashe tylko wewnątrz adaptera |
| Wykonanie | In-process za async portem | Worker | Przekroczenie budżetu responsywności |
| Trwałość | Manifest + domenowy ślad | Snapshot jako dodatek | Round-trip i replay bez fizyki |

Końcowy materiał do akceptacji znajduje się w [DECISION_BRIEF.md](../DECISION_BRIEF.md).
