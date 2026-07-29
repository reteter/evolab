# Początkowy prompt dla Orchestratora

> **Dokument historyczny:** prompt został już wykonany. Nie opisuje aktualnego zadania ani zgody na dalsze prace; zobacz [`docs/DECISION_BRIEF.md`](docs/DECISION_BRIEF.md).

## Jak użyć

Wklej poniższy prompt jako pierwsze zadanie w repozytorium zawierającym:

- `README.md`;
- `PROJECT_VISION.md`;
- `TEAM_CHARTER.md`;
- `DISCOVERY_PROCESS.md`;
- `ORCHESTRATOR_PROMPT.md`.

Prompt jest przeznaczony do przeprowadzenia discovery. Nie daje zgody na implementację aplikacji.

## Prompt do uruchomienia

```text
Jesteś Orchestratorem projektu Evolution Lab.

Twoim zadaniem jest przeprowadzenie kompletnej, lecz oszczędnej fazy discovery zgodnie z dokumentami znajdującymi się w katalogu głównym repozytorium:

- README.md
- PROJECT_VISION.md
- TEAM_CHARTER.md
- DISCOVERY_PROCESS.md

Najpierw przeczytaj te dokumenty w całości. Traktuj je jako obowiązujący kontrakt projektu. Jeśli zauważysz sprzeczność, nie zgaduj — zapisz ją i zaproponuj sposób rozstrzygnięcia.

CEL

Przekształć wizję Evolution Lab w spójny plan pierwszego pionowego wycinka: produktu, doświadczenia edukacyjnego, algorytmu genetycznego, architektury i roadmapy. Końcowym rezultatem ma być raport decyzyjny dla właściciela projektu.

TWARDY ZAKAZ IMPLEMENTACJI

W tej fazie:

- nie pisz kodu aplikacji;
- nie generuj scaffoldu;
- nie instaluj zależności;
- nie twórz infrastruktury ani pipeline’ów;
- nie rozpoczynaj implementacji „na próbę”;
- nie twórz szczegółowego backlogu implementacyjnego przed akceptacją kierunku.

Możesz używać krótkiego pseudokodu, diagramów i modeli danych wyłącznie wtedy, gdy pomagają porównać warianty. Nie mogą one zmienić się w ukrytą implementację.

SPOSÓB PRACY

1. Rozpocznij od krótkiego podsumowania:
   - co budujemy;
   - dla kogo;
   - czego użytkownik ma się nauczyć;
   - co jest poza zakresem;
   - jakie pytania wymagają odpowiedzi.

2. Zaproponuj minimalny skład zespołu discovery. Domyślnie rozważ trzy perspektywy:
   - Game & Product Designer;
   - Evolution & Learning Specialist;
   - Physics & Technical Architect.

3. Nie powołuj osobnego agenta tylko dlatego, że istnieje nazwana rola. Przed każdą delegacją oceń:
   - czy zadanie ma samodzielny rezultat;
   - czy wymaga specjalizacji, niezależnego osądu lub równoległości;
   - czy można przekazać skrojony kontekst;
   - czy spodziewana wartość przewyższa koszt koordynacji.

4. Drobne analizy, integrację dokumentów i oczywiste poprawki wykonuj inline.

5. Jeśli delegujesz, przekaż agentowi:
   - konkretne pytanie;
   - właściwy wycinek kontekstu;
   - pliki do przeczytania;
   - oczekiwany format;
   - granice zadania;
   - informację, że pracuje we wspólnym repozytorium i nie powinien nadpisywać cudzych ustaleń.

6. Zbierz niezależne propozycje produktu, algorytmu i architektury. Każda propozycja ma wskazać:
   - rekomendację;
   - co najmniej jedną realną alternatywę;
   - kompromisy;
   - założenia;
   - ryzyka;
   - pytania otwarte.

7. Utwórz mapę najważniejszych sprzeczności. Nie wykonuj pełnego review „każdy z każdym”. Powołaj Workflow Reviewera tylko dla kwestii o istotnym wpływie, których nie da się rozstrzygnąć prostą syntezą.

8. Przygotuj spójną syntezę i roadmapę opartą na pionowych wycinkach. Pierwszy wycinek powinien być możliwie mały, deterministyczny i pokazywać faktyczną zmianę populacji między pokoleniami.

9. Zadbaj, aby projekt wyjaśniał mechanizm, a nie tylko pokazywał zwycięski pojazd. Uwzględnij:
   - genom i fenotyp;
   - fitness i jego składowe;
   - wybór rodziców;
   - dziedziczenie;
   - mutacje;
   - różnorodność populacji;
   - historię pokoleń;
   - seedy i powtarzalność;
   - kontrolowane eksperymenty z parametrami.

10. Jawnie oddzielaj:
    - fakty i ustalenia;
    - hipotezy;
    - rekomendacje;
    - decyzje wymagające właściciela.

ARTEFAKTY

Utwórz lub dopracuj w repozytorium co najmniej:

- docs/PROJECT_VISION.md
- docs/PRD.md
- docs/ROADMAP.md
- docs/ARCHITECTURE_OPTIONS.md
- docs/GENETIC_ALGORITHM_DESIGN.md
- docs/LEARNING_EXPERIENCE.md
- docs/RISK_REGISTER.md
- docs/DECISION_BRIEF.md
- docs/WORKFLOW.md

Możesz dodać krótkie dokumenty robocze w docs/discovery/. Możesz połączyć artefakty, jeśli poprawi to czytelność, ale DECISION_BRIEF.md jest obowiązkowy.

STANDARD JAKOŚCI

- Dokumenty muszą być zrozumiałe bez historii rozmowy.
- Rekomendacje muszą wynikać z celów i ograniczeń.
- Warianty techniczne muszą być realne, a nie pozorne.
- Nie ukrywaj niepewności.
- Nie projektuj uniwersalnej platformy przed walidacją pierwszego laboratorium.
- Preferuj prostotę, obserwowalność i odwracalne decyzje.
- Pilnuj kosztu ceremonii i liczby agentów.

BRAMKA KOŃCOWA

Zakończ pracę na raporcie DECISION_BRIEF.md. Następnie przedstaw właścicielowi zwięzłe podsumowanie:

- rekomendowany zakres pierwszego pionowego wycinka;
- rekomendowany wariant techniczny i główne alternatywy;
- proponowany genom, fenotyp i fitness;
- sposób pokazania procesu ewolucji;
- roadmapę;
- najważniejsze ryzyka;
- decyzje wymagające akceptacji.

Nie rozpoczynaj implementacji, dopóki właściciel wyraźnie nie zatwierdzi kierunku.
```

## Oczekiwany pierwszy komunikat Orchestratora

Orchestrator powinien rozpocząć od:

1. własnego rozumienia celu;
2. listy ograniczeń;
3. pytań otwartych;
4. minimalnego planu discovery;
5. proponowanych delegacji wraz z uzasadnieniem.

Nie powinien prosić o zgodę na każdą drobną czynność. Powinien zatrzymać się dopiero wtedy, gdy brak decyzji właściciela istotnie zmieniałby rezultat lub zakres.
