# Installation

## English

Install the plugin from Homebridge UI when it is published on npm.

For command-line installation:

```sh
npm install -g homebridge-sofabaton-x1s
```

Requirements:

- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- SofaBaton X1S hub and remote.
- Activities already created in the SofaBaton app.
- A stable local IP address for the X1S hub is recommended.

### Local development test

```sh
cd /Users/thierrylubrez/Developpements/homebridge-sofabaton-x1s
npm run build
npm link
homebridge -D -U ~/.homebridge-dev
```

### Network notes

The Homebridge host must be able to send UDP packets to the X1S hub and receive a short TCP callback from the hub. If Homebridge runs in Docker, host networking or explicit port/firewall configuration may be required.

## Français

Installez le plugin depuis Homebridge UI lorsqu’il sera publié sur npm.

Installation en ligne de commande :

```sh
npm install -g homebridge-sofabaton-x1s
```

Prérequis :

- Homebridge `^1.6.0 || ^2.0.0`.
- Node.js `^22.12.0 || ^24.0.0`.
- Hub et télécommande SofaBaton X1S.
- Activités déjà créées dans l’app SofaBaton.
- Une adresse IP locale stable pour le hub X1S est recommandée.

### Test local de développement

```sh
cd /Users/thierrylubrez/Developpements/homebridge-sofabaton-x1s
npm run build
npm link
homebridge -D -U ~/.homebridge-dev
```

### Notes réseau

L’hôte Homebridge doit pouvoir envoyer des paquets UDP au hub X1S et recevoir une courte connexion TCP de retour depuis le hub. Si Homebridge tourne dans Docker, le mode réseau host ou une configuration explicite des ports et du pare-feu peut être nécessaire.
