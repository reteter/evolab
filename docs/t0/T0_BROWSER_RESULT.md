# Evolution Lab — wynik T0 browser-first

**Data:** 2026-07-29
**Status:** zakończone; Planck.js, kontrakt powtarzalności i budżety zatwierdzone
**Rekomendacja:** Planck.js 1.5.0
**Decyzja właściciela:** Planck.js 1.5.0 zatwierdzony

## 1. Decyzja, którą wspiera test

T0 porównało Rapier2D 0.19.3 i Planck.js 1.5.0 za tym samym portem
symulacji. Oba adaptery otrzymały wspólny teren, genom, reguły ewolucji,
fixed timestep i warunki końca próby.

T0 jest wyrzucalnym prototypem. Jego ukończenie nie jest zgodą G1 na kod
produkcyjny.

## 2. Scenariusz i skala

- trzy deterministyczne seedy;
- populacja 10 pojazdów;
- trzy automatyczne pokolenia na wykonanie;
- 900 kroków maksymalnie na próbę;
- stagnacja po 180 krokach;
- fixed timestep 1/60 s;
- pięć serii pomiarowych;
- w każdej serii: headless, identyczne powtórzenie i render on;
- dodatkowy ciągły przebieg do 10. pokolenia dla każdego adaptera;
- interakcyjne sprawdzenie pauzy, wznowienia, stopu, zmiany tempa i replayu.

## 3. Wynik

| Metryka | Rapier2D | Planck.js |
|---|---:|---:|
| Mediana kroków/s headless | 60 370 | 96 281 |
| Zakres kroków/s headless | 55 605–66 295 | 68 831–119 468 |
| Mediana kroków/s render on | ok. 41 014 | ok. 63 643 |
| Powtórzenie daje ten sam hash | 5/5 PASS | 5/5 PASS |
| Render on/off daje ten sam hash | 5/5 PASS | 5/5 PASS |
| Nieważne stany | 0 | 0 |
| Najlepszy dystans, trzy seedy | 56,23–91,54 m | 128,18–139,96 m |
| Średnia trzeciego pokolenia | 19,00–24,12 m | 94,52–100,68 m |
| Ciągły przebieg do pokolenia 10 | PASS | PASS |

Planck.js uzyskał około 60% wyższą medianę przepustowości headless i około
55% wyższą z renderowaniem. Dystans jest tylko sygnałem kosztu kalibracji:
motory obu bibliotek nie mają identycznego modelu i nie należy interpretować
go jako czystego benchmarku silników.

## 4. Bramki

| Bramka | Rapier2D | Planck.js |
|---|---|---|
| Co najmniej dwa pokolenia bez błędu | PASS | PASS |
| Powtarzalność w tym samym buildzie/runtime | PASS | PASS |
| Renderowanie nie zmienia wyniku | PASS | PASS |
| Pauza, wznowienie i stop | PASS | PASS |
| Brak wycieku typów silnika poza adapter | PASS | PASS |

Build Vite przeszedł, a sesja Chromium nie zgłosiła błędów konsoli. Wszystkie
kontrolki były dostępne w semantycznym drzewie przeglądarki. Rapier dodał do
wspólnego bundla osobny plik WASM 1 176,38 kB, 441,10 kB gzip.

## 5. Ocena według zamrożonych wag

| Kryterium | Waga | Wynik |
|---|---:|---|
| Przepustowość i responsywność | 30% | Planck.js |
| Czas do grywalnego zachowania i game feel | 20% | Planck.js, z zastrzeżeniem kalibracji |
| Powtarzalność i debugowanie | 15% | Remis w zatwierdzonym zakresie |
| Start i dystrybucja | 15% | Planck.js |
| Dostępność | 10% | Remis — wspólny shell |
| Modularność i testowalność | 10% | Lekka przewaga Planck.js |

Wynik ważony wskazuje **Planck.js**, bez nadawania pozornej precyzji
punktowej kryteriom jakościowym.

## 6. Ograniczenia

1. Test działał na Windows i Chromium 142; nie sprawdzał różnych platform.
2. Kolejność adapterów była stała, więc wyniki zawierają wpływ rozgrzewania
   JIT; raport używa mediany i zakresu.
3. Pomiar pamięci po 10 pokoleniach nie był rozstrzygający bez wymuszonego GC.
4. Prototyp renderuje minimalny Canvas i nie rozstrzyga finalnego UI.
5. Bundle zawiera oba adaptery, więc rozmiar Planck-only nie został zmierzony.
6. Przewaga dystansu może częściowo wynikać z mapowania parametrów motoru.

## 7. Rekomendacja

Wybrać **Planck.js 1.5.0** dla M1–M4 oraz zachować `Simulation Port`, żeby
wybór pozostał odwracalny.

Przyjąć kontrakt powtarzalności:

> Ten sam manifest w zachowanym buildzie i tym samym runtime daje ten sam
> teren, ranking, potomstwo i historię pokoleń. Wersja v0 nie obiecuje
> bitowo identycznego wyniku między platformami ani po aktualizacji buildu.

Planck.js oficjalnie deklaruje powtarzalność dla tych samych wejść w tym
samym runtime JavaScript, ale nie między platformami:
[Planck.js — limitations](https://piqnt.com/planck.js/docs/limitations).

Rapier pozostaje alternatywą, jeżeli właściciel podniesie cross-platform
exact do bramki bezwzględnej. W takim przypadku trzeba osobno sprawdzić
wariant deterministyczny oraz cały pipeline wejściowy, a nie tylko fizykę.

## 8. Decyzje i następna bramka

Właściciel zatwierdził Planck.js 1.5.0 jako adapter M1–M4. Decyzję zapisano
w [ADR-0001](../adr/0001-use-planck-js-for-vehicle-physics.md).

Właściciel zatwierdził powtarzalność ograniczoną do zachowanego buildu i tego
samego runtime. Decyzję zapisano w
[ADR-0002](../adr/0002-bound-repeatability-to-same-build-and-runtime.md).

Właściciel zatwierdził również
[budżety M1–M4](T0_BUDGET_PROPOSAL.md) bez zmian. Decyzję zapisano w
[ADR-0003](../adr/0003-accept-v0-performance-and-retention-budgets.md).

T0 nie pozostawiło otwartych decyzji. Na tym etapie kod produkcyjny nie był
autoryzowany. Później właściciel udzielił GO w osobnej
[bramce G1](../G1_IMPLEMENTATION_BRIEF.md), a wynik M1–M4 zapisano w
[raporcie implementacji](../M1_M4_IMPLEMENTATION_REPORT.md).
