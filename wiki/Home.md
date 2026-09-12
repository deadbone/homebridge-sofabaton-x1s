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

### Current alpha limitation

The first alpha uses manual activity mapping. You configure the X1S activity IDs yourself, then the plugin exposes those activities in Apple Home.

Automatic activity catalog discovery is planned, but it must be validated on real X1S hardware before the plugin can rely on it.

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

### Limite actuelle de l'alpha

La premiere alpha utilise une configuration manuelle des activites. Vous renseignez vous-meme les identifiants d'activites X1S, puis le plugin expose ces activites dans Apple Maison.

La decouverte automatique du catalogue d'activites est prevue, mais elle doit etre validee sur une vraie X1S avant que le plugin puisse s'appuyer dessus.
