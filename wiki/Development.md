# Development

## English

```sh
npm install
npm run lint
npm run build
npm test
npm run verify:pack
```

Project shape:

- `src/platform.ts`: Homebridge dynamic platform.
- `src/accessories/`: HomeKit accessory wrappers.
- `src/config/`: configuration validation.
- `src/sofabaton/`: X1S protocol framing and client code.
- `tools/verify-pack.mjs`: npm archive verification.

Do not add telemetry, unnecessary cloud calls, broad SofaBaton model claims, or post-install system changes.

## Francais

```sh
npm install
npm run lint
npm run build
npm test
npm run verify:pack
```

Structure du projet :

- `src/platform.ts` : plateforme dynamique Homebridge.
- `src/accessories/` : enveloppes d'accessoires HomeKit.
- `src/config/` : validation de configuration.
- `src/sofabaton/` : trames protocole X1S et client.
- `tools/verify-pack.mjs` : verification de l'archive npm.

N'ajoutez pas de telemetrie, d'appels cloud inutiles, de promesses larges sur les modeles SofaBaton, ni de modifications systeme post-install.
