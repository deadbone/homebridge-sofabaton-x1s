# Homebridge SofaBaton X1S

Homebridge plugin for controlling SofaBaton X1S activities from Apple Home.

This plugin is intentionally limited to the **SofaBaton X1S**. It does not claim support for X1, X2, U-series remotes, or future SofaBaton models, because those devices are not part of the test scope.

## Status

This is an alpha implementation.

It currently provides:

- Homebridge dynamic platform alias `SofaBatonX1S`;
- persistent HomeKit activity switches, one per activity;
- optional HomeKit Television accessory with SofaBaton activities exposed as inputs;
- automatic activity catalog discovery from the local X1S hub;
- optional manual activity configuration as fallback or override;
- local X1S `POWER_ON` / `POWER_OFF` command support;
- periodic X1S activity-state refresh so HomeKit can follow remote/app changes;
- plugin icon asset;
- CI on Node.js `22.12.0` and `24.x`;
- npm package archive verification.

Activity catalog discovery is enabled by default when `hubIp` is configured. Discovery parses all catalog frames returned by the hub, and `manualActivities` remains available as a fallback or to override discovered names.

## Requirements

- SofaBaton X1S hub and remote.
- Activities already configured in the SofaBaton app.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Homebridge host and X1S hub on the same local network path.

## Installation

Install the current alpha explicitly with the npm `alpha` dist-tag, either from Homebridge UI or from the terminal:

```sh
npm install -g homebridge-sofabaton-x1s@alpha
```

For local development:

```sh
cd /Users/thierrylubrez/Developpements/homebridge-sofabaton-x1s
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

Turning an activity switch ON starts that activity directly. The active activity switch stays ON until you turn it OFF, start another activity, or the next X1S state refresh sees that the remote/app changed the current activity.

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
- `pollIntervalSeconds`: interval used to refresh the current activity state from the X1S hub. Default: `60`.
- `commandTimeoutSeconds`: timeout for activity command attempts.
- `debugProtocol`: verbose protocol logging for troubleshooting.

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

Manual alpha fallback:

```sh
npm login
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
npm publish --tag alpha
```

## Security And Privacy

- No telemetry.
- No analytics.
- No SofaBaton cloud login.
- No shell command execution.
- No mutation of unrelated user files.
- Local network communication only with the configured X1S hub.

## Wiki

See the GitHub Wiki for the setup tutorial and troubleshooting guide:

- [Home](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki)
- [Installation](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Installation)
- [Configuration](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Configuration)
- [Troubleshooting](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Troubleshooting)

## Français

Plugin Homebridge pour piloter les activités SofaBaton X1S depuis l’app Maison d’Apple.

Ce plugin cible volontairement la **SofaBaton X1S uniquement**. Il ne promet pas de compatibilité avec les modèles X1, X2, la série U ou de futures télécommandes SofaBaton, car ces appareils ne font pas partie du périmètre de test.

## État

Cette version est une alpha.

Elle fournit actuellement :

- une plateforme Homebridge dynamique `SofaBatonX1S` ;
- des interrupteurs HomeKit persistants, un par activité ;
- un accessoire HomeKit Television optionnel avec les activités SofaBaton exposées comme entrées ;
- la découverte automatique du catalogue d’activités depuis le hub X1S local ;
- une configuration manuelle optionnelle comme secours ou surcharge ;
- l’envoi local des commandes X1S `POWER_ON` / `POWER_OFF` ;
- le rafraîchissement périodique de l’activité active pour suivre les changements faits depuis la télécommande ou l’app SofaBaton ;
- une icône de plugin ;
- une CI sur Node.js `22.12.0` et `24.x` ;
- une vérification de l’archive npm réelle.

La découverte du catalogue d’activités est activée par défaut quand `hubIp` est configuré. La découverte analyse toutes les trames de catalogue renvoyées par le hub, et `manualActivities` reste disponible comme secours ou pour remplacer les noms détectés.

## Prérequis

- Hub et télécommande SofaBaton X1S.
- Activités déjà configurées dans l’app SofaBaton.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Hôte Homebridge et hub X1S joignables sur le même réseau local.

## Installation

Installez explicitement l’alpha courante avec le dist-tag npm `alpha`, depuis Homebridge UI ou depuis le terminal :

```sh
npm install -g homebridge-sofabaton-x1s@alpha
```

Pour tester localement :

```sh
cd /Users/thierrylubrez/Developpements/homebridge-sofabaton-x1s
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
- `pollIntervalSeconds` : intervalle de rafraîchissement de l’activité active depuis le hub X1S. Défaut : `60`.
- `commandTimeoutSeconds` : délai maximal pour les commandes d’activité.
- `debugProtocol` : logs de protocole détaillés pour diagnostic.

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

Publication alpha manuelle de secours :

```sh
npm login
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
npm publish --tag alpha
```

## Sécurité et confidentialité

- Pas de télémétrie.
- Pas d’analytics.
- Pas de connexion cloud SofaBaton.
- Pas d’exécution de commandes shell.
- Pas de modification de fichiers utilisateur sans rapport.
- Communication réseau locale uniquement avec le hub X1S configuré.

## Wiki

Consultez le Wiki GitHub pour le tutoriel de configuration et le dépannage :

- [Accueil](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki)
- [Installation](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Installation)
- [Configuration](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Configuration)
- [Dépannage](https://github.com/deadbone/homebridge-sofabaton-x1s/wiki/Troubleshooting)
