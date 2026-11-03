# ESP32 firmware updates over Wi-Fi

The maintained receiver and transmitter support ArduinoOTA in an explicit USB-entered
maintenance mode. Their retained Arduino sketch aliases use the same implementation.
Normal operation keeps the access point and OTA service off. No dashboard change is needed.

## First installation

Private passwords for this checkout are in
`generations/gen2-st3215/firmware/common/ota_config.h` (gitignored). A new checkout
must copy `ota_config.h.example` beside it and set `SURGE_OTA_WIFI_PASSWORD` (8–63
characters) and `SURGE_OTA_PASSWORD` (at least 16 characters). Empty/missing credentials
disable OTA entry, while normal firmware operation still works. Keep these passwords
private and keep the same configuration when rebuilding future updates.

Build from the repository root:

```powershell
pio run -e receiver_gen2_1 -e transmitter_gen2_1
```

The first OTA-capable firmware installation requires USB. Identify the boards before
uploading; the last confirmed ports were COM6 receiver and COM7 transmitter. Disconnect
servo power and support the robot before installation. Use the existing USB upload
procedure for each matching environment. This implementation has not been uploaded
or tested on physical boards yet.

The current `esp32dev` default partition table has two 0x140000-byte OTA application
slots. Keep that partition layout; do not use a single-app/no-OTA layout. OTA sends
only the application image, not bootloader or partition changes.

## Each wireless update

1. Stop and disconnect the dashboard; disconnect servo power and support the robot.
2. Open the target board's own USB serial port at 115200 baud with LF line endings.
   For the receiver, send `STOP` and require `OK,STOP`. Then send `OTA` on that same
   USB port. Wireless `OTA` is not accepted by the receiver; COM7 does not forward
   this command to the robot because it enters the transmitter's own OTA mode.
3. Require `OK,OTA,SURGE-Receiver,192.168.4.1` or
   `OK,OTA,SURGE-Transmitter,192.168.4.1`. Receiver entry refuses an armed state or
   unconfirmed torque-off. `ERR,OTA,CREDENTIALS` means rebuild with valid credentials;
   `ERR,OTA,AP` means access-point startup failed. Close the serial monitor.
4. Join that board's Wi-Fi network (`SURGE-Receiver` or `SURGE-Transmitter`) using
   `SURGE_OTA_WIFI_PASSWORD`. Update one board at a time; each uses 192.168.4.1 and
   channel 1. The AP has no internet connection. Allow the Python uploader through
   the PC firewall on this network; it receives a TCP connection from the board.
5. Build the matching environment and upload its application image. This PowerShell
   example reads the private upload password without printing it:

```powershell
pio run -e receiver_gen2_1
$otaConfig = 'generations/gen2-st3215/firmware/common/ota_config.h'
$otaUploadPassword = (Select-String -Path $otaConfig -Pattern '^#define SURGE_OTA_PASSWORD "(.*)"$').Matches.Groups[1].Value
python "$env:USERPROFILE/.platformio/packages/framework-arduinoespressif32/tools/espota.py" -i 192.168.4.1 -a $otaUploadPassword -f .pio/build/receiver_gen2_1/firmware.bin
Remove-Variable otaUploadPassword
```

For the transmitter, use `transmitter_gen2_1` in both the build command and image path.
Choose the image for the board you joined; ArduinoOTA does not check the robot role.
The uploader path above matches this machine's default PlatformIO package directory.

Successful uploads reboot automatically. In OTA mode, normal commands and radio
processing are blocked. Receiver queues are cleared and torque stays disabled.
An upload/authentication error leaves the board in maintenance mode for retry;
reset it to return to normal operation. After reboot reconnect the dashboard and
verify `HELLO` → `SURGE,2.1` before any motion trial. Updating the transmitter
interrupts the host link; the receiver's existing watchdog remains the fallback.

This uses the bundled [Espressif ArduinoOTA API](https://github.com/espressif/arduino-esp32/blob/2.0.17/libraries/ArduinoOTA/src/ArduinoOTA.h)
and uploader. Password authentication is not firmware signing or role validation.
