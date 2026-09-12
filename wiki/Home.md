# homebridge-sofabaton-x1s Wiki

## English

Welcome to the `homebridge-sofabaton-x1s` wiki.

This Homebridge plugin exposes SofaBaton X1S activities in Apple Home. It is intentionally limited to the X1S because that is the model available for validation.

### Pages

- [Installation](Installation.md)
- [Configuration](Configuration.md)
- [Troubleshooting](Troubleshooting.md)
- [Publishing to npm](Publishing-to-npm.md)

### Compatibility

- SofaBaton X1S only.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Plugin type: dynamic platform.
- Module format: ESM.

### Scope

The plugin controls activities already configured in the SofaBaton app. It does not create SofaBaton devices, edit activities, learn IR commands, or replace the official SofaBaton app.

### Privacy

The plugin talks locally to the configured X1S hub. It does not use SofaBaton cloud login, telemetry, or analytics.

## Français

Bienvenue dans le wiki de `homebridge-sofabaton-x1s`.

Ce plugin Homebridge expose les activités SofaBaton X1S dans Apple Maison. Il cible volontairement la X1S uniquement, car c’est le modèle disponible pour validation.

### Pages

- [Installation](Installation.md)
- [Configuration](Configuration.md)
- [Dépannage](Troubleshooting.md)
- [Publication sur npm](Publishing-to-npm.md)

### Compatibilité

- SofaBaton X1S uniquement.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Type de plugin : plateforme dynamique.
- Format de module : ESM.

### Périmètre

Le plugin contrôle les activités déjà configurées dans l’app SofaBaton. Il ne crée pas de périphériques SofaBaton, ne modifie pas les activités, n’apprend pas de commandes IR et ne remplace pas l’app officielle SofaBaton.

### Confidentialité

Le plugin communique localement avec le hub X1S configuré. Il n’utilise pas de connexion cloud SofaBaton, pas de télémétrie et pas d’analytics.
