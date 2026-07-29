# Evolution Lab — pakiet startowy

Evolution Lab to projekt niewielkiego, interaktywnego laboratorium algorytmów ewolucyjnych. Pierwszym eksperymentem będzie symulacja pojazdów inspirowana ideą BoxCar2D: populacja konstrukcji próbuje pokonać trasę, a kolejne pokolenia powstają przez selekcję, dziedziczenie i mutacje.

Projekt ma trzy równorzędne cele:

1. stworzyć przystępne laboratorium, w którym ewolucję można obserwować i kontrolować;
2. nauczyć właściciela projektu praktycznego działania algorytmów genetycznych;
3. wypracować oszczędny i skuteczny workflow współpracy z agentami AI.

Ten pakiet nie zawiera kodu aplikacji ani gotowych decyzji technicznych. Służy do przeprowadzenia discovery, porównania wariantów i przygotowania projektu do świadomej decyzji o rozpoczęciu implementacji.

## Zawartość

```text
Evolution_Lab_Starter_Pack/
├── README.md
├── PROJECT_VISION.md
├── TEAM_CHARTER.md
├── DISCOVERY_PROCESS.md
└── ORCHESTRATOR_PROMPT.md
```

- `PROJECT_VISION.md` — definiuje problem, cele, odbiorców, kryteria sukcesu i granice projektu.
- `TEAM_CHARTER.md` — opisuje role, odpowiedzialności i reguły oszczędnego delegowania pracy.
- `DISCOVERY_PROCESS.md` — prowadzi zespół od pytań otwartych do rekomendacji, roadmapy i bramki decyzyjnej.
- `ORCHESTRATOR_PROMPT.md` — zawiera gotowy prompt uruchamiający pierwszą sesję discovery.

## Jak rozpocząć

1. Utwórz nowe, puste repozytorium, na przykład `evolution-lab`.
2. Skopiuj pięć plików z tego pakietu do katalogu głównego repozytorium.
3. Zainicjalizuj Git i zapisz pierwszy commit, na przykład:

   ```text
   chore: initialize Evolution Lab discovery workspace
   ```

4. Otwórz repozytorium w Codexie.
5. Wklej treść sekcji „Prompt do uruchomienia” z pliku `ORCHESTRATOR_PROMPT.md`.
6. Pozwól Orchestratorowi przeprowadzić discovery, ale nie zatwierdzaj implementacji przed otrzymaniem raportu decyzyjnego.

## Oczekiwany rezultat discovery

Po zakończeniu discovery repozytorium powinno zawierać uzgodniony zestaw dokumentów:

```text
docs/
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

Nazwy mogą zostać nieznacznie zmienione, jeśli Orchestrator przedstawi dobry powód. Ważniejsza od struktury katalogów jest kompletność decyzji.

## Bramka przed implementacją

Discovery kończy się krótkim raportem dla właściciela projektu. Raport musi przedstawiać:

- rekomendowany zakres pierwszego pionowego wycinka;
- alternatywy techniczne i rekomendowany kierunek;
- proponowaną reprezentację genomu i funkcję fitness;
- sposób pokazania selekcji, dziedziczenia i mutacji;
- roadmapę i najważniejsze ryzyka;
- pytania, których nie powinien rozstrzygać sam zespół AI.

Do czasu akceptacji raportu nie należy tworzyć kodu produkcyjnego, scaffoldu aplikacji, zależności, migracji ani backlogu implementacyjnego o fałszywej precyzji.

## Zasada przewodnia

Najpierw należy udowodnić, że mała, deterministyczna symulacja potrafi w czytelny sposób pokazać zmianę populacji między pokoleniami. Dopiero później warto rozwijać edytor pojazdów, proceduralne trasy, rozbudowaną fizykę i kolejne laboratoria.

