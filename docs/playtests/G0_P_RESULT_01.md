# G0-P — wynik sesji 01

**Data:** 2026-07-29
**Status:** zakończone; pivot zaakceptowany
**Scenariusz:** `BREEDER-01`

## Decyzja 1

- Reproduktor: **Strzała** `[S4, P3, T4]`
- Profil: **Odważny**
- Uzasadnienie w odpowiedzi: niepodane

## Pokolenie 2

| Pojazd | Pochodzenie | S | P | T | Wynik |
|---|---|---:|---:|---:|---|
| Strzała ♦ | chroniona kopia | 4 | 3 | 4 | 80 m |
| Strzała O-1 | `(+2, -1, -1)` | 5 | 2 | 3 | 90 m — daleki skok, zatrzymanie w końcowej części |
| Strzała O-2 | `(-1, +2, 0)` | 3 | 5 | 4 | 88 m — stabilna, zabrakło prędkości |
| Strzała O-3 | `(+1, +1, -2)` | 5 | 4 | 2 | 84 m — utrata stabilności i wypadek |

Żaden pojazd nie ukończył trasy.

## Decyzja 2

- Reproduktor: **Strzała O-1** `[S5, P2, T3]`
- Profil: **Zrównoważony**
- Uzasadnienie w odpowiedzi: niepodane

## Pokolenie 3

| Pojazd | Pochodzenie | S | P | T | Wynik |
|---|---|---:|---:|---:|---|
| Strzała O-1 ♦ | chroniona kopia | 5 | 2 | 3 | 90 m |
| Strzała Z-1 | `(+1, +1, -1)` | 5 | 3 | 2 | 84 m — wypadek przez utratę stabilności |
| Strzała Z-2 | `(-1, +1, +1)` | 4 | 3 | 4 | 80 m |
| Strzała Z-3 | `(+1, -1, +1)` | 5 | 1 | 4 | 90 m — stabilny skok, zbyt niski prześwit |

**Wynik sesji:** porażka; najlepszy postęp 90 m.

## Kontrfaktyczny wariant bez chronionej kopii

W tej ścieżce usunięcie kopii nie zmieniłoby najlepszego wyniku:

- w pokoleniu 2 dodatkowy mutant osiągnąłby 90 m zamiast kopii na 80 m;
- w pokoleniu 3 dodatkowy mutant powtórzyłby wariant 90 m zamiast kopii na 90 m.

Ten pojedynczy scenariusz nie daje dowodu za chronioną kopią. Pozwala natomiast zapytać, czy jej gwarancja ma wartość dla poczucia bezpieczeństwa, mimo że nie była potrzebna do najlepszego wyniku.

## Ocena końcowa

### Intencja drugiej decyzji

Gracz wybrał pojazd bliski celu i profil zrównoważony, ponieważ oczekiwał bezpiecznej poprawy prowadzącej do ukończenia trasy.

### Główne zastrzeżenie

Liczba iteracji pomiędzy decyzjami była zbyt mała. Gracz oczekuje pętli, w której:

> wybiera rozwiązanie, a aplikacja wykonuje wiele mutacji, zamiast pokazywać pojedynczą małą iterację.

### Wstępny werdykt

**Pivot mechaniki, nie stop produktu.**

- Fantazja wyboru rozwiązania pozostaje interesująca.
- Jedno pokolenie czterech kandydatów nie daje wystarczającego pola poszukiwań.
- Częstotliwość decyzji gracza powinna spaść, a ilość pracy wykonywanej przez aplikację po decyzji — wzrosnąć.
- Należy rozstrzygnąć, czy „wiele mutacji” oznacza dużą partię bezpośrednich potomków, czy wiele automatycznych pokoleń.

### Doprecyzowanie właściciela

Właściciel odrzucił oba warianty wymagające cyklicznego wyboru rodzica. Oczekiwane doświadczenie jest zbliżone do BoxCar2D:

> użytkownik wprowadza ustawienia, uruchamia autonomiczną ewolucję i obserwuje kolejne iteracje tak długo, jak sam zdecyduje.

Konsekwencje:

- brak obowiązkowej decyzji gracza co pokolenie;
- brak limitu pokoleń i skończonej sesji jako głównego modelu;
- automatyczna selekcja, reprodukcja i mutacja;
- sterowanie obserwacją: pause, resume, prędkość i stop;
- parametry konfiguracji jako główna sprawczość;
- historia, wykres i replay najlepszego pojazdu jako podstawowe sprzężenie zwrotne.

### Werdykt G0-P

**Pivot zaakceptowany i zamknięty.**

„Hodowca jednej linii” w wersji z ręcznym wyborem reproduktora zostaje odłożony.

Właściciel zaakceptował minimalny, autentyczny zakres:

- ciągłe automatyczne pokolenia;
- długi teren deterministyczny z seedu;
- geometryczny genom o stałej topologii i dwa koła;
- automatyczny dobór rodziców, proste krzyżowanie, mutacja i elity;
- konfigurację zamrożoną dla przebiegu;
- kontrolę tempa, replay i stop;
- brak edytora, ręcznego wyboru rodziców i trwałego zapisu populacji w v0.

**Końcowy werdykt:** pass do T0 dla zmienionej pętli, po osobnej zgodzie właściciela.

### Otwarte po playteście

- model automatycznej iteracji;
- miejsce kolejnej decyzji gracza;
- los chronionej kopii po zmianie modelu;
- docelowy kierunek po doprecyzowaniu pivotu.
