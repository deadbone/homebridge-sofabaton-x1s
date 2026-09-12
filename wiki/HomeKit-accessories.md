# HomeKit accessories

## English

The plugin can expose SofaBaton activities in two HomeKit shapes.

## Television accessory

This is the recommended model.

One Television accessory represents the X1S hub. Each SofaBaton activity is exposed as an input source.

Typical Home app flow:

1. Open the room containing `SofaBaton X1S`.
2. Open the Television accessory.
3. Select an input such as `Watch TV` or `Movie`.
4. The plugin sends the matching activity command to the X1S hub.

This matches how SofaBaton activities behave: they are modes for a media setup, not independent devices.

## Activity switches

When `exposureMode` is `switches` or `both`, the plugin creates one momentary switch per activity.

When a switch turns ON:

- the plugin sends the activity command;
- the switch returns OFF automatically.

Turning the switch OFF does not power off the activity.

## Stable identity

HomeKit UUIDs are based on:

- `hubId`;
- the activity id;
- the accessory role.

You can rename an activity without recreating the accessory if its id stays the same.

## Francais

Le plugin peut exposer les activites SofaBaton sous deux formes HomeKit.

## Accessoire Television

C'est le modele recommande.

Un accessoire Television represente le hub X1S. Chaque activite SofaBaton est exposee comme source d'entree.

Flux typique dans Maison :

1. Ouvrir la piece contenant `SofaBaton X1S`.
2. Ouvrir l'accessoire Television.
3. Selectionner une entree comme `Regarder la TV` ou `Film`.
4. Le plugin envoie la commande d'activite correspondante au hub X1S.

Cela correspond au fonctionnement des activites SofaBaton : ce sont des modes pour une installation multimedia, pas des appareils independants.

## Interrupteurs d'activites

Quand `exposureMode` vaut `switches` ou `both`, le plugin cree un interrupteur momentane par activite.

Quand un interrupteur passe a ON :

- le plugin envoie la commande d'activite ;
- l'interrupteur revient automatiquement a OFF.

Passer l'interrupteur a OFF n'eteint pas l'activite.

## Identite stable

Les UUID HomeKit sont bases sur :

- `hubId` ;
- l'identifiant de l'activite ;
- le role de l'accessoire.

Vous pouvez renommer une activite sans recreer l'accessoire si son identifiant reste identique.
