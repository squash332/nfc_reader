#pragma once
#include "wifi.hpp"
#include "esp_http_client.h"
#include "cJSON_Utils.h"
#include <string.h>
#include <stdint.h>

void http_init();
void send_POST(const char *uid);
int  send_frame(const uint8_t *buf, size_t len);  // 1=ok, 0=err, -1=disabled
bool camera_is_enabled();
bool http_client_active();
