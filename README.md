# Homebridge SofaBaton X1S

Homebridge plugin for controlling SofaBaton X1S activities from Apple Home.

This project is intentionally limited to the SofaBaton X1S because that is the model available for validation. It does not claim support for X1, X2, U-series, or future SofaBaton remotes.

## Current Status

This is an alpha implementation. It provides:

- a Homebridge dynamic platform named `SofaBatonX1S`;
- a HomeKit Television accessory with activities exposed as inputs;
- optional momentary switches for activities;
- manual activity configuration;
- local X1S activation frame support;
- package verification for the real npm archive.

Automatic activity catalog discovery is planned, but the first usable path is manual activity mapping so behavior can be validated safely against a real X1S.

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

## Validation Commands

```sh
npm run lint
npm run build
npm test
npm run verify:pack
```

## Local Homebridge Test

```sh
cd /Users/thierrylubrez/Developpements/homebridge-sofabaton-x1s
npm run build
npm link
homebridge -D -U ~/.homebridge-dev
```

## Alpha Publishing

Do not publish without explicit maintainer confirmation.

The GitHub workflow is prepared for npm Trusted Publishing:

- pull requests from this repository publish temporary alpha builds with the `alpha` dist-tag;
- tags named `v<package.json version>` publish that exact version;
- prerelease tags create prerelease GitHub Releases;
- stable tags create latest GitHub Releases.

Configure the npm package trusted publisher for:

- owner/repository: `deadbone/homebridge-sofabaton-x1s`
- workflow file: `publish.yml`
- environment: `npm`

```sh
npm login
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
npm publish --tag alpha
```

## Francais

Plugin Homebridge pour piloter les activites SofaBaton X1S depuis l'app Maison d'Apple.

Ce projet cible volontairement la SofaBaton X1S uniquement, car c'est le modele qui peut etre teste. Il ne promet pas de compatibilite avec X1, X2, la serie U, ni les futures telecommandes SofaBaton.

La premiere version utilise une configuration manuelle des activites afin de valider proprement le comportement avec une vraie X1S avant d'elargir l'automatisation de la decouverte.

### Test local Homebridge

```sh
cd /Users/thierrylubrez/Developpements/homebridge-sofabaton-x1s
npm run build
npm link
homebridge -D -U ~/.homebridge-dev
```

### Publication alpha

Ne pas publier sans confirmation explicite du mainteneur.

Le workflow GitHub est pret pour npm Trusted Publishing :

- les pull requests du depot publient des builds alpha temporaires avec le dist-tag `alpha` ;
- les tags `v<version package.json>` publient exactement cette version ;
- les tags de prerelease creent des GitHub Releases en prerelease ;
- les tags stables creent des GitHub Releases latest.

Configuration npm Trusted Publishing a prevoir :

- owner/repository : `deadbone/homebridge-sofabaton-x1s`
- workflow file : `publish.yml`
- environment : `npm`

```sh
npm login
npm run lint
npm run build
npm test
npm run verify:pack
npm pack --dry-run
npm publish --tag alpha
```
