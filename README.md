# Homebridge SofaBaton X1S

Homebridge plugin for controlling SofaBaton X1S activities from Apple Home.

This plugin is intentionally limited to the **SofaBaton X1S**. It does not claim support for X1, X2, U-series remotes, or future SofaBaton models, because those devices are not part of the test scope. It does not claim Homebridge Verified status unless that status is granted by the Homebridge project.

## Status

This is the first stable release line for the SofaBaton X1S-only Homebridge plugin.

It currently provides:

- Homebridge dynamic platform alias `SofaBatonX1S`;
- persistent HomeKit activity switches, one per activity;
- optional HomeKit Television accessory with SofaBaton activities exposed as inputs;
- automatic activity catalog discovery from the local X1S hub;
- optional manual activity configuration as fallback or override;
- local X1S `POWER_ON` / `POWER_OFF` command support;
- activity state updates from X1S hub events so HomeKit can follow changes made with the remote or SofaBaton app;
- plugin icon asset;
- CI on Node.js `22.12.0` and `24.x`;
- npm package archive verification.

Activity catalog discovery is enabled by default when `hubIp` is configured. Discovery parses all catalog frames returned by the hub, including several activity rows received in the same TCP packet. `manualActivities` remains available as a fallback or to override discovered names.

## Official iOS App Compatibility (Experimental)

Test release: `0.3.0-beta.1`, published under the npm `beta` tag. Install with `npm install -g homebridge-sofabaton-x1s@0.3.0-beta.1`, restart Homebridge, then enable the option below. The stable `latest` tag remains separate.

Enable `appCompatibility` in Homebridge UI, save and restart to run the local proxy inside the plugin. Default: `false`. No external process, container or app modification is required. This implementation has **not been validated with a real iPhone and X1S**.

The proxy answers iOS UDP discovery and calls the app back over TCP while retaining the hub connection. HomeKit commands fail explicitly during the app session and are never replayed. On TCP closure, the plugin refreshes the hub identity and activity states before restoring Homebridge control. A live idle/background app connection continues to hold priority.

The phone and Homebridge must share a broadcast domain. UDP 8102 must be free; allow discovery replies to UDP 8100, TCP callbacks to the phone on 8100–8110, and the hub callback to `localListenPort`. For multiple interfaces, optionally set `appCompatibilityAddress` to a private IPv4 assigned to Homebridge. Docker bridge port publishing alone does not guarantee this network path. Keep these ports off the Internet with host/router firewall rules.

The proxy uses the actual X1S banner identity, not a fabricated MAC. It does not intercept traffic still addressed directly to the physical hub: initial app rediscovery may be necessary, and automatic migration from a cached direct connection is not guaranteed. No mDNS discovery or readiness beacon is added for the app. Real-network testing must confirm endpoint selection and any additional iOS requirements.

If startup discovery fails or returns no activities, cached HomeKit accessories are preserved. Commands are rejected until a successful synchronization restores the catalog and states; no commands are queued or replayed. Accessories already deleted by an earlier version can be recreated, but their previous Home app settings and automations may need repair.

Logs report proxy startup, app session changes, synchronization and failures; enable `debugProtocol` for client diagnostics. See the [bilingual analysis, network requirements and hardware validation procedure](https://github.com/deadbone/homebridge-sofabaton-x1s/blob/main/wiki/iOS-app-compatibility.md). Simulated socket tests do not establish hardware compatibility.

## Requirements

- SofaBaton X1S hub and remote.
- Activities already configured in the SofaBaton app.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Homebridge host and X1S hub on the same local network path.

## Installation

Install from Homebridge UI, or from the terminal:

```sh
npm install -g homebridge-sofabaton-x1s
```

For local development:

```sh
cd /Users/thierrylubrez/Developpements/homebridge-sofabaton-x1s
npm install
npm run build
npm link
homebridge -D -U ~/.homebridge-dev
```

## Example Configuration

```json
{
  "platform": "SofaBatonX1S",
  "name": "SofaBaton X1S",
  "hubIp": "192.168.1.50",
  "hubId": "living-room-x1s",
  "exposureMode": "switches",
  "discovery": true
}
```

Do not change `hubId` or activity ids after pairing unless you are ready for HomeKit accessories to be recreated.

## HomeKit Exposure

`exposureMode` controls whether Apple Home also shows a Television accessory. Activity switches are always exposed.

- `switches`: one persistent switch per activity. This is the recommended mode.
- `tv`: persistent activity switches plus one Television accessory with activities as inputs.
- `both`: same as `tv`, kept as a compatibility alias.

Turning an activity switch ON starts that activity directly. The active activity switch stays ON until you turn it OFF, start another activity, or the persistent X1S connection reports that the remote/app changed the current activity.

## Configuration Fields

- `platform`: must be `SofaBatonX1S`.
- `name`: display name shown in Homebridge and Apple Home.
- `hubIp`: static IP address of the X1S hub.
- `hubId`: stable identifier used for HomeKit UUIDs. Keep it stable.
- `discovery`: automatically reads activities from the local X1S hub. Enabled by default.
- `exposureMode`: `switches`, `tv`, or `both`. Default: `switches`.
- `manualActivities`: optional fallback or override list.
- `manualActivities[].id`: SofaBaton activity id.
- `manualActivities[].name`: HomeKit display name.
- `manualActivities[].keyCode`: advanced activation key code. `0` and empty values use the X1S `POWER_ON` command.
- `enableAllOff`: enables the all-off behavior. Disabled by default until the path is validated on real X1S hardware.
- `allOffActivityId`: activity id used for all-off when enabled.
- `localListenPort`: local TCP callback port used by the X1S protocol.
- `commandTimeoutSeconds`: timeout for activity command attempts. Default: `8`.
- `retryIntervalSeconds`: base reconnect delay after the persistent X1S TCP connection drops. Later failures back off up to five minutes. Default: `30`.
- `debugProtocol`: verbose protocol logging for troubleshooting. Default: `false`.
- `assumeX1S`: development fallback only. Do not enable it to claim support for other SofaBaton models.

## Validation Commands

```sh
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
```

## npm Trusted Publishing

Do not publish without explicit maintainer confirmation.

The GitHub workflow is prepared for npm Trusted Publishing:

- pull requests from this repository publish temporary alpha builds with the `alpha` dist-tag;
- tags named `v<package.json version>` publish that exact version;
- prerelease tags publish with the npm `alpha` dist-tag and create prerelease GitHub Releases;
- stable tags publish with the npm `latest` dist-tag and create latest GitHub Releases.

Configure the npm package trusted publisher for:

- owner/repository: `deadbone/homebridge-sofabaton-x1s`
- workflow file: `publish.yml`
- environment: `npm`

Manual stable fallback:

```sh
npm login
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
npm publish
```

## Security And Privacy

- No telemetry.
- No analytics.
- No SofaBaton cloud login.
- No shell command execution.
- No mutation of unrelated user files.
- Local network communication with the configured X1S hub and, when compatibility is enabled, the official app on the selected LAN.

## Wiki

See the GitHub Wiki for the setup tutorial and troubleshooting guide:

- [Home](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki)
- [Installation](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Installation)
- [Configuration](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Configuration)
- [Troubleshooting](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Troubleshooting)

## Français

Plugin Homebridge pour piloter les activités SofaBaton X1S depuis l’app Maison d’Apple.

Ce plugin cible volontairement la **SofaBaton X1S uniquement**. Il ne promet pas de compatibilité avec les modèles X1, X2, la série U ou de futures télécommandes SofaBaton, car ces appareils ne font pas partie du périmètre de test. Il ne revendique pas le statut Homebridge Verified sauf si ce statut est accordé par le projet Homebridge.

## État

Cette version est la première ligne stable du plugin Homebridge limité à la SofaBaton X1S.

Elle fournit actuellement :

- une plateforme Homebridge dynamique `SofaBatonX1S` ;
- des interrupteurs HomeKit persistants, un par activité ;
- un accessoire HomeKit Television optionnel avec les activités SofaBaton exposées comme entrées ;
- la découverte automatique du catalogue d’activités depuis le hub X1S local ;
- une configuration manuelle optionnelle comme secours ou surcharge ;
- l’envoi local des commandes X1S `POWER_ON` / `POWER_OFF` ;
- la mise à jour de l’activité active à partir des événements du hub X1S pour suivre les changements faits depuis la télécommande ou l’app SofaBaton ;
- une icône de plugin ;
- une CI sur Node.js `22.12.0` et `24.x` ;
- une vérification de l’archive npm réelle.

La découverte du catalogue d’activités est activée par défaut quand `hubIp` est configuré. Elle analyse toutes les trames de catalogue renvoyées par le hub, y compris plusieurs activités reçues dans le même paquet TCP. `manualActivities` reste disponible comme secours ou pour remplacer les noms détectés.

## Compatibilité avec l’app iOS officielle (expérimental)

Version de test : `0.3.0-beta.1`, sous le tag npm `beta`. Installer avec `npm install -g homebridge-sofabaton-x1s@0.3.0-beta.1`, redémarrer Homebridge puis activer l’option ci-dessous. Le tag stable `latest` reste distinct.

Activer `appCompatibility` dans Homebridge UI, enregistrer et redémarrer pour lancer le proxy dans le plugin. Défaut : `false`. Aucun processus externe, conteneur supplémentaire ni modification de l’app n’est nécessaire. Cette implémentation **n’a pas été validée sur un véritable iPhone et X1S**.

Le proxy répond à la découverte UDP iOS puis se connecte à l’app en TCP en conservant la connexion au hub. Les commandes HomeKit échouent explicitement pendant cette session et ne sont jamais rejouées. À la fermeture TCP, le plugin relit l’identité du hub et les états des activités avant de restaurer Homebridge. Une connexion encore vivante en arrière-plan garde la priorité.

L’iPhone et Homebridge doivent partager le domaine de broadcast. UDP 8102 doit être libre ; autoriser les réponses UDP 8100, les callbacks TCP vers l’iPhone sur 8100–8110 et le callback du hub vers `localListenPort`. Sur un hôte multiréseau, `appCompatibilityAddress` peut sélectionner une IPv4 privée affectée à Homebridge. La publication de ports Docker bridge ne garantit pas ce fonctionnement. Garder ces ports inaccessibles depuis Internet par les pare-feu de l’hôte et du routeur.

L’identité provient du banner X1S réel, sans MAC fabriquée. Le plugin n’intercepte pas les connexions encore adressées directement au hub : une redécouverte initiale dans l’app peut être nécessaire. La migration automatique depuis une adresse mémorisée n’est pas garantie. Ni découverte mDNS ni beacon de disponibilité ne sont ajoutés pour l’app ; leur nécessité éventuelle doit être vérifiée sur le matériel réel.

Si la découverte au démarrage échoue ou ne renvoie aucune activité, les accessoires HomeKit en cache sont conservés. Les commandes sont refusées jusqu’à une synchronisation réussie du catalogue et des états ; aucune commande n’est mise en attente ni rejouée. Les accessoires déjà supprimés par une version précédente peuvent être recréés, mais leurs réglages et automatisations dans Maison peuvent nécessiter une réparation.

Les logs signalent démarrage, changements de session, synchronisation et erreurs ; `debugProtocol` active les diagnostics du client. Voir l’[analyse bilingue, les prérequis réseau et la procédure de validation matérielle](https://github.com/deadbone/homebridge-sofabaton-x1s/blob/main/wiki/iOS-app-compatibility.md). Les tests simulés ne valident pas la compatibilité matérielle.

## Prérequis

- Hub et télécommande SofaBaton X1S.
- Activités déjà configurées dans l’app SofaBaton.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Hôte Homebridge et hub X1S joignables sur le même réseau local.

## Installation

Installez depuis Homebridge UI ou depuis le terminal :

```sh
npm install -g homebridge-sofabaton-x1s
```

Pour tester localement :

```sh
cd /Users/thierrylubrez/Developpements/homebridge-sofabaton-x1s
npm install
npm run build
npm link
homebridge -D -U ~/.homebridge-dev
```

## Exemple de configuration

```json
{
  "platform": "SofaBatonX1S",
  "name": "SofaBaton X1S",
  "hubIp": "192.168.1.50",
  "hubId": "salon-x1s",
  "exposureMode": "switches",
  "discovery": true
}
```

Ne modifiez pas `hubId` ni les identifiants d’activités après l’association HomeKit, sauf si vous acceptez que les accessoires HomeKit soient recréés.

## Exposition HomeKit

`exposureMode` contrôle si l’app Maison affiche aussi un accessoire Television. Les interrupteurs d’activités sont toujours exposés.

- `switches` : un interrupteur persistant par activité. C’est le mode recommandé.
- `tv` : interrupteurs persistants plus un accessoire Television avec les activités comme entrées.
- `both` : identique à `tv`, conservé comme alias de compatibilité.

Activer un interrupteur démarre directement l’activité. L’interrupteur de l’activité active reste allumé jusqu’à extinction, démarrage d’une autre activité, ou détection d’un changement par le prochain rafraîchissement d’état X1S.

## Champs de configuration

- `platform` : doit valoir `SofaBatonX1S`.
- `name` : nom affiché dans Homebridge et Apple Maison.
- `hubIp` : adresse IP statique du hub X1S.
- `hubId` : identifiant stable utilisé pour les UUID HomeKit. Gardez-le stable.
- `discovery` : lit automatiquement les activités depuis le hub X1S local. Activé par défaut.
- `exposureMode` : `switches`, `tv` ou `both`. Défaut : `switches`.
- `manualActivities` : liste optionnelle de secours ou de surcharge.
- `manualActivities[].id` : identifiant de l’activité SofaBaton.
- `manualActivities[].name` : nom affiché dans HomeKit.
- `manualActivities[].keyCode` : code avancé d’activation. `0` et les valeurs vides utilisent la commande X1S `POWER_ON`.
- `enableAllOff` : active le comportement all-off. Désactivé par défaut tant que le chemin n’est pas validé sur une vraie X1S.
- `allOffActivityId` : identifiant utilisé pour all-off quand l’option est activée.
- `localListenPort` : port TCP local utilisé par le protocole X1S.
- `commandTimeoutSeconds` : délai maximal pour les commandes d’activité. Défaut : `8`.
- `retryIntervalSeconds` : délai de base pour les reconnexions après perte de la connexion TCP X1S persistante. Les échecs suivants utilisent un backoff jusqu’à cinq minutes. Défaut : `30`.
- `debugProtocol` : logs de protocole détaillés pour diagnostic. Défaut : `false`.
- `assumeX1S` : option de développement uniquement. Ne l’activez pas pour revendiquer la prise en charge d’autres modèles SofaBaton.

## Commandes de validation

```sh
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
```

## Publication npm

Ne publiez pas sans confirmation explicite du mainteneur.

Le workflow GitHub est prêt pour npm Trusted Publishing :

- les pull requests du dépôt publient des builds alpha temporaires avec le dist-tag `alpha` ;
- les tags `v<version package.json>` publient exactement cette version ;
- les tags de préversion publient avec le dist-tag npm `alpha` et créent des GitHub Releases en prerelease ;
- les tags stables publient avec le dist-tag npm `latest` et créent des GitHub Releases latest.

Configuration npm Trusted Publishing à prévoir :

- owner/repository : `deadbone/homebridge-sofabaton-x1s`
- workflow file : `publish.yml`
- environment : `npm`

Publication stable manuelle de secours :

```sh
npm login
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
npm publish
```

## Sécurité et confidentialité

- Pas de télémétrie.
- Pas d’analytics.
- Pas de connexion cloud SofaBaton.
- Pas d’exécution de commandes shell.
- Pas de modification de fichiers utilisateur sans rapport.
- Communication locale avec le hub X1S configuré et, si la compatibilité est activée, l’app officielle sur le LAN sélectionné.

## Wiki

Consultez le Wiki GitHub pour le tutoriel de configuration et le dépannage :

- [Accueil](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki)
- [Installation](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Installation)
- [Configuration](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Configuration)
- [Dépannage](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Troubleshooting)
