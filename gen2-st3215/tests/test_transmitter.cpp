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
  // CR-04 adversarial tests: reject embedded newlines and non-numeric spoofing
  const uint8_t injected_nl[] = "T:25\nOK,STOP";
  OnDataRecv(other, injected_nl, sizeof(injected_nl)-1);
  assert(replies->items.size() == 2);
  const uint8_t fake_ctrl[] = "T:OK,STOP";
  OnDataRecv(other, fake_ctrl, sizeof(fake_ctrl)-1);
  assert(replies->items.size() == 2);
  std::puts("Transmitter send serialization, delivery failures, reply-source filtering and CR-04 sanitization passed");
}
