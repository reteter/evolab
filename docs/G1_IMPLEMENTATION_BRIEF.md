# Evolution Lab — bramka G1

**Data:** 2026-07-29
**Status:** zaakceptowane przez właściciela; M1–M4 ukończone
**Decyzja właściciela:** GO udzielone 2026-07-29

## 1. Decyzja

G1 odpowiada na jedno pytanie:

> Czy rozpocząć produkcyjne M1–M4 z Planck.js i najkrótszym stosem
> browser-first opisanym poniżej?

**GO** zatwierdza stos, granice modułów i realizację kolejnych pionowych
wycinków M1–M4. Po każdym wycinku następuje weryfikacja; przekroczenie
budżetu albo decyzja produktowa zatrzymuje pracę zamiast rozszerzać zakres.

**NO-GO** pozostawia repozytorium bez kodu produkcyjnego. Prototyp T0 zachowuje
wyłącznie wartość dowodową.

## 2. Zamknięte wejścia

- cel: grywalna, ciągła obserwacja automatycznych pokoleń;
- platforma: browser-first; Godot wykluczony;
- zakres v0: jeden typ świata, stała topologia i dwa koła;
- fizyka: Planck.js 1.5.0;
- powtarzalność: ten sam manifest, zachowany build i runtime;
- budżety: zatwierdzone w
  [T0_BUDGET_PROPOSAL](t0/T0_BUDGET_PROPOSAL.md);
- backend, konta, trwały zapis i pełny klon BoxCar2D: poza v0.

Node, npm i Vite były zatwierdzone dotąd wyłącznie dla T0. Ich użycie
produkcyjne jest częścią tej bramki, a nie skutkiem ubocznym prototypu.

## 3. Porównanie stosu

### Język

| Wariant | Korzyść | Koszt | Werdykt |
|---|---|---|---|
| TypeScript w trybie strict | Sprawdza kontrakty genomu, manifestu, wyników i komend przed uruchomieniem; brak dodatkowego runtime | Krok kontroli typów i trochę jawnych modeli | **Rekomendowany** |
| JavaScript + JSDoc | Najmniej składni i można działać bez kompilacji typów | Słabsze egzekwowanie kontraktów w stanie długiego przebiegu | Odrzucony dla M1–M4 |

TypeScript zachowuje zachowanie JavaScript w runtime i usuwa typy podczas
budowania, więc nie poszerza aplikacji uruchomieniowej.

### Build i zależności

| Wariant | Korzyść | Koszt | Werdykt |
|---|---|---|---|
| Vite + npm lockfile | Statyczny build, krótka konfiguracja, przetestowana ścieżka T0, jeden pipeline dla aplikacji i testów | Node/npm jako narzędzia developerskie | **Rekomendowany** |
| Parcel + npm lockfile | Również prosty start i obsługa TypeScript bez rozbudowanej konfiguracji | Nowa, niezmierzona ścieżka bez przewagi dla tego projektu | Rezerwowy |
| `tsc` + natywne moduły ESM | Mało zależności narzędziowych | Ręczna obsługa zasobów, paczek, wersjonowania i dystrybucji | Za mało Leverage |

Vite służy tylko do pracy i utworzenia statycznego artefaktu. Aplikacja nie
wymaga Node ani serwera produkcyjnego.

### UI i renderowanie

| Wariant | Korzyść | Koszt | Werdykt |
|---|---|---|---|
| Semantyczny DOM + Canvas 2D + SVG | Najmniejszy transfer, natywna dostępność, bezpośrednia animacja jednego pojazdu, czytelny wykres | Ręczne, lecz małe projekcje stanu | **Rekomendowany** |
| React + Canvas 2D | Deklaratywne zarządzanie rozbudowanym UI | Dodatkowy cykl stanu i renderowania bez istotnej korzyści na jednym ekranie | Odłożyć do realnego wzrostu UI |
| DOM + PixiJS | Scena GPU i duża wydajność przy wielu obiektach | Dodatkowy renderer i lifecycle; WebGL jest nadmiarem dla jednej widocznej próby | Odłożyć do pomiaru renderera |

Canvas 2D obsługuje animację sterowaną przez JavaScript; złożony renderer GPU
nie daje obecnie wystarczającej Depth ani Leverage. Wykres ma dwie serie i
tekstowy odpowiednik, więc natywne SVG wystarcza bez biblioteki wykresów.

### Testy

| Wariant | Korzyść | Koszt | Werdykt |
|---|---|---|---|
| Vitest | Wspólny pipeline transformacji z Vite, szybkie testy modułów i kontraktów | Jedna zależność developerska | **Rekomendowany** |
| `node:test` | Stabilny runner w Node bez dodatkowej paczki | Osobna ścieżka transformacji względem aplikacji i mniej wygodne testy kodu browser-first | Rezerwowy dla czysto serwerowego kodu, którego v0 nie ma |

Test przeglądarkowy jest bramką akceptacji, ale M1 nie dodaje osobnego
frameworka end-to-end do paczki projektu. Jeśli ręczny lub zewnętrzny smoke
test przestanie wystarczać, narzędzie zostanie porównane przed dodaniem.

## 4. Rekomendowany stos G1

- browser runtime i statyczna dystrybucja;
- TypeScript strict;
- Vite oraz npm z przypiętym lockfile jako narzędzia developerskie;
- Planck.js 1.5.0;
- semantyczny DOM dla konfiguracji, sterowania i danych tekstowych;
- Canvas 2D dla świata i pojazdu;
- SVG dla trendu najlepszego i średniego wyniku;
- Vitest dla testów modułów i kontraktów;
- wykonanie in-process w porcjach;
- brak frameworka UI, PixiJS, biblioteki wykresów, workera i backendu.

Worker jest alternatywą warunkową: powstaje dopiero, gdy zaakceptowany budżet
100 ms albo przepustowości nie zostanie spełniony po ograniczeniu telemetrii
i rozmiaru porcji pracy.

## 5. Projekt głębokich modułów

W tym planie **Module** posiada wąski **Interface**, a szczegóły pozostają w
**Implementation**. Wysoka **Depth** oznacza, że mały Interface ukrywa dużo
reguł. **Seam** istnieje tylko tam, gdzie są co najmniej dwa Adaptery.
**Leverage** mierzy, ile zachowania uzyskujemy z małej powierzchni, a
**Locality** — czy zmiana pozostaje w jednym Module.

| Module | Interface do testowania | Ukryta Implementation |
|---|---|---|
| Run Controller | utworzenie przebiegu, komenda pauza/wznów/tempo/stop, obserwacja stanu | automat stanów, porcjowanie prób, anulowanie i przejścia pokoleń |
| Evolution Engine | populacja początkowa i następne pokolenie z jawnego manifestu | elity, rodzice, ranking, krzyżowanie, mutacja i domeny RNG |
| World Generator | seed + indeks fragmentu → kanoniczny teren | funkcja kształtu i cache fragmentów |
| Phenotype Builder | genom → kanoniczny opis pojazdu | normalizacja geometrii bez RNG |
| Simulation Port | opis świata i pojazdu → wynik próby + opcjonalny ślad | Adapter Planck.js i zarządzanie fixed timestep |
| Run Log | dopisanie wyniku → agregaty i rekordzista | retencja, limity pamięci i format replayu |
| Presentation | stan tylko do odczytu → DOM, Canvas i SVG | kamera, rysowanie i dostępna projekcja danych |

`Simulation Port` jest realnym Seam: T0 miało Adapter Planck.js i Adapter
Rapier, a testy Run Controllera użyją małego Adaptera deterministycznego.
Pozostałe reguły są głębokimi modułami in-process; nie otrzymują sztucznych
portów tylko „na przyszłość”.

Typy Planck.js nie mogą opuścić Adaptera. Interface każdego Module jest jego
główną powierzchnią testową.

## 6. Najkrótsza droga M1–M4

| Milestone | Grywalny przyrost | Bramka wyjścia |
|---|---|---|
| M1 — jedna próba | Seed tworzy teren i widoczny dwukołowy pojazd; działa start, pauza i restart | Stabilny wynik, render invariance, sterowanie w budżecie |
| M2 — pokolenia | Populacja przechodzi automatycznie przez ranking i co najmniej pięć pokoleń | Stała liczebność, poprawne pochodzenie, identyczny manifest daje identyczny hash |
| M3 — ciągły przebieg | Brak limitu pokoleń; tryb normalny, przyspieszony, headless i stop | Wszystkie właściwe budżety czasu, responsywności, stabilności i pamięci |
| M4 — obserwatorium | Konfiguracja, status, wykres, rekordzista, replay, podsumowanie i nowy przebieg | Pełny scenariusz PRD jest grywalny i daje decyzję G2-P |

Każdy milestone jest pionowym wycinkiem w tej samej aplikacji. Nie powstaje
osobny „rdzeń na zapas”, panel administracyjny ani ogólna platforma
symulacyjna.

## 7. Reguły wykonania po GO

1. Produkcyjny scaffold powstaje od zera; kod T0 nie jest kopiowany hurtowo.
2. Wersje zależności i narzędzi są przypięte, a build otrzymuje identyfikator.
3. Najpierw powstaje test Interface, potem minimalna Implementation danego
   pionowego wycinka.
4. Po każdym milestone wykonywane są testy deterministyczne, build i smoke
   test w Chromium.
5. Kalibracje game feel odbywają się wewnątrz zatwierdzonego modelu. Pytanie
   do właściciela pojawia się tylko, gdy zmiana wpływa na fantazję produktu,
   zakres albo zaakceptowany kompromis.
6. Nieprzejście budżetu zatrzymuje pracę i uruchamia diagnozę; nie dodaje
   automatycznie workera ani nie rozluźnia kontraktu.

## 8. Otwarte, lecz nieblokujące kalibracje

- zakresy geometrii i koła;
- profil terenu;
- wartości domyślne populacji, elit i mutacji w zatwierdzonych granicach;
- polityka doboru, operator krzyżowania i tie-break;
- limit stagnacji i długość próby;
- próbkowanie śladu replayu.

Są to decyzje game feel rozstrzygane pomiarem i krótkim playtestem w M1/M2,
nie osobna faza discovery.

## 9. Źródła pierwotne

- [TypeScript — statyczne sprawdzanie i brak dodatkowego runtime](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)
- [Vite — statyczny build produkcyjny i wspierane przeglądarki](https://vite.dev/guide/build)
- [Parcel — zero-configuration build i TypeScript](https://parceljs.org/)
- [MDN — animacje Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
- [React — model stanu i interaktywności](https://react.dev/learn/adding-interactivity)
- [PixiJS — renderery WebGL/WebGPU/Canvas](https://pixijs.com/8.x/guides/components/renderers)
- [Vitest — wspólny pipeline z Vite](https://vitest.dev/guide/why.html)
- [Node.js — stabilny runner `node:test`](https://nodejs.org/api/test.html)

## 10. Wynik decyzji

Właściciel udzielił:

> **GO — rozpocznij M1–M4 według rekomendacji G1.**

Implementacja i weryfikacja są opisane w
[M1_M4_IMPLEMENTATION_REPORT.md](M1_M4_IMPLEMENTATION_REPORT.md), a decyzję
utrwala [ADR-0004](adr/0004-approve-production-stack-and-m1-m4.md).
