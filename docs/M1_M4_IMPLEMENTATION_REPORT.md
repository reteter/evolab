# Evolution Lab — raport implementacji M1–M4

**Data:** 2026-07-29
**Status:** ukończone i zweryfikowane
**Następna bramka:** G2-P — playtest i wybór dalszego kierunku

## Dostarczony rezultat

Powstała lokalna, statyczna aplikacja browser-first, w której użytkownik:

- ustawia seed, populację, elity oraz częstość i siłę mutacji;
- uruchamia automatyczny przebieg bez limitu pokoleń;
- ogląda jedną próbę w normalnym albo przyspieszonym tempie;
- przełącza się na liczenie bez obrazu;
- używa pauzy, wznowienia i stopu;
- śledzi dystans, rekord, średnią i wykres pokoleń;
- odtwarza rekordzistę z zapisanego śladu, bez ponownej fizyki;
- po zatrzymaniu rozpoczyna niezależny przebieg z nową konfiguracją.

Nie dodano frameworka UI, workera, backendu, trwałego zapisu ani funkcji spoza
PRD.

## Moduły

| Module | Odpowiedzialność |
|---|---|
| Evolution Engine | populacja, ranking, elity, rodzice, krzyżowanie, mutacja i hash |
| World Generator | długi teren wyłącznie z seedu |
| Phenotype Builder | poprawny, wypukły opis pojazdu bez RNG |
| Simulation Port | realny Seam z produkcyjnym Adapterem Planck.js |
| Trial Evaluation | fixed timestep, stagnacja, wynik i ograniczony ślad |
| Run Controller | ciągłe pokolenia, tempo, pauza, stop i stan replayu |
| Run Log | agregaty, kompresja długiej historii i rekordzista |
| Presentation | semantyczny DOM, Canvas 2D, SVG i tabela danych |

Typy Planck.js nie wychodzą poza Adapter. Renderowanie, tempo i replay nie
zużywają RNG ewolucji.

## Weryfikacja

| Bramka | Wynik |
|---|---:|
| Testy automatyczne | 17/17 przechodzi |
| TypeScript strict | przechodzi |
| Build produkcyjny | przechodzi |
| Przepustowość headless | 110 203 kroków/s |
| Pokolenie, populacja 20 | P95 250,0 ms; przeglądarka 273,9 ms |
| Stabilność | 0 wyjątków, NaN, Infinity i nieważnych prób w zestawie |
| Powtarzalność | 10/10 identycznych hashy |
| Render invariance | identyczny wynik z obserwatorem i bez niego |
| Normalna obserwacja | średnio 59,98 FPS; P95 klatki 16,9 ms |
| Pauza | potwierdzenie 0,6 ms |
| Stop | potwierdzenie 0,5 ms |
| Pierwsza interakcja | DOM interactive 12,6 ms; load 47,1 ms lokalnie |
| Początkowy transfer gzip | 62,88 kB |
| Pamięć po rozgrzaniu | około +9,3 MB / 1 000 pokoleń; 38,2 MB po pomiarze |
| Retencja | ślad poniżej 2 MB; historia kompresowana do maks. 1 200 punktów |
| Responsywność | brak poziomego overflow przy 390 px |
| Browser QA | start, 305+ pokoleń, tempo, pauza, replay, stop i nowy przebieg |
| Konsola przeglądarki | 0 błędów |

Pomiary wykonano na zatwierdzonym środowisku właściciela. Pierwsza interakcja
jest pomiarem lokalnego artefaktu produkcyjnego i nie obejmuje opóźnienia
zewnętrznego hostingu.

## Self-review

Review objęło poprawność, zgodność z PRD, dostępność, wydajność, retencję,
bezpieczeństwo danych wejściowych i wycieki typów Planck.js.

W trakcie review poprawiono:

1. wypełnianie obszaru pod liniami wykresu zamiast samych linii;
2. akceptowanie `NaN` i `Infinity` w dwóch ustawieniach domenowych;
3. podsumowanie, które mogło liczyć rozpoczęte, lecz nieukończone pokolenie.

Nie pozostały znane błędy o wysokim ani średnim priorytecie.

## Pozostałe ryzyka produktowe

- atrakcyjność obserwacji po kilku–kilkunastu minutach wymaga playtestu;
- część seedów może prowadzić do szybszej stagnacji albo podobnych konstrukcji;
- przeglądarka może ograniczać tempo karty działającej długo w tle;
- wynik właściciela jest sygnałem kierunkowym, nie walidacją rynku.

## Następny krok

Uruchomić playtest G2-P na domyślnej konfiguracji, a następnie wybrać najwyżej
jeden kierunek: bogatsze ustawienia, konstrukcje, tereny, zapis przebiegów,
opcjonalna ingerencja albo stop/pivot.
