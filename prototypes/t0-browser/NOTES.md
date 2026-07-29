# T0 — wynik

**Status:** test zakończony 2026-07-29
**Rekomendacja:** Planck.js 1.5.0 dla pierwszej grywalnej wersji
**Decyzja właściciela:** Planck.js 1.5.0 i kontrakt powtarzalności zatwierdzone

## Pytanie

Który adapter fizyki — Rapier2D czy Planck.js — lepiej spełnia wymagania
ograniczonej, ciągłej ewolucji pojazdów w przeglądarce?

## Środowisko

- Windows / Chromium 142 headless;
- Node.js 26.3.0, npm 11.16.0;
- Vite 8.1.5, TypeScript 7.0.2;
- `@dimforge/rapier2d` 0.19.3;
- `planck` 1.5.0;
- 16 logicznych wątków i 8 GB pamięci raportowane przez przeglądarkę.

## Manifest

- trzy seedy: `evolution-lab-t0`, `evolution-lab-t0-b`,
  `evolution-lab-t0-c`;
- populacja 10;
- trzy pokolenia na wykonanie;
- fixed timestep 1/60 s;
- limit 900 kroków i stagnacja po 180 krokach;
- pięć serii pomiarowych, z czego trzy na pierwszym seedzie dla obserwacji
  rozgrzewania JIT;
- każda seria: wykonanie bez renderowania, identyczne powtórzenie oraz
  wykonanie z renderowaniem.

## Wynik pomiaru

| Metryka | Rapier2D | Planck.js |
|---|---:|---:|
| Mediana kroków/s bez renderowania | 60 370 | 96 281 |
| Zakres kroków/s bez renderowania | 55 605–66 295 | 68 831–119 468 |
| Mediana kroków/s z renderowaniem | ok. 41 014 | ok. 63 643 |
| Powtarzalny hash w tym samym środowisku | 5/5 PASS | 5/5 PASS |
| Render on/off daje ten sam hash | 5/5 PASS | 5/5 PASS |
| Nieważne stany | 0 | 0 |
| Najlepszy dystans na trzech seedach | 56,23–91,54 m | 128,18–139,96 m |
| Średnia trzeciego pokolenia | 19,00–24,12 m | 94,52–100,68 m |
| Ciągły przebieg do 10. pokolenia | PASS | PASS |

Planck.js miał około 60% wyższą medianę przepustowości bez renderowania i
około 55% wyższą z renderowaniem. Czas całej serii nie jest porównywany
wprost, ponieważ w Planck.js pojazdy częściej jechały dłużej i wykonywały
więcej kroków przed zakończeniem próby.

## Bramki bezwzględne

1. Minimum dwa automatyczne pokolenia bez błędu — **PASS dla obu**.
2. Powtarzalny ranking i potomstwo w tym samym buildzie — **PASS dla obu**.
3. Renderowanie nie zmienia wyniku domenowego — **PASS dla obu**.
4. Pauza, wznowienie i stop podczas przebiegu — **PASS**.
5. Typy silnika nie wychodzą poza adapter — **PASS**.

Kompilacja produkcyjnego bundla prototypu przeszła. W sesji przeglądarkowej
nie wystąpił błąd konsoli. Kontrolki były widoczne w drzewie dostępności.

## Ograniczenia wyniku

- Napędy obu silników mają różne modele. Dystans jest sygnałem kosztu
  kalibracji i grywalności, nie bezpośrednim benchmarkiem fizyki.
- Kolejność pomiaru była stała: Rapier2D, potem Planck.js. Zakres wyników
  ujawnia wpływ JIT, dlatego rekomendacja opiera się na medianie.
- Nie wykonano testu między różnymi systemami i przeglądarkami.
- Pomiar sterty po 10 pokoleniach był zanieczyszczony brakiem wymuszonego GC.
  Długoterminowy budżet pamięci pozostaje ryzykiem M3.
- Bundle porównawczy zawiera oba adaptery. Rapier dodał osobny artefakt WASM
  1 176,38 kB (441,10 kB gzip); nie jest to pomiar finalnego bundla Planck-only.
- Test nie ocenia finalnego wyglądu ani pełnego game feel.

## Werdykt

Rekomendowany adapter dla pierwszej grywalnej wersji: **Planck.js 1.5.0**.

Powody:

- wyższa przepustowość na scenariuszu T0;
- brak osobnego startu i artefaktu WASM;
- API bezpośrednio odpowiada potrzebnym bryłom, krawędziom i przegubom;
- prostsza droga do ograniczonego doświadczenia inspirowanego BoxCar2D;
- wszystkie wymagane bramki powtarzalności w tym samym runtime przeszły.

Rekomendowany kontrakt: identyczny wynik dla tego samego manifestu w
zachowanym buildzie i runtime. Brak obietnicy bitowo identycznego wyniku na
różnych platformach.

Rapier2D pozostaje udokumentowaną alternatywą, jeżeli w przyszłości
cross-platform exact stanie się wymaganiem albo złożoność świata przekroczy
możliwości Planck.js. Wtedy potrzebny jest osobny test odpowiedniego wariantu
deterministycznego.

## Los prototypu

Prototyp pozostaje tylko do obejrzenia wyniku przez właściciela. Po decyzji
o adapterze należy go usunąć albo zachować wyłącznie jako jawny artefakt T0;
nie wolno przenosić jego kodu automatycznie do produkcji.
