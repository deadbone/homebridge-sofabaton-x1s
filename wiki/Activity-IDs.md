# Activity IDs

## English

Activity IDs are the numeric identifiers used by the SofaBaton hub protocol.

In the current alpha, you enter these IDs manually in `manualActivities`.

```json
"manualActivities": [
  { "id": 101, "name": "Watch TV" },
  { "id": 102, "name": "Movie" }
]
```

## Why IDs matter

The id is used for two things:

- sending the command to the X1S hub;
- generating stable HomeKit UUIDs.

Changing the id creates a different HomeKit accessory.

## Alpha testing workflow

Until automatic catalog discovery is validated, use a cautious workflow:

1. Add one activity.
2. Restart Homebridge.
3. Test it in Apple Home.
4. If it starts the wrong activity, correct the id.
5. Add the next activity only after the previous one is correct.

Keep notes of the working id/name pairs for your X1S.

## Future behavior

Automatic activity catalog discovery should eventually read these ids directly from the hub. The plugin will still preserve the same identity rule: id changes create new accessories, name changes do not.

## Francais

Les identifiants d'activites sont les identifiants numeriques utilises par le protocole du hub SofaBaton.

Dans l'alpha actuelle, vous renseignez ces identifiants manuellement dans `manualActivities`.

```json
"manualActivities": [
  { "id": 101, "name": "Regarder la TV" },
  { "id": 102, "name": "Film" }
]
```

## Pourquoi les identifiants sont importants

L'identifiant sert a deux choses :

- envoyer la commande au hub X1S ;
- generer des UUID HomeKit stables.

Changer l'identifiant cree un accessoire HomeKit different.

## Methode conseillee pendant l'alpha

Tant que la decouverte automatique du catalogue n'est pas validee, utilisez une methode prudente :

1. Ajoutez une seule activite.
2. Redemarrez Homebridge.
3. Testez-la dans Apple Maison.
4. Si elle demarre la mauvaise activite, corrigez l'identifiant.
5. Ajoutez l'activite suivante seulement quand la precedente est correcte.

Gardez une note des couples id/nom qui fonctionnent pour votre X1S.

## Comportement futur

La decouverte automatique du catalogue devrait a terme lire ces identifiants directement depuis le hub. Le plugin conservera la meme regle d'identite : changer l'id cree de nouveaux accessoires, changer le nom ne les recree pas.
