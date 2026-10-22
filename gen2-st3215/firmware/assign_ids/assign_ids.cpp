// One servo only; type its new ID (1..10). Verify before claiming success.
#include <SCServo.h>
#include "../common/serial_line.h"
SMS_STS servo;

void setup() {
  Serial.begin(115200);
  Serial1.begin(1000000, SERIAL_8N1, 18, 19);
  servo.pSerial = &Serial1;
  servo.IOTimeOut = 5;
  Serial.println("One servo only. Enter new ID 1..10:");
}

void loop() {
  String line;
  if (!readCommand(Serial, line)) return;
  int id = 0, used = 0;
  if (sscanf(line.c_str(), "%d%n", &id, &used) != 1 || used != (int)line.length() || id < 1 || id > 10) {
    Serial.println("ERR: ID must be 1..10");
    return;
  }
  servo.EnableTorque(254, 0);
  servo.unLockEprom(254);
  servo.writeByte(254, 5, id);
  servo.LockEprom(254);
  if (servo.Ping(id) != id || servo.Error != 0 || servo.readByte(id, 55) != 1 || servo.Error != 0) {
    Serial.println("ERR: ID/lock not verified");
    return;
  }
  Serial.printf("Verified ID %d, EEPROM locked. Unplug before assigning the next servo.\n", id);
}
