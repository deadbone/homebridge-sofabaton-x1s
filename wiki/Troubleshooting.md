# Troubleshooting

## English

## No accessory appears

Check:

- the platform is named `SofaBatonX1S`;
- Homebridge restarted after configuration changes;
- `hubIp` is configured when using automatic discovery;
- discovery found activities, or `manualActivities` contains at least one fallback activity;
- Homebridge logs do not show a configuration validation error.

The plugin intentionally does not publish empty activity accessories. If no activity can be discovered or configured, Homebridge can still publish the bridge, but Apple Home will not show SofaBaton activity switches behind it.

## The accessory appears but the activity does not start

Check:

- the X1S hub IP address is correct;
- the X1S hub is powered and connected to Wi-Fi;
- the activity works from the SofaBaton app;
- the activity id is correct;
- the Homebridge host can receive the X1S TCP callback;
- no firewall blocks UDP to the hub or the local callback port.

Enable `debugProtocol` temporarily and restart Homebridge.

## The wrong activity starts

For automatically discovered activities, first make sure you are running `homebridge-sofabaton-x1s@alpha` at version `0.1.0-alpha.8` or newer. Older alpha builds could mismatch names and IDs when several catalog frames arrived together.

If the activity was manually configured, fix the id in `manualActivities`, restart Homebridge, then test again.

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
- que `hubIp` est configure si vous utilisez la decouverte automatique ;
- que la decouverte a trouve des activites, ou que `manualActivities` contient au moins une activite de secours ;
- que les logs Homebridge n'affichent pas d'erreur de validation de configuration.

Le plugin ne publie volontairement pas d'accessoires d'activites vides. Si aucune activite n'est detectee ou configuree, Homebridge peut quand meme publier le pont, mais Apple Maison n'affichera pas d'interrupteurs SofaBaton derriere lui.

## L'accessoire apparait mais l'activite ne demarre pas

Verifiez :

- que l'adresse IP du hub X1S est correcte ;
- que le hub X1S est alimente et connecte au Wi-Fi ;
- que l'activite fonctionne depuis l'app SofaBaton ;
- que l'identifiant d'activite est correct ;
- que l'hote Homebridge peut recevoir le callback TCP du X1S ;
- qu'aucun pare-feu ne bloque l'UDP vers le hub ou le port local de callback.

Activez temporairement `debugProtocol` puis redemarrez Homebridge.

## La mauvaise activite demarre

Pour les activites detectees automatiquement, verifiez d'abord que vous utilisez `homebridge-sofabaton-x1s@alpha` en version `0.1.0-alpha.8` ou plus recente. Les anciennes alphas pouvaient melanger les noms et les identifiants quand plusieurs trames de catalogue arrivaient ensemble.

Si l'activite est configuree manuellement, corrigez l'id dans `manualActivities`, redemarrez Homebridge, puis testez a nouveau.

## Les accessoires ont ete recrees

L'identite HomeKit depend de :

- `hubId` ;
- l'identifiant d'activite ;
- le role de l'accessoire.

Changer `name` est sans risque. Changer `hubId` ou les identifiants d'activites cree de nouveaux accessoires.

## Problemes Docker

Pour la premiere validation, evitez le reseau bridge Docker. Le hub X1S doit pouvoir se reconnecter vers Homebridge. Si Docker est obligatoire, utilisez le mode host ou exposez et routez explicitement `localListenPort`.
