# homebridge-sofabaton-x1s Wiki

## English

`homebridge-sofabaton-x1s` exposes SofaBaton X1S activities in Apple Home through Homebridge.

The plugin is intentionally X1S-only. It is not a generic SofaBaton integration and does not claim support for X1, X2, U-series remotes, or future SofaBaton models.

### Recommended reading order

1. [Installation](Installation.md)
2. [Configuration](Configuration.md)
3. [HomeKit accessories](HomeKit-accessories.md)
4. [Activity IDs](Activity-IDs.md)
5. [Network and X1S protocol](Network-and-X1S-protocol.md)
6. [Troubleshooting](Troubleshooting.md)

### Reference pages

- [Security and privacy](Security-and-privacy.md)
- [Development](Development.md)
- [Publishing to npm](Publishing-to-npm.md)

### Compatibility

- SofaBaton X1S only.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Plugin type: dynamic platform.
- Module format: ESM.

### Current behavior

The plugin reads the X1S activity catalog automatically from the local hub when `hubIp` is configured. It exposes one persistent HomeKit switch per activity by default, and can optionally add a Television accessory with activities as inputs. Discovery parses multiple catalog frames returned in the same TCP packet, so activity names stay matched to their hub IDs. Manual activity mapping remains available as a fallback or to override discovered names. The active activity state is refreshed periodically from the hub so HomeKit can follow changes made outside Homebridge.

## Francais

`homebridge-sofabaton-x1s` expose les activites SofaBaton X1S dans Apple Maison via Homebridge.

Le plugin cible volontairement la X1S uniquement. Ce n'est pas une integration SofaBaton generique et il ne promet pas de compatibilite avec X1, X2, la serie U ou les futurs modeles SofaBaton.

### Ordre de lecture conseille

1. [Installation](Installation.md)
2. [Configuration](Configuration.md)
3. [Accessoires HomeKit](HomeKit-accessories.md)
4. [Identifiants d'activites](Activity-IDs.md)
5. [Reseau et protocole X1S](Network-and-X1S-protocol.md)
6. [Depannage](Troubleshooting.md)

### Pages de reference

- [Securite et confidentialite](Security-and-privacy.md)
- [Developpement](Development.md)
- [Publication sur npm](Publishing-to-npm.md)

### Compatibilite

- SofaBaton X1S uniquement.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Type de plugin : plateforme dynamique.
- Format de module : ESM.

### Comportement actuel

Le plugin lit automatiquement le catalogue d'activites X1S depuis le hub local quand `hubIp` est configure. Il expose par defaut un interrupteur HomeKit persistant par activite, et peut aussi ajouter un accessoire Television avec les activites comme entrees. La decouverte analyse plusieurs trames de catalogue arrivees dans le meme paquet TCP afin de garder les noms alignes avec leurs identifiants hub. La configuration manuelle reste disponible comme secours ou pour remplacer les noms detectes. L'activite active est rafraichie periodiquement depuis le hub afin que Maison suive les changements faits hors Homebridge.
