# iOS app compatibility / Compatibilité de l’app iOS

## English — analysis and implementation status

Experimental implementation; **not validated with a real iPhone and X1S**. The current implementation is based on reviewed source code and documented observations, not a packet capture from this installation. No X1 or X2 compatibility is claimed.

### Evidence reviewed

- The existing repository: all TypeScript source, configuration/schema, three original test suites, package metadata, build/lint/coverage settings, packaging script, CI/publication workflows, README, changelog, roadmap and wiki. The existing client opens TCP, sends UDP `CALL_ME`, receives the hub callback, requests the banner and activities, refreshes on `ACK_READY`, and reconnects with exponential backoff. It previously had no app discovery, relay or session ownership gate.
- [m3tac0de connection flow](https://github.com/m3tac0de/home-assistant-sofabaton-x1s/blob/main/docs/protocol/connection-flow.md): iOS broadcast `NOTIFY_ME`, X1S-specific identity/version fields, `CALL_ME` callback direction, additional version/name queries and readiness beacon observations.
- [m3tac0de discovery implementation](https://github.com/m3tac0de/home-assistant-sofabaton-x1s/blob/main/custom_components/sofabaton_x1s/lib/notify_demuxer.py): UDP 8102 listener, UDP 8100 broadcast response, identity hints and callback routing.
- [m3tac0de transport](https://github.com/m3tac0de/home-assistant-sofabaton-x1s/blob/main/custom_components/sofabaton_x1s/lib/transport_bridge.py): persistent hub connection, app connect-back, local-command exclusion, TCP keepalive, framing and spacing of app commands. Its `_emit_connect_ready_beacon` currently returns without sending anything; the documentation only reports omission testing on X1, so beacon necessity on a real X1S remains a hardware check.
- [Python banner decoding](https://github.com/m3tac0de/home-assistant-sofabaton-x1s/blob/main/custom_components/sofabaton_x1s/lib/x1_proxy.py): `record_banner_payload` identifies the real six-byte MAC and validates the model/production date. It takes precedence over the Go decoder’s assumption that all six discovery/banner identity bytes are identical.
- [Model distinctions](https://github.com/m3tac0de/home-assistant-sofabaton-x1s/blob/main/docs/protocol/hub-versions.md) and [network constraints](https://github.com/m3tac0de/home-assistant-sofabaton-x1s/blob/main/docs/networking.md): X1S `HVER=2`, device-id suffix `45`, mDNS `_x1hub._udp.local.`, broadcast limitations and app exclusivity.
- [brunoga proxy](https://github.com/brunoga/sofabaton/blob/main/proxy/proxy.go) and [hub identity decoder](https://github.com/brunoga/sofabaton/blob/main/record/hubinfo.go): banner/discovery payload correspondence and use of the UDP peer address for TCP callback. That project's README explicitly says its own hardware validation is X2-only; it is corroborating implementation evidence, **not X1S validation**.

Sources were inspected on 2026-11-11. Upstream `main` links may change. Protocol checksum arithmetic is implemented and tested locally; prose examples in references are not blindly treated as authoritative.

### Architecture and discovery

`iOS app ↔ integrated Node.js proxy ↔ existing persistent X1S client ↔ real hub`

The proxy keeps the hub TCP connection. It suspends Homebridge writes while relaying app traffic. It does not claim simultaneous independent hub sessions.

The proxy learns the actual X1S identity from the hub's TCP family-`02` banner. The Python banner decoder identifies its first six bytes as the actual hub MAC. Discovery uses the first five MAC bytes followed by the documented X1S model suffix `45`; this conversion is not applied to the relayed TCP banner. Production batch, firmware, flags and raw name encoding are preserved. The UDP family becomes `C2`, the marker becomes `64`, and the checksum is recalculated. No advertisement is sent without a valid model-2 banner and production date. Both the advertised hint and the real banner identity are accepted in subsequent CALL_ME requests. No synthetic MAC, firmware, name or HomeKit identifier is generated.

The app's five-byte `A5 5A 00 C1 C0` probe arrives on UDP 8102. The response is broadcast to UDP 8100 using the chosen interface's actual netmask. Subsequent valid `CALL_ME` packets lead to an outbound TCP connection to the **UDP sender**, on a port in 8100–8110. A nonzero identity hint must match; a zero hint is accepted for this single-hub platform. Embedded arbitrary callback IPs are not followed. Discovery and callbacks are rate limited, and a second app cannot replace an active session.

The references associate mDNS primarily with Android discovery and iOS with UDP broadcast. This iOS implementation does **not** advertise mDNS or join multicast groups. Homebridge's own HomeKit mDNS remains unchanged. An iOS version requiring mDNS, an additional handshake, a different callback port, or direct cached hub addressing is not established as compatible. Additional app queries travel to the real hub, including version/name requests; the proxy does not invent their responses. No readiness beacon is currently synthesized.

### Setup and network boundary

In Homebridge UI enable **Official iOS App Compatibility (Experimental)**, save and restart. `appCompatibility` defaults to `false`. An optional `appCompatibilityAddress` selects a private IPv4 address actually assigned to the Homebridge host. With no override, exactly one private interface on the hub subnet must be found; ambiguous selection fails explicitly. This option does not create an interface, NAT rule or route.

Keep the iPhone and selected Homebridge interface on the same broadcast domain. The hub must reach `localListenPort` (TCP 8200 by default). Allow app broadcasts to UDP 8102, proxy replies to UDP 8100, and outbound TCP callbacks to the iPhone on 8100–8110. Only one proxy instance may own UDP 8102 on a host; a conflict is an error, not an invitation to silently change the iOS port or share it with another service.

The UDP broadcast listener binds to all IPv4 interfaces because unicast-only binding can miss broadcasts. It filters peers to private IPv4 addresses on the selected subnet. The hub TCP listener binds to the selected local address and accepts only the configured hub IP; other callback connections are closed. This unauthenticated LAN protocol is not an Internet security boundary: keep these ports behind the host/router firewall, with no Internet forwarding, public reverse proxy or permissive NAT. The plugin creates no external port mappings or cloud connections.

Docker bridge port publishing alone does not guarantee broadcast discovery or a reachable advertised callback address. Prefer an existing Linux host-network installation or a LAN interface/address genuinely assigned inside the container with correct routing. Docker Desktop host networking and multi-interface broadcast routing require real-network validation. Routed VLANs without broadcast forwarding are unsupported by this implementation; it does not install an external relay. When an explicit interface serves the phone on a different subnet from the hub, both directions of the hub callback route must already work.

### Session ownership and recovery

The central manager exposes `DISCONNECTED`, `CONNECTING`, `HOMEBRIDGE_ACTIVE`, `IOS_APP_ACTIVE`, `RECONNECTING`, and `ERROR` with checked transitions. Initial startup connects and synchronizes before advertising. App acquisition waits for a subsequent app attempt if a Homebridge write/catalog read or partial hub frame is already pending.

While `IOS_APP_ACTIVE`, HomeKit writes fail explicitly and are not queued for later execution. `ACK_READY` does not inject Homebridge catalog requests into app traffic. HomeKit retains its last known state until restoration; do not interpret that display as a live app-session measurement.

The app stream is framed using the existing checksum/length convention. Complete valid frames are relayed unchanged in order, with a 200 ms gap; fragmented input is assembled, combined input is split, unknown valid families are retained. Hub replies are relayed as their original byte stream. Pending output is limited to 256 KiB; stalled output and incomplete frames use `commandTimeoutSeconds`. Invalid app frames terminate the session without replay. TCP keepalive handles a disappeared peer; healthy idle sessions have no fixed expiry that could interrupt an operation. The OS can take time to detect a lost phone, and a live background socket keeps HomeKit suspended.

TCP end/close/error is the app-session boundary. After a clean close the same hub connection reads a fresh banner and activity catalog before restoring Homebridge ownership and the states of existing HomeKit accessories. A broken hub connection closes the app session and reconnects with the configured exponential backoff. Incomplete catalog synchronization does not report restoration. An abrupt app failure with unflushed frames discards them and reconnects the hub; commands are never replayed. New or removed HomeKit accessories still follow the existing startup registration behavior: restart Homebridge after changing the activity catalog in the app.

Shutdown cancels sockets, reconnect timers, partial-frame timers and app sessions. Disabling compatibility restores the usual client behavior and opens no app proxy listener. HomeKit UUID construction is unchanged.

### Limitations and real-hardware acceptance

This is an explicitly discovered endpoint, **not transparent interception of traffic addressed to the hub**. The reference reports that a connected physical hub stops advertising; this suppression and identity-based endpoint selection need checking on the actual X1S/iOS pair. Open the app's hub discovery during initial setup if it retains the physical hub's address. No manual Homebridge/app switching is intended after the app uses the proxy, but automatic migration from a cached direct connection is not guaranteed. If the app continues contacting the hub directly, the plugin cannot observe that session's real end; its ordinary reconnect attempts may compete. Guaranteed interception would require network redirection/routing rules outside this plugin, which are not installed here.

Validate on the real hardware before claiming compatibility:

1. Record iOS app version, X1S firmware, host/container/network layout, and confirm the model is X1S.
2. Enable the option with the app initially disconnected. Confirm hub synchronization, a valid discovery response, and an app callback to the proxy address.
3. Exercise activity control, catalog browsing/editing and normal app synchronization. Check raw frame continuity with a local capture if necessary. Do not perform firmware updates as part of this test.
4. During the session, confirm HomeKit writes fail and no Homebridge requests enter the app stream. Close the app and confirm automatic state restoration without replay.
5. Test a backgrounded app, phone Wi-Fi loss, hub restart, Homebridge restart, busy UDP port, multiple interfaces and container routing. Verify real TCP closure/keepalive behavior and whether the X1S needs a readiness beacon.
6. Confirm the real hub and proxy do not race discovery and that subsequent app launches use the proxy without manual switching.

Logs identify proxy startup, app detection/establishment/end, suspension/restoration and discovery/protocol failures. `debugProtocol` enables existing detailed client diagnostics. The relay does not log raw app content, names, credentials or configuration payloads. For diagnosis inspect UDP 8102/8100 and the two TCP legs locally, keep captures private and redact sensitive content before sharing. No packet capture is started automatically.

Automated tests use loopback hub/app simulations and an injected unicast destination for discovery replies. They test discovery bytes and routing decisions, **not real LAN broadcast delivery, iOS discovery behavior, Docker networking or physical X1S acceptance**.

## Français — fonctionnement et limites

Implémentation expérimentale, **non validée sur un véritable iPhone et X1S**. Les preuves sont les sources et observations publiées citées ci-dessus. Le dépôt Homebridge a été examiné intégralement : sources, configuration, tests existants, cycle de vie, documentation et chaînes de validation/publication. Le client existant ne possédait ni découverte pour l’app ni relais ni arbitrage iOS. Les observations X1 ou X2 ne sont pas considérées comme des validations X1S.

### Architecture et découverte

`App iOS ↔ proxy Node.js intégré ↔ client X1S existant ↔ véritable hub`

La connexion TCP au hub reste ouverte. Pendant la session de l’app, elle lui est réservée ; le plugin ne prétend pas permettre plusieurs connexions indépendantes au hub.

La réponse de découverte provient du banner TCP réel : les cinq premiers octets de la MAC réelle sont suivis du suffixe X1S `45`, conformément au format de découverte documenté. Cette conversion ne modifie pas le banner TCP relayé. Lot de production, firmware, indicateurs et nom brut sont conservés ; la famille `C2`, le marqueur `64` et le checksum sont adaptés au format UDP. Aucune MAC ni version de firmware n’est inventée. Sans banner valide de modèle 2 et date de production valide, le proxy ne s’annonce pas. Les identités du banner réel et de la découverte sont acceptées dans les demandes CALL_ME suivantes.

L’app envoie `A5 5A 00 C1 C0` sur UDP 8102. Le proxy répond en broadcast sur UDP 8100 avec le masque réel de l’interface sélectionnée. Après `CALL_ME`, il ouvre une connexion TCP vers l’émetteur UDP, sur un port 8100–8110 ; il ne suit pas une adresse arbitraire dans le paquet. Une identité non nulle doit correspondre au hub. Les requêtes sont limitées en fréquence et une seconde session ne remplace pas celle en cours.

Les références associent surtout mDNS à Android et le broadcast UDP à iOS. Cette implémentation n’ajoute ni annonce mDNS ni abonnement multicast. Le mDNS HomeKit existant reste inchangé. Les requêtes supplémentaires de nom/version sont transmises au hub. Le beacon de disponibilité n’est pas synthétisé : le transport Python consulté ne l’émet pas, mais son caractère facultatif doit être confirmé sur X1S, les observations documentées d’omission concernant X1.

### Activation et prérequis

Dans Homebridge UI, activer **Official iOS App Compatibility (Experimental)**, enregistrer puis redémarrer. `appCompatibility` vaut `false` par défaut. `appCompatibilityAddress` permet, si nécessaire, de sélectionner une IPv4 privée réellement affectée à l’hôte Homebridge. Sans ce paramètre, une seule interface privée doit correspondre au sous-réseau du hub ; une ambiguïté produit une erreur explicite.

L’iPhone et l’interface sélectionnée doivent partager le domaine de broadcast. Autoriser UDP 8102 vers Homebridge, UDP 8100 vers l’iPhone, TCP sortant vers ses ports 8100–8110 et le callback TCP du hub vers `localListenPort` (8200 par défaut). UDP 8102 doit être libre : le proxy ne change pas silencieusement de port et ne le partage pas avec un autre service.

L’écoute UDP utilise les interfaces IPv4 pour recevoir les broadcasts, puis filtre les émetteurs privés du sous-réseau choisi. Le serveur TCP du hub écoute l’adresse sélectionnée et rejette les autres IP que celle du hub configuré. Ce protocole local sans authentification nécessite un pare-feu : aucune redirection Internet, aucun reverse proxy public. Le plugin ne crée ni ouverture NAT ni connexion cloud.

Publier des ports Docker bridge ne suffit pas à garantir les broadcasts ni l’adresse de callback. Privilégier une installation Linux existante en réseau hôte ou une interface LAN réellement présente dans le conteneur avec les routes nécessaires. Docker Desktop, les hôtes multiréseaux et les VLAN doivent être vérifiés sur le réseau réel. Sans transfert des broadcasts, les VLAN routés ne permettent pas cette découverte iOS. Le plugin n’installe aucun relais externe. Une adresse explicitement choisie sur le réseau de l’iPhone doit également être joignable depuis le hub.

### Sessions, commandes et restauration

Les transitions entre `DISCONNECTED`, `CONNECTING`, `HOMEBRIDGE_ACTIVE`, `IOS_APP_ACTIVE`, `RECONNECTING` et `ERROR` sont contrôlées et testées. Le proxy attend la synchronisation initiale avant de répondre à la découverte. Si une écriture Homebridge, une lecture de catalogue ou une trame partielle est en cours, la demande de connexion de l’app est ignorée jusqu’à sa prochaine tentative.

Pendant la session iOS, les commandes HomeKit échouent explicitement ; aucune commande n’est différée ni rejouée. Les événements `ACK_READY` n’injectent aucune lecture Homebridge dans les échanges de l’app. Maison conserve son dernier état connu jusqu’à la resynchronisation : cet affichage n’est pas un suivi en direct pendant la session.

Les trames de l’app sont assemblées, vérifiées et transmises sans modification, dans l’ordre, avec 200 ms d’espacement ; les réponses du hub conservent leur flux d’octets. La file est limitée à 256 Kio. `commandTimeoutSeconds` borne les écritures bloquées et les trames incomplètes. Une erreur de protocole ferme la session sans rejouer ses commandes. Une session saine mais inactive n’expire pas après un délai fixe. Le keepalive TCP détecte une disparition du téléphone selon les délais du système ; une socket encore vivante en arrière-plan garde la priorité iOS.

La fermeture TCP réelle déclenche la restauration. Après une fermeture propre, le plugin relit le banner et le catalogue sur la même connexion au hub avant de rendre HomeKit disponible et de restaurer les états des accessoires existants. Un catalogue incomplet ne valide pas la restauration. Une perte du hub ferme aussi la session de l’app et lance les reconnexions avec backoff. Une rupture laissant des trames non envoyées les abandonne et reconnecte le hub. Après ajout/suppression d’activités dans l’app, redémarrer Homebridge pour appliquer l’enregistrement des accessoires, comme auparavant.

L’arrêt libère sockets et temporisateurs. L’option désactivée n’ouvre aucun port de proxy. Les UUID HomeKit restent identiques.

### Ce qui nécessite un essai réel

Le proxy doit être découvert par l’app : il **n’intercepte pas** les paquets adressés directement au hub. La disparition de l’annonce du hub connecté et la sélection du proxy par l’identité, décrites par les références, restent à confirmer sur le couple X1S/iOS réel. Lors de la configuration initiale, il peut être nécessaire d’ouvrir la découverte des hubs si l’app conserve l’ancienne adresse. Aucun basculement manuel n’est prévu ensuite, mais la migration automatique d’une connexion directe mémorisée n’est pas garantie.

Si l’app continue à joindre directement le hub, le plugin ne connaît pas la fin réelle de cette session et ses reconnexions ordinaires peuvent entrer en concurrence. Garantir l’interception demanderait une configuration réseau extérieure au plugin, qui n’est pas mise en place ici.

Pour valider : relever les versions iOS/app/firmware et la topologie ; vérifier la découverte et les deux connexions TCP ; tester contrôle, consultation/modification d’activités et synchronisation normale ; vérifier le refus HomeKit pendant la session et le rétablissement automatique à sa fermeture ; tester arrière-plan, perte Wi-Fi, redémarrages, ports occupés, Docker et interfaces multiples. Vérifier l’absence de concurrence entre les annonces du hub et du proxy ainsi que la réouverture de l’app sans basculement manuel. Ne pas modifier le firmware dans le cadre de cet essai.

Les logs signalent démarrage du proxy, détection/connexion/fin de l’app, suspension/restauration, synchronisation et erreurs. `debugProtocol` conserve les diagnostics détaillés du client. Le relais ne journalise pas le contenu brut des échanges de l’app. Une capture locale des ports concernés peut aider ; la conserver privée et retirer les données sensibles avant partage. Aucune capture n’est lancée automatiquement.

Les tests automatisés simulent le hub et l’app sur loopback. La réponse de découverte utilise une destination unicast injectée dans les tests : cela vérifie les octets et les décisions de routage, pas le broadcast réel, Docker, la découverte iOS ni l’acceptation par un vrai X1S.
