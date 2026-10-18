# Roadmap

## Publish the Television as an external accessory

Status: planned; not implemented in `0.2.1`.

The optional Television currently uses `registerPlatformAccessories()` and is bridged. Publish it separately using `publishExternalAccessories(PLUGIN_NAME, [accessory])` with the HomeKit `TELEVISION` category, so it follows the expected HomeKit TV accessory model. Activity switches should remain bridged.

Before releasing this change:

- Migrate existing cached Television accessories out of the bridge using `unregisterPlatformAccessories()`, without removing activity switches or publishing duplicate TVs.
- Adapt startup, accessory tracking, and cleanup to the external accessory lifecycle instead of relying on the bridged accessory cache.
- Preserve the stable hub-based TV UUID and verify restarts and exposure-mode changes.
- Document separate pairing in Apple Home with the Homebridge pairing code, and explain that scenes and automations referencing the old bridged TV may need updating.
- Verify both a fresh installation and migration from the current bridged TV on Homebridge and in Apple Home.
