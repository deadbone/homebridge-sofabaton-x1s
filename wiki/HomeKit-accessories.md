# HomeKit accessories

## English

The plugin always exposes one persistent switch per SofaBaton activity, and can optionally expose a Television accessory.

## Television accessory

This model is optional.

One Television accessory represents the X1S hub. Each SofaBaton activity is exposed as an input source.

Typical Home app flow:

1. Open the room containing `SofaBaton X1S`.
2. Open the Television accessory.
3. Select an input such as `Watch TV` or `Movie`.
4. The plugin sends the matching activity command to the X1S hub.

This matches how SofaBaton activities behave: they are modes for a media setup, not independent devices.

## Activity switches

The plugin creates one persistent switch per activity.

When a switch turns ON:

- the plugin sends the activity POWER_ON command directly to the X1S hub;
- that switch stays ON;
- the previously active activity switch turns OFF.

Turning the active switch OFF sends the activity POWER_OFF command. The plugin also polls the X1S hub for the active activity, so switches are updated when the physical remote or SofaBaton app changes activity or powers off.

## Stable identity

HomeKit UUIDs are based on:

- `hubId`;
- the activity id;
- the accessory role.

You can rename an activity without recreating the accessory if its id stays the same.

## Francais

Le plugin expose toujours un interrupteur persistant par activite SofaBaton, et peut aussi exposer un accessoire Television.

## Accessoire Television

Ce modele est optionnel.

Un accessoire Television represente le hub X1S. Chaque activite SofaBaton est exposee comme source d'entree.

Flux typique dans Maison :

1. Ouvrir la piece contenant `SofaBaton X1S`.
2. Ouvrir l'accessoire Television.
3. Selectionner une entree comme `Regarder la TV` ou `Film`.
4. Le plugin envoie la commande d'activite correspondante au hub X1S.

Cela correspond au fonctionnement des activites SofaBaton : ce sont des modes pour une installation multimedia, pas des appareils independants.

## Interrupteurs d'activites

Le plugin cree un interrupteur persistant par activite.

Quand un interrupteur passe a ON :

- le plugin envoie directement la commande POWER_ON de l'activite au hub X1S ;
- cet interrupteur reste allume ;
- l'interrupteur de l'activite precedente s'eteint.

Passer l'interrupteur actif a OFF envoie la commande POWER_OFF de l'activite. Le plugin interroge aussi le hub X1S pour connaitre l'activite active ; les interrupteurs sont donc mis a jour quand la telecommande physique ou l'app SofaBaton change d'activite ou eteint le hub.

## Identite stable

Les UUID HomeKit sont bases sur :

- `hubId` ;
- l'identifiant de l'activite ;
- le role de l'accessoire.

Vous pouvez renommer une activite sans recreer l'accessoire si son identifiant reste identique.
