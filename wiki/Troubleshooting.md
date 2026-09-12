# Troubleshooting

## English

## No accessory appears

Check:

- the platform is named `SofaBatonX1S`;
- Homebridge restarted after configuration changes;
- `manualActivities` contains at least one activity when using `switches`;
- Homebridge logs do not show a configuration validation error.

## The Television accessory appears but the activity does not start

Check:

- the X1S hub IP address is correct;
- the X1S hub is powered and connected to Wi-Fi;
- the activity works from the SofaBaton app;
- the activity id is correct;
- the Homebridge host can receive the X1S TCP callback;
- no firewall blocks UDP to the hub or the local callback port.

Enable `debugProtocol` temporarily and restart Homebridge.

## The wrong activity starts

The configured activity id likely points to another X1S activity.

Fix the id in `manualActivities`, restart Homebridge, then test again.

## Accessories were recreated

HomeKit identity depends on:

- `hubId`;
- activity id;
- accessory role.

Changing `name` is safe. Changing `hubId` or activity ids creates new accessories.

## Docker issues

For the first validation, avoid Docker bridge networking. The X1S hub needs to connect back to Homebridge. If you must use Docker, use host networking or explicitly expose and route `localListenPort`.

## Francais

## Aucun accessoire n'apparait

Verifiez :

- que la plateforme s'appelle `SofaBatonX1S` ;
- que Homebridge a redemarre apres les changements de configuration ;
- que `manualActivities` contient au moins une activite si vous utilisez `switches` ;
- que les logs Homebridge n'affichent pas d'erreur de validation de configuration.

## L'accessoire Television apparait mais l'activite ne demarre pas

Verifiez :

- que l'adresse IP du hub X1S est correcte ;
- que le hub X1S est alimente et connecte au Wi-Fi ;
- que l'activite fonctionne depuis l'app SofaBaton ;
- que l'identifiant d'activite est correct ;
- que l'hote Homebridge peut recevoir le callback TCP du X1S ;
- qu'aucun pare-feu ne bloque l'UDP vers le hub ou le port local de callback.

Activez temporairement `debugProtocol` puis redemarrez Homebridge.

## La mauvaise activite demarre

L'identifiant configure pointe probablement vers une autre activite X1S.

Corrigez l'id dans `manualActivities`, redemarrez Homebridge, puis testez a nouveau.

## Les accessoires ont ete recrees

L'identite HomeKit depend de :

- `hubId` ;
- l'identifiant d'activite ;
- le role de l'accessoire.

Changer `name` est sans risque. Changer `hubId` ou les identifiants d'activites cree de nouveaux accessoires.

## Problemes Docker

Pour la premiere validation, evitez le reseau bridge Docker. Le hub X1S doit pouvoir se reconnecter vers Homebridge. Si Docker est obligatoire, utilisez le mode host ou exposez et routez explicitement `localListenPort`.
