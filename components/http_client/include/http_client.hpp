#pragma once

#include "wifi.hpp"
#include "esp_http_client.h"
#include "cJSON_Utils.h"
#include <string.h>
#include <stdint.h>

void send_POST(const char *uid);
void send_frame(const uint8_t *buf, size_t len);
