# Project Vision — Evolution Lab

> **Dokument historyczny.** To wizja startowa sprzed discovery. Aktualny kierunek po G0-P opisuje [`docs/PROJECT_VISION.md`](docs/PROJECT_VISION.md): ciągła, autonomiczna ewolucja pojazdów inspirowana BoxCar2D, z nauką jako efektem drugorzędnym.

## Status dokumentu

- Etap: założenia startowe przed discovery; zastąpione 2026-07-29
- Właściciel produktu: użytkownik projektu
- Charakter dokumentu: kierunek i ograniczenia, nie specyfikacja implementacyjna
- Zasada zmian: istotne zmiany celów wymagają jawnej decyzji właściciela

## Wizja

Evolution Lab będzie interaktywnym laboratorium, w którym użytkownik obserwuje, jak populacja rozwiązań zmienia się pod wpływem selekcji, dziedziczenia, krzyżowania i mutacji.

Pierwszym laboratorium będzie symulacja pojazdów inspirowana BoxCar2D. Pojazdy opisane genomem próbują pokonać tę samą trasę. Wyniki prób wpływają na wybór rodziców i tworzenie kolejnych pokoleń. Użytkownik nie ogląda wyłącznie zwycięzcy — może zobaczyć, dlaczego dana konstrukcja powstała, co odziedziczyła i jak konkretne parametry algorytmu wpłynęły na populację.

Docelowo Evolution Lab może stać się ramą dla kolejnych eksperymentów, takich jak pokonywanie labiryntów, ewolucja strategii lub optymalizacja prostych systemów. Pierwsza wersja nie ma jednak budować uniwersalnej platformy. Ma potwierdzić wartość pomysłu na jednym, dobrze zaprojektowanym eksperymencie.

## Problem

Ogólne opisy algorytmów genetycznych pozwalają zrozumieć ich słownictwo, ale często nie budują intuicji. Trudno odczuć konsekwencje zmiany współczynnika mutacji, presji selekcyjnej czy wielkości populacji bez obserwowania konkretnych osobników i kolejnych pokoleń.

Wiele demonstracji pokazuje wynik końcowy, ale ukrywa proces. Evolution Lab ma odsłonić mechanizm:

- jak genom jest zamieniany na fenotyp;
- jak liczony jest fitness;
- dlaczego wybrano konkretnych rodziców;
- które cechy zostały odziedziczone;
- gdzie wystąpiły mutacje;
- jak zmienia się jakość i różnorodność populacji;
- dlaczego postęp czasem przyspiesza, zatrzymuje się lub cofa.

## Cele produktu

### Cel 1: działający eksperyment

Stworzyć niewielką, czytelną symulację, w której populacja pojazdów ewoluuje i z czasem lepiej radzi sobie z trasą.

### Cel 2: nauka przez obserwację

Pozwolić użytkownikowi zrozumieć algorytm genetyczny na konkretnych przykładach, a nie wyłącznie przez tekst lub wzory.

### Cel 3: nauka przez eksperyment

Umożliwić zmianę kluczowych parametrów, powtarzanie eksperymentów i porównywanie wyników, tak aby użytkownik mógł stawiać hipotezy i sprawdzać ich konsekwencje.

### Cel 4: poligon workflow agentowego

Użyć projektu do oceny, jak skutecznie prowadzić małe i średnie przedsięwzięcia z zespołem agentów AI, przy ograniczonym koszcie koordynacji i tokenów.

## Odbiorcy

### Odbiorca główny

Właściciel projektu, który zna ogólną ideę algorytmów genetycznych, ale chce zbudować praktyczną intuicję przez obserwację i eksperyment.

### Możliwi odbiorcy dalsi

- osoby uczące się algorytmów ewolucyjnych;
- programiści szukający wizualnego przykładu;
- nauczyciele i autorzy materiałów edukacyjnych;
- gracze zainteresowani emergentnymi konstrukcjami.

Discovery nie powinno zakładać publicznego produktu edukacyjnego od pierwszej wersji. Najpierw należy stworzyć wartościowe narzędzie dla odbiorcy głównego.

## Główne doświadczenie użytkownika

Użytkownik powinien móc:

1. uruchomić deterministyczny eksperyment z konkretnym seedem;
2. obserwować próbę jednego osobnika lub całej populacji;
3. zobaczyć wynik fitness oraz jego składowe;
4. przejść do następnej generacji ręcznie lub automatycznie;
5. sprawdzić, którzy rodzice utworzyli potomka;
6. zobaczyć odziedziczone cechy i mutacje;
7. śledzić najlepszy i średni fitness oraz różnorodność populacji;
8. zmienić wybrane parametry algorytmu i porównać wyniki;
9. otrzymać krótkie, kontekstowe wyjaśnienie obserwowanego zjawiska.

## Hipotezy do sprawdzenia podczas discovery

- Pojazd jest wystarczająco atrakcyjnym i zrozumiałym fenotypem dla pierwszego laboratorium.
- Uproszczona reprezentacja pojazdu może pokazać istotę ewolucji bez nadmiernej komplikacji fizyki.
- Determinizm oparty na seedach jest konieczny do nauki i porównywania eksperymentów.
- Wizualizacja pochodzenia osobników jest ważniejsza edukacyjnie niż rozbudowany edytor ręczny.
- Pierwszy pionowy wycinek może używać selekcji i mutacji bez pełnego krzyżowania.
- Jedna stała trasa lepiej służy walidacji niż proceduralny teren na początku projektu.

Hipotezy nie są decyzjami. Zespół ma je zweryfikować, podważyć lub doprecyzować.

## Kryteria sukcesu pierwszego pionowego wycinka

Pierwszy pionowy wycinek można uznać za udany, jeśli:

- ten sam seed i konfiguracja prowadzą do powtarzalnego przebiegu w uzgodnionym zakresie;
- użytkownik rozumie związek między genomem a widocznym pojazdem;
- można prześledzić co najmniej selekcję, reprodukcję i mutację;
- wykresy lub inne wizualizacje pokazują zmianę jakości populacji;
- zmiana jednego istotnego parametru daje widoczny i możliwy do wyjaśnienia efekt;
- użytkownik potrafi po eksperymencie własnymi słowami opisać działanie podstawowej pętli algorytmu;
- system daje podstawę do dalszego rozwoju bez projektowania z góry uniwersalnej platformy.

## Początkowy zakres

Kandydat na pierwszy pionowy wycinek:

- jedna stała trasa;
- jeden typ pojazdu generowany z ograniczonego genomu;
- mała populacja;
- powtarzalna symulacja prób;
- prosta i jawna funkcja fitness;
- selekcja rodziców;
- kopiowanie z mutacją, ewentualnie proste krzyżowanie, jeśli discovery je uzasadni;
- ręczne przejście do kolejnej generacji;
- podgląd genomu, wyniku i pochodzenia osobnika;
- wykres najlepszego i średniego fitnessu.

Zakres ma zostać zweryfikowany w discovery.

## Poza zakresem pierwszej wersji

Bez osobnej decyzji właściciela poza zakresem pozostają:

- rozbudowana gra z kampanią, ekonomią lub systemem progresji;
- multiplayer;
- zaawansowany ręczny edytor pojazdu;
- proceduralne trasy jako warunek uruchomienia MVP;
- wiele laboratoriów ewolucyjnych;
- własny pełny silnik fizyczny;
- realistyczna symulacja energii i materiałów;
- konta użytkowników, chmura i funkcje społecznościowe;
- natywne aplikacje na wiele platform;
- optymalizacja pod bardzo duże populacje przed potwierdzeniem wartości doświadczenia.

## Zasady projektowe

1. **Widoczny mechanizm ponad widowiskowość.** Każda ważna operacja algorytmu powinna być możliwa do zaobserwowania lub wyjaśnienia.
2. **Eksperyment ponad pasywną prezentację.** Użytkownik powinien móc zmieniać parametry i porównywać konsekwencje.
3. **Powtarzalność ponad przypadkowość bez śladu.** Seed, konfiguracja i wyniki muszą wspierać odtwarzanie eksperymentów.
4. **Mały pionowy wycinek ponad szeroką platformę.** Najpierw potwierdzamy rdzeń doświadczenia.
5. **Jawne kompromisy ponad pozorną pewność.** Warianty techniczne i produktowe mają być porównane przed wyborem.
6. **Nauka workflow bez nadmiernej ceremonii.** Dokumentacja i delegowanie muszą przynosić wartość większą niż ich koszt.

## Ograniczenia procesu

- Discovery nie tworzy kodu produkcyjnego.
- Zespół nie wybiera technologii bez porównania realnych alternatyw.
- Nie każda rola wymaga osobnego agenta.
- Drobne zadania i korekty wykonuje Orchestrator inline.
- Decyzje produktowe, istotne kompromisy i zmiany zakresu wracają do właściciela.

## Otwarte pytania

Discovery powinno co najmniej odpowiedzieć na pytania:

- Co dokładnie tworzy genom pierwszego pojazdu?
- Jak z genomu powstaje fenotyp?
- Jak zbalansować czytelność, ciekawą fizykę i koszt symulacji?
- Jakie składowe fitnessu są potrzebne, a które zaciemniają naukę?
- Jaka strategia selekcji najlepiej nadaje się do pierwszego laboratorium?
- Czy krzyżowanie należy do pierwszego pionowego wycinka?
- Jak mierzyć i pokazywać różnorodność?
- Jak porównywać eksperymenty z różnymi konfiguracjami?
- Które elementy wyjaśniać automatycznie, a które pozostawić do eksploracji?
- Jaki stack najlepiej wspiera interaktywną fizykę, wykresy, deterministyczne testy i dalszy rozwój?
