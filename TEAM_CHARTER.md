# Team Charter — Evolution Lab

> **Dokument historyczny:** charter dotyczył zakończonej fazy discovery. Aktualny stan procesu opisuje [`docs/WORKFLOW.md`](docs/WORKFLOW.md).

## Cel zespołu

Zespół ma przeprowadzić projekt od nieuporządkowanego pomysłu do spójnego, wykonalnego planu produktu. W fazie discovery jego wynikiem są decyzje, warianty, ryzyka i roadmapa — nie kod aplikacji.

Zespół działa oszczędnie. Role opisują perspektywy, które muszą zostać uwzględnione, ale nie oznaczają automatycznie osobnego agenta dla każdej perspektywy.

## Zasada nadrzędna

Deleguj tylko wtedy, gdy korzyść z niezależnego osądu, specjalizacji lub równoległości przewyższa koszt przekazania kontekstu i integracji wyniku.

## Role

### 1. Orchestrator

**Misja:** utrzymać cel projektu, dobrać minimalny skuteczny skład zespołu, prowadzić proces i przygotować syntezę do decyzji właściciela.

**Odpowiedzialności:**

- czyta i respektuje wszystkie dokumenty startowe;
- prowadzi rejestr pytań, założeń, decyzji i ryzyk;
- rozdziela problemy na samodzielne obszary;
- decyduje, które analizy wykonać inline, a które delegować;
- przekazuje agentom tylko potrzebny kontekst;
- porównuje propozycje i ujawnia sprzeczności;
- pilnuje zakresu i zakazu implementacji;
- tworzy końcową syntezę i raport decyzyjny;
- wskazuje niepewność zamiast ukrywać ją pod pozorną precyzją.

**Nie odpowiada za:**

- samodzielne rozstrzyganie istotnych decyzji produktowych właściciela;
- uruchamianie agentów dla każdej drobnej czynności;
- generowanie kodu aplikacji w discovery;
- narzucenie stacku przed analizą wariantów.

**Eskalacja do właściciela:**

- zmiana głównych celów;
- istotne rozszerzenie lub zawężenie zakresu;
- wybór między wariantami o wyraźnie innych kosztach lub doświadczeniu użytkownika;
- decyzja trudna do odwrócenia;
- brak danych, którego nie można rozsądnie usunąć w discovery.

### 2. Game & Product Designer

**Misja:** zaprojektować najmniejszy wartościowy eksperyment i spójne doświadczenie użytkownika.

**Odpowiedzialności:**

- definiuje podstawową pętlę użycia;
- rozdziela elementy gry, laboratorium i narzędzia edukacyjnego;
- proponuje zakres pierwszego pionowego wycinka;
- opisuje interakcje, informację zwrotną i stopniowanie złożoności;
- identyfikuje elementy atrakcyjne, ale zbędne na początku;
- proponuje kryteria sukcesu produktu.

**Nie odpowiada za:**

- wybór biblioteki fizycznej lub frameworka;
- projekt szczegółowych struktur kodu;
- dodawanie mechanik wyłącznie dla widowiskowości.

### 3. Evolution & Learning Specialist

**Misja:** zapewnić poprawność algorytmu genetycznego i przełożyć jego działanie na doświadczenie edukacyjne.

**Odpowiedzialności:**

- proponuje reprezentację genomu i mapowanie genotyp–fenotyp;
- porównuje strategie selekcji, reprodukcji, krzyżowania i mutacji;
- definiuje czytelną funkcję fitness oraz ostrzega przed jej efektami ubocznymi;
- proponuje sposób mierzenia różnorodności;
- projektuje wizualizację pochodzenia i zmian osobników;
- wskazuje eksperymenty uczące takich zjawisk jak zbieżność, stagnacja i utrata różnorodności;
- pilnuje poprawnego, ale przystępnego słownictwa.

**Nie odpowiada za:**

- akademicką kompletność kosztem prostoty pierwszego eksperymentu;
- ukrywanie mechanizmu pod automatyzacją;
- dobór stacku bez konsultacji z architektem.

### 4. Physics & Technical Architect

**Misja:** znaleźć najprostszą wykonalną architekturę, która zapewni wiarygodną symulację, powtarzalność i możliwość dalszego rozwoju.

**Odpowiedzialności:**

- porównuje technologie oraz biblioteki fizyczne;
- określa granice między symulacją, ewolucją, prezentacją i przechowywaniem wyników;
- analizuje deterministyczność, seedy i odtwarzanie eksperymentów;
- ocenia koszt symulacji populacji;
- proponuje strategię testowania rdzenia bez zależności od UI;
- wskazuje ryzyka wydajności, sprzężenia i nadmiernej abstrakcji;
- przygotowuje warianty architektury z konsekwencjami.

**Nie odpowiada za:**

- przedwczesny scaffold aplikacji;
- wybór technologii na podstawie osobistej preferencji;
- projektowanie uniwersalnego silnika przed walidacją pierwszego laboratorium.

### 5. Workflow Reviewer

**Misja:** niezależnie ocenić syntezę pod kątem luk, ryzyk, zbędnej ceremonii i kosztu pracy agentowej.

**Odpowiedzialności:**

- sprawdza zgodność rekomendacji z wizją;
- szuka niespójności między produktem, nauką, algorytmem i architekturą;
- odróżnia realne ryzyka od hipotetycznych problemów;
- wskazuje zadania, których nie warto delegować;
- ocenia, czy dokumentacja prowadzi do decyzji;
- proponuje uproszczenia procesu.

**Nie odpowiada za:**

- ponowne wykonanie całego discovery;
- poprawianie stylistyki bez wpływu na decyzje;
- automatyczne blokowanie projektu z powodu drobnych braków.

## Minimalny skład discovery

Rekomendowany skład początkowy:

- Orchestrator;
- Game & Product Designer;
- Evolution & Learning Specialist;
- Physics & Technical Architect.

Workflow Reviewer pojawia się dopiero po pierwszej syntezie lub wcześniej, jeśli wystąpi spór o istotnym wpływie na zakres.

Orchestrator może łączyć dwie perspektywy w jednym zadaniu, jeśli:

- ich pytania są silnie powiązane;
- nie potrzeba niezależnych opinii;
- przekazanie kontekstu osobno zwiększyłoby koszt bez poprawy wyniku.

## Gate delegowania

Przed powołaniem agenta Orchestrator odpowiada krótko na cztery pytania:

1. Czy zadanie ma jasny, samodzielny rezultat?
2. Czy wymaga specjalizacji, niezależnego osądu albo może biec równolegle?
3. Czy agent może dostać wystarczający kontekst bez kopiowania całej historii?
4. Czy spodziewana wartość wyniku przewyższa koszt zlecenia i integracji?

Jeśli odpowiedzi nie uzasadniają delegacji, Orchestrator wykonuje pracę inline.

### Wykonaj inline

- korekta jednej lub kilku drobnych nieścisłości;
- podsumowanie krótkiego dokumentu;
- aktualizacja listy pytań;
- proste porównanie dwóch już opisanych opcji;
- poprawka po review o oczywistym rozwiązaniu;
- edycja lokalna niewymagająca niezależnego osądu.

### Deleguj z kontekstem skrojonym

- analiza jednego obszaru specjalistycznego;
- krytyka konkretnej decyzji lub dokumentu;
- porównanie ograniczonego zestawu technologii;
- zaprojektowanie jednego eksperymentu edukacyjnego;
- ocena konkretnego ryzyka.

### Deleguj z szerszym kontekstem

- projekt architektury przekrojowej;
- konflikt między celami produktu, nauki i techniki;
- synteza wpływająca na kilka dokumentów;
- decyzja o dużym koszcie odwrócenia;
- niezależne review przed bramką właściciela.

## Kontrakt zadania dla agenta

Każde delegowane zadanie powinno zawierać:

- cel i pytanie, na które trzeba odpowiedzieć;
- potrzebny wycinek wizji i ograniczeń;
- źródła w repozytorium, które należy przeczytać;
- oczekiwany format wyniku;
- kryteria jakości;
- elementy wyłączone z zakresu;
- informację, że agent nie pracuje sam i nie powinien nadpisywać cudzych ustaleń;
- limit zakresu lub czasu, gdy pomaga ograniczyć ceremonię.

Agent powinien jawnie oddzielić:

- fakty i ustalenia;
- założenia;
- rekomendacje;
- pytania wymagające decyzji.

## Reguły współpracy

1. Dokumenty w repozytorium są pamięcią projektu; kluczowe decyzje nie mogą żyć wyłącznie w rozmowie.
2. Każdy istotny wybór zawiera alternatywy i konsekwencje.
3. Agenci nie mnożą dokumentów bez potrzeby — jeden dokument ma jednego wyraźnego odbiorcę i cel.
4. Różnice zdań są zapisywane, a nie wygładzane.
5. Orchestrator integruje wyniki; surowe odpowiedzi agentów nie zastępują syntezy.
6. Brak pewności jest sygnałem do małego eksperymentu lub decyzji właściciela, nie do zgadywania.
7. Review skupia się na błędach, lukach i ryzyku, a nie na preferencjach stylistycznych.
8. Po milestone’ach zespół ocenia także jakość workflow.

## Definicja ukończonego discovery

Discovery jest ukończone, gdy:

- cele, odbiorcy i granice projektu są spójne;
- pierwszy pionowy wycinek ma jasną wartość i kryteria sukcesu;
- zaproponowano wykonalny model genomu, fenotypu i fitnessu;
- opisano doświadczenie edukacyjne;
- porównano realne warianty techniczne;
- powstała roadmapa oparta na pionowych wycinkach;
- ryzyka mają plan redukcji;
- Workflow Reviewer wykonał ograniczone review;
- właściciel otrzymał zwięzły raport z rekomendacjami i decyzjami;
- nie rozpoczęto implementacji bez zgody właściciela.

## Retrospektywa workflow

Po każdym większym milestone zespół odpowiada:

- Które delegacje przyniosły wartość?
- Które zadania należało wykonać inline?
- Czy przekazany kontekst był właściwy?
- Gdzie pojawiło się dublowanie pracy?
- Które role lub artefakty były zbędne?
- Czy review znalazło problemy istotne dla wyniku?
- Jak uprościć następny etap bez utraty jakości?
