#pragma once
#include "wifi.hpp"
#include "esp_http_client.h"
#include "esp_websocket_client.h"
#include "cJSON_Utils.h"
#include <string.h>
#include <stdint.h>

void send_POST(const char *uid);
bool send_frame(const uint8_t *buf, size_t len);
void ws_init();
bool ws_is_connected();
