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

## Francais

Plugin Homebridge pour piloter les activites SofaBaton X1S depuis l'app Maison d'Apple.

Ce projet cible volontairement la SofaBaton X1S uniquement, car c'est le modele qui peut etre teste. Il ne promet pas de compatibilite avec X1, X2, la serie U, ni les futures telecommandes SofaBaton.

La premiere version utilise une configuration manuelle des activites afin de valider proprement le comportement avec une vraie X1S avant d'elargir l'automatisation de la decouverte.
