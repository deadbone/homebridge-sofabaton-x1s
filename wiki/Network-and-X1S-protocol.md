# Network and X1S protocol

## English

The plugin is designed for local network control. It does not use SofaBaton cloud credentials.

## Traffic shape

The X1S local flow uses:

- UDP from Homebridge to the X1S hub;
- a TCP callback from the X1S hub back to Homebridge;
- a short command frame to activate an activity.

Because the hub connects back to Homebridge, the Homebridge host must be reachable from the X1S hub.

## Recommended network setup

- Reserve a fixed IP address for the X1S hub.
- Run Homebridge on the same VLAN/subnet while validating.
- Avoid Docker bridge networking for the first test.
- If using Docker, prefer host networking or explicitly allow the callback port.
- Keep `localListenPort` stable while troubleshooting.

## Debug logging

Enable `debugProtocol` only while diagnosing a problem. Disable it after validation to avoid verbose logs.

## Model scope

The protocol code is scoped to X1S validation. X1 and X2 may have similar concepts, but this plugin must not claim support for them without separate testing.

## Francais

Le plugin est concu pour un controle reseau local. Il n'utilise pas d'identifiants cloud SofaBaton.

## Forme du trafic

Le flux local X1S utilise :

- UDP depuis Homebridge vers le hub X1S ;
- une connexion TCP de retour du hub X1S vers Homebridge ;
- une courte trame de commande pour activer une activite.

Comme le hub se reconnecte vers Homebridge, l'hote Homebridge doit etre joignable depuis le hub X1S.

## Configuration reseau recommandee

- Reserver une adresse IP fixe pour le hub X1S.
- Faire tourner Homebridge sur le meme VLAN/sous-reseau pendant la validation.
- Eviter le reseau bridge Docker pour le premier test.
- Avec Docker, preferer le mode host ou autoriser explicitement le port de callback.
- Garder `localListenPort` stable pendant le depannage.

## Logs de debug

Activez `debugProtocol` uniquement pendant le diagnostic. Desactivez-le apres validation pour eviter des logs trop verbeux.

## Perimetre modele

Le code protocolaire est cadre pour une validation X1S. X1 et X2 peuvent avoir des concepts similaires, mais ce plugin ne doit pas promettre leur support sans tests separes.
