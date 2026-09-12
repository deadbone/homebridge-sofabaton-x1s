# Homebridge SofaBaton X1S

Homebridge plugin for controlling SofaBaton X1S activities from Apple Home.

This plugin is intentionally limited to the **SofaBaton X1S**. It does not claim support for X1, X2, U-series remotes, or future SofaBaton models, because those devices are not part of the test scope.

## Status

This is an alpha implementation.

It currently provides:

- Homebridge dynamic platform alias `SofaBatonX1S`;
- HomeKit Television accessory with SofaBaton activities exposed as inputs;
- optional momentary HomeKit switches, one per activity;
- manual activity configuration;
- local X1S activation frame support;
- plugin icon asset;
- CI on Node.js `22.12.0` and `24.x`;
- npm package archive verification.

Automatic activity catalog discovery is planned, but the first usable path is manual activity mapping so behavior can be validated safely against a real X1S.

## Requirements

- SofaBaton X1S hub and remote.
- Activities already configured in the SofaBaton app.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Homebridge host and X1S hub on the same local network path.

## Installation

Install from Homebridge UI when the package is published, or install locally during alpha testing:

```sh
npm install -g homebridge-sofabaton-x1s
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
  "exposureMode": "tv",
  "manualActivities": [
    { "id": 101, "name": "Watch TV" },
    { "id": 102, "name": "Movie" }
  ]
}
```

Do not change `hubId` or activity ids after pairing unless you are ready for HomeKit accessories to be recreated.

## HomeKit Exposure

`exposureMode` controls what appears in Apple Home:

- `tv`: one Television accessory, with activities as inputs. This is the recommended mode.
- `switches`: one momentary switch per activity.
- `both`: Television accessory and momentary switches.

The Television model is preferred because a SofaBaton activity behaves like a media-room mode selector.

## Configuration Fields

- `platform`: must be `SofaBatonX1S`.
- `name`: display name shown in Homebridge and Apple Home.
- `hubIp`: static IP address of the X1S hub.
- `hubId`: stable identifier used for HomeKit UUIDs. Keep it stable.
- `exposureMode`: `tv`, `switches`, or `both`.
- `manualActivities`: list of activities to expose.
- `manualActivities[].id`: SofaBaton activity id.
- `manualActivities[].name`: HomeKit display name.
- `manualActivities[].keyCode`: advanced activation key code. Leave `0` unless X1S testing proves another value is required.
- `enableAllOff`: enables the all-off behavior. Disabled by default until the path is validated on real X1S hardware.
- `allOffActivityId`: activity id used for all-off when enabled.
- `localListenPort`: local TCP callback port used by the X1S protocol.
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
- un accessoire HomeKit de type Television avec les activités SofaBaton exposées comme entrées ;
- des interrupteurs HomeKit momentanés optionnels, un par activité ;
- une configuration manuelle des activités ;
- l’envoi local de trames d’activation X1S ;
- une icône de plugin ;
- une CI sur Node.js `22.12.0` et `24.x` ;
- une vérification de l’archive npm réelle.

La découverte automatique du catalogue d’activités est prévue, mais la première approche utilisable repose sur une configuration manuelle afin de valider le comportement proprement avec une vraie X1S.

## Prérequis

- Hub et télécommande SofaBaton X1S.
- Activités déjà configurées dans l’app SofaBaton.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Hôte Homebridge et hub X1S joignables sur le même réseau local.

## Installation

Installez depuis Homebridge UI quand le paquet sera publié, ou localement pendant les tests alpha :

```sh
npm install -g homebridge-sofabaton-x1s
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
  "exposureMode": "tv",
  "manualActivities": [
    { "id": 101, "name": "Regarder la TV" },
    { "id": 102, "name": "Film" }
  ]
}
```

Ne modifiez pas `hubId` ni les identifiants d’activités après l’association HomeKit, sauf si vous acceptez que les accessoires HomeKit soient recréés.

## Exposition HomeKit

`exposureMode` contrôle ce qui apparaît dans l’app Maison :

- `tv` : un accessoire Television, avec les activités comme entrées. C’est le mode recommandé.
- `switches` : un interrupteur momentané par activité.
- `both` : accessoire Television et interrupteurs momentanés.

Le modèle Television est préférable, car une activité SofaBaton se comporte comme un mode de pièce multimédia.

## Champs de configuration

- `platform` : doit valoir `SofaBatonX1S`.
- `name` : nom affiché dans Homebridge et Apple Maison.
- `hubIp` : adresse IP statique du hub X1S.
- `hubId` : identifiant stable utilisé pour les UUID HomeKit. Gardez-le stable.
- `exposureMode` : `tv`, `switches` ou `both`.
- `manualActivities` : liste des activités à exposer.
- `manualActivities[].id` : identifiant de l’activité SofaBaton.
- `manualActivities[].name` : nom affiché dans HomeKit.
- `manualActivities[].keyCode` : code avancé d’activation. Laissez `0` sauf si les tests X1S montrent qu’une autre valeur est nécessaire.
- `enableAllOff` : active le comportement all-off. Désactivé par défaut tant que le chemin n’est pas validé sur une vraie X1S.
- `allOffActivityId` : identifiant utilisé pour all-off quand l’option est activée.
- `localListenPort` : port TCP local utilisé par le protocole X1S.
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
