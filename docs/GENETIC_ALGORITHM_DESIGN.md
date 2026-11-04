# Evolution Lab — model ciągłej ewolucji

**Data aktualizacji:** 2026-07-29

**Status:** pętla i operator v0 zaimplementowane; wartości domyślne pozostają kalibracją playtestu
**Cel:** autonomiczne, nieograniczone pokolenia z zachowaniem czytelnego i powtarzalnego przebiegu

## 1. Pętla

```text
populacja
→ próby
→ ranking
→ elity
→ automatyczny dobór rodziców
→ krzyżowanie
→ mutacja
→ następna populacja
```

Pętla powtarza się do zatrzymania przebiegu przez użytkownika. Nie istnieje ręczny wybór rodzica ani globalny limit pokoleń.

## 2. Model pojęciowy

Słownik kanoniczny znajduje się w [CONTEXT.md](../CONTEXT.md).

Najważniejsze rozróżnienia:

- konfiguracja jest zamrożona dla całego przebiegu;
- pauza nie kończy przebiegu;
- replay nie uruchamia ponownie fizyki;
- stop kończy przebieg;
- wynik oznacza dopasowanie do jednego świata, nie ogólną jakość pojazdu.

## 3. Świat

Świat jest długim terenem generowanym deterministycznie z osobnego seedu.

- Każda populacja korzysta z tego samego świata.
- Kolejne fragmenty terenu zależą wyłącznie od seedu i indeksu fragmentu.
- Renderowanie nie może zużywać losowości świata.
- Trudność może rosnąć wraz z dystansem, ale reguła pozostaje wersjonowana.
- W v0 grawitacja, materiały i profil trudności są stałe.

## 4. Genom i fenotyp

### Implementacja v0.2 — 2026-11-04

Stała topologia:

- korpus z zamkniętego wielokąta wokół środka;
- dokładnie dwa koła;
- każde koło ma osobne sprężynowane zawieszenie na osi pionowej korpusu;
- napęd, materiały i rozkład masy podlegają ewolucji.

Genom obejmuje 28 genów ciągłych:

| Grupa | Wpływ |
|---|---|
| 7 cech korpusu | szerokość, wysokość, dach, przód, tył, nachylenie i przesunięcie dachu |
| 4 cechy geometrii kół | rozstaw oraz promień każdego koła |
| 4 cechy napędu | obroty, moment, podział momentu między osiami i względne obroty przodu |
| 5 cech materiałów | gęstość korpusu oraz gęstość i przyczepność każdego koła |
| 6 cech zawieszenia | prześwit, częstotliwość sprężyny i tłumienie osobno dla obu kół |
| 2 cechy balastu | masa i położenie dodatkowego obciążenia |

Korpus ma osiem wierzchołków. Zakresy wszystkich cech znajdują się w
`src/domain/evolution.ts`; inspektor w aplikacji pokazuje wartości lidera lub
pojazdu odtwarzanego w replayu.

Kontroler ocenia cztery pojazdy jednocześnie w osobnych światach Planck.
Po zakończeniu próby wolne miejsce zajmuje następny pojazd. Nowe pokolenie
powstaje dopiero po ocenie całej populacji. Symulacje są przeplatane na głównym
wątku, z tym samym stałym krokiem fizyki; pojazdy nie zderzają się ze sobą.

### Ograniczenia poprawności

- punkty mocowania kół znajdują się po przeciwnych stronach korpusu;
- korpus jest prosty i ma minimalne pole;
- promienie pozostają w bezpiecznym zakresie;
- pojazd nie zaczyna z trwałą kolizją własną;
- mapowanie nie wykonuje losowej naprawy.

### Poza v0

- zmienna liczba wierzchołków;
- zmienna liczba kół;
- ręczny edytor.

## 5. Populacja początkowa

Każdy genom jest generowany z wersjonowanego rozkładu i domeny RNG `population-init`.

Manifest zapisuje:

- seed przebiegu;
- liczebność populacji;
- wersję schematu genomu;
- wersję inicjalizacji;
- zakresy genów;
- wersję normalizacji.

Rozkład musi generować wystarczająco różnorodne, lecz najczęściej zdolne do ruchu pojazdy. Dokładna populacja i zakresy są kalibracją.

## 6. Próba i wynik

### Zatrzymanie próby

Pojazd kończy próbę, gdy:

- nie poprawia maksymalnego postępu przez ustaloną liczbę kroków;
- trwale wypada poza bezpieczny obszar;
- przekracza maksymalny limit kroków.

### Ranking

Podstawowy porządek:

1. większy maksymalny postęp;
2. większa średnia prędkość do tego postępu;
3. stabilny, seedowany tie-break zapisany w wyniku.

Główny ekran eksponuje dystans. Pomocnicze składowe służą jednoznacznemu rankingowi, nie osobnej punktacji gry.

## 7. Elity

Pierwsze `E` pojazdów rankingu jest kopiowane bez zmian do następnego pokolenia.

- `E` jest ustawieniem przebiegu.
- `0 ≤ E < N`.
- Elita zachowuje genom i pochodzenie, ale otrzymuje nowy identyfikator wystąpienia w pokoleniu.
- Kopia elity nie zużywa RNG krzyżowania ani mutacji.

Domyślna wartość wymaga kalibracji; kandydatem jest jedna elita.

## 8. Dobór rodziców

Każdy nieelitarny potomek ma dwoje rodziców wybranych automatycznie z ocenionej populacji.

### Kandydat

Selekcja rangowa z biasem:

- wyższy ranking zwiększa prawdopodobieństwo wyboru;
- słabsze pojazdy zachowują niezerową szansę;
- rodzice jednego potomka są różni, jeśli populacja na to pozwala;
- dokładny rozkład jest wersjonowany.

### Alternatywa

Selekcja turniejowa jest prostsza do testowania i ma jeden parametr presji. Powinna zastąpić wariant rangowy, jeśli T0 lub kalibracja wykaże łatwiejszą stabilność albo lepszą różnorodność.

Ruletka po surowym wyniku pozostaje odłożona z powodu wrażliwości na skalę.

## 9. Krzyżowanie

Kandydatem v0 jest proste krzyżowanie jednostajne:

- każdy gen potomka pochodzi od jednego z dwóch rodziców;
- wybór źródła jest seedowany;
- grupy indeksów dyskretnych przechodzą tę samą walidację co inicjalizacja;
- pochodzenie każdego genu może zostać zapisane, ale nie musi być stale widoczne.

Alternatywą jest krzyżowanie blokowe rozdzielające korpus i koła. Należy je wybrać, jeśli jednostajne krzyżowanie zbyt często niszczy użyteczne konstrukcje.

## 10. Mutacja

Dwa ustawienia użytkownika:

- **częstość mutacji** — niezależne prawdopodobieństwo zmiany każdego genu;
- **siła mutacji** — maksymalna skala zmiany genu ciągłego.

### Geny ciągłe

Kandydatem jest symetryczna zmiana trójkątna otrzymana z różnicy dwóch liczb jednostajnych. Wartość pozostaje w zakresie przez wersjonowaną politykę odbicia albo obcięcia.

### Geny dyskretne

Mutacja wybiera inną dozwoloną wartość z deterministycznie uporządkowanego zbioru.

Każda mutacja zapisuje wartość przed, zmianę i wartość po.

## 11. RNG

Oddzielne, wersjonowane domeny:

- `world`;
- `population-init`;
- `parent-selection`;
- `crossover`;
- `mutation`;
- `ranking-tie`;
- `presentation`, która nigdy nie wpływa na ewolucję.

Seed jest wyprowadzany co najmniej z identyfikatora przebiegu, pokolenia, potomka, genu i rodzaju operacji. Zmiana tempa albo renderowania nie może przesunąć losowań domenowych.

## 12. Historia

Dla każdego pokolenia zapisuje się:

- konfigurację i wersje reguł;
- genomy i wyniki populacji;
- ranking;
- skopiowane elity;
- rodziców potomka;
- źródło genów po krzyżowaniu;
- mutacje;
- najlepszy i średni wynik;
- ślad najlepszego, jeśli ustanowił rekord przebiegu.

Pełna historia może być utrzymywana w pamięci tylko w granicach budżetu. Trwałe archiwum przebiegu jest poza v0.

## 13. Inwarianty

- Liczebność populacji jest stała.
- Wszystkie pojazdy pokolenia są oceniane w tym samym świecie.
- Ustawienia nie zmieniają się w trakcie przebiegu.
- Każdy nieelitarny pojazd ma dokładnie dwóch zapisanych rodziców.
- Elity nie są mutowane.
- Genomy zawsze spełniają ograniczenia schematu.
- Renderowanie, tempo i replay nie zmieniają wyników ani potomstwa.
- Ta sama zachowana wersja, seed i konfiguracja spełniają uzgodniony kontrakt powtarzalności.

## 14. Otwarte kalibracje

- liczba wierzchołków;
- zakresy geometrii i kół;
- liczebność populacji;
- domyślna liczba elit;
- rangowa vs turniejowa selekcja;
- bias lub rozmiar turnieju;
- jednostajne vs blokowe krzyżowanie;
- domyślne parametry mutacji;
- odbicie vs obcięcie;
- limit stagnacji i kroków;
- tie-break;
- trudność terenu.

Zmiana semantyki operatora wymaga nowej wersji manifestu.

## 15. Referencja inspiracji

Zakres zachowuje rdzeń znany z [HTML5 Genetic Cars](https://rednuht.org/genetic_cars_2/) — automatyczne pokolenia, mutację, elity, seeded world, przyspieszenie, replay i wykres — ale nie kopiuje jego pełnego genomu, parametrów ani implementacji.
