# Evolution Lab

## Aktualny kierunek

Evolution Lab ma być ciągłą symulacją ewolucji pojazdów inspirowaną BoxCar2D.

Użytkownik ustawia seed, populację, mutację i elity, uruchamia przebieg, a następnie obserwuje automatyczne kolejne pokolenia tak długo, jak chce. Może użyć pauzy, przyspieszenia, trybu bez renderowania, replayu najlepszego i stopu.

Nie wybiera rodziców ręcznie. Konfiguracja jest zamrożona dla przebiegu, a jej zmiana uruchamia nową populację.

## Status — 2026-11-04

- Discovery analityczne: zakończone.
- G0-P: zakończone pivotem od „Hodowcy jednej linii”.
- Zakres ciągłej symulacji: zaakceptowany przez właściciela.
- T0: zakończone.
- Platforma: kierunek browser-first; Godot wykluczony decyzją właściciela.
- Adapter fizyki: Planck.js 1.5.0 zatwierdzony przez właściciela.
- Zakres powtarzalności: ten sam zachowany build i runtime; zatwierdzony.
- Budżety M1–M4: zatwierdzone przez właściciela.
- G1: GO udzielone przez właściciela.
- M1–M4: zaimplementowane i zweryfikowane.
- Bazowe v0 przeszło playtest właściciela.
- v0.2: genom rozszerzony z 12 do 28 cech, zawieszenie, balast i 4 próby jednocześnie.
- Następny krok: playtest rozszerzonej ewolucji pojazdów.

Aktualny raport: [`docs/DECISION_BRIEF.md`](docs/DECISION_BRIEF.md).

## Pętla

```text
konfiguracja
→ populacja
→ próby
→ ranking
→ elity + rodzice
→ krzyżowanie + mutacja
→ następne pokolenie
→ ... do decyzji użytkownika
```

## Dokumentacja

- [`CONTEXT.md`](CONTEXT.md) — kanoniczny słownik domeny;
- [`docs/PROJECT_VISION.md`](docs/PROJECT_VISION.md) — wizja i granica produktu;
- [`docs/PRD.md`](docs/PRD.md) — wymagania ciągłej symulacji;
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — T0, G1 i droga M1–M4;
- [`docs/GENETIC_ALGORITHM_DESIGN.md`](docs/GENETIC_ALGORITHM_DESIGN.md) — automatyczna ewolucja;
- [`docs/ARCHITECTURE_OPTIONS.md`](docs/ARCHITECTURE_OPTIONS.md) — porównanie technologii;
- [`docs/t0/T0_BROWSER_RESULT.md`](docs/t0/T0_BROWSER_RESULT.md) — pomiary i rekomendacja T0;
- [`docs/adr/0001-use-planck-js-for-vehicle-physics.md`](docs/adr/0001-use-planck-js-for-vehicle-physics.md) — decyzja o adapterze;
- [`docs/adr/0002-bound-repeatability-to-same-build-and-runtime.md`](docs/adr/0002-bound-repeatability-to-same-build-and-runtime.md) — granica powtarzalności;
- [`docs/t0/T0_BUDGET_PROPOSAL.md`](docs/t0/T0_BUDGET_PROPOSAL.md) — zatwierdzone budżety M1–M4;
- [`docs/adr/0003-accept-v0-performance-and-retention-budgets.md`](docs/adr/0003-accept-v0-performance-and-retention-budgets.md) — decyzja o budżetach;
- [`docs/G1_IMPLEMENTATION_BRIEF.md`](docs/G1_IMPLEMENTATION_BRIEF.md) — porównanie stosu i zakres decyzji G1;
- [`docs/adr/0004-approve-production-stack-and-m1-m4.md`](docs/adr/0004-approve-production-stack-and-m1-m4.md) — zgoda na stos i implementację;
- [`docs/M1_M4_IMPLEMENTATION_REPORT.md`](docs/M1_M4_IMPLEMENTATION_REPORT.md) — wynik, pomiary i review;
- [`docs/LEARNING_EXPERIENCE.md`](docs/LEARNING_EXPERIENCE.md) — opcjonalna warstwa zrozumienia;
- [`docs/RISK_REGISTER.md`](docs/RISK_REGISTER.md) — aktualne ryzyka;
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — bramki i stan procesu.

Zapis G0-P znajduje się w [`docs/playtests/`](docs/playtests/), a historyczne materiały discovery w [`docs/discovery/`](docs/discovery/).

## Granica v0

W pierwszej wersji są:

- długi teren generowany z seedu;
- geometryczny pojazd o stałej topologii i dwóch kołach;
- 28 dziedziczonych i mutowanych genów: geometria, masa, balast, opony, napęd i zawieszenie;
- ocena 4 pojazdów jednocześnie, każdy z niezależną fizyką;
- automatyczne pokolenia bez limitu;
- elity, dobór rodziców, proste krzyżowanie i mutacja;
- podstawowe ustawienia, wykres i replay najlepszego.

Nie ma edytora, ręcznego wyboru rodziców, zmiennej liczby kół, wielu światów, zapisu populacji, kampanii, backendu ani obowiązkowego kursu.

## Kolejna bramka

Po playteście M1–M4 właściciel wybrał bogatsze konstrukcje i ocenę kilku
pojazdów naraz. Wersja v0.2 realizuje ten kierunek; wymaga oceny różnorodności
pojazdów i tempa kolejnych pokoleń podczas playtestu.

## Uruchomienie

```text
npm install
npm run dev
```

Kontrola jakości:

```text
npm test
npm run verify:budgets
npm run build
```
