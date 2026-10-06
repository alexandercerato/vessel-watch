# Vessel Watch — Hyundai Glovis

Dashboard operativa senza mappa, basata sulle **44 navi** del report Equasis del **06.10.2026**, società IMO 5341749. Distingue **39 registered owners**, **41 ship/commercial managers** e le **5 navi indicate solo come gestite**. Tutti gli 80 riferimenti temporali dei ruoli sono conservati nell’anagrafica.

Anteprima attiva: https://vessel-watch-production.up.railway.app

## Funzioni

- Lista con IMO, MMSI verificato, bandiera, ruolo della società, coordinate, età del segnale, stato dichiarato AIS, velocità, rotta e destinazione.
- Ricerca, filtri proprietà/gestione e segnale recente/datato, ordinamento operativo e CSV.
- Scheda nave: GT, tipo, anno, classe, date dei ruoli Glovis, call sign, pescaggio, fonte e orario dell’ultimo dato statico.
- Storico delle posizioni, campionato ogni 5 minuti e ai cambi di area; conservazione fino a 30 giorni dal ricevimento. Gli snapshot antecedenti all’avvio non ricostruiscono uno storico passato.
- Eventi osservati in aree portuali, ingressi/uscite con continuità dei segnali, ripresa/perdita del segnale, conflitti IMO/MMSI e posizioni anomale. Registro limitato agli ultimi 10.000 eventi; l’API principale ne espone 200 e la scheda 300.
- Ricarica automatica ogni 30 secondi; avvisi di ingresso nell’area mentre la dashboard è aperta. Nessuna notifica via email o SMS.

## Collegamento GitHub Pages

Il progetto è pronto per un **nuovo repository `alexandercerato/vessel-watch`**. Non modifica il progetto MCI.

1. Crea il repository e carica la cartella completa, compresi `.github/workflows/pages.yml`, `package.json` e `public/`.
2. In **Settings → Pages → Build and deployment**, seleziona **GitHub Actions**.
3. Esegui **Actions → Publish Vessel Watch → Run workflow**, oppure effettua un commit su `main` che modifichi `public/`.
4. Il workflow pubblica esclusivamente `public/`. Il backend rimane sul servizio Railway già predisposto.

`public/runtime-config.js` è già collegato al backend attivo. La configurazione non contiene chiavi dei provider. Per cambiare il backend puoi usare il pulsante **Connessione**. Le impostazioni dell’indirizzo sono salvate nel browser; un eventuale token di lettura resta solo nella sessione.

Il frontend risulta accessibile a chi può accedere a GitHub Pages. L’attuale API di lettura non richiede un token. Per restringere l’API imposta `WATCH_READ_TOKEN` sul servizio e inseriscilo nel pulsante Connessione, senza salvarlo in GitHub. Non costituisce autenticazione del sito GitHub Pages.

## Backend attivo

- Progetto Railway: `airy-education`.
- Servizio separato: `vessel-watch`, ID `77f2c1be-cc1e-4388-85bc-bb97dcf8ef9b`.
- Volume persistente: `vessel-watch-history`, 500 MB, montato in `/data`.
- Le variabili AIS del nuovo servizio riferiscono quelle esistenti di `mcfi-caspian-ais`, senza copiarne i valori nel codice.
- Open Waters scopre i possibili MMSI con il nome, ma li accetta solo quando le informazioni del provider riportano l’IMO esatto presente nella flotta. AISStream identifica le navi attraverso i messaggi statici contenenti l’IMO.
- I messaggi statici non aggiornano l’ora della posizione. Nessuna posizione viene associata a una nave con la sola somiglianza del nome.
- Open Waters rispetta il numero di MMSI consentito dal provider (attualmente 10 sulla connessione disponibile); le interrogazioni snapshot percorrono l’intera flotta. AISStream raccoglie i messaggi e li filtra per IMO verificato; quando tutti i MMSI risultano noti restringe anche la sottoscrizione ai 44 MMSI.

L’anteprima viene eseguita come Railway Function a file unico. Per aggiornare quella funzione dopo una modifica, esegui `npm run bundle:railway` e sostituisci il suo sorgente con `railway-function.ts`. Questo file generato è escluso da Git. Il progetto include anche `Dockerfile` e `railway.toml` per collegare in seguito il repository a un normale servizio Railway: in quel caso usa `npm ci`, il volume `/data` e le variabili `.env.example`. Non creare un secondo backend se desideri conservare una sola fonte operativa.

## Aree e limiti del dato

Le 9 aree iniziali sono cerchi indicativi in Italia: Genova, Livorno, Marina di Carrara, Trieste, Ravenna, Civitavecchia, Napoli, Gioia Tauro e Taranto. Modifica `public/data/zones.json` per definire i porti effettivamente rilevanti e aggiorna anche il backend. Un cerchio non descrive la delimitazione di un porto o delle acque territoriali. L’area geografica non determina da sola la giurisdizione o l’arrestabilità.

- **Recente**: ultima posizione entro 15 minuti.
- **Datato**: oltre 15 minuti e fino a 24 ore.
- **Oltre 24 h**: dato più vecchio, ancora mostrato con l’orario originale.
- **Non disponibile**: nessuna posizione ricevuta e attribuibile a quell’IMO.

I provider hanno copertura discontinua e non garantiscono che tutte le navi siano visibili in ogni momento, soprattutto in mare aperto. L’aggiornamento della pagina non cambia l’orario del dato AIS. La destinazione è dichiarata a bordo. Una prima osservazione in area è distinta da un ingresso rilevato tra due posizioni distanti al massimo 30 minuti. Gli snapshot vecchi non generano avvisi attuali di arrivo. Una velocità implicita oltre 60 kn su più di 10 NM in meno di 6 ore produce un evento di anomalia e non sostituisce la posizione accettata.

I ruoli societari sono una fotografia del report fornito; non vengono aggiornati automaticamente da Equasis. La lista include navi gestite senza indicazione di proprietà Glovis. Il report PDF originale non è incluso nel repository.

## Avvio locale e verifiche

Node.js 22 o successivo:

```sh
npm ci
export OPENWATERS_API_KEY=''
export AISSTREAM_API_KEY=''
export DATA_DIR='./data'
npm start
```

Apri `http://localhost:8787`. Per usare il backend locale, nel pulsante Connessione imposta `http://localhost:8787`. Le chiavi si impostano nell’ambiente del processo: `.env.example` è solo un modello e il server non carica automaticamente `.env`.

```sh
npm test
```

Le verifiche coprono il numero e i ruoli delle 44 navi, i nomi spezzati nel PDF, i checksum IMO, l’assenza di identificazione tramite il solo nome, l’ora dei messaggi statici, i valori AIS non disponibili, gli eventi geografici, i conflitti identificativi e il ripristino dell’archivio.

API: `GET /api/health`, `GET /api/watch`, `GET /api/vessels/{imo}/history`. Gli orari API sono UTC. Le modifiche si applicano allo storico attraverso salvataggi atomici con copia di recupero. Mantieni collegato il volume per conservarlo nei redeploy.

Documentazione provider: https://openwaters.io/api/ais/ e https://aisstream.io/documentation/.
