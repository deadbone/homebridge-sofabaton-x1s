# Installation

## English

Install the current alpha from Homebridge UI by selecting `homebridge-sofabaton-x1s@alpha`, or install it from the terminal:

Command-line install:

```sh
npm install -g homebridge-sofabaton-x1s@alpha
```

## Requirements

- A SofaBaton X1S hub and remote.
- Activities already created and tested in the SofaBaton app.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- A stable local IP address for the X1S hub.
- Local network traffic between Homebridge and the X1S hub.

## Before configuring Homebridge

1. Open the SofaBaton app.
2. Confirm each activity starts correctly from the app.
3. Confirm each activity starts correctly from the physical remote.
4. Reserve the X1S hub IP address in your router or DHCP server.
5. Keep the default activity switches for the first pairing, then decide whether you also want the optional Television accessory.

Do not start troubleshooting Homebridge until the SofaBaton app and remote are already reliable.

## Local development install

Use a separate Homebridge user directory for development so production HomeKit pairings are not disturbed.

```sh
cd /Users/thierrylubrez/Developpements/homebridge-sofabaton-x1s
npm install
npm run build
npm link
homebridge -D -U ~/.homebridge-dev
```

## Francais

Installez l'alpha courante depuis Homebridge UI en choisissant `homebridge-sofabaton-x1s@alpha`, ou depuis le terminal :

Installation en ligne de commande :

```sh
npm install -g homebridge-sofabaton-x1s@alpha
```

## Prerequis

- Un hub et une telecommande SofaBaton X1S.
- Des activites deja creees et testees dans l'app SofaBaton.
- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Une adresse IP locale stable pour le hub X1S.
- Un trafic reseau local possible entre Homebridge et le hub X1S.

## Avant de configurer Homebridge

1. Ouvrez l'app SofaBaton.
2. Verifiez que chaque activite demarre correctement depuis l'app.
3. Verifiez que chaque activite demarre correctement depuis la telecommande physique.
4. Reservez l'adresse IP du hub X1S dans votre routeur ou serveur DHCP.
5. Gardez les interrupteurs d'activites par defaut pour le premier appairage, puis choisissez si vous voulez aussi l'accessoire Television optionnel.

Ne depannez pas Homebridge tant que l'app SofaBaton et la telecommande ne sont pas deja fiables.

## Installation locale de developpement

Utilisez un repertoire utilisateur Homebridge separe pour le developpement afin de ne pas perturber les associations HomeKit de production.

```sh
cd /Users/thierrylubrez/Developpements/homebridge-sofabaton-x1s
npm install
npm run build
npm link
homebridge -D -U ~/.homebridge-dev
```
