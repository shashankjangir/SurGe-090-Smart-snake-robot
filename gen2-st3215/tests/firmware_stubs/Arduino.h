#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <deque>
#include <string>
#include <vector>
#include <type_traits>

constexpr double PI = 3.141592653589793;
constexpr int SERIAL_8N1 = 0, WIFI_STA = 1, ESP_OK = 0, WIFI_IF_STA = 0, WIFI_SECOND_CHAN_NONE = 0;
template<class T> T constrain(T value, T low, T high) { return std::max(low, std::min(high, value)); }
using portMUX_TYPE = int;
#define portMUX_INITIALIZER_UNLOCKED 0
#define portENTER_CRITICAL(m) ((void)(m))
#define portEXIT_CRITICAL(m) ((void)(m))
inline uint32_t fakeTime = 0;
inline uint32_t millis() { return fakeTime; }
inline void delay(uint32_t ms) { fakeTime += ms ? ms : 1; }
inline void delayMicroseconds(unsigned) { ++fakeTime; }

struct String : std::string {
  using std::string::string;
  String(const std::string &s) : std::string(s) {}
  template<class T, std::enable_if_t<std::is_arithmetic_v<T>, int> = 0>
  String(T value) : std::string(std::to_string(value)) {}
  bool startsWith(const char *s) const { return rfind(s, 0) == 0; }
  bool endsWith(const char *s) const { return size() >= strlen(s) && compare(size()-strlen(s),strlen(s),s)==0; }
  String substring(size_t a, size_t b=npos) const { return substr(a, b==npos ? npos : b-a); }
  int indexOf(char c, unsigned start=0) const { auto p=find(c,start); return p==npos ? -1 : (int)p; }
  void trim() {
    auto first = find_first_not_of(" \r\n\t"), last = find_last_not_of(" \r\n\t");
    *this = first == npos ? "" : substr(first, last - first + 1).c_str();
  }
  void toUpperCase() { for (char &c : *this) c = std::toupper(c); }
};

struct Stream {
  std::deque<uint8_t> incoming;
  int available() { return incoming.size(); }
  int read() { if (incoming.empty()) return -1; int c = incoming.front(); incoming.pop_front(); return c; }
  void feed(const std::string &text) { for (char c : text) incoming.push_back(c); }
};

struct HardwareSerial : Stream {
  bool respond = true;
  bool torque[255] = {};
  uint16_t goals[10] = {};
  unsigned enables = 0;
  void begin(unsigned, int=0, int=0, int=0) {}
  void setTimeout(unsigned) {}
  void flush() {}
  template<class... T> void printf(const char *, T...) {}
  template<class... T> void println(T...) {}
  void write(const uint8_t *p, int n) {
    unsigned id=p[2], instruction=p[4];
    if (instruction == 3 && p[5] == 40) {
      if (p[6]) ++enables;
      if (id == 254) std::fill(std::begin(torque), std::end(torque), p[6]);
      else torque[id] = p[6];
    }
    if (instruction == 0x83) {
      for (int i=0; i<10; ++i) goals[i] = p[8+i*7] | p[9+i*7]<<8;
    }
    if (id == 254 || !respond) return;
    std::vector<uint8_t> data(instruction == 2 ? p[6] : 0, 0);
    if (data.size() == 2 && p[5] == 56) data[1]=8;
    if (data.size() == 15) { data[1]=8; data[6]=120; data[7]=30; }
    std::vector<uint8_t> reply = {255,255,(uint8_t)id,(uint8_t)(data.size()+2),0};
    reply.insert(reply.end(), data.begin(), data.end());
    unsigned sum=0;
    for (unsigned i=2;i<reply.size();++i) sum += reply[i];
    reply.push_back((uint8_t)~sum);
    for (auto c:reply) incoming.push_back(c);
  }
};
inline HardwareSerial Serial, Serial1;
struct Queue { unsigned size; std::deque<std::vector<uint8_t>> items; };
using QueueHandle_t = Queue *;
constexpr int pdTRUE = 1;
inline QueueHandle_t xQueueCreate(int, unsigned size) { return new Queue{size,{}}; }
inline int xQueueSend(QueueHandle_t q, const void *p, int) {
  auto data=static_cast<const uint8_t *>(p);
  q->items.emplace_back(data, data+q->size); return pdTRUE;
}
inline int xQueueReceive(QueueHandle_t q, void *p, int) {
  if (q->items.empty()) return 0;
  memcpy(p,q->items.front().data(),q->size); q->items.pop_front(); return pdTRUE;
}
inline void xQueueReset(QueueHandle_t q) { q->items.clear(); }
struct WireStub {
  void begin(int,int) {}
  void setClock(unsigned) {}
  void beginTransmission(int) {}
  void write(int) {}
  int endTransmission(bool=true) { return 0; }
  int requestFrom(int,int count) { return count; }
  int read() { return 0; }
};
inline WireStub Wire;
struct WiFiStub { void mode(int) {} void disconnect() {} String macAddress() { return "00:00:00:00:00:00"; } };
inline WiFiStub WiFi;
struct esp_now_peer_info_t { uint8_t peer_addr[6]; int channel; bool encrypt; int ifidx; };
inline int esp_now_init() { return ESP_OK; }
template<class T> void esp_now_register_recv_cb(T) {}
inline int esp_now_add_peer(esp_now_peer_info_t *) { return ESP_OK; }
inline int esp_now_send(uint8_t *, const uint8_t *, unsigned) { return ESP_OK; }
inline int esp_wifi_set_mac(int, uint8_t *) { return ESP_OK; }
inline int esp_wifi_set_channel(int,int) { return ESP_OK; }
