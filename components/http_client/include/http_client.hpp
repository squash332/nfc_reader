#pragma once

#include "wifi.hpp"
#include "esp_http_client.h"
#include "cJSON_Utils.h"
#include <string.h>

void send_POST(const char *text);