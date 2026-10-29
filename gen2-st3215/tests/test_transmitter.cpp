#include <cassert>
#include "../firmware/transmitter_gen2_1/transmitter_gen2_1.cpp"

int main() {
  setup();
  Serial.feed("HELLO\nT\n");
  loop();
  assert(sendPending && lastRadioReply == "HELLO");
  loop();
  assert(lastRadioReply == "HELLO"); // No second send before the callback.
  OnDataSent(receiverAddress, ESP_NOW_SEND_SUCCESS);
  loop();
  assert(sendPending && lastRadioReply == "T");
  OnDataSent(receiverAddress, 1);
  assert(!sendPending && deliveryFailed);
  loop();
  assert(!deliveryFailed);
  uint8_t other[6] = {1,2,3,4,5,6};
  const uint8_t control[] = "SURGE,2.1", sensor[] = "T:25";
  OnDataRecv(other, control, sizeof(control)-1);
  assert(replies->items.empty());
  OnDataRecv(other, sensor, sizeof(sensor)-1);
  assert(replies->items.size() == 1);
  OnDataRecv(receiverAddress, control, sizeof(control)-1);
  assert(replies->items.size() == 2);
  std::puts("Transmitter send serialization, delivery failures and reply-source filtering passed");
}
