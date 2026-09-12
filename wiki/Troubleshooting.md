# Troubleshooting

## English

## The accessory appears but activities do not start

Check:

- the X1S hub IP address is correct;
- Homebridge and the X1S hub are on the same local network path;
- the activity id in `manualActivities` is correct;
- no firewall blocks UDP traffic to the hub or the TCP callback port;
- the activity works from the SofaBaton app and remote.

Enable `debugProtocol` temporarily while diagnosing protocol issues.

## HomeKit accessories were recreated

HomeKit identity depends on:

- `hubId`;
- the activity id;
- the exposure mode.

Changing `hubId` or activity ids can create new HomeKit accessories. Activity display names can be changed safely when the id stays the same.

## Docker networking

The X1S protocol uses UDP discovery and a TCP callback from the hub to Homebridge. Docker bridge networking may block this unless ports and routing are configured carefully. Host networking is usually simpler for first validation.

## Unsupported model detected

This plugin is X1S-only. X1, X2, U-series, and future SofaBaton models are out of scope until separately specified and tested.

## Français

## L’accessoire apparaît mais les activités ne démarrent pas

Vérifiez :

- l’adresse IP du hub X1S ;
- que Homebridge et le hub X1S sont joignables sur le même réseau local ;
- que l’identifiant dans `manualActivities` est correct ;
- qu’aucun pare-feu ne bloque l’UDP vers le hub ou le port TCP de retour ;
- que l’activité fonctionne depuis l’app SofaBaton et la télécommande.

Activez temporairement `debugProtocol` pendant le diagnostic des problèmes de protocole.

## Les accessoires HomeKit ont été recréés

L’identité HomeKit dépend de :

- `hubId` ;
- l’identifiant de l’activité ;
- le mode d’exposition.

Modifier `hubId` ou les identifiants d’activités peut créer de nouveaux accessoires HomeKit. Les noms affichés des activités peuvent être modifiés sans recréation si l’identifiant reste le même.

## Réseau Docker

Le protocole X1S utilise une découverte UDP et une connexion TCP de retour du hub vers Homebridge. Le réseau bridge Docker peut bloquer ce fonctionnement si les ports et le routage ne sont pas configurés soigneusement. Le mode host est généralement plus simple pour une première validation.

## Modèle non pris en charge

Ce plugin cible uniquement la X1S. Les modèles X1, X2, la série U et les futurs modèles SofaBaton sont hors périmètre tant qu’ils ne sont pas spécifiés et testés séparément.
